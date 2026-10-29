const fs = require('node:fs');
const path = require('node:path');
function sampleHistory() {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'behavior_sample_history.json'), 'utf8')).filter(e => e.source === 'sample'); }
  catch { return []; }
}
function sampleSummary(history) {
  return [...new Set(history.map(e => e.entity_id))].map(entity_id => {
    const entries = history.filter(e => e.entity_id === entity_id);
    const opens = entries.filter(e => e.ai_action === 'on');
    const hourly = Array(24).fill(0);
    opens.forEach(e => { hourly[Number(e.timestamp.slice(11, 13))]++; });
    return { entity_id, label: entries[0].label, on_count: opens.length, off_count: entries.filter(e => e.ai_action === 'off').length, total: entries.length, peak_hour: hourly.indexOf(Math.max(...hourly)), hourly };
  });
}
module.exports = { sampleHistory, sampleSummary };
