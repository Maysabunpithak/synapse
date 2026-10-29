import { useEffect, useId, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { palette } from "./theme";

/** A luminous voice button surface. Motion reflects state, not audio volume. */
export default function VoiceOrb({ listening, busy }: { listening: boolean; busy: boolean }) {
  const id = useId().replace(/:/g, "");
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReduceMotion(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    progress.setValue(0);
    if (reduceMotion || (!listening && !busy)) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: busy ? 1100 : 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(progress, { toValue: 0, duration: busy ? 1100 : 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [busy, listening, progress, reduceMotion]);

  return (
    <View pointerEvents="none" accessible={false} style={styles.surface}>
      <Animated.View style={[styles.aura, {
        opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0.6] }),
        transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] }) }],
      }]} />
      <Animated.View style={{ transform: [
        { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] }) },
        { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ["-12deg", busy ? "160deg" : "18deg"] }) },
      ] }}>
        <Svg width={57} height={57} viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id={`${id}base`} cx="38%" cy="25%" r="80%">
              <Stop offset="0" stopColor={palette.cream} />
              <Stop offset="0.6" stopColor={palette.cream} />
              <Stop offset="1" stopColor={palette.orange} />
            </RadialGradient>
            {[["peach", palette.orange], ["amber", palette.orange], ["gold", palette.yellow], ["cream", palette.cream]].map(([name, color]) => (
              <RadialGradient key={name} id={`${id}${name}`}>
                <Stop offset="0" stopColor={color} stopOpacity="1" />
                <Stop offset="0.45" stopColor={color} stopOpacity="0.8" />
                <Stop offset="1" stopColor={color} stopOpacity="0" />
              </RadialGradient>
            ))}
          </Defs>
          <Circle cx="50" cy="50" r="47" fill={`url(#${id}base)`} stroke={palette.orange} strokeWidth="1" />
          <Ellipse cx="32" cy="56" rx="28" ry="36" fill={`url(#${id}peach)`} transform="rotate(-30 32 56)" />
          <Ellipse cx="66" cy="42" rx="28" ry="33" fill={`url(#${id}amber)`} transform="rotate(-35 66 42)" />
          <Ellipse cx="57" cy="70" rx="32" ry="22" fill={`url(#${id}gold)`} />
          <Ellipse cx="49" cy="52" rx="24" ry="11" fill={`url(#${id}cream)`} transform="rotate(-30 49 52)" />
          <Ellipse cx="36" cy="22" rx="15" ry="5" fill={palette.white} opacity="0.65" transform="rotate(-25 36 22)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { width: 57, height: 57, alignItems: "center", justifyContent: "center" },
  aura: { position: "absolute", width: 57, height: 57, borderRadius: 29, backgroundColor: palette.orange, shadowColor: palette.orange, shadowOpacity: 0.55, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
});
