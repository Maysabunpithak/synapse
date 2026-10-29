import { useEffect, useRef } from 'react';
import { frameQueue } from './frameQueue';
export function useFrameQueue<T>(commit: (value: T) => void) {
  const latest = useRef(commit); latest.current = commit;
  const queue = useRef<ReturnType<typeof frameQueue<T>> | null>(null);
  if (!queue.current) queue.current = frameQueue<T>(value => latest.current(value), requestAnimationFrame, cancelAnimationFrame);
  useEffect(() => () => queue.current?.cancel(), []);
  return queue.current;
}
