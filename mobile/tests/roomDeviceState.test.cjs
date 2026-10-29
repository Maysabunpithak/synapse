const { test } = require('node:test');
const assert = require('node:assert/strict');
const { roomDeviceEffects } = require('../src/roomDeviceState.ts');


test('only confirmed light/fan domains affect a room, not plugs or unavailable devices', () => {
  assert.deepEqual(roomDeviceEffects([{ domain: 'switch', state: 'on' }, { domain: 'light', state: 'unavailable' }, { domain: 'fan', state: 'unknown' }]), { brightness: 0, hasFan: true, fanOn: false });
  assert.deepEqual(roomDeviceEffects([{ entity_id: 'fan.bedroom', state: 'on' }, { entity_id: 'light.bedroom', state: 'on', attributes: { brightness: 128 } }]), { brightness: 128 / 255, hasFan: true, fanOn: true });
  assert.equal(roomDeviceEffects([{ domain: 'light', state: 'off', attributes: { brightness: 255 } }]).brightness, 0);
});
