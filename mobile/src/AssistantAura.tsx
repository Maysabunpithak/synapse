import React, { useEffect, useId, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from "react-native-svg";
import { useMotionEnabled } from "./Motion";
import type { RobotMood } from "./robotMood";

const ribbons = [
  "M55 227 C-4 165 31 49 127 34 C205 20 270 77 263 151 C261 173 249 192 232 205",
  "M65 242 C119 276 225 244 254 173 C282 102 224 40 158 43 C118 44 92 60 79 83",
];

export default function AssistantAura({ mood, level }: { mood: RobotMood; level: number }) {
  const motion = useMotionEnabled();
  const id = useId().replace(/:/g, "");
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const audio = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;
  const listening = mood === "listening";
  useEffect(() => {
    shimmer.setValue(0);
    if (!motion) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(shimmer, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(shimmer, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [motion, shimmer]);
  useEffect(() => {
    spin.setValue(0);
    pulse.setValue(0);
    if (!motion) return;
    const rotation = Animated.loop(Animated.timing(spin, { toValue: 1, duration: mood === "thinking" ? 4800 : 18000, easing: Easing.linear, useNativeDriver: true, isInteraction: false }));
    const duration = mood === "speaking" ? 600 : 2600;
    const breathing = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(pulse, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    rotation.start();
    if (!listening) breathing.start();
    return () => { rotation.stop(); breathing.stop(); };
  }, [motion, mood, listening, spin, pulse]);
  useEffect(() => {
    const animation = Animated.timing(audio, { toValue: motion && listening ? Math.max(0, Math.min(1, level)) : 0, duration: 100, useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [motion, listening, level, audio]);
  const energy = listening ? audio : pulse;
  return <View pointerEvents="none" accessible={false} style={s.frame}>
    <Svg width="100%" height="100%" viewBox="0 0 300 300" style={s.layer}>
      <Defs>
        <RadialGradient id={`${id}mist`}><Stop offset="0" stopColor="#FFF4E8" stopOpacity="0"/><Stop offset="0.6" stopColor="#E8AD79" stopOpacity="0.2"/><Stop offset="0.82" stopColor="#FFD5AD" stopOpacity="0.14"/><Stop offset="1" stopColor="#FFFFFF" stopOpacity="0"/></RadialGradient>
        <RadialGradient id={`${id}floor`}><Stop offset="0" stopColor="#FFFCF6"/><Stop offset="0.55" stopColor="#EAB17E" stopOpacity="0.42"/><Stop offset="1" stopColor="#F6D8BC" stopOpacity="0"/></RadialGradient>
        <LinearGradient id={`${id}rim`}><Stop offset="0" stopColor="#E8B78B" stopOpacity="0"/><Stop offset="0.3" stopColor="#C47B32"/><Stop offset="0.7" stopColor="#B66C2D"/><Stop offset="1" stopColor="#F0C393" stopOpacity="0"/></LinearGradient>
      </Defs>
      <Circle cx="150" cy="142" r="145" fill={`url(#${id}mist)`}/>
      <Ellipse cx="150" cy="249" rx="107" ry="29" fill={`url(#${id}floor)`}/>
      <Ellipse cx="150" cy="247" rx="84" ry="15" fill="none" stroke={`url(#${id}rim)`} strokeWidth="1.6" opacity="0.9"/>
      <Path d="M51 248 C74 281 230 281 249 246" fill="none" stroke={`url(#${id}rim)`} strokeWidth="1" opacity="0.75"/>
    </Svg>
    {[0, 1].map(layer => <Animated.View key={layer} style={[s.layer, {
      opacity: energy.interpolate({ inputRange: [0, 1], outputRange: [layer ? 0.72 : 0.92, 1] }),
      transform: [
        { rotate: spin.interpolate({ inputRange: [0, 0.5, 1], outputRange: mood === "thinking" ? ["0deg", "180deg", "360deg"] : layer ? ["-9deg", "9deg", "-9deg"] : ["5deg", "-7deg", "5deg"] }) },
        { scale: energy.interpolate({ inputRange: [0, 1], outputRange: [0.97, listening ? 1.07 : 1.025] }) },
      ],
    }]}>
      <Svg width="100%" height="100%" viewBox="0 0 300 300">
        <Defs><LinearGradient id={`${id}wave${layer}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0" stopColor="#FAD7AD" stopOpacity="0"/><Stop offset="0.2" stopColor="#F2AD5F"/><Stop offset="0.38" stopColor="#CC792E"/><Stop offset="0.46" stopColor="#FFE2B5"/><Stop offset="0.52" stopColor="#FFFFFF"/><Stop offset="0.58" stopColor="#E89842"/><Stop offset="0.72" stopColor="#E9A35A"/><Stop offset="0.9" stopColor="#FFE0AD"/><Stop offset="1" stopColor="#FFF0DD" stopOpacity="0"/>
        </LinearGradient></Defs>
        {[32, 19, 8, 4].map((width, i) => <Path key={width} d={ribbons[layer]} fill="none" stroke={`url(#${id}wave${layer})`} strokeWidth={width} opacity={[0.09, 0.2, 0.42, 1][i]} strokeLinecap="round"/>)}
        <Path d={ribbons[layer]} fill="none" stroke="#FFFEF5" strokeWidth="1.4" opacity="0.95"/>
        <G fill={layer ? "#B66C2D" : "#D5873A"}>
          <Circle cx="52" cy="99" r="2"/><Circle cx="251" cy="211" r="1.6"/><Circle cx="210" cy="47" r="1.4"/>
          <Circle cx="76" cy="42" r="1"/><Circle cx="268" cy="123" r="1"/>
        </G>
        <Path d={layer ? "M240 70 L242 76 L248 78 L242 80 L240 86 L238 80 L232 78 L238 76Z" : "M47 181 L49 186 L54 188 L49 190 L47 195 L45 190 L40 188 L45 186Z"} fill="#E7A453" opacity="0.8"/>
      </Svg>
    </Animated.View>)}
    {[0, 1].map(layer => <Animated.View key={`glint-${layer}`} style={[s.layer, {
      opacity: shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: layer ? [0.95, 0.45, 0.2] : [0.25, 0.65, 1] }),
      transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: layer ? ["165deg", "525deg"] : ["0deg", "360deg"] }) }],
    }]}>
      <Svg width="100%" height="100%" viewBox="0 0 300 300">
        <Defs>
          <RadialGradient id={`${id}glint${layer}`}><Stop offset="0" stopColor="#FFFDF3"/><Stop offset="0.18" stopColor="#FFF1CE" stopOpacity="0.95"/><Stop offset="0.45" stopColor="#FFC16F" stopOpacity="0.45"/><Stop offset="1" stopColor="#F8BC70" stopOpacity="0"/></RadialGradient>
          <LinearGradient id={`${id}trail${layer}`}><Stop offset="0" stopColor="#FFE1AD" stopOpacity="0"/><Stop offset="0.7" stopColor="#FFF1D4"/><Stop offset="1" stopColor="#FFFFFF"/></LinearGradient>
        </Defs>
        <Path d="M59 78 Q84 43 124 35" fill="none" stroke={`url(#${id}trail${layer})`} strokeWidth="5" opacity="0.6" strokeLinecap="round"/>
        <Path d="M68 67 Q91 43 124 35" fill="none" stroke={`url(#${id}trail${layer})`} strokeWidth="1.5" strokeLinecap="round"/>
        <Circle cx="124" cy="35" r="25" fill={`url(#${id}glint${layer})`}/>
        <Path d="M124 23 Q126 33 136 35 Q126 37 124 47 Q122 37 112 35 Q122 33 124 23Z" fill="#FFFDF4"/>
        <Circle cx="124" cy="35" r="2.5" fill="#FFFFFF"/>
        <Circle cx="51" cy="186" r="16" fill={`url(#${id}glint${layer})`} opacity="0.75"/>
        <Path d="M51 179 L52.5 184.5 L58 186 L52.5 187.5 L51 193 L49.5 187.5 L44 186 L49.5 184.5Z" fill="#FFF8E7"/>
      </Svg>
    </Animated.View>)}
  </View>;
}

const s = StyleSheet.create({
  frame: { position: "absolute", width: "100%", maxWidth: 310, aspectRatio: 1 },
  layer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
});
