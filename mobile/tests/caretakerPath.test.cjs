const { test } = require('node:test');
const assert = require('node:assert/strict');
const { caretakerPath, caretakerFeet, furnitureFootprint, clearCaretakerPosition, pointOnCaretakerPath, pathLength, planCaretaker, sampleCaretakerLife, groundLayer, furnitureLayer, CARETAKER_RAMP_MS } = require('../src/caretakerPath.ts');
const { makeRoomScene, furnitureCatalog } = require('../src/roomScene.ts');
const { bedRestPose } = require('../src/caretakerPath.ts');

test('getting off the bed takes two forward steps down and lands on the floor', () => {
  const floor = { x: 80, y: 140 }, mattress = { x: 130, y: 80 }, duration = 30000;
  const pose = t => bedRestPose(floor, mattress, duration - 2700 + t, duration, true);
  assert.deepEqual(pose(0).position, mattress);
  assert.equal(pose(800).walkWeight, 1);
  assert.equal(pose(1350).stepTime, 500);
  assert.equal(pose(2350).stepTime, 1000);
  assert.ok(Math.abs(pose(2700).position.x - floor.x) < 1e-8);
  assert.ok(Math.abs(pose(2700).position.y - floor.y) < 1e-8);
  assert.equal(pose(2700).walkWeight, 0);
  let previous = pose(0);
  for (let t = 16; t <= 2700; t += 16) {
    const current = pose(t);
    assert.ok(current.position.y >= previous.position.y);
    assert.ok(current.stepTime >= previous.stepTime);
    assert.equal(current.air, 0);
    assert.ok(Math.hypot(current.position.x - previous.position.x, current.position.y - previous.position.y) < 2);
    previous = current;
  }
});

test('bed jump crouches, follows an arc, lands softly and sleeps without stepping backwards', () => {
  const start = { x: 80, y: 140 }, end = { x: 130, y: 80 };
  const pose = t => bedRestPose(start, end, t, 30000, true);
  assert.deepEqual(pose(0).position, start);
  assert.ok(pose(200).squash > 0.1);
  assert.equal(pose(200).amount, 0);
  assert.ok(pose(1100).position.y < (start.y + end.y) / 2 - 15);
  assert.deepEqual(pose(1800).position, end);
  assert.ok(pose(2025).squash > 0.08);
  assert.equal(pose(3000).activity, 'sleep');
  let previous = pose(0);
  for (let t = 16; t < 3000; t += 16) {
    const current = pose(t);
    assert.ok(current.position.x >= previous.position.x);
    assert.ok(Math.hypot(current.position.x - previous.position.x, current.position.y - previous.position.y) < 4);
    assert.equal(current.walkWeight, 0);
    previous = current;
  }
});

test('watering walks to a safe reachable spot next to the pot before starting', () => {
  const size = 60, width = 360, height = 242;
  const reachPoint = { x: 260, y: 142 };
  const obstacles = [furnitureFootprint('plant', 260, 156, 55)];
  const plan = planCaretaker(width, height, size, obstacles, [
    { x: 0.3, y: 0.8, activity: 'rest', dwell: 2000, task: 'read' },
    { x: 0.65, y: 0.75, activity: 'awake', dwell: 6000, task: 'water', targetId: 'plant', reachPoint },
  ]);
  const leg = plan.find(item => item.task === 'water');
  assert.ok(leg.length > 0, 'walks from the previous activity');
  const p = leg.path.at(-1);
  assert.ok(clearCaretakerPosition(p, size, width, height, obstacles));
  assert.ok(Math.hypot(reachPoint.x - p.x - size * 0.5, reachPoint.y - p.y - size * 0.58) <= size * 0.95);
});

test('room tasks keep their target even when consecutive activities share a stopping point', () => {
  for (const task of ['water', 'read', 'look', 'sit', 'sleep']) {
    const stops = [{ x: 0.5, y: 0.8, activity: 'awake', dwell: 2000 }, { x: 0.5, y: 0.8, activity: 'rest', dwell: 7000, task, targetId: 'furniture' }];
    const plan = planCaretaker(360, 242, 72, [], stops);
    const life = sampleCaretakerLife(plan, 3000, 24);
    assert.equal(life.task, task);
    assert.equal(life.targetId, 'furniture');
    assert.equal(life.moving, false);
    assert.equal(life.settled, true);
    assert.equal(life.preparing, false);
  }
});

