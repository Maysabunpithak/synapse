export type Point = { x: number; y: number };
export type Obstacle = { x: number; y: number; width: number; height: number };
export const CARETAKER_RAMP_MS = 700;
// All sprites share the same ground-depth scale, independent of their height.
export function groundLayer(groundY: number) { return 100 + Math.round(groundY * 10); }
export function furnitureLayer(kind: string, anchorY: number, size: number) {
  if (kind.startsWith('window')) return 0;
  if (kind.startsWith('rug')) return 1;
  return groundLayer(anchorY + size * 0.035);
}
export type RoomTask = 'water' | 'read' | 'look' | 'sit' | 'sleep';
export type Destination = { x: number; y: number; activity: 'awake' | 'rest' | 'attentive'; dwell: number; bedId?: string; task?: RoomTask; targetId?: string; reachPoint?: Point };
export type CaretakerLeg = { path: Point[]; activity: Destination['activity']; dwell: number; length: number; bedId?: string; task?: RoomTask; targetId?: string };
const defaultDestinations: Destination[] = [
  { x: 0.25, y: 0.72, activity: 'awake', dwell: 3200 },
  { x: 0.72, y: 0.68, activity: 'attentive', dwell: 4200 },
  { x: 0.32, y: 0.82, activity: 'rest', dwell: 6500 },
  { x: 0.64, y: 0.84, activity: 'awake', dwell: 3000 },
  { x: 0.5, y: 0.58, activity: 'attentive', dwell: 4000 },
];

export function furnitureFootprint(kind: string, x: number, y: number, size: number): Obstacle | null {
  if (kind.startsWith('rug') || kind.startsWith('window')) return null;
  const wide = kind.startsWith('bed') || kind.startsWith('sofa') || kind.startsWith('table') || kind.startsWith('shelf');
  const width = size * (wide ? 0.76 : 0.5);
  const depth = size * (kind.startsWith('bed') ? 0.34 : wide ? 0.24 : 0.16);
  return { x: x - width / 2, y: y - depth, width, height: depth + size * 0.035 };
}

export function caretakerFeet(p: Point, size: number): Obstacle {
  // Includes the forward foot at its widest stride, not just the standing pose.
  return { x: p.x + size * 0.3, y: p.y + size * 0.84, width: size * 0.55, height: size * 0.14 };
}

export function caretakerClearance(size: number) { return Math.max(4, Math.min(7, size * 0.075)); }

function obstacleDistance(p: Point, size: number, obstacles: readonly Obstacle[]) {
  const feet = caretakerFeet(p, size);
  return obstacles.reduce((nearest, o) => Math.min(nearest, Math.hypot(Math.max(o.x - feet.x - feet.width, feet.x - o.x - o.width, 0), Math.max(o.y - feet.y - feet.height, feet.y - o.y - o.height, 0))), 40);
}

export function clearCaretakerPosition(p: Point, size: number, width: number, height: number, obstacles: readonly Obstacle[]) {
  if (!width || !height || p.y < 0) return false;
  // Feet stay inside the isometric floor, including a margin on both sides.
  const floorY = (p.y + size * 0.94) / height;
  for (const footX of [p.x + size * 0.2, p.x + size * 0.8]) {
    if (Math.abs(footX / width - 0.5) / (260 / 600) + Math.abs(floorY - 324 / 460) / (105 / 460) > 0.97) return false;
  }
  const feet = caretakerFeet(p, size);
  const gap = caretakerClearance(size);
  return !obstacles.some(o => feet.x < o.x + o.width + gap && feet.x + feet.width > o.x - gap && feet.y < o.y + o.height + gap && feet.y + feet.height > o.y - gap);
}

