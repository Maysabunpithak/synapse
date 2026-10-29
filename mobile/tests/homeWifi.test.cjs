const { test } = require('node:test');
const assert = require('node:assert/strict');
const { homeWifiStatus, parseHomeWifiNames } = require('../src/homeWifi.ts');
const names = ['MAYSA11/55-2.4GHz'];
test('saved networks survive serialization and do not duplicate on repeated save', () => {
  const saved = JSON.stringify({version:1, names:['Home downstairs','Home upstairs','Home downstairs']});
  const restored = parseHomeWifiNames(saved);
  assert.deepEqual(restored, ['Home downstairs','Home upstairs']);
  assert.equal(homeWifiStatus({type:'wifi',isConnected:true,details:{ssid:'Home upstairs'}},restored),true);
});
test('removing all networks stays empty and invalid saved data is rejected', () => {
  assert.deepEqual(parseHomeWifiNames('{"version":1,"names":[]}'), []);
  for (const value of ['broken', '{"version":1,"names":[null]}', '{"version":1,"names":["<unknown ssid>"]}'])
    assert.throws(() => parseHomeWifiNames(value));
});
test('only the configured home SSID counts as connected at home', () => {
  assert.equal(homeWifiStatus({type:'wifi', isConnected:true, details:{ssid:names[0]}}, names), true);
  assert.equal(homeWifiStatus({type:'wifi', isConnected:true, details:{ssid:'"'+names[0]+'"'}}, names), true);
  assert.equal(homeWifiStatus({type:'wifi', isConnected:true, details:{ssid:'Cafe'}}, names), false);
  assert.equal(homeWifiStatus({type:'wifi', isConnected:false}, names), false);
});
test('unavailable Wi-Fi identity is unknown, not away', () => {
  for (const ssid of [null, undefined, '', '<unknown ssid>', '0x'])
    assert.equal(homeWifiStatus({type:'wifi', isConnected:true, details:{ssid}}, names), null);
  assert.equal(homeWifiStatus({type:'vpn', isConnected:true}, names), null);
  assert.equal(homeWifiStatus({type:'wifi', isConnected:true, details:{ssid:names[0]}}, []), null);
});
