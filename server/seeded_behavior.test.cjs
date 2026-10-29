const { test } = require('node:test');
const assert = require('node:assert/strict');
const { seededDecisions } = require('./seeded_behavior.cjs');
const seed = require('./sample_history.cjs').sampleHistory();
const entity = 'light.a60_rgb_w_wifi';
const now = Date.parse('2026-10-01T18:00:00+07:00');
test('approved starting profile opens in its window and waits outside it', () => {
  assert.equal(seededDecisions([],seed,[entity],{},now)[0].status,'ready');
  assert.equal(seededDecisions([],seed,[entity],{},now)[0].seeded,true);
  assert.equal(seededDecisions([],seed,[entity],{},now-6*3600000)[0].status,'waiting');
});
test('manual off pauses Auto and new usage augments the starting history', () => {
  const off={entity_id:entity,timestamp:new Date(now-60000).toISOString(),ai_action:'off',success:true,source:'switch'};
  assert.equal(seededDecisions([off],seed,[entity],{},now)[0].status,'paused');
  const real=[1,2,3].map(day=>({...off,timestamp:`2026-09-${20+day}T09:00:00+07:00`,ai_action:'on'}));
  const result=seededDecisions(real,seed,[entity],{},now)[0];
  assert.equal(result.peak_hour,18);
  assert.equal(result.evidence_count, seed.filter(e => e.entity_id === entity && e.ai_action === 'on' && e.simulated_source !== 'automatic').length + 3);
  assert.equal(result.seeded,true);
  assert.equal(result.actual_evidence_count,3);
});

test('combined learning does not mutate data or learn from automatic commands', () => {
 const original=JSON.stringify(seed);
 const auto={entity_id:entity,timestamp:'2026-10-01T09:00:00+07:00',ai_action:'on',success:true,source:'automatic'};
 const baseline=seededDecisions([],seed,[entity],{},now)[0];
 assert.equal(seededDecisions([auto],seed,[entity],{},now)[0].evidence_count,baseline.evidence_count);
 assert.equal(seededDecisions([], [...seed,...seed], [entity],{},now)[0].evidence_count,baseline.evidence_count);
 assert.equal(JSON.stringify(seed),original);
});
