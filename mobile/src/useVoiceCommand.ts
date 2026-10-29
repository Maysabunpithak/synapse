import { thaiError } from "./thai";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import * as Speech from "expo-speech";
import { File } from "expo-file-system";
import { startWebRecording, type WebRecording } from "./webRecording";
import { createSpokenReply } from "./spokenReply";
import { shouldCancelVoiceOnAppState } from "./voiceLifecycle";
import { createSilenceDetector } from "./voiceSilence";

type Stage = "idle" | "permission" | "recording" | "transcribing" | "command";

const VOICE_RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  numberOfChannels: 1,
  isMeteringEnabled: true,
};
const COMMAND_CAPTURE_TIMEOUT_MS = 30_000;

type Options = {
  active: boolean;
  api: string;
  demo: boolean;
  onTranscript: (text: string) => void;
  onReply: (text: string) => void;
  onComplete: () => Promise<void>;
};

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

/** A foreground conversation; recording pauses while commands and replies run. */
export function useVoiceCommand(options: Options) {
  const [speaking, setSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [outcome, setOutcome] = useState<"success" | "error" | null>(null);
  const [successAt, setSuccessAt] = useState(0);
  const latest = useRef(options);
  latest.current = options;
  const spokenReply = useRef<ReturnType<typeof createSpokenReply> | null>(null);
  if (!spokenReply.current)
    spokenReply.current = createSpokenReply(Speech, (text) => latest.current.onReply(text), setSpeaking);

  const [stage, setStage] = useState<Stage>("idle");
  const [sessionActive, setSessionActive] = useState(false);
  const session = useRef(false);
  const captureMode = useRef<"continuous" | "hold" | "tap">("tap");
  const holding = useRef(false);
  const finishing = useRef(false);
  const cleanup = useRef<Promise<unknown>>(Promise.resolve());
  const stageRef = useRef<Stage>("idle");
  const captureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishRef = useRef<(empty?: boolean) => Promise<void>>(async () => {});
  const generation = useRef(0);
  const preparing = useRef(false);
  const requestingPermission = useRef(false);
  const webRecording = useRef<WebRecording | null>(null);
  const controller = useRef<AbortController | null>(null);

  function transition(next: Stage) {
    stageRef.current = next;
    setStage(next);
  }

  function setSession(active: boolean) {
    if (!active) holding.current = false;
    session.current = active;
    setSessionActive(active);
  }

  function clearCaptureTimers() {
    setAudioLevel(0);
    if (silenceTimer.current) clearInterval(silenceTimer.current);
    silenceTimer.current = null;
    if (captureTimer.current) clearTimeout(captureTimer.current);
    captureTimer.current = null;
  }

  function respond(text: string, waitForEnd = false) {
    return spokenReply.current?.reply(text, waitForEnd);
  }

  const recorder = useAudioRecorder(VOICE_RECORDING_OPTIONS, (status) => {
    if (!status.hasError && !(status.isFinished && stageRef.current === "recording")) return;
    generation.current += 1;
    setOutcome("error");
    setSession(false);
    clearCaptureTimers();
    transition("idle");
    void setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    if (latest.current.active) void respond("การบันทึกเสียงหยุดลง กรุณาแตะตัวบ้านแล้วลองใหม่");
  });

  const cancel = useCallback(() => {
    holding.current = false;
    generation.current += 1;
    setOutcome(null);
    setSession(false);
    clearCaptureTimers();
    controller.current?.abort();
    controller.current = null;
    const recording = webRecording.current;
    webRecording.current = null;
    try { recording?.discard(); } catch { /* recorder already released */ }
    if (Platform.OS !== "web" && (stageRef.current === "recording" || preparing.current)) {
      try { cleanup.current = recorder.stop().catch(() => {}); } catch { /* never prepared */ }
    }
    transition("idle");
    void spokenReply.current?.stop();
    cleanup.current = cleanup.current.then(() => setAudioModeAsync({ allowsRecording: false })).catch(() => {});
  }, [recorder]);

  useEffect(() => {
    if (!options.active) cancel();
  }, [options.active, cancel]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (shouldCancelVoiceOnAppState(state, stageRef.current, requestingPermission.current)) cancel();
    });
    return () => { subscription.remove(); cancel(); };
  }, [cancel]);

  async function start() {
    if (stageRef.current !== "idle" || preparing.current || !latest.current.active || !session.current) return;
    if (!latest.current.api) {
      setOutcome("error");
      setSession(false);
      void respond("กรุณาเชื่อมต่อ Synapse API ก่อนใช้คำสั่งเสียง");
      return;
    }
    if (Platform.OS === "web" && (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")) {
      setOutcome("error");
      setSession(false);
      void respond("เบราว์เซอร์นี้ยังเปิดไมโครโฟนไม่ได้ กรุณาเปิดผ่าน HTTPS หรือ localhost");
      return;
    }

    const id = ++generation.current;
    const valid = () => generation.current === id && latest.current.active;
    transition("permission");
    preparing.current = true;
    try {
      await cleanup.current;
      await spokenReply.current?.stop();
      if (!valid()) return;
      if (Platform.OS === "web") {
        const recording = await startWebRecording(valid);
        if (!valid()) { recording.discard(); return; }
        webRecording.current = recording;
      } else {
        requestingPermission.current = true;
        let permission: Awaited<ReturnType<typeof AudioModule.getRecordingPermissionsAsync>>;
        try {
          permission = await AudioModule.getRecordingPermissionsAsync();
          if (!permission.granted) permission = await AudioModule.requestRecordingPermissionsAsync();
        } finally {
          requestingPermission.current = false;
        }
        if (!valid()) return;
        if (!permission.granted) throw new Error("กรุณาอนุญาตไมโครโฟนในการตั้งค่าแอป แล้วลองอีกครั้งค่ะ");
        if (AppState.currentState !== "active") throw new Error("กลับมาที่หน้าแอป แล้วแตะตัวบ้านอีกครั้งค่ะ");
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync(VOICE_RECORDING_OPTIONS);
        if (!valid()) { await recorder.stop().catch(() => {}); return; }
        recorder.record();
      }
      if (!valid()) return;
      transition("recording");
      setOutcome(null);
      if (captureMode.current !== "hold") {
        const detect = createSilenceDetector(Date.now());
        silenceTimer.current = setInterval(() => {
          if (!valid() || stageRef.current !== "recording") return;
          let metering: number | undefined;
          if (Platform.OS === "web") metering = webRecording.current?.getMetering();
          else {
            const status = recorder.getStatus();
            if (!status.isRecording) return;
            metering = status.metering;
          }
          setAudioLevel(typeof metering === "number" && Number.isFinite(metering) ? Math.max(0, Math.min(1, (metering + 55) / 45)) : 0);
          const action = detect(metering, Date.now());
          if (action === "send") void finishRef.current(false);
          if (action === "empty") void finishRef.current(true);
        }, 100);
      }
      captureTimer.current = setTimeout(() => void finishRef.current(false), COMMAND_CAPTURE_TIMEOUT_MS);
    } catch (error) {
      if (valid()) {
        setSession(false);
        setOutcome("error");
        transition("idle");
        void respond(thaiError(error, "เปิดไมโครโฟนไม่สำเร็จ กรุณาลองใหม่"));
      }
      try { webRecording.current?.discard(); } catch { /* already released */ }
      webRecording.current = null;
      if (Platform.OS !== "web") await recorder.stop().catch(() => {});
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    } finally {
      preparing.current = false;
    }
  }

  async function finish(empty = false) {
    if (stageRef.current !== "recording") return;
    // Tap and hold each capture one command; only continuous mode reopens the mic.
    if (captureMode.current !== "continuous") setSession(false);
    finishing.current = true;
    const id = generation.current;
    const valid = () => generation.current === id && latest.current.active;
    clearCaptureTimers();
    transition("transcribing");
    const abort = new AbortController();
    controller.current = abort;
    const deadline = setTimeout(() => abort.abort(), 60_000);
    try {
      let audioPart: Blob | File | null = null;
      let fileName = "command.webm";
      if (Platform.OS === "web") {
        const recording = webRecording.current;
        webRecording.current = null;
        if (!recording) throw new Error("ไม่พบเสียงที่บันทึก กรุณาลองใหม่");
        if (empty) recording.discard();
        else {
          audioPart = await recording.stop();
          if (audioPart.type.includes("mp4")) fileName = "command.m4a";
        }
      } else {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false });
        if (!valid()) return;
        if (!empty) {
          const uri = recorder.uri;
          if (!uri) throw new Error("ไม่พบเสียงที่บันทึก กรุณาลองใหม่");
          const audio = new File(uri);
          if (!audio.exists || audio.size === 0) throw new Error("ยังไม่ได้ยินคำสั่ง กรุณาพูดใหม่");
          audioPart = audio;
          fileName = "command.m4a";
        }
      }
      if (!valid()) return;
      if (empty) {
        return;
      }
      if (!audioPart?.size) throw new Error("ยังไม่ได้ยินคำสั่ง กรุณาพูดใหม่");

      const form = new FormData();
      form.append("audio", audioPart, fileName);
      const response = await fetch(latest.current.api + "/transcribe", { method: "POST", body: form, signal: abort.signal });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || "แปลงเสียงไม่สำเร็จ กรุณาลองใหม่");
      const text = typeof data.text === "string" ? data.text.trim() : "";
      if (!text) throw new Error("ยังไม่ได้ยินคำสั่ง กรุณาพูดใกล้ไมโครโฟนแล้วลองใหม่");
      if (!valid()) return;

      latest.current.onTranscript(text);
      transition("command");
      if (latest.current.demo) {
        await respond("ได้ยินแล้วค่ะ แต่ขณะนี้เป็นโหมดตัวอย่าง จึงยังไม่สั่งอุปกรณ์จริง", true);
        return;
      }
      const command = await fetch(latest.current.api + "/ai/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, source: "voice" }),
        signal: abort.signal,
      });
      const result = await command.json().catch(() => null);
      if (!valid()) return;
      if (!command.ok || !result) throw new Error("ส่งคำสั่งไม่สำเร็จ กรุณาลองใหม่");
      setOutcome(result.ok ? "success" : "error");
      if (result.ok) setSuccessAt(Date.now());
      await respond(result.speech || (result.ok ? "ส่งคำสั่งแล้วค่ะ" : "ยังไม่เข้าใจคำสั่ง กรุณาลองใหม่"), true);
      if (valid() && result.ok) await latest.current.onComplete().catch(() => {});
    } catch (error) {
      if (valid()) {
        setOutcome("error");
        await respond(isAbortError(error) ? "ใช้เวลานานเกินไป กรุณาตรวจการเชื่อมต่อแล้วลองใหม่" : thaiError(error, "รับคำสั่งเสียงไม่สำเร็จ กรุณาลองใหม่"), true);
      }
    } finally {
      clearTimeout(deadline);
      if (controller.current === abort) controller.current = null;
      finishing.current = false;
      if (valid()) {
        transition("idle");
        if (session.current) await start();
      }
    }
  }

  finishRef.current = finish;

  async function tap() {
    if (session.current) { cancel(); return; }
    if (stageRef.current !== "idle" || preparing.current || finishing.current || !latest.current.active) return;
    captureMode.current = "tap";
    setSession(true);
    setOutcome(null);
    latest.current.onTranscript("");
    latest.current.onReply("กำลังเปิดไมโครโฟน รอข้อความพร้อมฟังแล้วพูดค่ะ");
    await start();
  }

  async function toggle() {
    if (session.current) { cancel(); return; }
    if (stageRef.current !== "idle" || preparing.current || finishing.current) return;
    captureMode.current = "continuous";
    setSession(true);
    setOutcome(null);
    latest.current.onTranscript("");
    latest.current.onReply("กำลังฟังคำสั่ง พูดได้เลยค่ะ ระบบจะส่งเมื่อพูดจบ");
    await start();
  }

  async function beginHold() {
    if (holding.current || session.current || stageRef.current !== "idle" || preparing.current || finishing.current || !latest.current.active) return;
    captureMode.current = "hold";
    holding.current = true;
    setSession(true);
    setOutcome(null);
    latest.current.onTranscript("");
    latest.current.onReply("กำลังเปิดไมโครโฟน รอข้อความพร้อมฟังแล้วพูดค่ะ");
    await start();
  }

  async function endHold() {
    if (!holding.current) return;
    holding.current = false;
    if (stageRef.current === "permission") { cancel(); return; }
    if (stageRef.current === "recording") {
      setSession(false);
      await finish();
    }
  }

  return { stage, sessionActive, speaking, audioLevel, outcome, successAt, tap, toggle, beginHold, endHold, cancel };
}
