export const WALK_CYCLE_MS = 1000;
type Point = { x: number; y: number };

function leg(phase: number, hip: Point, centerX: number, floor: number, stride: number) {
  // A short overlap with both feet grounded gives each step a clear landing.
  const swingDuration = 0.4;
  const swing = phase < swingDuration;
  const progress = swing ? phase / swingDuration : (phase - swingDuration) / (1 - swingDuration);
  const forward = swing ? -Math.cos(Math.PI * progress) : 1 - 2 * progress;
  const lift = swing ? Math.sin(Math.PI * progress) ** 2 * 21 : 0;
  const ankle = { x: centerX + forward * stride, y: floor - lift };
  const dx = ankle.x - hip.x, dy = ankle.y - hip.y;
  const distance = Math.max(0.01, Math.hypot(dx, dy));
  const bend = Math.sqrt(Math.max(0, 31 * 31 - distance * distance / 4));
  const knee = { x: (hip.x + ankle.x) / 2 + dy / distance * bend,
    y: (hip.y + ankle.y) / 2 - dx / distance * bend };
  return { hip, knee, ankle, lift, forward, planted: !swing,
    footAngle: swing ? -24 * Math.sin(Math.PI * progress) : 0 };
}

/** Opposite half-cycles: one foot swings while the other supports the body. */
export function houseGait(elapsed: number) {
  const phase = ((elapsed % WALK_CYCLE_MS) + WALK_CYCLE_MS) % WALK_CYCLE_MS / WALK_CYCLE_MS;
  const bodyY = 2 * Math.cos(phase * Math.PI * 4);
  const left = leg(phase, { x: 98, y: 142 + bodyY }, 100, 191, 20);
  const right = leg((phase + 0.5) % 1, { x: 128, y: 134 + bodyY }, 129, 185, 20);
  return { phase, bodyY, left, right,
    leftHand: { x: 45 - left.forward * 13, y: 135 + Math.abs(left.forward) * 3 + bodyY },
    rightHand: { x: 166 - right.forward * 13, y: 116 + Math.abs(right.forward) * 3 + bodyY } };
}
