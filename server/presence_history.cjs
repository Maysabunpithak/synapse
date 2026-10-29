const fs = require('node:fs');
const path = require('node:path');
const MAX_AGE = 65 * 60 * 1000;
function createPresenceHistory(file = path.join(__dirname, 'presence_history.json')) {
 let rows = [];
 if (fs.existsSync(file)) rows = JSON.parse(fs.readFileSync(file, 'utf8'));
 function snapshot(now = Date.now()) {
  const last = rows.at(-1);
  const valid = last && now >= last.time && now - last.time < MAX_AGE;
  return { atHome: valid ? last.atHome : null, observedAt: last?.time || 0, expiresAt: last ? last.time + MAX_AGE : 0 };
 }
 function record(atHome, source = 'phone-wifi', now = Date.now()) {
  if (atHome !== true && atHome !== false && atHome !== null) throw Error('Invalid presence');
  const before = snapshot(now).atHome;
  const row = { time: now, timestamp: new Date(now).toISOString(), atHome, source,
   event: before === atHome ? 'confirmation' : atHome === true ? 'home-observed' : atHome === false ? 'away-observed' : 'unknown' };
  const next = [...rows, row];
  fs.writeFileSync(file + '.tmp', JSON.stringify(next, null, 2));
  fs.renameSync(file + '.tmp', file);
  rows = next;
  return row;
 }
 return { record, snapshot, history: () => rows.map(row => ({ ...row })) };
}
module.exports = { createPresenceHistory, MAX_AGE };
