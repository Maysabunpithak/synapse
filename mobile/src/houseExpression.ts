import type { HouseActivity } from "./houseBehavior";
import type { RobotMood } from "./robotMood";

export function houseExpression(activity: HouseActivity, mood: RobotMood = "idle") {
  if (activity === "dance" || mood === "success") return 7;
  if (mood === "error") return 8;
  if (mood === "listening") return 4;
  if (mood === "thinking") return 5;
  if (mood === "speaking") return 6;
  if (activity === "sleep") return 2;
  if (activity === "rest") return 1;
  if (activity === "waking") return 3;
  if (activity === "attentive") return 4;
  return 0;
}
