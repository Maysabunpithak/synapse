import { useId } from 'react';
import { Circle, Defs, G, Path, Pattern, Rect } from 'react-native-svg';
import type { WallPatternKind } from './roomScene';
export default function WallPattern({ kind = 'plain', width = 260, height = 190 }: { kind?: WallPatternKind; width?: number; height?: number }) {
  const id = `wallpaper-${useId().replace(/:/g, '')}`;
  if (kind === 'plain') return null;
  return <G>
    <Defs><Pattern id={id} x="0" y="0" width="44" height="44" patternUnits="userSpaceOnUse">
      {kind === 'stripes' && <Rect x="0" y="0" width="14" height="44" fill="#FFFFFF" opacity={0.55}/>}
      {kind === 'dots' && <><Circle cx="11" cy="11" r="4" fill="#FFFFFF" opacity={0.8}/><Circle cx="33" cy="33" r="4" fill="#8B6892" opacity={0.28}/></>}
      {kind === 'hearts' && <Path d="M12 20C0 12 8 3 14 10C20 3 28 12 16 20L14 22Z" transform="translate(8 8)" fill="#C15F86" opacity={0.48}/>}
      {kind === 'flowers' && <G><Circle cx="22" cy="14" r="7" fill="#FFFFFF" opacity={0.8}/><Circle cx="30" cy="22" r="7" fill="#FFFFFF" opacity={0.8}/><Circle cx="22" cy="30" r="7" fill="#FFFFFF" opacity={0.8}/><Circle cx="14" cy="22" r="7" fill="#FFFFFF" opacity={0.8}/><Circle cx="22" cy="22" r="5" fill="#D9954D" opacity={0.75}/></G>}
      {kind === 'gingham' && <><Rect width="22" height="44" fill="#FFFFFF" opacity={0.35}/><Rect width="44" height="22" fill="#FFFFFF" opacity={0.35}/></>}
    </Pattern></Defs>
    <Rect width={width} height={height} fill={`url(#${id})`}/>
  </G>;
}
