const express = require("express");
const multer = require("multer");

const formats = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
};

function createTranscribeRouter({
  apiKey = () => process.env.GROQ_API_KEY,
  fetchImpl = fetch,
} = {}) {
  const router = express.Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  }).single("audio");
  router.post("/", (req, res) => {
    upload(req, res, async (error) => {
      if (error)
        return res
          .status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400)
          .json({
            ok: false,
            text: "",
            error: "ไฟล์เสียงไม่ถูกต้องหรือมีขนาดเกิน 8 MB",
          });
      if (!req.file?.buffer?.length)
        return res
          .status(400)
          .json({
            ok: false,
            text: "",
            error: "ไม่พบไฟล์เสียง กรุณาบันทึกใหม่",
          });
      const mime = req.file.mimetype.split(";")[0].trim();
      if (!formats[mime])
        return res
          .status(415)
          .json({ ok: false, text: "", error: "รูปแบบไฟล์เสียงไม่รองรับ" });
      const key = apiKey();
      if (!key)
        return res
          .status(503)
          .json({
            ok: false,
            text: "",
            error: "เซิร์ฟเวอร์ยังไม่ได้ตั้งค่าบริการแปลงเสียง (GROQ_API_KEY)",
          });
      try {
        const form = new FormData();
        form.append(
          "file",
          new Blob([req.file.buffer], { type: mime }),
          `command.${formats[mime]}`,
        );
        form.append("model", "whisper-large-v3-turbo");
        form.append("language", "th");
        const response = await fetchImpl(
          "https://api.groq.com/openai/v1/audio/transcriptions",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${key}` },
            body: form,
            signal: AbortSignal.timeout(30000),
          },
        );
        if (!response.ok)
          return res
            .status(502)
            .json({
              ok: false,
              text: "",
              error: "บริการแปลงเสียงไม่พร้อมใช้งาน กรุณาลองใหม่",
            });
        const result = await response.json();
        const text = typeof result.text === "string" ? result.text.trim() : "";
        if (!text)
          return res
            .status(422)
            .json({
              ok: false,
              text: "",
              error: "ยังไม่ได้ยินคำสั่ง กรุณาลองพูดใหม่",
            });
        return res.json({ ok: true, text });
      } catch {
        return res
          .status(502)
          .json({
            ok: false,
            text: "",
            error: "เชื่อมต่อบริการแปลงเสียงไม่ได้ กรุณาลองใหม่",
          });
      }
    });
  });
  return router;
}
module.exports = { createTranscribeRouter };
