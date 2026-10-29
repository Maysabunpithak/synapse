const fs = require('node:fs');
const { createHash, randomUUID } = require('node:crypto');
const { isUserAction } = require('./behavior_policy.cjs');
const WINDOW = 10 * 60 * 1000;
const normalize = value => String(value || '').normalize('NFC').toLowerCase().replace(/[\s.!?。]+/g, '');
const timeOf = value => typeof value === 'string' ? Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : value + '+07:00') : NaN;

function discover(history, devices, now = Date.now()) {
  const available = new Map(devices.filter(d => /^(light|switch|fan)\./.test(d.id)).map(d => [d.id, d.name]));
  const events = history.filter(e => available.has(e.entity_id) && isUserAction(e) && e.source !== 'scene')
    .map(e => ({ ...e, time: timeOf(e.timestamp) })).filter(e => Number.isFinite(e.time) && e.time <= now)
    .sort((a, b) => a.time - b.time);
  const groups = new Map();
  for (let i = 0; i < events.length; i++) {
    const first = events[i];
    if (first.ai_action !== 'on') continue;
    for (let j = i + 1; j < events.length && events[j].time - first.time <= WINDOW; j++) {
      const second = events[j];
      if (second.entity_id === first.entity_id && second.ai_action === 'off') break;
      if (second.ai_action !== 'on' || second.entity_id === first.entity_id) continue;
      const ids = [first.entity_id, second.entity_id].sort();
      const key = ids.join('|');
      if (!groups.has(key)) groups.set(key, { ids, days: new Set(), hours: Array(24).fill(0) });
      const group = groups.get(key);
      const local = new Date(first.time + 7 * 3600000);
      const day = local.toISOString().slice(0, 10);
      if (!group.days.has(day)) group.hours[local.getUTCHours()]++;
      group.days.add(day);
    }
  }
  return [...groups.entries()].filter(([, g]) => g.days.size >= 3).map(([key, g]) => {
    const names = g.ids.map(id => available.get(id));
    const peak = g.hours.indexOf(Math.max(...g.hours));
    return {
      id: createHash('sha256').update(key).digest('hex').slice(0, 20),
      name: `ชุด ${names.join(' + ')}`.slice(0, 60),
      actions: g.ids.map(entity_id => ({ entity_id, action: 'on', label: available.get(entity_id) })),
      evidence_days: g.days.size, peak_hour: peak,
      reason: `คุณมักเปิด ${names.join(' และ ')} ห่างกันไม่เกิน 10 นาที พบใน ${g.days.size} วันจากประวัติเดิม`,
    };
  }).sort((a, b) => b.evidence_days - a.evidence_days || a.id.localeCompare(b.id)).slice(0, 5);
}

function createRoutineService({ file, getHistory, getDevices, getState, turnOn, record }) {
  // A corrupt store must be surfaced, never replaced with an empty library.
  function read() {
    if (!fs.existsSync(file)) return [];
    const items = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(items)) throw new Error('อ่านชุดกิจวัตรที่บันทึกไว้ไม่ได้');
    return items;
  }
  function write(items) {
    const temp = file + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(items, null, 2), 'utf8');
    fs.renameSync(temp, file);
  }
  async function list() {
    const saved = read();
    const suggestions = discover(getHistory(), await getDevices()).filter(s => !saved.some(r => r.pattern_id === s.id));
    return { saved, suggestions };
  }
  async function accept(patternId, name) {
    const suggestion = discover(getHistory(), await getDevices()).find(s => s.id === patternId);
    if (!suggestion) throw new Error('ไม่พบข้อเสนอที่ยังใช้ได้ กรุณาโหลดใหม่');
    const title = typeof name === 'string' ? name.trim() : '';
    if (!title || title.length > 60 || !normalize(title)) throw new Error('ตั้งชื่อชุด 1–60 ตัวอักษร');
    const saved = read();
    const existing = saved.find(r => r.pattern_id === patternId);
    if (existing) return existing;
    if (saved.some(r => normalize(r.name) === normalize(title))) throw new Error('มีชื่อชุดนี้แล้ว กรุณาตั้งชื่อใหม่');
    const routine = { ...suggestion, id: randomUUID(), pattern_id: suggestion.id, name: title, created_at: new Date().toISOString() };
    write([...saved, routine]);
    return routine;
  }
  function remove(id) { write(read().filter(r => r.id !== id)); }
  function match(message) {
    const text = normalize(message);
    return read().find(r => [r.name, `เปิดชุด${r.name}`, `ใช้ชุด${r.name}`, `เริ่มชุด${r.name}`].some(phrase => normalize(phrase) === text));
  }
  const running = new Set();
  async function run(id) {
    const routine = read().find(r => r.id === id);
    if (!routine) throw new Error('ไม่พบชุดกิจวัตร');
    if (running.has(id)) throw new Error('กำลังเปิดชุดนี้อยู่');
    running.add(id);
    try {
      const available = new Set((await getDevices()).filter(d => /^(light|switch|fan)\./.test(d.id)).map(d => d.id));
      const results = [];
      for (const action of routine.actions) {
        const entity_id = action.entity_id;
        try {
          if (action.action !== 'on' || !available.has(entity_id)) throw new Error('ไม่พบอุปกรณ์');
          const state = await getState(entity_id);
          if (!['on', 'off'].includes(state)) throw new Error('อุปกรณ์ไม่พร้อมใช้งาน');
          if (state === 'off') {
            await turnOn(entity_id);
            record({ voice_input: `ชุด ${routine.name}`, source: 'scene', ai_action: 'on', entity_id, actual_result: 'on', success: true });
          }
          results.push({ entity_id, label: action.label, ok: true, already_on: state === 'on' });
        } catch (error) { results.push({ entity_id, label: action.label, ok: false, error: error.message }); }
      }
      const count = results.filter(r => r.ok).length;
      const ok = results.length > 0 && count === results.length;
      return { ok, results, speech: ok ? `เปิดชุด ${routine.name} พร้อมแล้วค่ะ` : `ชุด ${routine.name} พร้อม ${count} จาก ${results.length} อุปกรณ์ค่ะ อุปกรณ์ที่ยังไม่พร้อม: ${results.filter(r => !r.ok).map(r => r.label).join(' และ ')}` };
    } finally { running.delete(id); }
  }
  return { list, accept, remove, match, run };
}
module.exports = { discover, createRoutineService };