test('bed rest climbs smoothly, sleeps on the mattress, wakes, and returns to the same floor position', () => {
  const ground = { x: 80, y: 140 }, mattress = { x: 130, y: 80 }, duration = 10400;
  assert.deepEqual(bedRestPose(ground, mattress, 0, duration).position, ground);
  assert.equal(bedRestPose(ground, mattress, 3000, duration).activity, 'sleep');
  assert.ok(Math.hypot(bedRestPose(ground, mattress, 3000, duration).position.x - mattress.x, bedRestPose(ground, mattress, 3000, duration).position.y - mattress.y) < 1e-8);
  assert.equal(bedRestPose(ground, mattress, duration - 2000, duration).activity, 'rest');
  for (const t of [0, 400, 1000, 2000]) {
    const pose = bedRestPose(ground, mattress, t, duration);
    assert.equal(pose.activity, 'rest', 'no arms-open pose beside the bed');
    assert.equal(pose.walkWeight, 0, 'no extra walking cycle during the climb');
  }
  assert.deepEqual(bedRestPose(ground, mattress, duration, duration).position, ground);
  let previous = ground;
  for (let t = 16; t <= duration; t += 16) {
    const current = bedRestPose(ground, mattress, t, duration).position;
    assert.ok(Math.hypot(current.x - previous.x, current.y - previous.y) < 1.5, 'no position jump');
    previous = current;
  }
});

test('bed destinations retain their bed association even when two stops share a floor position', () => {
  const stops = [{ x: 0.5, y: 0.8, activity: 'awake', dwell: 2000 }, { x: 0.5, y: 0.8, activity: 'rest', dwell: 10400, bedId: 'bed' }];
  const plan = planCaretaker(360, 242, 72, [], stops);
  assert.equal(plan[0].bedId, 'bed');
  assert.equal(sampleCaretakerLife(plan, 3000, 24).bedId, 'bed');
});

function obstaclesFor(items, width, height) {
  return items.flatMap(d => {
    const size = width * furnitureCatalog.find(f => f.kind === d.kind).size * (d.scale ?? 1);
    const footprint = furnitureFootprint(d.kind, d.x * width, d.y * height, size);
    return footprint ? [footprint] : [];
  });
}

test('default furnished bedroom selects the connected floor area that can reach its plant', () => {
  const width = 360, height = 242, size = 72;
  const items = makeRoomScene('bedroom').decorations;
  const plant = items.find(item => item.kind === 'plant');
  const plantSize = width * 0.18;
  const reachPoint = { x: plant.x * width + plantSize / 140, y: plant.y * height + (83 / 140 - 0.86) * plantSize };
  const plan = planCaretaker(width, height, size, obstaclesFor(items, width, height), [
    { x: 0.63, y: 0.59, activity: 'attentive', task: 'look', dwell: 5200 },
    { x: plant.x - 0.12, y: plant.y + 0.1, activity: 'awake', task: 'water', dwell: 6200, reachPoint },
  ]);
  const water = plan.find(leg => leg.task === 'water');
  assert.ok(water.length >= 12, 'walks to the plant instead of starting with no movement');
  const end = water.path.at(-1);
  assert.ok(Math.hypot(reachPoint.x - end.x - size * 0.5, reachPoint.y - end.y - size * 0.58) <= size * 0.95);
});

test('patrol stays inside the floor and clears furniture throughout every segment', () => {
  for (const room of ['bedroom', 'living']) for (const [width, height] of [[360, 242], [360, 216], [560, 360]]) {
    const size = Math.min(84, width * 0.2, height * 0.32);
    const obstacles = obstaclesFor(makeRoomScene(room).decorations, width, height);
    const path = caretakerPath(width, height, size, obstacles);
    assert.ok(path.length > 1, `${room} ${width}x${height} has walking space`);
    assert.ok(Math.max(...path.map(p => p.x)) - Math.min(...path.map(p => p.x)) >= size, 'patrol still covers more than a body width with full-stride clearance');
    assert.ok(Math.max(...path.map(p => p.y)) - Math.min(...path.map(p => p.y)) >= height * 0.08, 'patrol changes depth');
    for (let distance = 0; distance <= pathLength(path); distance += 0.5) {
      const p = pointOnCaretakerPath(path, distance);
      assert.ok(clearCaretakerPosition(p, size, width, height, obstacles));
      const feet = caretakerFeet(p, size);
      assert.ok(obstacles.every(o => feet.x + feet.width <= o.x || feet.x >= o.x + o.width || feet.y + feet.height <= o.y || feet.y >= o.y + o.height));
    }
  }
});

