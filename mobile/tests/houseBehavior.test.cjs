const { test } = require('node:test');
const assert = require('node:assert/strict');
const { houseActivity, houseFrame, celebrationRemaining, HOUSE_DANCE_MS, HOUSE_SLEEP_AFTER_MS } = require('../src/houseBehavior.ts');

test('idle house walks in both directions, rests, and eventually sleeps without dancing', () => {
  const sequence = [0, 3000, 9500, 15500, 22000, 30000, 36500, 42500, HOUSE_SLEEP_AFTER_MS];
  assert.deepEqual(sequence.map(age => houseActivity('idle', false, false, age)),
    ['awake', 'walk-right', 'rest', 'walk-left', 'rest', 'walk-right', 'walk-left', 'rest', 'sleep']);
  assert.equal(houseActivity('idle', false, false, 600000), 'sleep');
});

test('touch wakes a sleeping house and microphone setup/capture keeps it attentive', () => {
  assert.equal(houseActivity('idle', false, true, 600000), 'waking');
  assert.equal(houseActivity('idle', true, true, 600000), 'attentive');
  assert.equal(houseActivity('listening', true, true, 600000), 'attentive');
});

test('only success dances; listening, thinking, speech, and errors do not', () => {
  for (const mood of ['listening', 'thinking', 'speaking', 'error']) {
    assert.equal(houseActivity(mood, false, false, 600000), 'attentive');
  }
  assert.equal(houseActivity('success', false, false, 0), 'dance');
});

test('success window lasts one original clip and cannot restart from an old outcome', () => {
  assert.equal(celebrationRemaining('success', 10000, 10000), HOUSE_DANCE_MS);
  assert.equal(celebrationRemaining('success', 10000, 14000), HOUSE_DANCE_MS - 4000);
  assert.equal(celebrationRemaining('success', 10000, 10000 + HOUSE_DANCE_MS), 0);
  assert.equal(celebrationRemaining('success', 10000, 90000), 0);
  assert.equal(celebrationRemaining('success', 0, 500), 0);
  assert.equal(celebrationRemaining('error', 10000, 10000), 0);
  assert.equal(celebrationRemaining(null, 10000, 10000), 0);
});

test('static rest/sleep/wake poses remain distinct and reduced motion stays still', () => {
  assert.equal(houseFrame('rest', 0), 9);
  assert.equal(houseFrame('sleep', 0), 10);
  assert.equal(houseFrame('waking', 0), 11);
  assert.equal(houseActivity('idle', false, false, 600000, false), 'awake');
});
