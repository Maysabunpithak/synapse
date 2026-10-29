import { useEffect, useState } from 'react';
export function useServerPresence(api: string, enabled: boolean) {
  const [home, setHome] = useState<boolean | null>(null);
  useEffect(() => {
    setHome(null);
    if (!enabled || !api) return;
    let alive = true;
    let busy = false;
    let controller: AbortController | undefined;
    async function refresh() {
      if (busy) return;
      busy = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 8000);
      try {
        const response = await fetch(`${api}/presence`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error('Unavailable');
        if (alive) setHome(typeof data.atHome === 'boolean' ? data.atHome : null);
      } catch { if (alive) setHome(null); }
      finally { clearTimeout(timeout); busy = false; }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 10000);
    return () => { alive = false; clearInterval(timer); controller?.abort(); };
  }, [api, enabled]);
  return home;
}
