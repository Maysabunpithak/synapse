const { test } = require('node:test');
const assert = require('node:assert/strict');
const { activitySource } = require('../src/activitySource.ts');

test('generated channel categories display only the command method', () => {
  for (const kind of ['manual', 'voice', 'automatic']) {
    const classified = activitySource({ source: 'sample', simulated_source: kind });
    assert.equal(classified.kind, kind);
    assert.equal(classified.label, { manual: 'กดเอง', voice: 'สั่งด้วยเสียง', automatic: 'อัตโนมัติ' }[kind]);
  }
  assert.equal(activitySource({ source: 'voice', simulated_source: 'manual' }).kind, 'voice');
});

test('profile events remain separate and explicit automatic source overrides legacy text', () => {
  assert.equal(activitySource({ source: 'sample', voice_input: 'ui-toggle' }).kind, 'profile');
  assert.equal(activitySource({ source: 'automatic', voice_input: 'switch' }).kind, 'automatic');
});

test('legacy logs retain the distinction between manual and automatic actions', () => {
  for (const input of ['ui-toggle', 'mobile-light-control', 'feedback-negative'])
    assert.equal(activitySource({ voice_input: input }).kind, 'manual');
  for (const input of ['phone-home-trigger', 'auto-schedule'])
    assert.equal(activitySource({ voice_input: input }).kind, 'automatic');
});
test('ambiguous historic records do not claim physical switch or voice provenance', () => {
  assert.equal(activitySource({ voice_input: 'switch' }).label, 'สวิตช์ / ปุ่มแอปเดิม');
  assert.equal(activitySource({ voice_input: 'เปิดไฟ' }).kind, 'command');
  assert.equal(activitySource({}).kind, 'unknown');
});
test('explicit new provenance separates voice and scene commands with identical text', () => {
  assert.equal(activitySource({ source: 'voice', voice_input: 'กลับบ้าน' }).kind, 'voice');
  assert.equal(activitySource({ source: 'scene', voice_input: 'กลับบ้าน' }).kind, 'scene');
  assert.equal(activitySource({ source: 'mobile', voice_input: 'switch' }).kind, 'manual');
});
