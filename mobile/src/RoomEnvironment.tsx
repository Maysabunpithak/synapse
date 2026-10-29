import { useEffect, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { palette as C } from './theme';
type Reading = { entity_id: string; room: string; kind: 'temperature' | 'humidity'; value: number; updated_at: string };
function roomKey(room: string) {
  const key = room.toLowerCase().replace(/[\s_-]/g, '');
  return ({ bedroom: 'ห้องนอน', livingroom: 'ห้องนั่งเล่น', kitchen: 'ห้องครัว', office: 'ห้องทำงาน', study: 'ห้องทำงาน' } as Record<string, string>)[key] ?? key;
}
export function useRoomEnvironment(api: string, demo: boolean) {
  const [readings, setReadings] = useState<Reading[]>([]);
  useEffect(() => {
    setReadings([]);
    if (!api || demo) return;
    let alive = true;
    let busy = false;
    let controller: AbortController | undefined;
    const refresh = async () => {
      if (busy || AppState.currentState === 'background') return;
      busy = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 10000);
      try {
        const response = await fetch(`${api}/room-environment`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !data.ok || !Array.isArray(data.readings)) throw new Error('Unavailable');
        if (alive) setReadings(data.readings.filter((r: Reading) => typeof r.room === 'string' && Number.isFinite(r.value) && ['temperature', 'humidity'].includes(r.kind)));
      } catch { if (alive) setReadings([]); }
      finally { clearTimeout(timeout); busy = false; }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 30000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); else { controller?.abort(); setReadings([]); } });
    return () => { alive = false; clearInterval(timer); listener.remove(); controller?.abort(); };
  }, [api, demo]);
  return readings;
}
export default function RoomEnvironment({ room, readings }: { room: string; readings: Reading[] }) {
  const matching = readings.filter(r => roomKey(r.room) === roomKey(room)).sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
  const temp = matching.find(r => r.kind === 'temperature');
  const humidity = matching.find(r => r.kind === 'humidity');
  const parts = [temp ? `${Number(temp.value.toFixed(1))}°C` : '', humidity ? `ความชื้น ${Math.round(humidity.value)}%` : ''].filter(Boolean);
  if (!parts.length) return null;
  return <View style={{ alignSelf: 'flex-start', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.glass, borderWidth: 1, borderColor: C.line }}><Text accessibilityLabel={`${room} ${parts.join(' ')} จากเซนเซอร์`} style={{ color: C.brown, fontSize: 11 }}>{parts.join(' · ')}</Text></View>;
}
