import { palette as C } from './theme';
import { useMemo, useRef } from 'react';
import { PanResponder, Platform, Text, View } from 'react-native';
import RoomFurniture from './RoomFurniture';
import type { FurnitureKind } from './roomScene';
import { useFrameQueue } from './useFrameQueue';
type Props = { kind: FurnitureKind; color?: string; label: string; disabled: boolean; onBegin: () => void; onDrag: (x: number, y: number) => void; onDrop: (x: number, y: number) => void; onCancel: () => void; onTap: () => void };
export default function DraggableFurniture(props: Props) {
  const latest = useRef(props); latest.current = props;
  const moved = useRef(false);
  const updates = useFrameQueue<{ x: number; y: number }>(p => latest.current.onDrag(p.x, p.y));
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !latest.current.disabled,
    onMoveShouldSetPanResponder: () => !latest.current.disabled,
    onPanResponderGrant: () => { moved.current = false; latest.current.onBegin(); },
    onPanResponderMove: (event, gesture) => {
      if (Math.hypot(gesture.dx, gesture.dy) < 8 && !moved.current) return;
      moved.current = true;
      updates.push({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
    },
    onPanResponderRelease: (event, gesture) => {
      updates.cancel();
      if (moved.current) latest.current.onDrop(gesture.moveX || event.nativeEvent.pageX, gesture.moveY || event.nativeEvent.pageY);
      else latest.current.onTap();
      latest.current.onCancel();
    },
    onPanResponderTerminate: () => { updates.cancel(); latest.current.onCancel(); },
    onPanResponderTerminationRequest: () => false,
  }), []);
  return <View {...pan.panHandlers} accessible accessibilityRole="button" accessibilityLabel={`ลาก${props.label}เข้าห้อง หรือแตะเพื่อเพิ่ม`} accessibilityState={{ disabled: props.disabled }} onAccessibilityTap={() => { if (!props.disabled) props.onTap(); }} style={{ width: '23%', minWidth: 68, flexGrow: 1, alignItems: 'center', paddingBottom: 12, backgroundColor: C.sandSurface, borderRadius: 18, opacity: props.disabled ? 0.4 : 1, ...(Platform.OS === "web" ? { touchAction: "none" as const } : {}) }}>
    <View pointerEvents="none" style={{ width: 74, height: 78, ...(Platform.OS === 'web' ? { touchAction: 'none' as const } : {}) }}><RoomFurniture kind={props.kind} color={props.color}/></View><Text style={{ color: C.brown, fontSize: 12, textAlign: 'center', paddingHorizontal: 5 }}>{props.label}</Text>
  </View>;
}
