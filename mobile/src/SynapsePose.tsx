import { useLayoutEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import type { HouseActivity } from "./houseBehavior";
import type { RobotMood } from "./robotMood";
import { houseExpression } from "./houseExpression";
import { useMotionEnabled } from "./Motion";
import HouseSleepMark from './HouseSleepMark';

const poses = require("../assets/synapse-house-emotions-v1.png");
// Arms cross the nominal 418px grid. Give each pose its actual atlas bounds,
// then fit every pose at the same scale so hands stay intact without size jumps.
const poseBounds = [
  [0, 0, 448], [448, 0, 388], [836, 0, 418],
  [0, 418, 448], [448, 418, 388], [836, 418, 418],
  [0, 836, 448], [448, 836, 394], [842, 836, 412],
] as const;
export default function SynapsePose({ activity, mood = "idle", width = 208, height = 208, transitionMs = 240 }: { activity: HouseActivity; mood?: RobotMood; width?: number; height?: number; transitionMs?: number }) {
  const frame = houseExpression(activity, mood);
  const motion = useMotionEnabled();
  const shown = useRef(frame);
  const [previous, setPrevious] = useState(frame);
  const [displayed, setDisplayed] = useState(frame);
  const fade = useRef(new Animated.Value(1)).current;
  const size = Math.min(width, height);
  useLayoutEffect(() => {
    if (shown.current === frame) return;
    setPrevious(shown.current);
    shown.current = frame;
    setDisplayed(frame);
    fade.setValue(motion ? 0 : 1);
    const transition = Animated.timing(fade, { toValue: 1, duration: motion ? transitionMs : 0, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false });
    transition.start();
    return () => transition.stop();
  }, [frame, motion, fade, transitionMs]);
  return <View accessible accessibilityLabel="บ้าน Synapse" style={{ width, height, alignItems: "center", justifyContent: "center" }}>
    <View style={{ width: size, height: size, overflow: "hidden" }}>
      {[previous, displayed].map((cell, layer) => {
        const [x, y, cropWidth] = poseBounds[cell];
        const scale = size / 448;
        return <Animated.View key={layer} style={[StyleSheet.absoluteFill, { opacity: layer ? fade : fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
          <View style={{ position: "absolute", left: (size - cropWidth * scale) / 2, top: (size - 418 * scale) / 2, width: cropWidth * scale, height: 418 * scale, overflow: "hidden" }}>
            <Image source={poses} fadeDuration={0} resizeMode="stretch" style={[s.sheet, {
              width: 1254 * scale, height: 1254 * scale, left: -x * scale, top: -y * scale,
            }]}/>
          </View>
        </Animated.View>;
      })}
    </View>
    {activity === 'sleep' && <HouseSleepMark size={size}/>}
  </View>;
}
const s = StyleSheet.create({ sheet: { position: "absolute" } });
