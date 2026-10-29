import { useRef, useState, type ReactNode } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { MotionPressable as Pressable } from './Motion';
import RoomVisual from './RoomVisual';
import RoomFurniture from './RoomFurniture';
import Svg from 'react-native-svg';
import WallPattern from './WallPattern';
import { wallPatterns } from './roomScene';
import DraggableFurniture from './DraggableFurniture';
import { roomDrop } from './roomGestures';
import { defaultRoomScene, furnitureCatalog, coderFurnitureColor, makeRoomScene, roomColors, type Decoration, type FurnitureKind, type RoomScene } from './roomScene';
import { saveRoomScene, useRoomScene } from './roomSceneStore';
import { palette as C } from './theme';
import type { RoomDeviceState } from './RoomCaretaker';
import { placeDecoration, removeDecoration } from './roomScene';
const categories = ['เตียง', 'โซฟา', 'โต๊ะ', 'ชั้นวาง', 'ต้นไม้', 'โคมไฟ', 'พรม', 'หน้าต่าง', 'ตุ๊กตา', 'ผนังและพื้น'] as const;
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function RoomEditor({ room, children, devices }: { room: string; children?: ReactNode; devices?: readonly RoomDeviceState[] }) {
  const saved = useRoomScene(room);
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RoomScene>(defaultRoomScene);
  const latest = useRef(draft); latest.current = draft;
  const [selected, setSelected] = useState('');
  const [category, setCategory] = useState<typeof categories[number]>('เตียง');
  const [error, setError] = useState('');
  const board = useRef<View>(null);
  const roomBounds = useRef({ width: 0, height: 0 });
  const backdrop = useRef<View>(null);
  const origin = useRef({ x: 0, y: 0 });
  const [ghost, setGhost] = useState<{ kind: FurnitureKind; x: number; y: number } | null>(null);
  const item = draft.decorations.find(d => d.id === selected);
  const name = furnitureCatalog.find(f => f.kind === item?.kind)?.label;
  function change(next: RoomScene) {
    setDraft(next); latest.current = next;
  }
  function update(patch: Partial<Decoration>) {
    if (item) change({ ...draft, decorations: draft.decorations.map(d => d.id === selected ? { ...d, ...patch } : d) });
  }
  function add(kind: FurnitureKind, position?: { x: number; y: number }) {
    const current = latest.current;
    if (current.decorations.length >= 24) return;
    const id = newId();
    const x = position?.x ?? 0.5, y = position?.y ?? (kind.startsWith('window') ? 0.4 : 0.78);
    const decorations: Decoration[] = [...current.decorations, { id, kind, x, y, color: coderFurnitureColor(kind), rotation: 0, scale: 1 }];
    change({ ...current, decorations: placeDecoration(decorations, id, x, y, roomBounds.current.width, roomBounds.current.height) });
    setSelected(id);
  }
  function start() {
    setDraft({ ...saved, decorations: saved.decorations.map(d => ({ ...d })) });
    setSelected(''); setError(''); setOpen(true);
  }
  function save() {
    try { saveRoomScene(room, { ...draft, version: 2 }); setOpen(false); }
    catch (e) { setError(e instanceof Error ? e.message : 'บันทึกไม่สำเร็จ'); }
  }
  function swatches(value: string | undefined, apply: (color: string) => void, label: string) {
    return <View style={s.row}>{roomColors.map((color, index) => <Pressable key={color} accessibilityRole="button" accessibilityLabel={`${label} สี ${index + 1}`} accessibilityState={{ selected: value === color }} onPress={() => apply(color)} style={[s.swatch, { backgroundColor: color, borderColor: value === color ? C.brown : 'transparent' }]}><Text style={s.check}>{value === color ? '✓' : ''}</Text></Pressable>)}</View>;
  }
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`จัดห้อง ${room}`} accessibilityHint="เปิดห้องเพื่อเลือกและลากเฟอร์นิเจอร์" onPress={start} style={children ? undefined : s.entry}>{children || <Text style={s.body}>จัดห้องของคุณ</Text>}</Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View ref={backdrop} collapsable={false} style={s.backdrop}><View style={s.panel}>
        <View style={s.header}><View style={s.flex}><Text style={s.eyebrow}>SYNAPSE · MY ROOM</Text><Text style={s.title}>{room}</Text></View><Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={s.chip}><Text style={s.body}>ยกเลิก</Text></Pressable><Pressable accessibilityRole="button" onPress={save} style={[s.chip, s.primary]}><Text style={s.white}>บันทึก</Text></Pressable></View>
        <View ref={board} collapsable={false} onLayout={event => { roomBounds.current = { width: event.nativeEvent.layout.width - 4, height: event.nativeEvent.layout.height - 4 }; }} style={{ borderColor: ghost ? C.orange : 'transparent', borderWidth: 2, ...(Platform.OS === 'web' ? { touchAction: 'none' as const } : {}) }}>
        <RoomVisual room={room} devices={devices} scene={draft} selected={selected} onSelect={setSelected} style={{ height: Math.min(360, height * 0.38), minHeight: 180, borderRadius: 0 }}
          onDelete={id => { change({ ...latest.current, decorations: removeDecoration(latest.current.decorations, id, roomBounds.current.width, roomBounds.current.height) }); setSelected(''); }}
          onResize={(id, scale) => setDraft(v => ({ ...v, decorations: v.decorations.map(d => d.id === id ? { ...d, scale } : d) }))}
          onMove={(id, x, y) => setDraft(v => ({ ...v, decorations: placeDecoration(v.decorations, id, x, y, roomBounds.current.width, roomBounds.current.height) }))}/>
        </View>
        <ScrollView scrollEnabled={!ghost} style={s.controls} contentContainerStyle={s.controlContent} keyboardShouldPersistTaps="handled">
          {item ? <View style={s.selection}>
            <Text style={s.label}>{name} · ชิ้นที่เลือก</Text>
            {swatches(item.color, color => update({ color }), `สี${name}`)}
          </View> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>{categories.map(c => <Pressable key={c} accessibilityRole="tab" accessibilityState={{ selected: category === c }} onPress={() => setCategory(c)} style={[s.chip, category === c && s.primary]}><Text style={category === c ? s.white : s.body}>{c}</Text></Pressable>)}</ScrollView>
          {category === 'ผนังและพื้น' ? <View style={s.selection}>
            <Text style={s.label}>ลายผนัง</Text>
            <View style={s.row}>{wallPatterns.map(pattern => <Pressable key={pattern.id} accessibilityRole="button" accessibilityLabel={`ผนัง${pattern.label}`} accessibilityState={{ selected: (draft.wallPattern ?? 'plain') === pattern.id }} onPress={() => change({ ...draft, wallPattern: pattern.id })} style={{ width: '30%', flexGrow: 1, padding: 5, gap: 5, borderRadius: 12, borderWidth: 2, borderColor: (draft.wallPattern ?? 'plain') === pattern.id ? C.brown : 'transparent', alignItems: 'center' }}>
              <View pointerEvents="none" style={{ width: '100%', height: 48, borderRadius: 8, overflow: 'hidden', backgroundColor: draft.wall || '#FFF5DF' }}><Svg width="100%" height="100%" viewBox="0 0 88 48"><WallPattern kind={pattern.id} width={88} height={48}/></Svg></View>
              <Text style={s.body}>{pattern.label}</Text>
            </Pressable>)}</View>
            <Text style={s.label}>สีผนัง</Text>{swatches(draft.wall, wall => change({ ...draft, wall }), 'ผนัง')}
            <Text style={s.label}>สีพื้น</Text>{swatches(draft.floor, floor => change({ ...draft, floor }), 'พื้น')}
          </View> : <View style={s.catalog}>{furnitureCatalog.filter(f => f.group === category).map(f => <DraggableFurniture key={f.kind} kind={f.kind} label={f.label} color={coderFurnitureColor(f.kind)} disabled={draft.decorations.length >= 24}
            onBegin={() => backdrop.current?.measureInWindow((x, y) => { origin.current = { x, y }; })}
            onDrag={(x, y) => setGhost({ kind: f.kind, x: x - origin.current.x, y: y - origin.current.y })}
            onDrop={(x, y) => board.current?.measureInWindow((bx, by, width, bh) => { const position = roomDrop({ x: bx + 2, y: by + 2, width: width - 4, height: bh - 4 }, x, y); if (position) add(f.kind, position); })}
            onCancel={() => setGhost(null)} onTap={() => add(f.kind)}/> )}</View>}
          <View style={s.row}><Pressable accessibilityRole="button" onPress={() => { change(makeRoomScene(room)); setSelected(''); }} style={s.chip}><Text style={s.body}>จัดแบบเริ่มต้น</Text></Pressable><Pressable accessibilityRole="button" onPress={() => { change({ ...draft, decorations: [] }); setSelected(''); }} style={s.chip}><Text style={s.body}>เริ่มจากห้องว่าง</Text></Pressable></View>
          {!!error && <Text accessibilityLiveRegion="polite" style={s.body}>{error}</Text>}
        </ScrollView>
      </View>{ghost && <View pointerEvents="none" style={{ position: 'absolute', left: ghost.x - 40, top: ghost.y - 72, width: 80, height: 80, opacity: 0.85 }}><RoomFurniture kind={ghost.kind} color={coderFurnitureColor(ghost.kind)}/></View>}</View>
    </Modal>
  </>;
}
const s = StyleSheet.create({
  entry: { minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' }, flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: C.backdrop, justifyContent: 'center', alignItems: 'center', paddingVertical: 24, paddingHorizontal: 8 },
  panel: { width: '100%', maxWidth: 600, height: '100%', backgroundColor: C.cream, borderRadius: 24, overflow: 'hidden' },
  header: { padding: 14, flexDirection: 'row', gap: 8, alignItems: 'center' }, eyebrow: { fontSize: 8, letterSpacing: 1, color: C.muted },
  title: { fontSize: 19, color: C.brown, fontWeight: '600', marginTop: 4 }, body: { color: C.brown, fontSize: 12 }, white: { color: C.white, fontSize: 12 },
  label: { color: C.brown, fontSize: 14, fontWeight: '600' },
  chip: { minHeight: 44, paddingHorizontal: 13, borderRadius: 14, backgroundColor: C.sandSurface, alignItems: 'center', justifyContent: 'center' }, primary: { backgroundColor: C.primary },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, tabs: { gap: 7 },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, alignItems: 'center', justifyContent: 'center' }, check: { color: C.brown, fontWeight: '700' },
  controls: { flex: 1 }, controlContent: { padding: 14, gap: 14, paddingBottom: 28 }, selection: { gap: 10, padding: 12, borderRadius: 16, backgroundColor: C.sandSurface },
  catalog: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, catalogItem: { width: '23%', minWidth: 68, flexGrow: 1, alignItems: 'center', paddingBottom: 12, backgroundColor: C.sandSurface, borderRadius: 18 }, thumbnail: { width: 74, height: 78 }, disabled: { opacity: 0.4 },
});
