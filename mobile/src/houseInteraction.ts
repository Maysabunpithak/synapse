import { useCallback, useEffect, useRef, useState } from 'react';
export type HouseReaction = 'happy' | 'sleepy' | 'success' | 'error';
export type DeviceFeedback = { id: number; createdAt: number; entityId: string; outcome: 'success' | 'error'; message: string };
export function useHouseReaction() {
  const [reaction, setReaction] = useState<HouseReaction | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const react = useCallback((next: HouseReaction) => {
    if (timer.current) clearTimeout(timer.current);
    setReaction(next);
    timer.current = setTimeout(() => { setReaction(null); timer.current = null; }, next === 'error' ? 4000 : 2400);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { reaction, react };
}
