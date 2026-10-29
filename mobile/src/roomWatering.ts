import { furnitureCatalog, type Decoration } from './roomScene';

export function plantWaterPoint(plant: Decoration, width: number, height: number) {
  const size = width * furnitureCatalog.find(item => item.kind === plant.kind)!.size * (plant.scale ?? 1);
  const u = (plant.rotation ?? 0) % 2 ? 69 / 140 : 71 / 140;
  const rim = plant.kind === 'plant_flower' ? 91 : 83;
  return { x: plant.x * width + (u - 0.5) * size, y: plant.y * height + (rim / 140 - 0.86) * size };
}

export function wateringArc(target: { x: number; y: number }, left: boolean) {
  const end = { x: left ? 100 - target.x : target.x, y: target.y };
  const offset = { x: Math.max(-16, Math.min(28, end.x - 105)), y: Math.min(0, end.y - 78) };
  const angle = 18 * Math.PI / 180;
  const start = { x: offset.x + 77 + 18 * Math.cos(angle) + 7 * Math.sin(angle), y: offset.y + 61 + 18 * Math.sin(angle) - 7 * Math.cos(angle) };
  const control = { x: start.x + (end.x - start.x) * 0.7, y: start.y + 2 };
  return { start, control, end, offset };
}

export function waterDrop(arc: ReturnType<typeof wateringArc>, t: number) {
  const u = 1 - t;
  return { x: u * u * arc.start.x + 2 * u * t * arc.control.x + t * t * arc.end.x,
    y: u * u * arc.start.y + 2 * u * t * arc.control.y + t * t * arc.end.y };
}
