import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { X, Check } from './SynapseIcons';
import DeviceGlyph from './DeviceGlyph';
import { MotionProvider, useMotionEnabled } from './Motion';
import { palette as C } from './theme';

type Props = { device: string; connecting: boolean; status: string; error: string | null; onBack: () => void; onClose: () => void; onConnect: () => void };
function GuideContent(p: Props) {
  const [step, setStep] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const motion = useMotionEnabled();
  const pulse = useRef(new Animated.Value(0)).current;
  const light = p.device.includes('หลอดไฟ');
  useEffect(() => {
    pulse.setValue(0);
    if (!motion || (!p.connecting && step !== 2)) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: p.connecting ? 1200 : 450, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(pulse, { toValue: 0, duration: p.connecting ? 1200 : 450, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start(); return () => loop.stop();
  }, [motion, p.connecting, step, pulse]);
  const instructions = [
    `เปิด${p.device}และตรวจสอบว่าได้รับไฟแล้ว`,
    light ? 'ทำให้อุปกรณ์เข้าโหมดจับคู่ โดยเปิด–ปิดไฟตามขั้นตอนในคู่มือของรุ่นที่ใช้' : 'กดปุ่มรีเซ็ตค้างตามเวลาที่ระบุในคู่มือ จนไฟสถานะเริ่มกะพริบ',
    'ตรวจสอบว่าไฟสถานะกะพริบเร็ว พร้อมสำหรับการจับคู่ Wi-Fi',
  ];
  return <ScrollView style={s.page} contentContainerStyle={s.content}>
    <View style={s.top}>
      <Pressable accessibilityRole="button" accessibilityLabel={p.connecting ? 'ยกเลิกการเชื่อมต่อ' : 'ปิดการเพิ่มอุปกรณ์'} onPress={p.onClose} style={s.close}><X size={27} color={C.brown}/></Pressable>
      {!p.connecting && <View style={s.badge}><Text style={s.badgeText}>Wi-Fi</Text></View>}
    </View>
    <Text style={[s.title, p.connecting && s.center]}>{p.connecting ? 'กำลังเชื่อมต่ออุปกรณ์' : 'เตรียมอุปกรณ์'}</Text>
    {p.connecting && <Text style={s.subtitle}>วางอุปกรณ์ใกล้โทรศัพท์และเราเตอร์{ '\n' }เปิดหน้านี้ไว้จนกว่าจะเชื่อมต่อเสร็จ</Text>}
    <View style={s.illustration}>
      {p.connecting ? <>
        <Animated.View style={[s.halo, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] }) }] }]}/>
        <Svg width={150} height={170} viewBox="0 0 150 170"><Rect x="46" y="26" width="58" height="110" rx="9" fill={C.white} stroke={C.sand} strokeWidth="3"/><Path d="M63 36H87M68 125H82" stroke={C.sand} strokeWidth="3" strokeLinecap="round"/><Path d="M58 72Q75 58 92 72M64 80Q75 71 86 80" fill="none" stroke={C.orange} strokeWidth="3" strokeLinecap="round"/><Circle cx="75" cy="89" r="3" fill={C.orange}/></Svg>
      </> : step === 0 ? <DeviceGlyph kind={light ? 'light' : 'plug'} size={112} color={C.sand}/> : step === 1 ? <Svg width={200} height={180} viewBox="0 0 200 180">
        <Rect x="32" y="16" width="128" height="128" rx={light ? 50 : 30} fill={C.paper} stroke={C.sand} strokeWidth="2"/>
        <Circle cx="104" cy="97" r="16" fill={C.white} stroke={C.sand} strokeWidth="2"/><Path d="M104 86V97M97 90A10 10 0 1 0 111 90" fill="none" stroke={C.sand} strokeWidth="2"/><Circle cx="67" cy="97" r="5" fill={C.yellow}/>
        <Path d="M169 158L155 138L144 116Q138 105 131 113L113 94Q101 83 100 96L114 121Q94 117 101 131L123 153L143 164Z" fill={C.cream} stroke={C.sand} strokeWidth="2"/>
      </Svg> : <Animated.View style={{ opacity: motion ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) : 1 }}>
        <Svg width={180} height={180} viewBox="0 0 180 180"><Circle cx="90" cy="90" r="22" fill={C.yellow} stroke={C.orange} strokeWidth="2"/><Path d="M52 55Q22 90 52 125M64 67Q44 90 64 113M128 55Q158 90 128 125M116 67Q136 90 116 113" fill="none" stroke={C.line} strokeWidth="9"/></Svg>
      </Animated.View>}
    </View>
    {p.connecting ? <>
      <View accessibilityRole="progressbar" accessibilityLabel="กำลังเชื่อมต่ออุปกรณ์" accessibilityState={{ busy: true }} style={s.progress}>
        <Animated.View style={[s.progressFill, { opacity: motion ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) : 1 }]}/>
      </View>
      <Text accessibilityLiveRegion="polite" style={s.subtitle}>{p.status}</Text>
    </> : <>
      <View style={s.steps}>{[0, 1, 2].map(i => <View key={i} style={[s.step, i === step && s.activeStep]}><Text style={[s.stepText, i === step && { color: C.white }]}>{i + 1}</Text></View>)}</View>
      <Text accessibilityLiveRegion="polite" style={s.instruction}>{instructions[step]}</Text>
      {step === 2 && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} onPress={() => setConfirmed(!confirmed)} style={s.confirm}><View style={[s.checkbox, confirmed && { backgroundColor: C.sand }]}>{confirmed && <Check size={18} color={C.white}/>}</View><Text style={s.confirmText}>ไฟสถานะกะพริบเร็วแล้ว</Text></Pressable>}
      {(!!p.error || attempted) && <Text accessibilityRole="alert" style={s.error}>{p.status}</Text>}
    </>}
    <View style={s.space}/>
    <View style={s.actions}>
      <Pressable accessibilityRole="button" onPress={() => { if (p.connecting) p.onClose(); else if (step === 0) p.onBack(); else { setStep(step - 1); setConfirmed(false); } }} style={s.back}><Text style={s.buttonText}>{p.connecting ? 'ยกเลิก' : 'ย้อนกลับ'}</Text></Pressable>
      {!p.connecting && <Pressable accessibilityRole="button" disabled={step === 2 && !confirmed} accessibilityState={{ disabled: step === 2 && !confirmed }} onPress={() => { if (step < 2) setStep(step + 1); else if (confirmed) { setAttempted(true); p.onConnect(); } }} style={[s.next, step === 2 && !confirmed && { opacity: 0.45 }]}><Text style={s.buttonText}>{step === 2 ? 'เริ่มเชื่อมต่อ' : 'ถัดไป'}</Text></Pressable>}
    </View>
  </ScrollView>;
}
export default function PairingGuide(p: Props) { return <MotionProvider><GuideContent {...p}/></MotionProvider>; }
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.white }, content: { flexGrow: 1, padding: 24, width: '100%', maxWidth: 560, alignSelf: 'center' }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, close: { width: 44, height: 44, justifyContent: 'center' }, badge: { backgroundColor: C.paper, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 24 }, badgeText: { color: C.muted, fontSize: 14 },
  title: { fontSize: 26, lineHeight: 36, color: C.brown, fontWeight: '600', marginTop: 30 }, center: { textAlign: 'center' }, subtitle: { fontSize: 13, color: C.muted, lineHeight: 22, textAlign: 'center', marginTop: 12 },
  illustration: { height: 200, marginTop: 26, alignItems: 'center', justifyContent: 'center' }, halo: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: C.cream }, steps: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 16 }, step: { width: 27, height: 27, borderRadius: 14, borderWidth: 1, borderColor: C.sand, alignItems: 'center', justifyContent: 'center' }, activeStep: { backgroundColor: C.sand }, stepText: { color: C.muted, fontSize: 14 },
  instruction: { color: C.brown, fontSize: 17, lineHeight: 28, marginTop: 28 }, confirm: { flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 48, marginTop: 12 }, checkbox: { width: 24, height: 24, borderWidth: 1, borderColor: C.sand, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }, confirmText: { flex: 1, color: C.brown, fontSize: 14 },
  progress: { height: 5, borderRadius: 3, backgroundColor: C.line, width: '80%', alignSelf: 'center', overflow: 'hidden', marginVertical: 18 }, progressFill: { flex: 1, backgroundColor: C.orange }, error: { color: C.brown, backgroundColor: C.cream, padding: 12, marginTop: 12, borderRadius: 12 }, space: { flexGrow: 1, minHeight: 28 }, actions: { flexDirection: 'row', gap: 12 }, back: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line, borderRadius: 14 }, next: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: C.orange, borderRadius: 14 }, buttonText: { color: C.brown, fontSize: 16, fontWeight: '600' },
});
