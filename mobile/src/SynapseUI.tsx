import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  Clock3,
  DoorClosed,
  DoorOpen,
  Globe2,
  House,
  Info,
  Lightbulb,
  LockKeyhole,
  Mail,
  Mic,
  Monitor,
  Moon,
  Plus,
  Plug,
  Settings,
  Sparkles,
  UserRound,
  Wifi,
  X,
  LayoutGrid,
} from "./SynapseIcons";
import { useVoiceCommand } from "./useVoiceCommand";
import { useAutoLight } from "./useAutoLight";
import { activitySource, type ActivitySource } from "./activitySource";
import NavHome from "lucide-react-native/icons/house";
import NavRooms from "lucide-react-native/icons/layout-grid";
import NavMic from "lucide-react-native/icons/mic";
import NavAutomation from "lucide-react-native/icons/git-branch";
import NavHistory from "lucide-react-native/icons/rotate-ccw-clock";
import RoomVisual from "./RoomVisual";
import RoomEditor from "./RoomEditor";
import HistoryScreen from "./HistoryScreen";
import { historySummary } from "./historySummary";
import { mergeHistory } from "./mergeHistory";
import AICompanionScreen from "./AICompanionScreen";
import AssistantOrb from "./AssistantOrb";
import DeviceGlyph from "./DeviceGlyph";
import DeviceCompanion from "./DeviceCompanion";
import PendingDots from './PendingDots';
import { useWifiAutomation } from './useWifiAutomation';
import { useServerPresence } from './useServerPresence';
import RoomEnvironment, { useRoomEnvironment } from './RoomEnvironment';
import { MotionProvider, MotionPressable as Pressable, ScreenEntrance, DeviceSurface, MascotMotion } from "./Motion";
import SynapsePose from "./SynapsePose";
import LoginRoomBackdrop from "./LoginRoomBackdrop";
import { useHomeWifi } from "./useHomeWifi";
import { authFont, headingFont, palette as C } from "./theme";
import type { DeviceFeedback } from './houseInteraction';
import { accountApi, authRequest, type AuthSession } from "./authClient";
import { thaiLabel, thaiError } from "./thai";

export type Device = {
  entity_id: string;
  name: string;
  domain: string;
  state: string;
  attributes?: Record<string, unknown>;
};
type Scene = { label: string; icon: string; command: string };
type Props = {
  deviceFeedback?: DeviceFeedback | null;
  devices: Device[];
  demo: boolean;
  loading: boolean;
  sending: boolean; pendingDeviceId?: string | null;
  tab: string;
  setTab: (tab: string) => void;
  reload: () => Promise<void>;
  toggle: (d: Device) => Promise<void>;
  scene: (s: Scene) => Promise<string>;
  pair: () => void;
  api: string;
};
type Summary = {
  entity_id: string;
  label: string;
  on_count: number;
  off_count: number;
  peak_hour: number;
  hourly: number[];
  total: number;
};
type History = {
  timestamp: string;
  entity_id: string;
  voice_input: string;
  ai_action: string;
  source?: string;
  simulated_source?: string;
  success?: boolean;
};
const sceneList = [
  { label: "กลับบ้าน", icon: "home", command: "กลับบ้าน", Icon: DoorOpen },
  {
    label: "ออกจากบ้าน",
    icon: "away",
    command: "ออกจากบ้าน",
    Icon: DoorClosed,
  },
  {
    label: "เข้าห้องนอน",
    icon: "night",
    command: "ถึงห้องนอน",
    Icon: Moon,
  },
  { label: "อ่านหนังสือ", icon: "read", command: "โหมดทำงาน", Icon: BookOpen },
  { label: "ดูหน้าจอ", icon: "screen", command: "โหมดดูจอ", Icon: Monitor },
  { label: "ทำงาน", icon: "work", command: "โหมดทำงาน", Icon: Monitor },
];
const navigation = [
  { key: "Home", Icon: NavHome },
  { key: "Rooms", Icon: NavRooms },
  { key: "AI", Icon: NavMic },
  { key: "Automation", Icon: NavAutomation },
  { key: "History", Icon: NavHistory },
];
export function roomOf(d: Device) {
  const n = d.name.toLowerCase();
  return /ห้องนอน|bedroom/.test(n)
    ? "ห้องนอน"
    : /นั่งเล่น|living/.test(n)
      ? "ห้องนั่งเล่น"
      : /ครัว|kitchen/.test(n)
        ? "ห้องครัว"
        : /ทำงาน|desk|office/.test(n)
          ? "ห้องทำงาน"
          : "ห้องอื่น ๆ";
}
function isFan(d: Device) {
  return d.domain === "fan" || /พัดลม|fan/i.test(d.name);
}
function titleOf(d: Device) {
  return d.name || d.entity_id;
}
function DeviceIcon({
  device,
  size = 28,
  color = C.sand,
}: {
  device: Device;
  size?: number;
  color?: string;
}) {
  const kind = isFan(device)
    ? "fan"
    : /light|ไฟ/i.test(device.domain + device.name)
      ? "light"
      : device.domain === "switch" ? "plug" : "power";
  const icon = <DeviceGlyph kind={kind} size={size} color={color} active={device.state === "on"} />;
  return icon;
}
function Mascot({ large = false }: { large?: boolean }) {
  return (
    <MascotMotion>
    <View style={[s.mascot, large && s.mascotLarge]}>
      <SynapsePose activity="awake" width={large ? 240 : 200} height={large ? 285 : 236}/>
    </View>
    </MascotMotion>
  );
}
function SmallSwitch({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      aria-checked={value}
      disabled={disabled}
      onPress={onChange}
      style={[s.switchHitArea, disabled && { opacity: 0.45 }]}
    >
      <View style={[s.switchTrack, { backgroundColor: value ? C.orange : C.line }]}>
        <View style={[s.switchThumb, { alignSelf: value ? "flex-end" : "flex-start", backgroundColor: value ? C.brown : C.white }]} />
      </View>
    </Pressable>
  );
}

export default function SynapseUI(p: Props) {
  return <MotionProvider active={p.tab !== "Pairing"}><SynapseContent {...p} /></MotionProvider>;
}

