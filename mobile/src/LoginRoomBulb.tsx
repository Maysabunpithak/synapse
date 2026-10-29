import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G } from 'react-native-svg';
import { useMotionEnabled } from './Motion';
import PalmBulb from './PalmBulb';
import RobotDance from './RobotDance';

export default function LoginRoomBulb() {
  const enabled = useMotionEnabled();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    if (!enabled) return;
    let frame = 0, time = 0;
    let previous: number | undefined;
    const tick = (now: number) => {
      time += Math.min(32, Math.max(0, now - (previous ?? now)));
      previous = now;
      setElapsed(time);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enabled]);
  const angle = elapsed / 10000 * Math.PI * 2;
  const depth = Math.cos(angle);
  const x = 300 - Math.sin(angle) * 95;
  const y = 363 + depth * 32;
  const scale = 2.5 + depth * 0.15;
  const bulb = <Svg width="100%" height="100%" viewBox="0 0 600 460" preserveAspectRatio="none">
    <G transform={`translate(${x} ${y}) scale(${scale})`}>
      <PalmBulb elapsed={elapsed} enabled={enabled} walkingOnly backwardDance facingAngle={-angle}/>
    </G>
  </Svg>;
  return <View style={StyleSheet.absoluteFill}>
    <View style={[StyleSheet.absoluteFill, { opacity: depth < 0 ? 1 : 0 }]}>{bulb}</View>
    <View style={{ position: 'absolute', left: '50%', marginLeft: -134, bottom: 8, width: 268, height: 268, transform: [{ scale: 0.78 }] }}>
      <RobotDance mood="idle" active={false} touching={false} forcedActivity="sleep"/>
    </View>
    <View style={[StyleSheet.absoluteFill, { opacity: depth >= 0 ? 1 : 0 }]}>{bulb}</View>
  </View>;
}
