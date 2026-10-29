// Preview the same peak-hour window as behavior_policy, not a separate schedule.
function upcoming(decisions, now, lastAutoOn = {}, cooldown = 7200000) {
  return decisions.filter(d => d.evidence_count >= 3 && Number.isInteger(d.peak_hour)).map(d => {
    const eligible = Math.max(now, Date.parse(d.paused_until || '') || 0, (lastAutoOn[d.entity_id] || 0) + cooldown);
    let next = eligible;
    for (let i = 0; i < 49; i++) {
      // Tomorrow can use a different holiday/weekend pattern; do not project
      // today's peak into a day whose decision has not been evaluated yet.
      if (d.day_context?.date && new Date(next + 7 * 3600000).toISOString().slice(0, 10) !== d.day_context.date) return null;
      const hour = new Date(next + 7 * 3600000).getUTCHours();
      const difference = Math.abs(hour - d.peak_hour);
      if (Math.min(difference, 24 - difference) <= 1) return { ...d, next_window_at: new Date(next).toISOString() };
      next = Math.floor(next / 3600000) * 3600000 + 3600000;
    }
    return null;
  }).filter(Boolean).sort((a, b) => Date.parse(a.next_window_at) - Date.parse(b.next_window_at));
}
module.exports = { upcoming };