function SynapseContent(p: Props) {
  const roomEnvironment = useRoomEnvironment(p.api, p.demo);
  const scrollRef = useRef<ScrollView>(null);
  const [entered, setEntered] = useState(false);
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [session, setSession] = useState<AuthSession | null>(null);
  const authBase = accountApi(p.api);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Device | null>(null);
  const [brightness, setBrightness] = useState(40);
  const [warm, setWarm] = useState(true);
  const lightValues = useRef({ brightness: 40, warm: true });
  const powerBusy = useRef(false);
  const [powerSaving, setPowerSaving] = useState(false);
  const lightControl = useAutoLight({ deviceId: selected?.entity_id, api: p.api, demo: p.demo, reload: p.reload });
  const [summary, setSummary] = useState<Summary[]>([]);
  const [sampleHistory, setSampleHistory] = useState(false);
  const [profileHistory, setProfileHistory] = useState<History[]>([]);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [activityFilter, setActivityFilter] = useState<ActivitySource | "all">("all");
  const [seededAuto, setSeededAuto] = useState(false);
  const [dayContext, setDayContext] = useState<{ dayType: string | null; holidays: { name: string }[] } | null>(null);
  const [automation, setAutomation] = useState<{ entity_id: string; label: string; status: string; reason: string }[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [logError, setLogError] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [upcoming, setUpcoming] = useState<{ entity_id: string; label: string; next_window_at: string; peak_hour?: number; status: string }[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [roomFilter, setRoomFilter] = useState("All");
  const [setting, setSetting] = useState<string | null>(null);
  const homeWifi = useHomeWifi(entered && !p.demo);
  useWifiAutomation(p.api, entered && !p.demo, homeWifi.atHome, p.reload);
  const serverHome = useServerPresence(p.api, entered && !p.demo && Platform.OS !== "android");
  const atHome = p.demo ? true : Platform.OS === 'android' ? homeWifi.atHome : serverHome;
  const [notifications, setNotifications] = useState(true);
  const [heardText, setHeardText] = useState("");
  const [reply, setReply] = useState("แตะตัวบ้านแล้วพูด พูดจบแล้วส่งคำสั่งอัตโนมัติค่ะ");
  const voice = useVoiceCommand({
    active: entered && p.tab === "AI",
    api: accountApi(p.api),
    demo: p.demo,
    onTranscript: setHeardText,
    onReply: setReply,
    onComplete: p.reload,
  });
  const listening = voice.stage === "recording";
  const chatBusy =
    voice.stage === "permission" ||
    voice.stage === "transcribing" ||
    voice.stage === "command";
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function tell(text: string) {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 6000);
  }
  useEffect(() => { if (p.deviceFeedback && Date.now() - p.deviceFeedback.createdAt < 4000) tell(p.deviceFeedback.message); }, [p.deviceFeedback]);
  async function submitAccount() {
    if (authBusy) return;
    setAuthError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setAuthError("Enter a valid email address.");
      return;
    }
    if (signup && !username.trim()) {
      setAuthError("Enter your full name.");
      return;
    }
    if (!password || (signup && password.length < 8)) {
      setAuthError(signup ? "Use a password with at least 8 characters." : "Enter your password.");
      return;
    }
    if (signup && password !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }
    setAuthBusy(true);
    try {
      const result = await authRequest<AuthSession>(
        authBase,
        signup ? "/register" : "/login",
        {
          email: email.trim(),
          password,
          ...(signup ? { name: username.trim() } : {}),
        },
        undefined,
        "en",
      );
      if (!result.user?.id || !result.token || !result.expiresAt)
        throw new Error("Unable to complete your request. Please try again.");
      setSession(result);
      setPassword("");
      setConfirmPassword("");
      setEntered(true);
      go("Home");
      tell(
        signup ? "สร้างบัญชีสำเร็จ ยินดีต้อนรับค่ะ" : "เข้าสู่ระบบสำเร็จค่ะ",
      );
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Unable to complete your request. Please try again.",
      );
    } finally {
      setAuthBusy(false);
    }
  }
  async function logout() {
    if (authBusy) return;
    setAuthBusy(true);
    try {
      if (session) await authRequest(authBase, "/logout", {}, session.token);
    } catch {
      tell(
        "ออกจากระบบในแอปแล้ว เซิร์ฟเวอร์ไม่ตอบกลับ เซสชันเดิมจะหมดอายุภายใน 24 ชั่วโมง",
      );
    } finally {
      setSession(null);
      setEntered(false);
      setSetting(null);
      setPassword("");
      setConfirmPassword("");
      setAuthError("");
      setSignup(false);
      voice.cancel();
      setAuthBusy(false);
    }
  }
  useEffect(() => {
    if (!session) return;
    const timeout = setTimeout(
      () => {
        setSession(null);
        setEntered(false);
        setAuthError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง");
        voice.cancel();
      },
      Math.max(0, session.expiresAt - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [session]);
  useEffect(
    () => () => {
      voice.cancel();
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );
  const rooms = Object.entries(
    p.devices.reduce<Record<string, Device[]>>((out, d) => {
      const r = roomOf(d);
      (out[r] ||= []).push(d);
      return out;
    }, {}),
  );
  const current =
    p.devices.find((d) => d.entity_id === selected?.entity_id) || selected;
  const activeCount = p.devices.filter((d) => d.state === "on").length;
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [p.tab, current?.entity_id, setting]);
  const visibleRooms = rooms.filter(([room]) => roomFilter === "All" || room === roomFilter);
  const visibleDevices = p.devices.filter((d) => roomFilter === "All" || roomOf(d) === roomFilter);
  useEffect(() => {
    if (roomFilter !== "All" && !rooms.some(([room]) => room === roomFilter)) setRoomFilter("All");
  }, [p.devices, roomFilter]);
  function go(tab: string) {
    void lightControl.flush();
    setSelected(null);
    setSetting(null);
    p.setTab(tab);
  }
  async function loadLogs() {
    if (p.demo || !p.api) return;
    setLogLoading(true);
    try {
      const responses = await Promise.all(
        ["/logs/analyze", "/logs/history"].map((path) =>
          fetch(p.api + path),
        ),
      );
      if (responses.some((r) => !r.ok)) throw new Error();
      const [a, h] = await Promise.all(responses.map((r) => r.json()));
      if (!a.ok || !h.ok) throw new Error();
      setSummary(a.summary || []);
      setAutomation(a.automation || []);
      setDayContext(a.day_context || null);
      setUpcoming(a.upcoming || []);
      setHistory(h.history || []);
      setSampleHistory(false);
      if (p.tab === 'History' || p.tab === 'Automation') {
        const sampleResponse = await fetch(p.api + '/logs/sample-history');
        if (sampleResponse.ok) {
          const sample = await sampleResponse.json();
          if (sample.ok && sample.sample === true) {
            setProfileHistory(sample.history || []);
            setHistory(mergeHistory(h.history || [], sample.history || []));
            setSummary(historySummary(a.summary || [], sample.summary || [], sample.used_for_auto === true));
            setSeededAuto(sample.used_for_auto === true);
            setSampleHistory(!h.history?.length);
          }
        }
      }
      setLogError(false);
    } catch {
      setLogError(true);
    } finally {
      setLogLoading(false);
    }
  }
  useEffect(() => {
    if (p.tab !== "Home" && p.tab !== "History" && p.tab !== "Automation") return;
    void loadLogs();
    const timer = setInterval(() => void loadLogs(), 15000);
    return () => clearInterval(timer);
  }, [p.tab, p.demo, p.api]);
  function openDevice(d: Device) {
    if (d.domain !== "light") {
      void p.toggle(d);
      return;
    }
    const nextBrightness = Math.max(1, Math.min(100, Math.round(Number(d.attributes?.brightness ?? 102) / 255 * 100)));
    const nextWarm = Number(d.attributes?.color_temp_kelvin ?? 2700) < 4000;
    lightValues.current = { brightness: nextBrightness, warm: nextWarm };
    setBrightness(nextBrightness);
    setWarm(nextWarm);
    setSelected(d);
  }
  function changeBrightness(value: number | ((previous: number) => number)) {
    if (!current || powerBusy.current) return;
    const next = Math.max(1, Math.min(100, typeof value === "function" ? value(lightValues.current.brightness) : value));
    lightValues.current.brightness = next;
    setBrightness(next);
    lightControl.change(current, next, lightValues.current.warm);
  }
  function changeWarm(value: boolean) {
    if (!current || powerBusy.current) return;
    lightValues.current.warm = value;
    setWarm(value);
    lightControl.change(current, lightValues.current.brightness, value);
  }
  async function toggleLightPower() {
    if (!current || powerBusy.current) return;
    powerBusy.current = true;
    setPowerSaving(true);
    try {
      // A queued brightness write must never turn the light back on after Power off.
      await lightControl.cancel();
      await p.toggle(current);
    } finally { powerBusy.current = false; setPowerSaving(false); }
  }
  const sampleSummaries: Summary[] = p.devices.slice(0, 3).map((d, i) => ({
    entity_id: d.entity_id,
    label: d.name,
    on_count: [217, 179, 196][i],
    off_count: [117, 87, 40][i],
    total: [334, 266, 236][i],
    peak_hour: [18, 21, 22][i],
    hourly: Array.from({ length: 24 }, (_, h) => ((h * 7 + i * 5) % 13) + 2),
  }));
  const stats = p.demo ? sampleSummaries : summary;
  const miniTitle = (title: string, back?: () => void) => (
    <View style={s.header}>
      <View style={s.row}>
        {back && (
          <Pressable accessibilityLabel="ย้อนกลับ" onPress={back} style={s.back}>
            <ArrowLeft size={21} color={C.sand} />
          </Pressable>
        )}
        <Text style={s.title}>{thaiLabel(title)}</Text>
      </View>
      <Pressable
        accessibilityLabel="ตั้งค่า"
        onPress={() => go("Settings")}
        style={s.iconButton}
      >
        <Settings size={19} color={C.brown} />
      </Pressable>
    </View>
  );
  const banner = notice ? (
    <Pressable
      accessibilityLabel="ปิดข้อความ"
      style={s.toast}
      onPress={() => setNotice("")}
    >
      {p.deviceFeedback?.message === notice && <DeviceCompanion key={p.deviceFeedback.id} state="off" size={48} restWhenOff={false} feedback={p.deviceFeedback}/>}
      <Text accessibilityLiveRegion="polite" style={s.toastText}>{notice}</Text>
      <X size={16} color={C.brown} />
    </Pressable>
  ) : null;

  function renderLight(): React.ReactNode {
    if (!current) return null;
    return (
      <>
        {miniTitle(roomOf(current), () => { void lightControl.flush(); setSelected(null); })}
        <RoomVisual room={roomOf(current)} devices={p.devices.filter(d => roomOf(d) === roomOf(current))} style={s.lightHero}>
          <View style={s.between}>
            <View style={s.glassChip}><Lightbulb size={16} color={C.orange} /><Text style={s.glassChipText}>แสงไฟอัจฉริยะ</Text></View>
            <View style={s.glassChip}>{(p.pendingDeviceId === current.entity_id || lightControl.status === "saving") && <PendingDots/>}<Text style={s.glassChipText}>{p.demo ? "ตัวอย่าง" : current.state === "on" ? "เปิด" : "ปิด"}</Text></View>
          </View>
          <View><Text style={s.photoRoomTitle}>{titleOf(current)}</Text><Text style={s.photoRoomCaption}>ปรับแสงให้เข้ากับทุกช่วงเวลา</Text></View>
        </RoomVisual>
        <View style={s.lightControlArea}>
          <View style={s.verticalControl}>
            <View
              style={s.verticalRail}
              accessibilityRole="adjustable"
              accessibilityLabel="ความสว่างของไฟ"
              accessibilityValue={{ min: 1, max: 100, now: brightness }}
              aria-valuemin={1}
              aria-valuemax={100}
              aria-valuenow={brightness}
              accessibilityActions={[
                { name: "increment" },
                { name: "decrement" },
              ]}
              onAccessibilityAction={(e) =>
                changeBrightness((v) =>
                  Math.min(
                    100,
                    Math.max(
                      1,
                      v + (e.nativeEvent.actionName === "increment" ? 10 : -10),
                    ),
                  ),
                )
              }
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderRelease={() => void lightControl.flush()}
              onResponderTerminate={() => void lightControl.flush()}
              onResponderGrant={(e) =>
                changeBrightness(
                  Math.max(
                    1,
                    Math.min(
                      100,
                      Math.round((1 - e.nativeEvent.locationY / 228) * 100),
                    ),
                  ),
                )
              }
              onResponderMove={(e) =>
                changeBrightness(
                  Math.max(
                    1,
                    Math.min(
                      100,
                      Math.round((1 - e.nativeEvent.locationY / 228) * 100),
                    ),
                  ),
                )
              }
            >
              <View
                pointerEvents="none"
                style={[s.verticalFill, { height: `${brightness}%` }]}
              />
            </View>
          </View>
          <View style={s.lightReadout}>
            <Text style={s.lightEyebrow}>ความสว่าง</Text>
            <Text style={s.brightnessNumber}>{brightness}<Text style={s.brightnessUnit}>%</Text></Text>
            <Text style={s.lightHint}>แสงที่พอดี ในแบบของคุณ</Text>
            <View style={s.stepButtons}>
              <Pressable
                accessibilityLabel="ลดความสว่าง"
                onPress={() => changeBrightness(Math.max(1, brightness - 10))}
                style={s.stepButton}
              >
                <Text style={s.stepText}>−</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="เพิ่มความสว่าง"
                onPress={() => changeBrightness(Math.min(100, brightness + 10))}
                style={s.stepButton}
              >
                <Text style={s.stepText}>+</Text>
              </Pressable>
            </View>
          <View style={s.powerControl}>
            <SmallSwitch
              value={current.state === "on"}
              onChange={() => void toggleLightPower()}
              disabled={powerSaving}
              label="เปิดหรือปิดไฟ"
            />
            <Text style={s.lightHint}>{current.state === "on" ? "ไฟเปิดอยู่" : "ไฟปิดอยู่"}</Text>
          </View>
          </View>
        </View>
        <Text style={s.controlHeading}>เลือกโทนแสงที่ชอบ</Text>
        <View style={s.segment}>
          {["โทนอุ่น", "โทนเย็น"].map((t, i) => (
            <Pressable
              key={t}
              onPress={() => changeWarm(i === 0)}
              style={[s.segmentButton, warm === (i === 0) && s.segmentActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: warm === (i === 0) }}
              aria-pressed={warm === (i === 0)}
            >
              <Text style={s.segmentText}>{t}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={s.controlHeading}>ระดับความสว่าง</Text>
        <View style={s.intensityRail}>
          {[10, 25, 40, 60, 80, 100].map((n) => (
            <Pressable
              key={n}
              accessibilityLabel={`ความสว่าง ${n}%`}
              onPress={() => changeBrightness(n)}
              style={[
                s.intensityPart,
                { backgroundColor: n <= brightness ? C.sand : C.line },
              ]}
            >
              <View
                style={[s.intensityDot, { opacity: n === brightness ? 1 : 0 }]}
              />
            </Pressable>
          ))}
        </View>
        <View style={s.between}>
          <Text style={s.muted}>ต่ำ</Text>
          <Text style={s.muted}>100%</Text>
        </View>
        <View style={s.lightSaveStatus} accessibilityLiveRegion="polite">
          {lightControl.status === "saving" && <ActivityIndicator size="small" color={C.sand} />}
          {lightControl.status === "error" ? (
            <Pressable accessibilityRole="button" onPress={() => current && lightControl.change(current, lightValues.current.brightness, lightValues.current.warm)}>
              <Text style={s.lightSaveError}>ปรับไฟไม่สำเร็จ · แตะเพื่อลองอีกครั้ง</Text>
            </Pressable>
          ) : <Text style={s.muted}>{lightControl.status === "saving" ? "กำลังปรับแสง…" : lightControl.status === "saved" ? (p.demo ? "อัปเดตตัวอย่างแล้ว" : "ปรับแสงแล้ว") : "ปรับแสงให้อัตโนมัติ"}</Text>}
        </View>
        {p.demo && (
          <Text style={s.footnote}>อุปกรณ์ตัวอย่าง · การปรับนี้เป็นการสาธิต</Text>
        )}
      </>
    );
  }

  function roomTabs() {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.roomTabs}>
        {["All", ...rooms.map(([room]) => room)].map((room) => (
          <Pressable key={room} accessibilityRole="tab" accessibilityLabel={`เลือก${room === "All" ? "ทุกห้อง" : room}`}
            accessibilityState={{ selected: roomFilter === room }} aria-selected={roomFilter === room} onPress={() => setRoomFilter(room)}
            style={[s.roomTab, roomFilter === room && s.roomTabSelected]}>
            <Text style={[s.roomTabText, roomFilter === room && s.roomTabTextSelected]}>{room === "All" ? "ทุกห้อง" : room}</Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  function deviceCard(d: Device, horizontal = false) {
    const on = d.state === "on";
    const dark = on && isFan(d);
    const unavailable = d.state === "unavailable" || d.state === "unknown";
    if (horizontal) return <Pressable key={d.entity_id} accessibilityRole="switch"
      accessibilityLabel={`${d.name} · ${roomOf(d)} · ${unavailable ? 'ไม่พร้อมใช้งาน' : on ? 'เปิดอยู่' : 'ปิดอยู่'}`}
      accessibilityHint={d.domain === 'light' ? 'แตะเพื่อเปิดหรือปิด กดค้างเพื่อปรับแสง' : 'แตะเพื่อเปิดหรือปิด'}
      accessibilityState={{ checked: on, busy: p.pendingDeviceId === d.entity_id, disabled: unavailable || p.sending }} disabled={unavailable || p.sending}
      onPress={() => void p.toggle(d)} onLongPress={d.domain === 'light' ? () => openDevice(d) : undefined}
      style={[s.compactDevice, unavailable && { opacity: 0.45 }]}>
      <DeviceSurface on={on} activeColor={C.sand} inactiveColor={C.white} style={s.compactDeviceIcon}>
        <DeviceCompanion state={d.state} fan={isFan(d)} size={56}/>{p.pendingDeviceId === d.entity_id && <View style={{ position: 'absolute', bottom: 3 }}><PendingDots/></View>}
      </DeviceSurface>
      <Text numberOfLines={1} ellipsizeMode="tail" style={s.compactDeviceName}>{titleOf(d)}</Text>
      <Text numberOfLines={1} style={s.compactDeviceRoom}>{roomOf(d)}</Text>
    </Pressable>;
    return (
      <DeviceSurface key={d.entity_id} on={on} activeColor={dark ? C.brown : C.orange} inactiveColor={C.white} style={[s.roomDevice, horizontal && s.homeDevice]}>
        <View style={s.between}>
          <View style={{ width: 64, height: 64 }}>
            <DeviceCompanion state={d.state} fan={isFan(d)} size={64} />{p.pendingDeviceId === d.entity_id && <View style={{ position: 'absolute', top: 0, right: 0 }}><PendingDots/></View>}
            <View style={{ position: "absolute", bottom: 0, right: 0, padding: 4, borderRadius: 12, backgroundColor: dark ? C.brown : C.white }}>
              <DeviceIcon device={d} size={18} color={dark ? C.cream : C.brown} />
            </View>
          </View>
          <Pressable accessibilityRole="switch" accessibilityLabel={`เปิดหรือปิด ${d.name}`} accessibilityState={{ checked: on, disabled: unavailable }} aria-checked={on}
            disabled={unavailable} onPress={() => void p.toggle(d)} style={[s.powerPill, on && s.powerPillOn, dark && s.powerPillDark, unavailable && { opacity: 0.4 }]}>
            <DeviceGlyph kind="power" size={15} color={on ? C.brown : C.muted} />
            <Text style={s.powerPillText}>{on ? "เปิด" : "ปิด"}</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" disabled={unavailable} accessibilityLabel={`${d.domain === "light" ? "ปรับแสง" : "เปิดหรือปิด"} ${d.name}`}
          onPress={() => openDevice(d)} style={s.deviceCardBody}>
          <Text numberOfLines={2} style={[s.deviceName, dark && { color: C.white }]}>{titleOf(d)}</Text>
          <Text style={[s.deviceRoom, dark && { color: C.cream }]}>{roomOf(d)}</Text>
          <View style={s.deviceCardFooter}>
            <Text style={[s.deviceCaption, dark && { color: C.cream }]}>{unavailable ? "ไม่พร้อมใช้งาน" : d.domain === "light" ? "ปรับแสงไฟ" : on ? "แตะเพื่อปิด" : "แตะเพื่อเปิด"}</Text>
            <ChevronRight size={15} color={dark ? C.cream : C.sand} />
          </View>
        </Pressable>
      </DeviceSurface>
    );
  }

  function nextAuto() {
    if (p.demo) return null;
    const candidates = upcoming.filter(item => p.devices.some(d => d.entity_id === item.entity_id && d.state === 'off'));
    const next = candidates[0];
    const device = next && p.devices.find(d => d.entity_id === next.entity_id);
    return <View style={s.nextAutoCard}>
      <View style={s.nextAutoHeading}><Sparkles size={13} color={C.primary}/><Text style={s.nextAutoCaption}>อุปกรณ์ที่คาดว่าจะเปิดถัดไป</Text></View>
      <View style={s.nextAutoBody}>
        <View style={s.nextAutoIcon}>{!logError && device ? <DeviceIcon device={device} size={26} color={C.primary}/> : <Clock3 size={24} color={C.primary}/>}</View>
        <View style={s.flex}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={s.nextAutoName}>{logError ? 'ยังตรวจสอบไม่ได้' : next ? next.label : logLoading ? 'กำลังตรวจสอบ…' : 'ยังไม่มีอุปกรณ์ที่รอเปิด'}</Text>
          {!logError && next && Number.isInteger(next.peak_hour) && <View style={s.nextAutoTimeBadge}><Clock3 size={12} color={C.primary}/><Text numberOfLines={1} style={s.nextAutoTime}>ช่วง {String((next.peak_hour! + 23) % 24).padStart(2, '0')}:00–{String((next.peak_hour! + 1) % 24).padStart(2, '0')}:59 น.</Text></View>}
        </View>
      </View>
    </View>;
  }
  function renderHome(): React.ReactNode {
    return (
      <>
        <View style={s.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="ตั้งค่า" onPress={() => go("Settings")} style={s.row}>
            <View>
              <Text style={s.headerCaption}>Welcome</Text>
              <Text style={s.brandName}>Synapse Home!</Text>
            </View>
          </Pressable>

        </View>
        <View style={s.overviewCard}>
          <View style={s.overviewHeader}>
            <Text style={s.overviewEyebrow}>ภาพรวมของบ้าน</Text>
            <View accessibilityLabel="สถานะเครือข่ายบ้าน" style={s.connectionPill}><View style={[s.connectionPillDot, atHome !== true && { backgroundColor: C.sand }]} /><Text style={s.connectionPillText}>{p.demo ? "บ้านตัวอย่าง" : atHome === true ? "อยู่บ้าน" : atHome === false ? "ไม่อยู่บ้าน" : "รอยืนยันจากโทรศัพท์"}</Text></View>
          </View>
          {!p.demo && dayContext?.dayType && <Text style={s.overviewCaption}>{dayContext.dayType === 'holiday' ? `วันนี้เป็นวันหยุด · ${dayContext.holidays.map(h => h.name).join(', ')}` : dayContext.dayType === 'weekend' ? 'วันนี้เป็นวันเสาร์–อาทิตย์' : 'วันนี้เป็นวันธรรมดา'}</Text>}
          <View style={s.overviewNumbers}>
            <View style={s.overviewMascot}><DeviceCompanion state={activeCount > 0 ? "on" : p.devices.some(d => d.state === "off") ? "off" : "unknown"} size={44} restWhenOff={false} interactive feedback={p.deviceFeedback}/></View>
            <View style={s.overviewDetails}>
              <View style={s.overviewCountRow}>
                {activeCount > 0 && <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={s.overviewValue}>{activeCount}</Text>}
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={s.overviewLabel}>{activeCount > 0 ? 'อุปกรณ์ที่เปิดอยู่' : p.devices.length === 0 ? 'ยังไม่มีอุปกรณ์' : 'ไม่มีอุปกรณ์ที่เปิดอยู่'}</Text>
              </View>
              <Text style={s.overviewCaption}>อุปกรณ์ทั้งหมด {p.devices.length} เครื่อง</Text>
            </View>
          </View>
          <View style={s.overviewFooter}>
            <View style={s.overviewRooms}><LayoutGrid size={14} color={C.primary}/><Text style={s.overviewRoomCount}>{rooms.length}</Text><Text style={s.overviewCaption}>ห้อง</Text></View>
            <Pressable accessibilityRole="button" onPress={() => go("Automation")} style={s.overviewRoutine}><Sparkles size={14} color={C.primary}/><Text numberOfLines={1} style={s.overviewRoutineText}>กิจวัตรประจำวัน</Text><ChevronRight size={14} color={C.primary}/></Pressable>
          </View>
        </View>
        {nextAuto()}
        {rooms.length > 0 && roomTabs()}
        {visibleRooms.slice(0, 1).map(([room, devices]) => (
          <RoomEditor key={room} room={room} devices={devices}>
            <RoomVisual room={room} devices={devices} activities feedback={p.deviceFeedback} style={s.featuredRoom}>
              <View style={s.between}><View style={s.glassChip}><Text style={s.glassChipText}>{room}</Text></View><View style={s.glassChip}><Text numberOfLines={1} style={s.glassChipText}>ตกแต่งห้อง</Text><ArrowRight size={16} color={C.brown} /></View></View>
              <View style={s.roomPhotoBottom}><RoomEnvironment room={room} readings={roomEnvironment}/>
                <View style={s.glassChip}><Lightbulb size={14} color={C.orange} /><Text style={s.glassChipText}>{devices.filter(d => d.state === "on").length}/{devices.length}  อุปกรณ์ที่เปิดอยู่</Text></View>
              </View>
            </RoomVisual>
          </RoomEditor>
        ))}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>ควบคุมอุปกรณ์</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sceneStrip}>
          {visibleDevices.map(device => deviceCard(device, true))}
        </ScrollView>
        {p.devices.length === 0 && (
          <Text style={s.empty}>ยังไม่มีอุปกรณ์ เพิ่มอุปกรณ์แรกได้ที่หน้าตั้งค่า</Text>
        )}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>โหมดการใช้งาน</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sceneStrip}>
          {sceneList.map((scene, i) => (
            <Pressable key={scene.label} accessibilityRole="button" accessibilityLabel={scene.label} disabled={p.sending}
              onPress={() => { void p.scene(scene).then(tell); }} style={[s.scene, i === 0 && s.sceneFeatured, p.sending && { opacity: 0.5 }]}>
              <View style={s.sceneIcon}><scene.Icon size={23} color={C.brown} /></View>
              <Text style={[s.sceneName, i === 0 && { color: C.brown }]}>{scene.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </>
    );
  }

  function renderRooms(): React.ReactNode {
    return (
      <>
        <View style={s.header}><Text style={s.title}>ห้องของคุณ</Text><Pressable accessibilityRole="button" accessibilityLabel="เพิ่มอุปกรณ์" onPress={p.pair} style={s.addButton}><Plus size={24} color={C.cream}/></Pressable></View>
        <Text style={s.subheading}>ดูแลทุกมุมบ้านได้อย่างง่ายดาย</Text>
        {roomTabs()}
        {visibleRooms.map(([room, devices]) => (
          <View key={room} style={s.roomSection}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: !collapsed[room] }} aria-expanded={!collapsed[room]} accessibilityLabel={`แสดงหรือซ่อนอุปกรณ์ใน${room}`} onPress={() => setCollapsed(v => ({ ...v, [room]: !v[room] }))} style={[s.between, { minHeight: 44, paddingHorizontal: 8 }]}>
              <View style={s.flex}><Text style={s.sectionTitle}>{room}</Text><Text style={s.deviceRoom}>{devices.length} อุปกรณ์ · เปิดอยู่ {devices.filter(d => d.state === 'on').length}</Text></View>
              <ChevronDown size={18} color={C.brown} style={{ transform: [{ rotate: collapsed[room] ? '-90deg' : '0deg' }] }}/>
            </Pressable>
            {!collapsed[room] && <View style={[s.roomGrid, { marginTop: 12 }]}>{devices.map(device => deviceCard(device))}</View>}
          </View>
        ))}
        {rooms.length === 0 && <Text style={s.empty}>ห้องของคุณจะแสดงที่นี่เมื่อเพิ่มอุปกรณ์</Text>}
        <Pressable accessibilityRole="button" onPress={p.pair} style={s.outlineButton}>
          <Plus size={20} color={C.brown} /><Text style={s.outlineText}>เพิ่มอุปกรณ์</Text>
        </Pressable>
      </>
    );
  }

  function renderAutomation(): React.ReactNode {
    const records = [...history.filter(entry => entry.source !== 'sample'), ...profileHistory].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const matchesFilter = (entry: History, kind: ActivitySource | "all") => kind === "all" || (kind === "profile" ? entry.source === "sample" : activitySource(entry).kind === kind);
    const filteredRecords = records.filter(entry => matchesFilter(entry, activityFilter));
    const filters: { kind: ActivitySource | "all"; label: string }[] = [
      { kind: "all", label: "ทั้งหมด" },
      { kind: "manual", label: "กดเอง" },
      { kind: "voice", label: "สั่งด้วยเสียง" },
      { kind: "automatic", label: "อัตโนมัติ" },
      { kind: "scene", label: "โหมดการใช้งาน" },
      { kind: "switch", label: "สวิตช์ / ปุ่มเดิม" },
      { kind: "command", label: "คำสั่งผู้ช่วยเดิม" },
      { kind: "unknown", label: "ไม่ระบุ" },
    ];
    return (
      <>
        {miniTitle("Automation")}
        {nextAuto()}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>ประวัติการสั่งงาน</Text>
          <View style={s.historyCount}><Text style={s.historyCountText}>{filteredRecords.length} รายการ</Text></View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.historyFilters}>
          {filters.filter(filter => ["all", "manual", "voice", "automatic"].includes(filter.kind) || records.some(entry => matchesFilter(entry, filter.kind))).map(filter => (
            <Pressable key={filter.kind} accessibilityRole="button" accessibilityState={{ selected: activityFilter === filter.kind }}
              onPress={() => { setActivityFilter(filter.kind); setHistoryLimit(10); }}
              style={[s.historyFilter, activityFilter === filter.kind && s.roomTabSelected]}>
              <Text style={[s.roomTabText, activityFilter === filter.kind && s.roomTabTextSelected]}>{filter.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {p.demo ? <Text style={s.noteText}>เชื่อมต่อบ้านเพื่อดูประวัติการสั่งงานจริง</Text> : logLoading ? (
          <ActivityIndicator color={C.sand} />
        ) : logError ? (
          <Pressable accessibilityRole="button" onPress={() => void loadLogs()} style={s.noteCard}>
            <Text style={s.noteText}>โหลดประวัติไม่สำเร็จ · แตะเพื่อลองอีกครั้ง</Text>
          </Pressable>
        ) : filteredRecords.length === 0 ? <Text style={s.noteText}>{activityFilter === "all" ? "ยังไม่มีประวัติการสั่งงาน" : "ยังไม่มีประวัติการสั่งงานประเภทนี้"}</Text> : <>
          {filteredRecords.slice(0, historyLimit).map((entry, index) => {
            const source = activitySource(entry);
            const Icon = source.kind === "voice" || source.kind === "command" ? Mic
              : source.kind === "automatic" ? Clock3 : source.kind === "switch" ? Plug
              : source.kind === "scene" ? Sparkles : UserRound;
            const device = p.devices.find(device => device.entity_id === entry.entity_id);
            const name = device?.name || entry.entity_id;
            const action = entry.ai_action === "on" ? "เปิด" : entry.ai_action === "off" ? "ปิด" : "ปรับแสง";
            const day = entry.timestamp.slice(0, 10);
            const first = index === 0 || filteredRecords[index - 1].timestamp.slice(0, 10) !== day;
            const last = index === Math.min(historyLimit, filteredRecords.length) - 1 || filteredRecords[index + 1]?.timestamp.slice(0, 10) !== day;
            const dateLabel = new Date(`${day}T12:00:00+07:00`).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
            return <View key={`${entry.timestamp}-${entry.entity_id}-${index}`}>
              {first && <View style={s.historyDay}><Text style={s.historyDayText}>{dateLabel}</Text><View style={s.historyDayLine}/></View>}
              <View style={[s.activityRow, first && s.activityFirst, last && s.activityLast]}>
                <View style={[s.activityIcon, entry.ai_action === "on" && { backgroundColor: C.sandSurface }]}>
                  {device ? <DeviceIcon device={device} size={22} color={entry.ai_action === "off" ? C.muted : C.primary}/> : <Icon size={20} color={C.primary}/>}
                </View>
                <View style={s.flex}>
                  <Text numberOfLines={1} style={s.activityName}>{name}</Text>
                  <View style={s.activityDetails}>
                    <Text style={[s.activityAction, entry.ai_action === "on" && { color: C.primary, fontWeight: "600" }]}>{entry.success === false ? `${action}ไม่สำเร็จ` : action}</Text>
                    <View style={s.activityBadge}><Icon size={11} color={C.muted}/><Text style={s.activityMeta}>{source.label}</Text></View>
                  </View>
                  {source.kind === "command" && <Text style={s.activityCommand}>{entry.voice_input}</Text>}
                </View>
                <Text style={s.activityTime}>{entry.timestamp.slice(11, 16)}</Text>
              </View>
            </View>;
          })}
          <Pressable accessibilityRole="button" onPress={() => setHistoryLimit(value => value + 20)} style={[s.noteCard, { justifyContent: 'center', display: historyLimit < filteredRecords.length ? 'flex' : 'none' }]}><Text style={s.noteText}>ดูประวัติเพิ่ม</Text></Pressable>
        </>}
      </>
    );
  }

  function renderHistory(): React.ReactNode {
    return <>
      {miniTitle("History")}
      <HistoryScreen seeded={seededAuto} sample={sampleHistory && !p.demo} demo={p.demo} devices={p.devices} stats={stats} history={history}
        loading={logLoading}
        error={logError} retry={() => void loadLogs()} />
    </>;
  }

  function renderSettings(): React.ReactNode {
    return (
      <>
        {miniTitle(
          setting || "Setting",
          setting ? () => setSetting(null) : undefined,
        )}
        {setting ? (
          <View style={s.settingsDetail}>
            {setting === "บัญชีผู้ใช้" ? (
              <>
                <UserRound size={42} color={C.sand} />
                <Text style={s.sectionTitle}>
                  {session?.user.name || "บัญชีผู้เยี่ยมชม"}
                </Text>
                <Text style={s.noteText}>
                  {session
                    ? session.user.email
                    : "คุณกำลังใช้งานแบบผู้เยี่ยมชม สมัครบัญชีหรือเข้าสู่ระบบได้จากหน้าเข้าสู่ระบบ"}
                </Text>
                <Pressable
                  style={s.primaryButton}
                  onPress={() => void logout()}
                  disabled={authBusy}
                >
                  <Text style={s.primaryText}>
                    {authBusy
                      ? "กรุณารอสักครู่…"
                      : session
                        ? "ออกจากระบบ"
                        : "กลับไปเข้าสู่ระบบ"}
                  </Text>
                </Pressable>
              </>
            ) : setting === "Wi-Fi บ้าน" ? (
              <>
                <Wifi size={42} color={C.sand} />
                <Text style={s.sectionTitle}>Wi-Fi ที่เชื่อมต่ออยู่</Text>
                <Text style={s.label}>{homeWifi.currentName || "ยังอ่านชื่อ Wi-Fi ไม่ได้"}</Text>
                <Text style={s.noteText}>{p.demo ? "เปิดใช้งานจริงเพื่อตั้ง Wi-Fi บ้าน" : homeWifi.message}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="ตั้ง Wi-Fi นี้เป็นเครือข่ายบ้าน"
                  disabled={p.demo || homeWifi.saving || !homeWifi.loaded || !!homeWifi.storageError}
                  style={[s.primaryButton, (p.demo || homeWifi.saving || !homeWifi.loaded || !!homeWifi.storageError) && { opacity: 0.5 }]}
                  onPress={() => void homeWifi.addCurrent().then(() => tell("บันทึก Wi-Fi บ้านแล้วค่ะ")).catch(error => tell(thaiError(error, "บันทึกไม่สำเร็จ")))}>
                  <Text style={s.primaryText}>{homeWifi.saving ? "กำลังบันทึก…" : "ตั้ง Wi-Fi นี้เป็นเครือข่ายบ้าน"}</Text>
                </Pressable>
                <Text style={s.sectionTitle}>เครือข่ายบ้านที่บันทึกไว้</Text>
                <Text style={s.noteText}>เพิ่มได้หลายชื่อ เช่น Wi-Fi ชั้นบนและชั้นล่าง เมื่อย้ายบ้านให้เพิ่มเครือข่ายใหม่แล้วลบชื่อเดิม</Text>
                {homeWifi.names.map(name => (
                  <View key={name} style={s.settingRow}>
                    <Wifi size={18} color={C.sand} />
                    <Text style={[s.settingLabel, { flex: 1 }]}>{name}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel={`ลบ Wi-Fi บ้าน ${name}`}
                      disabled={p.demo || homeWifi.saving || !homeWifi.loaded || !!homeWifi.storageError}
                      hitSlop={10} style={{ padding: 12 }}
                      onPress={() => { try { homeWifi.remove(name); tell("ลบชื่อ Wi-Fi แล้วค่ะ"); } catch (error) { tell(thaiError(error, "ลบไม่สำเร็จ")); } }}>
                      <X size={20} color={C.brown} />
                    </Pressable>
                  </View>
                ))}
                {!homeWifi.names.length && <Text style={s.noteText}>ยังไม่มีเครือข่ายบ้านที่บันทึกไว้</Text>}
              </>
            ) : setting === "การแจ้งเตือน" ? (
              <>
                <View style={s.between}>
                  <Text style={s.label}>ข้อความแจ้งเตือนในแอป</Text>
                  <SmallSwitch
                    label="ข้อความแจ้งเตือนในแอป"
                    value={notifications}
                    onChange={() => setNotifications(!notifications)}
                  />
                </View>
                <Text style={s.noteText}>
                  
                  ตั้งค่าสำหรับการใช้งานครั้งนี้เท่านั้น ยังไม่รองรับการแจ้งเตือนนอกแอป
                </Text>
              </>
            ) : setting === "ภาษา" ? (
              <>
                <Text style={s.sectionTitle}>ภาษาไทย</Text>
                <Text style={s.noteText}>
                  
                  เมนู ปุ่ม และข้อความในแอปเป็นภาษาไทย คุณสามารถสั่งงานอุปกรณ์ด้วยเสียงภาษาไทยได้
                </Text>
              </>
            ) : (
              <>
                <Mascot />
                <Text style={s.sectionTitle}>Synapse Home</Text>
                <Text style={s.noteText}>ผู้ช่วยเล็ก ๆ เพื่อบ้านที่อบอุ่น</Text>
                <Text style={s.footnote}>
                  
                  รุ่น 1.0.0 · เชื่อมต่อผ่าน Home Assistant และ Tuya
                </Text>
              </>
            )}
          </View>
        ) : (
          <>
            <View style={s.profile}>
              <View style={s.avatar}>
                <UserRound color={C.white} size={29} strokeWidth={1} />
              </View>
              <View>
                <Text style={s.profileName}>
                  {session?.user.name || "ผู้เยี่ยมชม"}
                </Text>
                <Text style={s.profileEmail}>
                  {session?.user.email || "ยินดีต้อนรับสู่บ้านของคุณ"}
                </Text>
              </View>
            </View>
            <View style={s.settingsList}>
              {[
                { label: "บัญชีผู้ใช้", Icon: UserRound },
                { label: "อุปกรณ์ที่เชื่อมต่อ", Icon: LayoutGrid },
                { label: "Wi-Fi บ้าน", Icon: Wifi },
                { label: "การแจ้งเตือน", Icon: Bell },
                { label: "ภาษา", Icon: Globe2 },
                { label: "เกี่ยวกับ Synapse Home", Icon: Info },
              ].map(({ label, Icon }) => (
                <Pressable
                  key={label}
                  onPress={() =>
                    label === "อุปกรณ์ที่เชื่อมต่อ"
                      ? go("Rooms")
                      : setSetting(label)
                  }
                  style={s.settingRow}
                >
                  <Icon size={17} color={C.sand} strokeWidth={1.5} />
                  <Text style={s.settingLabel}>{label}</Text>
                  <ChevronRight size={17} color={C.brown} />
                </Pressable>
              ))}
            </View>
            <Pressable style={s.outlineButton} onPress={p.pair}>
              <Plus size={17} color={C.sand} />
              <Text style={s.outlineText}>เพิ่มอุปกรณ์ Tuya</Text>
            </Pressable>
            <Text style={s.footnote}>
              {p.demo ? "บ้านตัวอย่าง · อุปกรณ์สาธิต" : "เชื่อมต่อกับ Synapse แล้ว"}
            </Text>
          </>
        )}
      </>
    );
  }

  function renderAI(): React.ReactNode {
    const statusText = voice.outcome === "error" ? reply : voice.speaking ? "กำลังพูดคำตอบให้คุณฟัง" : listening
      ? "กำลังฟังคำสั่ง… พูดได้เลยค่ะ"
      : voice.stage === "permission"
        ? "กำลังเปิดไมโครโฟน…"
        : voice.stage === "transcribing"
          ? "กำลังถอดเสียงเป็นข้อความ…"
          : voice.stage === "command"
            ? "กำลังสั่งงาน…"
            : "แตะตัวบ้าน แล้วพูดได้เลย";

    return (
      <>
        {miniTitle("", () => go("Home"))}
        <AICompanionScreen active={voice.sessionActive} listening={listening} busy={chatBusy}
          speaking={voice.speaking} outcome={voice.outcome} successAt={voice.successAt}
          demo={p.demo} status={statusText} audioLevel={voice.audioLevel}
          onTap={() => { void voice.tap(); }} />
      </>
    );
  }

  function renderScreen(): React.ReactNode {
    switch (p.tab) {
      case "Home":
        return renderHome();
      case "Rooms":
        return renderRooms();
      case "Automation":
        return renderAutomation();
      case "History":
        return renderHistory();
      case "Settings":
        return renderSettings();
      case "AI":
        return renderAI();
      default:
        return null;
    }
  }

  if (!entered)
    return (
      <KeyboardAvoidingView style={[s.frame, s.loginFrame]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={s.flex}
          contentContainerStyle={s.loginScroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={s.loginHero}>
            <LoginRoomBackdrop/>
            <View style={s.loginBrand}><View><Text style={s.loginWelcome}>Welcome</Text><Text style={s.loginBrandText}>Synapse Home!</Text></View></View>
          </View>
          <View style={s.loginPanel}>
            <View style={s.loginForm}>
            <Text style={s.loginTitle}>
              {signup ? "Create account" : "Log in"}
            </Text>
            {signup && <Text style={s.loginSubtitle}>Create your Synapse account to get started.</Text>}
            {signup && (
              <View style={s.loginInput}>
                <TextInput
                  placeholder="Full name"
                  placeholderTextColor={C.white}
                  value={username}
                  onChangeText={setUsername}
                  style={s.loginField}
                  accessibilityLabel="Full name"
                  maxLength={80}
                  editable={!authBusy}
                />
                <UserRound size={16} color={C.white} />
              </View>
            )}
            <View style={s.loginInput}>
              <TextInput
                placeholder="Email"
                placeholderTextColor={C.white}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                style={s.loginField}
                accessibilityLabel="Email"
                maxLength={254}
                editable={!authBusy}
              />
              <Mail size={15} color={C.white} />
            </View>
            <View style={s.loginInput}>
              <TextInput
                placeholder="Password"
                placeholderTextColor={C.white}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={s.loginField}
                accessibilityLabel="Password"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={signup ? "new-password" : "current-password"}
                maxLength={128}
                editable={!authBusy}
                onSubmitEditing={() => {
                  if (!signup) void submitAccount();
                }}
              />
              <LockKeyhole size={15} color={C.white} />
            </View>
            {signup && (
              <>
                <Text style={s.loginHint}>Use at least 8 characters.</Text>
                <View style={s.loginInput}>
                  <TextInput
                    placeholder="Confirm password"
                    placeholderTextColor={C.white}
                    accessibilityLabel="Confirm password"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    maxLength={128}
                    editable={!authBusy}
                    style={s.loginField}
                    onSubmitEditing={() => void submitAccount()}
                  />
                  <LockKeyhole size={15} color={C.white} />
                </View>
              </>
            )}
            {!!authError && (
              <View style={s.authError} accessibilityRole="alert">
                <Text style={s.authErrorText}>{authError}</Text>
              </View>
            )}
            <Pressable
              style={[s.loginButton, authBusy && { opacity: 0.6 }]}
              onPress={() => void submitAccount()}
              disabled={authBusy}
              accessibilityRole="button"
            >
              <Text style={s.loginButtonText}>
                {authBusy
                  ? "Please wait…"
                  : signup
                    ? "Create account"
                    : "Log in"}
              </Text>
            </Pressable>
            <Text style={s.loginCaption}>
              {signup
                ? "Already have an account?"
                : "Don’t have an account?"}
            </Text>
            <Pressable
              disabled={authBusy}
              onPress={() => {
                setSignup(!signup);
                setAuthError("");
                setPassword("");
                setConfirmPassword("");
              }}
            >
              <Text style={s.loginLink}>
                {signup ? "Log in" : "Sign up"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Continue as guest"
              onPress={() => {
                setSession(null);
                setPassword("");
                setConfirmPassword("");
                setAuthError("");
                setEntered(true);
              }}
              disabled={authBusy}
              style={s.guestButton}
            >
              <Text style={s.guestText}>Continue as guest</Text>
              <ArrowRight color={C.white} size={14} />
            </Pressable>
            <View style={s.homeIndicator} />
            </View>
          </View>
        </ScrollView>
        {banner}
      </KeyboardAvoidingView>
    );

  return (
    <View style={s.frame}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[s.content, p.tab === "AI" && s.aiContent]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          p.tab !== "AI" ? <RefreshControl
            refreshing={p.loading || logLoading}
            onRefresh={() => {
              void p.reload();
              if (p.tab === "History" || p.tab === "Automation") void loadLogs();
            }}
            tintColor={C.sand}
          /> : undefined
        }
      >
        <ScreenEntrance screen={`${p.tab}:${current?.entity_id || ""}:${setting || ""}`}>
          {current ? renderLight() : renderScreen()}
        </ScreenEntrance>
      </ScrollView>
      {banner}
      <View style={s.nav}>
        <View pointerEvents="none" style={s.navBackground}/>
        {navigation.map(({ key, Icon }) => {
          const active = p.tab === key;
          const voiceActive = active && key === "AI" && voice.sessionActive;
          return <Pressable
            key={key}
            accessibilityRole={key === "AI" ? "button" : "tab"}
            accessibilityLabel={key === "AI" ? "เปิดผู้ช่วย Synapse" : thaiLabel(key)}
            accessibilityState={key === "AI" ? { selected: active, busy: active && chatBusy } : { selected: active }}
            aria-selected={active}
            onPress={() => go(key)}
            style={({ pressed }) => [s.navItem, key === "AI" && s.navMicItem, pressed && s.navItemPressed]}
          >
            {active && key !== "AI" && <View pointerEvents="none" style={s.navIndicator} />}
            {key === "AI" ? <View style={s.navMicCircle}>
              <AssistantOrb listening={active && listening} thinking={active && chatBusy && !listening && !voice.speaking} speaking={active && voice.speaking} level={voice.audioLevel}/>
            </View> : <Icon size={22} strokeWidth={1.4} color={active ? C.brown : C.white} />}
            <Text numberOfLines={1} style={[s.navLabel, active && s.navLabelActive]}>
              {voiceActive ? voice.speaking ? "กำลังตอบ" : chatBusy ? "กำลังคิด" : listening ? "กำลังฟัง" : "ผู้ช่วย" : thaiLabel(key)}
            </Text>
          </Pressable>;
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  frame: { flex: 1, width: "100%", maxWidth: 520, alignSelf: "center", backgroundColor: C.paper, position: "relative" },
  content: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 120, flexGrow: 1 },
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 9 },
  between: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48, gap: 12, marginBottom: 18 },
  iconButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, justifyContent: "center", alignItems: "center" },
  title: { color: C.brown, fontSize: 24, fontWeight: "600", letterSpacing: -0.8, flexShrink: 1 },
  mascot: { width: 200, height: 236, alignSelf: "center", marginVertical: 4 },
  mascotLarge: { width: 240, height: 285 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 26, marginBottom: 14, gap: 8 },
  sectionTitle: { color: C.brown, fontSize: 19, fontWeight: "600", letterSpacing: -0.5 },
  muted: { color: C.muted, fontSize: 11, lineHeight: 17 },
  deviceName: { color: C.brown, fontSize: 14, fontWeight: "600", lineHeight: 21, flexShrink: 1 },
  deviceRoom: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 3 },
  sceneStrip: { gap: 10, paddingBottom: 4, paddingRight: 4 },
  scene: { width: 108, minHeight: 112, borderWidth: 1, borderColor: C.line, backgroundColor: C.white, borderRadius: 22, justifyContent: "space-between", alignItems: "flex-start", padding: 14, gap: 12 },
  sceneName: { color: C.brown, fontSize: 12, lineHeight: 17, fontWeight: "500" },
  nav: { position: "absolute", bottom: 10, left: 12, right: 12, minHeight: 96, paddingHorizontal: 8, paddingBottom: 8, flexDirection: "row", alignItems: "stretch" },
  navBackground: { position: 'absolute', top: 20, bottom: 0, left: 0, right: 0, backgroundColor: C.sand, borderRadius: 26, borderWidth: 1.5, borderColor: C.white, boxShadow: '0px 6px 18px #3F230518' },
  navItem: { flex: 1, minHeight: 88, paddingTop: 26, paddingHorizontal: 2, alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 24 },
  navMicItem: { paddingTop: 0, justifyContent: 'flex-start' },
  navMicCircle: { width: 60, height: 60, borderRadius: 30, padding: 4, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 3px 8px #3F230510' },
  navLabel: { fontSize: 10, lineHeight: 17, fontWeight: "400", color: C.white },
  navLabelActive: { color: C.brown, fontWeight: "600" },
  navIndicator: { position: "absolute", bottom: 0, width: 16, height: 3, borderRadius: 2, backgroundColor: C.primary },
  navItemPressed: { opacity: 0.7 },
  loginFrame: { maxWidth: 520, backgroundColor: C.paper },
  loginScroll: { flexGrow: 1, padding: 18, paddingBottom: 28, backgroundColor: C.paper },
  loginHero: { flexGrow: 1, minHeight: 264, maxHeight: 320, padding: 18, justifyContent: "space-between", backgroundColor: 'transparent', overflow: 'hidden' },
  loginPanel: { justifyContent: 'center', marginTop: 18, paddingHorizontal: 28, paddingTop: 28, paddingBottom: 20, backgroundColor: C.sand, borderTopLeftRadius: 52, borderTopRightRadius: 52, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, boxShadow: '0px 14px 28px #3F230524' },
  loginForm: { width: '100%', maxWidth: 360, alignSelf: 'center' },
  loginTitle: { color: C.white, fontSize: 32, lineHeight: 38, letterSpacing: 0, fontFamily: authFont, fontWeight: "700", textAlign: 'center', marginBottom: 20 },
  loginInput: { borderWidth: 1, borderColor: '#FFFFFF80', backgroundColor: C.sand, borderRadius: 12, flexDirection: "row", alignItems: "center", marginBottom: 10, paddingHorizontal: 14, minHeight: 48 },
  loginField: { flex: 1, color: C.white, fontFamily: authFont, fontWeight: '400', fontSize: 16, minHeight: 46 },
  loginButton: { minHeight: 48, backgroundColor: C.white, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },
  loginButtonText: { color: C.brown, fontFamily: authFont, fontSize: 16, fontWeight: "400" },
  loginHint: { color: C.white, fontFamily: authFont, fontSize: 14, marginBottom: 12 },
  authError: {
    backgroundColor: C.cream,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  authErrorText: { color: C.brown, fontFamily: authFont, fontSize: 14, lineHeight: 19 },
  loginCaption: { color: C.white, fontFamily: authFont, textAlign: "center", fontSize: 14, marginTop: 16 },
  loginLink: { color: C.white, fontFamily: authFont, fontWeight: "400", textAlign: "center", fontSize: 14, padding: 12, textDecorationLine: 'underline' },
  guestButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, minHeight: 48, borderTopWidth: 1, borderColor: "#FFFFFF60", marginTop: 6 },
  guestText: { color: C.white, fontFamily: authFont, fontSize: 14 },
  homeIndicator: { height: 4, width: 90, backgroundColor: C.white, alignSelf: "center", borderRadius: 3, marginTop: 14 },
  roomSection: { marginBottom: 24 },
  roomGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10 },
  homeDevice: { width: 190, flexShrink: 0 },
  compactDevice: { width: 88, flexShrink: 0, paddingBottom: 4 },
  compactDeviceIcon: { width: 72, height: 68, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line, boxShadow: '0px 2px 4px #3F230514', marginBottom: 10 },
  compactDeviceName: { fontFamily: headingFont, fontWeight: '700', fontSize: 10, lineHeight: 14, color: C.brown },
  compactDeviceRoom: { fontFamily: headingFont, fontSize: 10, lineHeight: 14, color: C.muted, marginTop: 2 },
  roomDevice: { width: "48%", flexGrow: 0, minHeight: 170, padding: 14, borderRadius: 24, borderWidth: 1, borderColor: C.line },
  outlineButton: { borderColor: C.sand, borderWidth: 1, borderRadius: 26, flexDirection: "row", gap: 9, minHeight: 52, alignItems: "center", justifyContent: "center", marginTop: 12, backgroundColor: C.cream },
  outlineText: { color: C.brown, fontSize: 14, fontWeight: "600" },
  lightSaveStatus: { minHeight: 48, marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  lightSaveError: { color: C.brown, fontSize: 12, textDecorationLine: "underline", paddingVertical: 12 },
  lightControlArea: { minHeight: 274, marginTop: 14, borderRadius: 28, backgroundColor: C.paper, flexDirection: "row", alignItems: "center", padding: 22, gap: 24 },
  verticalControl: { width: 70, alignItems: "center" },
  verticalRail: { width: 70, height: 228, borderRadius: 35, backgroundColor: C.rail, overflow: "hidden", justifyContent: "flex-end", borderWidth: 1, borderColor: C.rail },
  verticalFill: { width: "100%", backgroundColor: C.lightGlow, borderRadius: 34 },
  brightnessNumber: { color: C.brown, fontSize: 66, fontWeight: "300", letterSpacing: -3, lineHeight: 82 },
  powerControl: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 14 },
  label: { color: C.brown, fontFamily: headingFont, fontSize: 13 },
  stepButtons: { flexDirection: "row", gap: 12, marginTop: 16 },
  stepButton: { backgroundColor: C.white, width: 48, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.line },
  stepText: { color: C.brown, fontSize: 24 },
  controlHeading: { color: C.brown, fontWeight: "600", fontSize: 18, marginBottom: 12, marginTop: 24 },
  segment: { flexDirection: "row", backgroundColor: C.white, borderRadius: 25, padding: 5, borderWidth: 1, borderColor: C.line },
  segmentButton: { flex: 1, minHeight: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  segmentActive: { backgroundColor: C.orange },
  segmentText: { color: C.brown, fontSize: 14, fontWeight: "500" },
  intensityRail: { flexDirection: "row", gap: 7, marginTop: 0, marginBottom: 4, height: 44, alignItems: "center" },
  intensityPart: { flex: 1, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  intensityDot: {
    backgroundColor: C.primary,
    width: 13,
    height: 13,
    borderRadius: 7,
  },
  primaryButton: { minHeight: 52, backgroundColor: C.primary, borderRadius: 26, alignItems: "center", justifyContent: "center", marginTop: 20, paddingHorizontal: 18 },
  primaryText: { color: C.cream, fontSize: 14, fontWeight: "600" },
  subheading: { color: C.muted, fontSize: 13, lineHeight: 20, marginTop: -6, marginBottom: 20 },
  noteCard: { padding: 18, borderRadius: 22, backgroundColor: C.cream, marginTop: 18, flexDirection: "row", gap: 12 },
  noteText: { color: C.muted, fontSize: 12, lineHeight: 19, flexShrink: 1 },
  nextAutoCard: { marginTop: 10, padding: 13, borderRadius: 20, backgroundColor: C.cream, borderWidth: 1, borderColor: C.line },
  nextAutoHeading: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  nextAutoCaption: { color: C.muted, fontSize: 11, lineHeight: 18, flexShrink: 1 },
  nextAutoBody: { flexDirection: "row", alignItems: "center", gap: 10 },
  nextAutoIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: C.glass, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  nextAutoName: { color: C.brown, fontSize: 14, lineHeight: 21, fontWeight: "600" },
  nextAutoTimeBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.sandSurface, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3, marginTop: 4, maxWidth: "100%" },
  nextAutoTime: { color: C.primary, fontSize: 11, lineHeight: 17, flexShrink: 1, fontVariant: ["tabular-nums"] },
  historyCount: { backgroundColor: C.sandSurface, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  historyCountText: { color: C.primary, fontSize: 10 },
  historyFilters: { gap: 7, paddingBottom: 8, paddingRight: 8 },
  historyFilter: { minHeight: 44, paddingHorizontal: 15, borderRadius: 22, borderWidth: 1, borderColor: C.line, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  historyDay: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 20, marginBottom: 10, paddingHorizontal: 3 },
  historyDayText: { color: C.muted, fontSize: 11, fontWeight: "500" },
  historyDayLine: { flex: 1, height: 1, backgroundColor: C.line },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 16, backgroundColor: C.white, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  activityFirst: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  activityLast: { borderBottomLeftRadius: 22, borderBottomRightRadius: 22, borderBottomWidth: 0 },
  activityIcon: { width: 40, height: 40, borderRadius: 15, backgroundColor: C.paper, alignItems: "center", justifyContent: "center" },
  activityName: { color: C.brown, fontSize: 13, fontWeight: "600", lineHeight: 21 },
  activityDetails: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 7, marginTop: 5 },
  activityAction: { color: C.muted, fontSize: 11 },
  activityBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, backgroundColor: C.paper },
  activityMeta: { color: C.muted, fontSize: 10 },
  activityTime: { color: C.muted, fontSize: 11, fontVariant: ["tabular-nums"], alignSelf: "flex-start", marginTop: 3 },
  activityCommand: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 6 },
  connectionCard: { backgroundColor: C.primary, flexDirection: "row", alignItems: "center", borderRadius: 26, padding: 22, gap: 16, marginTop: 2 },
  connectionTitle: { color: C.cream, fontSize: 17, fontWeight: "600" },
  connectionText: { color: C.cream, opacity: 0.8, fontSize: 11, lineHeight: 17, marginTop: 5 },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: C.white,
  },
  historyIntro: {
    color: C.muted,
    fontSize: 11,
    marginTop: 15,
    marginBottom: 13,
  },
  latest: { borderRadius: 20, backgroundColor: C.cream, padding: 17, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  statCard: { padding: 20, backgroundColor: C.white, borderRadius: 26, borderWidth: 1, borderColor: C.line, marginBottom: 16 },
  percent: { color: C.brown, fontSize: 28, fontWeight: "300", letterSpacing: -1 },
  metricRow: { flexDirection: "row", gap: 9, marginTop: 14, marginBottom: 12 },
  metric: { flex: 1, borderRadius: 15, alignItems: "center", paddingVertical: 14 },
  metricValue: { color: C.brown, fontSize: 20, fontWeight: "500" },
  metricLabel: { color: C.brown, fontSize: 9, marginTop: 2 },
  chart: { height: 65, flexDirection: "row", alignItems: "flex-end", gap: 4, marginTop: 8 },
  bar: { flex: 1, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  chartLabel: { color: C.muted, fontSize: 8, marginTop: 5 },
  profile: { backgroundColor: C.sand, borderRadius: 26, padding: 22, flexDirection: "row", alignItems: "center", gap: 16, marginTop: 6, marginBottom: 24 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 25,
    borderColor: "#FFFFFF99",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: { color: C.cream, fontSize: 19, fontWeight: "600" },
  profileEmail: { color: C.cream, opacity: 0.8, fontSize: 12, marginTop: 5 },
  settingsList: { backgroundColor: C.white, borderRadius: 24, paddingHorizontal: 18, borderWidth: 1, borderColor: C.line },
  settingRow: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 14, borderBottomWidth: 1, borderColor: C.line },
  settingLabel: { color: C.brown, fontSize: 14, flex: 1 },
  settingsDetail: { gap: 18, paddingTop: 28 },
  aiContent: { paddingTop: 20 },
  aiHero: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  voiceStatus: { minHeight: 76, justifyContent: "center", alignItems: "center" },
  voiceSpinner: { height: 24, justifyContent: "center" },
  voiceReplyCard: { minHeight: 100, padding: 20, marginTop: 12, borderRadius: 24, backgroundColor: C.cream },
  aiTitle: { fontFamily: headingFont, fontStyle: "italic", color: C.brown, fontSize: 36 },
  aiReply: {
    fontSize: 14,
    color: C.muted,
    textAlign: "center",
    lineHeight: 23,
    maxWidth: 300,
    marginBottom: 12,
  },
  transcriptCard: { minHeight: 100, padding: 20, backgroundColor: C.white, borderRadius: 24, borderWidth: 1, borderColor: C.line, marginTop: 12 },
  transcriptLabel: { color: C.muted, fontSize: 11, marginBottom: 6 },
  transcriptText: {
    color: C.brown,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  voiceHint: {
    color: C.muted,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 20,
  },
  footnote: {
    color: C.muted,
    fontSize: 10,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 18,
  },
  empty: {
    paddingVertical: 40,
    color: C.muted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 22,
  },
  toast: { position: "absolute", left: 18, right: 18, bottom: 108, backgroundColor: C.cream, borderWidth: 1, borderColor: C.orange, padding: 16, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 10, boxShadow: "0px 4px 16px #3F230518" },
  toastText: { color: C.brown, fontSize: 12, lineHeight: 19, flex: 1 },
  homeAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.cream, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  brandName: { fontFamily: headingFont, fontSize: 20, lineHeight: 26, fontWeight: "400", color: C.brown, letterSpacing: 0 },
  headerCaption: { fontFamily: headingFont, fontSize: 12, lineHeight: 17, fontWeight: '400', color: C.muted, marginTop: 4, maxWidth: 210 },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, alignItems: "center", justifyContent: "center" },
  editorialHeading: { marginTop: 6, marginBottom: 22 },
  editorialTitle: { fontSize: 32, lineHeight: 39, fontWeight: "400", letterSpacing: -1.3, color: C.brown },
  editorialAccent: { fontFamily: headingFont, fontStyle: "italic", fontSize: 36, lineHeight: 44, color: C.brown, letterSpacing: -1 },
  overviewCard: { padding: 13, borderRadius: 22, backgroundColor: C.cream, borderWidth: 1, borderColor: C.line },
  overviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  overviewEyebrow: { color: C.muted, fontSize: 11, fontWeight: "500" },
  overviewMascot: { width: 50, height: 50, borderRadius: 17, backgroundColor: C.glass, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  connectionPill: { flexDirection: "row", gap: 6, alignItems: "center", borderRadius: 15, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.white, borderWidth: 1, borderColor: C.line },
  connectionPillDot: { height: 5, width: 5, borderRadius: 3, backgroundColor: C.yellow },
  connectionPillText: { fontSize: 10, color: C.brown },
  overviewNumbers: { flexDirection: "row", gap: 10, alignItems: "center", marginTop: 10, marginBottom: 10 },
  overviewDetails: { flex: 1, minWidth: 0, gap: 2 },
  overviewCountRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  overviewValue: { fontSize: 28, fontWeight: "300", letterSpacing: -1, lineHeight: 34, color: C.brown, flexShrink: 1 },
  overviewLabel: { color: C.brown, fontSize: 13, lineHeight: 20, fontWeight: "600", flexShrink: 1, minWidth: 0 },
  overviewCaption: { fontSize: 11, lineHeight: 18, color: C.muted },
  overviewIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  overviewFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderColor: C.line, paddingTop: 3, gap: 10 },
  overviewRooms: { flexDirection: "row", alignItems: "center", gap: 6 },
  overviewRoomCount: { color: C.brown, fontSize: 14, fontWeight: "600" },
  overviewRoutine: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44, paddingHorizontal: 4, borderRadius: 15, backgroundColor: "transparent", flexShrink: 1 },
  overviewRoutineText: { color: C.primary, fontSize: 11, fontWeight: "500", flexShrink: 1 },
  roomTabs: { gap: 8, paddingVertical: 18, paddingRight: 10 },
  roomTab: { minHeight: 44, paddingHorizontal: 18, borderRadius: 24, borderWidth: 1, borderColor: C.line, backgroundColor: C.white, alignItems: "center", justifyContent: "center" },
  roomTabSelected: { backgroundColor: C.primary, borderColor: C.brown },
  roomTabText: { fontSize: 12, color: C.brown },
  roomTabTextSelected: { color: C.cream, fontWeight: "600" },
  featuredRoom: { height: 242, padding: 18, justifyContent: "space-between" },
  roomPhotoBottom: { gap: 10, alignItems: "flex-start" },
  glassChip: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: C.glass, borderWidth: 1, borderColor: C.line },
  glassChipText: { color: C.brown, fontSize: 11, fontWeight: "500" },
  glassCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.glass, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  photoHeadline: { color: C.white, fontFamily: headingFont, fontSize: 28, fontStyle: "italic", lineHeight: 35, textShadowColor: "#3F230599", textShadowRadius: 10, textShadowOffset: { width: 0, height: 2 } },
  photoRoomTitle: { color: C.white, fontSize: 28, fontWeight: "500", letterSpacing: -0.8, textShadowColor: C.brown, textShadowRadius: 12, textShadowOffset: { width: 0, height: 2 } },
  photoRoomCaption: { color: C.white, fontSize: 12, marginTop: 6, textShadowColor: C.brown, textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 } },
  sceneFeatured: { backgroundColor: C.white, borderColor: C.line },
  sceneIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.cream, alignItems: "center", justifyContent: "center" },
  textAction: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 },
  textActionLabel: { color: C.brown, fontSize: 11, fontWeight: "600" },
  deviceSymbol: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(186,154,129,0.1)", alignItems: "center", justifyContent: "center" },
  powerPill: { minHeight: 44, paddingHorizontal: 9, borderRadius: 22, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#BA9A8115", borderWidth: 1, borderColor: C.line },
  powerPillOn: { backgroundColor: C.orange, borderColor: C.orange },
  powerPillDark: { backgroundColor: C.cream, borderColor: C.cream },
  powerPillText: { fontSize: 10, fontWeight: "600", color: C.brown },
  deviceCardBody: { marginTop: 16, minHeight: 82 },
  deviceCardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4, marginTop: 15 },
  deviceCaption: { fontSize: 10, color: C.muted, flexShrink: 1 },
  assistantBanner: { marginTop: 24, padding: 17, borderRadius: 24, backgroundColor: C.cream, borderWidth: 1, borderColor: C.line, flexDirection: "row", alignItems: "center", gap: 12 },
  assistantBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.orange, alignItems: "center", justifyContent: "center" },
  roomCover: { height: 216, padding: 18, justifyContent: "space-between" },
  lightHero: { height: 222, padding: 20, justifyContent: "space-between" },
  lightReadout: { flex: 1, alignItems: "flex-start" },
  lightEyebrow: { color: C.muted, opacity: 0.75, fontSize: 10, letterSpacing: 1.5 },
  brightnessUnit: { fontSize: 30, color: C.sand, letterSpacing: 0 },
  lightHint: { color: C.muted, opacity: 0.8, fontSize: 11 },
  loginBrand: { flexDirection: "row", gap: 10, alignItems: "center", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14 },
  loginWelcome: { fontFamily: headingFont, fontSize: 12, lineHeight: 17, color: C.brown, fontWeight: '400' },
  loginBrandText: { fontFamily: headingFont, fontSize: 20, lineHeight: 26, color: C.brown, fontWeight: "400", letterSpacing: 0 },
  loginSubtitle: { color: C.white, fontFamily: authFont, fontSize: 14, lineHeight: 19, marginBottom: 24, textAlign: 'center' },
  switchHitArea: { minWidth: 52, minHeight: 44, justifyContent: "center", alignItems: "center" },
  switchTrack: { width: 44, height: 26, borderRadius: 13, padding: 4, justifyContent: "center" },
  switchThumb: { width: 18, height: 18, borderRadius: 9 },
});
