const fs = require('node:fs');
const path = require('node:path');
const DAY = 86400000;
function localDay(time) { return new Date(time + 7 * 3600000).toISOString().slice(0, 10); }
function normalize(data, year) {
  if (data?.meta?.code !== 200 || !Array.isArray(data?.response?.holidays)) throw Error('invalid_response');
  const result = new Map();
  for (const item of data.response.holidays) {
    const date = item.date?.iso?.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || Number(date.slice(0, 4)) !== year || !item.name || !Array.isArray(item.type)) throw Error('invalid_response');
    // Observances and bank-only closures do not mean a national day off.
    if (!item.type.some(type => /^(national|public) holiday$/i.test(type))) continue;
    if (item.locations && item.locations !== 'All') continue;
    result.set(`${date}:${item.name}`, { date, name: String(item.name) });
  }
  return [...result.values()].sort((a, b) => a.date.localeCompare(b.date));
}
function createHolidayCalendar({ apiKey = process.env.CALENDARIFIC_API_KEY || '', file = path.join(__dirname, 'data', 'thai-holidays.json'), fetcher = fetch, clock = Date.now } = {}) {
  let cache = {};
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (saved.country === 'TH' && saved.version === 1) cache = saved.years || {};
  } catch { /* Missing or unreadable cache requires a new fetch. */ }
  const attempts = new Map(), failures = new Map(), pending = new Map();
  function fresh(year) {
    const row = cache[year], age = clock() - row?.fetchedAt;
    return row && Array.isArray(row.holidays) && age >= 0 && age < DAY;
  }
  async function load(year) {
    if (!apiKey || fresh(year)) return;
    if (pending.has(year)) return pending.get(year);
    if (attempts.has(year) && clock() - attempts.get(year) < 3600000) return;
    attempts.set(year, clock());
    const work = (async () => {
      try {
        const query = new URLSearchParams({ api_key: apiKey, country: 'TH', year: String(year), type: 'national' });
        const response = await fetcher(`https://calendarific.com/api/v2/holidays?${query}`, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw Error(`http_${response.status}`);
        const holidays = normalize(await response.json(), year);
        const next = { ...cache, [year]: { fetchedAt: clock(), holidays } };
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file + '.tmp', JSON.stringify({ version: 1, country: 'TH', years: next }));
        fs.renameSync(file + '.tmp', file);
        cache = next; failures.delete(year);
      } catch (error) {
        // Never expose the provider URL (it contains the API key).
        failures.set(year, /^http_\d+$/.test(error.message) ? error.message : 'unavailable');
      }
    })();
    pending.set(year, work);
    try { await work; } finally { pending.delete(year); }
  }
  async function refresh() {
    const year = Number(localDay(clock()).slice(0, 4));
    await Promise.all([year - 1, year, year + 1].map(load));
  }
  function context(time = clock()) {
    const date = localDay(time), year = Number(date.slice(0, 4));
    const weekend = [0, 6].includes(new Date(date + 'T00:00:00Z').getUTCDay());
    const available = fresh(year);
    const holidays = available ? cache[year].holidays.filter(row => row.date === date) : [];
    const status = !apiKey ? 'not_configured' : available ? 'ready' : failures.has(year) ? 'unavailable' : 'pending';
    return { date, country: 'TH', timezone: 'Asia/Bangkok', calendarStatus: status,
      // Unconfigured calendar still distinguishes weekdays from weekends.
      dayType: available && apiKey ? holidays.length ? 'holiday' : weekend ? 'weekend' : 'weekday' : !apiKey ? weekend ? 'weekend' : 'weekday' : null,
      isHoliday: available && apiKey ? holidays.length > 0 : null,
      holidays: apiKey ? holidays : [], updatedAt: cache[year]?.fetchedAt || null };
  }
  return { refresh, context };
}
module.exports = { createHolidayCalendar, normalize, localDay };
