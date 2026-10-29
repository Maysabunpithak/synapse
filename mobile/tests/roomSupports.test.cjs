const { test } = require('node:test');
const assert = require('node:assert/strict');
const { furnitureCatalog, isRoomDoll, placeDecoration, supportedDecorations, removeDecoration, validRoomScene } = require('../src/roomScene.ts');

function bedScene(kind = 'bed', rotation = 0) {
  const bed = { id: 'bed', kind, x: 0.45, y: 0.7, rotation, scale: 1 };
  const doll = { id: 'doll', kind: 'bear', x: 0.5, y: 0.8 };
  return [bed, doll];
}
function putOnBed(items, width = 360, height = 280) {
  const bed = items[0];
  const size = width * furnitureCatalog.find(f => f.kind === bed.kind).size * bed.scale;
  const u = bed.rotation % 2 ? 0.45 : 0.55;
  return placeDecoration(items, 'doll', bed.x + (u - 0.5) * size / width, bed.y + (0.55 - 0.86) * size / height, width, height);
}

test('all dolls attach to every bed design and mirrored mattresses', () => {
  for (const bed of furnitureCatalog.filter(f => f.kind.startsWith('bed'))) for (const doll of furnitureCatalog.filter(f => isRoomDoll(f.kind))) for (const rotation of [0, 1]) {
    const items = bedScene(bed.kind, rotation); items[1].kind = doll.kind;
    const placed = putOnBed(items);
    assert.equal(placed[1].support.id, 'bed');
    assert.ok(validRoomScene(JSON.parse(JSON.stringify({ period: 'auto', decorations: placed }))));
  }
});

test('dolls follow bed movement, resizing, and different room aspect ratios', () => {
  const items = putOnBed(bedScene());
  const moved = placeDecoration(items, 'bed', 0.55, 0.75, 360, 280);
  const resolved = supportedDecorations(moved, 360, 280);
  assert.ok(Math.abs(resolved[1].x - items[1].x - 0.1) < 1e-8);
  assert.ok(Math.abs(resolved[1].y - items[1].y - 0.05) < 1e-8);
  moved[0].scale = 1.3;
  for (const [w, h] of [[360, 280], [560, 216]]) {
    const displayed = supportedDecorations(moved, w, h);
    const size = w * 0.34 * 1.3;
    assert.ok(Math.abs((displayed[1].y - moved[0].y) * h / size + 0.86 - 0.55) < 1e-8);
  }
});

test('dragging off detaches; deleting a bed keeps its doll and removes the reference', () => {
  const items = putOnBed(bedScene());
  const detached = placeDecoration(items, 'doll', 0.8, 0.85, 360, 280);
  assert.equal(detached[1].support, undefined);
  const remaining = removeDecoration(items, 'bed', 360, 280);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].support, undefined);
  assert.ok(validRoomScene({ period: 'auto', decorations: remaining }));
  assert.equal(validRoomScene({ period: 'auto', decorations: [items[1]] }), false);
});

test('other furniture does not attach and drops outside the mattress stay on the floor', () => {
  const items = bedScene(); items[1].kind = 'plant';
  assert.equal(putOnBed(items)[1].support, undefined);
  const offBed = placeDecoration(bedScene(), 'doll', 0.1, 0.1, 360, 280);
  assert.equal(offBed[1].support, undefined);
});
