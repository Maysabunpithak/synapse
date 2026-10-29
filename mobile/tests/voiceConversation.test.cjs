const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ts = require('../node_modules/typescript');
const flush = async () => { for (let i = 0; i < 25; i++) await Promise.resolve(); };

function setup(silenceAction = 'empty') {
  const timers = new Map();
  let timerId = 0, recordings = 0, commands = 0, discarded = 0, releaseReply, appState, recordingFactory, permissionFactory;
  const options = { active: true, api: 'http://test', demo: false, onTranscript() {}, onReply() {}, onComplete: async () => {} };
  const modules = {
    react: { useRef: current => ({ current }), useState: value => [value, () => {}], useCallback: fn => fn, useEffect: fn => fn() },
    'react-native': { Platform: { OS: 'web' }, AppState: { currentState: 'active', addEventListener: (_, fn) => { appState = fn; return { remove() {} }; } } },
    'expo-audio': { RecordingPresets: { HIGH_QUALITY: {} }, setAudioModeAsync: async () => {},
      AudioModule: { getRecordingPermissionsAsync: async () => permissionFactory ? permissionFactory() : { granted: true } },
      useAudioRecorder: () => ({ prepareToRecordAsync: async () => {}, record: () => { recordings++; }, stop: async () => {} }) },
    'expo-speech': {}, 'expo-file-system': {},
    './webRecording': { startWebRecording: async () => { recordings++; return recordingFactory ? recordingFactory() : { stop: async () => new Blob(['audio']), discard() { discarded++; }, getMetering: () => -100 }; } },
    './thai': { thaiError: (error, fallback) => error.message || fallback },
    './spokenReply': { createSpokenReply: () => ({ stop: async () => { releaseReply?.(); }, reply: () => new Promise(resolve => { releaseReply = resolve; }) }) },
    './voiceLifecycle': require('../src/voiceLifecycle.ts'),
    './voiceSilence': { createSilenceDetector: () => () => silenceAction },
  };
  const context = {
    exports: {}, require: name => modules[name], Blob, FormData, AbortController,
    navigator: { mediaDevices: { getUserMedia() {} } }, MediaRecorder() {},
    setTimeout: (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; },
    clearTimeout: id => timers.delete(id), setInterval: fn => { timers.set(++timerId, { fn, ms: 100 }); return timerId; }, clearInterval: id => timers.delete(id),
    fetch: async url => ({ ok: true, json: async () => url.endsWith('/transcribe') ? { ok: true, text: 'turn on light' } : (commands++, { ok: true, speech: 'done' }) }),
  };
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/useVoiceCommand.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, context);
  const hook = context.exports.useVoiceCommand(options);
  return { hook, options, recordings: () => recordings, commands: () => commands, discarded: () => discarded,
    hasTimer: ms => [...timers.values()].some(t => t.ms === ms), setRecording: factory => { recordingFactory = factory; },
    nativePermission: factory => { modules['react-native'].Platform.OS = 'android'; permissionFactory = factory; },
    reply: () => releaseReply(), background: () => appState('background'), fire: ms => [...timers.values()].find(t => t.ms === ms).fn(), setFetch: fn => { context.fetch = fn; } };
}

test('one tap executes successive commands and waits for each spoken reply before listening', async () => {
  const s = setup();
  await s.hook.toggle();
  assert.equal(s.recordings(), 1);
  s.fire(30000); await flush();
  assert.equal(s.commands(), 1);
  assert.equal(s.recordings(), 1);
  s.reply(); await flush();
  assert.equal(s.recordings(), 2);
  s.fire(30000); await flush();
  assert.equal(s.commands(), 2);
  s.reply(); await flush();
  assert.equal(s.recordings(), 3);
  s.hook.cancel();
});

test('tapping during a reply ends the conversation without reopening the mic', async () => {
  const s = setup();
  await s.hook.toggle(); s.fire(30000); await flush();
  await s.hook.toggle(); await flush();
  assert.equal(s.recordings(), 1);
});

test('backgrounding during a reply prevents the next recording', async () => {
  const s = setup();
  await s.hook.toggle(); s.fire(30000); await flush();
  s.background(); await flush();
  assert.equal(s.recordings(), 1);
});

test('quiet capture windows continue listening without sending a device command', async () => {
  const s = setup();
  await s.hook.toggle(); s.fire(100); await flush();
  assert.equal(s.commands(), 0);
  assert.equal(s.recordings(), 2);
  s.hook.cancel();
});

