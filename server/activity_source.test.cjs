const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('history retains explicit voice/scene origins without changing legacy entries', () => {
  const writes = new Map();
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'behavior_analyzer.cjs'), 'utf8'), {
    module, __dirname, console,
    require(name) {
      if (name === 'fs') return { existsSync: () => false, writeFileSync: (file, data) => writes.set(file, data) };
      if (name === 'path') return path;
      if (name === './ai_provider.cjs') return {};
      if (name === './fallback.cjs') return {};
      throw new Error(name);
    },
  });
  const base = { entity_id: 'light.a60_rgb_w_wifi', voice_input: 'เปิดไฟ', ai_action: 'on', success: true };
  for (const source of ['voice', 'scene', undefined, 'arbitrary']) module.exports.record({ ...base, source });
  const history = JSON.parse(writes.get(path.join(__dirname, 'behavior_history.json')));
  assert.deepEqual(history.map(entry => entry.source), ['voice', 'scene', undefined, undefined]);
});
