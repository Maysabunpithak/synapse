import React, { useEffect, useId, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from "react-native-svg";
import { useMotionEnabled } from "./Motion";

type Props = { listening: boolean; thinking: boolean; speaking: boolean; level: number };

/** Layered glass and light, with microphone amplitude driving the listening glow. */
export default function AssistantOrb({ listening, thinking, speaking, level }: Props) {
  const motion = useMotionEnabled();
  const id = useId().replace(/:/g, "");
  const rotation = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const amplitude = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    rotation.setValue(0);
    breath.setValue(0);
    if (!motion) return;
    const spin = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: thinking ? 2400 : 14000, easing: Easing.linear, useNativeDriver: true, isInteraction: false }));
    const duration = speaking ? 480 : 2400;
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(breath, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    spin.start();
    // While listening, pulsing comes only from measured microphone levels.
    if (!listening) pulse.start();
    return () => { spin.stop(); pulse.stop(); };
  }, [motion, thinking, speaking, listening, rotation, breath]);
  useEffect(() => {
    const animation = Animated.timing(amplitude, { toValue: motion && listening ? Math.max(0, Math.min(1, level)) : 0, duration: 100, useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [level, listening, motion, amplitude]);
  const energy = listening ? amplitude : breath;
  return <View pointerEvents="none" accessible={false} style={s.orb}>
    <Svg width={52} height={52} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id={`${id}glass`} cx="36%" cy="24%" r="80%">
          <Stop offset="0" stopColor="#FFFFFF"/><Stop offset="0.5" stopColor="#FBF0DE"/><Stop offset="0.82" stopColor="#DFC4A1"/><Stop offset="1" stopColor="#A88063"/>
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="48" fill={`url(#${id}glass)`} stroke="#FFF9F0" strokeWidth="1.5"/>
    </Svg>
    <Animated.View style={[s.light, { opacity: energy.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }), transform: [
      { rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) },
      { scale: energy.interpolate({ inputRange: [0, 1], outputRange: [0.84, 1.16] }) },
    ] }]}>
      <Svg width={52} height={52} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={`${id}gold`}><Stop offset="0" stopColor="#FFE9A9" stopOpacity="0.95"/><Stop offset="1" stopColor="#DDB36E" stopOpacity="0"/></RadialGradient>
          <RadialGradient id={`${id}rose`}><Stop offset="0" stopColor="#B98774" stopOpacity="0.8"/><Stop offset="1" stopColor="#D6AE98" stopOpacity="0"/></RadialGradient>
          <RadialGradient id={`${id}pearl`}><Stop offset="0" stopColor="#FFFFFF"/><Stop offset="1" stopColor="#FFFAED" stopOpacity="0"/></RadialGradient>
        </Defs>
        <Ellipse cx="38" cy="36" rx="35" ry="29" fill={`url(#${id}gold)`}/>
        <Ellipse cx="65" cy="62" rx="32" ry="34" fill={`url(#${id}rose)`}/>
        <Path d="M16 56 C28 12 55 75 84 35 C72 82 41 29 16 56Z" fill="#FFF7D9" opacity="0.72"/>
        <Path d="M23 29 C66 17 27 77 79 69 C38 88 68 30 23 29Z" fill="#CCA58C" opacity="0.48"/>
        <Ellipse cx="49" cy="49" rx="25" ry="21" fill={`url(#${id}pearl)`}/>
      </Svg>
    </Animated.View>
    <Svg width={52} height={52} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
      <Ellipse cx="37" cy="22" rx="19" ry="8" fill="#FFFFFF" opacity="0.55" transform="rotate(-25 37 22)"/>
      <Path d="M17 63 Q23 84 46 87" fill="none" stroke="#FFFAEC" strokeOpacity="0.65" strokeWidth="1.5" strokeLinecap="round"/>
    </Svg>
  </View>;
}

const s = StyleSheet.create({
  orb: { width: 52, height: 52, borderRadius: 26, overflow: "hidden", backgroundColor: "#F7EFE5" },
  light: { width: 52, height: 52, position: "absolute" },
});
