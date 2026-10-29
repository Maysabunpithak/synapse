const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDebouncedWriter } = require('../src/debouncedWriter.ts');

test('rapid slider changes write only the latest brightness and tone', async () => {
  const writes = [];
  const writer = createDebouncedWriter(async value => { writes.push(value); });
  writer.enqueue({ brightness: 15, warm: true });
  writer.enqueue({ brightness: 70, warm: true });
  writer.enqueue({ brightness: 70, warm: false });
  assert.deepEqual(writes, []);
  await writer.flush();
  assert.deepEqual(writes, [{ brightness: 70, warm: false }]);
});

test('a pause submits automatically without an explicit flush', async () => {
  let resolve;
  const submitted = new Promise(done => { resolve = done; });
  const writer = createDebouncedWriter(async value => { resolve(value); }, 5);
  writer.enqueue(35);
  assert.equal(await submitted, 35);
  await writer.cancel();
});

test('slow network preserves the final value without overlapping requests', async () => {
  const writes = [];
  let finishFirst;
  const first = new Promise(done => { finishFirst = done; });
  const writer = createDebouncedWriter(async value => {
    writes.push(value);
    if (value === 10) await first;
  });
  writer.enqueue(10);
  const initial = writer.flush();
  await Promise.resolve();
  writer.enqueue(40);
  writer.enqueue(90);
  const final = writer.flush();
  assert.deepEqual(writes, [10]);
  finishFirst();
  await Promise.all([initial, final]);
  assert.deepEqual(writes, [10, 90]);
});

test('power off cancels queued brightness and waits for an active write', async () => {
  const writes = [];
  let finish;
  const inflight = new Promise(done => { finish = done; });
  const writer = createDebouncedWriter(async value => { writes.push(value); await inflight; });
  writer.enqueue(25);
  const saving = writer.flush();
  await Promise.resolve();
  writer.enqueue(80);
  const powerOff = writer.cancel().then(() => { writes.push('off'); });
  assert.deepEqual(writes, [25]);
  finish();
  await Promise.all([saving, powerOff]);
  await writer.flush();
  assert.deepEqual(writes, [25, 'off']);
});

test('opening a panel does not write and cancelling prevents unsent changes', async () => {
  const writes = [];
  const writer = createDebouncedWriter(async value => { writes.push(value); });
  await writer.flush();
  assert.deepEqual(writes, []);
  writer.enqueue(70);
  await writer.cancel();
  await writer.flush();
  assert.deepEqual(writes, []);
});
