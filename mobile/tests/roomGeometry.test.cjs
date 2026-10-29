const { test } = require('node:test');
const assert = require('node:assert/strict');
const { roomGeometry, projectRoom, defaultCamera, orbitCamera } = require('../src/roomGeometry.ts');
const { makeRoomScene, furnitureCatalog } = require('../src/roomScene.ts');

test('moving uses fewer faces, preserves layout, and restores full detail', () => {
  const scene = makeRoomScene('bedroom');
  const original = JSON.stringify(scene);
  const full = roomGeometry(scene);
  const moving = roomGeometry(scene, true);
  assert(moving.length < full.length * 0.8);
  assert(moving.every(f => f.points.every(p => p.every(Number.isFinite))));
  assert.deepEqual(roomGeometry(scene, false), full);
  assert.equal(JSON.stringify(scene), original);
});

test('orbit changes perspective, a full turn returns to the same view, without changing saved layout', () => {
  const scene=makeRoomScene('bedroom'), original=JSON.stringify(scene);
  const faces=roomGeometry(scene);
  const a=projectRoom(faces,defaultCamera,400,400);
  const b=projectRoom(faces,{...defaultCamera,yaw:defaultCamera.yaw+Math.PI/2},400,400);
  const c=projectRoom(faces,{...defaultCamera,yaw:defaultCamera.yaw+Math.PI*2},400,400);
  const positions=items=>items.sort((x,y)=>x.key-y.key).map(f=>f.points);
  assert.notDeepEqual(positions(a),positions(b));
  assert.deepEqual(positions(a),positions(c));
  assert.equal(JSON.stringify(scene),original);
});
test('all furniture renders finite geometry and camera cannot flip upside down', () => {
  for(const f of furnitureCatalog) {
    const scene={period:'auto',decorations:[{id:f.kind,kind:f.kind,x:0.5,y:0.7,rotation:3,scale:1.3}]};
    const faces=roomGeometry(scene);
    assert(faces.every(face=>face.points.every(p=>p.every(Number.isFinite))));
  }
  assert.equal(orbitCamera(defaultCamera,20,-9999).pitch,0.18);
  assert.equal(orbitCamera(defaultCamera,20,9999).pitch,1.3);
});
