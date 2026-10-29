const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { profileHistory } = require('./behavior_profile.cjs');
test('new learning excludes old records without changing archived history', () => {
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'synapse-profile-'));
  const file = path.join(dir, 'profile.json');
  const history = [{ timestamp: '2026-09-30T10:59:59' }, { timestamp: '2026-09-30T11:00:00' }, { timestamp: '2026-09-30T04:01:00Z' }];
  try {
    assert.deepEqual(profileHistory(history,file),history);
    fs.writeFileSync(file, JSON.stringify({learning_started_at:'2026-09-30T04:00:00Z'}));
    assert.deepEqual(profileHistory(history,file),history.slice(1));
    assert.equal(history.length,3);
    fs.writeFileSync(file,'broken');
    assert.deepEqual(profileHistory(history,file),[]);
  } finally { fs.unlinkSync(file); fs.rmdirSync(dir); }
});
