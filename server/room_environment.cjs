const template = `{% set ns = namespace(rows=[]) %}{% for s in states.sensor if s.attributes.device_class in ['temperature', 'humidity'] %}{% set ns.rows = ns.rows + [dict(entity_id=s.entity_id, room=area_name(s.entity_id), kind=s.attributes.device_class, value=s.state, unit=s.attributes.unit_of_measurement | default(''), updated_at=s.last_updated.isoformat())] %}{% endfor %}{{ ns.rows | to_json }}`;
function readings(rows) {
  if (!Array.isArray(rows)) throw new Error('Invalid sensor response');
  return rows.flatMap(row => {
    if (typeof row.room !== 'string' || !row.room.trim() || typeof row.value !== 'string' || !row.value.trim()) return [];
    let value = Number(row.value);
    if (!Number.isFinite(value)) return [];
    if (row.kind === 'temperature') {
      if (row.unit === '°F') value = (value - 32) * 5 / 9;
      else if (row.unit !== '°C') return [];
    } else if (row.kind !== 'humidity' || row.unit !== '%' || value < 0 || value > 100) return [];
    return [{ entity_id: row.entity_id, room: row.room.trim(), kind: row.kind, value, unit: row.kind === 'temperature' ? '°C' : '%', updated_at: row.updated_at }];
  });
}
module.exports = { template, readings };
