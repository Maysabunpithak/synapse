const { test } = require('node:test');
const assert = require('node:assert/strict');
const { upcoming } = require('./upcoming_automation.cjs');
const base = {entity_id:'light.a',evidence_count:24,peak_hour:20,status:'waiting'};
test('preview starts at the original peak minus one hour window', () => {
  const now=Date.parse('2026-09-30T17:00:00+07:00');
  assert.equal(upcoming([base],now)[0].next_window_at,new Date('2026-09-30T19:00:00+07:00').toISOString());
});
test('manual pause and cooldown beyond a window defer to the next day', () => {
  const now=Date.parse('2026-09-30T21:30:00+07:00');
  const expected=new Date('2026-10-01T19:00:00+07:00').toISOString();
  assert.equal(upcoming([{...base,paused_until:'2026-09-30T23:00:00+07:00'}],now)[0].next_window_at,expected);
  assert.equal(upcoming([base],now,{'light.a':now})[0].next_window_at,expected);
});
test('insufficient history has no promised activation and midnight windows wrap', () => {
  const now=Date.parse('2026-09-30T23:30:00+07:00');
  assert.deepEqual(upcoming([{...base,evidence_count:2}],now),[]);
  assert.equal(upcoming([{...base,peak_hour:0}],now)[0].next_window_at,new Date(now).toISOString());
});
