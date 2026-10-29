const axios = require("axios");

const HA_URL = process.env.HA_URL || "http://localhost:8123";
const HA_TOKEN = process.env.HA_TOKEN;

const LIGHT_MODES = {
  task: { lux: 500, hs: [55, 2] },
  screen: { lux: 500, hs: [50, 25] },
  relax: { lux: 500, hs: [50, 40] },
};

const MODE_TH = { task: "ทำงาน", screen: "ดูจอ", relax: "พักผ่อน" };

function normalize(text) {
  return (text || "").toLowerCase().replace(/\s+/g, "");
}

function luxToBrightness(targetLux, maxLux = 620) {
  return Math.max(1, Math.min(255, Math.round((targetLux / maxLux) * 255)));
}

function resolveDevice(t, devices, currentRoom, lastLightEntity) {
  const isLight = t.includes("ไฟ");
  const isFan = t.includes("พัดลม");
  const scored = devices.map(d => {
    const name = normalize(d.name);
    let score = 0;
    if (t.includes(name)) score += 5;
    else if (name.split(" ").some(word => t.includes(word))) score += 3;
    if (t.includes("ห้อง") && name.includes("ห้อง")) {
      const roomWord = name.match(/ห้อง\S+/);
      if (roomWord && t.includes(roomWord[0])) score += 5;
    }
    if (isLight && d.id.startsWith("light.")) score += 2;
    if (isFan && name.includes("พัดลม")) score += 2;
    if (currentRoom && name.includes(normalize(currentRoom))) score += 4;
    return { device: d, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].score > 0 ? scored[0].device : null;
}

async function sendToHA(command) {
  const { action, entity_id, brightness, hs_color, delta } = command;
  const domain = entity_id.split(".")[0];
  let service = "turn_on";
  const data = { entity_id };

  if (action === "adjust_brightness") {
    try {
      const state = await axios.get(`${HA_URL}/api/states/${entity_id}`, {
        headers: { Authorization: `Bearer ${HA_TOKEN}` },
      });
      const currentBrightness = state.data.attributes.brightness || 0;
      const currentPercent = Math.round((currentBrightness / 255) * 100);
      const newPercent = Math.max(1, Math.min(100, currentPercent + delta));
      data.brightness = Math.round((newPercent / 100) * 255);
    } catch (err) {
      console.log("❌ GET BRIGHTNESS FAIL:", err.message);
      return;
    }
  } else {
    service = action === "off" ? "turn_off" : "turn_on";
    if (brightness !== undefined) data.brightness = brightness;
    if (hs_color !== undefined) data.hs_color = hs_color;
  }

  try {
    await axios.post(`${HA_URL}/api/services/${domain}/${service}`, data, {
      headers: { Authorization: `Bearer ${HA_TOKEN}`, "Content-Type": "application/json" },
    });
    console.log("✅ HA SUCCESS:", data);
  } catch (err) {
    console.log("❌ HA ERROR:", err.response?.data || err.message);
  }
}

async function handleRules(t, message, devices, res, context) {
  let { currentRoom, lastLightEntity } = context;

  if (t.includes("พักผ่อน") || t.includes("งีบ") || t.includes("จะนอน") || t.includes("ง่วง")) {
    const light = devices.find(d => d.id.startsWith("light."));
    if (light) {
      const mode = LIGHT_MODES.relax;
      const cmd = { action: "on", entity_id: light.id, brightness: luxToBrightness(mode.lux), hs_color: mode.hs, mode: "relax", delay: 0 };
      await sendToHA(cmd);
      return res.json({ commands: [cmd], speech: "ตั้งโหมดพักผ่อนให้แล้วครับ" });
    }
  }

  if (t.includes("ดูทีวี") || t.includes("ดูจอ") || t.includes("ดูหนัง")) {
    const light = devices.find(d => d.id.startsWith("light."));
    if (light) {
      const mode = LIGHT_MODES.screen;
      const cmd = { action: "on", entity_id: light.id, brightness: luxToBrightness(mode.lux), hs_color: mode.hs, mode: "screen", delay: 0 };
      await sendToHA(cmd);
      return res.json({ commands: [cmd], speech: "ตั้งโหมดดูจอให้แล้วครับ" });
    }
  }

  if (t.includes("ทำงาน") || t.includes("ประชุม")) {
    const light = devices.find(d => d.id.startsWith("light."));
    if (light) {
      const mode = LIGHT_MODES.task;
      const cmd = { action: "on", entity_id: light.id, brightness: luxToBrightness(mode.lux), hs_color: mode.hs, mode: "task", delay: 0 };
      await sendToHA(cmd);
      return res.json({ commands: [cmd], speech: "ตั้งโหมดทำงานให้แล้วครับ" });
    }
  }

  if (t.includes("กลับบ้าน") || t.includes("ถึงบ้าน")) {
    context.currentRoom = "ห้องนั่งเล่น";
    const d = devices.find(d => normalize(d.name).includes("ไฟ") && normalize(d.name).includes("ห้องนั่งเล่น"));
    if (!d) return res.json({ commands: [], speech: "ไม่พบไฟห้องนั่งเล่นครับ" });
    const cmd = { action: "on", entity_id: d.id, delay: 0 };
    await sendToHA(cmd);
    return res.json({ commands: [cmd], speech: "เปิดไฟห้องนั่งเล่นให้แล้วครับ" });
  }

  if (t.includes("ถึงห้องนอน")) {
    context.currentRoom = "ห้องนอน";
    const list = devices.filter(d => normalize(d.name).includes("ห้องนอน"));
    const cmds = list.map(d => ({ action: "on", entity_id: d.id, delay: 0 }));
    await Promise.all(cmds.map(c => sendToHA(c)));
    return res.json({ commands: cmds, speech: "เปิดอุปกรณ์ห้องนอนเรียบร้อยแล้วครับ" });
  }

  if (t.includes("ออกจากห้อง")) {
    const room = currentRoom || "ห้องนอน";
    const list = devices.filter(d => normalize(d.name).includes(normalize(room)));
    const cmds = list.map(d => ({ action: "off", entity_id: d.id, delay: 0 }));
    await Promise.all(cmds.map(c => sendToHA(c)));
    context.currentRoom = null;
    return res.json({ commands: cmds, speech: `ปิดอุปกรณ์ใน${room}เรียบร้อยแล้วครับ` });
  }

  if (t.includes("ออกจากบ้าน") || t.includes("ไปข้างนอก")) {
    const cmds = devices.filter(d => d.id.startsWith("light.") || d.id.startsWith("switch.") || d.id.startsWith("fan."))
      .map(d => ({ action: "off", entity_id: d.id, delay: 0 }));
    await Promise.all(cmds.map(c => sendToHA(c)));
    context.currentRoom = null;
    return res.json({ commands: cmds, speech: "ปิดทุกอุปกรณ์เรียบร้อยแล้วครับ" });
  }

  if (t.includes("สว่าง") || t.includes("เพิ่ม") || t.includes("หรี่") || t.includes("มืด") || t.includes("ลด")) {
    let guess = resolveDevice(t, devices, currentRoom, lastLightEntity) || (lastLightEntity ? { id: lastLightEntity } : null);
    if (guess && guess.id.startsWith("light.")) {
      const delta = (t.includes("ลด") || t.includes("หรี่") || t.includes("มืด") || t.includes("สว่างไป") || t.includes("สว่างเกิน")) ? -20 : 20;
      context.lastLightEntity = guess.id;
      await sendToHA({ action: "adjust_brightness", entity_id: guess.id, delta });
      return res.json({ commands: [{ action: "adjust_brightness", entity_id: guess.id, delta, delay: 0 }],
        speech: delta > 0 ? "เพิ่มความสว่างให้แล้วครับ" : "ลดความสว่างให้แล้วครับ" });
    }
  }

  if (t.includes("ร้อน") || t.includes("อากาศร้อน")) {
    const fan = devices.find(d => normalize(d.name).includes("พัดลม"));
    if (fan) {
      const cmd = { action: "on", entity_id: fan.id, delay: 0 };
      await sendToHA(cmd);
      return res.json({ commands: [cmd], speech: "เปิดพัดลมให้แล้วครับ" });
    }
  }

  if (t.includes("หนาว") || t.includes("เย็นไป")) {
    const fan = devices.find(d => normalize(d.name).includes("พัดลม"));
    if (fan) {
      const cmd = { action: "off", entity_id: fan.id, delay: 0 };
      await sendToHA(cmd);
      return res.json({ commands: [cmd], speech: "ปิดพัดลมให้แล้วครับ" });
    }
  }

  let action = t.includes("เปิด") ? "on" : t.includes("ปิด") ? "off" : null;
  if (action) {
    const guess = resolveDevice(t, devices, currentRoom, lastLightEntity);
    if (guess) {
      const cmd = { action, entity_id: guess.id, delay: 0 };
      if (guess.id.startsWith("light.")) {
        context.lastLightEntity = guess.id;
        const roomMatch = guess.name.match(/ห้อง\S+/);
        if (roomMatch) context.currentRoom = roomMatch[0];
      }
      await sendToHA(cmd);
      return res.json({ commands: [cmd], speech: action === "on" ? `เปิด${guess.name}เรียบร้อยแล้วครับ` : `ปิด${guess.name}เรียบร้อยแล้วครับ` });
    }
  }

  return res.json({ commands: [], speech: "ไม่เข้าใจคำสั่งครับ" });
}

module.exports = { handleRules, sendToHA, resolveDevice, normalize, luxToBrightness, LIGHT_MODES, MODE_TH };
