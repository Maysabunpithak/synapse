import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useMotionEnabled } from './Motion';
import { palette as C } from './theme';
export default function HouseReactionHand({ size, success }: { size: number; success: boolean }) {
  const motion = useMotionEnabled();
  const wave = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!motion || success) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(wave, { toValue: 1, duration: 230, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(wave, { toValue: 0, duration: 230, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start(); return () => loop.stop();
  }, [motion, success, wave]);
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', right: -size * 0.04, top: size * 0.2, width: size * 0.4, height: size * 0.4, transform: [{ rotate: wave.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '14deg'] }) }] }}>
    <Svg width="100%" height="100%" viewBox="0 0 40 40"><Path d={success ? 'M9 20H16L22 9Q23 3 27 7L27 18H34Q38 18 36 24L33 34H16L9 31Z M5 19H12V34H5Z' : 'M12 34L5 24Q2 19 6 18L12 24L9 10Q9 5 13 7L17 20L15 5Q16 1 19 4L22 19L23 5Q25 1 27 5L27 21L30 10Q32 6 34 10L32 28Q29 38 19 37Z'} fill={C.cream} stroke={C.sand} strokeWidth="1.6" strokeLinejoin="round"/></Svg>
  </Animated.View>;
}
