function buildPlan(decisions, { atHome, lastAutoOn, now, cooldown }) {
  return decisions.map(d => {
    if (d.status !== 'ready') return d;
    if (!atHome) return { ...d, status: 'away', reason: 'รอระบบยืนยันว่าอยู่บ้าน · ' + d.reason };
    if (lastAutoOn[d.entity_id] && now - lastAutoOn[d.entity_id] < cooldown)
      return { ...d, status: 'cooldown', reason: 'เปิดอัตโนมัติไปแล้ว พักการสั่งซ้ำ 2 ชั่วโมง' };
    return d;
  });
}
module.exports = { buildPlan };
