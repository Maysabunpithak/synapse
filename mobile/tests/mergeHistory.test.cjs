const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mergeHistory } = require('../src/mergeHistory.ts');

test('new living room events retain older bedroom events and original source', () => {
  const older = { entity_id: 'bedroom', timestamp: '2026-09-30T20:00:00', ai_action: 'on', source: 'sample' };
  const recent = { entity_id: 'living', timestamp: '2026-10-01T06:00:00', ai_action: 'on', source: 'ui' };
  assert.deepEqual(mergeHistory([recent], [older]), [recent, older]);
});

test('repeated loads do not duplicate events and prefer actual metadata', () => {
  const seed = { entity_id: 'bedroom', timestamp: '2026-09-30T20:00:00', ai_action: 'on', source: 'sample' };
  const actual = { ...seed, source: 'ui' };
  assert.deepEqual(mergeHistory([actual], [seed]), [actual]);
  assert.deepEqual(mergeHistory(mergeHistory([], [seed]), [seed]), [seed]);
});
