"use client";

import { useEffect, useState, useRef } from "react";
import { Wind, Lightbulb, Moon, Sun, Mic, MicOff, BarChart2, Home as HomeIcon, Sparkles, Cloud, Star } from "lucide-react";
import Link from "next/link";
import synapseRobot from "@/mobile/assets/synapse-house-poster-hq.png";

const API_HOST = typeof window === "undefined" ? "localhost" : window.location.hostname;
const API_PROTOCOL = typeof window === "undefined" ? "http:" : window.location.protocol;
const API_BASE = `${API_PROTOCOL}//${API_HOST}:4000`;

type Device = {
  entity_id: string;
  state: string;
};

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [aiState, setAiState] = useState<"idle" | "thinking" | "success">("idle");
  const [heardText, setHeardText] = useState<string>("");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    if (saved) setTheme(saved);
  }, []);
  const [wakeMode, setWakeMode] = useState<"off" | "waiting" | "listening">("off");
  const [floatEmojis, setFloatEmojis] = useState<{id: number; emoji: string; x: number}[]>([]);
  const wakeRef = useRef<any>(null);
  const commandSRRef = useRef<any>(null);
  const wakeLock = useRef(false);
  const wakeDetected = useRef(false);
  const userState = useRef<Record<string, string>>({});
  const wakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nameMap: Record<string, string> = {
    "switch.smart_plug_2_socket_1": "พัดลมห้องนอน",
    "switch.smart_plug_socket_1": "ไฟห้องนอน",
    "light.a60_rgb_w_wifi": "ไฟห้องนั่งเล่น",
  };

  useEffect(() => {
    setDevices([
      { entity_id: "switch.smart_plug_2_socket_1", state: "off" },
      { entity_id: "switch.smart_plug_socket_1", state: "off" },
      { entity_id: "light.a60_rgb_w_wifi", state: "off" },
    ]);

    const fetchStates = async () => {
      try {
      const res = await fetch(`${API_BASE}/devices/states`);
        const data = await res.json();
        if (data.ok && data.states.length > 0) {
          setDevices(prev => prev.map(d => {
            const found = data.states.find((s: any) => s.entity_id === d.entity_id);
            if (!found) return d;
            if (userState.current[d.entity_id]) {
              if (found.state === userState.current[d.entity_id]) delete userState.current[d.entity_id];
              else return d;
            }
            return { ...d, state: found.state };
          }));
        }
      } catch {}
    };

    const fetchStatus = async () => {
      try {
      const res = await fetch(`${API_BASE}/status`);
        const data = await res.json();
        if (data.executed?.length > 0) {
          data.executed.forEach((e: any) => { userState.current[e.entity_id] = e.action; });
          setDevices(prev => prev.map(d => {
            const ex = data.executed.find((e: any) => e.entity_id === d.entity_id);
            return ex ? { ...d, state: ex.action } : d;
          }));
        }
      } catch {}
    };

    fetchStates();
    const interval = setInterval(fetchStates, 2000);
    const statusInterval = setInterval(fetchStatus, 3000);
    return () => { clearInterval(interval); clearInterval(statusInterval); };
  }, []);

  function triggerEmoji() {
    const emojis = ["✨", "⚡", "🌟", "💡", "🎉"];
    const newEmojis = Array.from({ length: 4 }, (_, i) => ({
      id: Date.now() + i,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      x: Math.random() * 120 - 60,
    }));
    setFloatEmojis(newEmojis);
    setTimeout(() => setFloatEmojis([]), 1400);
  }

  function speak(text: string) {
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "th-TH";
      utter.rate = 0.85;
      utter.pitch = 1;
      utter.volume = 1;
      speechSynthesis.speak(utter);
    } catch {}
  }

  async function toggle(entity_id: string, state: string) {
    const action = state === "on" ? "off" : "on";

    userState.current[entity_id] = action;
    setDevices((prev) => prev.map((d) => d.entity_id === entity_id ? { ...d, state: action } : d));
    setAiState("thinking");

    try {
      const res = await fetch(`${API_BASE}/switch/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_id, source: "ui" }),
      });

      const data = await res.json();

      if (!data.ok) {
        delete userState.current[entity_id];
        setDevices((prev) => prev.map((d) => d.entity_id === entity_id ? { ...d, state } : d));
        speak("สั่งงานไม่สำเร็จ");
        setAiState("idle");
        return;
      }

      setAiState("success");
      triggerEmoji();
      setTimeout(() => setAiState("idle"), 1200);
    } catch {
      speak("เกิดข้อผิดพลาด");
      setAiState("idle");
    }
  }

  function startWakeLoop() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || wakeLock.current) return;

    wakeLock.current = true;
    wakeDetected.current = false;
    setWakeMode("waiting");

    if (wakeTimeoutRef.current) clearTimeout(wakeTimeoutRef.current);
    wakeTimeoutRef.current = setTimeout(() => stopWakeLoop(), 3 * 60 * 1000);

    const r = new SR();
    r.lang = "th-TH";
    r.continuous = true;
    r.interimResults = false;
    wakeRef.current = r;

    r.onresult = (event: any) => {
      if (wakeDetected.current) return;
      const last = event.results[event.results.length - 1];
      const text = (last[0].transcript || "").toLowerCase();
      console.log("👂 HEARD:", text);
      const blacklist = ["ไส้แน่น","ไส้เน่า","ไส้ใหญ่","ไส้เล็ก","ใจแนบ","ไซนัส"];
      const isBlacklisted = blacklist.some(b => text.includes(b));
      const synapsePatterns = ["ไซเนป","ไซแนป","ซิเนป","ไซเน็ป","ไซแนบ","ไซเนบ","ไซแน็ป","ใส่แนบ","ใส่แหนบ","สแนป","สแน็ป","ไซแนปส์","ไซนาป","ซิแนป","สไนป์","ไซแน็บ","hey snap","snap"];
      const hasSynapseClose = synapsePatterns.some(s => text.includes(s));
      const hasFullSynapse = /synap/.test(text);
      const isWake =
        !isBlacklisted && (
        hasFullSynapse ||
        text.includes("จุ๊กกรู๊ว") ||
        text.includes("จุกกรูว") ||
        text.includes("จุ๊กรู้") ||
        text.includes("จุกรู") ||
        text.includes("จุ้กครู้ว") ||
        hasSynapseClose);
      if (isWake) {
        wakeDetected.current = true;
        try { r.stop(); } catch {}
        setWakeMode("listening");
        setAiState("thinking");
        const wakeUtter = new SpeechSynthesisUtterance("ครับ มีอะไรให้ช่วยมั้ยครับ");
        wakeUtter.lang = "th-TH";
        wakeUtter.rate = 0.85;
        wakeUtter.onend = () => listenForCommand();
        speechSynthesis.speak(wakeUtter);
      }
    };

    r.onerror = (e: any) => {
      if (e.error === "no-speech") return;
      if (!wakeLock.current || wakeDetected.current) return;
      wakeLock.current = false;
      setTimeout(() => startWakeLoop(), 2500);
    };

    r.onend = () => {
      if (!wakeLock.current || wakeDetected.current) return;
      wakeLock.current = false;
      setTimeout(() => startWakeLoop(), 1500);
    };

    try { r.start(); } catch {}
  }

  function stopWakeLoop() {
    wakeLock.current = false;
    wakeDetected.current = false;
    setWakeMode("off");
    if (wakeTimeoutRef.current) { clearTimeout(wakeTimeoutRef.current); wakeTimeoutRef.current = null; }
    try { wakeRef.current?.stop(); } catch {}
    try { commandSRRef.current?.stop(); commandSRRef.current = null; } catch {}
  }

  async function listenForCommand() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const r = new SR();
    commandSRRef.current = r;
    r.lang = "th-TH";
    r.continuous = true;
    r.interimResults = true;

    const resume = () => {
      setAiState("idle");
      setHeardText("");
      if (!wakeLock.current) { try { r.stop(); } catch {} return; }
      setWakeMode("listening");
    };

    const resetTimer = () => {
      if (wakeTimeoutRef.current) clearTimeout(wakeTimeoutRef.current);
      wakeTimeoutRef.current = setTimeout(() => stopWakeLoop(), 3 * 60 * 1000);
    };

    r.onresult = async (event: any) => {
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      setHeardText(text);
      if (!result.isFinal) return;
      console.log("🎤 COMMAND:", text);
      try { r.stop(); } catch {}

      try {
        const res = await fetch(`${API_BASE}/ai/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            devices: devices.map((d) => ({ id: d.entity_id, name: nameMap[d.entity_id] || d.entity_id })),
          }),
        });
        const data = await res.json();
        console.log("AI RESPONSE:", data);
        if (data.commands?.length > 0) {
          data.commands.forEach((c: any) => {
            if (c.action === "on" || c.action === "off") userState.current[c.entity_id] = c.action;
          });
          setDevices((prev) =>
            prev.map((d) => {
              const cmd = data.commands.find((c: any) => c.entity_id === d.entity_id && (c.action === "on" || c.action === "off"));
              return cmd ? { ...d, state: cmd.action } : d;
            })
          );
        }
        speak(data.speech || "สั่งงานเรียบร้อยแล้วครับ");
        setAiState("success");
        triggerEmoji();
        resetTimer();
        setTimeout(() => {
          resume();
          setTimeout(() => { try { r.start(); } catch {} }, 300);
        }, 1500);
      } catch {
        speak("เกิดข้อผิดพลาด");
        resume();
        setTimeout(() => { try { r.start(); } catch {} }, 300);
      }
    };

    r.onerror = (e: any) => {
      if (e.error === "no-speech") return;
      resume();
    };
    r.onend = () => {};
 8
    try { r.start(); } catch { resume(); }
  }

  return (
    <div className={`min-h-screen flex transition-all duration-500 ${
      theme === "light" ? "bg-[#FFF8F0]" : "bg-[#1C1433]"
    }`}>

      {/* SIDEBAR */}
      <div className={`w-72 flex flex-col transition-all duration-500 ${
        theme === "light"
          ? "bg-[#FFFDF9]/90 backdrop-blur-xl border-r border-black/5 shadow-2xl"
          : "bg-[#160F2E]/90 backdrop-blur-xl border-r border-white/5 shadow-2xl"
      }`}>

        {/* Header */}
        <div className={`p-6 pb-5 border-b ${theme === "light" ? "border-black/5" : "border-white/5"}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-lg font-bold tracking-tight ${theme === "light" ? "text-gray-800" : "text-white"}`}>
                Synapse
              </h1>
              <p className={`text-xs mt-0.5 ${theme === "light" ? "text-gray-400" : "text-gray-500"}`}>
                Smart Home
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/logs"
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  theme === "light"
                    ? "bg-gray-100 hover:bg-gray-200 text-gray-500"
                    : "bg-white/10 hover:bg-white/15 text-gray-400"
                }`}
              >
                <BarChart2 className="w-4 h-4" />
              </Link>
              <button
                onClick={() => {
                  const next = theme === "light" ? "dark" : "light";
                  setTheme(next);
                  localStorage.setItem("theme", next);
                }}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  theme === "light"
                    ? "bg-gray-100 hover:bg-gray-200 text-gray-500"
                    : "bg-white/10 hover:bg-white/15 text-gray-400"
                }`}
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Device List */}
        <div className="flex-1 p-4 flex flex-col gap-3">
          <p className={`text-xs font-semibold uppercase tracking-widest px-1 mb-1 ${
            theme === "light" ? "text-gray-300" : "text-gray-700"
          }`}>อุปกรณ์</p>

          {devices.map((d) => {
            const isOn = d.state === "on";
            const isFan = d.entity_id.includes("tapo") || d.entity_id.includes("fan");
            const Icon = isFan ? Wind : Lightbulb;

            return (
              <div
                key={d.entity_id}
                className={`p-4 rounded-2xl transition-all duration-300 relative overflow-hidden ${
                  theme === "light"
                    ? isOn
                      ? "bg-gradient-to-br from-[#FF6B35] to-[#FF5A1F] text-white shadow-lg shadow-orange-200"
                      : "bg-gray-50 border border-gray-100 text-gray-700"
                    : isOn
                    ? "bg-gradient-to-br from-[#3B52E8] to-[#2B3FD4] text-white shadow-lg shadow-blue-900/40"
                    : "bg-[#141D35] border border-white/5 text-gray-300"
                }`}
              >
                {isOn && (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)]" />
                )}
                <div className="relative flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isOn ? "bg-white/20" : theme === "light" ? "bg-gray-100" : "bg-white/5"
                    }`}>
                      <Icon className={`w-4 h-4 ${isOn ? "text-white" : theme === "light" ? "text-gray-400" : "text-gray-500"}`} />
                    </div>
                    <div>
                      <h2 className={`text-sm font-semibold ${isOn ? "text-white" : theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                        {nameMap[d.entity_id] || d.entity_id}
                      </h2>
                      <p className={`text-xs mt-0.5 ${isOn ? "text-white/60" : theme === "light" ? "text-gray-400" : "text-gray-600"}`}>
                        {isOn ? "กำลังทำงาน" : "ปิดอยู่"}
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => toggle(d.entity_id, d.state)}
                    className={`w-12 h-6 flex items-center rounded-full px-1 cursor-pointer transition-all duration-300 ${
                      isOn ? "bg-white/30 justify-end" : theme === "light" ? "bg-gray-200 justify-start" : "bg-white/10 justify-start"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full shadow transition-all duration-300 ${
                      isOn ? "bg-white" : theme === "light" ? "bg-white" : "bg-gray-500"
                    }`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* MAIN AREA */}
      <div className={`flex-1 flex flex-col items-center justify-center relative overflow-hidden ${
        theme === "light"
          ? "bg-gradient-to-br from-[#FFF8F0] to-[#F5E8D8]"
          : "bg-gradient-to-br from-[#1C1433] to-[#120D28]"
      }`}>

        {/* Background glow */}
        <div className={`absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 pointer-events-none ${
          theme === "light" ? "bg-[#FF5A1F]" : "bg-[#7C3AED]"
        } transition-colors duration-700`} />


        {/* Cute home decorations */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          {theme === "light" ? (
            <>
              {/* กลางวัน */}
              <Sun className="absolute top-24 right-10 w-12 h-12 opacity-40 text-orange-300 animate-spin" style={{ animationDuration: "20s" }} />
              <Cloud className="absolute top-32 left-10 w-12 h-12 opacity-35 text-orange-200" />
              <Cloud className="absolute top-20 left-36 w-8 h-8 opacity-25 text-orange-100" />
              <HomeIcon className="absolute bottom-28 right-12 w-11 h-11 opacity-35 text-orange-300 rotate-[-3deg]" />
              <HomeIcon className="absolute bottom-36 left-12 w-9 h-9 opacity-25 text-orange-200 rotate-[4deg]" />
              <Sparkles className="absolute top-40 right-28 w-5 h-5 opacity-45 text-orange-400" />
              {[
                { top: "55%", left: "82%" },
                { top: "70%", left: "20%" },
                { top: "35%", left: "88%" },
              ].map((pos, i) => (
                <div key={i} className="absolute w-2 h-2 rounded-full animate-pulse opacity-30 bg-orange-300"
                  style={{ top: pos.top, left: pos.left, animationDelay: `${i * 0.6}s` }} />
              ))}
            </>
          ) : (
            <>
              {/* กลางคืน */}
              <Moon className="absolute top-24 right-10 w-10 h-10 opacity-40 text-blue-300" />
              <Star className="absolute top-20 left-16 w-6 h-6 opacity-50 text-blue-200 animate-pulse" style={{ animationDuration: "2s" }} />
              <Star className="absolute top-32 right-32 w-4 h-4 opacity-40 text-blue-300 animate-pulse" style={{ animationDuration: "3s" }} />
              <Star className="absolute top-40 left-32 w-3 h-3 opacity-35 text-blue-200 animate-pulse" style={{ animationDuration: "2.5s" }} />
              <HomeIcon className="absolute bottom-28 right-12 w-11 h-11 opacity-35 text-blue-400 rotate-[-3deg]" />
              <HomeIcon className="absolute bottom-36 left-12 w-9 h-9 opacity-25 text-blue-300 rotate-[4deg]" />
              <Sparkles className="absolute top-36 right-28 w-5 h-5 opacity-45 text-blue-300" />
              {[
                { top: "55%", left: "82%" },
                { top: "70%", left: "20%" },
                { top: "35%", left: "88%" },
                { top: "15%", left: "55%" },
                { top: "80%", left: "60%" },
              ].map((pos, i) => (
                <div key={i} className="absolute w-1.5 h-1.5 rounded-full animate-pulse opacity-40 bg-blue-300"
                  style={{ top: pos.top, left: pos.left, animationDelay: `${i * 0.5}s` }} />
              ))}
            </>
          )}
        </div>

        {/* Robot + ring */}
        <div className="relative flex flex-col items-center justify-center">
          {wakeMode !== "off" && (
            <div className={`absolute w-80 h-80 rounded-full border-2 animate-ping opacity-10 ${
              theme === "light" ? "border-[#FF5A1F]" : "border-blue-400"
            }`} />
          )}
          {/* Floating emojis on success */}
          {floatEmojis.map((e) => (
            <div
              key={e.id}
              className="float-up absolute text-xl pointer-events-none"
              style={{ left: `calc(50% + ${e.x}px)`, bottom: "60px" }}
            >
              {e.emoji}
            </div>
          ))}

          <div className="robot-wander">
            <div className={`w-64 transition-all duration-300 ${
              aiState === "thinking" ? "robot-think scale-110" : "robot-float scale-100"
            }`}>
              <svg viewBox="0 0 268 268" className="w-full" role="img" aria-label="บ้าน Synapse">
                <image href={synapseRobot.src} x="0" y="0" width="268" height="268" preserveAspectRatio="xMidYMid meet"/>
              </svg>
            </div>
            {/* Shadow blob under robot */}
            <div className={`robot-shadow w-32 h-4 rounded-full blur-md -mt-4 mx-auto ${
              theme === "light" ? "bg-[#FF5A1F]" : "bg-[#2B3FD4]"
            }`} />
          </div>
        </div>

        {/* Speech Bubble */}
        <div className="relative mt-2 flex flex-col items-center">
          {/* หางชี้ขึ้น */}
          <div className="relative w-4 h-2 overflow-hidden">
            <div className={`absolute w-3 h-3 rotate-45 top-1 left-0.5 ${
              theme === "light"
                ? "bg-white/90 shadow-sm"
                : "bg-[#1E2A4A]"
            }`} />
          </div>
          <div className={`relative px-6 py-3 rounded-2xl text-sm font-medium max-w-[260px] text-center transition-all duration-300 ${
            theme === "light"
              ? "bg-white/90 backdrop-blur text-gray-600 shadow-[0_8px_32px_rgba(255,90,31,0.15)] border border-white"
              : "bg-[#1E2A4A]/90 backdrop-blur text-gray-300 shadow-[0_8px_32px_rgba(43,63,212,0.25)] border border-white/10"
          }`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle ${
              wakeMode !== "off"
                ? theme === "light" ? "bg-[#FF5A1F] animate-pulse" : "bg-blue-400 animate-pulse"
                : "bg-gray-300"
            }`} />
            {wakeMode === "waiting" && 'ทักทายฉันด้วย "Synapse Home"'}
            {wakeMode === "listening" && (heardText ? `"${heardText}"` : "กำลังฟังคำสั่ง...")}
            {wakeMode === "off" && aiState === "idle" && "พักอยู่"}
            {aiState === "thinking" && wakeMode !== "listening" && "กำลังประมวลผล..."}
            {aiState === "success" && "สำเร็จ ✓"}
          </div>
        </div>

        {/* Wake Button */}
        <div className="absolute bottom-10 flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center">
            {wakeMode !== "off" && (
              <>
                <div className={`absolute w-24 h-24 rounded-full animate-ping opacity-20 ${
                  theme === "light" ? "bg-[#FF5A1F]" : "bg-[#2B3FD4]"
                }`} />
                <div className={`absolute w-20 h-20 rounded-full opacity-30 ${
                  theme === "light" ? "bg-[#FF5A1F]" : "bg-[#2B3FD4]"
                }`} />
              </>
            )}
            <button
              onClick={wakeMode === "off" ? startWakeLoop : stopWakeLoop}
              className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                wakeMode !== "off"
                  ? theme === "light"
                    ? "bg-gradient-to-br from-[#FF6B35] to-[#FF5A1F] text-white shadow-[0_8px_32px_rgba(255,90,31,0.5)] scale-110"
                    : "bg-gradient-to-br from-[#4B62F8] to-[#2B3FD4] text-white shadow-[0_8px_32px_rgba(43,63,212,0.6)] scale-110"
                  : theme === "light"
                  ? "bg-white/80 backdrop-blur text-gray-400 shadow-xl border border-gray-100 hover:scale-110 hover:shadow-2xl"
                  : "bg-white/10 backdrop-blur text-gray-400 shadow-xl border border-white/10 hover:scale-110 hover:bg-white/20"
              }`}
            >
              {wakeMode === "listening"
                ? <Mic className="w-6 h-6 animate-pulse" />
                : wakeMode === "waiting"
                ? <Mic className="w-6 h-6" />
                : <MicOff className="w-6 h-6" />
              }
            </button>
          </div>
          <p className={`text-xs tracking-wide ${theme === "light" ? "text-gray-400" : "text-gray-500"}`}>
            {wakeMode === "listening" ? "กำลังฟัง..." : wakeMode === "waiting" ? "แตะเพื่อปิด" : "แตะเพื่อเปิดไมค์"}
          </p>
        </div>
      </div>
    </div>
  );
}


