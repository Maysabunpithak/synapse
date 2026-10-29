export function pinchScale(initial: number, startDistance: number, distance: number) {
  return startDistance > 0 && Number.isFinite(distance) ? Math.max(0.7, Math.min(1.3, initial * distance / startDistance)) : initial;
}
export type RoomBounds = { x: number; y: number; width: number; height: number };
// The room's wall edges rise/fall 100 units over 260 in a 600 x 460 scene.
export function windowWallSlope(x: number, width: number, height: number) {
  return width > 0 ? (x < 0.5 ? -1 : 1) * (100 / 260) * (600 / 460) * height / width : 0;
}
export function roomDrop(bounds: RoomBounds | null, x: number, y: number) {
  if (!bounds || bounds.width <= 0 || bounds.height <= 0 || !Number.isFinite(x) || !Number.isFinite(y) || x < bounds.x || y < bounds.y || x > bounds.x + bounds.width || y > bounds.y + bounds.height) return null;
  return { x: Math.max(0.1, Math.min(0.9, (x - bounds.x) / bounds.width)), y: Math.max(0.1, Math.min(0.9, (y - bounds.y) / bounds.height)) };
}
