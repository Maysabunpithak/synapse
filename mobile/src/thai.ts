/** Display names only; navigation keys and API values remain unchanged. */
export const navigationLabels: Record<string, string> = {
  Home: "หน้าหลัก", Rooms: "ห้อง", AI: "ผู้ช่วย", Automation: "อัตโนมัติ",
  History: "ประวัติ", Settings: "ตั้งค่า", Setting: "ตั้งค่า",
};
export function thaiLabel(value: string) { return navigationLabels[value] || value; }

/** Preserve Thai server messages; avoid showing raw English SDK/network errors. */
export function thaiError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /[ก-๙]/.test(message) ? message : fallback;
}
