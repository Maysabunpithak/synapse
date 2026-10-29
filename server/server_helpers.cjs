const axios = require("axios");
const { execSync } = require("child_process");

const HA_URL = process.env.HA_URL || "http://localhost:8123";
const TOKEN = process.env.HA_TOKEN;
const TAPO_EMAIL = process.env.TAPO_EMAIL;
const TAPO_PASSWORD = process.env.TAPO_PASSWORD;
const TAPO_DIRECT = {};
const HIDDEN_DEVICES = ["switch.tapo_p100"];

const LIGHT_MODES = {
  task: { lux: 500, hs: [55, 2] },
  screen: { lux: 500, hs: [50, 25] },
  relax: { lux: 500, hs: [50, 40] },
};

function normalize(text) {
  return (text || "").toLowerCase().replace(/\s+/g, "");
}

async function getLightState(entity_id) {
  try {
    const res = await axios.get(`${HA_URL}/api/states/${entity_id}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    return res.data.attributes;
  } catch (err) {
    console.log("❌ GET STATE FAIL:", err.message);
    return null;
  }
}

async function getDevices() {
  try {
    const response = await axios.get(`${HA_URL}/api/states`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const devices = response.data
      .filter(d =>
        (d.entity_id.startsWith("switch.") || d.entity_id.startsWith("light.") ||
         d.entity_id.startsWith("fan.") || d.entity_id.startsWith("cover.") ||
         d.entity_id.startsWith("climate.")) &&
        !d.entity_id.includes("update") &&
        !d.entity_id.endsWith("_child_lock") &&
        !HIDDEN_DEVICES.includes(d.entity_id)
      )
      .map(d => ({ id: d.entity_id, name: d.attributes.friendly_name || d.entity_id }));
    console.log("📦 DEVICES:");
    devices.forEach(d => console.log("-", d.id, ":", d.name));
    return devices;
  } catch (err) {
    console.log("❌ GET DEVICES FAIL:", err.message);
    return [];
  }
}

async function controlTapoDirectly(entity_id, action) {
  const ip = TAPO_DIRECT[entity_id];
  if (!ip || !TAPO_EMAIL || !TAPO_PASSWORD) return false;
  try {
    const script = require("path").join(__dirname, "tapo_control.py");
    const cmd = `python "${script}" ${ip} ${action} ${TAPO_EMAIL} ${TAPO_PASSWORD}`;
    execSync(cmd, { timeout: 10000 });
    console.log(`✅ TAPO DIRECT ${action.toUpperCase()}:`, entity_id);
    return true;
  } catch (err) {
    console.log("❌ TAPO DIRECT FAIL:", err.message);
    return false;
  }
}

module.exports = { HA_URL, TOKEN, TAPO_DIRECT, LIGHT_MODES, normalize, getLightState, getDevices, controlTapoDirectly };
