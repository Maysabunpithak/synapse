"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Home, Hand, Mic } from "lucide-react";

const API_HOST = typeof window === "undefined" ? "localhost" : window.location.hostname;
const API_PROTOCOL = typeof window === "undefined" ? "http:" : window.location.protocol;
const API_BASE = `${API_PROTOCOL}//${API_HOST}:4000`;

interface HistoryEntry {
  timestamp: string;
  voice_input: string;
  ai_action: string;
  entity_id: string;
  success: boolean;
}

interface DeviceSummary {
  entity_id: string;
  label: string;
  total: number;
  on_count: number;
  off_count: number;
  neg_count: number;
  peak_hour: number;
  hourly: number[];
}

const COLORS: Record<string, string> = {
  "light.a60_rgb_w_wifi": "#f59e0b",
  "switch.smart_plug_socket_1": "#60a5fa",
  "switch.smart_plug_2_socket_1": "#a78bfa",
};

const ICONS: Record<string, string> = {
  "light.a60_rgb_w_wifi": "💡",
  "switch.smart_plug_socket_1": "🌙",
  "switch.smart_plug_2_socket_1": "🌀",
};

const LABELS: Record<string, string> = {
  "light.a60_rgb_w_wifi": "ไฟห้องนั่งเล่น",
  "switch.smart_plug_socket_1": "ไฟห้องนอน",
  "switch.smart_plug_2_socket_1": "พัดลมห้องนอน",
};

function sourceLabel(voice_input: string) {
  if (voice_input === "phone-home-trigger") return "กลับบ้าน auto";
  if (voice_input === "auto-schedule") return "auto schedule";
  if (voice_input === "ui-toggle") return "กดเอง";
  if (voice_input === "feedback-negative") return "แก้ไข AI";
  return "voice";
}

function sourceIcon(voice_input: string) {
  if (voice_input === "phone-home-trigger") return <Home size={16} className="text-slate-400 shrink-0" />;
  if (voice_input === "auto-schedule") return <Clock size={16} className="text-slate-400 shrink-0" />;
  if (voice_input === "ui-toggle") return <Hand size={16} className="text-slate-400 shrink-0" />;
  if (voice_input === "feedback-negative") return <span className="text-base">👎</span>;
  return <Mic size={16} className="text-slate-400 shrink-0" />;
}

