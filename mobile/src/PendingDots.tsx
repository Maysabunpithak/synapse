import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMotionEnabled } from './Motion';
import { palette as C } from './theme';
export default function PendingDots() {
  const motion = useMotionEnabled();
  const phase = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!motion) return;
    const loop = Animated.loop(Animated.timing(phase, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true, isInteraction: false }));
    loop.start(); return () => loop.stop();
  }, [motion, phase]);
  return <View accessibilityRole="progressbar" accessibilityLabel="กำลังส่งคำสั่ง" style={{ flexDirection: 'row', gap: 3, padding: 4, borderRadius: 10, backgroundColor: C.cream }}>
    {[0, 1, 2].map(i => <Animated.View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.primary, opacity: motion ? phase.interpolate({ inputRange: [0, (i + 1) / 4, 1], outputRange: [0.3, 1, 0.3] }) : 1 }}/>) }
  </View>;
}
