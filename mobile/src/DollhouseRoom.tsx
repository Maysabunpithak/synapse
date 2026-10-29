import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';
import { memo, useId } from 'react';
import WallPattern from './WallPattern';
import type { WallPatternKind } from './roomScene';
function DollhouseRoom({ wall = '#F0D9BD', floor = '#C89370', wallPattern = 'plain', theme }: { wall?: string; floor?: string; wallPattern?: WallPatternKind; theme?: 'coder' | 'cottage' }) {
  const coder = theme === 'coder';
  const id = `walls-${useId().replace(/:/g, '')}`;
  return <Svg width="100%" height="100%" viewBox="0 0 600 460" preserveAspectRatio="none">
    <Defs><LinearGradient id={id} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={coder ? '#C7B7A7' : '#FFF9ED'}/><Stop offset="1" stopColor={wall}/></LinearGradient></Defs>
    <Path d="M30 328L300 440L575 325L303 211Z" fill="#765641" opacity={0.14}/>
    <Path d="M40 128L300 28L560 128V319L300 429L40 319Z" fill={wall} stroke="#B89A80" strokeWidth="3" strokeLinejoin="round"/>
    <Path d="M40 128L300 28V219L40 319Z" fill={`url(#${id})`}/>
    <Path d="M300 28L560 128V319L300 219Z" fill={wall}/>
    <G transform="matrix(1 -0.384615 0 1 40 128)"><WallPattern kind={wallPattern}/></G>
    <G transform="matrix(1 0.384615 0 1 300 28)"><WallPattern kind={wallPattern}/></G>
    <Path d="M300 28L560 128V319L300 219Z" fill="#6F4C39" opacity={0.09}/>
    <Path d="M40 319L300 219L560 319L300 429Z" fill={floor}/>
    {[0.2, 0.4, 0.6, 0.8].map(t => <Path key={t} d={`M${40 + 260 * t} ${319 - 100 * t}L${300 + 260 * t} ${429 - 110 * t}`} stroke="#FFF2DE" strokeWidth="2" opacity={0.22}/>)}
    <Path d="M43 307L300 208L557 307M300 29V208" fill="none" stroke={coder ? '#DDCABB' : '#FFF8EB'} strokeWidth="5" opacity={0.65}/>
    {coder && <>
      <Path d="M58 295L300 202L544 296" fill="none" stroke="#D8B563" strokeWidth="15" opacity={0.16}/>
      <Path d="M58 295L300 202" fill="none" stroke="#C8D6BF" strokeWidth="3"/>
      <Path d="M300 202L544 296" fill="none" stroke="#E8BA8C" strokeWidth="3"/>
      <Path d="M84 133L254 68V164L84 229Z" fill="#51463E" stroke="#B8A18A" strokeWidth="2"/>
      <Path d="M110 144L137 125L110 127M224 100L198 100L224 81M178 107L156 151" fill="none" stroke="#C8D6BF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M111 179L224 136M111 191L177 166" stroke="#E8BA8C" strokeWidth="3" opacity={0.7}/>
    </>}
    {theme === 'cottage' && <>
      <Path d="M42 129L300 30L558 129M43 130V317M300 31V218M557 129V316" fill="none" stroke="#8B6548" strokeWidth="12" strokeLinejoin="round"/>
      <Path d="M47 126L300 29L552 126" fill="none" stroke="#CCA67B" strokeWidth="3"/>
      <Path d="M145 89V278M435 80V268M45 239L299 141L555 239" fill="none" stroke="#AA805D" strokeWidth="7" opacity="0.75"/>
      <Path d="M67 253V164Q67 129 98 117Q129 105 129 140V229Z" fill="#9D8767" stroke="#D8C19B" strokeWidth="4"/>
      <Path d="M72 195L124 175M72 220L124 200" stroke="#D8C19B" strokeWidth="5"/>
      <Path d="M78 190V170M88 187V163M99 182V163M111 177V155" stroke="#BCCCAB" strokeWidth="7"/>
      <Path d="M317 55Q400 161 538 145" fill="none" stroke="#B09569" strokeWidth="1.5"/>
      {[[342,87],[370,112],[403,129],[439,140],[477,147],[512,147]].map(([x,y],i)=><G key={i}><Circle cx={x} cy={y+4} r="10" fill="#FFE4A1" opacity="0.15"/><Path d={`M${x} ${y}v5`} stroke="#9D8058" strokeWidth="2"/><Circle cx={x} cy={y+6} r="3" fill="#FFE9BA"/></G>)}
      <Path d="M42 320L300 430L558 320" fill="none" stroke="#D7B68D" strokeWidth="4"/>
    </>}
    <Path d="M40 319V327L300 438L560 328V319L300 429Z" fill={coder ? '#8A7563' : '#966E4F'}/>
  </Svg>;
}
export default memo(DollhouseRoom);
