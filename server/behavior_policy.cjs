const MANUAL_PAUSE_MS = 2 * 60 * 60 * 1000;
const automatic = new Set(['auto-schedule', 'phone-home-trigger']);
function isUserAction(entry) {
  return (entry.success === true || entry.success === 'true') &&
    !automatic.has(entry.voice_input) && entry.source !== 'automatic' && entry.source !== 'sample' &&
    entry.voice_input !== 'feedback-negative';
}
function timestamp(value) {
  if (typeof value !== 'string') return NaN;
  return Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : value + '+07:00');
}
function bangkok(ms) {
  const date = new Date(ms + 7 * 3600000);
  return { day: date.toISOString().slice(0, 10), hour: date.getUTCHours(), weekend: [0, 6].includes(date.getUTCDay()) };
}
function getDecisions(history, entities, labels, now = Date.now(), calendar) {
  const current = bangkok(now);
  const dayContext = calendar?.(now);
  const group = type => type === 'holiday' || type === 'weekend' ? 'offday' : type;
  return entities.map(entity_id => {
    const entries = history.filter(e => e.entity_id === entity_id && isUserAction(e))
      .map(e => ({ ...e, time: timestamp(e.timestamp) }))
      .filter(e => Number.isFinite(e.time) && e.time <= now);
    const lastOff = Math.max(0, ...entries.filter(e => e.ai_action === 'off').map(e => e.time));
    const pausedUntil = lastOff + MANUAL_PAUSE_MS;
    // Reuse the complete saved history and the original peak-hour rule.
    // Automatic commands remain excluded so Auto cannot reinforce itself.
    const opened = entries.filter(e => e.ai_action === 'on' && (!calendar ||
      (dayContext?.dayType && group(calendar(e.time)?.dayType) === group(dayContext.dayType))));
    const hours = Array(24).fill(0);
    for (const entry of opened) hours[bangkok(entry.time).hour]++;
    const peak = opened.length ? hours.indexOf(Math.max(...hours)) : null;
    const base = { entity_id, label: labels[entity_id] || entity_id, action: 'on', evidence_count: opened.length, peak_hour: peak, ...(dayContext ? { day_context: dayContext } : {}) };
    if (pausedUntil > now) return { ...base, status: 'paused', paused_until: new Date(pausedUntil).toISOString(), reason: 'พัก Auto 2 ชั่วโมงหลังคุณสั่งปิดอุปกรณ์' };
    if (calendar && !dayContext?.dayType) return { ...base, status: 'insufficient', reason: 'รอยืนยันข้อมูลวันหยุดก่อนเลือกกิจวัตรอัตโนมัติ' };
    if (opened.length < 3) return { ...base, status: 'insufficient', reason: `ยังไม่เปิด: พบประวัติเปิดด้วยตนเอง ${opened.length}/3 ครั้ง` };
    const difference = Math.abs(peak - current.hour);
    const inWindow = Math.min(difference, 24 - difference) <= 1;
    return { ...base, status: inWindow ? 'ready' : 'waiting', reason: `${inWindow ? 'เข้า' : 'รอ'}ช่วงเปิดตามประวัติเดิม · เปิดบ่อยที่สุด ${String(peak).padStart(2, '0')}:00 น. (ก่อนหรือหลัง 1 ชั่วโมง) จากประวัติผู้ใช้ ${opened.length} ครั้ง` };
  });
}
module.exports = { getDecisions, isUserAction, MANUAL_PAUSE_MS };
