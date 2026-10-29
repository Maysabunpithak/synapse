import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useMotionEnabled } from "./Motion";
import { houseActivity, HOUSE_LAP_MS, type HouseActivity } from "./houseBehavior";
import Svg, { Path } from "react-native-svg";
import type { RobotMood } from "./robotMood";
import SynapsePose from "./SynapsePose";
import HouseWalk from "./HouseWalk";

export default function RobotDance({ mood, active, touching, welcome = false, forcedActivity, onActivityChange }: { mood: RobotMood; active: boolean; touching: boolean; welcome?: boolean; forcedActivity?: HouseActivity; onActivityChange?: (activity: HouseActivity) => void }) {
  const motion = useMotionEnabled();
  const [elapsed, setElapsed] = useState(0);
  const position = useRef(new Animated.Value(0)).current;
  const depth = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(1)).current;
  const delight = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    setElapsed(0);
    if (!motion || active || touching || mood !== "idle" || forcedActivity) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - started), 120);
    return () => clearInterval(timer);
  }, [motion, active, touching, mood, forcedActivity]);
  const welcomeTime = elapsed % 13000;
  const activity = forcedActivity ?? (welcome && motion ? welcomeTime < HOUSE_LAP_MS ? welcomeTime < HOUSE_LAP_MS / 4 || welcomeTime >= HOUSE_LAP_MS * 3 / 4 ? 'walk-left' : 'walk-right' : welcomeTime < 11200 ? 'dance' : 'awake' : houseActivity(mood, active, touching, elapsed, motion));
  const walking = activity === "walk-left" || activity === "walk-right";
  useEffect(() => { onActivityChange?.(activity); }, [activity, onActivityChange]);
  const celebrating = activity === "dance";
  useEffect(() => {
    if (!motion) { position.setValue(0); depth.setValue(0); return; }
    const axis = (value: Animated.Value, toValue: number, easing: (t: number) => number, duration = HOUSE_LAP_MS / 4) =>
      Animated.timing(value, { toValue, duration, easing, useNativeDriver: true, isInteraction: false });
    // Quarter-circle sine/cosine easing gives continuous velocity at the joins.
    // One full lap finishes at the same spot used for sitting and sleeping.
    const easeIn = Easing.in(Easing.sin), easeOut = Easing.out(Easing.sin);
    const move = walking ? Animated.sequence([
      Animated.parallel([axis(position, -28, easeOut), axis(depth, -18, easeIn)]),
      Animated.parallel([axis(position, 0, easeIn), axis(depth, -36, easeOut)]),
      Animated.parallel([axis(position, 28, easeOut), axis(depth, -18, easeIn)]),
      Animated.parallel([axis(position, 0, easeIn), axis(depth, 0, easeOut)]),
    ]) : Animated.parallel([
      axis(position, 0, Easing.inOut(Easing.sin), 650),
      axis(depth, 0, Easing.inOut(Easing.sin), 650),
    ]);
    move.start();
    return () => move.stop();
  }, [walking, motion, position, depth]);
  useEffect(() => {
    if (!motion) { breath.setValue(0); return; }
    const duration = celebrating ? 550 : 2200;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(breath, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [motion, breath, celebrating]);
  useEffect(() => {
    const transition = Animated.parallel([
      Animated.timing(lift, { toValue: walking ? 0 : celebrating ? 8 : 1,
        duration: motion ? 500 : 0, useNativeDriver: true, isInteraction: false }),
      Animated.timing(delight, { toValue: motion && celebrating ? 1 : 0,
        duration: motion ? 400 : 0, useNativeDriver: true, isInteraction: false }),
    ]);
    transition.start();
    return () => transition.stop();
  }, [activity, walking, motion, lift, delight, celebrating]);
  return <View testID={`house-behavior-${activity}`} accessibilityLabel={`บ้าน Synapse · ${activity === "sleep" ? "กำลังหลับ" : walking ? "กำลังเดินเล่น" : activity === "rest" ? "นั่งพัก" : activity === "dance" ? "ดีใจที่ทำคำสั่งสำเร็จ" : "พร้อมฟังคำสั่ง"}`} style={s.viewport}>
    <Animated.View style={{ transform: [
      { translateX: position },
      { translateY: Animated.add(depth, Animated.multiply(breath, Animated.multiply(lift, -1))) },
      { scale: depth.interpolate({ inputRange: [-36, 0], outputRange: [0.88, 1], extrapolate: "clamp" }) },
      { rotate: Animated.multiply(delight, breath.interpolate({ inputRange: [0, 1], outputRange: [-1, 1] })).interpolate({ inputRange: [-1, 1], outputRange: ["-5deg", "5deg"] }) },
    ] }}>
      <View style={s.frame}>
        {walking ? <HouseWalk facingLeft={activity === "walk-left"}/> : <SynapsePose activity={activity} mood={mood}/>}
        {activity === "sleep" && <View pointerEvents="none" accessible={false} style={s.drool}>
          <Svg width={18} height={26} viewBox="0 0 18 26">
            <Path d="M 2 1 Q 7 4 5 10 Q 3 16 8 18" fill="none" stroke="#A8DCE7" strokeWidth={2.3} strokeLinecap="round"/>
          </Svg>
          <Animated.View style={[s.drop, { opacity: breath.interpolate({ inputRange: [0, 0.75, 1], outputRange: [0.85, 0.85, 0] }), transform: [{ translateY: breath.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) }] }]}>
            <Svg width={8} height={11} viewBox="0 0 8 11"><Path d="M 4 0 C 3 3 0 5 0 7 A 4 4 0 0 0 8 7 C 8 5 5 3 4 0 Z" fill="#A8DCE7"/></Svg>
          </Animated.View>
        </View>}
      </View>
    </Animated.View>
  </View>;
}
const s = StyleSheet.create({
  viewport: { width: 268, height: 268, overflow: "hidden", borderRadius: 36, alignItems: "center", justifyContent: "center" },
  frame: { width: 208, height: 208, overflow: "hidden" },
  image: { position: "absolute", width: 268, height: 268 },
  drool: { position: "absolute", left: 138, top: 137, width: 18, height: 38 },
  drop: { position: "absolute", left: 5, top: 16 },
});
