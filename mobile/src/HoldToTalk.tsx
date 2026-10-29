import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, StyleSheet, View } from "react-native";

type Props = {
  active: boolean;
  disabled: boolean;
  onStart: () => void;
  onEnd: () => void;
  onCancel: () => void;
  onTouchStateChange?: (touching: boolean) => void;
  children: ReactNode;
};

export default function HoldToTalk(props: Props) {
  const latest = useRef(props);
  latest.current = props;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holding = useRef(false);
  const origin = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const [pressed, setPressed] = useState(false);
  function clearTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }
  function cancel() {
    clearTimer();
    const wasHolding = holding.current;
    holding.current = false;
    setPressed(false);
    latest.current.onTouchStateChange?.(false);
    if (wasHolding) latest.current.onCancel();
  }
  function release() {
    clearTimer();
    const wasHolding = holding.current;
    holding.current = false;
    setPressed(false);
    latest.current.onTouchStateChange?.(false);
    if (wasHolding) latest.current.onEnd();
  }
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      if (state === "inactive" || state === "background") cancel();
    });
    return () => {
      subscription.remove();
      clearTimer();
      if (holding.current) latest.current.onCancel();
    };
  }, []);
  useEffect(() => {
    // Processing can begin at the capture time limit while the finger is still down.
    // Clear the gesture without aborting that already-submitted command.
    if (props.disabled) { clearTimer(); holding.current = false; setPressed(false); latest.current.onTouchStateChange?.(false); }
  }, [props.disabled]);
  return <View accessible accessibilityRole="button" testID="house-hold-to-talk"
    accessibilityLabel="แตะค้างที่บ้าน Synapse เพื่อพูดคำสั่ง"
    accessibilityHint="กดค้างแล้วพูด ปล่อยนิ้วเพื่อส่ง เลื่อนออกจากตัวบ้านเพื่อยกเลิก"
    accessibilityState={{ disabled: props.disabled, busy: props.active }}
    accessibilityActions={[{ name: "activate", label: props.active ? "ส่งคำสั่งเสียง" : "เริ่มพูดคำสั่ง" }, { name: "cancel", label: "ยกเลิกคำสั่งเสียง" }]}
    onAccessibilityAction={event => {
      if (event.nativeEvent.actionName === "cancel") { latest.current.onCancel(); return; }
      if (event.nativeEvent.actionName === "activate" && !props.disabled) {
        if (props.active) latest.current.onEnd(); else latest.current.onStart();
      }
    }}
    onStartShouldSetResponder={() => !latest.current.disabled}
    onResponderGrant={event => {
      cancel();
      if (latest.current.disabled || event.nativeEvent.touches.length > 1) return;
      const { pageX, pageY, locationX, locationY } = event.nativeEvent;
      origin.current = { x: pageX, y: pageY, left: pageX - locationX, top: pageY - locationY };
      setPressed(true);
      latest.current.onTouchStateChange?.(true);
      timer.current = setTimeout(() => {
        timer.current = null;
        if (latest.current.disabled) return;
        holding.current = true;
        latest.current.onStart();
      }, 350);
    }}
    onResponderMove={event => {
      const { pageX, pageY, touches } = event.nativeEvent;
      const o = origin.current;
      const outside = pageX < o.left || pageX > o.left + 268 || pageY < o.top || pageY > o.top + 268;
      if (touches.length > 1 || outside || (!holding.current && Math.hypot(pageX - o.x, pageY - o.y) > 18)) cancel();
    }}
    onResponderRelease={release}
    onResponderTerminate={cancel}
    onResponderTerminationRequest={() => !holding.current}
    style={[s.surface, pressed && { opacity: 0.88 }]}>
    <View pointerEvents="none">{props.children}</View>
  </View>;
}

const s = StyleSheet.create({ surface: { width: 268, height: 268, alignItems: "center", justifyContent: "center" } });
