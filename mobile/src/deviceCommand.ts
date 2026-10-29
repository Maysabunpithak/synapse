/** Use the control endpoint's acknowledgement; HA state can lag direct device commands. */
export async function setDevicePower(base: string, entityId: string, nextState: 'on' | 'off', signal: AbortSignal, fetcher: typeof fetch = fetch) {
  if (signal.aborted) throw new Error('Command cancelled');
  const response = await fetcher(`${base}/switch/${nextState}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity_id: entityId, source: 'ui' }), signal,
  });
  const result = await response.json();
  if (signal.aborted) throw new Error('Command cancelled');
  if (!response.ok || !result?.ok) throw new Error('Command rejected');
}
