import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/** Sync confirmed home Wi-Fi only; unknown SSIDs never count as arrival. */
export function useWifiAutomation(api: string, enabled: boolean, atHome: boolean | null, reload: () => Promise<void>) {
  const latest = useRef({ atHome, reload });
  latest.current = { atHome, reload };
  const syncNow = useRef<() => void>(() => {});
  useEffect(() => {
    if (!enabled || !api || Platform.OS !== 'android') return;
    let disposed = false;
    let busy = false;
    let sent: boolean | null | undefined;
    let sentAt = 0;
    let controller: AbortController | undefined;
    async function sync() {
      const home = latest.current.atHome;
      if (disposed || busy || (home === sent && Date.now() - sentAt < 30 * 60 * 1000)) return;
      busy = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 20000);
      try {
        const response = await fetch(`${api}/trigger/phone-${home === null ? 'unknown' : home ? 'home' : 'left'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !data.ok) throw new Error('Presence sync failed');
        if (!disposed) {
          sent = home;
          sentAt = Date.now();
          if (Array.isArray(data.executed) && data.executed.length) await latest.current.reload();
        }
      } catch { /* Retry after the next network check; never invent a home status. */ }
      finally {
        clearTimeout(timeout); busy = false;
        if (!disposed && latest.current.atHome !== home) void sync();
      }
    }
    syncNow.current = () => { void sync(); };
    void sync();
    const timer = setInterval(() => void sync(), 5000);
    return () => { disposed = true; clearInterval(timer); controller?.abort(); syncNow.current = () => {}; };
  }, [api, enabled]);
  useEffect(() => { syncNow.current(); }, [atHome]);
}
