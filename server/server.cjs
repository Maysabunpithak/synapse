  require("dotenv").config();
const analyzer = require("./behavior_analyzer.cjs");
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { HA_URL, TOKEN, TAPO_DIRECT, LIGHT_MODES, getLightState, getDevices, controlTapoDirectly } = require("./server_helpers.cjs");
const { createTranscribeRouter } = require("./transcribe.cjs");
const { lightPayload } = require("./light_control.cjs");
const { createAuthRouter } = require("./auth.cjs");
const roomEnvironment = require('./room_environment.cjs');
const holidayCalendar = require('./holiday_calendar.cjs').createHolidayCalendar();
const presenceHistory = require('./presence_history.cjs').createPresenceHistory();

const app = express();
const PORT = Number(process.env.API_PORT || 4000);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
if (process.env.NODE_ENV !== "production") {
  allowedOrigins.push("http://localhost:8081", "http://127.0.0.1:8081");
}
const corsOptions = {
  origin(origin, callback) {
    // Native mobile apps do not send an Origin header. Browser callers must be
    // explicitly allow-listed so the HA control API is not open to any website.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed"));
  },
};

app.use(express.json());
app.use(cors(corsOptions));
app.use("/auth", createAuthRouter());



let lightModeMemory = {};
let routines;
function routineService() {
  if (!routines) routines = require('./routines.cjs').createRoutineService({
    file: require('path').join(__dirname, 'saved_routines.json'),
    getHistory: analyzer.getHistory, getDevices, record: analyzer.record,
    getState: async entity_id => (await axios.get(`${HA_URL}/api/states/${entity_id}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }, timeout: 8000,
    })).data.state,
    turnOn: async entity_id => {
      if (TAPO_DIRECT[entity_id]) {
        if (!await controlTapoDirectly(entity_id, 'on')) throw new Error('เปิดอุปกรณ์ไม่สำเร็จ');
      } else await axios.post(`${HA_URL}/api/services/${entity_id.split('.')[0]}/turn_on`, { entity_id }, {
        headers: { Authorization: `Bearer ${TOKEN}` }, timeout: 8000,
      });
    },
  });
  return routines;
}

app.get('/routines', async (_req, res) => {
  try { res.json({ ok: true, ...await routineService().list() }); }
  catch { res.status(500).json({ ok: false, error: 'โหลดกิจวัตรไม่สำเร็จ' }); }
});
app.post('/routines/accept', async (req, res) => {
  try { res.json({ ok: true, routine: await routineService().accept(req.body.pattern_id, req.body.name) }); }
  catch (error) { res.status(400).json({ ok: false, error: error.message }); }
});
app.post('/routines/remove', (req, res) => {
  try { routineService().remove(req.body.id); res.json({ ok: true }); }
  catch { res.status(500).json({ ok: false, error: 'ลบกิจวัตรไม่สำเร็จ' }); }
});
app.post('/routines/run', async (req, res) => {
  try { res.json(await routineService().run(req.body.id)); }
  catch (error) { res.status(400).json({ ok: false, error: error.message }); }
});

if (!TOKEN) {
  console.error("❌ HA_TOKEN not found in .env");
  process.exit(1);
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "synapse-api" });
});

app.get('/room-environment', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const response = await axios.post(`${HA_URL}/api/template`, { template: roomEnvironment.template }, {
      headers: { Authorization: `Bearer ${TOKEN}` }, timeout: 8000,
    });
    const rows = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    res.json({ ok: true, readings: roomEnvironment.readings(rows) });
  } catch {
    res.status(502).json({ ok: false, readings: [] });
  }
});

function isSupportedAction(action) {
  return action === "on" || action === "off";
}

async function isControllableEntity(entityId) {
  if (typeof entityId !== "string" || !/^(switch|light|fan|cover|climate)\.[a-zA-Z0-9_]+$/.test(entityId)) {
    return false;
  }
  const devices = await getDevices();
  return devices.some((device) => device.id === entityId);
}

// ================= TRANSCRIBE (Groq Whisper) =================

app.use("/transcribe", createTranscribeRouter());

// ================= SWITCH  =================

app.post("/switch/:action", async (req, res) => {
  const { entity_id, source } = req.body;
  const { action } = req.params; // on หรือ off

  if (!isSupportedAction(action) || !(await isControllableEntity(entity_id))) {
    return res.status(400).json({ ok: false, error: "Invalid action or device" });
  }

  const domain = entity_id.split(".")[0];

  try {
    if (TAPO_DIRECT[entity_id]) {
      const ok = await controlTapoDirectly(entity_id, action);
      if (!ok) return res.json({ ok: false });
    } else {
      await axios.post(
        `${HA_URL}/api/services/${domain}/turn_${action}`,
        { entity_id },
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );
    }

    console.log(`✅ ${action.toUpperCase()}:`, entity_id);

    if (action === "off" && source === "ui" && lastAutoOn[entity_id] && Date.now() - lastAutoOn[entity_id] < 5 * 60 * 1000) {
      analyzer.record({
        voice_input: "feedback-negative",
        ai_action: "off",
        entity_id,
        actual_result: "ผู้ใช้ปิดหลัง AI เปิด",
        success: true,
      });
      console.log(`👎 NEGATIVE FEEDBACK: ${entity_id}`);
    }

    analyzer.record({
      voice_input: source === "ui" ? "ui-toggle" : "switch",
      ai_action: action,
      entity_id,
      actual_result: action === "on" ? "เปิด" : "ปิด",
      success: true,
    });

    res.json({ ok: true });
  } catch (err) {
    console.log(`❌ ${action.toUpperCase()} FAIL:`, entity_id);

    analyzer.record({
      voice_input: source === "ui" ? "ui-toggle" : "switch",
      ai_action: action,
      entity_id,
      actual_result: "fail",
      success: false,
    });

    res.json({ ok: false });
  }
});

// ================= AI COMMAND =================

app.post("/light", async (req, res) => {
  const data = lightPayload(req.body);
  if (!data) return res.status(400).json({ ok: false, error: "Invalid light settings" });
  try {
    if (!(await isControllableEntity(data.entity_id))) {
      return res.status(400).json({ ok: false, error: "Unknown light" });
    }
    await axios.post(`${HA_URL}/api/services/light/turn_on`, data, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      timeout: 10000,
    });
    analyzer.record({ voice_input: "mobile-light-control", ai_action: "adjust_brightness", entity_id: data.entity_id, actual_result: "ปรับแสง", success: true, brightness: data.brightness_pct });
    return res.json({ ok: true });
  } catch {
    return res.status(502).json({ ok: false, error: "Unable to update light" });
  }
});

app.post("/ai/command", async (req, res) => {
  const { message } = req.body;
  const commandSource = ["voice", "scene"].includes(req.body.source) ? req.body.source : undefined;

  console.log("\n🔥 MCP RECEIVED:", message);

  try {
    // 1. ดึง devices
    const routine = routineService().match(message);
    if (routine) return res.json(await routineService().run(routine.id));
    const devices = await getDevices();

    if (devices.length === 0) {
      return res.json({
        ok: false,
        speech: "ไม่มีอุปกรณ์",
      });
    }

    let commands = [];
    let speech = ""; 
    try {
      const aiRes = await axios.post("http://localhost:5000/parse", {
        message,
        devices,
      });

      commands = aiRes.data.commands || [];
      speech = aiRes.data.speech || ""; 
    } catch (err) {
      console.log(" AI REQUEST FAIL:", err.message);
    }

    console.log("🤖 FROM AI:", commands);

    if (!Array.isArray(commands) || commands.length === 0) {
      return res.json({
        ok: false,
        speech: "AI ไม่เข้าใจ",
      });
    }

    // ================= VALIDATE ENTITY =================

const validEntities = devices.map(d => d.id);

commands = commands.filter(cmd => {
  if (!cmd.entity_id || !validEntities.includes(cmd.entity_id)) {
    console.log("❌ INVALID ENTITY:", cmd.entity_id);
    return false;
  }
  return true;
});

if (commands.length === 0) {
  return res.json({
    ok: false,
    speech: "ไม่พบอุปกรณ์ที่ถูกต้อง",
  });
}

// ================= VALIDATE ACTION =================

const allowedActions = ["on", "off", "adjust_brightness"];

commands = commands.filter(cmd => {
  if (!allowedActions.includes(cmd.action)) {
    console.log("❌ INVALID ACTION:", cmd.action);
    return false;
  }
  return true;
});

if (commands.length === 0) {
  return res.json({
    ok: false,
    speech: "คำสั่งไม่ถูกต้อง",
  });
}

    // ================= EXECUTE =================

for (const cmd of commands) {

  const domain = cmd.entity_id.split(".")[0];

  console.log("⚡ EXEC:", cmd);

  setTimeout(async () => {
    try {

      
     // ================== ADJUST BRIGHTNESS ==================
    if (cmd.action === "adjust_brightness") {

      const state = await getLightState(cmd.entity_id);
      if (!state) {
        analyzer.record({
          voice_input: message,
        source: commandSource,
          ai_action: "adjust_brightness",
          entity_id: cmd.entity_id,
          actual_result: "fail",
          success: false
        });
        return;
      }

      const current = Math.round((state.brightness || 0) / 255 * 100);
      const next = Math.min(100, Math.max(0, current + cmd.delta));

      console.log("🔆 CURRENT:", current, "→ NEXT:", next);

      const data = {
        entity_id: cmd.entity_id,
        brightness_pct: next,
        transition: 0.4
      };

      
      const modeKey = lightModeMemory[cmd.entity_id];

      if (modeKey && LIGHT_MODES[modeKey]) {
        data.hs_color = LIGHT_MODES[modeKey].hs;
      }

      await axios.post(
        `${HA_URL}/api/services/${domain}/turn_on`,
        data,
        {
          headers: { Authorization: `Bearer ${TOKEN}` },
        }
      );

      console.log("✅ BRIGHTNESS UPDATED:", cmd.entity_id);
      analyzer.record({
        voice_input: message,
        source: commandSource,
        ai_action: "adjust_brightness",
        entity_id: cmd.entity_id,
        actual_result: "adjust_brightness",
        success: true
      });
      return;
    }

      // ================== NORMAL ON / OFF ==================
      const service = cmd.action === "on" ? "turn_on" : "turn_off";

      const data = {
        entity_id: cmd.entity_id,
      };

      if (cmd.brightness !== undefined) {
        data.brightness = cmd.brightness;
      }

      if (cmd.hs_color !== undefined) {
        data.hs_color = cmd.hs_color;
      }

      //  จำโหมดล่าสุดของไฟ
      if (cmd.mode) {
        lightModeMemory[cmd.entity_id] = cmd.mode;
        console.log("🧠 MODE SAVED:", cmd.entity_id, cmd.mode);
      }

      console.log(
        "🔥 CALL:",
        `${HA_URL}/api/services/${domain}/${service}`
      );
      console.log("📦 DATA:", data);

      const response = await axios.post(
        `${HA_URL}/api/services/${domain}/${service}`,
        data,
        {
          headers: { Authorization: `Bearer ${TOKEN}` },
        }
      );

      console.log("✅ DONE:", cmd.entity_id);
      console.log("📡 RES:", response.data);
      analyzer.record({
        voice_input: message,
        source: commandSource,
        ai_action: cmd.action,
        entity_id: cmd.entity_id,
        actual_result: cmd.action === "on" ? "เปิด" : "ปิด",
        success: true,
        mode: cmd.mode,
        brightness: cmd.brightness_pct,
      });

    } catch (e) {
      console.log("❌ FAIL:", cmd.entity_id, e.message);

      analyzer.record({
        voice_input: message,
        source: commandSource,
        ai_action: cmd.action,
        entity_id: cmd.entity_id,
        actual_result: "fail",
        success: false
      });
    }

  }, cmd.delay || 0);
}

    console.log("📤 SEND TO FRONT:", { commands, speech });

    return res.json({
      ok: true,
      commands,
      speech: speech || "สั่งงานสำเร็จ", 
    });

  } catch (err) {
    console.log(" MCP ERROR:", err.message);

    return res.json({
      ok: false,
      speech: "ระบบมีปัญหา",
    });
  }
});

// ================= DEVICE STATES =================

app.get("/devices/states", async (req, res) => {
  try {
    const devices = await getDevices();
    const states = await Promise.all(
      devices.map(async (d) => {
        const r = await axios.get(`${HA_URL}/api/states/${d.id}`, {
          headers: { Authorization: `Bearer ${TOKEN}` },
        });
        return { entity_id: d.id, state: r.data.state };
      })
    );
    res.json({ ok: true, states });
  } catch (err) {
    res.json({ ok: false, states: [] });
  }
});

// Mobile-friendly endpoint: discover devices dynamically instead of hard-coding
// entity IDs in the client.
app.get("/devices", async (_req, res) => {
  try {
    const devices = await getDevices();
    const deviceStates = await Promise.all(
      devices.map(async (device) => {
        const response = await axios.get(`${HA_URL}/api/states/${device.id}`, {
          headers: { Authorization: `Bearer ${TOKEN}` },
        });
        return {
          entity_id: device.id,
          name: device.name,
          domain: device.id.split(".")[0],
          state: response.data.state,
          attributes: response.data.attributes,
        };
      })
    );
    res.json({ ok: true, devices: deviceStates });
  } catch (err) {
    console.log("GET DEVICES FAIL:", err.message);
    res.status(502).json({ ok: false, devices: [] });
  }
});

// ================= AI COST =================

app.get("/logs/ai-cost", async (req, res) => {
  try {
    const r = await axios.get("http://localhost:5000/ai-cost");
    res.json(r.data);
  } catch {
    res.json({ ok: false, summary: null, recent: [] });
  }
});

app.get("/logs/ai-cost.csv", async (_req, res) => {
  try {
    const response = await axios.get("http://localhost:5000/ai-cost.csv", { responseType: "text" });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="synapse-ai-cost-log.csv"');
    res.send(response.data);
  } catch {
    res.status(503).json({ ok: false, error: "AI service is unavailable" });
  }
});

// ================= BEHAVIOR ANALYSIS =================

app.get('/logs/sample-history', (_req, res) => {
  const { sampleHistory, sampleSummary } = require('./sample_history.cjs');
  const history = sampleHistory();
  res.json({ ok: true, sample: true, used_for_auto: require('./behavior_profile.cjs').seedEnabled(), summary: sampleSummary(history), history: [...history].reverse() });
});

app.get('/calendar/context', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, ...holidayCalendar.context() });
});

app.get("/logs/analyze", (req, res) => {
  const automation = automationPlan();
  res.json({
    ok: true,
    summary: analyzer.getSummary(),
    day_context: holidayCalendar.context(),
    suggestions: automation.filter(d => d.status === "ready"),
    automation,
    upcoming: require('./upcoming_automation.cjs').upcoming(automation, Date.now(), lastAutoOn, AUTO_COOLDOWN_MS),
  });
});

app.get("/logs/history", (req, res) => {
  const fs = require("fs");
  const path = require("path");
  try {
    const file = path.join(__dirname, "behavior_history.json");
    const history = JSON.parse(fs.readFileSync(file, "utf-8"));
    const recent = history.slice(-20).reverse();
    res.json({ ok: true, history: recent });
  } catch {
    res.json({ ok: true, history: [] });
  }
});

app.get("/logs/history.csv", (_req, res) => {
  const filename = "synapse-behavior-history.csv";
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(analyzer.getHistoryCsv());
});

// ================= PHONE HOME TRIGGER =================

app.post('/trigger/phone-unknown', (_req, res) => {
 presenceHistory.record(null);
 isAtHome = false; homeExpireAt = 0;
 res.json({ ok: true });
});

app.post("/trigger/phone-left", (req, res) => {
  presenceHistory.record(false);
  isAtHome = false;
  presenceUpdatedAt = Date.now();
  console.log("🚪 PHONE LEFT HOME");
  res.json({ ok: true });
});

app.post("/trigger/phone-home", async (req, res) => {
  presenceHistory.record(true);
  isAtHome = true;
  presenceUpdatedAt = Date.now();
  homeExpireAt = presenceHistory.snapshot().expiresAt;
  console.log("\n📱 PHONE ARRIVED HOME");

  const executed = await runAutoTrigger("phone-home-trigger");
  return res.json({ ok: true, executed, automation: automationPlan() });
});

// ================= GET POWER COST =================

app.get("/power-cost", async (req, res) => {
  try {
    const response = await axios.get(
      `${HA_URL}/api/states/sensor.smart_plug_power`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` },
      }
    );

    const data = response.data;

    res.json({
      entity_id: data.entity_id,
      value: parseFloat(data.state),
      unit: data.attributes.unit_of_measurement || "บาท",
    });

  } catch (err) {
    console.log("❌ GET POWER COST FAIL:", err.message);

    res.status(500).json({
      value: 0,
      unit: "บาท",
    });
  }
});

