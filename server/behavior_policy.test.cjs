const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getDecisions } = require('./behavior_policy.cjs');
const { buildPlan } = require('./automation_plan.cjs');
const now = Date.parse('2026-09-30T18:30:00+07:00');
const id = 'light.test';
const row = (timestamp, extra = {}) => ({ timestamp, entity_id: id, ai_action: 'on', success: true, voice_input: 'ui-toggle', ...extra });
const history = [28, 29, 30].map(day => row(`2026-09-${day}T18:00:00+07:00`));
const decide = entries => getDecisions(entries, [id], { [id]: 'Test light' }, now)[0];

test('reuses legacy three-open threshold including repeated use on one day', () => {
  assert.equal(decide(history).status, 'ready');
  assert.equal(decide(Array(3).fill(history[0])).status, 'ready');
  assert.equal(decide(history.slice(0, 2)).status, 'insufficient');
  assert.equal(decide([]).status, 'insufficient');
});
test('old manual logs qualify but automatic, failed and future commands do not', () => {
  for (const extra of [{ voice_input: 'auto-schedule' }, { voice_input: 'phone-home-trigger' }, { source: 'automatic' }, { success: false }, { voice_input: 'feedback-negative' }]) {
    assert.equal(decide(history.map(h => ({ ...h, ...extra }))).status, 'insufficient');
  }
  assert.equal(decide(history.map(h => ({ ...h, timestamp: h.timestamp.replace('09-', '08-') }))).status, 'ready');
  assert.equal(decide(history.map(h => ({ ...h, timestamp: h.timestamp.replace('09-', '10-') }))).status, 'insufficient');
});
test('manual off via switch, voice or scene pauses for two hours, including arrival', () => {
  for (const source of [undefined, 'voice', 'scene']) {
    const decision = decide([...history, row('2026-09-30T18:20:00+07:00', { ai_action: 'off', source })]);
    assert.equal(decision.status, 'paused');
    assert.equal(buildPlan([decision], { atHome: true, now, lastAutoOn: {}, cooldown: 7200000 })[0].status, 'paused');
  }
  assert.equal(decide([...history, row('2026-09-30T16:30:00+07:00', { ai_action: 'off' })]).status, 'ready');
  assert.equal(decide([...history, row('2026-09-30T18:20:00+07:00', { ai_action: 'off', success: false })]).status, 'ready');
});
test('Bangkok timestamps with and without timezone agree; midnight wraps correctly', () => {
  assert.equal(decide(history.map(h => ({ ...h, timestamp: h.timestamp.replace('+07:00', '') }))).status, 'ready');
  assert.equal(decide(history.map(h => ({ ...h, timestamp: new Date(h.timestamp).toISOString() }))).status, 'ready');
  const late = [28, 29, 30].map(d => row(`2026-09-${d}T23:10:00+07:00`));
  assert.equal(getDecisions(late, [id], {}, Date.parse('2026-10-01T00:10:00+07:00'))[0].status, 'ready');
});
test('legacy peak includes weekends and waits outside the peak window', () => {
  assert.equal(decide([12, 19, 26].map(d => row(`2026-09-${d}T18:00:00+07:00`))).status, 'ready');
  const decision = decide(history.map(h => ({ ...h, timestamp: h.timestamp.replace('18:00', '10:00') })));
  assert.equal(decision.status, 'waiting');
  assert.equal(decision.peak_hour, 10);
});
test('display and execution share home and cooldown eligibility', () => {
  const options = { atHome: true, now, lastAutoOn: {}, cooldown: 7200000 };
  const decisions = [decide(history)];
  assert.equal(buildPlan(decisions, options)[0].status, 'ready');
  assert.equal(buildPlan(decisions, { ...options, atHome: false })[0].status, 'away');
  assert.equal(buildPlan(decisions, { ...options, lastAutoOn: { [id]: now - 1000 } })[0].status, 'cooldown');
});
