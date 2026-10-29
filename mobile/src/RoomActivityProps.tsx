import Svg, { Ellipse, G, Path } from 'react-native-svg';
import type { RoomTask } from './caretakerPath';
import { wateringArc, waterDrop } from './roomWatering';

/** Small activity props share the character's position and furniture depth layer. */
export default function RoomActivityProps({ task, size, elapsed, opacity, left, waterTarget }: { task: RoomTask; size: number; elapsed: number; opacity: number; left: boolean; waterTarget?: { x: number; y: number } }) {
  const phase = elapsed / 850;
  const arc = waterTarget ? wateringArc(waterTarget, left) : undefined;
  return <Svg pointerEvents="none" width={size * 4} height={size * 4} viewBox="-150 -150 400 400" style={{ position: 'absolute', left: -size * 1.5, top: -size * 1.5 }}>
    <G opacity={opacity}>
      {task === 'water' && arc && <G transform={left ? 'translate(100 0) scale(-1 1)' : undefined}>
        <Path d={`M65 53Q64 65 ${64 + arc.offset.x} ${59 + arc.offset.y}`} fill="none" stroke="#FFF1D9" strokeWidth={3} strokeLinecap="round"/>
        <G transform={`translate(${arc.offset.x} ${arc.offset.y}) rotate(18 77 61)`}>
          <Path d="M63 58Q55 45 67 43Q78 45 72 56" fill="none" stroke="#D09756" strokeWidth="3"/>
          <Path d="M64 53H82L84 68Q72 73 63 65Z" fill="#FFD58B" stroke="#B38353" strokeWidth="1.3"/>
          <Path d="M81 58L92 51L96 55L83 64Z" fill="#EBC078" stroke="#B38353" strokeWidth="1"/>
          <Ellipse cx="64" cy="59" rx="4" ry="3" fill="#FFF1D9"/>
        </G>
        <Path d={`M${arc.start.x} ${arc.start.y}Q${arc.control.x} ${arc.control.y} ${arc.end.x} ${arc.end.y}`} fill="none" stroke="#8DCEE0" strokeWidth={0.8} opacity={0.35}/>
        {[0, 1, 2, 3, 4].map(i => { const t = (phase * 0.65 + i / 5) % 1; const drop = waterDrop(arc, t); return <Ellipse key={i} cx={drop.x} cy={drop.y} rx={1.2} ry={1.6} fill="#8DCEE0" opacity={Math.sin(t * Math.PI)}/>; })}
      </G>}
      {(task === 'read' || task === 'sit') && <G transform={`translate(0 ${Math.sin(phase) * 0.7})`}>
        <Path d="M31 62Q42 59 50 65Q58 59 69 62L68 79Q58 76 50 82Q42 76 32 79Z" fill="#BB9BD6" stroke="#886899" strokeWidth="1.5"/>
        <Path d="M34 63Q43 61 50 67Q58 61 66 63V76Q57 74 50 79Q43 74 34 76Z" fill="#FFF4DA"/>
        <Path d="M50 67V79M38 67L46 69M38 71L46 73M55 69L62 67M55 73L62 71" stroke="#BDAF97" strokeWidth="0.8"/>
        <Path d={`M50 67Q${50 + Math.sin(phase) * 9} 64 50 79`} fill="none" stroke="#E4D4B4" strokeWidth="1.3"/>
        <Ellipse cx="32" cy="73" rx="4" ry="3" fill="#FFF1D9"/><Ellipse cx="68" cy="73" rx="4" ry="3" fill="#FFF1D9"/>
      </G>}
    </G>
  </Svg>;
}
