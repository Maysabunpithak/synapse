export type RobotMood = "idle" | "listening" | "thinking" | "speaking" | "success" | "error";
export const robotMoods: Record<RobotMood, { frame: number; label: string; title: string }> = {
  idle: { frame: 0, label: "พร้อมช่วยคุณเสมอ", title: "วันนี้ให้ช่วยอะไรดี?" },
  listening: { frame: 1, label: "กำลังฟังคุณอยู่", title: "พูดได้เลยค่ะ" },
  thinking: { frame: 2, label: "กำลังประมวลผล", title: "กำลังดูแลให้ค่ะ" },
  speaking: { frame: 3, label: "กำลังตอบกลับ", title: "ฟังคำตอบได้เลยค่ะ" },
  success: { frame: 4, label: "ส่งคำสั่งสำเร็จ", title: "เรียบร้อยแล้วค่ะ" },
  error: { frame: 5, label: "ต้องการให้คุณช่วยตรวจสอบ", title: "ลองอีกครั้งได้นะคะ" },
};
export function resolveRobotMood(input: { listening: boolean; busy: boolean; speaking: boolean; outcome: "success" | "error" | null; celebrating: boolean }): RobotMood {
  if (input.listening) return "listening";
  if (input.outcome === "error") return "error";
  if (input.celebrating && input.outcome === "success") return "success";
  if (input.speaking) return "speaking";
  if (input.busy) return "thinking";
  return "idle";
}
