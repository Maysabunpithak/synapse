/** Include the starting history without duplicating events or replacing real metadata. */
export function mergeHistory<T extends { entity_id: string; timestamp: string; ai_action: string }>(actual: T[], initial: T[]): T[] {
  const events = new Map<string, T>();
  for (const event of [...initial, ...actual]) {
    events.set(JSON.stringify([event.entity_id, event.timestamp, event.ai_action]), event);
  }
  return [...events.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
