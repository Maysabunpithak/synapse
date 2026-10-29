require("dotenv").config();
const express = require("express");
const { getAIConfig, generateText } = require("./ai_provider.cjs");
const fs = require("fs");
const path = require("path");
const { handleRules, sendToHA, resolveDevice, normalize, luxToBrightness, LIGHT_MODES, MODE_TH } = require("./ai_fallback.cjs");

const app = express();
app.use(express.json());

const aiConfig = getAIConfig();
const HA_URL = process.env.HA_URL || "http://localhost:8123";
const HA_TOKEN = process.env.HA_TOKEN;

if (!aiConfig.apiKey) { console.error(`❌ ${aiConfig.keyName} not found`); process.exit(1); }
if (!HA_TOKEN) { console.error("❌ HA_TOKEN not found"); process.exit(1); }

// ราคา Gemini 2.5 Flash ($ ต่อ 1 ล้าน tokens)
const PRICE_INPUT_PER_M  = aiConfig.priceInput;
const PRICE_OUTPUT_PER_M = aiConfig.priceOutput;
const THB_PER_USD = 35;

const COST_LOG_FILE = path.join(__dirname, "ai_cost_log.json");
const COST_CSV_FILE = path.join(__dirname, "ai_cost_log.csv");
const COST_CSV_COLUMNS = [
  "timestamp",
  "model",
  "input_tokens",
  "output_tokens",
  "total_tokens",
  "price_input_usd_per_million",
  "price_output_usd_per_million",
  "cost_usd",
  "estimated_cost_thb",
  "latency_sec",
];

function loadCostLog() {
  try { return JSON.parse(fs.readFileSync(COST_LOG_FILE, "utf-8")); }
  catch { return []; }
}

