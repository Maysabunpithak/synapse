const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ts = require('../node_modules/typescript');

function surface() {
  const calls = [], touches = [], timers = new Map(), cleanups = [];
  let next = 0, appState;
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: { useRef: current => ({ current }), useState: value => [value, () => {}], useEffect: fn => { const end = fn(); if (end) cleanups.push(end); } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', StyleSheet: { create: x => x }, AppState: { addEventListener: (_, fn) => { appState = fn; return { remove() {} }; } } },
  };
  const context = { exports: {}, require: name => modules[name],
    setTimeout: (fn, ms) => { timers.set(++next, { fn, ms }); return next; }, clearTimeout: id => timers.delete(id) };
  const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/HoldToTalk.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, context);
  const node = context.exports.default({ active: false, disabled: false, onStart: () => calls.push('start'),
    onEnd: () => calls.push('send'), onCancel: () => calls.push('cancel'), onTouchStateChange: value => touches.push(value), children: null });
  const event = (x = 134, y = 134) => ({ nativeEvent: { pageX: x, pageY: y, locationX: x, locationY: y, touches: [{}] } });
  return { calls, touches, node, event, timers, down: () => node.props.onResponderGrant(event()),
    hold: () => { for (const [id, t] of timers) { timers.delete(id); assert.equal(t.ms, 350); t.fn(); } },
    up: () => node.props.onResponderRelease(), background: () => appState('background'), unmount: () => cleanups.forEach(fn => fn()) };
}

test('a quick tap never opens the microphone', () => {
  const s = surface(); s.down(); s.up(); s.hold();
  assert.deepEqual(s.calls, []);
});

test('a short touch wakes the companion immediately without starting voice capture', () => {
  const s = surface(); s.down();
  assert.equal(s.touches.at(-1), true);
  assert.deepEqual(s.calls, []);
  s.up();
  assert.equal(s.touches.at(-1), false);
  assert.deepEqual(s.calls, []);
});

test('holding the house then releasing starts and sends exactly once', () => {
  const s = surface(); s.down(); s.hold(); s.up(); s.up();
  assert.deepEqual(s.calls, ['start', 'send']);
});

test('dragging to scroll before the hold threshold does not record', () => {
  const s = surface(); s.down(); s.node.props.onResponderMove(s.event(134, 170)); s.hold(); s.up();
  assert.deepEqual(s.calls, []);
});

test('sliding outside the house cancels instead of sending', () => {
  const s = surface(); s.down(); s.hold(); s.node.props.onResponderMove(s.event(300, 134)); s.up();
  assert.deepEqual(s.calls, ['start', 'cancel']);
});

test('OS interruption, background, and unmount cancel an active hold', () => {
  for (const action of ['terminate', 'background', 'unmount']) {
    const s = surface(); s.down(); s.hold();
    if (action === 'terminate') s.node.props.onResponderTerminate();
    else s[action]();
    assert.deepEqual(s.calls, ['start', 'cancel']);
    assert.equal(s.timers.size, 0);
  }
});

test('background or unmount before the threshold prevents a delayed microphone start', () => {
  for (const action of ['background', 'unmount']) {
    const s = surface(); s.down(); s[action](); s.hold();
    assert.deepEqual(s.calls, []);
  }
});
