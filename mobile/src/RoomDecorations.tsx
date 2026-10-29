import { useMemo, useRef } from 'react';
import { PanResponder, View } from 'react-native';
import Svg, { Ellipse, Path, Rect } from 'react-native-svg';
import { clampPosition, type Decoration } from './roomScene';

function Item({ item, width, height, onMove }: { item: Decoration; width: number; height: number; onMove?: (id: string, x: number, y: number) => void }) {
  const latest = useRef({ item, width, height, onMove });
  latest.current = { item, width, height, onMove };
  const start = useRef({ x: item.x, y: item.y });
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !!latest.current.onMove,
    onMoveShouldSetPanResponder: () => !!latest.current.onMove,
    onPanResponderGrant: () => { start.current = { x: latest.current.item.x, y: latest.current.item.y }; },
    onPanResponderMove: (_, gesture) => {
      const v = latest.current;
      v.onMove?.(v.item.id, clampPosition(start.current.x + gesture.dx / v.width), clampPosition(start.current.y + gesture.dy / v.height));
    },
    onPanResponderTerminationRequest: () => false,
  }), []);
  const size = Math.min(70, width * 0.19);
  return <View {...(onMove ? pan.panHandlers : {})} accessible={!!onMove} accessibilityLabel={`ลาก${item.kind === 'plant' ? 'ต้นไม้' : item.kind === 'lamp' ? 'โคมไฟ' : 'พรม'}เพื่อย้าย`} style={{ position: 'absolute', left: item.x * width - size / 2, top: item.y * height - size / 2, width: size, height: size }}>
    <Svg width="100%" height="100%" viewBox="0 0 80 80">
      <Ellipse cx="40" cy="72" rx="26" ry="5" fill="#291709" opacity={0.24}/>
      {item.kind === 'plant' ? <>
        <Path d="M40 55V20 M40 40L24 28 M40 34L56 22" stroke="#6C6D38" strokeWidth="4" strokeLinecap="round"/>
        <Ellipse cx="24" cy="27" rx="12" ry="7" rotation="35" origin="24,27" fill="#798047"/>
        <Ellipse cx="54" cy="23" rx="13" ry="8" rotation="-35" origin="54,23" fill="#929859"/>
        <Ellipse cx="39" cy="17" rx="7" ry="13" fill="#5D703E"/>
        <Path d="M23 49H57L52 69Q40 78 28 69Z" fill="#CB8050"/>
        <Ellipse cx="40" cy="49" rx="17" ry="5" fill="#EDBB8B"/>
      </> : item.kind === 'lamp' ? <>
        <Ellipse cx="40" cy="49" rx="31" ry="25" fill="#FFD37C" opacity={0.25}/>
        <Rect x="37" y="31" width="6" height="37" rx="3" fill="#93613D"/>
        <Ellipse cx="40" cy="69" rx="18" ry="5" fill="#AA734B"/>
        <Path d="M26 13Q40 5 54 13L64 38Q40 47 16 38Z" fill="#F7CE91"/>
        <Ellipse cx="40" cy="38" rx="24" ry="5" fill="#FFE6B7"/>
      </> : <>
        <Ellipse cx="40" cy="55" rx="36" ry="18" fill="#B86C43"/>
        <Ellipse cx="40" cy="53" rx="32" ry="14" fill="#E4B483"/>
        <Ellipse cx="40" cy="53" rx="25" ry="10" fill="none" stroke="#FADEC0" strokeWidth="2"/>
      </>}
    </Svg>
  </View>;
}
export default function RoomDecorations({ items, width, height, onMove }: { items: Decoration[]; width: number; height: number; onMove?: (id: string, x: number, y: number) => void }) {
  return <View pointerEvents={onMove ? 'box-none' : 'none'} style={{ position: 'absolute', left: 0, top: 0, width, height }}>
    {[...items].sort((a, b) => (a.kind === 'rug' ? -1 : 0) - (b.kind === 'rug' ? -1 : 0) || a.y - b.y).map(item => <Item key={item.id} item={item} width={width} height={height} onMove={onMove}/>)}
  </View>;
}
