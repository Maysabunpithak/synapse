import { memo, useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { furnitureColor, type FurnitureKind } from './roomScene';
import CuteRoomPet from './CuteRoomPet';
import FurnitureExtras from './FurnitureExtras';

// Original editable dollhouse pieces; the same artwork powers the catalog and room.
function RoomFurniture({ kind, color = furnitureColor(kind), rotation = 0, wallSlope = 100 / 260, facing }: { kind: FurnitureKind; color?: string; rotation?: number; wallSlope?: number; facing?: 'front' }) {
  const id = `furniture-${useId().replace(/:/g, '')}`;
  const rear = rotation >= 2;
  return <Svg width="100%" height="100%" viewBox="0 0 140 140">
    <Defs><LinearGradient id={id} x1="0" y1="0" x2="0.8" y2="1"><Stop offset="0" stopColor={kind === 'bed_platform' || kind === 'sofa_studio' ? '#677393' : '#FFF3DF'}/><Stop offset="0.28" stopColor={color}/><Stop offset="1" stopColor={color}/></LinearGradient></Defs>
    <G transform={!kind.startsWith('window') && rotation % 2 ? 'translate(140 0) scale(-1 1)' : undefined}>
      {!kind.startsWith('window') && <Ellipse cx="72" cy="119" rx={['plant', 'lamp', 'cat', 'dog', 'bunny', 'bear'].includes(kind) ? 30 : 57} ry="10" fill="#53445E" opacity={0.2}/>}
      <FurnitureExtras kind={kind} color={color} wallSlope={wallSlope}/>
      {(kind === 'dog' || kind === 'bunny' || kind === 'bear') && <CuteRoomPet kind={kind} color={color} rear={rear}/>}
      {kind === 'sofa_beanbag' && <>
        <Path d="M23 99Q15 83 31 70Q38 64 39 43Q39 24 58 25Q91 26 106 57Q121 69 126 92Q133 119 99 125L51 127Q20 124 23 99Z" fill={`url(#${id})`} stroke="#987879" strokeWidth="2"/>
        <Ellipse cx="73" cy="91" rx="35" ry="22" fill="#FFF5DF" opacity={0.65}/>
        <Path d="M48 40Q53 59 38 81M99 54Q106 78 113 106" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity={0.6}/>
        {!rear && <Path d="M59 79Q60 70 69 76Q78 70 81 79Q81 87 70 93Q58 87 59 79Z" fill="#F5A7BB"/>}
      </>}
      {kind === 'sofa_round' && facing === 'front' && <>
        <Path d="M27 106V120M113 106V120" stroke="#70503B" strokeWidth="7" strokeLinecap="round"/>
        <Rect x="15" y="28" width="110" height="72" rx="25" fill={`url(#${id})`} stroke="#829C90" strokeWidth="2"/>
        <Rect x="25" y="38" width="90" height="47" rx="18" fill="#FFF1DD" opacity={0.72}/>
        <Path d="M70 44V78" stroke={color} strokeWidth="2" opacity={0.7}/>
        <Rect x="20" y="85" width="100" height="29" rx="11" fill={color} stroke="#829C90" strokeWidth="1.5"/>
        <Path d="M30 73H110Q119 76 119 91Q70 100 21 91Q21 77 30 73Z" fill="#E4F1DF" stroke="#A8C7B5" strokeWidth="1.5"/>
        <Path d="M70 77V94" stroke="#A8C7B5" strokeWidth="1.5"/>
        <Rect x="29" y="57" width="25" height="26" rx="8" fill="#FFF7E8" transform="rotate(-10 41 70)"/>
        <Path d="M36 67Q35 61 41 64Q47 61 47 67Q46 72 41 75Q36 72 36 67Z" fill="#F3A3BC"/>
        <Rect x="87" y="57" width="24" height="26" rx="8" fill="#F5C8D1" transform="rotate(10 99 70)"/>
        <Rect x="10" y="67" width="18" height="40" rx="9" fill={`url(#${id})`} stroke="#829C90" strokeWidth="1.5"/>
        <Rect x="112" y="67" width="18" height="40" rx="9" fill={`url(#${id})`} stroke="#829C90" strokeWidth="1.5"/>
      </>}
      {(kind === 'sofa' || (kind === 'sofa_round' && facing !== 'front') || kind === 'sofa_cat' || kind === 'sofa_studio') && <>
        <Path d="M20 96V117M109 104V124" stroke="#70503B" strokeWidth="8" strokeLinecap="round"/>
        <Path d={kind === 'sofa_studio' ? 'M13 36L100 57V92L13 73Z' : kind === 'sofa_round' ? 'M13 60Q4 18 44 25Q87 26 103 51Q110 71 100 92L28 73Z' : kind === 'sofa_cat' ? 'M14 58L15 17Q17 11 23 20L40 36Q61 24 81 47L94 33Q101 25 103 39L106 88L28 73Z' : 'M13 48Q7 32 24 30Q26 15 45 25Q56 13 69 32Q85 22 94 44Q107 45 103 64V92L28 73Z'} fill={`url(#${id})`} stroke="#896B86" strokeWidth="2"/>
        {kind === 'sofa_cat' && <><Path d="M21 23L22 44L34 39Z M98 39L89 49L99 60Z" fill="#F5A7BB"/><Path d="M43 49Q49 43 54 50M69 56Q75 50 81 57" fill="none" stroke="#735A7B" strokeWidth="2.5" strokeLinecap="round"/></>}
        <Path d="M25 75L96 93L128 77V104Q128 113 119 117L90 130L16 108V81Z" fill={color}/>
        <Path d="M90 106L126 90V107L91 125Z" fill="#4C3020" opacity={0.15}/>
        {!rear && <>
          <Path d={kind === 'sofa_studio' ? 'M24 48L56 56V76L24 68ZM61 57L92 65V86L61 77Z' : kind === 'sofa_round' ? 'M25 54Q53 41 90 67L92 89Q54 72 28 78Z' : 'M29 52L56 59V83L29 77ZM61 61L90 68V91L61 84Z'} fill="#FFF1DD" opacity={0.76}/>
          <Path d="M28 80L95 98L119 86L54 70Z" fill="#FFF1DD" opacity={0.58}/>
          <Path d="M49 63L69 68L63 87L44 81Z" fill="#FFF7E8"/>
          <Path d="M78 72Q79 68 84 72L98 77Q101 80 96 85L91 96L73 91Z" fill="#9FD9CB"/>
          {kind !== 'sofa_studio' && <Path d="M48 69Q49 63 54 67Q61 63 62 70Q61 77 54 81Q47 75 48 69Z" fill="#F3A3BC"/>}
        </>}
        <Path d="M12 78Q12 68 22 70L33 73V106L16 101Z M101 86Q102 75 112 75L128 80V99L101 111Z" fill={`url(#${id})`} stroke="#A67A56" strokeWidth="1.5"/>
      </>}
      {kind.startsWith('bed') && <>
        <Path d="M17 89V110M106 109V127" stroke="#805A43" strokeWidth="7" strokeLinecap="round"/>
        {kind === 'bed_bunny' && <><Ellipse cx="31" cy="23" rx="9" ry="21" fill={color} stroke="#896B86" strokeWidth="2"/><Ellipse cx="66" cy="32" rx="9" ry="22" fill={color} stroke="#896B86" strokeWidth="2"/><Ellipse cx="31" cy="20" rx="4" ry="13" fill="#FFF1DF"/><Ellipse cx="66" cy="29" rx="4" ry="14" fill="#FFF1DF"/></>}
        <Path d={kind === 'bed_platform' ? 'M16 29L84 47V75L16 58Z' : kind === 'bed_bear' ? 'M16 33Q5 29 10 18Q17 8 28 18Q47 12 62 28Q72 20 81 29Q87 41 78 47L84 75L16 58Z' : kind === 'bed_bunny' ? 'M16 40Q13 24 32 27L69 37Q87 40 84 55V75L16 58Z' : kind === 'bed_canopy' ? 'M16 37Q16 29 26 32L76 44Q84 46 84 55V75L16 58Z' : 'M16 31Q9 13 26 16Q28 4 43 15Q55 5 65 26Q81 23 84 49V75L16 58Z'} fill={`url(#${id})`} stroke="#896B86" strokeWidth="2"/>
        {(kind === 'bed_bear' || kind === 'bed_bunny') && !rear && <><Circle cx="32" cy="40" r="2.5" fill="#735A65"/><Circle cx="62" cy="48" r="2.5" fill="#735A65"/><Ellipse cx="47" cy="48" rx="10" ry="6" fill="#FFF5DF"/><Path d="M44 46L50 48L47 50Z" fill="#C48391"/></>}
        <Path d="M18 65L71 47L128 87V110L103 126L18 91Z" fill="#AB7652"/>
        <Path d="M18 59L69 42L129 82Q132 89 125 94L103 110L20 79Q13 74 18 59Z" fill="#FFF2DE"/>
        <Path d="M42 76L88 59L128 84L104 105L104 120L42 96Z" fill={`url(#${id})`}/>
        {!rear && <><Path d="M24 57L43 50L61 61L42 69Z" fill="white"/><Path d="M48 49L66 44L83 56L65 63Z" fill="#FFFCF1"/></>}
        <Path d="M56 89L104 107" stroke="#FFF1DA" strokeWidth="3" opacity={0.6}/>
        {kind !== 'bed_platform' && <Path d="M79 73L82 80L90 82L84 87L85 95L78 91L71 94L73 86L68 81L76 80Z" fill="#FFF1AA"/>}
        {kind === 'bed_canopy' && <>
          <Path d="M13 101V22L65 5L128 42V119M65 5V47" fill="none" stroke="#BC9B78" strokeWidth="4" strokeLinejoin="round"/>
          <Path d="M13 22L65 5L128 42L103 60Z" fill={color} stroke="#896B86" strokeWidth="1.5"/>
          <Path d="M13 23Q24 64 16 94L31 98Q29 71 33 31Z M104 58Q108 89 102 116L116 118Q114 85 128 43Z" fill="#FFF9EE" opacity={0.88}/>
          <Path d="M15 68L28 72M105 92L117 93" stroke={color} strokeWidth="5"/>
        </>}
      </>}
      {kind === 'table' && <>
        <Path d="M31 78V115M102 84V122M90 60V94" stroke="#895B3E" strokeWidth="9" strokeLinecap="round"/>
        <Path d="M13 64Q8 58 18 54L66 35Q72 33 81 37L128 59Q136 64 129 72L87 93Q79 97 68 93L19 73Z" fill={color} stroke="#A77B58" strokeWidth="2"/>
        <Path d="M16 59Q17 43 40 46Q51 27 75 38Q102 32 108 49Q138 51 125 69Q131 84 105 83Q91 102 69 86Q39 91 35 77Q9 76 16 59Z" fill={`url(#${id})`} stroke="#B88970" strokeWidth="1.5"/>
      </>}
      {kind === 'shelf' && <>
        <Path d="M24 22L93 40V126L24 108Z" fill="#775540"/>
        <Path d="M24 22L46 12L116 30L93 40Z M93 40L116 30V115L93 126Z" fill={color}/>
        {[49, 78, 106].map(y => <Path key={y} d={`M28 ${y}L91 ${y + 17}L111 ${y + 8}L48 ${y - 9}Z`} fill={`url(#${id})`}/>)}
        {!rear && <><Path d="M35 30L44 32V53L35 51Z" fill="#A8B8A1"/><Path d="M47 34L57 36V57L47 55Z" fill="#E4AD77"/><Path d="M61 40L70 42V60L61 58Z" fill="#DDD2BD"/><Path d="M35 68L65 76V91L35 83Z" fill="#EEE0C9"/><Path d="M70 92L85 96V112L70 108Z" fill="#D7A198"/></>}
        {rear && <Path d="M27 27L91 43V122L27 105Z" fill={`url(#${id})`}/>}
      </>}
      {kind === 'plant' && <>
        <Path d="M71 95V30M70 68L43 42M70 60L95 39" stroke="#627449" strokeWidth="5" strokeLinecap="round"/>
        <Ellipse cx="43" cy="44" rx="22" ry="12" rotation="35" origin="43,44" fill="#91A66D"/>
        <Ellipse cx="94" cy="39" rx="23" ry="13" rotation="-35" origin="94,39" fill="#768E57"/>
        <Ellipse cx="70" cy="27" rx="13" ry="23" fill="#A4B781"/>
        <Path d="M44 84H99L91 118Q72 131 52 117Z" fill={`url(#${id})`}/>
        <Ellipse cx="71" cy="84" rx="28" ry="8" fill="#F4D7B3"/><Ellipse cx="71" cy="83" rx="21" ry="5" fill="#7A5940"/>
      </>}
      {kind === 'lamp' && <>
        <Ellipse cx="70" cy="76" rx="43" ry="44" fill="#FFEAB1" opacity={0.2}/>
        <Path d="M70 46V116" stroke="#986F4C" strokeWidth="7"/>
        <Ellipse cx="70" cy="117" rx="26" ry="7" fill="#A57953"/>
        <Path d="M49 17Q70 8 91 17L108 56Q70 71 32 56Z" fill={`url(#${id})`}/>
        <Ellipse cx="70" cy="56" rx="38" ry="8" fill="#FFE9B5"/>
      </>}
      {kind === 'rug' && <>
        <Path d="M7 86L64 60Q70 57 77 60L135 89L77 120Q70 123 63 120Z" fill={color} stroke="#FFF0DA" strokeWidth="3"/>
        <Path d="M20 87L70 65L121 89L70 114Z" fill="none" stroke="#FFF5E6" strokeWidth="2" opacity={0.75}/>
        <Ellipse cx="70" cy="90" rx="14" ry="7" fill="#FFF8EE"/>
        {[0, 1, 2, 3, 4].map(i => <Ellipse key={i} cx={70 + Math.cos(i * 1.256) * 20} cy={90 + Math.sin(i * 1.256) * 10} rx="10" ry="5" fill="#FFF8EE"/>)}
        <Ellipse cx="70" cy="90" rx="8" ry="4" fill="#FFD58B"/>
        {[0, 1, 2, 3, 4].map(i => <Path key={i} d={`M${16 + i * 10} ${95 + i * 5}l-5 4M${86 + i * 10} ${117 - i * 5}l5 4`} stroke={color} strokeWidth="3"/>)}
      </>}
      {kind === 'window' && <G transform={`matrix(1 ${wallSlope} 0 1 0 ${-70 * wallSlope})`}>
        <Rect x="24" y="30" width="88" height="76" rx="3" fill={color} stroke="#9C7455" strokeWidth="3"/>
        <Rect x="31" y="37" width="74" height="62" fill="#B9D6DE"/>
        <Path d="M31 85L52 66L74 79L91 63L105 81V99H31Z" fill="#95AF87"/>
        <Circle cx="86" cy="54" r="9" fill="#FFF0B0"/>
        <Path d="M68 36V100M30 68H106" fill="none" stroke="#FFF1DB" strokeWidth="5"/>
        <Path d="M19 105H116L121 111H24Z" fill="#F6DDC0"/>
      </G>}
      {kind === 'cat' && <>
        <Path d="M95 106Q125 100 114 80" fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"/>
        <Ellipse cx="71" cy="99" rx="32" ry="21" fill={`url(#${id})`}/>
        <Path d="M39 79L39 45L56 58Q69 55 81 61L98 51L93 84Q70 105 45 88Z" fill={color}/>
        <Path d="M44 61V53L51 62M85 66L92 59L89 70" fill="#DC9C90"/>
        {rear ? <Path d="M53 67L58 75M64 64L68 73" stroke="#A77A58" strokeWidth="3"/> : <><Circle cx="55" cy="76" r="4" fill="#574449"/><Circle cx="82" cy="78" r="4" fill="#574449"/><Circle cx="56" cy="75" r="1.3" fill="white"/><Circle cx="83" cy="77" r="1.3" fill="white"/><Ellipse cx="48" cy="84" rx="6" ry="3" fill="#EE9DB2"/><Ellipse cx="88" cy="86" rx="6" ry="3" fill="#EE9DB2"/><Path d="M66 84L71 85L68 88Z" fill="#BB7C70"/></>}
        <Ellipse cx="55" cy="116" rx="10" ry="5" fill="#FFF1D8"/><Ellipse cx="80" cy="117" rx="10" ry="5" fill="#FFF1D8"/>
      </>}
    </G>
  </Svg>;
}

export default memo(RoomFurniture);
