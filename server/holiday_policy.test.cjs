const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getDecisions } = require('./behavior_policy.cjs');
const id = 'light.test', now = Date.parse('2026-10-01T10:00:00+07:00');
const history = [1, 2, 3].flatMap(n => [
  { entity_id: id, timestamp: `2026-09-0${n}T18:00:00+07:00`, ai_action: 'on', success: true },
  { entity_id: id, timestamp: `2026-09-1${n}T10:00:00+07:00`, ai_action: 'on', success: true },
]);
const calendar = time => ({ dayType: time === now ? 'holiday' : new Date(time).getUTCDate() >= 10 ? 'weekend' : 'weekday' });
test('holiday uses off-day history rather than weekday hours', () => {
  const d = getDecisions(history, [id], {}, now, calendar)[0];
  assert.equal(d.peak_hour, 10); assert.equal(d.evidence_count, 3); assert.equal(d.status, 'ready');
  assert.equal(getDecisions(history.slice(0, 2), [id], {}, now, calendar)[0].status, 'insufficient');
});
test('calendar uncertainty prevents Auto; recent manual off still takes precedence', () => {
  assert.equal(getDecisions(history, [id], {}, now, () => ({ dayType: null }))[0].status, 'insufficient');
  const off = { entity_id: id, timestamp: new Date(now - 60000).toISOString(), ai_action: 'off', success: true };
  assert.equal(getDecisions([...history, off], [id], {}, now, calendar)[0].status, 'paused');
});

test('upcoming preview cannot carry a weekday pattern into a different calendar day', () => {
 const { upcoming } = require('./upcoming_automation.cjs');
 const time = Date.parse('2026-10-01T22:00:00+07:00');
 const d = { entity_id:id, evidence_count:3, peak_hour:18, day_context:{date:'2026-10-01'} };
 assert.deepEqual(upcoming([d],time),[]);
});
