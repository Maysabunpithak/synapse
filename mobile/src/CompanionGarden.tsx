import React, { useEffect, useId, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { useMotionEnabled } from "./Motion";
import type { RobotMood } from "./robotMood";

const lights = [
  [14, 34, 6], [23, 59, 8], [79, 39, 5], [87, 66, 7],
  [34, 19, 5], [67, 25, 8], [17, 76, 5], [73, 79, 6],
];

function Firefly({ x, y, size, index, sleeping, mood, level }: { x: number; y: number; size: number; index: number; sleeping: boolean; mood: RobotMood; level: number }) {
  const motion = useMotionEnabled();
  const drift = useRef(new Animated.Value(0)).current;
  const brightness = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    drift.setValue(0);
    if (!motion) return;
    const duration = (sleeping ? 5500 : mood === "success" ? 1900 : 3200) + index * 270;
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(index * 170),
      Animated.timing(drift, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(drift, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [motion, sleeping, mood, index, drift]);
  useEffect(() => {
    const animation = Animated.timing(brightness, { toValue: sleeping ? 0.12 : mood === "listening" ? 0.35 + Math.max(0, Math.min(1, level)) * 0.65 : mood === "success" ? 1 : 0.45, duration: motion ? 180 : 0, useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [sleeping, mood, level, brightness, motion]);
  return <Animated.View style={[s.firefly, { left: `${x}%`, top: `${y}%`,
    opacity: Animated.multiply(brightness, drift.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 1, 0.72] })),
    transform: [
      { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, index % 2 ? 10 : -13] }) },
      { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, mood === "success" ? -35 : -15] }) },
      { scale: brightness.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) },
    ],
  }]}>
    <View style={s.lightHalo}/><View style={[s.lightCore, { width: size / 2, height: size / 2, borderRadius: size, left: 12 - size / 4, top: 12 - size / 4 }]}/>
  </Animated.View>;
}

/** A quiet garden backdrop; all interaction belongs to the companion above it. */
export default function CompanionGarden({ sleeping, mood, level }: { sleeping: boolean; mood: RobotMood; level: number }) {
  const id = useId().replace(/:/g, "");
  return <View style={s.garden} pointerEvents="none" accessible={false}>
    <Svg width="100%" height="100%" viewBox="0 0 400 324" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#F3F0E6"/><Stop offset="0.57" stopColor="#F7F6ED"/><Stop offset="1" stopColor="#FFFFFF"/></LinearGradient>
        <RadialGradient id={`${id}sun`}><Stop offset="0" stopColor="#FFF9D9" stopOpacity="0.9"/><Stop offset="1" stopColor="#FFF9D9" stopOpacity="0"/></RadialGradient>
        <RadialGradient id={`${id}ground`}><Stop offset="0" stopColor="#CAB795" stopOpacity="0.25"/><Stop offset="1" stopColor="#E9DDC8" stopOpacity="0"/></RadialGradient>
        <LinearGradient id={`${id}fade`} x1="0" y1="0" x2="0" y2="1"><Stop offset="0.72" stopColor="#FFFFFF" stopOpacity="0"/><Stop offset="1" stopColor="#FFFFFF"/></LinearGradient>
      </Defs>
      <Rect width="400" height="324" fill={`url(#${id}sky)`}/>
      <G opacity={sleeping ? 0.25 : 0.4}>
        <Path d="M30 251 Q46 125 23 -10 M73 241 Q70 120 83 -10 M335 253 Q325 131 342 -10 M387 254 Q361 110 382 -10" fill="none" stroke="#C5CDB8" strokeWidth="9"/>
        <Ellipse cx="34" cy="58" rx="65" ry="91" fill="#D7DECA"/>
        <Ellipse cx="80" cy="16" rx="68" ry="63" fill="#D0D9C3"/>
        <Ellipse cx="368" cy="72" rx="73" ry="102" fill="#D1DCC8"/>
        <Ellipse cx="329" cy="7" rx="63" ry="55" fill="#DDE1CE"/>
      </G>
      <Circle cx="213" cy="83" r="135" fill={`url(#${id}sun)`} opacity={sleeping ? 0.38 : 0.85}/>
      <Path d="M0 274 Q83 218 174 248 Q262 219 400 263 L400 324 L0 324Z" fill="#E8EAD9" opacity="0.55"/>
      <Ellipse cx="200" cy="255" rx="131" ry="40" fill={`url(#${id}ground)`}/>
      <Ellipse cx="200" cy="256" rx="78" ry="17" fill="#E3D6BD" opacity="0.32"/>
      <G stroke="#9AA889" strokeWidth="1.5" fill="#BAC6A6" opacity="0.7">
        <Path d="M35 271 Q47 232 34 199 M51 274 Q58 241 76 220 M358 270 Q349 224 367 201" fill="none"/>
        <Path d="M39 237 Q10 231 16 213 Q39 215 39 237 M39 225 Q61 213 52 199 Q33 207 39 225 M58 249 Q79 251 84 237 Q65 232 58 249 M354 242 Q328 236 332 219 Q354 221 354 242 M356 227 Q380 223 379 207 Q361 206 356 227" stroke="none"/>
      </G>
      <G opacity="0.65">
        <Path d="M79 277 L80 266 M91 281 L91 271 M322 277 L321 266" stroke="#BEAA8E" strokeWidth="3" strokeLinecap="round"/>
        <Path d="M68 266 Q80 248 90 266Z M84 271 Q92 258 101 271Z M312 266 Q321 250 331 266Z" fill="#D9B998"/>
        <Circle cx="77" cy="261" r="1.3" fill="#FFF9E9"/><Circle cx="322" cy="261" r="1.3" fill="#FFF9E9"/>
      </G>
      <Rect width="400" height="324" fill={`url(#${id}fade)`}/>
    </Svg>
    {lights.map(([x, y, size], index) => <Firefly key={index} {...{ x, y, size, index, sleeping, mood, level }}/>) }
  </View>;
}

const s = StyleSheet.create({
  garden: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, overflow: "hidden", borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  firefly: { position: "absolute", width: 24, height: 24 },
  lightHalo: { position: "absolute", width: 24, height: 24, borderRadius: 12, backgroundColor: "#F6D78335", boxShadow: "0px 0px 10px #EDC16655" },
  lightCore: { position: "absolute", backgroundColor: "#FFE6A0", borderWidth: 0.6, borderColor: "#FFFBE5", boxShadow: "0px 0px 5px #E8BD59" },
});
