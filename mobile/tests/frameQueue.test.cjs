const { test } = require('node:test');
const assert = require('node:assert/strict');
const { frameQueue } = require('../src/frameQueue.ts');

function setup() {
  const frames = new Map(), committed = [];
  let id = 0;
  const queue = frameQueue(value => committed.push(value), cb => {
    frames.set(++id, cb); return id;
  }, id => frames.delete(id));
  return { queue, frames, committed, tick() { [...frames.values()].forEach(cb => cb()); } };
}

test('many pointer events commit only the newest position per frame', () => {
  const s = setup();
  for (let x = 0; x < 100; x++) s.queue.push({ x, y: x * 2 });
  assert.equal(s.frames.size, 1);
  assert.deepEqual(s.committed, []);
  s.tick();
  assert.deepEqual(s.committed, [{ x: 99, y: 198 }]);
  assert.equal(s.frames.size, 0);
  s.queue.push({ x: 110, y: 220 }); s.tick();
  assert.equal(s.committed.length, 2);
});

test('release flushes the final position immediately without a duplicate frame', () => {
  const s = setup();
  s.queue.push(1); s.queue.push(2); s.queue.flush(); s.tick();
  assert.deepEqual(s.committed, [2]);
  assert.equal(s.frames.size, 0);
});

test('cancel or unmount prevents a stale ghost update after dropping', () => {
  const s = setup();
  s.queue.push(1); s.queue.cancel(); s.tick(); s.queue.flush();
  assert.deepEqual(s.committed, []);
  s.queue.push(2); s.tick();
  assert.deepEqual(s.committed, [2]);
});
