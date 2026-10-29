const { test } = require('node:test');
const assert = require('node:assert/strict');
const { pinchScale, roomDrop, windowWallSlope } = require('../src/roomGestures.ts');
test('window frame tracks either wall at different room aspect ratios', () => {
  for (const [width, height] of [[600, 460], [360, 280], [500, 216]]) {
    const expected = (100 / 460 * height) / (260 / 600 * width);
    assert.ok(Math.abs(windowWallSlope(0.7, width, height) - expected) < 1e-10);
    assert.ok(Math.abs(windowWallSlope(0.3, width, height) + expected) < 1e-10);
  }
  assert.equal(windowWallSlope(0.7, 0, 200), 0);
});
test('pinch scales proportionally and stays inside saved-size limits', () => {
  assert.equal(pinchScale(1, 100, 120), 1.2);
  assert.equal(pinchScale(1, 100, 80), 0.8);
  assert.equal(pinchScale(1, 100, 300), 1.3);
  assert.equal(pinchScale(1, 100, 20), 0.7);
  assert.equal(pinchScale(1, 0, 20), 1);
  assert.equal(pinchScale(1, 100, NaN), 1);
});
test('catalog drops use measured room coordinates and outside drops add nothing', () => {
  const room = { x: 40, y: 90, width: 400, height: 300 };
  assert.deepEqual(roomDrop(room, 240, 240), { x: 0.5, y: 0.5 });
  assert.deepEqual(roomDrop(room, 40, 90), { x: 0.1, y: 0.1 });
  assert.equal(roomDrop(room, 20, 240), null);
  assert.equal(roomDrop(room, 240, 420), null);
  assert.equal(roomDrop(null, 240, 240), null);
  assert.equal(roomDrop({ ...room, width: 0 }, 240, 240), null);
});
