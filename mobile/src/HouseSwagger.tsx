import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Svg, { Image } from "react-native-svg";
import { houseSwaggerFrame } from "./houseBehavior";
import { useMotionEnabled } from "./Motion";

const sheet = require("../assets/synapse-house-swagger-v1.png");
// Align the four generated poses to a common square; mirror to face left.
const cells = ["224 12 510 530", "855 12 510 530", "224 555 510 530", "855 555 510 530"];
export function HouseSwaggerFrame({ frame }: { frame: number }) {
  return <Svg width={208} height={208} viewBox={cells[frame]}>
    <Image href={sheet} width={1447} height={1087} preserveAspectRatio="none"/>
  </Svg>;
}
export default function HouseSwagger({ elapsed }: { elapsed: number }) {
  const motion = useMotionEnabled();
  const frame = houseSwaggerFrame(elapsed);
  const fades = useRef([0,1,2,3].map(i => new Animated.Value(i === frame ? 1 : 0))).current;
  useEffect(() => {
    const animation = Animated.parallel(fades.map((value, i) => Animated.timing(value, {
      toValue: i === frame ? 1 : 0, duration: motion ? 160 : 0, useNativeDriver: true, isInteraction: false,
    })));
    animation.start();
    return () => animation.stop();
  }, [frame, motion, fades]);
  return <View accessible accessibilityLabel="บ้าน Synapse ถอดแว่นขยิบตาโพสเก๊ก" style={s.frame}>
    {fades.map((opacity, i) => <Animated.View key={i} style={[StyleSheet.absoluteFill, { opacity }]}>
      <HouseSwaggerFrame frame={i}/>
    </Animated.View>)}
  </View>;
}
const s = StyleSheet.create({ frame: { width: 208, height: 208, transform: [{ scaleX: -1 }] } });
