import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useMotionEnabled } from './Motion';
import { palette as C } from './theme';

export default function HouseSleepMark({ size }: { size: number }) {
  const motion = useMotionEnabled();
  const phase = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    phase.setValue(0);
    if (!motion) return;
    const loop = Animated.loop(Animated.timing(phase, {
      toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin),
      useNativeDriver: true, isInteraction: false,
    }));
    loop.start();
    return () => loop.stop();
  }, [motion, phase]);
  return <Animated.Text pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{
    position: 'absolute', right: size * 0.08, top: size * 0.15,
    color: C.sand, fontSize: Math.max(10, size * 0.11), fontWeight: '700',
    opacity: motion ? phase.interpolate({ inputRange: [0, 0.2, 0.75, 1], outputRange: [0, 1, 1, 0] }) : 1,
    transform: [{ translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.1] }) }],
  }}>Zzz</Animated.Text>;
}
