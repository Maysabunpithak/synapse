import type { RobotMood } from "./robotMood";

export const HOUSE_DANCE_MS = 8600;
export const HOUSE_LAP_MS = 8000;
export const HOUSE_SLEEP_AFTER_MS = HOUSE_LAP_MS + 5000;
export const HOUSE_IDLE_CYCLE_MS = HOUSE_SLEEP_AFTER_MS + 23000;
export type HouseActivity = "awake" | "walk-right" | "walk-left" | "swagger" | "rest" | "sleep" | "waking" | "attentive" | "dance";

export function celebrationRemaining(outcome: "success" | "error" | null, successAt: number, now: number) {
  if (outcome !== "success" || successAt <= 0) return 0;
  return Math.max(0, Math.min(HOUSE_DANCE_MS, successAt + HOUSE_DANCE_MS - now));
}

export function houseActivity(mood: RobotMood, active: boolean, touching: boolean, idleMs: number, motion = true): HouseActivity {
  // Only the success window plays the celebration animation.
  if (mood === "success") return "dance";
  if (active || mood !== "idle") return "attentive";
  if (touching) return "waking";
  idleMs = Math.max(0, idleMs) % HOUSE_IDLE_CYCLE_MS;
  if (!motion) return "awake";
  // Face the tangent of the oval: left on the outer quarters, right in between.
  if (idleMs < HOUSE_LAP_MS) return idleMs < HOUSE_LAP_MS / 4 || idleMs >= HOUSE_LAP_MS * 3 / 4 ? "walk-left" : "walk-right";
  if (idleMs < HOUSE_SLEEP_AFTER_MS) return "rest";
  return idleMs < HOUSE_IDLE_CYCLE_MS - 3000 ? "sleep" : "waking";
}

export function houseSwaggerFrame(idleMs: number) {
  const cycle = Math.max(0, idleMs) % HOUSE_IDLE_CYCLE_MS;
  const age = Math.max(0, cycle - (cycle >= 39000 ? 39000 : 18000));
  if (age < 300) return 0;
  if (age < 650) return 1;
  if (age < 1650) return 2;
  if (age < 2000) return 1;
  if (age < 2300) return 0;
  return 3;
}

export function houseFrame(activity: HouseActivity, elapsed: number) {
  // Legacy atlas indices; active companion states now share SynapsePose artwork.
  if (activity === "rest") return 9;
  if (activity === "sleep") return 10;
  if (activity === "waking" || activity === "dance") return 11;
  return 8;
}
