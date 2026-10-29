const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveRobotMood } = require('../src/robotMood.ts');
const base = { listening: false, busy: false, speaking: false, outcome: null, celebrating: false };
test('real capture supersedes lingering command feedback', () => {
  assert.equal(resolveRobotMood({ ...base, listening: true, outcome: 'success', celebrating: true }), 'listening');
  assert.equal(resolveRobotMood({ ...base, listening: true, outcome: 'error' }), 'listening');
});
test('a failed reply never appears as a celebration or a normal spoken response', () => {
  assert.equal(resolveRobotMood({ ...base, speaking: true, outcome: 'error', celebrating: true }), 'error');
  assert.equal(resolveRobotMood({ ...base, celebrating: true }), 'idle');
});
test('speech playback supersedes the command stage; celebration expires back to speaking', () => {
  assert.equal(resolveRobotMood({ ...base, busy: true }), 'thinking');
  assert.equal(resolveRobotMood({ ...base, busy: true, speaking: true }), 'speaking');
  assert.equal(resolveRobotMood({ ...base, speaking: true, outcome: 'success', celebrating: true }), 'success');
  assert.equal(resolveRobotMood({ ...base, speaking: true, outcome: 'success' }), 'speaking');
});
