const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const { createAuthRouter } = require("./auth.cjs");

async function fixture(t, options = {}) {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "synapse-auth-test-"),
  );
  const file = path.join(directory, "users.json");
  const servers = [];
  async function start() {
    const app = express();
    app.use(express.json());
    app.use("/auth", createAuthRouter({ file, ...options }));
    const server = await new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    servers.push(server);
    const base = `http://127.0.0.1:${server.address().port}/auth`;
    return async (route, body, token) => {
      const response = await fetch(base + route, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return {
        status: response.status,
        headers: response.headers,
        data: await response.json(),
      };
    };
  }
  t.after(async () => {
    await Promise.all(
      servers.map((server) => new Promise((resolve) => server.close(resolve))),
    );
    for (const name of ["users.json", "users.json.tmp"]) {
      const f = path.join(directory, name);
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    fs.rmdirSync(directory);
  });
  return { request: await start(), file, restart: start };
}

const account = {
  name: "Test User",
  email: "Person@example.com",
  password: "CorrectPass123!",
};

test("registration persists hashed credentials; login, identity, logout and restart work", async (t) => {
  const f = await fixture(t);
  const created = await f.request("/register", account);
  assert.equal(created.status, 201);
  assert.deepEqual(Object.keys(created.data.user).sort(), [
    "email",
    "id",
    "name",
  ]);
  assert.equal(created.data.user.email, "person@example.com");
  assert.equal(created.headers.get("cache-control"), "no-store");
  const disk = fs.readFileSync(f.file, "utf8");
  assert.ok(!disk.includes(account.password));
  assert.ok(!disk.includes(created.data.token));
  assert.equal(
    (await f.request("/me", undefined, created.data.token)).status,
    200,
  );
  assert.equal((await f.request("/me")).status, 401);
  assert.equal(
    (await f.request("/login", { ...account, password: "Incorrect" })).status,
    401,
  );
  assert.equal(
    (await f.request("/register", { ...account, email: "PERSON@example.com" }))
      .status,
    409,
  );
  const loggedIn = await f.request("/login", account);
  assert.equal(loggedIn.status, 200);
  assert.notEqual(loggedIn.data.token, created.data.token);
  assert.equal(
    (await f.request("/logout", {}, loggedIn.data.token)).status,
    200,
  );
  assert.equal(
    (await f.request("/me", undefined, loggedIn.data.token)).status,
    401,
  );
  const afterRestart = await f.restart();
  assert.equal((await afterRestart("/login", account)).status, 200);
  assert.equal(
    (await afterRestart("/me", undefined, created.data.token)).status,
    401,
  );
});

test("invalid input is rejected and simultaneous registration cannot duplicate an email", async (t) => {
  const f = await fixture(t);
  for (const patch of [
    { name: "" },
    { email: "not-an-email" },
    { password: "short" },
    { password: "x".repeat(129) },
    { name: {} },
  ]) {
    assert.equal(
      (await f.request("/register", { ...account, ...patch })).status,
      400,
    );
  }
  const results = await Promise.all([
    f.request("/register", account),
    f.request("/register", account),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.equal(JSON.parse(fs.readFileSync(f.file, "utf8")).length, 1);
});

test("sessions expire and repeated attempts are limited", async (t) => {
  let clock = Date.now();
  const f = await fixture(t, { now: () => clock, attemptLimit: 2 });
  const created = await f.request("/register", account);
  await f.request("/login", { ...account, password: "wrong" });
  assert.equal((await f.request("/login", account)).status, 429);
  clock += 24 * 60 * 60 * 1000 + 1;
  assert.equal(
    (await f.request("/me", undefined, created.data.token)).status,
    401,
  );
  assert.equal((await f.request("/login", account)).status, 200);
});
