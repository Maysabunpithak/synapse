const fs = require('node:fs');
const path = require('node:path');
const profileFile = path.join(__dirname, 'behavior_profile.json');
function profileHistory(history, file = profileFile) {
  if (!fs.existsSync(file)) return history;
  try {
    const profile = JSON.parse(fs.readFileSync(file, 'utf8'));
    const since = Date.parse(profile.learning_started_at);
    if (!Number.isFinite(since)) return [];
    return history.filter(entry => {
      if (typeof entry.timestamp !== 'string') return false;
      const time = Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(entry.timestamp) ? entry.timestamp : entry.timestamp + '+07:00');
      return Number.isFinite(time) && time >= since;
    });
  } catch { return []; }
}
function seedEnabled() {
  try { return JSON.parse(fs.readFileSync(profileFile, 'utf8')).use_sample_as_initial_profile === true; }
  catch { return false; }
}
module.exports = { profileHistory, seedEnabled };
