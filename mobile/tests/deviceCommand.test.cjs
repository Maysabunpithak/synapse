const { test } = require('node:test');
const assert = require('node:assert/strict');
const { setDevicePower } = require('../src/deviceCommand.ts');
const response = (body, ok = true) => ({ ok, json: async () => body });

test('accepted switch command does not poll stale device state', async () => {
  const calls = [];
  await setDevicePower('http://local', 'light.a', 'on', new AbortController().signal, async (url, options) => {
    calls.push({ url, options });
    return response({ ok: true });
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'http://local/switch/on');
  assert.deepEqual(JSON.parse(calls[0].options.body), { entity_id: 'light.a', source: 'ui' });
});

test('rejected commands, network failures and cancellation still fail', async () => {
  for (const reply of [response({ ok: false }), response({ ok: true }, false), response(null)]) {
    await assert.rejects(() => setDevicePower('', 'light.a', 'off', new AbortController().signal, async () => reply));
  }
  await assert.rejects(() => setDevicePower('', 'light.a', 'off', new AbortController().signal, async () => { throw new Error('offline'); }));
  const controller = new AbortController();
  controller.abort();
  let called = false;
  await assert.rejects(() => setDevicePower('', 'light.a', 'off', controller.signal, async () => { called = true; return response({ ok: true }); }));
  assert.equal(called, false);
});
