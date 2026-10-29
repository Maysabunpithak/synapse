import { useId } from 'react';
import { ClipPath, Defs, Ellipse, G, Image as SvgImage, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { palmBulbMotion } from './loginMascotMotion';

const body = require('../assets/synapse-palm-bulb-body-v1.png');
const back = require('../assets/synapse-bulb-back-v1.png');

/** Local coordinates belong to the open palm, so every house motion carries it. */
export default function PalmBulb({ elapsed, enabled, walkingOnly = false, backwardDance = false, facingAngle }: { elapsed: number; enabled: boolean; walkingOnly?: boolean; backwardDance?: boolean; facingAngle?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gait = palmBulbMotion(walkingOnly ? 0 : elapsed, enabled);
  if (walkingOnly) {
    const step = enabled ? Math.sin(elapsed / 760 * Math.PI * 2) : 0;
    Object.assign(gait, { x: 0, stride: step * (backwardDance ? -2.8 : 2), bob: -Math.abs(step) * (backwardDance ? 1 : 0.65),
      leftLift: Math.max(0, step) * 2.5, rightLift: Math.max(0, -step) * 2.5 });
    if (backwardDance && enabled) {
      gait.lean = step * 5;
      gait.wave = 0.4 + step * 0.25;
    }
  }
  const chrome = `url(#bulb-chrome-${id})`;
  const front = Math.max(0, Math.cos(facingAngle ?? 0));
  const faceScale = Math.max(0.02, front);
  const side = Math.sin(facingAngle ?? 0);
  const leg = (side: number, lift: number) => {
    const x = side * 4.2 + side * gait.stride;
    return <G>
      <Path d={`M${side * 3.7} -8Q${side * 6} -4 ${x} ${-lift - 1}`} fill="none" stroke="#525D69" strokeWidth={1.5} strokeLinecap="round"/>
      <Path d={`M${side * 3.7} -8Q${side * 6} -4 ${x} ${-lift - 1}`} fill="none" stroke="#EAF3F6" strokeWidth={0.65}/>
      <Ellipse cx={x + 0.7} cy={-lift} rx={3.1} ry={1.65} fill={chrome} transform={backwardDance ? `rotate(${-lift * 8} ${x + 0.7} ${-lift})` : undefined}/>
    </G>;
  };
  return <G transform={`translate(${gait.x} 0)`}>
    <Defs><LinearGradient id={`bulb-chrome-${id}`} x1="0%" y1="0%" x2="80%" y2="100%"><Stop offset="0" stopColor="#F8FCFF"/><Stop offset="0.45" stopColor="#5A6875"/><Stop offset="0.65" stopColor="#E5EDF2"/><Stop offset="1" stopColor="#7A8791"/></LinearGradient></Defs>
    <Ellipse cx={0} cy={1} rx={7.5 - gait.jump * 0.15} ry={1.5} fill="#745F48" opacity={0.16 - gait.jump * 0.006}/>
    <G transform={`translate(0 ${-gait.jump}) rotate(${gait.lean} 0 0) scale(${1 + gait.squash} ${1 - gait.squash})`}>
    <Ellipse cx={0} cy={-23} rx={15} ry={18} fill="#FFE68B" opacity={gait.glow}/>
    {leg(-1, gait.leftLift)}{leg(1, gait.rightLift)}
    <G transform={`translate(0 ${gait.bob + gait.dim * 3}) rotate(${-gait.dim * 23} 0 -8)`}>
      <Path d={`M-7 -17Q-12 -12 ${-12 - gait.stride} ${-10 + gait.stride - gait.jump * 0.65} M7 -17Q14 -18 ${12 + gait.stride} ${-10 - gait.stride - gait.wave * 17 - gait.jump * 0.65}`} fill="none" stroke="#82909C" strokeWidth={1.1} strokeLinecap="round"/>
      {facingAngle === undefined ? <SvgImage href={body} x={-14} y={-35} width={28} height={28} opacity={1 - gait.dim * 0.55}/> : <G opacity={1 - gait.dim * 0.55}>
        <SvgImage href={back} x={-14} y={-35} width={28} height={28}/>
        <Defs><ClipPath id={`bulb-face-${id}`}><Rect x={-8} y={-28} width={9} height={9}/></ClipPath></Defs>
        <G transform={`translate(${side * 6 + 3.5 * faceScale} 0) scale(${faceScale} 1)`} opacity={Math.min(1, front / 0.3)}>
          <G clipPath={`url(#bulb-face-${id})`}><SvgImage href={body} x={-14} y={-35} width={28} height={28}/></G>
        </G>
      </G>}
      <Ellipse cx={-12 - gait.stride} cy={-10 + gait.stride - gait.jump * 0.65} rx={1.7} ry={2.1} fill={chrome}/>
      <Ellipse cx={12 + gait.stride} cy={-10 - gait.stride - gait.wave * 17 - gait.jump * 0.65} rx={1.7} ry={2.1} fill={chrome}/>
    </G>
    </G>
  </G>;
}
