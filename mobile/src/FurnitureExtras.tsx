import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { FurnitureKind } from './roomScene';
export default function FurnitureExtras({ kind, color, wallSlope }: { kind: FurnitureKind; color: string; wallSlope: number }) {
  return <G>
    {kind === 'table_laptop' && <>
      <Path d="M23 83V122M111 90V127M91 69V103" stroke="#202839" strokeWidth="6"/>
      <Path d="M9 72L65 51L133 76V87L80 108L9 84Z" fill="#202A3C" stroke="#8D9BB7" strokeWidth="1.5"/>
      <Path d="M9 72L65 51L133 76L80 98Z" fill={color}/>
      <Path d="M13 83L80 104L129 85" fill="none" stroke="#A99AF5" strokeWidth="2"/>
      <Path d="M43 41L86 53L88 80L45 66Z" fill="#101827" stroke="#8C9CB6" strokeWidth="2"/>
      <Path d="M49 48L79 56V71L49 62Z" fill="#273A55"/>
      <Path d="M54 53L65 56M54 58L74 64" stroke="#65E3EE" strokeWidth="2"/>
      <Path d="M45 66L88 80L70 91L28 77Z" fill="#8893AC"/>
      <Path d="M44 72L75 82M39 76L69 86" stroke="#303B56" strokeWidth="2"/>
      <Path d="M106 68V80Q112 85 118 81V69" fill="#AAA0F2"/>
      <Ellipse cx="112" cy="69" rx="6" ry="3" fill="#303B56"/>
      <Path d="M118 71Q127 71 119 78" fill="none" stroke="#AAA0F2" strokeWidth="3"/>
    </>}
    {kind === 'shelf_tech' && <>
      <Path d="M23 23L48 13L116 31V114L93 126L23 107Z" fill={color} stroke="#8C9CB6" strokeWidth="1.5"/>
      <Path d="M29 31L89 47V117L29 101Z" fill="#182235"/>
      <Path d="M29 66L89 82M29 101L89 117" stroke="#AAA0F2" strokeWidth="3"/>
      <Path d="M38 38L45 40V64L38 62ZM49 41L57 43V67L49 65Z" fill="#57CFDB"/>
      <Path d="M65 46L79 50V73L65 69Z" fill="#7375E8"/>
      <Path d="M41 85Q42 75 49 79L64 83Q72 83 74 94L76 103L66 100L61 93L51 90L45 95L37 92Z" fill="#9FAAC2"/>
      <Path d="M44 84L51 86M48 82V88" stroke="#1C2639" strokeWidth="2"/>
      <Circle cx="65" cy="90" r="2" fill="#57CFDB"/>
    </>}
    {kind === 'lamp_led' && <>
      <Ellipse cx="70" cy="115" rx="28" ry="8" fill="#273248" stroke="#8C9CB6"/>
      <Path d="M70 110V27" stroke="#263148" strokeWidth="12" strokeLinecap="round"/>
      <Path d="M69 104V30" stroke={color} strokeWidth="20" opacity={0.15} strokeLinecap="round"/>
      <Path d="M69 104V30" stroke={color} strokeWidth="5" strokeLinecap="round"/>
      <Path d="M67 99V33" stroke="#E0FCFF" strokeWidth="1.5" strokeLinecap="round"/>
    </>}
    {kind === 'window_loft' && <G transform={`matrix(1 ${wallSlope} 0 1 0 ${-70 * wallSlope})`}>
      <Rect x="24" y="30" width="88" height="76" rx="2" fill={color} stroke="#93A1BC" strokeWidth="2"/>
      <Rect x="30" y="36" width="76" height="64" fill="#829BBE"/>
      <Path d="M30 75H40V62H54V81H64V52H79V70H91V61H106V100H30Z" fill="#455573"/>
      <Path d="M45 69V74M69 59V64M74 75V80M97 69V74" stroke="#C9CCF5" strokeWidth="3"/>
      <Path d="M55 35V101M81 35V101M30 65H106" stroke={color} strokeWidth="4"/>
      <Path d="M20 106H117L122 112H25Z" fill="#687895"/>
    </G>}
    {kind === 'rug_grid' && <>
      <Path d="M7 86L70 58L135 89L70 122Z" fill={color} stroke="#ADB5E5" strokeWidth="2"/>
      <Path d="M17 86L70 63L125 89L70 116Z" fill="#303B56"/>
      <Path d="M34 79L87 107M51 71L105 98M35 96L87 72M52 105L106 80" stroke="#737EA2" strokeWidth="1" opacity={0.7}/>
      <Path d="M30 88L53 98M89 78L110 88" stroke="#66DAE7" strokeWidth="3" strokeLinecap="round"/>
    </>}
    {kind === 'table_code' && <>
      <Path d="M23 83V122M111 90V127M91 69V103" stroke="#171D2D" strokeWidth="6" strokeLinecap="round"/>
      <Path d="M9 72L65 51L133 76V87L80 108L9 84Z" fill="#1C2436" stroke="#687591" strokeWidth="1.5"/>
      <Path d="M9 72L65 51L133 76L80 98Z" fill={color}/>
      <Path d="M13 83L80 104L129 85" fill="none" stroke="#57CFDB" strokeWidth="2"/>
      <Path d="M25 34L66 44V76L25 64Z M73 44L114 55V86L73 74Z" fill="#101726" stroke="#8996B2" strokeWidth="2" strokeLinejoin="round"/>
      <Path d="M29 39L62 47V69L29 60Z M77 49L110 58V79L77 70Z" fill="#22314B"/>
      <Path d="M33 44L44 47M33 49L55 55M38 56L51 60M81 56L95 60M81 61L105 68M85 68L97 72" stroke="#57CFDB" strokeWidth="1.6" strokeLinecap="round"/>
      <Path d="M47 72V78M94 81V87" stroke="#A0ABC4" strokeWidth="3"/>
      <Path d="M39 79L65 72L93 83L68 92Z" fill="#131C2C" stroke="#8391AF" strokeWidth="1"/>
      <Path d="M48 79L72 87M54 77L79 85" stroke="#A99AF5" strokeWidth="1.2"/>
      <Ellipse cx="103" cy="87" rx="5" ry="3" fill="#A99AF5"/>
      <Path d="M112 84L129 89V119L112 114Z" fill="#202A3C" stroke="#7B89A4" strokeWidth="1"/>
      <Ellipse cx="120" cy="99" rx="4" ry="5" fill="none" stroke="#A99AF5" strokeWidth="1.7"/>
      <Ellipse cx="120" cy="110" rx="4" ry="5" fill="none" stroke="#57CFDB" strokeWidth="1.7"/>
    </>}
    {kind === 'table_round' && <>
      <Path d="M40 77V116M101 78V117M72 64V94" stroke="#AF8263" strokeWidth="9" strokeLinecap="round"/>
      <Ellipse cx="70" cy="67" rx="55" ry="25" fill="#C99E7E"/>
      <Ellipse cx="70" cy="62" rx="55" ry="25" fill={color} stroke="#A88066" strokeWidth="2"/>
      <Ellipse cx="70" cy="62" rx="43" ry="18" fill="none" stroke="#FFF5DE" strokeWidth="2"/>
    </>}
    {kind === 'shelf_house' && <>
      <Path d="M25 51L64 12L116 43V113L89 127L25 108Z" fill={color} stroke="#8D7772" strokeWidth="2"/>
      <Path d="M25 51L64 12L93 46L116 43L64 5L17 49Z" fill="#F3A6B9"/>
      <Path d="M33 57L83 69V113L33 101Z" fill="#FFF5E5"/>
      <Path d="M31 79L86 92" stroke={color} strokeWidth="5"/>
      <Circle cx="62" cy="42" r="9" fill="#FFF2DB"/>
      <Path d="M62 33V51M53 42H71" stroke="#BF9A7F" strokeWidth="2"/>
      <Path d="M41 58L47 60V81L41 79ZM52 61L59 63V84L52 82Z" fill="#B6B0E7"/>
      <Path d="M44 89L64 94V105L44 101Z" fill="#F2B5BC"/>
    </>}
    {kind === 'plant_flower' && <>
      <Path d="M70 97V40M70 68L43 53M70 77L96 62" fill="none" stroke="#78A17E" strokeWidth="4"/>
      <Ellipse cx="51" cy="71" rx="16" ry="7" fill="#A0C6A0"/><Ellipse cx="88" cy="82" rx="16" ry="7" fill="#A0C6A0"/>
      {[[70, 34], [39, 47], [100, 56]].map(([x, y], i) => <G key={i}><Circle cx={x - 9} cy={y} r="10" fill={i === 1 ? '#FFD991' : '#F3A7C2'}/><Circle cx={x + 9} cy={y} r="10" fill={i === 1 ? '#FFD991' : '#F3A7C2'}/><Circle cx={x} cy={y - 9} r="10" fill={i === 1 ? '#FFD991' : '#F3A7C2'}/><Circle cx={x} cy={y + 9} r="10" fill={i === 1 ? '#FFD991' : '#F3A7C2'}/><Circle cx={x} cy={y} r="6" fill="#FFF5C0"/></G>)}
      <Path d="M44 90H98L89 121Q69 131 53 119Z" fill={color} stroke="#9B7C87" strokeWidth="1.5"/>
      <Ellipse cx="71" cy="91" rx="27" ry="6" fill="#FCE8DA"/>
    </>}
    {kind === 'lamp_mushroom' && <>
      <Ellipse cx="70" cy="104" rx="40" ry="18" fill="#FFF2B7" opacity={0.35}/>
      <Path d="M57 56H85L94 109Q73 126 48 111Z" fill="#FFF3D8" stroke="#B6A38D" strokeWidth="2"/>
      <Path d="M17 67Q17 17 69 16Q120 19 125 67Q74 91 17 67Z" fill={color} stroke="#A3818D" strokeWidth="2"/>
      <Ellipse cx="70" cy="67" rx="53" ry="13" fill="#FFEAB7"/>
      <Ellipse cx="46" cy="39" rx="9" ry="6" fill="#FFF6E7"/><Ellipse cx="85" cy="30" rx="10" ry="7" fill="#FFF6E7"/><Ellipse cx="102" cy="52" rx="7" ry="5" fill="#FFF6E7"/>
    </>}
    {kind === 'rug_round' && <>
      <Ellipse cx="70" cy="90" rx="62" ry="28" fill={color} stroke="#FFF4E2" strokeWidth="3"/>
      <Ellipse cx="70" cy="90" rx="52" ry="21" fill="none" stroke="#FFF4E2" strokeWidth="2" strokeDasharray="4 5"/>
      <Path d="M51 86Q48 75 59 76Q65 71 71 81Q80 73 86 79Q98 88 72 103Q52 95 51 86Z" fill="#FFF3E4"/>
    </>}
    {kind === 'window_arch' && <G transform={`matrix(1 ${wallSlope} 0 1 0 ${-70 * wallSlope})`}>
      <Path d="M26 106V57Q26 14 70 14Q112 14 112 57V106Z" fill={color} stroke="#9C7455" strokeWidth="3"/>
      <Path d="M33 99V57Q33 22 70 22Q105 22 105 57V99Z" fill="#B9D6DE"/>
      <Path d="M33 89L55 69L80 82L105 67V99H33Z" fill="#A6BE93"/>
      <Circle cx="83" cy="48" r="9" fill="#FFF0B0"/>
      <Path d="M69 22V100M32 65H106" stroke="#FFF1DB" strokeWidth="5" fill="none"/>
      <Path d="M21 105H117L122 111H26Z" fill="#F6DDC0"/>
    </G>}
    {kind.endsWith('_sleep') && <>
      <Ellipse cx="78" cy="100" rx="45" ry="25" fill={color} stroke="#997D79" strokeWidth="1.8"/>
      <Path d="M112 103Q133 86 114 82Q99 82 107 97" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"/>
      {kind === 'bunny_sleep' ? <><Ellipse cx="40" cy="67" rx="9" ry="25" rotation="-28" origin="40,67" fill={color} stroke="#997D79"/><Ellipse cx="57" cy="65" rx="9" ry="25" rotation="-12" origin="57,65" fill={color} stroke="#997D79"/><Ellipse cx="40" cy="65" rx="4" ry="16" fill="#EEB5C8"/></> : kind === 'bear_sleep' ? <><Circle cx="29" cy="80" r="11" fill={color} stroke="#997D79"/><Circle cx="67" cy="77" r="11" fill={color} stroke="#997D79"/></> : kind === 'cat_sleep' ? <Path d="M26 94L25 67L43 79L58 76L73 64L72 94Z" fill={color} stroke="#997D79"/> : <><Ellipse cx="26" cy="90" rx="11" ry="20" fill="#A97C68"/><Ellipse cx="72" cy="89" rx="10" ry="19" fill="#A97C68"/></>}
      <Ellipse cx="49" cy="99" rx="28" ry="22" fill={color} stroke="#997D79" strokeWidth="1.5"/>
      <Path d="M32 98Q38 104 43 98M53 98Q59 104 64 98" fill="none" stroke="#6A5057" strokeWidth="2.5" strokeLinecap="round"/>
      <Path d="M44 107L51 107L48 111Z" fill="#CE91A1"/>
      <Ellipse cx="28" cy="106" rx="6" ry="3" fill="#EDB0C2"/><Ellipse cx="68" cy="106" rx="6" ry="3" fill="#EDB0C2"/>
      <Ellipse cx="49" cy="120" rx="20" ry="5" fill="#FFF1DE"/>
    </>}
  </G>;
}
