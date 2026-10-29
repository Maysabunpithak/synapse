const { test } = require('node:test');
const assert = require('node:assert/strict');
// Strip the type-only dependency via the same TypeScript transpiler as the app.
const fs = require('node:fs');
const ts = require('typescript');
const path = require('node:path');
const file = path.resolve(__dirname, '../src/roomWatering.ts');
const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', code)(name => require(path.resolve(path.dirname(file), name + '.ts')), mod, mod.exports);
const { plantWaterPoint, wateringArc, waterDrop } = mod.exports;

test('water ends on the actual pot rim after moving, scaling and mirroring the plant', () => {
  for (const kind of ['plant', 'plant_flower']) for (const scale of [0.7, 1, 1.3]) for (const rotation of [0, 1]) {
    const item = { kind, x: 0.75, y: 0.68, scale, rotation };
    const pot = plantWaterPoint(item, 360, 242);
    for (const characterX of [160, 290]) {
      const size = 72, characterY = 130;
      const local = { x: (pot.x - characterX) / size * 100, y: (pot.y - characterY) / size * 100 };
      const left = local.x < 50;
      const arc = wateringArc(local, left);
      const hit = waterDrop(arc, 1);
      assert.ok(Math.abs(characterX + (left ? 100 - hit.x : hit.x) / 100 * size - pot.x) < 1e-8);
      assert.ok(Math.abs(characterY + hit.y / 100 * size - pot.y) < 1e-8);
      assert.ok(arc.start.y < arc.end.y, 'water falls down from the spout');
      assert.deepEqual(waterDrop(arc, 0), arc.start);
    }
    assert.equal(plantWaterPoint({ ...item, x: item.x + 0.1 }, 360, 242).x - pot.x, 36);
  }
});
