const { getDecisions, isUserAction } = require('./behavior_policy.cjs');
function eventKey(row) {
  const value = row.timestamp;
  const time = typeof value === 'string' ? Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : value + '+07:00') : NaN;
  return JSON.stringify([row.entity_id, Number.isFinite(time) ? time : value, row.ai_action]);
}
function seededDecisions(realHistory, seed, entities, labels, now, calendar) {
  // The approved initial dataset and observed events have equal learning weight.
  // Adapt only a copy; retain the provenance of stored events.
  const merged = new Map();
  for (const row of seed) {
    const entry = { ...row,
      source: row.simulated_source === 'automatic' ? 'automatic' : 'configured-profile',
    };
    merged.set(eventKey(row), entry);
  }
  for (const row of realHistory) merged.set(eventKey(row), row);
  const history = [...merged.values()];
  const actual = getDecisions(realHistory, entities, labels, now, calendar);
  return getDecisions(history, entities, labels, now, calendar).map((decision, index) => ({
    ...decision,
    seeded: history.some(row => row.entity_id === decision.entity_id && row.source === 'configured-profile' && row.ai_action === 'on' && isUserAction(row)),
    actual_evidence_count: actual[index].evidence_count,
  }));
}
module.exports = { seededDecisions };