/** Connected floor navigation with swept-foot checks on every graph edge. */
export function planCaretaker(width: number, height: number, size: number, obstacles: readonly Obstacle[], destinations: readonly Destination[] = defaultDestinations): CaretakerLeg[] {
  if (width <= 0 || height <= 0) return [];
  const step = 6;
  const cols = Math.floor((width - size) / step) + 1;
  const rows = Math.floor((height - size) / step) + 1;
  const points = new Map<number, Point>();
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const p = { x: x * step, y: y * step };
    if (clearCaretakerPosition(p, size, width, height, obstacles)) points.set(y * cols + x, p);
  }
  const edges = new Map<number, number[]>();
  function neighbors(id: number) {
    if (edges.has(id)) return edges.get(id)!;
    const x = id % cols, y = Math.floor(id / cols);
    const result: number[] = [];
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const nx = x + dx, ny = y + dy, n = ny * cols + nx;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && points.has(n) && clearSegment(points.get(id)!, points.get(n)!, size, width, height, obstacles)) result.push(n);
    }
    edges.set(id, result);
    return result;
  }
  function comfortableRoute(start: number, end: number) {
    const open = [{ id: start, cost: 0 }];
    const costs = new Map<number, number>([[start, 0]]);
    const parents = new Map<number, number>([[start, start]]);
    while (open.length) {
      open.sort((a, b) => b.cost - a.cost);
      const current = open.pop()!;
      if (current.cost !== costs.get(current.id)) continue;
      if (current.id === end) break;
      for (const id of neighbors(current.id)) {
        const a = points.get(current.id)!, b = points.get(id)!;
        const clearance = obstacleDistance(b, size, obstacles);
        const cost = current.cost + Math.hypot(a.x - b.x, a.y - b.y) * (1 + 12 / (clearance + 2));
        if (cost < (costs.get(id) ?? Infinity)) { costs.set(id, cost); parents.set(id, current.id); open.push({ id, cost }); }
      }
    }
    return parents;
  }
  function search(start: number) {
    const queue = [start];
    const parents = new Map<number, number>([[start, start]]);
    for (let i = 0; i < queue.length; i++) for (const next of neighbors(queue[i])) {
      if (!parents.has(next)) { parents.set(next, queue[i]); queue.push(next); }
    }
    return { queue, parents, end: queue[queue.length - 1] };
  }
  const visited = new Set<number>();
  let largest: number[] = [];
  const reachPoints = destinations.flatMap(target => target.reachPoint ? [target.reachPoint] : []);
  const componentScore = (component: number[]) => component.length + reachPoints.filter(target => component.some(id => {
    const p = points.get(id)!;
    return Math.hypot(target.x - p.x - size * 0.5, target.y - p.y - size * 0.58) <= size * 0.95;
  })).length * (points.size + 1);
  for (const id of points.keys()) {
    if (visited.has(id)) continue;
    const component = search(id).queue;
    component.forEach(n => visited.add(n));
    if (componentScore(component) > componentScore(largest)) largest = component;
  }
  if (!largest.length) return [];
  const targets = destinations.length ? destinations : defaultDestinations;
  const anchors = targets.map(({ x, y, reachPoint }) => largest.reduce((best, id) => {
    const score = (n: number) => {
      const p = points.get(n)!;
      if (reachPoint) {
        // Walk to a safe spot beside the pot at hand height, on either side.
        const dx = Math.abs(reachPoint.x - (p.x + size * 0.5));
        const dy = reachPoint.y - (p.y + size * 0.58);
        return Math.abs(dx - size * 0.55) + Math.abs(dy) * 1.3 + 3 / (obstacleDistance(p, size, obstacles) + 2);
      }
      return Math.hypot(p.x + size / 2 - width * x, p.y + size * 0.94 - height * y) + 60 / (obstacleDistance(p, size, obstacles) + 2);
    };
    return score(id) < score(best) ? id : best;
  }, largest[0]));
  const legs: CaretakerLeg[] = [];
  let start = anchors[0];
  for (let index = 1; index <= anchors.length; index++) {
    const end = anchors[index % anchors.length];
    if (end === start) {
      const target = targets[index % targets.length];
      if (target.bedId || target.task) legs.push({ path: [points.get(start)!], activity: target.activity, dwell: target.dwell, length: 0, bedId: target.bedId, task: target.task, targetId: target.targetId });
      continue;
    }
    const parents = comfortableRoute(start, end);
    const segment: Point[] = [];
    for (let id = end; id !== start;) { segment.push(points.get(id)!); id = parents.get(id)!; }
    const path = smoothCaretakerPath([points.get(start)!, ...segment.reverse()], size, width, height, obstacles);
    const target = targets[index % targets.length];
    legs.push({ path, activity: target.activity, dwell: target.dwell, length: pathLength(path), bedId: target.bedId, task: target.task, targetId: target.targetId });
    start = end;
  }
  return legs.length ? legs : [{ path: [points.get(start)!], activity: 'awake', dwell: 5000, length: 0 }];
}

