const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createSpokenReply } = require('../src/spokenReply.ts');

test('robot speaking state follows playback and ignores a stale completion', async () => {
  const states = [], calls = [];
  const voice = createSpokenReply({ stop: async () => {}, speak: (_, options) => calls.push(options) }, () => {}, value => states.push(value));
  await voice.reply('first');
  assert.equal(states.at(-1), true);
  await voice.reply('second');
  calls[0].onDone();
  assert.equal(states.at(-1), true);
  calls[1].onDone();
  assert.equal(states.at(-1), false);
  await voice.reply('third');
  await voice.stop();
  assert.equal(states.at(-1), false);
});

test('speech errors clear the robot speaking state', async () => {
  const states = [];
  const voice = createSpokenReply({ stop: async () => {}, speak: (_, options) => options.onError() }, () => {}, value => states.push(value));
  await voice.reply('reply');
  assert.equal(states[0], true);
  assert.equal(states.at(-1), false);
});

test('listening can wait until the spoken wake acknowledgement finishes', async () => {
  let callbacks;
  let finished = false;
  const voice = createSpokenReply({ stop: async () => {}, speak: (_, options) => { callbacks = options; } }, () => {});
  const pending = voice.reply('ค่ะ มีอะไรให้ช่วยคะ', true).then(() => { finished = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(finished, false);
  callbacks.onDone();
  await pending;
  assert.equal(finished, true);
});

test('turning off listening releases a pending spoken acknowledgement', async () => {
  const voice = createSpokenReply({ stop: async () => {}, speak: () => {} }, () => {});
  const pending = voice.reply('ค่ะ', true);
  await new Promise(resolve => setImmediate(resolve));
  await voice.stop();
  await pending;
});

test('speaks the displayed backend reply in Thai and reports playback errors', async () => {
  const displayed = [];
  const calls = [];
  const voice = createSpokenReply({ stop: async () => {}, speak: (...args) => calls.push(args) }, text => displayed.push(text));
  await voice.reply('เปิดไฟแล้วค่ะ');
  assert.equal(calls[0][0], displayed[0]);
  assert.equal(calls[0][1].language, 'th-TH');
  calls[0][1].onError();
  assert.match(displayed[1], /เปิดเสียงตอบกลับไม่ได้/);
});

test('cancel prevents a pending reply from speaking after leaving AI or starting a recording', async () => {
  let resolve;
  let calls = 0;
  const voice = createSpokenReply({
    stop: () => new Promise(done => { if (!resolve) resolve = done; else done(); }),
    speak: () => calls++,
  }, () => {});
  const pending = voice.reply('old reply');
  await voice.stop();
  resolve();
  await pending;
  assert.equal(calls, 0);
});

test('an old playback error does not overwrite the latest reply', async () => {
  const displayed = [];
  const calls = [];
  const voice = createSpokenReply({stop: async () => {}, speak: (...args) => calls.push(args)}, text => displayed.push(text));
  await voice.reply('first');
  await voice.reply('second');
  calls[0][1].onError();
  assert.deepEqual(displayed, ['first', 'second']);
});
