function fallbackPredict(hour, history, KNOWN_ENTITIES, ENTITY_LABELS) {
  const results = [];

  for (const entity_id of KNOWN_ENTITIES) {
    const entries = history.filter(h => h.entity_id === entity_id);
    if (entries.length === 0) continue;

    const onCount = entries.filter(e => e.ai_action === "on").length;
    if (onCount < 3) continue;

    const hourCounts = {};
    for (const e of entries.filter(e => e.ai_action === "on")) {
      const h = new Date(e.timestamp).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    }
    const peakHour = parseInt(Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0]);

    const diff = Math.abs(hour - peakHour);
    const wrappedDiff = Math.min(diff, 24 - diff);
    if (wrappedDiff <= 1) {
      const negCount = history.filter(h =>
        h.entity_id === entity_id &&
        h.voice_input === "feedback-negative" &&
        Math.abs(new Date(h.timestamp).getHours() - hour) <= 1
      ).length;
      if (negCount >= 2) {
        console.log(`🚫 SKIP ${entity_id} — negative feedback ${negCount} ครั้ง`);
        continue;
      }
      results.push({
        entity_id,
        label: ENTITY_LABELS[entity_id],
        confidence: Math.max(40, 60 - negCount * 10),
        reason: `pattern usage ช่วง ${peakHour}:00`,
      });
    }
  }

  return results;
}

module.exports = { fallbackPredict };
