const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loginMascotMotion, LOGIN_STORY_DURATION } = require('../src/loginMascotMotion.ts');
const { palmBulbMotion } = require('../src/loginMascotMotion.ts');

test('welcome dances, stops to laugh, and loops without position jumps', () => {
  assert.equal(loginMascotMotion(3000).dance, 1);
  assert.equal(loginMascotMotion(3000).walk, 0);
  assert.equal(loginMascotMotion(9000).laugh, 1);
  assert.equal(loginMascotMotion(9000).walk, 0);
  assert.equal(loginMascotMotion(9000).pose, 1);
  assert.equal(loginMascotMotion(11400).pose, 0);
  for (let t = 8000; t < 11400; t += 16) {
    assert.ok(Math.abs(loginMascotMotion(t).y) < 0.001, 'final pose has no jumping');
    assert.ok(Math.abs(loginMascotMotion(t + 16).pose - loginMascotMotion(t).pose) < 0.03);
  }
  assert.deepEqual(loginMascotMotion(LOGIN_STORY_DURATION), loginMascotMotion(0));
  let previous = loginMascotMotion(0);
  for (let t = 16; t <= LOGIN_STORY_DURATION * 2; t += 16) {
    const frame = loginMascotMotion(t);
    assert.ok(Math.hypot(frame.x - previous.x, frame.y - previous.y) < 1);
    assert.ok(frame.walk >= 0 && frame.walk <= 1 && frame.laugh >= 0 && frame.laugh <= 1);
    if (frame.walk === 0) assert.equal(frame.lean, 0, 'house stands upright outside walking');
    assert.ok(Math.abs(frame.lean) <= 2.5);
    previous = frame;
  }
});
test('reduced motion holds the same still pose', () => {
  for (const t of [0, 3000, 9000, 13000]) assert.deepEqual(loginMascotMotion(t, false), loginMascotMotion(0, false));
});
test('bulb anticipates a hop, lands, then waves as the house reacts', () => {
  assert.ok(palmBulbMotion(6035).squash > 0.1);
  assert.ok(palmBulbMotion(6725).jump > 12);
  assert.equal(palmBulbMotion(7630).jump, 0);
  assert.ok(palmBulbMotion(9000).wave > 0);
  assert.equal(loginMascotMotion(6000).walk, 0);
  assert.equal(loginMascotMotion(6000).inspect, 1);
  assert.equal(loginMascotMotion(9000).laugh, 1);
  assert.deepEqual(palmBulbMotion(LOGIN_STORY_DURATION), palmBulbMotion(0));
});
test('bulb alternates feet and stays inside the palm through smooth reversals', () => {
  let previous = palmBulbMotion(0);
  let leftSteps = 0, rightSteps = 0;
  for (let t = 16; t <= LOGIN_STORY_DURATION * 2; t += 16) {
    const frame = palmBulbMotion(t);
    assert.ok(Math.abs(frame.x) <= 5.00001);
    assert.ok(Math.abs(frame.x - previous.x) < 0.09);
    assert.ok(frame.leftLift === 0 || frame.rightLift === 0, 'one foot remains planted');
    if (frame.leftLift > 0.3) leftSteps++;
    if (frame.rightLift > 0.3) rightSteps++;
    assert.ok(Math.abs(frame.x) + 4.2 + Math.abs(frame.stride) + 3.1 <= 15, 'feet remain on the palm');
    previous = frame;
  }
  assert.ok(leftSteps > 0 && rightSteps > 0);
  for (const t of [0, 3000, 9000]) assert.deepEqual(palmBulbMotion(t, false), palmBulbMotion(0, false));
});
test('story reactions follow the bulb, then wave and bow together without abrupt changes', () => {
  assert.ok(loginMascotMotion(7000).surprise > 0.8);
  assert.ok(loginMascotMotion(13500).wave > 0.9);
  assert.ok(palmBulbMotion(13500).wave > 0);
  assert.equal(loginMascotMotion(29500).bow, 1);
  assert.ok(palmBulbMotion(29700).lean > 10);
  assert.equal(loginMascotMotion(31700).present, 1);
  assert.equal(palmBulbMotion(18500).dim, 1);
  assert.equal(palmBulbMotion(18500).glow, 0);
  assert.equal(loginMascotMotion(18500).comfort, 0);
  assert.equal(loginMascotMotion(22000).comfort, 1);
  assert.equal(palmBulbMotion(24600).dim, 0);
  assert.ok(palmBulbMotion(24600).glow > 0.2);
  assert.equal(loginMascotMotion(26000).celebrate, 1);
  assert.equal(loginMascotMotion(13500).dance, 1);
  assert.equal(loginMascotMotion(18500).dance, 0);
  assert.ok(loginMascotMotion(1500).danceRightY < 100);
  assert.ok(loginMascotMotion(1500).danceHandY > 120);
  assert.ok(loginMascotMotion(3000).danceHandY < 90);
  for (let t = 0; t < LOGIN_STORY_DURATION * 2; t += 16) {
    const a = loginMascotMotion(t), b = loginMascotMotion(t + 16);
    for (const key of ['pose', 'wave', 'bow', 'present', 'expression', 'notice', 'comfort', 'celebrate']) {
      assert.ok(Math.abs(a[key] - b[key]) < 0.05, `${key} changes smoothly`);
    }
    assert.ok(Math.abs(a.lean - b.lean) < 0.6);
    assert.ok(Math.abs(a.danceTilt - b.danceTilt) < 0.3);
    assert.ok(a.danceLeft === 0 || a.danceRight === 0, 'one foot supports the dance');
  }
});
