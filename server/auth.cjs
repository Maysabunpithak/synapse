const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const {
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
  createHash,
} = require("node:crypto");
const { promisify } = require("node:util");

const deriveKey = promisify(scrypt);
const SESSION_MS = 24 * 60 * 60 * 1000;
const HASH_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const publicUser = ({ id, name, email }) => ({ id, name, email });
const tokenHash = (token) => createHash("sha256").update(token).digest("hex");

function createAuthRouter({
  file = path.join(__dirname, "data", "users.json"),
  now = Date.now,
  attemptLimit = 20,
} = {}) {
  const router = express.Router();
  let users = [];
  if (fs.existsSync(file)) {
    users = JSON.parse(fs.readFileSync(file, "utf8"));
    if (
      !Array.isArray(users) ||
      users.some(
        (u) =>
          !u.id ||
          !u.email ||
          !/^[a-f0-9]{32}$/.test(u.salt) ||
          !/^[a-f0-9]{128}$/.test(u.hash),
      )
    ) {
      throw new Error(
        "Invalid account storage; restore it before starting the API.",
      );
    }
  }
  const sessions = new Map();
  const attempts = new Map();
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  function limit(req, res, next) {
    const time = now();
    for (const [key, bucket] of attempts)
      if (bucket.until <= time) attempts.delete(key);
    const key = req.ip;
    const bucket = attempts.get(key) || {
      count: 0,
      until: time + 15 * 60 * 1000,
    };
    bucket.count++;
    if (!attempts.has(key) && attempts.size >= 5000)
      return res
        .status(429)
        .json({ ok: false, error: "มีคำขอมากเกินไป กรุณาลองใหม่ภายหลัง" });
    attempts.set(key, bucket);
    if (bucket.count > attemptLimit) {
      res.setHeader(
        "Retry-After",
        String(Math.ceil((bucket.until - time) / 1000)),
      );
      return res
        .status(429)
        .json({ ok: false, error: "ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาที" });
    }
    next();
  }

  function session(user) {
    for (const [key, value] of sessions)
      if (value.expiresAt <= now()) sessions.delete(key);
    const token = randomBytes(32).toString("hex");
    const expiresAt = now() + SESSION_MS;
    sessions.set(tokenHash(token), { userId: user.id, expiresAt });
    return { ok: true, user: publicUser(user), token, expiresAt };
  }

  function authenticate(req, res, next) {
    const token = /^Bearer ([a-f0-9]{64})$/.exec(
      req.headers.authorization || "",
    )?.[1];
    const key = token ? tokenHash(token) : "";
    const entry = sessions.get(key);
    const user =
      entry && entry.expiresAt > now()
        ? users.find((u) => u.id === entry.userId)
        : null;
    if (!user) {
      sessions.delete(key);
      return res
        .status(401)
        .json({ ok: false, error: "กรุณาเข้าสู่ระบบอีกครั้ง" });
    }
    req.account = user;
    req.sessionKey = key;
    next();
  }

  router.post("/register", limit, async (req, res) => {
    const { name, email, password } = req.body || {};
    if (typeof name !== "string" || !name.trim() || name.trim().length > 80)
      return res
        .status(400)
        .json({ ok: false, error: "กรุณากรอกชื่อไม่เกิน 80 ตัวอักษร" });
    if (
      typeof email !== "string" ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    )
      return res
        .status(400)
        .json({ ok: false, error: "กรุณากรอกอีเมลให้ถูกต้อง" });
    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    )
      return res
        .status(400)
        .json({ ok: false, error: "รหัสผ่านต้องมี 8–128 ตัวอักษร" });
    const normalizedEmail = email.trim().toLowerCase();
    const conflict = () =>
      res
        .status(409)
        .json({ ok: false, error: "อีเมลนี้มีบัญชีแล้ว กรุณาเข้าสู่ระบบ" });
    if (users.some((u) => u.email === normalizedEmail)) return conflict();
    try {
      const salt = randomBytes(16).toString("hex");
      const hash = (await deriveKey(password, salt, 64, HASH_OPTIONS)).toString(
        "hex",
      );
      // Recheck after the asynchronous hash so simultaneous registrations cannot duplicate an email.
      if (users.some((u) => u.email === normalizedEmail)) return conflict();
      const user = {
        id: randomUUID(),
        name: name.trim(),
        email: normalizedEmail,
        salt,
        hash,
        createdAt: new Date(now()).toISOString(),
      };
      const nextUsers = [...users, user];
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const temporary = file + ".tmp";
      fs.writeFileSync(temporary, JSON.stringify(nextUsers, null, 2), {
        mode: 0o600,
      });
      fs.renameSync(temporary, file);
      users = nextUsers;
      return res.status(201).json(session(user));
    } catch {
      return res
        .status(503)
        .json({ ok: false, error: "บันทึกบัญชีไม่สำเร็จ กรุณาลองใหม่" });
    }
  });

  router.post("/login", limit, async (req, res) => {
    const { email, password } = req.body || {};
    if (
      typeof email !== "string" ||
      email.length > 254 ||
      typeof password !== "string" ||
      password.length > 128 ||
      password.length === 0
    )
      return res
        .status(400)
        .json({ ok: false, error: "กรุณากรอกอีเมลและรหัสผ่าน" });
    const user = users.find((u) => u.email === email.trim().toLowerCase());
    try {
      // Unknown accounts still perform the same expensive hash operation.
      const candidate = await deriveKey(
        password,
        user?.salt || "00000000000000000000000000000000",
        64,
        HASH_OPTIONS,
      );
      const matches = timingSafeEqual(
        candidate,
        Buffer.from(user?.hash || "00".repeat(64), "hex"),
      );
      if (!user || !matches)
        return res
          .status(401)
          .json({ ok: false, error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
      return res.json(session(user));
    } catch {
      return res
        .status(503)
        .json({ ok: false, error: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่" });
    }
  });

  router.get("/me", authenticate, (req, res) =>
    res.json({ ok: true, user: publicUser(req.account) }),
  );
  router.post("/logout", authenticate, (req, res) => {
    sessions.delete(req.sessionKey);
    res.json({ ok: true });
  });
  return router;
}

module.exports = { createAuthRouter };
