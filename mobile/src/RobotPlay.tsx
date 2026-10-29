import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, StyleSheet, Text, View, type GestureResponderEvent } from "react-native";
import { useMotionEnabled } from "./Motion";
import type { RobotMood } from "./robotMood";

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

/** Capture gestures only on the character; the rest of the screen can still scroll. */
export default function RobotPlay({ enabled, children }: {
  enabled: boolean; children: (reaction: RobotMood | null) => ReactNode;
}) {
  const motion = useMotionEnabled();
  const [reaction, setReaction] = useState<RobotMood | null>(null);
  const [message, setMessage] = useState("");
  const position = useRef(new Animated.ValueXY()).current;
  const bounce = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gesture = useRef({ active: false, x: 0, y: 0, lastX: 0, lastY: 0, travel: 0 });

  function clearTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }
  function reset() {
    clearTimer();
    gesture.current.active = false;
    position.stopAnimation(); bounce.stopAnimation();
    position.setValue({ x: 0, y: 0 }); bounce.setValue(0);
    setReaction(null); setMessage("");
  }
  useEffect(() => {
    // Also cancel feedback when a voice session starts or motion is suspended.
    reset();
    return () => { clearTimer(); position.stopAnimation(); bounce.stopAnimation(); };
  }, [enabled, motion, position, bounce]);

  function follow(x: number, y: number) {
    if (!motion) return;
    position.setValue({ x: clamp((x - 134) * 0.25, 28), y: clamp((y - 134) * 0.18, 20) });
  }
  function start(event: GestureResponderEvent) {
    if (!enabled) return;
    clearTimer(); position.stopAnimation(); bounce.stopAnimation(); bounce.setValue(0);
    const { pageX, pageY, locationX, locationY } = event.nativeEvent;
    gesture.current = { active: true, x: pageX - locationX, y: pageY - locationY,
      lastX: pageX, lastY: pageY, travel: 0 };
    setReaction("listening"); setMessage("เล่นด้วยกันนะ");
    follow(locationX, locationY);
  }
  function move(event: GestureResponderEvent) {
    const g = gesture.current;
    if (!enabled || !g.active || event.nativeEvent.touches.length > 1) return;
    const { pageX, pageY } = event.nativeEvent;
    g.travel += Math.hypot(pageX - g.lastX, pageY - g.lastY);
    g.lastX = pageX; g.lastY = pageY;
    follow(pageX - g.x, pageY - g.y);
    if (g.travel > 85) { setReaction("success"); setMessage("♥ ชอบให้ลูบจังเลย ♥"); }
  }
  function finish() {
    if (!enabled || !gesture.current.active) return;
    const petted = gesture.current.travel > 85;
    gesture.current.active = false;
    delight(petted);
  }
  function delight(petted = false) {
    if (!enabled) return;
    clearTimer();
    setReaction("success"); setMessage(petted ? "♥ ลูบอีกได้ไหม ♥" : "✦ จ๊ะเอ๋! ✦");
    if (motion) {
      position.stopAnimation(); bounce.stopAnimation(); bounce.setValue(0);
      Animated.spring(position, { toValue: { x: 0, y: 0 }, friction: 5, tension: 70,
        useNativeDriver: false, isInteraction: false }).start();
      Animated.sequence([
        Animated.timing(bounce, { toValue: 1, duration: 150, useNativeDriver: false, isInteraction: false }),
        Animated.spring(bounce, { toValue: 0, friction: 4, tension: 100, useNativeDriver: false, isInteraction: false }),
      ]).start();
    }
    timer.current = setTimeout(() => { setReaction(null); setMessage(""); timer.current = null; }, 1600);
  }
  return <View style={s.touchArea} accessible accessibilityRole={enabled ? "button" : "image"}
    accessibilityLabel="บ้าน Synapse" accessibilityHint={enabled ? "แตะเพื่อเล่น หรือลากนิ้วบนตัวบ้านเพื่อลูบ" : undefined}
    accessibilityActions={enabled ? [{ name: "activate", label: "เล่นกับบ้าน Synapse" }] : []}
    onAccessibilityAction={event => { if (event.nativeEvent.actionName === "activate") delight(); }}
    onStartShouldSetResponder={() => enabled}
    onResponderGrant={start} onResponderMove={move} onResponderRelease={finish}
    onResponderTerminate={reset} onResponderTerminationRequest={() => !gesture.current.active}>
    <Animated.View pointerEvents="none" style={{ transform: [
      { translateX: position.x }, { translateY: Animated.add(position.y, bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -20] })) },
      { rotate: position.x.interpolate({ inputRange: [-28, 28], outputRange: ["-9deg", "9deg"] }) },
      { scale: bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
    ] }}>{children(enabled ? reaction : null)}</Animated.View>
    {!!message && enabled && <View pointerEvents="none" style={s.bubble}><Text style={s.message}>{message}</Text></View>}
  </View>;
}

const s = StyleSheet.create({
  touchArea: { width: 268, height: 268, alignItems: "center", justifyContent: "center" },
  bubble: { position: "absolute", bottom: 0, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: "#FFF1DD" },
  message: { color: "#714B30", fontSize: 12, fontWeight: "600" },
});
