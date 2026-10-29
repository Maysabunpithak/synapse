const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function setup(status = 'ready', deviceState = 'off') {
  const routes = new Map(), sent = [], records = [];
  const state = { status, deviceState, duringRead: null };
  const app = { use() {}, get(p, fn) { routes.set(p, fn); }, post(p, fn) { routes.set(p, fn); }, listen() {} };
  const express = Object.assign(() => app, { json: () => () => {} });
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'server.cjs'), 'utf8'), {
    __dirname, process: { env: {}, exit() { throw new Error('exit'); } }, console: { log() {}, error() {} }, setInterval() {}, setTimeout,
    require(name) {
      if (name === 'dotenv') return { config() {} };
      if (name === 'path') return path;
      if (name === './routines.cjs') return { createRoutineService: () => ({
        match: message => message === 'saved routine' ? { id: 'saved-id' } : undefined,
        run: async id => { sent.push({ routine: id }); return { ok: true, speech: 'routine ready' }; },
      }) };
      if (name === 'express') return express;
      if (name === 'cors') return () => () => {};
      if (name === './behavior_analyzer.cjs') return {
        getDecisions: () => [{ entity_id: 'light.test', status: state.status, label: 'Test', reason: 'evidence' }],
        getSummary: () => [], record: e => records.push(e),
      };
      if (['./automation_plan.cjs', './room_environment.cjs', './upcoming_automation.cjs'].includes(name)) return require(name);
      if (name === './server_helpers.cjs') return { HA_URL: 'http://test.invalid', TOKEN: 'test' };
      if (name === './transcribe.cjs') return { createTranscribeRouter() {} };
      if (name === './auth.cjs') return { createAuthRouter() {} };
      if (name === './light_control.cjs') return {};
      if (name === 'axios') return {
        async get() { if (state.duringRead) state.duringRead(); return { data: { state: state.deviceState } }; },
        async post(url, body) { sent.push({ url, body }); },
      };
      throw new Error(name);
    },
  });
  async function call(route, body = {}) { let result; await routes.get(route)({ body }, { json(data) { result = data; } }); return result; }
  return { call, state, sent, records };
}
test('arrival executes displayed eligibility, records automatic source and shares cooldown', async () => {
  const h = setup();
  assert.equal((await h.call('/logs/analyze')).automation[0].status, 'away');
  const arrival = await h.call('/trigger/phone-home');
  assert.equal(arrival.executed.length, 1);
  assert.equal(h.sent.length, 1);
  assert.equal(h.records[0].source, 'automatic');
  assert.equal((await h.call('/logs/analyze')).automation[0].status, 'cooldown');
  await h.call('/trigger/phone-home');
  assert.equal(h.sent.length, 1);
});
test('insufficient or paused evidence never sends device commands', async () => {
  for (const status of ['insufficient', 'paused']) {
    const h = setup(status);
    await h.call('/trigger/phone-home');
    assert.equal(h.sent.length, 0);
  }
});
test('already on, unknown and unavailable devices are skipped', async () => {
  for (const state of ['on', 'unknown', 'unavailable']) {
    const h = setup('ready', state);
    await h.call('/trigger/phone-home');
    assert.equal(h.sent.length, 0);
  }
});
test('manual pause received during state read cancels pending automatic command', async () => {
  const h = setup();
  h.state.duringRead = () => { h.state.status = 'paused'; };
  await h.call('/trigger/phone-home');
  assert.equal(h.sent.length, 0);
});
test('saved routine voice command reaches routine execution without AI parsing', async () => {
  const h = setup();
  const result = await h.call('/ai/command', { message: 'saved routine', source: 'voice' });
  assert.equal(result.ok, true);
  assert.equal(result.speech, 'routine ready');
  assert.equal(h.sent[0].routine, 'saved-id');
});
