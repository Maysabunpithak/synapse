import { useEffect, useId, useState } from 'react';
import { View } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse, G, Image as SvgImage, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useMotionEnabled } from './Motion';
import { houseGait } from './houseGait';
import { loginMascotMotion } from './loginMascotMotion';
import PalmBulb from './PalmBulb';

const artwork = require('../assets/synapse-login-front-v3.png');
// Keep the bitmap atlas in the same SVG viewport as the articulated limbs.
// A nested native Svg introduces its own layout/viewBox and can offset the body.
const atlasScale = 180 / 887;
const atlasX = 10 + (190 - 936 * atlasScale) / 2;

export function LoginMascotFrame({ elapsed, enabled = true }: { elapsed: number; enabled?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const motion = loginMascotMotion(elapsed, enabled);
  const gait = houseGait(motion.gaitTime);
  const mix = (a: number, b: number) => a + (b - a) * motion.walk;
  const bob = gait.bodyY * motion.walk + motion.bow * 9 + motion.danceDip;
  const drawLeg = (leg: typeof gait.left, right: boolean) => {
    const hip = { x: leg.hip.x - 17, y: mix(146, leg.hip.y + 4) };
    const knee = { x: mix(right ? 114 : 92, leg.knee.x - 17), y: mix(170, leg.knee.y + 4) };
    const ankle = { x: mix(right ? 116 : 86, leg.ankle.x - 17), y: mix(196, leg.ankle.y + 4) };
    hip.y += motion.bow * 9;
    knee.x += (right ? 5 : -5) * motion.bow;
    knee.y += motion.bow * 4;
    const tap = right ? motion.danceRight : motion.danceLeft;
    hip.x += motion.danceSway;
    hip.y += motion.danceDip;
    knee.x += motion.danceSway * 0.5 + (right ? 4 : -4) * motion.dance;
    knee.y += motion.danceDip * 0.6;
    ankle.x += (right ? 4 : -4) * tap;
    ankle.y -= 4 * tap;
    if (!right) {
      knee.x -= motion.pose * 12;
      knee.y -= motion.pose * 8;
      ankle.x -= motion.pose * 22;
      ankle.y -= motion.pose * 19;
    }
    return <G>
      <Path d={`M${hip.x} ${hip.y} Q${knee.x} ${knee.y} ${ankle.x} ${ankle.y}`} fill="none" stroke="#B8A286" strokeWidth={6} strokeLinecap="round"/>
      <Path d={`M${hip.x} ${hip.y} Q${knee.x} ${knee.y} ${ankle.x} ${ankle.y}`} fill="none" stroke="#FFF0D2" strokeWidth={3.5} strokeLinecap="round"/>
      <G transform={`translate(${ankle.x} ${ankle.y}) rotate(${leg.footAngle * motion.walk - (right ? motion.lean : motion.pose * 18)})`}><Path d="M-8 0C-8-7-3-11 3-9C10-7 21-1 23 3C15 6-4 6-10 3Z" fill={`url(#shoe${id})`} stroke="#9B7C61" strokeWidth={0.6}/></G>
    </G>;
  };
  const glasses = Math.max(motion.inspect, motion.laugh, motion.pose, motion.celebrate);
  const restingHandX = mix(37, gait.leftHand.x - 9) + glasses * 43
    - motion.wave * 7 + motion.waveSwing * 9 + motion.bow * 49 - motion.present * 10;
  const restingHandY = mix(143, gait.leftHand.y + 4) - glasses * 46
    - motion.wave * 63 - motion.bow * 22 - motion.present * 13;
  const storyHandX = restingHandX + (151 - restingHandX) * motion.comfort;
  const storyHandY = restingHandY + (105 - restingHandY) * motion.comfort;
  const handX = storyHandX + (motion.danceHandX - storyHandX) * motion.dance;
  const handY = storyHandY + (motion.danceHandY - storyHandY) * motion.dance;
  const elbowX = handX - 10 - motion.comfort * 40;
  const elbowY = 122 + motion.comfort * 39;
  const palmX = 174 + (motion.danceRightX - 174) * motion.dance;
  const palmY = 130 + (motion.danceRightY - 130) * motion.dance;
  const poseImage = (offset: number) => <SvgImage href={artwork} x={atlasX - offset * atlasScale} y={-4} width={1774 * atlasScale} height={180} preserveAspectRatio="none"/>;
  const atlasPose = (offset: number) => <>
    <G clipPath={`url(#torso${id})`}>{poseImage(offset)}</G>
    <G clipPath={`url(#holdingArm${id})`} opacity={1 - motion.dance}>{poseImage(offset)}</G>
  </>;
  return <Svg width={268} height={230} viewBox="0 0 268 230" accessibilityLabel="บ้าน Synapse เดินเล่นและหัวเราะพร้อมถือหลอดไฟหน้ายิ้ม">
    <Defs><LinearGradient id={`shoe${id}`} x1="0%" y1="0%" x2="30%" y2="100%"><Stop offset="0" stopColor="#DBC4A7"/><Stop offset="1" stopColor="#98745B"/></LinearGradient></Defs>
    <Ellipse cx={122 + motion.x} cy={211 + motion.y * 0.15} rx={51} ry={7} fill="#241509" opacity={0.15}/>
    <G transform={`translate(${25 + motion.x} ${8 + motion.y}) rotate(${motion.lean} 116 196)`}>
      {drawLeg(gait.right, true)}{drawLeg(gait.left, false)}
      <G transform={`translate(${motion.danceSway} ${bob}) rotate(${motion.danceTilt} 101 146)`}>
        <Defs>
          <ClipPath id={`normal${id}`}><Rect x={atlasX} y={-4} width={910 * atlasScale} height={180}/></ClipPath>
          <ClipPath id={`laugh${id}`}><Rect x={atlasX + 65 * atlasScale} y={-4} width={871 * atlasScale} height={180}/></ClipPath>
          <ClipPath id={`torso${id}`}><Path d="M0 -4H210V112H144.5V180H0Z"/></ClipPath>
          <ClipPath id={`holdingArm${id}`}><Rect x={144.5} y={112} width={65.5} height={68}/></ClipPath>
        </Defs>
        <G clipPath={`url(#normal${id})`} opacity={1 - motion.expression}>
          {atlasPose(0)}
        </G>
        <G clipPath={`url(#laugh${id})`} opacity={motion.expression}>
          {atlasPose(845)}
        </G>
        <G opacity={motion.dance}>
          <Path d={`M142 116Q167 130 ${palmX} ${palmY + 4}`} fill="none" stroke="#C7B493" strokeWidth={6} strokeLinecap="round"/>
          <Path d={`M142 116Q167 130 ${palmX} ${palmY + 4}`} fill="none" stroke="#FFF0D4" strokeWidth={3.5} strokeLinecap="round"/>
          <Ellipse cx={palmX} cy={palmY + 4} rx={16} ry={6} fill="#FFF1D9" stroke="#BDAB91" strokeWidth={0.7}/>
        </G>
        <G transform={`translate(${palmX} ${palmY}) scale(1.4)`}><PalmBulb elapsed={elapsed} enabled={enabled}/></G>
        <Path d={`M56 100 Q${elbowX} ${elbowY} ${handX} ${handY}`} fill="none" stroke="#C7B493" strokeWidth={6} strokeLinecap="round"/>
        <Path d={`M56 100 Q${elbowX} ${elbowY} ${handX} ${handY}`} fill="none" stroke="#FFF0D4" strokeWidth={3.5} strokeLinecap="round"/>
        <Ellipse cx={handX} cy={handY} rx={7} ry={8} fill="#FFF1D9" stroke="#BDAB91" strokeWidth={0.7}/>
        <Ellipse cx={handX + 5} cy={handY - 3} rx={3.5} ry={4} fill="#FFF8E9"/>
        <Path d={`M${handX - 1} ${handY - 4}L${handX - 2} ${handY - 15}`} stroke="#FFF1D9" strokeWidth={4} strokeLinecap="round" opacity={motion.dancePoint}/>
      </G>
    </G>
  </Svg>;
}

export default function LoginMascot() {
  const enabled = useMotionEnabled();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    if (!enabled) return;
    let frame = 0, time = 0;
    let previous: number | undefined;
    const tick = (now: number) => {
      time += Math.min(32, Math.max(0, now - (previous ?? now))); previous = now;
      setElapsed(time); frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [enabled]);
  return <View pointerEvents="none" style={{ width: 268, height: 230 }}><LoginMascotFrame elapsed={elapsed} enabled={enabled}/></View>;
}
