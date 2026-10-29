const fs = require("fs");
const path = require("path");
const { profileHistory, seedEnabled } = require('./behavior_profile.cjs');

const HISTORY_FILE = path.join(__dirname, "behavior_history.json");
const HISTORY_CSV_FILE = path.join(__dirname, "behavior_history.csv");
const CSV_COLUMNS = [
  "timestamp",
  "voice_input",
  "ai_action",
  "entity_id",
  "actual_result",
  "success",
  "mode",
  "brightness",
];

const KNOWN_ENTITIES = [
  "light.a60_rgb_w_wifi",
  "switch.smart_plug_socket_1",
  "switch.smart_plug_2_socket_1",
];

const ENTITY_LABELS = {
  "light.a60_rgb_w_wifi": "ไฟห้องนั่งเล่น",
  "switch.smart_plug_socket_1": "ไฟห้องนอน",
  "switch.smart_plug_2_socket_1": "พัดลมห้องนอน",
};

let history = [];

function escapeCsvValue(value) {
  if (value === undefined || value === null) return "";
  const text = String(value).replace(/\r?\n/g, " ");
  return /[",]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function getHistoryCsv() {
  const rows = history.map((entry) => CSV_COLUMNS.map((column) => escapeCsvValue(entry[column])).join(","));
  // The UTF-8 BOM lets Excel on Windows display Thai text correctly.
  return `\uFEFF${CSV_COLUMNS.join(",")}\r\n${rows.join("\r\n")}\r\n`;
}

function writeHistoryCsv() {
  fs.writeFileSync(HISTORY_CSV_FILE, getHistoryCsv(), "utf-8");
}

try {
  if (fs.existsSync(HISTORY_FILE)) {
    history = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
  }
} catch {
  history = [];
}

// Keep a spreadsheet-ready copy available as soon as the API starts.
writeHistoryCsv();

function record({ voice_input, ai_action, entity_id, actual_result, success, mode, brightness, source }) {
  if (!KNOWN_ENTITIES.includes(entity_id)) return;

  const entry = {
    timestamp: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Bangkok" }).replace(" ", "T"),
    voice_input,
    ai_action,
    entity_id,
    actual_result,
    success: success === true || success === "true",
  };

  if (mode) entry.mode = mode;
  if (["voice", "scene", "automatic"].includes(source)) entry.source = source;
  if (brightness !== undefined) entry.brightness = brightness;

  history.push(entry);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  writeHistoryCsv();
}

function analyzeByEntity(entity_id) {
  const entries = profileHistory(history).filter((h) => h.entity_id === entity_id);
  if (entries.length === 0) return null;

  const onCount = entries.filter((e) => e.ai_action === "on" && e.voice_input !== "feedback-negative").length;
  const offCount = entries.filter((e) => e.ai_action === "off" && e.voice_input !== "feedback-negative").length;
  const negCount = entries.filter((e) => e.voice_input === "feedback-negative").length;
  const successRate = entries.filter((e) => e.success).length / entries.length;

  const hourCounts = Array(24).fill(0);
  for (const e of entries.filter(e => e.ai_action === "on" && e.voice_input !== "feedback-negative")) {
    const h = new Date(e.timestamp).getHours();
    hourCounts[h]++;
  }
  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

  return {
    entity_id,
    label: ENTITY_LABELS[entity_id] || entity_id,
    total: onCount + offCount,
    on_count: onCount,
    off_count: offCount,
    neg_count: negCount,
    success_rate: Math.round(successRate * 100),
    peak_hour: peakHour,
    hourly: hourCounts,
  };
}

function getSummary() {
  return KNOWN_ENTITIES.map((id) => analyzeByEntity(id)).filter(Boolean);
}

function getDecisions(now = Date.now(), calendar) {
  if (seedEnabled()) return require('./seeded_behavior.cjs').seededDecisions(profileHistory(history), require('./sample_history.cjs').sampleHistory(), KNOWN_ENTITIES, ENTITY_LABELS, now, calendar);
  const { getDecisions: decide } = require("./behavior_policy.cjs");
  return decide(profileHistory(history), KNOWN_ENTITIES, ENTITY_LABELS, now, calendar);
}
function getSuggestion() { return getDecisions().filter(item => item.status === "ready"); }
async function predictArrival() { return getSuggestion(); }
module.exports = { record, analyzeByEntity, getSummary, getSuggestion, getDecisions, getHistoryCsv, predictArrival, KNOWN_ENTITIES, getHistory: () => history.map(entry => ({ ...entry })) };