// ================= STATUS =================

app.get('/presence/history', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, history: presenceHistory.history() });
});

app.get('/presence', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  const state = presenceHistory.snapshot();
  res.json({ ok: true, ...state });
});

app.get("/status", (req, res) => {
  const pending = [...autoExecuted];
  autoExecuted = [];
  res.json({ isAtHome, homeExpireAt, executed: pending });
});

// ================= AUTO SCHEDULE (pattern-based) =================

let isAtHome = presenceHistory.snapshot().atHome === true;
let presenceUpdatedAt = presenceHistory.snapshot().observedAt;
let autoExecuted = [];
let homeExpireAt = presenceHistory.snapshot().expiresAt;
const lastAutoOn = {};
const AUTO_COOLDOWN_MS = 2 * 60 * 60 * 1000;

function automationPlan() {
  const now = Date.now();
  return require("./automation_plan.cjs").buildPlan(analyzer.getDecisions(now, holidayCalendar.context), {
    atHome: isAtHome && now <= homeExpireAt, lastAutoOn, now, cooldown: AUTO_COOLDOWN_MS,
  });
}

let autoRunning = false;
async function runAutoTrigger(source = "auto-schedule") {
  if (autoRunning) return [];
  autoRunning = true;
  const executed = [];
  try {
    for (const prediction of automationPlan().filter(d => d.status === "ready")) {
      const entity_id = prediction.entity_id;
      try {
        const response = await axios.get(HA_URL + "/api/states/" + entity_id, {
          headers: { Authorization: "Bearer " + TOKEN }, timeout: 10000,
        });
        if (response.data.state !== "off") continue;
        // Re-check after I/O: leaving home or a manual off cancels the pending action.
        if (!automationPlan().some(d => d.entity_id === entity_id && d.status === "ready")) continue;
        await axios.post(HA_URL + "/api/services/" + entity_id.split(".")[0] + "/turn_on", { entity_id }, {
          headers: { Authorization: "Bearer " + TOKEN }, timeout: 10000,
        });
        lastAutoOn[entity_id] = Date.now();
        analyzer.record({ voice_input: source, source: "automatic", ai_action: "on", entity_id, actual_result: "on", success: true });
        executed.push(prediction);
        autoExecuted.push({ entity_id, action: "on" });
      } catch (error) { console.log("AUTO ON FAIL:", entity_id, error.message); }
    }
    return executed;
  } finally { autoRunning = false; }
}
setInterval(() => { void runAutoTrigger().catch(error => console.error("AUTO FAIL:", error.message)); }, 30 * 60 * 1000);

// ================= START =================

void holidayCalendar.refresh();
setInterval(() => { void holidayCalendar.refresh(); }, 60 * 60 * 1000).unref();

app.listen(PORT, () => {
  console.log(` Synapse API running on port ${PORT}`);
});

  
