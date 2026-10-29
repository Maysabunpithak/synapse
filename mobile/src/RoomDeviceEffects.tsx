import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useMotionEnabled } from './Motion';
import { palette as C } from './theme';
import { roomDeviceEffects, type RoomDeviceState } from './roomDeviceState';

export default function RoomDeviceEffects({ devices, width, height }: { devices: readonly RoomDeviceState[]; width: number; height: number }) {
  const state = roomDeviceEffects(devices);
  const motion = useMotionEnabled();
  const glow = useRef(new Animated.Value(state.brightness)).current;
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const fade = Animated.timing(glow, { toValue: state.brightness, duration: motion ? 650 : 0, useNativeDriver: true, isInteraction: false });
    fade.start(); return () => fade.stop();
  }, [state.brightness, motion, glow]);
  useEffect(() => {
    if (!motion || !state.fanOn) return;
    spin.setValue(0);
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true, isInteraction: false }));
    loop.start(); return () => loop.stop();
  }, [state.fanOn, motion, spin]);
  const size = Math.min(48, width * 0.12);
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: glow }]}>
      <Svg width="100%" height="100%" viewBox="0 0 600 460" preserveAspectRatio="none"><Path d="M40 128L300 28L560 128V319L300 429L40 319Z" fill={C.lightGlow} opacity={0.18}/><Path d="M300 70L170 360L430 360Z" fill={C.cream} opacity={0.12}/></Svg>
    </Animated.View>
    {state.hasFan && <View style={{ position: 'absolute', left: width * 0.79 - size / 2, top: height * 0.31, width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 60 60"><Circle cx="30" cy="30" r="27" fill={C.cream} stroke={C.sand} strokeWidth="2"/></Svg>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
        <Svg width={size} height={size} viewBox="0 0 60 60">{[0, 120, 240].map(angle => <G key={angle} rotation={angle} origin="30,30"><Path d="M30 29C14 24 19 7 30 9C43 10 36 21 30 29Z" fill={state.fanOn ? C.sand : C.fanOff}/></G>)}<Circle cx="30" cy="30" r="5" fill={C.brown}/></Svg>
      </Animated.View>
    </View>}
  </View>;
}
