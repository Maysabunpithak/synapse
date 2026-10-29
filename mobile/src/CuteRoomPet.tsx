import { Circle, Ellipse, G, Path } from 'react-native-svg';
export default function CuteRoomPet({ kind, color, rear }: { kind: 'dog' | 'bunny' | 'bear'; color: string; rear: boolean }) {
  return <G>
    <Ellipse cx="70" cy="100" rx="27" ry="24" fill={color} stroke="#866B68" strokeWidth="1.8"/>
    <Ellipse cx="70" cy="105" rx="17" ry="17" fill="#FFF5E6"/>
    {kind === 'bunny' ? <>
      <Ellipse cx="53" cy="34" rx="11" ry="29" fill={color} stroke="#866B68" strokeWidth="1.8"/>
      <Ellipse cx="86" cy="34" rx="11" ry="29" fill={color} stroke="#866B68" strokeWidth="1.8"/>
      <Ellipse cx="53" cy="32" rx="5" ry="20" fill="#F4B5C6"/><Ellipse cx="86" cy="32" rx="5" ry="20" fill="#F4B5C6"/>
    </> : kind === 'bear' ? <>
      <Circle cx="44" cy="44" r="15" fill={color} stroke="#866B68" strokeWidth="1.8"/><Circle cx="96" cy="44" r="15" fill={color} stroke="#866B68" strokeWidth="1.8"/>
      <Circle cx="44" cy="44" r="8" fill="#F4B5C6"/><Circle cx="96" cy="44" r="8" fill="#F4B5C6"/>
    </> : <>
      <Ellipse cx="37" cy="67" rx="14" ry="27" rotation="15" origin="37,67" fill="#9B705E"/>
      <Ellipse cx="102" cy="67" rx="14" ry="27" rotation="-15" origin="102,67" fill="#9B705E"/>
      <Path d="M93 109Q124 98 109 87" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"/>
    </>}
    <Ellipse cx="70" cy="70" rx="33" ry="29" fill={color} stroke="#866B68" strokeWidth="1.8"/>
    {!rear && <>
      <Ellipse cx="70" cy="81" rx="18" ry="13" fill="#FFF5E6"/>
      <Ellipse cx="55" cy="68" rx="4" ry="5" fill="#574449"/><Ellipse cx="85" cy="68" rx="4" ry="5" fill="#574449"/>
      <Circle cx="56" cy="66" r="1.4" fill="white"/><Circle cx="86" cy="66" r="1.4" fill="white"/>
      <Ellipse cx="46" cy="78" rx="7" ry="4" fill="#EE9DB2"/><Ellipse cx="94" cy="78" rx="7" ry="4" fill="#EE9DB2"/>
      <Path d="M65 78Q70 75 75 78L70 83Z" fill={kind === 'bunny' ? '#D989A1' : '#715350'}/>
      <Path d="M70 82V86Q65 92 62 87M70 86Q75 92 78 87" fill="none" stroke="#715350" strokeWidth="1.8" strokeLinecap="round"/>
    </>}
    <Ellipse cx="51" cy="119" rx="14" ry="8" fill={color} stroke="#866B68" strokeWidth="1.5"/><Ellipse cx="89" cy="119" rx="14" ry="8" fill={color} stroke="#866B68" strokeWidth="1.5"/>
    <Path d="M53 94L68 99L55 104ZM87 94L72 99L85 104Z" fill="#E384A3"/><Circle cx="70" cy="99" r="4" fill="#FFE6EC"/>
  </G>;
}