export default function LogsPage() {
  const [summary, setSummary] = useState<DeviceSummary[]>([]);
  const [automation, setAutomation] = useState<{ entity_id: string; label: string; status: string; reason: string }[]>([]);
  const [predictionError, setPredictionError] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isAtHome, setIsAtHome] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    if (saved) setTheme(saved);
  }, []);

  const isDark = theme === "dark";

  useEffect(() => {
    const fetchAll = () => {
      fetch(`${API_BASE}/logs/analyze`)
        .then(r => { if (!r.ok) throw new Error(); return r.json(); })
        .then(d => { setSummary(d.summary || []); setAutomation(d.automation || []); setPredictionError(false); })
        .catch(() => { setAutomation([]); setPredictionError(true); });
      fetch(`${API_BASE}/logs/history`)
        .then(r => r.json())
        .then(d => setHistory(d.history || []));
      fetch(`${API_BASE}/status`)
        .then(r => r.json())
        .then(d => setIsAtHome(d.isAtHome || false));
    };
    fetchAll();
    const interval = setInterval(fetchAll, 3000);
    return () => clearInterval(interval);
  }, []);

  const nowHour = new Date().getHours();
  const nowTime = new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

  const bg = isDark ? "bg-[#080D1A]" : "bg-[#FAF5F0]";
  const text = isDark ? "text-white" : "text-gray-800";
  const subtext = isDark ? "text-slate-500" : "text-gray-400";
  const cardBg = isDark ? "bg-white/5 border border-white/8" : "bg-white border border-black/5 shadow-sm";
  const innerBg = isDark ? "bg-white/5" : "bg-black/4";
  const btnBg = isDark ? "bg-white/8 hover:bg-white/15 text-slate-300" : "bg-black/6 hover:bg-black/10 text-gray-500";

  return (
    <div className={`min-h-screen ${bg} ${text} transition-all duration-500`}>
      {/* HEADER */}
      <div className="px-6 pt-8 pb-4 flex items-center gap-4">
        <Link href="/" className={`inline-flex items-center justify-center w-10 h-10 rounded-full transition-all shadow-md ${btnBg}`}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className={`text-xl font-semibold ${text}`}>พฤติกรรมการใช้งาน</h1>
          <p className={`text-xs mt-0.5 ${subtext}`}>ระบบเรียนรู้จากการใช้งานจริง</p>
        </div>
      </div>

      <div className="px-6 pb-10 max-w-2xl mx-auto space-y-5">

        {/* STATUS */}
        <div className={`rounded-2xl px-5 py-4 flex items-center gap-4 ${isAtHome
          ? isDark ? "bg-emerald-950/60 border border-emerald-800/40" : "bg-emerald-50 border border-emerald-200"
          : isDark ? "bg-white/5 border border-white/8" : "bg-white border border-black/5 shadow-sm"
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isAtHome
            ? isDark ? "bg-emerald-500/20" : "bg-emerald-100"
            : isDark ? "bg-white/10" : "bg-gray-100"
          }`}>
            {isAtHome ? "🏠" : "🚪"}
          </div>
          <div className="flex-1">
            <p className={`font-medium text-sm ${text}`}>{isAtHome ? "อยู่บ้าน" : "ไม่อยู่บ้าน"}</p>
            <p className={`text-xs mt-0.5 ${subtext}`}>{isAtHome ? "auto schedule ทำงานอยู่" : "รอโทรศัพท์เชื่อม WiFi"}</p>
          </div>
          {isAtHome && <p className="text-emerald-500 font-semibold text-sm">{nowTime}</p>}
        </div>

        {/* AI STATUS */}
        <div className={`rounded-2xl p-5 ${isDark ? "bg-white/5 border border-blue-500/30" : "bg-white border border-blue-400/40 shadow-sm"}`}>
          <p className={`text-sm font-medium mb-1 ${text}`}>AI จะเปิดอะไรตอนนี้?</p>
          <p className={`text-xs ${subtext}`}>ตรวจสั่งงานทุก 30 นาทีและเมื่อกลับบ้าน โดยตรวจสถานะก่อนเปิดจริง</p>
          {predictionError ? <p className="text-sm mt-3">โหลดผลคาดการณ์ไม่ได้</p> : automation.map(d => (
            <div key={d.entity_id} className="mt-3">
              <p className="text-sm">{d.label} · {d.status === "waiting" ? "รอช่วงเวลา" : d.status === "ready" ? "เข้าเกณฑ์เปิด" : d.status === "paused" ? "พักตามคำสั่งคุณ" : d.status === "away" ? "รออยู่บ้าน" : d.status === "cooldown" ? "พักการสั่งซ้ำ" : "กำลังเรียนรู้"}</p>
              <p className={`text-xs mt-1 ${subtext}`}>{d.reason}</p>
            </div>
          ))}
        </div>

        {/* DEVICE CARDS */}
        {summary.map((d) => {
          const onRate = d.total > 0 ? Math.round((d.on_count / d.total) * 100) : 0;
          const color = COLORS[d.entity_id] || "#6b7280";
          const icon = ICONS[d.entity_id] || "🔌";
          const maxHour = d.hourly && d.hourly.length > 0 ? Math.max(...d.hourly, 1) : 1;
          const diff = d.peak_hour != null ? Math.abs(nowHour - d.peak_hour) : 99;
          const inPeak = Math.min(diff, 24 - diff) <= 1;

          return (
            <div key={d.entity_id} className={`${cardBg} rounded-2xl p-5`}>
              {/* TOP ROW */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: color + "22" }}>
                    {icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`font-medium text-sm ${text}`}>{d.label}</p>
                      {inPeak && (
                        <span className="text-[10px] bg-emerald-500/15 text-emerald-500 px-1.5 py-0.5 rounded-full">peak</span>
                      )}
                    </div>
                    <p className={`text-xs mt-0.5 ${subtext}`}>
                      {d.total} ครั้ง
                      {d.neg_count > 0 && <span className="text-amber-500 ml-1.5">· AI เรียนรู้ {d.neg_count}×</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ color }}>{onRate}%</p>
                  <p className={`text-[10px] ${subtext}`}>เปิดบ่อย</p>
                </div>
              </div>

              {/* STATS ROW */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { value: d.on_count, label: "เปิด", color: "#4ade80" },
                  { value: d.off_count, label: "ปิด", color: "#f87171" },
                  { value: `${d.peak_hour}:00`, label: "peak", color },
                ].map((s, i) => (
                  <div key={i} className={`${innerBg} rounded-xl py-2.5 text-center`}>
                    <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className={`text-[10px] mt-0.5 ${subtext}`}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* HOURLY CHART */}
              {d.hourly && (
                <div>
                  <div className="flex items-end gap-px h-8 mb-1">
                    {d.hourly.map((count, h) => (
                      <div key={h} className="flex-1 flex flex-col justify-end h-full">
                        <div
                          className="w-full rounded-[2px] transition-all"
                          style={{
                            height: `${Math.round((count / maxHour) * 100)}%`,
                            minHeight: count > 0 ? "2px" : "0",
                            backgroundColor: h === nowHour ? "#4ade80" : color,
                            opacity: h === d.peak_hour ? 1 : 0.35,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className={`flex justify-between text-[10px] ${isDark ? "text-slate-600" : "text-gray-300"}`}>
                    <span>0</span><span>6</span><span>12</span><span>18</span><span>23</span>
                  </div>
                </div>
              )}

              {/* PROGRESS BAR */}
              <div className={`mt-3 h-1 ${isDark ? "bg-white/8" : "bg-black/8"} rounded-full overflow-hidden`}>
                <div className="h-full rounded-full" style={{ width: `${onRate}%`, backgroundColor: color }} />
              </div>
            </div>
          );
        })}

        {/* HISTORY */}
        <div className={`${cardBg} rounded-2xl p-5`}>
          <p className={`text-sm font-medium mb-3 ${text}`}>ประวัติล่าสุด</p>
          <div className="space-y-1">
            {history.length === 0 && <p className={`text-xs ${subtext}`}>ยังไม่มีประวัติ</p>}
            {history.map((h, i) => {
              const color = COLORS[h.entity_id] || "#6b7280";
              const label = LABELS[h.entity_id] || h.entity_id;
              const time = h.timestamp.slice(11, 16);
              const isNeg = h.voice_input === "feedback-negative";
              return (
                <div key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                  isNeg
                    ? isDark ? "bg-amber-500/8" : "bg-amber-50"
                    : isDark ? "bg-white/4" : "bg-black/3"
                }`}>
                  <div className="flex items-center justify-center w-6 h-6 shrink-0">{sourceIcon(h.voice_input)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${text}`}>{label}</p>
                    <p className={`text-[10px] ${subtext}`}>{sourceLabel(h.voice_input)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold" style={{ color: isNeg ? "#f59e0b" : color }}>
                      {isNeg ? "แก้ไข" : h.ai_action === "on" ? "เปิด" : "ปิด"}
                    </p>
                    <p className={`text-[10px] ${subtext}`}>{time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
