/** Keep only the newest pointer event, committing at most once per display frame. */
export function frameQueue<T>(commit: (value: T) => void, request: (callback: () => void) => number, cancel: (id: number) => void) {
  let frame: number | null = null;
  let pending: { value: T } | null = null;
  const flush = () => {
    if (frame !== null) cancel(frame);
    frame = null;
    const next = pending;
    pending = null;
    if (next) commit(next.value);
  };
  return {
    push(value: T) { pending = { value }; if (frame === null) frame = request(flush); },
    flush,
    cancel() { if (frame !== null) cancel(frame); frame = null; pending = null; },
  };
}
