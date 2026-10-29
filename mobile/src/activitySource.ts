export type ActivitySource = "manual" | "voice" | "scene" | "switch" | "automatic" | "command" | "unknown" | "profile";

/** Preserve uncertainty in old logs: switch included mobile taps, AI included scenes. */
export function activitySource(entry: { source?: string; voice_input?: string; simulated_source?: string }): { kind: ActivitySource; label: string } {
  if (entry.source === "sample") {
    if (entry.simulated_source === "manual") return { kind: "manual", label: "กดเอง" };
    if (entry.simulated_source === "voice") return { kind: "voice", label: "สั่งด้วยเสียง" };
    if (entry.simulated_source === "automatic") return { kind: "automatic", label: "อัตโนมัติ" };
    return { kind: "profile", label: "ไม่ระบุวิธีสั่งงาน" };
  }
  if (entry.source === "automatic") return { kind: "automatic", label: "อัตโนมัติ" };
  if (entry.source === "voice") return { kind: "voice", label: "สั่งด้วยเสียง" };
  if (entry.source === "scene") return { kind: "scene", label: "กดโหมดการใช้งาน" };
  if (["ui", "mobile", "manual"].includes(entry.source || "")) return { kind: "manual", label: "กดในแอป" };
  const input = entry.voice_input?.trim();
  if (["ui-toggle", "mobile-light-control", "feedback-negative"].includes(input || "")) return { kind: "manual", label: "กดเอง / ปรับในแอป" };
  if (input === "switch") return { kind: "switch", label: "สวิตช์ / ปุ่มแอปเดิม" };
  if (["phone-home-trigger", "auto-schedule"].includes(input || "")) return { kind: "automatic", label: "อัตโนมัติ" };
  if (input) return { kind: "command", label: "คำสั่งเสียง / ผู้ช่วย" };
  return { kind: "unknown", label: "ไม่ระบุวิธีสั่งงาน" };
}