export function pathLength(path: readonly Point[]) {
  return path.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - path[i].x, p.y - path[i].y), 0);
}

export function caretakerPath(width: number, height: number, size: number, obstacles: readonly Obstacle[]): Point[] {
  return planCaretaker(width, height, size, obstacles).flatMap((leg, i) => i ? leg.path.slice(1) : leg.path);
}

function clearSegment(a: Point, b: Point, size: number, width: number, height: number, obstacles: readonly Obstacle[]) {
  if (!clearCaretakerPosition(a, size, width, height, obstacles) || !clearCaretakerPosition(b, size, width, height, obstacles)) return false;
  // Exact swept-foot intersection catches even tiny corner cuts between frames.
  for (const o of obstacles) {
    const gap = caretakerClearance(size);
    const feet = caretakerFeet({ x: 0, y: 0 }, size);
    const bounds = [[o.x - gap - feet.x - feet.width, o.x + o.width + gap - feet.x, a.x, b.x - a.x], [o.y - gap - feet.y - feet.height, o.y + o.height + gap - feet.y, a.y, b.y - a.y]];
    let enter = 0, leave = 1;
    for (const [min, max, origin, delta] of bounds) {
      if (Math.abs(delta) < 1e-9) { if (origin <= min || origin >= max) { enter = 2; break; } }
      else {
        const t1 = (min - origin) / delta, t2 = (max - origin) / delta;
        enter = Math.max(enter, Math.min(t1, t2)); leave = Math.min(leave, Math.max(t1, t2));
      }
    }
    if (enter < leave && enter <= 1 && leave >= 0) return false;
  }
  return true;
}

export function smoothCaretakerPath(path: readonly Point[], size: number, width: number, height: number, obstacles: readonly Obstacle[]): Point[] {
  if (path.length < 3) return [...path];
  const comfortObstacles = obstacles.map(o => ({ x: o.x - 3, y: o.y - 3, width: o.width + 6, height: o.height + 6 }));
  const simple = [path[0]];
  for (let i = 0; i < path.length - 1;) {
    let next = path.length - 1;
    while (next > i + 1 && !clearSegment(path[i], path[next], size, width, height, comfortObstacles)) next--;
    simple.push(path[next]); i = next;
  }
  const rounded = [simple[0]];
  for (let i = 1; i < simple.length - 1; i++) {
    const a = simple[i - 1], b = simple[i], c = simple[i + 1];
    const before = Math.hypot(b.x - a.x, b.y - a.y), after = Math.hypot(c.x - b.x, c.y - b.y);
    let accepted = false;
    for (const preferred of [26, 18, 12, 7, 3]) {
    const radius = Math.min(preferred, before * 0.35, after * 0.35);
    const entry = { x: b.x + (a.x - b.x) * radius / before, y: b.y + (a.y - b.y) * radius / before };
    const exit = { x: b.x + (c.x - b.x) * radius / after, y: b.y + (c.y - b.y) * radius / after };
    const curve = Array.from({ length: 13 }, (_, j) => {
      const t = j / 12, u = 1 - t;
      return { x: u * u * entry.x + 2 * u * t * b.x + t * t * exit.x, y: u * u * entry.y + 2 * u * t * b.y + t * t * exit.y };
    });
    const safe = curve.every((p, j) => clearSegment(j ? curve[j - 1] : rounded[rounded.length - 1], p, size, width, height, obstacles));
    if (safe) { rounded.push(...curve); accepted = true; break; }
    }
    if (!accepted) rounded.push(b);
  }
  rounded.push(simple[simple.length - 1]);
  return rounded;
}

