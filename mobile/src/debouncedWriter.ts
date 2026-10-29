/** Coalesces rapid changes and never overlaps writes. Explicit flush keeps the final value. */
export function createDebouncedWriter<T>(write: (value: T) => Promise<void>, delay = 300) {
  let pending: { value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running: Promise<void> | null = null;
  let ready = false;
  function clearTimer() { if (timer) clearTimeout(timer); timer = null; }
  function pump(): Promise<void> {
    if (running) return running;
    if (!pending || !ready) return Promise.resolve();
    const next = pending.value;
    pending = null;
    ready = false;
    running = Promise.resolve().then(() => write(next)).finally(() => { running = null; });
    return running.then(() => pump());
  }
  return {
    enqueue(value: T) {
      pending = { value };
      ready = false;
      clearTimer();
      timer = setTimeout(() => { timer = null; ready = true; void pump(); }, delay);
    },
    async flush() {
      clearTimer();
      ready = true;
      await pump();
      await pump();
    },
    async cancel() {
      clearTimer();
      pending = null;
      ready = false;
      await running;
    },
  };
}
