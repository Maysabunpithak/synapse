const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { discover, createRoutineService } = require('./routines.cjs');
const devices = [{ id: 'light.desk', name: 'Desk' }, { id: 'switch.fan', name: 'Fan' }];
const history = [1, 2, 3].flatMap(day => devices.map((device, i) => ({
  entity_id: device.id, ai_action: 'on', success: true, voice_input: 'ui-toggle',
  timestamp: `2025-01-0${day}T18:0${i}:00+07:00`,
})));
test('old logs discover a stable pair across three distinct days', () => {
  const [pattern] = discover(history, devices);
  assert.equal(pattern.evidence_days, 3);
  assert.equal(pattern.actions.length, 2);
  assert.equal(discover([...history].reverse(), devices)[0].id, pattern.id);
  assert.equal(discover(Array(10).fill(history.slice(0, 2)).flat(), devices).length, 0);
});
test('automatic, failed, scene, future, missing and far-apart activity cannot create a pair', () => {
  for (const change of [{ voice_input: 'auto-schedule' }, { voice_input: 'phone-home-trigger' }, { source: 'automatic' }, { source: 'scene' }, { success: false }, { timestamp: '2999-01-01T00:00:00Z' }]) {
    assert.equal(discover(history.map(e => ({ ...e, ...change })), devices).length, 0);
  }
  assert.equal(discover(history, devices.slice(0, 1)).length, 0);
  assert.equal(discover(history.map(e => ({ ...e, timestamp: e.timestamp.replace('18:01', '18:30') })), devices).length, 0);
});
test('off between two opens prevents suggesting the pair', () => {
  const interrupted = [...history, ...history.filter(e => e.entity_id === 'light.desk').map(e => ({ ...e, ai_action: 'off', timestamp: e.timestamp.replace('18:00:00', '18:00:30') }))];
  assert.equal(discover(interrupted, devices).length, 0);
});
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-routines-'));
  const file = path.join(dir, 'saved.json');
  t.after(() => { for (const name of ['saved.json', 'saved.json.tmp']) { const target = path.join(dir, name); if (fs.existsSync(target)) fs.unlinkSync(target); } fs.rmdirSync(dir); });
  const calls = [], records = [];
  const state = { devices, unavailable: false, fail: false };
  const options = { file, getHistory: () => history, getDevices: async () => state.devices,
    getState: async id => state.unavailable && id === 'switch.fan' ? 'unavailable' : 'off',
    turnOn: async id => { if (state.fail) throw new Error('failed'); calls.push(id); }, record: entry => records.push(entry) };
  return { service: createRoutineService(options), options, calls, records, state, file };
}
test('accept is persistent and idempotent, never controls devices; exact voice names only', async t => {
  const h = fixture(t);
  const suggestion = (await h.service.list()).suggestions[0];
  const saved = await h.service.accept(suggestion.id, 'เริ่มทำงาน');
  assert.equal((await h.service.accept(suggestion.id, 'เริ่มทำงาน')).id, saved.id);
  assert.equal(h.calls.length, 0);
  const reloaded = createRoutineService(h.options);
  assert.equal((await reloaded.list()).saved.length, 1);
  assert.equal((await reloaded.list()).suggestions.length, 0);
  assert.equal(reloaded.match('เริ่มทำงาน').id, saved.id);
  assert.equal(reloaded.match('อย่าเริ่มทำงาน'), undefined);
  assert.equal(reloaded.match('เริ่มทำงานไหม'), undefined);
  const result = await reloaded.run(saved.id);
  assert.equal(result.ok, true);
  assert.equal(h.calls.length, 2);
  assert.ok(h.records.every(e => e.source === 'scene'));
  reloaded.remove(saved.id);
  assert.equal((await reloaded.list()).saved.length, 0);
});
test('partial execution reports failures and never sends to unavailable devices', async t => {
  const h = fixture(t);
  const pattern = (await h.service.list()).suggestions[0];
  const saved = await h.service.accept(pattern.id, 'Desk time');
  h.state.unavailable = true;
  const result = await h.service.run(saved.id);
  assert.equal(result.ok, false);
  assert.equal(result.results.filter(r => !r.ok).length, 1);
  assert.deepEqual(h.calls, ['light.desk']);
});
test('rejects invented patterns, blank names and corrupted stores', async t => {
  const h = fixture(t);
  await assert.rejects(h.service.accept('fake', 'Test'));
  const pattern = (await h.service.list()).suggestions[0];
  await assert.rejects(h.service.accept(pattern.id, ' '));
  fs.writeFileSync(h.file, 'corrupt');
  await assert.rejects(h.service.list());
  assert.equal(fs.readFileSync(h.file, 'utf8'), 'corrupt');
});
