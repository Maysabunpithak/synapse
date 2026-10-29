const { test } = require('node:test');
const assert = require('node:assert/strict');
const { roomLight, clampPosition, validRoomScene, makeRoomScene, upgradeRoomScene, furnitureCatalog } = require('../src/roomScene.ts');

test('cottage migration keeps saved placement, IDs, custom colors and is repeatable', () => {
  const old = { version: 2, theme: 'coder', period: 'auto', wall: '#123456', floor: '#C6B4A2', decorations: [{ id: 'desk', kind: 'table_code', x: 0.61, y: 0.78, scale: 0.8, rotation: 1, color: '#123456' }] };
  const next = upgradeRoomScene('living', old);
  assert.equal(next.theme, 'cottage');
  assert.equal(next.wall, old.wall);
  assert.deepEqual(next.decorations[0], { ...old.decorations[0], kind: 'table_round' });
  assert.deepEqual(upgradeRoomScene('living', next), next);
  assert.equal(old.decorations[0].kind, 'table_code');
});
test('automatic lighting follows morning, day, evening and midnight boundaries', () => {
  assert.equal(roomLight('auto', 5).label, 'กลางคืน');
  assert.equal(roomLight('auto', 6).label, 'แสงเช้า');
  assert.equal(roomLight('auto', 10).label, 'กลางวัน');
  assert.equal(roomLight('auto', 17).label, 'แสงเย็น');
  assert.equal(roomLight('auto', 19).label, 'กลางคืน');
  assert.equal(roomLight('auto', 0).label, 'กลางคืน');
  assert.equal(roomLight('day', 0).label, 'กลางวัน');
});
test('room furniture is editable and legacy decorations survive the room upgrade', () => {
  for (const room of ['bedroom', 'living']) {
    const scene = makeRoomScene(room);
    assert.equal(validRoomScene(scene), true);
    assert.equal(scene.version, 2);
    assert.equal(scene.theme, 'cottage');
    assert.ok(scene.decorations.some(d => d.kind === (room === 'bedroom' ? 'bed_canopy' : 'sofa_round')));
    assert.equal(upgradeRoomScene(room, scene).decorations.length, scene.decorations.length);
  }
  const old = { period: 'night', decorations: [{ id: 'old-plant', kind: 'plant', x: 0.2, y: 0.7 }] };
  const upgraded = upgradeRoomScene('bedroom', old);
  assert.equal(upgraded.period, 'auto');
  assert.ok(upgraded.decorations.some(d => d.id === 'old-plant'));
  assert.equal(old.period, 'night');
  assert.equal(upgraded.decorations[0].x, 0.2);
  assert.equal(upgraded.decorations[0].y, 0.7);
  const edited = { ...upgraded, wall: '#123456' };
  assert.deepEqual(upgradeRoomScene('bedroom', edited), edited);
  assert.equal(validRoomScene(upgraded), true);
});
test('new furniture colors, orientations, sizes and object limit are validated', () => {
  const scene = makeRoomScene('living');
  for (const f of furnitureCatalog) {
    assert.equal(validRoomScene({ ...scene, decorations: [{ id: f.kind, kind: f.kind, x: 0.5, y: 0.7, color: '#90A895', rotation: 3, scale: 1.3 }] }), true);
  }
  for (const patch of [{ rotation: 4 }, { scale: 0 }, { color: 'url(test)' }, { kind: 'unknown' }]) {
    assert.equal(validRoomScene({ ...scene, decorations: [{ ...scene.decorations[0], ...patch }] }), false);
  }
  assert.equal(validRoomScene({ ...scene, decorations: Array.from({ length: 25 }, (_, i) => ({ ...scene.decorations[0], id: String(i) })) }), false);
});
test('drag positions stay inside the room and persisted layouts reject invalid objects', () => {
  assert.equal(clampPosition(-2), 0.1);
  assert.equal(clampPosition(3), 0.9);
  const item = { id: 'plant-1', kind: 'plant', x: 0.5, y: 0.7 };
  assert.equal(validRoomScene({ period: 'auto', decorations: [item] }), true);
  for (const scene of [null, { period: 'invalid', decorations: [] }, { period: 'auto', decorations: [null] }, { period: 'auto', decorations: [item, item] }, { period: 'auto', decorations: [{ ...item, x: 4 }] }, { period: 'auto', decorations: [{ ...item, y: NaN }] }]) {
    assert.equal(validRoomScene(scene), false);
  }
});
