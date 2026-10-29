import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { MotionPressable as Pressable } from "./Motion";
import { Clock3, Lightbulb, Plug } from "./SynapseIcons";
import { headingFont, palette as C } from "./theme";
import type { Device } from "./SynapseUI";

type Summary = { entity_id: string; label: string; on_count: number; off_count: number; peak_hour: number; hourly: number[]; total: number };
type History = { timestamp: string; entity_id: string; ai_action: string };
type Props = {
  seeded?: boolean; sample?: boolean; demo: boolean; devices: Device[]; stats: Summary[]; history: History[];
  loading: boolean; error: boolean; retry: () => void;
};
function eventTime(timestamp: string) {
  const time = new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(timestamp) ? timestamp : timestamp + '+07:00');
  return Number.isNaN(time.getTime()) ? timestamp : time.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
export default function HistoryScreen(p: Props) {
  const latest = p.history[0];
  return <View style={s.page}>
    {p.sample && !p.seeded && <View style={s.notice}><Text style={s.name}>ข้อมูลตัวอย่าง</Text><Text style={s.muted}>จำลองการใช้งาน 30 วันเพื่อแสดงกราฟเท่านั้น ไม่ใช้เปิด Auto</Text></View>}
    {p.loading && !p.stats.length && <ActivityIndicator color={C.sand} style={{ padding: 16 }}/>}
    {p.error && <Pressable accessibilityRole="button" onPress={p.retry} style={s.notice}><Text style={s.muted}>โหลดประวัติไม่สำเร็จ · แตะเพื่อลองอีกครั้ง</Text></Pressable>}
    {latest && <View style={s.latest}>
      <View style={s.latestIcon}><Clock3 size={19} color={C.primary}/></View>
      <View style={s.flex}>
        <Text style={s.caption}>{p.sample ? 'ล่าสุดในโปรไฟล์' : 'การใช้งานล่าสุด'}</Text>
        <Text style={s.latestName}>{p.devices.find(d => d.entity_id === latest.entity_id)?.name || p.stats.find(d => d.entity_id === latest.entity_id)?.label || latest.entity_id} · {latest.ai_action === 'on' ? 'เปิด' : latest.ai_action === 'off' ? 'ปิด' : 'ปรับแสง'}</Text>
        <Text style={s.caption}>{eventTime(latest.timestamp)}</Text>
      </View>
    </View>}
    <View style={s.sectionHeading}><Text style={s.sectionTitle}>สถิติการใช้งาน</Text><Text style={s.caption}>{p.stats.length} อุปกรณ์</Text></View>
    {p.stats.map(device => {
      const peak = device.hourly[device.peak_hour] ?? 0;
      const percent = device.on_count ? Math.round(peak / device.on_count * 100) : 0;
      const maximum = Math.max(...device.hourly, 1);
      const hour = String(device.peak_hour).padStart(2, '0');
      const name = p.devices.find(d => d.entity_id === device.entity_id)?.name || device.label;
      return <View key={device.entity_id} style={s.card}>
        <View style={s.row}>
          <View style={s.icon}>{device.entity_id.startsWith('light.') ? <Lightbulb size={21} color={C.primary}/> : <Plug size={21} color={C.primary}/>}</View>
          <Text style={[s.name, s.flex]}>{name}</Text>
        </View>
        <View style={s.shareRow}>
          <Text accessibilityLabel={`เปิดในชั่วโมงที่ใช้บ่อยที่สุด ${percent} เปอร์เซ็นต์`} style={s.percent}>{percent}<Text style={s.percentSign}>%</Text></Text>
          <View style={s.flex}>
            <Text style={s.small}>เปิดในชั่วโมงที่ใช้บ่อยที่สุด</Text>
            <Text style={s.peakTime}>{hour}:00–{hour}:59 น.</Text>
            <Text style={s.caption}>{peak} จาก {device.on_count} ครั้ง</Text>
          </View>
        </View>
        <View style={s.metrics}>
          <View style={s.metric}><Text style={s.caption}>เปิด</Text><Text style={s.metricValue}>{device.on_count}<Text style={s.caption}> ครั้ง</Text></Text></View>
          <View style={s.metricDivider}/>
          <View style={s.metric}><Text style={s.caption}>ปิด</Text><Text style={s.metricValue}>{device.off_count}<Text style={s.caption}> ครั้ง</Text></Text></View>
        </View>
        <View style={s.chartHeading}><Text style={s.small}>การเปิดรายชั่วโมง</Text><Text style={s.caption}>สูงสุด {maximum} ครั้ง</Text></View>
        <View style={s.chart} accessible accessibilityLabel={`${name} การเปิดรายชั่วโมง ${device.hourly.map((count, index) => count ? `${index} นาฬิกา ${count} ครั้ง` : '').filter(Boolean).join(', ')}`}>
          <View pointerEvents="none" style={s.gridline}/>
          {device.hourly.map((count, index) => <View key={index} style={s.column}><View style={[s.bar, { height: count / maximum * 68, backgroundColor: index === device.peak_hour ? C.primary : C.sand }]}/></View>)}
        </View>
        <View style={s.chartLabels}>{['00:00', '06:00', '12:00', '18:00', '23:00'].map(label => <Text key={label} style={s.axisLabel}>{label}</Text>)}</View>
      </View>;
    })}
    {!p.loading && !p.error && !p.stats.length && <Text style={s.empty}>สถิติจะแสดงเมื่อมีประวัติการใช้งานอุปกรณ์</Text>}
  </View>;
}
const s = StyleSheet.create({
  page: { paddingTop: 2, paddingBottom: 20 }, flex: { flex: 1, minWidth: 0 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  muted: { color: C.muted, fontSize: 12, lineHeight: 20 }, caption: { color: C.muted, fontSize: 11, lineHeight: 18 }, small: { color: C.brown, fontSize: 12, lineHeight: 20 },
  name: { color: C.brown, fontSize: 15, lineHeight: 23, fontWeight: '600' },
  latest: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, backgroundColor: C.sandSurface, marginBottom: 22 },
  latestIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' }, latestName: { color: C.brown, fontSize: 13, lineHeight: 22, fontWeight: '500' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, paddingHorizontal: 2 }, sectionTitle: { color: C.brown, fontSize: 16, lineHeight: 24, fontWeight: '600' },
  card: { padding: 18, borderRadius: 24, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, marginBottom: 14 },
  icon: { width: 36, height: 36, borderRadius: 13, backgroundColor: C.cream, alignItems: 'center', justifyContent: 'center' },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 18, marginBottom: 16 }, percent: { color: C.brown, fontFamily: headingFont, fontSize: 42, lineHeight: 54, letterSpacing: -1 }, percentSign: { fontSize: 20, letterSpacing: 0 }, peakTime: { color: C.primary, fontSize: 13, lineHeight: 22, fontWeight: '600' },
  metrics: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, borderRadius: 14, paddingVertical: 10, marginBottom: 18 }, metric: { flex: 1, alignItems: 'center', gap: 1 }, metricDivider: { width: 1, height: 30, backgroundColor: C.line }, metricValue: { color: C.brown, fontSize: 19, lineHeight: 26, fontWeight: '500' },
  chartHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 8 }, chart: { height: 76, flexDirection: 'row', gap: 3, borderBottomWidth: 1, borderBottomColor: C.line }, gridline: { position: 'absolute', left: 0, right: 0, top: 38, borderTopWidth: 1, borderColor: C.paper }, column: { flex: 1, justifyContent: 'flex-end' }, bar: { width: '100%', borderTopLeftRadius: 3, borderTopRightRadius: 3 }, chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }, axisLabel: { color: C.muted, fontSize: 9, lineHeight: 15 },
  notice: { backgroundColor: C.cream, borderRadius: 16, padding: 14, marginBottom: 14 }, empty: { color: C.muted, fontSize: 13, lineHeight: 22, paddingVertical: 24 },
});
