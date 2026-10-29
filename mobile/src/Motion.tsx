import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, AppState, Easing, Pressable as NativePressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

const MotionContext = createContext(false);

export function useMotionEnabled() { return useContext(MotionContext); }

export function RobotMotion({ mood, children }: { mood: "idle" | "listening" | "thinking" | "speaking" | "success" | "error"; children: ReactNode }) {
  const enabled = useContext(MotionContext);
  const phase = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const settings = {
    idle: [1400, 18, 5], listening: [1000, 10, 7], thinking: [1100, 12, 6],
    speaking: [380, 9, 4], success: [420, 24, 10], error: [850, 4, 5],
  }[mood];
  const [duration, bob, tilt] = settings;
  useEffect(() => {
    phase.setValue(0);
    sway.setValue(0);
    if (!enabled) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(phase, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(phase, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start();
    // Independent sway avoids moving every axis together like a sliding picture.
    const rocking = Animated.loop(Animated.sequence([
      Animated.timing(sway, { toValue: 1, duration: duration * 0.7, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(sway, { toValue: -1, duration: duration * 1.4, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(sway, { toValue: 0, duration: duration * 0.7, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    rocking.start();
    return () => { loop.stop(); rocking.stop(); };
  }, [enabled, mood, duration, phase, sway]);
  return <Animated.View testID={`robot-motion-${mood}`} style={{ transform: [
    { translateX: sway.interpolate({ inputRange: [-1, 1], outputRange: mood === "error" ? [-9, 9] : [-7, 7] }) },
    { translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [0, -bob] }) },
    { rotate: sway.interpolate({ inputRange: [-1, 1], outputRange: [`${-tilt}deg`, `${tilt}deg`] }) },
    { scale: phase.interpolate({ inputRange: [0, 1], outputRange: [1, mood === "success" ? 1.06 : mood === "speaking" ? 1.035 : 1.015] }) },
  ] }}>{children}</Animated.View>;
}

export function RobotOrbitMotion({ busy, children }: { busy: boolean; children: ReactNode }) {
  const enabled = useContext(MotionContext);
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    rotation.setValue(0);
    if (!enabled) return;
    const loop = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: busy ? 7000 : 22000, easing: Easing.linear, useNativeDriver: true, isInteraction: false }));
    loop.start(); return () => loop.stop();
  }, [busy, enabled, rotation]);
  return <Animated.View pointerEvents="none" style={{ position: "absolute", width: 294, height: 294, transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }}>{children}</Animated.View>;
}

/** A decorative scan only while a voice session is active; respects reduced motion. */
export function ScannerMotion({ active }: { active: boolean }) {
  const motion = useContext(MotionContext);
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    progress.setValue(0);
    if (!active || !motion) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(progress, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, motion, progress]);
  if (!active || !motion) return null;
  return <Animated.View pointerEvents="none" style={{ position: "absolute", top: 38, width: "74%", height: 2, backgroundColor: "#FFBD76", opacity: 0.45, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 205] }) }] }} />;
}

export function MascotMotion({ children }: { children: ReactNode }) {
  const motion = useContext(MotionContext);
  const float = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    float.setValue(0);
    sway.setValue(0);
    if (!motion) return;
    const timing = (value: Animated.Value, toValue: number, duration: number) =>
      Animated.timing(value, { toValue, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false });
    const floating = Animated.loop(Animated.sequence([
      timing(float, 1, 2200), timing(float, 0, 2200),
    ]));
    const swaying = Animated.loop(Animated.sequence([
      timing(sway, 1, 1400), timing(sway, -1, 2800), timing(sway, 0, 1400),
    ]));
    floating.start();
    swaying.start();
    return () => { floating.stop(); swaying.stop(); };
  }, [motion, float, sway]);
  return <Animated.View style={{ alignSelf: "center", transform: [
    { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
    { rotate: sway.interpolate({ inputRange: [-1, 1], outputRange: ["-1.5deg", "1.5deg"] }) },
  ] }}>{children}</Animated.View>;
}

export function MotionProvider({ children, active = true }: { children: ReactNode; active?: boolean }) {
  const [reduced, setReduced] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => {});
    const preference = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    const lifecycle = AppState.addEventListener("change", value => setForeground(value === "active"));
    return () => { mounted = false; preference.remove(); lifecycle.remove(); };
  }, []);
  return <MotionContext.Provider value={active && !reduced && foreground}>{children}</MotionContext.Provider>;
}

export function MotionPressable({ style, disabled, ...props }: PressableProps) {
  const motion = useContext(MotionContext);
  return <NativePressable {...props} disabled={disabled} style={state => [
    typeof style === "function" ? style(state) : style,
    state.pressed && !disabled && { opacity: 0.78, ...(motion ? { transform: [{ scale: 0.97 }] } : {}) },
  ]} />;
}

export function ScreenEntrance({ screen, children }: { screen: string; children: ReactNode }) {
  const motion = useContext(MotionContext);
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!motion) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [screen, motion, progress]);
  return <Animated.View style={{ opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>{children}</Animated.View>;
}

export function DeviceSurface({ on, activeColor, inactiveColor, style, children }: {
  on: boolean; activeColor: string; inactiveColor: string; style?: StyleProp<ViewStyle>; children: ReactNode;
}) {
  const motion = useContext(MotionContext);
  const progress = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, { toValue: on ? 1 : 0, duration: motion ? 280 : 0, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [on, motion, progress]);
  return <Animated.View style={[style, { backgroundColor: progress.interpolate({ inputRange: [0, 1], outputRange: [inactiveColor, activeColor] }) }]}>{children}</Animated.View>;
}

export function FanMotion({ running, children }: { running: boolean; children: ReactNode }) {
  const motion = useContext(MotionContext);
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!running || !motion) { rotation.setValue(0); return; }
    const animation = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 3600, easing: Easing.linear, useNativeDriver: true, isInteraction: false }));
    animation.start();
    return () => animation.stop();
  }, [running, motion, rotation]);
  return <Animated.View style={{ alignSelf: "center", transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }}>{children}</Animated.View>;
}
