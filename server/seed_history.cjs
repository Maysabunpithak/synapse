const fs = require("fs");
const path = require("path");

const HISTORY_FILE = path.join(__dirname, "behavior_history.json");

// จำลองข้อมูลย้อนหลัง 14 วัน
const DAYS = 14;

const SCENARIOS = [
  // กลับบ้าน (18:00-19:30)
  { hour: 18, min: 10, entity: "light.a60_rgb_w_wifi",       action: "on",  voice: "กลับบ้านแล้ว" },
  { hour: 18, min: 12, entity: "light.a60_rgb_w_wifi",       action: "on",  voice: "เปิดไฟห้องนั่งเล่นโหมดพักผ่อน" },
  { hour: 19, min: 0,  entity: "light.a60_rgb_w_wifi",       action: "on",  voice: "เปิดไฟห้องนั่งเล่นโหมดทำงาน" },
  { hour: 19, min: 5,  entity: "light.a60_rgb_w_wifi",       action: "on",  voice: "เพิ่มความสว่าง", ai_action: "adjust_brightness" },
  // เข้าห้องนอน (21:00-22:30)
  { hour: 21, min: 30, entity: "switch.smart_plug_socket_1", action: "on",  voice: "ถึงห้องนอนแล้ว" },
  { hour: 21, min: 31, entity: "switch.tapo_p100",           action: "on",  voice: "ถึงห้องนอนแล้ว" },
  { hour: 21, min: 35, entity: "light.a60_rgb_w_wifi",       action: "off", voice: "ออกจากห้องนั่งเล่น" },
  // ออกจากห้องนอน (07:00-08:00)
  { hour: 7,  min: 15, entity: "switch.smart_plug_socket_1", action: "off", voice: "ออกจากห้อง" },
  { hour: 7,  min: 16, entity: "switch.tapo_p100",           action: "off", voice: "ออกจากห้อง" },
  // ออกจากบ้าน (08:00-09:00)
  { hour: 8,  min: 0,  entity: "light.a60_rgb_w_wifi",       action: "off", voice: "ออกจากบ้าน" },
  { hour: 8,  min: 1,  entity: "switch.smart_plug_socket_1", action: "off", voice: "ออกจากบ้าน" },
  { hour: 8,  min: 2,  entity: "switch.tapo_p100",           action: "off", voice: "ออกจากบ้าน" },
  // ดูทีวีตอนเย็น (20:00-21:00)
  { hour: 20, min: 0,  entity: "light.a60_rgb_w_wifi",       action: "on",  voice: "เปิดไฟห้องนั่งเล่นโหมดดูจอ" },
  { hour: 20, min: 5,  entity: "light.a60_rgb_w_wifi",       action: "on",  voice: "ลดความสว่าง", ai_action: "adjust_brightness" },
];

const history = [];

const now = new Date();

for (let d = DAYS; d >= 1; d--) {
  for (const s of SCENARIOS) {
    // สุ่ม offset เล็กน้อยให้ดูเป็นธรรมชาติ
    const minOffset = Math.floor(Math.random() * 5);
    const secOffset = Math.floor(Math.random() * 59);

    const ts = new Date(now);
    ts.setDate(ts.getDate() - d);
    ts.setHours(s.hour, s.min + minOffset, secOffset, 0);

    history.push({
      timestamp: ts.toISOString(),
      voice_input: s.voice,
      ai_action: s.ai_action || s.action,
      entity_id: s.entity,
      actual_result: s.action === "on" ? "เปิด" : s.action === "off" ? "ปิด" : s.ai_action || s.action,
      success: true,
    });
  }
}

// เรียงตาม timestamp
history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

console.log(`✅ สร้างข้อมูลสำเร็จ ${history.length} records → ${HISTORY_FILE}`);
console.log("   ครอบคลุม", DAYS, "วัน ย้อนหลัง");
console.log("   light.a60_rgb_w_wifi      :", history.filter(h => h.entity_id === "light.a60_rgb_w_wifi").length, "records");
console.log("   switch.smart_plug_socket_1:", history.filter(h => h.entity_id === "switch.smart_plug_socket_1").length, "records");
console.log("   switch.tapo_p100          :", history.filter(h => h.entity_id === "switch.tapo_p100").length, "records");
