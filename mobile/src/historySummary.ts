type Counts = { entity_id: string; on_count: number; off_count: number; total: number; hourly: number[]; peak_hour: number };
/** Display starting and real history independently of Auto's learning threshold. */
export function historySummary<T extends Counts>(actual: T[], initial: T[], enabled: boolean): T[] {
  if (!enabled) return actual.length ? actual : initial;
  const result = new Map(initial.map(row => [row.entity_id, row]));
  for (const row of actual) {
    const starting = result.get(row.entity_id);
    if (!starting) { result.set(row.entity_id, row); continue; }
    const hourly = Array.from({ length: 24 }, (_, h) => (starting.hourly[h] || 0) + (row.hourly[h] || 0));
    result.set(row.entity_id, { ...row,
      on_count: starting.on_count + row.on_count,
      off_count: starting.off_count + row.off_count,
      total: starting.total + row.total,
      hourly, peak_hour: hourly.indexOf(Math.max(...hourly)),
    });
  }
  return [...result.values()];
}
