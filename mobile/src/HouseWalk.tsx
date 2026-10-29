import { useEffect, useId, useState } from "react";
import Svg, { Defs, Ellipse, G, Image as SvgImage, LinearGradient, Path, Stop } from "react-native-svg";
import { houseGait } from "./houseGait";
import { useMotionEnabled } from "./Motion";

const body = require("../assets/synapse-house-happy-walk-body-v1.png");
const lowGlassesBody = require("../assets/synapse-house-low-glasses-body-v1.png");
export function HouseWalkFrame({ elapsed, facingLeft = false }: { elapsed: number; facingLeft?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gait = houseGait(elapsed);
  const legPath = (leg: typeof gait.left) => `M ${leg.hip.x} ${leg.hip.y} Q ${leg.knee.x} ${leg.knee.y} ${leg.ankle.x} ${leg.ankle.y}`;
  const limb = (path: string, far = false) => <>
    <Path d={path} fill="none" stroke={far ? "#AE9577" : "#C9B99E"} strokeWidth={5.4} strokeLinecap="round"/>
    <Path d={path} fill="none" stroke={far ? "#DDCBA9" : "#FFF0D2"} strokeWidth={3.3} strokeLinecap="round"/>
  </>;
  const foot = (leg: typeof gait.left, far = false) => <G transform={`translate(${leg.ankle.x} ${leg.ankle.y}) rotate(${leg.footAngle})`}>
    <Path d="M -8 0 C -8 -7 -3 -11 3 -9 C 10 -7 21 -1 23 3 C 15 6 -4 6 -10 3 Z" fill={`url(#foot${id})`} stroke={far ? "#927458" : "#AD8C6F"} strokeWidth={0.6}/>
  </G>;
  const hand = (x: number, y: number, far = false) => <G transform={`translate(${x} ${y})`}>
    <Ellipse cx={0} cy={0} rx={7.5} ry={8.5} fill={`url(#hand${id})`} stroke="#CBBDA5" strokeWidth={0.7}/>
    <Ellipse cx={5.8} cy={-3} rx={3.8} ry={4.5} fill={far ? "#EEE1C9" : "#FFF4DF"}/>
    <Path d="M -4 -2 Q -1 -4 1 -2 M -4 1 Q -1 -1 1 1" stroke="#C2AD91" strokeWidth={0.7} fill="none"/>
  </G>;
  return <Svg width={208} height={208} viewBox="0 0 208 208" accessibilityLabel="บ้าน Synapse เดินสลับเท้า">
    <Defs>
      <LinearGradient id={`foot${id}`} x1="0%" y1="0%" x2="30%" y2="100%">
        <Stop offset="0" stopColor="#D8BEA3"/><Stop offset="0.5" stopColor="#BA9A81"/><Stop offset="1" stopColor="#96765C"/>
      </LinearGradient>
      <LinearGradient id={`hand${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0" stopColor="#FFF9ED"/><Stop offset="1" stopColor="#DCCDB6"/>
      </LinearGradient>
    </Defs>
    <G transform={facingLeft ? "translate(208 0) scale(-1 1)" : undefined}>
      {limb(legPath(gait.right), true)}{foot(gait.right, true)}
      {!facingLeft && <>
        {limb(`M 160 ${97 + gait.bodyY} Q 175 ${105 + gait.bodyY} ${gait.rightHand.x} ${gait.rightHand.y}`, true)}
        {hand(gait.rightHand.x, gait.rightHand.y, true)}
      </>}
      {limb(legPath(gait.left))}{foot(gait.left)}
      <SvgImage href={facingLeft ? lowGlassesBody : body} x={20} y={8 + gait.bodyY} width={168} height={150} preserveAspectRatio="none"/>
      {limb(`M 54 ${105 + gait.bodyY} Q ${gait.leftHand.x - 4} ${119 + gait.bodyY} ${gait.leftHand.x} ${gait.leftHand.y}`)}
      {hand(gait.leftHand.x, gait.leftHand.y)}
    </G>
  </Svg>;
}
export default function HouseWalk({ facingLeft = false }: { facingLeft?: boolean }) {
  const motion = useMotionEnabled();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!motion) { setElapsed(0); return; }
    let started: number | undefined;
    let frame: number;
    const tick = (timestamp: number) => {
      started ??= timestamp;
      setElapsed(timestamp - started);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [motion]);
  return <HouseWalkFrame elapsed={elapsed} facingLeft={facingLeft}/>;
}
