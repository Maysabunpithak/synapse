import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { useMotionEnabled } from './Motion';
import { palette as C } from './theme';
export default function WindowAtmosphere({ hour, fanOn, slope }: { hour: number; fanOn: boolean; slope: number }) {
  const motion = useMotionEnabled();
  const phase = useRef(new Animated.Value(0)).current;
  const night = hour < 6 || hour >= 19;
  const evening = hour >= 16 && !night;
  useEffect(() => {
    if (!motion || !fanOn) { phase.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(phase, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(phase, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start(); return () => loop.stop();
  }, [fanOn, motion, phase]);
  const matrix = `matrix(1 ${slope} 0 1 0 ${-70 * slope})`;
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%" viewBox="0 0 140 140"><G transform={matrix}>
      <Rect x="34" y="38" width="69" height="59" fill={night ? '#514D61' : evening ? '#E8BA8C' : '#D8E4DC'}/>
      {night ? <Path d="M89 44A11 11 0 1 0 99 60A12 12 0 0 1 89 44Z" fill={C.cream}/> : <Circle cx="87" cy="53" r="8" fill={evening ? '#F3D9AE' : '#FFF8DF'}/>}
      <Path d="M68 37V99M33 68H105" stroke={C.cream} strokeWidth="4"/>
      {!night && <Path d="M35 97L102 97L124 128L60 128Z" fill={evening ? C.orange : C.lightGlow} opacity={0.18}/>}
    </G></Svg>
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: phase.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '2deg'] }) }, { translateX: phase.interpolate({ inputRange: [0, 1], outputRange: [0, 2] }) }] }]}>
      <Svg width="100%" height="100%" viewBox="0 0 140 140"><G transform={matrix}>
        <Path d="M23 29H43Q36 62 44 102L25 105Q29 67 23 29ZM96 29H114Q108 64 114 105L94 102Q103 64 96 29Z" fill={C.cream} stroke={C.sand} strokeWidth="1"/>
        <Path d="M22 28H116" stroke={C.primary} strokeWidth="3" strokeLinecap="round"/>
      </G></Svg>
    </Animated.View>
  </View>;
}