function escapeCsvValue(value) {
  if (value === undefined || value === null) return "";
  const text = String(value).replace(/\r?\n/g, " ");
  return /[",]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function getCostCsv(log = loadCostLog()) {
  const rows = log.map((entry) => {
    const row = {
      timestamp: entry.timestamp,
      model: entry.model,
      input_tokens: entry.input_tokens,
      output_tokens: entry.output_tokens,
      total_tokens: entry.total_tokens,
      price_input_usd_per_million: entry.price_input,
      price_output_usd_per_million: entry.price_output,
      cost_usd: entry.cost_usd,
      estimated_cost_thb: entry.cost_usd == null ? null : Number((entry.cost_usd * THB_PER_USD).toFixed(6)),
      latency_sec: entry.latency_sec,
    };
    return COST_CSV_COLUMNS.map((column) => escapeCsvValue(row[column])).join(",");
  });
  // The UTF-8 BOM lets Excel on Windows display Thai text correctly.
  return `\uFEFF${COST_CSV_COLUMNS.join(",")}\r\n${rows.join("\r\n")}\r\n`;
}

function writeCostCsv(log = loadCostLog()) {
  fs.writeFileSync(COST_CSV_FILE, getCostCsv(log), "utf-8");
}

function saveCostEntry(entry) {
  const log = loadCostLog();
  log.push(entry);
  fs.writeFileSync(COST_LOG_FILE, JSON.stringify(log, null, 2));
  writeCostCsv(log);
}

writeCostCsv();

let lastLightEntity = null;
let currentRoom = null;

// Common imperative commands do not need an LLM round trip. This keeps a
// spoken "เปิดไฟห้องนอน" as quick as a button press while leaving ambiguous
// requests, scenes and natural conversation to the AI provider.
async function tryFastDeviceCommand(t, devices, context) {
  const match = /^(?:ช่วย)?(เปิด|ปิด)/.exec(t);
  if (!match) return null;
  const device = resolveDevice(t, devices, context.currentRoom, context.lastLightEntity);
  if (!device) return null;

  const action = match[1] === "เปิด" ? "on" : "off";
  const command = { action, entity_id: device.id, delay: 0 };
  await sendToHA(command);

  if (device.id.startsWith("light.")) {
    context.lastLightEntity = device.id;
    const room = device.name.match(/ห้อง\S+/)?.[0];
    if (room) context.currentRoom = room;
  }
  return {
    commands: [command],
    speech: action === "on" ? `เปิด${device.name}เรียบร้อยแล้วค่ะ` : `ปิด${device.name}เรียบร้อยแล้วค่ะ`,
  };
}

async function callAI(prompt, retry = 3) {
  const startTime = Date.now();
  try {
    const result = await generateText(prompt);

    const latency = ((Date.now() - startTime) / 1000).toFixed(4);
    const { inputTokens, outputTokens, totalTokens } = result;
    const totalCost = result.priceInput == null || result.priceOutput == null ? null
      : (inputTokens * result.priceInput + outputTokens * result.priceOutput) / 1_000_000;

    saveCostEntry({
      timestamp:     new Date().toISOString(),
      model:         result.model,
      provider:      result.provider,
      fallback_from: result.fallbackFrom || null,
      input_tokens:  inputTokens,
      output_tokens: outputTokens,
      total_tokens:  totalTokens,
      price_input:   result.priceInput,
      price_output:  result.priceOutput,
      cost_usd:      totalCost === null ? null : parseFloat(totalCost.toFixed(6)),
      latency_sec:   parseFloat(latency),
    });

    console.log(`AI ${result.provider}: ${inputTokens}in / ${outputTokens}out | cost: ${totalCost === null ? "not configured" : "$" + totalCost.toFixed(6)} | latency: ${latency}s`);

    return result;
  } catch (err) {
    if ((err.response?.status === 429 || err.response?.status === 503) && retry > 0) {
      await new Promise(r => setTimeout(r, 2000));
      return callAI(prompt, retry - 1);
    }
    console.log("❌ AI CALL FAIL:", err.message);
    return null;
  }
}

// endpoint ให้ server.cjs หรือ frontend ดึง cost summary
app.get("/ai-cost", (req, res) => {
  const log = loadCostLog();
  const total_calls    = log.length;
  const total_cost_usd = log.reduce((s, e) => s + (e.cost_usd || 0), 0);
  const total_input    = log.reduce((s, e) => s + (e.input_tokens || 0), 0);
  const total_output   = log.reduce((s, e) => s + (e.output_tokens || 0), 0);
  const avg_latency    = total_calls > 0
    ? log.reduce((s, e) => s + (e.latency_sec || 0), 0) / total_calls
    : 0;

  res.json({
    ok: true,
    summary: {
      total_calls,
      total_cost_usd:   parseFloat(total_cost_usd.toFixed(6)),
      total_cost_thb:   parseFloat((total_cost_usd * THB_PER_USD).toFixed(4)),
      total_input_tokens:  total_input,
      total_output_tokens: total_output,
      avg_latency_sec:  parseFloat(avg_latency.toFixed(4)),
      model:            aiConfig.model,
      provider:         aiConfig.provider,
      fallback_provider: aiConfig.fallbackProvider || null,
      unpriced_calls:   log.filter(entry => entry.cost_usd == null).length,
      price_input_per_m:  PRICE_INPUT_PER_M,
      price_output_per_m: PRICE_OUTPUT_PER_M,
    },
    recent: log.slice(-10).reverse(),
  });
});

app.get("/ai-cost.csv", (_req, res) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="synapse-ai-cost-log.csv"');
  res.send(getCostCsv());
});

