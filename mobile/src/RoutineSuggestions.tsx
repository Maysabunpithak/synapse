import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { MotionPressable as Pressable } from './Motion';
import SynapsePose from './SynapsePose';
import { palette as C } from './theme';

type Routine = { id: string; name: string; reason: string; actions: { entity_id: string; label: string }[] };
export default function RoutineSuggestions({ api, demo, reload }: { api: string; demo: boolean; reload: () => Promise<void> }) {
  const [saved, setSaved] = useState<Routine[]>([]);
  const [suggestions, setSuggestions] = useState<Routine[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const lock = useRef(false);
  const alive = useRef(true);

  async function request(path: string, body?: object) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40000);
    try {
      const response = await fetch(api + path, { signal: controller.signal, ...(body ? {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      } : {}) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'เชื่อมต่อไม่สำเร็จ');
      return data;
    } finally { clearTimeout(timer); }
  }
  async function load() {
    try {
      const data = await request('/routines');
      if (!data.ok) throw new Error('โหลดกิจวัตรไม่สำเร็จ');
      if (alive.current) { setSaved(data.saved || []); setSuggestions(data.suggestions || []); setError(''); }
    } catch { if (alive.current) setError('โหลดกิจวัตรไม่สำเร็จ แตะเพื่อลองใหม่'); }
    finally { if (alive.current) setLoading(false); }
  }
  useEffect(() => {
    alive.current = true;
    if (!demo) void load();
    return () => { alive.current = false; };
  }, [api, demo]);

  async function act(kind: 'accept' | 'run' | 'remove', routine: Routine) {
    if (lock.current) return;
    lock.current = true;
    setBusy(routine.id); setNotice('');
    try {
      const data = await request('/routines/' + kind, kind === 'accept'
        ? { pattern_id: routine.id, name: (names[routine.id] ?? routine.name).trim() } : { id: routine.id });
      if (!data.ok && kind !== 'run') throw new Error(data.error || 'บันทึกไม่สำเร็จ');
      if (alive.current) setNotice(kind === 'run' ? data.speech || data.error || 'เรียกใช้ไม่สำเร็จ' : kind === 'accept' ? 'จำชุดนี้แล้วค่ะ กดใช้หรือพูดชื่อชุดได้เลย' : 'ลบชุดแล้วค่ะ');
      if (kind === 'run') await reload().catch(() => {});
      await load();
    } catch (e) {
      if (alive.current) setNotice(e instanceof Error && e.name === 'AbortError' ? 'ยังยืนยันผลไม่ได้ กรุณาตรวจสถานะอุปกรณ์ก่อนลองอีกครั้ง' : e instanceof Error ? e.message : 'ทำรายการไม่สำเร็จ');
    } finally { lock.current = false; if (alive.current) setBusy(''); }
  }
  if (demo) return null;
  return <View style={s.card}>
    <View style={s.header}>
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><SynapsePose activity="attentive" width={64} height={64}/></View>
      <View style={s.copy}><Text style={s.title}>ให้บ้านจำเป็นชุดไหม?</Text><Text style={s.body}>ฉันดูจากอุปกรณ์ที่คุณมักเปิดตามกันค่ะ</Text></View>
    </View>
    {loading && <ActivityIndicator color={C.brown}/>}
    {!!error && <Pressable accessibilityRole="button" onPress={() => void load()}><Text style={s.body}>{error}</Text></Pressable>}
    {!loading && !error && suggestions.length === 0 && <Text style={s.body}>{saved.length ? 'ชุดที่พบถูกบันทึกแล้ว ฉันจะมองหากิจวัตรอื่นต่อค่ะ' : 'ยังไม่พบคู่ที่ใช้ซ้ำอย่างน้อย 3 วัน ใช้งานตามปกติได้เลยค่ะ'}</Text>}
    {!error && suggestions.map(r => <View key={r.id} style={s.item}>
      <Text style={s.body}>{r.reason}</Text>
      <Text style={s.label}>ตั้งชื่อที่อยากใช้เรียกชุดนี้</Text>
      <TextInput accessibilityLabel="ชื่อชุดกิจวัตร" value={names[r.id] ?? r.name} onChangeText={name => setNames(v => ({ ...v, [r.id]: name }))} maxLength={60} placeholder="เช่น เริ่มทำงาน" style={s.input}/>
      <Pressable accessibilityRole="button" disabled={!!busy || !(names[r.id] ?? r.name).trim()} onPress={() => void act('accept', r)} style={[s.button, !!busy && s.disabled]}><Text style={s.buttonText}>{busy === r.id ? 'กำลังบันทึก…' : 'จำเป็นชุดนี้'}</Text></Pressable>
    </View>)}
    {saved.length > 0 && <Text style={s.title}>ชุดที่บ้านจำไว้</Text>}
    {saved.map(r => <View key={r.id} style={s.item}>
      <Text style={s.title}>{r.name}</Text>
      <Text style={s.body}>{r.actions.map(a => a.label).join(' + ')}</Text>
      <Text style={s.body}>พูดว่า “{r.name}” ที่หน้า AI เพื่อเปิดชุดนี้</Text>
      <View style={s.buttons}>
        <Pressable accessibilityRole="button" accessibilityLabel={`เปิดชุด ${r.name}`} disabled={!!busy} onPress={() => void act('run', r)} style={[s.button, !!busy && s.disabled]}><Text style={s.buttonText}>{busy === r.id ? 'กำลังทำรายการ…' : 'เปิดชุดนี้'}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`ลบชุด ${r.name}`} disabled={!!busy} onPress={() => void act('remove', r)} style={s.remove}><Text style={s.body}>ลบชุด</Text></Pressable>
      </View>
    </View>)}
    {!!notice && <Text accessibilityLiveRegion="polite" style={s.body}>{notice}</Text>}
    <Text style={s.footnote}>บันทึกไว้เรียกใช้เท่านั้น ยังไม่ตั้งให้เปิดชุดอัตโนมัติ</Text>
  </View>;
}
const s = StyleSheet.create({
  card: { padding: 18, borderRadius: 24, backgroundColor: C.cream, gap: 14, marginBottom: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 }, copy: { flex: 1, minWidth: 0 },
  title: { color: C.brown, fontSize: 15, fontWeight: '600', lineHeight: 23 },
  body: { color: C.brown, fontSize: 13, lineHeight: 21 }, label: { color: C.muted, fontSize: 12 },
  item: { gap: 10, paddingTop: 14, borderTopWidth: 1, borderColor: C.line },
  input: { minHeight: 46, backgroundColor: C.white, borderRadius: 12, paddingHorizontal: 12, color: C.brown, fontSize: 14 },
  buttons: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  button: { minHeight: 44, borderRadius: 14, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: C.brown },
  buttonText: { color: C.white, fontSize: 13 }, remove: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  footnote: { color: C.muted, fontSize: 11, lineHeight: 18 }, disabled: { opacity: 0.5 },
});
