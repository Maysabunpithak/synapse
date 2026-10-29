const test = require('node:test');
const assert = require('node:assert/strict');
const { lightPayload } = require('./light_control.cjs');

test('accepts absolute brightness and one supported color representation', () => {
  assert.deepEqual(lightPayload({ entity_id: 'light.living_room', brightness_pct: 40.4, hs_color: [35, 35], ignored: true }), { entity_id: 'light.living_room', brightness_pct: 40, hs_color: [35, 35] });
  assert.deepEqual(lightPayload({ entity_id: 'light.living_room', brightness_pct: 100, color_temp_kelvin: 6500 }), { entity_id: 'light.living_room', brightness_pct: 100, color_temp_kelvin: 6500 });
});
test('rejects invalid targets, nonfinite values, out-of-range settings and conflicting colors', () => {
  const valid = { entity_id: 'light.living_room', brightness_pct: 40 };
  for (const patch of [{ entity_id: 'switch.plug' }, { entity_id: '../light' }, { brightness_pct: NaN }, { brightness_pct: Infinity }, { brightness_pct: '40' }, { brightness_pct: -1 }, { brightness_pct: 101 }, { hs_color: [361, 0] }, { hs_color: [1, 101] }, { hs_color: [1] }, { color_temp_kelvin: 0 }, { color_temp_kelvin: 6500, hs_color: [0, 0] }]) assert.equal(lightPayload({ ...valid, ...patch }), null);
  assert.equal(lightPayload(null), null);
});
