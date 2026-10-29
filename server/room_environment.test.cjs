const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readings } = require('./room_environment.cjs');
const base = { entity_id: 'sensor.room_temperature', room: 'Bedroom', kind: 'temperature', unit: '°C', value: '28', updated_at: '2026-09-30T10:00:00Z' };
test('real sensor readings preserve zero and convert Fahrenheit', () => {
  assert.equal(readings([{...base, value:'0'}])[0].value,0);
  assert.equal(readings([{...base, value:'86',unit:'°F'}])[0].value,30);
  assert.equal(readings([{...base, kind:'humidity',unit:'%',value:'65'}])[0].value,65);
});
test('missing rooms, invalid units and unavailable states produce no fabricated readings', () => {
  for (const value of ['', 'unknown', 'unavailable', 'NaN', 'Infinity']) assert.deepEqual(readings([{...base,value}]),[]);
  assert.deepEqual(readings([{...base,room:null},{...base,unit:'W'},{...base,kind:'humidity',unit:'%',value:'101'}]),[]);
});
