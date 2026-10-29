const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSilenceDetector } = require('../src/voiceSilence.ts');

test('waits for sustained speech before accepting a command', () => {
  const detect = createSilenceDetector(0);
  detect(-30, 1000);
  assert.equal(detect(-80, 1100), 'listen');
  assert.equal(detect(-80, 12000), 'empty');
});

test('submits one command after a natural 1.2-second pause', () => {
  const detect = createSilenceDetector(0);
  detect(-30, 1000);
  detect(-30, 1300);
  assert.equal(detect(-80, 2499), 'listen');
  assert.equal(detect(-80, 2500), 'send');
});

test('allows a short pause within one spoken command', () => {
  const detect = createSilenceDetector(0);
  detect(-30, 1000);
  detect(-30, 1300);
  assert.equal(detect(-80, 1900), 'listen');
  detect(-30, 2000);
  assert.equal(detect(-80, 3199), 'listen');
  assert.equal(detect(-80, 3200), 'send');
});

test('unknown metering does not finish a recording that has started', () => {
  const detect = createSilenceDetector(0);
  detect(-30, 0);
  detect(-30, 300);
  assert.equal(detect(undefined, 4000), 'listen');
  assert.equal(detect(NaN, 6000), 'listen');
});

test('quiet speech can finish automatically after a pause', () => {
  const detect = createSilenceDetector(0);
  detect(-46, 100);
  detect(-46, 400);
  assert.equal(detect(-80, 1600), 'send');
});

test('a device with no audio levels automatically submits after eight seconds', () => {
  const detect = createSilenceDetector(0);
  assert.equal(detect(undefined, 7900), 'listen');
  assert.equal(detect(undefined, 8000), 'send');
});

test('silence with valid audio levels is discarded without a command', () => {
  const detect = createSilenceDetector(0);
  assert.equal(detect(-160, 100), 'listen');
  assert.equal(detect(-160, 12000), 'empty');
});

test('finishes after speech returns to audible fan noise rather than waiting for absolute silence', () => {
  const detect = createSilenceDetector(0);
  for (const time of [0, 100, 200, 300]) detect(-36, time);
  for (const time of [500, 600, 700, 800, 900, 1000]) detect(-18, time);
  assert.equal(detect(-36, 1500), 'listen');
  assert.equal(detect(-36, 2200), 'send');
});

test('one loud spike does not raise the threshold above ongoing normal speech', () => {
  const detect = createSilenceDetector(0);
  for (const time of [0, 100, 200, 300]) detect(-35, time);
  detect(-5, 400);
  for (const time of [500, 800, 1100, 1400, 1700]) assert.equal(detect(-35, time), 'listen');
  assert.equal(detect(-80, 2900), 'send');
});
