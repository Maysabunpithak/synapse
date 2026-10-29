const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { createTranscribeRouter } = require("./transcribe.cjs");

async function fixture(t, options) {
  const app = express();
  app.use("/transcribe", createTranscribeRouter(options));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return async (mime = "audio/mp4", bytes = 10) => {
    const form = new FormData();
    if (mime)
      form.append(
        "audio",
        new Blob([new Uint8Array(bytes)], { type: mime }),
        "recording",
      );
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/transcribe`,
      { method: "POST", body: form },
    );
    return { status: response.status, data: await response.json() };
  };
}

test("native M4A and browser WebM reach transcription with the correct format and Thai language", async (t) => {
  const forwarded = [];
  const post = await fixture(t, {
    apiKey: () => "test-key",
    fetchImpl: async (_url, options) => {
      forwarded.push(options.body);
      return Response.json({ text: " เปิดไฟห้องนั่งเล่น " });
    },
  });
  assert.deepEqual(await post("audio/mp4"), {
    status: 200,
    data: { ok: true, text: "เปิดไฟห้องนั่งเล่น" },
  });
  assert.equal((await post("audio/webm")).status, 200);
  assert.equal(forwarded[0].get("file").name, "command.m4a");
  assert.equal(forwarded[0].get("file").type, "audio/mp4");
  assert.equal(forwarded[1].get("file").name, "command.webm");
  assert.equal(forwarded[0].get("language"), "th");
});
test("missing, empty, unsupported and oversized recordings are rejected before calling the provider", async (t) => {
  const post = await fixture(t, {
    apiKey: () => "test-key",
    fetchImpl: async () => {
      assert.fail("Provider must not be called");
    },
  });
  assert.equal((await post(null)).status, 400);
  assert.equal((await post("audio/mp4", 0)).status, 400);
  assert.equal((await post("text/plain")).status, 415);
  assert.equal((await post("audio/mp4", 8 * 1024 * 1024 + 1)).status, 413);
});
test("unconfigured service, provider failures and silence never return a successful transcript", async (t) => {
  const missing = await fixture(t, {
    apiKey: () => "",
    fetchImpl: async () => assert.fail("No key"),
  });
  assert.equal((await missing()).status, 503);
  const failing = await fixture(t, {
    apiKey: () => "test-key",
    fetchImpl: async () =>
      Response.json({ error: "private-provider-error" }, { status: 401 }),
  });
  const failed = await failing();
  assert.equal(failed.status, 502);
  assert.equal(failed.data.ok, false);
  assert.ok(!JSON.stringify(failed.data).includes("private-provider-error"));
  const silent = await fixture(t, {
    apiKey: () => "test-key",
    fetchImpl: async () => Response.json({ text: "  " }),
  });
  assert.equal((await silent()).status, 422);
});
