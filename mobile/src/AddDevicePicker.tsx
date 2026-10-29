import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ArrowLeft } from './SynapseIcons';
import { Search } from 'lucide-react-native';
import DeviceGlyph from './DeviceGlyph';
import { MotionProvider, useMotionEnabled } from './Motion';
import { palette as C } from './theme';

function RadarMotion({ active }: { active: boolean }) {
  const motion = useMotionEnabled();
  const turn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    turn.setValue(0);
    if (!active || !motion) return;
    const loop = Animated.loop(Animated.timing(turn, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: true, isInteraction: false }));
    loop.start(); return () => loop.stop();
  }, [active, motion, turn]);
  return <View accessible={false} style={s.radar}>
    <Svg width={220} height={220} viewBox="0 0 220 220">
      <Circle cx="110" cy="110" r="106" fill={C.cream} opacity={0.55}/>
      <Circle cx="110" cy="110" r="75" fill={C.orange} opacity={0.08}/>
      <Circle cx="110" cy="110" r="42" fill={C.orange} opacity={0.1}/>
      <Circle cx="110" cy="110" r="106" fill="none" stroke={C.sand} opacity={0.12}/>
    </Svg>
    <Animated.View style={[s.sweep, { transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
      <Svg width={220} height={220} viewBox="0 0 220 220">
        <Path d="M110 110L110 4A106 106 0 0 1 202 57Z" fill={C.orange} opacity={0.3}/>
        <Path d="M110 110L202 57" stroke={C.sand} strokeWidth="2"/>
        <Circle cx="110" cy="110" r="4" fill={C.sand}/>
      </Svg>
    </Animated.View>
  </View>;
}
export function PairingRadar({ active }: { active: boolean }) {
  return <MotionProvider><RadarMotion active={active}/></MotionProvider>;
}

const devices = [
  { id: 'plug', label: 'ปลั๊กอัจฉริยะ', category: 'ปลั๊ก', kind: 'plug' as const },
  { id: 'light', label: 'หลอดไฟอัจฉริยะ', category: 'หลอดไฟ', kind: 'light' as const },
];
export default function AddDevicePicker({ onBack, onSelect }: { onBack: () => void; onSelect: (name: string) => void }) {
  const [category, setCategory] = useState('ทั้งหมด');
  const [query, setQuery] = useState('');
  const matches = devices.filter(d => (category === 'ทั้งหมด' || d.category === category) && `${d.label} Wi-Fi ${d.id}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="ย้อนกลับ" onPress={onBack} style={s.back}><ArrowLeft size={23} color={C.brown}/></Pressable>
      <Text style={s.title}>เพิ่มอุปกรณ์</Text><View style={s.back}/>
    </View>
    <View style={s.intro}>
      <Text style={s.headline}>พร้อมเชื่อมต่ออุปกรณ์ของคุณ</Text>
      <Text style={s.hint}>เปิดอุปกรณ์และตั้งเป็นโหมดจับคู่{ '\n' }เลือกชนิดอุปกรณ์ด้านล่างเพื่อเริ่มต้น</Text>
    </View>
    <PairingRadar active={false}/>
    <View style={s.manual}>
      <Text style={s.section}>เพิ่มเอง</Text>
      <View style={s.search}><Search size={17} color={C.muted}/><TextInput accessibilityLabel="ค้นหาประเภทอุปกรณ์" placeholder="ค้นหาอุปกรณ์" placeholderTextColor={C.muted} value={query} onChangeText={setQuery} style={s.input}/></View>
    </View>
    <View style={s.catalog}>
      <View style={s.categories}>{['ทั้งหมด', 'ปลั๊ก', 'หลอดไฟ'].map(label => <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: category === label }} onPress={() => setCategory(label)} style={[s.category, category === label && s.selected]}><Text style={[s.categoryLabel, category === label && { color: C.brown, fontWeight: '600' }]}>{label}</Text></Pressable>)}</View>
      <View style={s.items}>{matches.map(device => <Pressable key={device.id} accessibilityRole="button" accessibilityLabel={`เพิ่ม${device.label} Wi-Fi`} onPress={() => onSelect(device.label)} style={s.device}>
        <View style={s.deviceIcon}><DeviceGlyph kind={device.kind} size={46} color={C.sand}/></View>
        <Text style={s.deviceName}>{device.label}</Text><Text style={s.deviceDetail}>Wi-Fi 2.4 GHz</Text>
      </Pressable>)}{!matches.length && <Text style={s.hint}>ไม่พบอุปกรณ์ที่ค้นหา</Text>}</View>
    </View>
  </ScrollView>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.white }, content: { padding: 20, paddingBottom: 32, width: '100%', maxWidth: 600, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 21, fontWeight: '600', color: C.brown },
  intro: { marginTop: 32, alignItems: 'center', gap: 10 }, headline: { fontSize: 21, lineHeight: 30, fontWeight: '600', color: C.brown, textAlign: 'center' }, hint: { color: C.muted, fontSize: 13, lineHeight: 22, textAlign: 'center' },
  radar: { width: 220, height: 220, alignSelf: 'center', marginVertical: 28 }, sweep: { position: 'absolute', top: 0, left: 0 },
  manual: { borderTopWidth: 1, borderColor: C.line, paddingTop: 20, flexDirection: 'row', alignItems: 'center', gap: 14 }, section: { color: C.brown, fontSize: 18, fontWeight: '600' }, search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 24, paddingHorizontal: 12, backgroundColor: C.paper }, input: { flex: 1, minWidth: 0, minHeight: 44, color: C.brown, fontSize: 13 },
  catalog: { flexDirection: 'row', marginTop: 22, gap: 12 }, categories: { width: 78, gap: 8 }, category: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center', borderRadius: 12 }, selected: { backgroundColor: C.cream }, categoryLabel: { fontSize: 12, color: C.muted },
  items: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, device: { minWidth: 86, flexBasis: 92, flexGrow: 1, alignItems: 'center', paddingBottom: 16 }, deviceIcon: { width: 72, height: 80, justifyContent: 'center', alignItems: 'center' }, deviceName: { fontSize: 12, lineHeight: 18, color: C.brown, textAlign: 'center' }, deviceDetail: { fontSize: 10, color: C.muted, marginTop: 3 },
});
