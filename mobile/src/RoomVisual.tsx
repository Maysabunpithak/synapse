import React, { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Animated, AppState, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { palette as C } from "./theme";
import { roomLight, type RoomScene } from './roomScene';
import { useRoomScene } from './roomSceneStore';
import { useMotionEnabled } from './Motion';
import FurnitureLayer from './FurnitureLayer';
import DollhouseRoom from './DollhouseRoom';
import RoomCaretaker, { type RoomDeviceState } from './RoomCaretaker';
import RoomDeviceEffects from './RoomDeviceEffects';
import { roomDeviceEffects } from './roomDeviceState';
import type { DeviceFeedback } from './houseInteraction';

// Decorative interiors, not camera feeds or photographs of the user's home.
export default function RoomVisual({ room = "ห้องนั่งเล่น", children, style, scene, devices, activities = false, feedback, onMove, selected, onSelect, onDragStart, onDragEnd, onResize, onDelete }: {
  feedback?: DeviceFeedback | null;
  devices?: readonly RoomDeviceState[];
  activities?: boolean;
  room?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  scene?: RoomScene;
  onMove?: (id: string, x: number, y: number) => void;
  onResize?: (id: string, scale: number) => void;
  onDelete?: (id: string) => void;
  selected?: string;
  onSelect?: (id: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const [activityRequest, setActivityRequest] = useState<{ id: string; nonce: number } | null>(null);
  const saved = useRoomScene(room);
  const settings = scene || saved;
  const [hour, setHour] = useState(() => new Date().getHours());
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const actualLight = roomLight('auto', hour);
  const deviceLight = roomDeviceEffects(devices ?? []).brightness;
  const light = { ...actualLight, opacity: (settings.theme ? Math.min(actualLight.opacity, 0.22) : actualLight.opacity) * (1 - deviceLight * 0.85) };
  const motion = useMotionEnabled();
  const opacity = useRef(new Animated.Value(light.opacity)).current;
  useEffect(() => {
    const refresh = () => setHour(new Date().getHours());
    const timer = setInterval(refresh, 60000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  useEffect(() => {
    const transition = Animated.timing(opacity, { toValue: light.opacity, duration: motion ? 900 : 0, useNativeDriver: true, isInteraction: false });
    transition.start(); return () => transition.stop();
  }, [light.opacity, motion, opacity]);
  const shadeId = `room-shade-${useId().replace(/:/g, '')}`;
  return (
    <View
      onLayout={event => setBounds({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
      style={[styles.image, style]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}><DollhouseRoom theme={settings.theme} wall={settings.wall} floor={settings.floor} wallPattern={settings.wallPattern}/></View>
      <FurnitureLayer hour={hour} fanOn={roomDeviceEffects(devices ?? []).fanOn} onActivity={activities && !onMove ? id => setActivityRequest({ id, nonce: Date.now() }) : undefined} interactiveCaretaker={activities && !onMove} items={settings.decorations} width={bounds.width} height={bounds.height} onMove={onMove} selected={selected} onSelect={onSelect} onDragStart={onDragStart} onDragEnd={onDragEnd} onResize={onResize} onDelete={onDelete}
        caretaker={devices ? <RoomCaretaker request={activityRequest} activities={activities} feedback={feedback} interactive={activities && !onMove} devices={devices} items={settings.decorations} width={bounds.width} height={bounds.height}/> : undefined}/>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
        <Svg width="100%" height="100%" viewBox="0 0 600 460" preserveAspectRatio="none"><Path d="M40 128L300 28L560 128V328L300 438L40 327Z" fill={light.color}/></Svg>
      </Animated.View>
      {!!devices && <RoomDeviceEffects devices={devices} width={bounds.width} height={bounds.height}/>}
      {!!children && <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs><LinearGradient id={shadeId} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={C.white} stopOpacity={0.08}/>
            <Stop offset="40%" stopColor={C.white} stopOpacity={0}/>
            <Stop offset="100%" stopColor={C.white} stopOpacity={0.38}/>
          </LinearGradient></Defs>
          <Rect width="100%" height="100%" fill={`url(#${shadeId})`}/>
        </Svg>
      </View>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  image: { overflow: "hidden", borderRadius: 28, backgroundColor: C.cream, borderWidth: 1, borderColor: C.line },
});