test('moving and enlarging furniture recomputes a safe route', () => {
  const initial = caretakerPath(360, 242, 36, []);
  const middle = initial[Math.floor(initial.length / 2)];
  const obstacle = { x: middle.x - 12, y: middle.y - 12, width: 64, height: 64 };
  for (const o of [obstacle, { ...obstacle, x: obstacle.x + 30, width: 90, height: 90 }]) {
    const path = caretakerPath(360, 242, 36, [o]);
    assert.notDeepEqual(path, initial);
    assert.ok(path.length > 1);
    for (let d = 0; d <= pathLength(path); d++) assert.ok(clearCaretakerPosition(pointOnCaretakerPath(path, d), 36, 360, 242, [o]));
  }
});

test('fully blocked rooms never produce an unsafe fallback path', () => {
  assert.deepEqual(caretakerPath(360, 242, 36, [{ x: 0, y: 0, width: 360, height: 242 }]), []);
  assert.deepEqual(caretakerPath(0, 0, 36, []), []);
  assert.equal(pointOnCaretakerPath([], 20), null);
});

test('full-stride clearance survives narrow gaps, furniture variants, and resized pieces', () => {
  for (const kind of ['bed_bear', 'bed_canopy', 'sofa_round', 'sofa_cat']) for (const scale of [0.7, 1, 1.3]) {
    const items = makeRoomScene('bedroom').decorations.map(d => d.kind.startsWith('bed') || d.kind.startsWith('sofa') ? { ...d, kind, scale } : d);
    const obstacles = obstaclesFor(items, 360, 242);
    const path = caretakerPath(360, 242, 72, obstacles);
    for (let distance = 0; distance <= pathLength(path) && path.length; distance += 0.25) {
      const p = pointOnCaretakerPath(path, distance);
      assert.ok(clearCaretakerPosition(p, 72, 360, 242, obstacles), `${kind} scale ${scale} at ${distance}`);
    }
  }
});

test('a character in front of furniture is visible, and only a character behind it is occluded', () => {
  for (const kind of ['bed', 'sofa', 'table', 'shelf', 'plant', 'bear']) {
    for (const size of [60, 120, 156]) {
      const footprint = furnitureFootprint(kind, 180, 160, size);
      const layer = furnitureLayer(kind, 160, size);
      assert.ok(groundLayer(footprint.y - 8) < layer, 'passing behind is occluded');
      assert.ok(groundLayer(footprint.y + footprint.height + 8) > layer, 'passing in front stays visible');
      assert.ok(furnitureLayer('rug', 210, 200) < layer);
    }
  }
  assert.ok(furnitureLayer('rug', 220, 150) < groundLayer(120), 'rugs never cover the character');
  assert.ok(furnitureLayer('window', 180, 100) < groundLayer(120));
});

test('daily routes join continuously, pause at destinations, and keep a steady walking speed', () => {
  const width = 360, height = 242, size = 72, speed = 24;
  const obstacles = obstaclesFor(makeRoomScene('bedroom').decorations, width, height);
  const plan = planCaretaker(width, height, size, obstacles);
  assert.ok(plan.length >= 3);
  let clock = 0;
  for (let i = 0; i < plan.length; i++) {
    const leg = plan[i];
    const next = plan[(i + 1) % plan.length];
    assert.deepEqual(leg.path.at(-1), next.path[0], 'no teleport between activities');
    const duration = leg.length / speed * 1000 + CARETAKER_RAMP_MS;
    const rest = sampleCaretakerLife(plan, clock + duration + 500, speed);
    assert.equal(rest.moving, false);
    assert.equal(rest.activity, leg.activity);
    assert.deepEqual(rest.position, leg.path.at(-1));
    assert.equal(rest.settled, true);
    const prepare = sampleCaretakerLife(plan, clock + duration + leg.dwell - 650, speed);
    assert.equal(prepare.preparing, true, 'stand up before moving');
    assert.equal(prepare.moving, false);
    assert.deepEqual(prepare.position, leg.path.at(-1));
    const first = sampleCaretakerLife(plan, clock + 16, speed);
    assert.ok(first.walkWeight < 0.1, 'ease into walking');
    clock += duration + leg.dwell;
  }
  let previous = sampleCaretakerLife(plan, 0, speed);
  for (let time = 16; time <= clock + 1000; time += 16) {
    const current = sampleCaretakerLife(plan, time, speed);
    assert.ok(Math.hypot(current.position.x - previous.position.x, current.position.y - previous.position.y) <= speed * 0.016 + 0.01, 'no jumps or speed spikes');
    assert.ok(clearCaretakerPosition(current.position, size, width, height, obstacles));
    previous = current;
  }
});
