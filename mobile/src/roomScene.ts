export type RoomPeriod = 'auto' | 'morning' | 'day' | 'evening' | 'night';
export const furnitureCatalog = [
  { kind: 'table_laptop', label: 'โต๊ะโน้ตบุ๊ก', group: 'โต๊ะ', size: 0.24 },
  { kind: 'shelf_tech', label: 'ชั้นแก็ดเจ็ต', group: 'ชั้นวาง', size: 0.25 },
  { kind: 'lamp_led', label: 'โคมไฟ LED', group: 'โคมไฟ', size: 0.2 },
  { kind: 'window_loft', label: 'หน้าต่างลอฟต์', group: 'หน้าต่าง', size: 0.22 },
  { kind: 'rug_grid', label: 'พรมกราฟิก', group: 'พรม', size: 0.36 },
  { kind: 'table_code', label: 'โต๊ะคอมสองจอ', group: 'โต๊ะ', size: 0.24 },
  { kind: 'bed_platform', label: 'เตียงโมเดิร์น', group: 'เตียง', size: 0.34 },
  { kind: 'sofa_studio', label: 'โซฟาสตูดิโอ', group: 'โซฟา', size: 0.34 },
  { kind: 'bed', label: 'เตียงเมฆ', group: 'เตียง', size: 0.34 },
  { kind: 'bed_bear', label: 'เตียงหมี', group: 'เตียง', size: 0.34 },
  { kind: 'bed_bunny', label: 'เตียงกระต่าย', group: 'เตียง', size: 0.34 },
  { kind: 'bed_canopy', label: 'เตียงม่าน', group: 'เตียง', size: 0.37 },
  { kind: 'sofa', label: 'โซฟาเมฆ', group: 'โซฟา', size: 0.34 },
  { kind: 'sofa_round', label: 'โซฟาโค้ง', group: 'โซฟา', size: 0.34 },
  { kind: 'sofa_cat', label: 'โซฟาแมว', group: 'โซฟา', size: 0.34 },
  { kind: 'sofa_beanbag', label: 'บีนแบ็ก', group: 'โซฟา', size: 0.27 },
  { kind: 'table', label: 'โต๊ะ', group: 'โต๊ะ', size: 0.24 },
  { kind: 'shelf', label: 'ชั้นวาง', group: 'ชั้นวาง', size: 0.25 },
  { kind: 'plant', label: 'ต้นไม้', group: 'ต้นไม้', size: 0.18 },
  { kind: 'lamp', label: 'โคมไฟ', group: 'โคมไฟ', size: 0.2 },
  { kind: 'rug', label: 'พรม', group: 'พรม', size: 0.36 },
  { kind: 'window', label: 'หน้าต่าง', group: 'หน้าต่าง', size: 0.22 },
  { kind: 'cat', label: 'แมว', group: 'ตุ๊กตา', size: 0.16 },
  { kind: 'dog', label: 'น้องหมา', group: 'ตุ๊กตา', size: 0.19 },
  { kind: 'bunny', label: 'กระต่าย', group: 'ตุ๊กตา', size: 0.19 },
  { kind: 'bear', label: 'หมีน้อย', group: 'ตุ๊กตา', size: 0.19 },
  { kind: 'table_round', label: 'โต๊ะกลม', group: 'โต๊ะ', size: 0.24 },
  { kind: 'shelf_house', label: 'ชั้นบ้านจิ๋ว', group: 'ชั้นวาง', size: 0.25 },
  { kind: 'plant_flower', label: 'กระถางดอกไม้', group: 'ต้นไม้', size: 0.18 },
  { kind: 'lamp_mushroom', label: 'โคมเห็ด', group: 'โคมไฟ', size: 0.2 },
  { kind: 'rug_round', label: 'พรมกลม', group: 'พรม', size: 0.36 },
  { kind: 'window_arch', label: 'หน้าต่างโค้ง', group: 'หน้าต่าง', size: 0.22 },
  { kind: 'cat_sleep', label: 'แมวนอน', group: 'ตุ๊กตา', size: 0.18 },
  { kind: 'dog_sleep', label: 'หมานอน', group: 'ตุ๊กตา', size: 0.19 },
  { kind: 'bunny_sleep', label: 'กระต่ายนอน', group: 'ตุ๊กตา', size: 0.19 },
  { kind: 'bear_sleep', label: 'หมีนอน', group: 'ตุ๊กตา', size: 0.19 },
] as const;
export type FurnitureKind = typeof furnitureCatalog[number]['kind'];
export const wallPatterns = [
  { id: 'plain', label: 'สีพื้น' }, { id: 'stripes', label: 'ลายทาง' },
  { id: 'dots', label: 'จุดน่ารัก' }, { id: 'hearts', label: 'หัวใจ' },
  { id: 'flowers', label: 'ดอกไม้' }, { id: 'gingham', label: 'ตาราง' },
] as const;
export type WallPatternKind = typeof wallPatterns[number]['id'];
export const roomColors = ['#EBDDC5', '#B99170', '#94A78D', '#C6A87C', '#C68765', '#C6B69C', '#252B3D', '#3B4561', '#7375E8', '#57CFDB', '#AAA0F2', '#F5A7BB', '#9FD9CB', '#B7ACEC', '#91C9EC', '#FFD58B', '#FFF5DF', '#DD9676', '#729998'];
export function furnitureColor(kind: FurnitureKind) {
  if (kind === 'lamp_led') return '#57CFDB';
  if (kind === 'table_laptop' || kind === 'shelf_tech' || kind === 'window_loft') return '#3B4561';
  if (kind === 'rug_grid') return '#7375E8';
  if (kind === 'table_code' || kind === 'sofa_studio') return '#3B4561';
  if (kind === 'bed_platform') return '#7375E8';
  const colors: Record<string, string> = { bed: '#B7ACEC', bed_bear: '#FFD58B', bed_bunny: '#F5A7BB', bed_canopy: '#91C9EC', sofa: '#F5A7BB', sofa_round: '#9FD9CB', sofa_cat: '#B7ACEC', sofa_beanbag: '#FFD58B', table: '#FFD58B', shelf: '#9FD9CB', plant: '#B7ACEC', lamp: '#F5A7BB', rug: '#9FD9CB', window: '#FFF5DF', cat: '#FFD58B', dog: '#DD9676', bunny: '#FFF5DF', bear: '#DD9676' };
  return colors[kind] || colors[kind.split('_')[0]];
}
export function coderFurnitureColor(kind: FurnitureKind) {
  const colors: Partial<Record<FurnitureKind, string>> = {
    table_code: '#8C624C', table_laptop: '#BE9976', table: '#AA7957', table_round: '#688879',
    bed_platform: '#819DB4', bed: '#A9B8A0', bed_bear: '#C49A61', bed_bunny: '#BB8E96', bed_canopy: '#9F95B8',
    sofa_studio: '#B98156', sofa: '#758B79', sofa_round: '#819DA7', sofa_cat: '#A494B0', sofa_beanbag: '#BEA16D',
    shelf_tech: '#657D83', shelf: '#AD8967', shelf_house: '#849875',
    lamp_led: '#78D4D4', lamp: '#D5BC83', lamp_mushroom: '#B47863',
    rug_grid: '#ABA1BA', rug: '#9AAC98', rug_round: '#C39B85',
    plant: '#C28669', plant_flower: '#C5B598',
    window: '#CAB89E', window_arch: '#A5B7AF', window_loft: '#778594',
  };
  return colors[kind] ?? furnitureColor(kind);
}
export type Decoration = { id: string; kind: FurnitureKind; x: number; y: number; color?: string; rotation?: number; scale?: number; facing?: 'front'; support?: { id: string; u: number; v: number } };
export function isRoomDoll(kind: FurnitureKind) { return /^(cat|dog|bunny|bear)(_|$)/.test(kind); }
export function supportedDecorations(items: Decoration[], width: number, height: number): Decoration[] {
  if (!width || !height) return items;
  return items.map(item => {
    const bed = item.support && items.find(d => d.id === item.support!.id && d.kind.startsWith('bed'));
    if (!bed || !item.support) return item;
    const size = width * furnitureCatalog.find(f => f.kind === bed.kind)!.size * (bed.scale ?? 1);
    const u = (bed.rotation ?? 0) % 2 ? 1 - item.support.u : item.support.u;
    return { ...item, x: bed.x + (u - 0.5) * size / width, y: bed.y + (item.support.v - 0.86) * size / height };
  });
}
function onMattress(u: number, v: number) {
  const polygon = [[18, 59], [69, 42], [129, 82], [103, 110], [20, 79]];
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [x, y] = polygon[i], [px, py] = polygon[j];
    if ((y > v * 140) !== (py > v * 140) && u * 140 < (px - x) * (v * 140 - y) / (py - y) + x) inside = !inside;
  }
  return inside;
}
export function placeDecoration(items: Decoration[], id: string, x: number, y: number, width: number, height: number): Decoration[] {
  return items.map(item => {
    if (item.id !== id) return item;
    const next = { ...item, x, y, support: undefined as Decoration['support'] };
    if (!isRoomDoll(item.kind) || !width || !height) return next;
    const beds = items.filter(d => d.kind.startsWith('bed')).sort((a, b) => b.y - a.y);
    for (const bed of beds) {
      const size = width * furnitureCatalog.find(f => f.kind === bed.kind)!.size * (bed.scale ?? 1);
      const localX = 0.5 + (x - bed.x) * width / size;
      const u = (bed.rotation ?? 0) % 2 ? 1 - localX : localX;
      const v = 0.86 + (y - bed.y) * height / size;
      if (onMattress(u, v)) return { ...next, support: { id: bed.id, u, v } };
    }
    return next;
  });
}
export function removeDecoration(items: Decoration[], id: string, width: number, height: number): Decoration[] {
  const resolved = supportedDecorations(items, width, height);
  return items.filter(d => d.id !== id).map(d => d.support?.id === id ? { ...d, x: clampPosition(resolved.find(r => r.id === d.id)!.x), y: clampPosition(resolved.find(r => r.id === d.id)!.y), support: undefined } : d);
}
export type RoomScene = { period: RoomPeriod; decorations: Decoration[]; version?: 2; theme?: 'coder' | 'cottage'; furniturePalette?: 2; wall?: string; floor?: string; wallPattern?: WallPatternKind };
export const defaultRoomScene: RoomScene = { period: 'auto', decorations: [] };
export function cottageRoom(scene: RoomScene): RoomScene {
  if (scene.theme === 'cottage') return { ...scene, period: 'auto' };
  const kinds: Partial<Record<FurnitureKind, FurnitureKind>> = {
    rug_grid: 'rug_round', table_code: 'table_round', table_laptop: 'table', bed_platform: 'bed_canopy',
    sofa_studio: 'sofa_round', shelf_tech: 'shelf_house', window_loft: 'window_arch', window: 'window_arch', lamp_led: 'lamp_mushroom',
  };
  return { ...scene, version: 2, theme: 'cottage', period: 'auto',
    wall: !scene.wall || ['#A58F7E', '#30384D', '#FFF5DF'].includes(scene.wall.toUpperCase()) ? '#EBDDC5' : scene.wall,
    floor: !scene.floor || ['#C6B4A2', '#596078', '#DD9676'].includes(scene.floor.toUpperCase()) ? '#B99170' : scene.floor,
    decorations: scene.decorations.map(item => {
      const kind = kinds[item.kind] ?? item.kind;
      const defaultColor = !item.color || item.color === coderFurnitureColor(item.kind) || item.color === furnitureColor(item.kind);
      return { ...item, kind, color: kind !== item.kind && defaultColor ? coderFurnitureColor(kind) : item.color };
    }),
  };
}
export function coderRoom(scene: RoomScene): RoomScene {
  if (scene.theme === 'coder') return { ...scene, period: 'auto', furniturePalette: 2,
    wall: !scene.wall || scene.wall.toUpperCase() === '#30384D' ? '#A58F7E' : scene.wall,
    floor: !scene.floor || scene.floor.toUpperCase() === '#596078' ? '#C6B4A2' : scene.floor,
    decorations: scene.furniturePalette === 2 ? scene.decorations : scene.decorations.map(item => ({ ...item,
      color: item.color === undefined || ['#3B4561', '#7375E8', '#57CFDB', '#8391AF'].includes(item.color.toUpperCase()) ? coderFurnitureColor(item.kind) : item.color,
    })),
  };
  return { ...scene, version: 2, theme: 'coder', furniturePalette: 2, period: 'auto', wall: '#A58F7E', floor: '#C6B4A2', wallPattern: 'plain',
    decorations: scene.decorations.map(item => {
      const kind = item.kind.startsWith('rug') ? 'rug_grid' : item.kind === 'table' || item.kind === 'table_round' ? 'table_code' : item.kind === 'bed' ? 'bed_platform' : item.kind === 'sofa' || item.kind === 'sofa_round' ? 'sofa_studio' : item.kind;
      const color = coderFurnitureColor(kind);
      return { ...item, kind, color };
    }),
  };
}
export function makeRoomScene(room: string): RoomScene {
  const bedroom = /bed|นอน/i.test(room);
  return cottageRoom({ version: 2, period: 'auto', wall: '#EBDDC5', floor: '#B99170', decorations: [
    { id: 'starter-rug', kind: 'rug_round', x: 0.5, y: 0.79, color: '#A6B095' },
    { id: 'starter-main', kind: bedroom ? 'bed_canopy' : 'sofa_round', x: 0.42, y: 0.66, color: bedroom ? '#C6B69C' : '#94A78D' },
    { id: 'starter-table', kind: 'table_round', x: 0.63, y: 0.8, color: '#BB926A' },
    { id: 'starter-plant', kind: 'plant_flower', x: 0.76, y: 0.64, color: '#C5AF8A' },
    { id: 'starter-window', kind: 'window_arch', x: 0.63, y: 0.36, color: '#C6A87C' },
    { id: 'starter-lamp', kind: 'lamp_mushroom', x: 0.23, y: 0.73, color: '#C68765', scale: 0.8 },
  ] });
}
export function upgradeRoomScene(_room: string, scene: RoomScene): RoomScene {
  return cottageRoom(scene);
}
export function roomLight(period: RoomPeriod, hour: number) {
  const actual = period === 'auto' ? hour >= 6 && hour < 10 ? 'morning' : hour >= 10 && hour < 17 ? 'day' : hour >= 17 && hour < 19 ? 'evening' : 'night' : period;
  return {
    morning: { color: '#FFD996', opacity: 0.12, label: 'แสงเช้า' },
    day: { color: '#FFF5DF', opacity: 0.02, label: 'กลางวัน' },
    evening: { color: '#BA511E', opacity: 0.25, label: 'แสงเย็น' },
    night: { color: '#252447', opacity: 0.48, label: 'กลางคืน' },
  }[actual];
}
export function clampPosition(value: number) { return Math.max(0.1, Math.min(0.9, value)); }
export function validRoomScene(value: unknown): value is RoomScene {
  if (!value || typeof value !== 'object') return false;
  const v = value as RoomScene;
  const color = (c: unknown) => c === undefined || typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
  return ['auto', 'morning', 'day', 'evening', 'night'].includes(v.period) && (v.wallPattern === undefined || wallPatterns.some(p => p.id === v.wallPattern)) && (v.version === undefined || v.version === 2) && color(v.wall) && color(v.floor) && Array.isArray(v.decorations) && v.decorations.length <= 24 &&
    new Set(v.decorations.map(d => d?.id)).size === v.decorations.length && v.decorations.every(d => d && typeof d.id === 'string' && furnitureCatalog.some(f => f.kind === d.kind) && color(d.color) && (d.rotation === undefined || Number.isInteger(d.rotation) && d.rotation >= 0 && d.rotation <= 3) && (d.scale === undefined || Number.isFinite(d.scale) && d.scale >= 0.7 && d.scale <= 1.3) && Number.isFinite(d.x) && Number.isFinite(d.y) && d.x >= 0.1 && d.x <= 0.9 && d.y >= 0.1 && d.y <= 0.9 && (d.support === undefined || d.support !== null && isRoomDoll(d.kind) && Number.isFinite(d.support.u) && Number.isFinite(d.support.v) && onMattress(d.support.u, d.support.v) && v.decorations.some(b => b?.id === d.support!.id && typeof b.kind === 'string' && b.kind.startsWith('bed'))));
}
