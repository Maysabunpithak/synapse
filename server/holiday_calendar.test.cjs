const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { createHolidayCalendar, normalize } = require('./holiday_calendar.cjs');
const now = Date.parse('2026-10-01T18:00:00+07:00');
const holiday = (year, type = 'National holiday') => ({ name: 'Test holiday', date: { iso: `${year}-10-01` }, type: [type], locations: 'All' });
function setup(t, extra = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'synapse-holidays-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'cache.json');
  const options = { file, clock: () => now, ...extra };
  return { file, options, calendar: createHolidayCalendar(options) };
}
test('missing key does not fetch or claim to know public holidays; dates use Bangkok', async t => {
  const { calendar } = setup(t, { apiKey: '', fetcher: () => { throw Error('unexpected call'); } });
  await calendar.refresh();
  assert.equal(calendar.context().calendarStatus, 'not_configured');
  assert.equal(calendar.context().isHoliday, null);
  assert.equal(calendar.context().dayType, 'weekday');
  assert.equal(calendar.context(Date.parse('2026-10-02T18:00:00Z')).dayType, 'weekend');
});
test('loads annual Thai data once, persists cache, and excludes observances and bank-only holidays', async t => {
  let calls = 0;
  const { calendar, options, file } = setup(t, { apiKey: 'test-secret', fetcher: async url => {
    calls++; const query = new URL(url).searchParams;
    assert.equal(query.get('country'), 'TH'); assert.equal(query.get('type'), 'national');
    const year = Number(query.get('year'));
    return { ok: true, json: async () => ({ meta: { code: 200 }, response: { holidays: [holiday(year), holiday(year, 'Observance'), holiday(year, 'Bank holiday')] } }) };
  } });
  await Promise.all([calendar.refresh(), calendar.refresh()]);
  assert.equal(calls, 3);
  assert.equal(calendar.context().dayType, 'holiday');
  assert.equal(calendar.context().holidays.length, 1);
  assert.equal(calendar.context(Date.parse('2026-10-02T12:00:00+07:00')).isHoliday, false);
  const restored = createHolidayCalendar(options); await restored.refresh();
  assert.equal(calls, 3);
  assert.equal(restored.context().isHoliday, true);
  assert(!fs.readFileSync(file, 'utf8').includes('test-secret'));
});
test('provider failure is unknown, retries back off, and expired data is not trusted', async t => {
  let time = now, fail = false, calls = 0;
  const { calendar } = setup(t, { apiKey: 'test-secret', clock: () => time, fetcher: async url => {
    calls++;
    if (fail) return { ok: false, status: 429 };
    return { ok: true, json: async () => ({ meta: { code: 200 }, response: { holidays: [holiday(Number(new URL(url).searchParams.get('year')))] } }) };
  } });
  await calendar.refresh(); time += 86400000; fail = true;
  await calendar.refresh(); await calendar.refresh();
  assert.equal(calls, 6);
  assert.equal(calendar.context().calendarStatus, 'unavailable');
  assert.equal(calendar.context().isHoliday, null);
  assert.equal(calendar.context().dayType, null);
  assert.throws(() => normalize({ meta: { code: 401 } }, 2026));
});