/** Constant cruising speed with short acceleration/braking ramps at each stop. */
export function sampleCaretakerLife(legs: readonly CaretakerLeg[], elapsed: number, speed: number) {
  if (!legs.length) return null;
  const ramp = CARETAKER_RAMP_MS;
  const durations = legs.map(leg => leg.length > 0 ? leg.length / speed * 1000 + ramp : 0);
  const total = legs.reduce((sum, leg, i) => sum + durations[i] + leg.dwell, 0);
  let time = Math.max(0, elapsed) % total;
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i], duration = durations[i];
    if (time >= duration + leg.dwell && i < legs.length - 1) { time -= duration + leg.dwell; continue; }
    const t = Math.min(time, duration);
    const r = Math.min(ramp, duration / 2);
    const accelerationDistance = (time: number) => time / 2 - r * Math.sin(Math.PI * time / r) / (2 * Math.PI);
    const distance = duration === 0 ? 0 : leg.length * (t < r ? accelerationDistance(t) : t > duration - r ? duration - r - accelerationDistance(duration - t) : t - r / 2) / (duration - r);
    const position = time >= duration ? leg.path[leg.path.length - 1] : pointOnCaretakerPath(leg.path, distance)!;
    const ahead = pointOnCaretakerPath(leg.path, Math.min(leg.length, distance + 12))!;
    const behind = pointOnCaretakerPath(leg.path, Math.max(0, distance - 12))!;
    const dx = ahead.x - behind.x, dy = ahead.y - behind.y;
    const moving = time < duration && leg.length > 0;
    const blend = moving ? Math.max(0, Math.min(t / r, (duration - t) / r, 1)) : 0;
    return { position, distance, moving, activity: leg.activity, restElapsed: Math.max(0, time - duration), restDuration: leg.dwell, bedId: leg.bedId, task: leg.task, targetId: leg.targetId, settled: time >= duration + 300, preparing: time >= duration + leg.dwell - 700, walkWeight: blend * blend * (3 - 2 * blend), headingX: dx / (Math.hypot(dx, dy) || 1), leg: i };
  }
  return null;
}

export function bedRestPose(ground: Point, mattress: Point, elapsed: number, duration: number, jumpUp = false) {
  const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * t * (t * (t * 6 - 15) + 10); };
  // Lift directly into a seated pose; no extra backwards walking or waking pose.
  const climbTime = Math.min(Math.max(0, elapsed), Math.max(0, duration - elapsed) * 1.2);
  const ascendingJump = jumpUp && elapsed < duration - 2700;
  const descending = jumpUp && elapsed >= duration - 2700;
  const downTime = Math.max(0, elapsed - (duration - 2700));
  const firstStep = smooth((downTime - 350) / 1000);
  const secondStep = smooth((downTime - 1350) / 1000);
  const amount = descending ? 1 - firstStep * 0.55 - secondStep * 0.45 : ascendingJump ? smooth((elapsed - 400) / 1400) : smooth(climbTime / 2200);
  const pulse = (start: number, length: number) => {
    const t = Math.max(0, Math.min(1, (elapsed - start) / length));
    return t === 0 || t === 1 ? 0 : Math.sin(t * Math.PI) ** 2;
  };
  const crouch = ascendingJump ? pulse(0, 400) : 0;
  const landing = ascendingJump ? pulse(1800, 450) : 0;
  const air = ascendingJump ? Math.sin(Math.PI * amount) ** 2 : 0;
  const jumpHeight = Math.min(28, Math.max(18, Math.hypot(mattress.x - ground.x, mattress.y - ground.y) * 0.25));
  const activity: 'awake' | 'rest' | 'sleep' = descending && downTime >= 2350 ? 'awake' : elapsed < 2900 || elapsed > duration - 2700 ? 'rest' : 'sleep';
  const walkWeight = descending ? smooth(downTime / 350) * (1 - smooth((downTime - 2350) / 350)) : 0;
  return { position: { x: ground.x + (mattress.x - ground.x) * amount, y: ground.y + (mattress.y - ground.y) * amount - jumpHeight * air }, amount, activity, walkWeight, layerBlend: smooth((amount - 0.18) / 0.5), stepDistance: descending ? Math.hypot(mattress.x - ground.x, mattress.y - ground.y) * (1 - amount) : 0, stepTime: descending ? (firstStep + secondStep) * 500 : undefined, descending, squash: crouch * 0.12 + landing * 0.09, air };
}

export function pointOnCaretakerPath(path: readonly Point[], distance: number): Point | null {
  if (!path.length) return null;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (distance <= length) {
      const t = Math.max(0, distance) / length;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    distance -= length;
  }
  return path[path.length - 1];
}
