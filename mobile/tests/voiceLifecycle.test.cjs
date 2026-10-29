const { test } = require('node:test');
const assert = require('node:assert/strict');
const { shouldCancelVoiceOnAppState } = require('../src/voiceLifecycle.ts');

test('Android permission dialog does not cancel a pending microphone start', () => {
  for (const state of ['inactive', 'background', 'active']) {
    assert.equal(shouldCancelVoiceOnAppState(state, 'permission', true), false);
  }
});

test('leaving the app outside the permission dialog still cancels pending work', () => {
  for (const stage of ['permission', 'recording', 'transcribing', 'command']) {
    assert.equal(shouldCancelVoiceOnAppState('background', stage, false), true);
  }
});

test('recording interruptions cancel even if a permission flag is stale', () => {
  assert.equal(shouldCancelVoiceOnAppState('background', 'recording', true), true);
  assert.equal(shouldCancelVoiceOnAppState('inactive', 'recording', true), true);
  assert.equal(shouldCancelVoiceOnAppState('active', 'recording', false), false);
});
