const { test } = require('node:test');
const assert = require('node:assert/strict');
const { houseGait, WALK_CYCLE_MS } = require('../src/houseGait.ts');

test('left and right feet alternate support on every half stride', () => {
  for (let t = 0; t < WALK_CYCLE_MS; t += 20) {
    const g = houseGait(t);
    assert.ok(g.left.planted || g.right.planted, 'walking must never lift both feet at once');
    assert.equal(g.left.planted ? g.left.lift : g.right.lift, 0);
    assert.equal(g.left.planted ? g.left.ankle.y : g.right.ankle.y, g.left.planted ? 191 : 185);
  }
  assert.equal(houseGait(WALK_CYCLE_MS * 0.2).right.planted, true);
  assert.equal(houseGait(WALK_CYCLE_MS * 0.7).left.planted, true);
  assert.ok(houseGait(WALK_CYCLE_MS * 0.2).left.lift > 10);
  assert.ok(houseGait(WALK_CYCLE_MS * 0.7).right.lift > 10);
});

test('arms counter-swing as each same-side leg reaches forward', () => {
  const first = houseGait(0), second = houseGait(WALK_CYCLE_MS / 2);
  assert.ok(first.left.ankle.x < second.left.ankle.x);
  assert.ok(first.leftHand.x > second.leftHand.x);
  assert.ok(first.right.ankle.x > second.right.ankle.x);
  assert.ok(first.rightHand.x < second.rightHand.x);
});

test('gait closes without a jump and joint coordinates stay finite', () => {
  assert.deepEqual(houseGait(0), houseGait(WALK_CYCLE_MS));
  for (let t = 0; t < WALK_CYCLE_MS; t += 10) {
    const g = houseGait(t);
    for (const leg of [g.left, g.right]) {
      for (const point of [leg.hip, leg.knee, leg.ankle]) {
        assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
        assert.ok(point.x > 0 && point.x < 185 && point.y > 0 && point.y < 200);
      }
    }
  }
});