test('a late transcription after cancellation cannot execute a command or reopen the mic', async () => {
  const s = setup();
  let resolve, calls = 0;
  s.setFetch(() => { calls++; return new Promise(done => { resolve = done; }); });
  await s.hook.toggle(); s.fire(30000); await flush();
  await s.hook.toggle();
  resolve({ ok: true, json: async () => ({ ok: true, text: 'turn on light' }) });
  await flush();
  assert.equal(calls, 1);
  assert.equal(s.recordings(), 1);
});

test('leaving AI during playback cannot restart recording', async () => {
  const s = setup();
  await s.hook.toggle(); s.fire(30000); await flush();
  s.options.active = false;
  s.hook.cancel(); await flush();
  assert.equal(s.recordings(), 1);
});

test('holding records until release, sends once, and never reopens after the reply', async () => {
  const s = setup();
  await s.hook.beginHold();
  await s.hook.beginHold();
  assert.equal(s.recordings(), 1);
  assert.equal(s.commands(), 0);
  assert.equal(s.hasTimer(100), false, 'silence must not submit a held command');
  const sent = s.hook.endHold();
  await flush();
  assert.equal(s.commands(), 1);
  await s.hook.endHold();
  await s.hook.beginHold();
  assert.equal(s.recordings(), 1, 'cannot start while processing');
  s.reply(); await sent; await flush();
  assert.equal(s.recordings(), 1, 'reply must not reopen the microphone');
  await s.hook.beginHold();
  assert.equal(s.recordings(), 2, 'a new hold starts a new capture');
  s.hook.cancel();
});

test('release before microphone permission/setup resolves discards the late recording', async () => {
  const s = setup();
  let resolveRecording, discarded = 0;
  s.setRecording(() => new Promise(resolve => { resolveRecording = resolve; }));
  const starting = s.hook.beginHold(); await flush();
  await s.hook.endHold();
  resolveRecording({ discard() { discarded++; } });
  await starting; await flush();
  assert.equal(discarded, 1);
  assert.equal(s.commands(), 0);
  assert.equal(s.hasTimer(30000), false);
});

test('cancel or background while holding discards audio without a command', async () => {
  for (const action of ['cancel', 'background']) {
    const s = setup();
    await s.hook.beginHold();
    if (action === 'cancel') s.hook.cancel(); else s.background();
    await s.hook.endHold(); await flush();
    assert.equal(s.discarded(), 1);
    assert.equal(s.commands(), 0);
    assert.equal(s.hasTimer(30000), false);
  }
});

test('hold time limit sends once and a later release cannot send or start again', async () => {
  const s = setup();
  await s.hook.beginHold(); s.fire(30000); await flush();
  assert.equal(s.commands(), 1);
  await s.hook.endHold();
  s.reply(); await flush();
  assert.equal(s.commands(), 1);
  assert.equal(s.recordings(), 1);
});

test('releasing without beginning a hold does not open or send audio', async () => {
  const s = setup();
  await s.hook.endHold(); await flush();
  assert.equal(s.recordings(), 0);
  assert.equal(s.commands(), 0);
});

test('Android permission resolving after release cannot start the native recorder', async () => {
  const s = setup();
  let allow;
  s.nativePermission(() => new Promise(resolve => { allow = resolve; }));
  const starting = s.hook.beginHold(); await flush();
  await s.hook.endHold();
  allow({ granted: true }); await starting; await flush();
  assert.equal(s.recordings(), 0);
  assert.equal(s.commands(), 0);
  assert.equal(s.hasTimer(30000), false);
});


test('tap sends once after speech ends and does not reopen after the reply', async () => {
  const s = setup('send');
  await s.hook.tap();
  assert.equal(s.recordings(), 1);
  s.fire(100); await flush();
  assert.equal(s.commands(), 1);
  assert.equal(s.hasTimer(100), false);
  await s.hook.tap();
  assert.equal(s.recordings(), 1, 'busy taps cannot submit again');
  s.reply(); await flush();
  assert.equal(s.recordings(), 1);
  await s.hook.tap();
  assert.equal(s.recordings(), 2);
  s.hook.cancel();
});

test('second tap cancels capture without sending a command', async () => {
  const s = setup();
  await s.hook.tap(); await s.hook.tap(); await flush();
  assert.equal(s.discarded(), 1);
  assert.equal(s.commands(), 0);
  assert.equal(s.hasTimer(100), false);
  assert.equal(s.hasTimer(30000), false);
});

test('tap with no speech closes the microphone without a command or restart', async () => {
  const s = setup();
  await s.hook.tap(); s.fire(100); await flush();
  assert.equal(s.discarded(), 1);
  assert.equal(s.commands(), 0);
  assert.equal(s.recordings(), 1);
  assert.equal(s.hasTimer(30000), false);
});
