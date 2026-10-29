import { useMemo, useRef, type ReactNode } from 'react';
import { PanResponder, Platform, Pressable, View } from 'react-native';
import Trash2 from 'lucide-react-native/icons/trash';
import { pinchScale, windowWallSlope } from './roomGestures';
import { clampPosition, furnitureCatalog, supportedDecorations, type Decoration } from './roomScene';
import RoomFurniture from './RoomFurniture';
import WindowAtmosphere from './WindowAtmosphere';
import { furnitureLayer } from './caretakerPath';
import { useFrameQueue } from './useFrameQueue';
type Props = { hour?: number; fanOn?: boolean; onActivity?: (id: string) => void; interactiveCaretaker?: boolean; caretaker?: ReactNode; items: Decoration[]; width: number; height: number; selected?: string; onSelect?: (id: string) => void; onMove?: (id: string, x: number, y: number) => void; onResize?: (id: string, scale: number) => void; onDelete?: (id: string) => void; onDragStart?: () => void; onDragEnd?: () => void };
function Piece({ item, ...props }: Omit<Props, 'items'> & { item: Decoration }) {
  const latest = useRef({ item, ...props }); latest.current = { item, ...props };
  const start = useRef({ x: item.x, y: item.y });
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const wasPinching = useRef(false);
  const updates = useFrameQueue<{ x?: number; y?: number; scale?: number }>(value => {
    const p = latest.current;
    if (value.scale !== undefined) p.onResize?.(p.item.id, value.scale);
    else if (value.x !== undefined && value.y !== undefined) p.onMove?.(p.item.id, value.x, value.y);
  });
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !!latest.current.onMove,
    onMoveShouldSetPanResponder: () => !!latest.current.onMove,
    onPanResponderGrant: () => { const p = latest.current; start.current = { x: p.item.x, y: p.item.y }; pinch.current = null; wasPinching.current = false; p.onSelect?.(p.item.id); p.onDragStart?.(); },
    onPanResponderMove: (event, gesture) => {
      const p = latest.current;
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2) {
        const distance = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
        if (!pinch.current) pinch.current = { distance, scale: p.item.scale ?? 1 };
        wasPinching.current = true;
        updates.push({ scale: pinchScale(pinch.current.scale, pinch.current.distance, distance) });
        return;
      }
      // Avoid jumping when one finger lifts after a pinch; a new gesture moves again.
      if (wasPinching.current) return;
      if (p.width && p.height) updates.push({ x: clampPosition(start.current.x + gesture.dx / p.width), y: clampPosition(start.current.y + gesture.dy / p.height) });
    },
    onPanResponderRelease: () => { updates.flush(); latest.current.onDragEnd?.(); },
    onPanResponderTerminate: () => { updates.flush(); latest.current.onDragEnd?.(); },
    onPanResponderTerminationRequest: () => false,
  }), []);
  const info = furnitureCatalog.find(f => f.kind === item.kind)!;
  const size = props.width * info.size * (item.scale ?? 1);
  return <View {...(props.onMove ? responder.panHandlers : {})} accessible={!!props.onMove} accessibilityRole={props.onMove ? 'button' : undefined} accessibilityLabel={`${info.label} แตะเพื่อเลือกหรือลากเพื่อย้าย`} accessibilityState={{ selected: props.selected === item.id }} onAccessibilityTap={() => props.onSelect?.(item.id)} style={{ position: 'absolute', left: item.x * props.width - size / 2, top: item.y * props.height - size * 0.86, width: size, height: size, borderRadius: 16, borderWidth: props.selected === item.id ? 2 : 0, borderColor: '#FFFFFF', backgroundColor: props.selected === item.id ? '#FFFFFF1C' : 'transparent' }}>
    <View pointerEvents="none" style={{ flex: 1, ...(Platform.OS === 'web' ? { touchAction: 'none' as const } : {}) }}><RoomFurniture kind={item.kind} color={item.color} rotation={item.rotation} facing={item.facing} wallSlope={item.kind.startsWith('window') ? windowWallSlope(item.x, props.width, props.height) : undefined}/>{item.kind.startsWith('window') && props.hour !== undefined && <WindowAtmosphere hour={props.hour} fanOn={!!props.fanOn} slope={windowWallSlope(item.x, props.width, props.height)}/>}</View>{props.onActivity && /^(plant|bed|sofa|table|shelf|window)/.test(item.kind) && <Pressable accessibilityRole="button" accessibilityLabel={`ให้บ้านทำกิจกรรมที่${info.label}`} onPress={event => { event.stopPropagation(); props.onActivity?.(item.id); }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}/>}
  </View>;
}
export default function FurnitureLayer({ items, caretaker, ...props }: Props) {
  items = supportedDecorations(items, props.width, props.height);
  const layer = (item: Decoration) => {
    const support = item.support && items.find(d => d.id === item.support!.id);
    const base = support || item;
    return furnitureLayer(base.kind, base.y * props.height, props.width * furnitureCatalog.find(f => f.kind === base.kind)!.size * (base.scale ?? 1)) + (support ? 1 : 0);
  };
  const rank = (d: Decoration) => d.kind.startsWith('window') ? 0 : d.kind.startsWith('rug') ? 1 : 2;
  const chosen = items.find(d => d.id === props.selected);
  const size = chosen ? props.width * furnitureCatalog.find(f => f.kind === chosen.kind)!.size * (chosen.scale ?? 1) : 0;
  return <View pointerEvents={props.onMove || props.interactiveCaretaker ? 'box-none' : 'none'} style={{ position: 'absolute', left: 0, top: 0, width: props.width, height: props.height }}>
    {[...items].sort((a, b) => rank(a) - rank(b) || a.y - b.y).map(item => <View key={item.id} pointerEvents="box-none" style={{ position: 'absolute', width: props.width, height: props.height, zIndex: layer(item) }}><Piece item={item} {...props}/></View>)}
    {caretaker}
    {chosen && props.onDelete && <Pressable accessibilityRole="button" accessibilityLabel="ลบเฟอร์นิเจอร์ที่เลือก" onPress={() => props.onDelete?.(chosen.id)} style={{ position: 'absolute', zIndex: 1000000, left: Math.max(0, Math.min(props.width - 44, chosen.x * props.width + size / 2 - 22)), top: Math.max(0, Math.min(props.height - 44, chosen.y * props.height - size * 0.86 - 22)), width: 44, height: 44, borderRadius: 22, backgroundColor: '#A84437', borderColor: '#FFF9EF', borderWidth: 2, alignItems: 'center', justifyContent: 'center' }}><Trash2 size={21} color="#FFFFFF"/></Pressable>}
  </View>;
}