app.post("/parse", async (req, res) => {
  const { message, devices } = req.body;
  const context = { currentRoom, lastLightEntity };

  const t = normalize(message)
    .replace("ไฟล์", "ไฟ").replace("ไฝ", "ไฟ").replace("lamp", "ไฟ")
    .replace("fan", "พัดลม").replace("โมท", "โหมด");

  console.log("\n🧠 AI RECEIVED:", message);

  try {
    const fast = await tryFastDeviceCommand(t, devices, context);
    if (fast) return res.json(fast);
  } catch (error) {
    console.log("⚠️ FAST COMMAND FAIL:", error.message);
    // Continue to the AI route so one direct-control failure does not make a
    // supported voice command unusable.
  }

  const prompt = `You are a Thai Smart Home AI assistant. Understand natural Thai and extract intent. Reply with ONLY valid JSON on one line, no explanation, no markdown.

Context: last device used = ${lastLightEntity || "none"}, current room = ${currentRoom || "none"}

Devices:
${devices.map(d => `${d.name} → ${d.id}`).join("\n")}

User said: "${message}"

Reply format (one line only):
{"intent":"","entity_id":"","scene":"","mode":"","brightness_delta":0,"delay_minutes":0,"speech":""}

- entity_id: use comma-separated for multiple devices
- speech: natural Thai response 1 sentence

intent values: turn_on, turn_off, adjust_brightness, set_mode, activate_scene, query_location, unknown

Rules:
- "กลับบ้าน" → activate_scene, scene="กลับบ้าน"
- "ถึงห้องนอน" → activate_scene, scene="ถึงห้องนอน"
- "ออกจากห้อง" → activate_scene, scene="ออกจากห้อง"
- "ออกจากบ้าน"/"ไปข้างนอก" → activate_scene, scene="ออกจากบ้าน"
- "ร้อน"/"อากาศร้อน" → turn_on fan device
- "หนาว"/"เย็นไป" → turn_off fan device
- "ตาพร่า"/"แสบตา"/"สว่างเกิน" → adjust_brightness, brightness_delta=-20
- "มืดไป"/"มองไม่เห็น" → adjust_brightness, brightness_delta=+20
- "จะนอน"/"ง่วง" → set_mode, mode="relax"
- "ทำงาน"/"ประชุม" → set_mode, mode="task"
- "ดูจอ"/"ดูหนัง" → set_mode, mode="screen"
- "คุณอยู่ไหน"/"เราอยู่ไหน" → query_location
- unrelated to smart home → unknown`;

  try {
    const aiRes = await callAI(prompt);
    if (!aiRes) return handleRules(t, message, devices, res, context);

    let text = aiRes.text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    console.log("🤖 AI RAW:", text);

    let nlu;
    try { nlu = JSON.parse(text); }
    catch { return handleRules(t, message, devices, res, context); }

    console.log("🧠 NLU:", nlu);
    if (nlu.intent === "query_location") {
      const room = context.currentRoom;
      const speech = nlu.speech || (room ? `คุณอยู่ใน${room}` : "ขออภัย ผมยังไม่ทราบว่าคุณอยู่ที่ไหน");
      return res.json({ commands: [], speech });
    }
    if (!nlu.intent || nlu.intent === "unknown") return handleRules(t, message, devices, res, context);

    if (nlu.intent === "activate_scene") {
      const scene = nlu.scene;
      if (scene === "กลับบ้าน") {
        context.currentRoom = "ห้องนั่งเล่น";
        const d = devices.find(d => normalize(d.name).includes("ไฟ") && normalize(d.name).includes("ห้องนั่งเล่น"));
        if (!d) return res.json({ commands: [], speech: "ไม่พบไฟห้องนั่งเล่นครับ" });
        const cmd = { action: "on", entity_id: d.id, delay: 0 };
        await sendToHA(cmd);
        return res.json({ commands: [cmd], speech: "เปิดไฟห้องนั่งเล่นให้แล้วครับ ยินดีต้อนรับกลับบ้านครับ" });
      }
      if (scene === "ถึงห้องนอน") {
        context.currentRoom = "ห้องนอน";
        const list = devices.filter(d => normalize(d.name).includes("ห้องนอน"));
        const cmds = list.map(d => ({ action: "on", entity_id: d.id, delay: 0 }));
        await Promise.all(cmds.map(c => sendToHA(c)));
        return res.json({ commands: cmds, speech: "เปิดไฟและพัดลมห้องนอนเรียบร้อยแล้วครับ" });
      }
      if (scene === "ออกจากห้อง") {
        const room = context.currentRoom || "ห้องนอน";
        const list = devices.filter(d => normalize(d.name).includes(normalize(room)));
        const cmds = list.map(d => ({ action: "off", entity_id: d.id, delay: 0 }));
        await Promise.all(cmds.map(c => sendToHA(c)));
        context.currentRoom = null;
        return res.json({ commands: cmds, speech: `ปิดอุปกรณ์ใน${room}เรียบร้อยแล้วครับ` });
      }
      if (scene === "ออกจากบ้าน") {
        const cmds = devices.filter(d => d.id.startsWith("light.") || d.id.startsWith("switch.") || d.id.startsWith("fan."))
          .map(d => ({ action: "off", entity_id: d.id, delay: 0 }));
        await Promise.all(cmds.map(c => sendToHA(c)));
        context.currentRoom = null;
        return res.json({ commands: cmds, speech: "ปิดทุกอุปกรณ์เรียบร้อยแล้วครับ เดินทางปลอดภัยนะครับ" });
      }
      return handleRules(t, message, devices, res, context);
    }

    if (nlu.intent === "adjust_brightness") {
      let entity_id = nlu.entity_id || lastLightEntity;
      if (!entity_id) { const g = resolveDevice(t, devices, currentRoom, lastLightEntity); if (g?.id.startsWith("light.")) entity_id = g.id; }
      if (entity_id?.startsWith("light.")) {
        const delta = nlu.brightness_delta || 20;
        context.lastLightEntity = entity_id;
        await sendToHA({ action: "adjust_brightness", entity_id, delta });
        return res.json({ commands: [{ action: "adjust_brightness", entity_id, delta, delay: 0 }], speech: nlu.speech || (delta > 0 ? "เพิ่มความสว่างให้แล้วครับ" : "ลดความสว่างให้แล้วครับ") });
      }
      return handleRules(t, message, devices, res, context);
    }

    if (nlu.intent === "set_mode" && LIGHT_MODES[nlu.mode]) {
      let entity_id = nlu.entity_id || devices.find(d => normalize(d.name).includes("ห้องนั่งเล่น") && d.id.startsWith("light."))?.id;
      if (entity_id?.startsWith("light.")) {
        const mode = LIGHT_MODES[nlu.mode];
        const cmd = { action: "on", entity_id, brightness: luxToBrightness(mode.lux), hs_color: mode.hs, mode: nlu.mode, delay: 0 };
        context.lastLightEntity = entity_id;
        await sendToHA(cmd);
        return res.json({ commands: [cmd], speech: nlu.speech || `ตั้งโหมด${MODE_TH[nlu.mode]}เรียบร้อยแล้วครับ` });
      }
      return handleRules(t, message, devices, res, context);
    }

    if (nlu.intent === "turn_on" || nlu.intent === "turn_off") {
      const rawIds = nlu.entity_id ? nlu.entity_id.split(",").map(e => e.trim()).filter(e => devices.find(d => d.id === e)) : [];
      if (rawIds.length === 0) { const g = resolveDevice(t, devices, currentRoom, lastLightEntity); if (g) rawIds.push(g.id); }
      if (rawIds.length > 0) {
        const action = nlu.intent === "turn_off" ? "off" : "on";
        const cmds = rawIds.map(entity_id => ({ action, entity_id, delay: nlu.delay_minutes ? nlu.delay_minutes * 60000 : 0 }));
        for (const cmd of cmds) {
          if (cmd.entity_id.startsWith("light.")) {
            context.lastLightEntity = cmd.entity_id;
            const roomMatch = devices.find(d => d.id === cmd.entity_id)?.name.match(/ห้อง\S+/);
            if (roomMatch) context.currentRoom = roomMatch[0];
          }
          cmd.delay > 0 ? setTimeout(() => sendToHA({ ...cmd, delay: 0 }), cmd.delay) : await sendToHA(cmd);
        }
        const name = devices.find(d => d.id === rawIds[0])?.name || rawIds[0];
        return res.json({ commands: cmds, speech: nlu.speech || (action === "on" ? `เปิด${cmds.length > 1 ? "อุปกรณ์ที่เลือก" : name}เรียบร้อยแล้วครับ` : `ปิด${cmds.length > 1 ? "อุปกรณ์ที่เลือก" : name}เรียบร้อยแล้วครับ`) });
      }
      return handleRules(t, message, devices, res, context);
    }

    return handleRules(t, message, devices, res, context);
  } catch (err) {
    console.error("❌ SERVER ERROR:", err.message);
    return handleRules(t, message, devices, res, context);
  }
});

app.listen(5000, () => { console.log("🤖 AI Server running on port 5000"); });
