import { StatusBar } from "expo-status-bar";
import SynapseUI from "./src/SynapseUI";
import PairingCircle from "./src/PairingCircle";
import AddDevicePicker from "./src/AddDevicePicker";
import PairingGuide from "./src/PairingGuide";
import type { DeviceFeedback } from './src/houseInteraction';
import { setDevicePower } from './src/deviceCommand';
import { palette } from "./src/theme";
import {
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar as NativeStatusBar,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type ScrollViewInstance,
  View,
} from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TuyaDevicePairing, {
  type TuyaHome,
} from "./modules/tuya-device-pairing/src";

type Device = {
  entity_id: string;
  name: string;
  domain: string;
  state: string;
  attributes?: Record<string, unknown>;
};

type Scene = { label: string; icon: string; command: string };

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(
  /\/$/,
  "",
);

const demoDevices: Device[] = [
  {
    entity_id: "light.living_room",
    name: "ไฟห้องนั่งเล่น",
    domain: "light",
    state: "on",
  },
  {
    entity_id: "fan.bedroom",
    name: "พัดลมห้องนอน",
    domain: "fan",
    state: "off",
  },
  {
    entity_id: "light.bedroom",
    name: "ไฟห้องนอน",
    domain: "light",
    state: "on",
  },
  {
    entity_id: "switch.work_desk",
    name: "ปลั๊กโต๊ะทำงาน",
    domain: "switch",
    state: "off",
  },
];

export default function App() {
  const [devices, setDevices] = useState<Device[]>(demoDevices);
  const [isDemoMode, setIsDemoMode] = useState(!API_BASE_URL);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingDeviceId, setPendingDeviceId] = useState<string | null>(null);
  const [deviceFeedback, setDeviceFeedback] = useState<DeviceFeedback | null>(null);
  const toggleBusy = useRef(false);
  const feedbackSequence = useRef(0);
  const [activeTab, setActiveTab] = useState("Home");
  const [pairingDeviceType, setPairingDeviceType] = useState<string | null>(null);
  const [pairingBaseline, setPairingBaseline] = useState<string[] | null>(null);
  const [pairingResult, setPairingResult] = useState<string | null>(null);
  const [tuyaSdkStatus, setTuyaSdkStatus] = useState(
    "กำลังเตรียมการเชื่อมต่อ…", 
  );
  const [tuyaCountryCode, setTuyaCountryCode] = useState("66");
  const [tuyaEmail, setTuyaEmail] = useState("");
  const [tuyaPassword, setTuyaPassword] = useState("");
  const [tuyaRegistering, setTuyaRegistering] = useState(false);
  const [tuyaVerificationCode, setTuyaVerificationCode] = useState("");
  const [tuyaConfirmPassword, setTuyaConfirmPassword] = useState("");
  const [isTuyaCodeSending, setIsTuyaCodeSending] = useState(false);
  const [tuyaCodeWait, setTuyaCodeWait] = useState(0);
  const [tuyaHomes, setTuyaHomes] = useState<TuyaHome[]>([]);
  const [selectedTuyaHomeId, setSelectedTuyaHomeId] = useState<number | null>(
    null,
  );
  const [newHomeName, setNewHomeName] = useState("Synapse Home");
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [isTuyaSigningIn, setIsTuyaSigningIn] = useState(false);
  const [isCreatingTuyaHome, setIsCreatingTuyaHome] = useState(false);
  const [isStartingTuyaPairing, setIsStartingTuyaPairing] = useState(false);
  const [tuyaAccountReady, setTuyaAccountReady] = useState(false);
  const [isPreparingTuya, setIsPreparingTuya] = useState(false);
  const [choosingTuyaHome, setChoosingTuyaHome] = useState(false);
  const [wifiDetailsReady, setWifiDetailsReady] = useState(false);
  const [pairedDeviceName, setPairedDeviceName] = useState<string | null>(null);
  const [pairingErrorDetail, setPairingErrorDetail] = useState<string | null>(null);
  const [showPairingErrorDetail, setShowPairingErrorDetail] = useState(false);
  const pairingScroll = useRef<ScrollViewInstance>(null);
  const pairingPhase = isPreparingTuya ? "loading" : pairedDeviceName !== null ? "success"
    : isStartingTuyaPairing ? "pairing" : !tuyaAccountReady ? "account"
    : selectedTuyaHomeId === null || choosingTuyaHome ? "home" : wifiDetailsReady ? "ready" : "wifi";

  useEffect(() => {
    pairingScroll.current?.scrollTo({ y: 0, animated: false });
  }, [pairingPhase, tuyaSdkStatus]);

  function showTuyaError(message: string, error?: unknown) {
    setTuyaSdkStatus(message);
    setPairingErrorDetail(error instanceof Error ? error.message : typeof error === "string" ? error : null);
    setShowPairingErrorDetail(false);
  }

  useEffect(() => {
    if (tuyaCodeWait <= 0) return;
    const timer = setTimeout(() => setTuyaCodeWait((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [tuyaCodeWait]);

  function validTuyaEmail() {
    if (!/^\d{1,4}$/.test(tuyaCountryCode.trim()) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tuyaEmail.trim())) {
      setTuyaSdkStatus("กรอกรหัสประเทศและอีเมลให้ถูกต้อง");
      return false;
    }
    return true;
  }

  async function sendTuyaRegistrationCode() {
    if (!TuyaDevicePairing || isTuyaCodeSending || isTuyaSigningIn || tuyaCodeWait > 0 || !validTuyaEmail()) return;
    setIsTuyaCodeSending(true);
    try {
      await TuyaDevicePairing.sendRegistrationCode(tuyaCountryCode.trim(), tuyaEmail.trim());
      setTuyaCodeWait(60);
      setTuyaSdkStatus("ส่งรหัสแล้ว ตรวจสอบอีเมลรวมถึงโฟลเดอร์สแปม");
    } catch (error) {
      showTuyaError("ส่งรหัสไม่สำเร็จ ตรวจสอบอีเมลแล้วลองใหม่", error);
    } finally {
      setIsTuyaCodeSending(false);
    }
  }

  async function registerTuyaAccount() {
    if (!TuyaDevicePairing || isTuyaSigningIn || isTuyaCodeSending || !validTuyaEmail()) return;
    if (!tuyaPassword || tuyaPassword !== tuyaConfirmPassword) {
      setTuyaSdkStatus("ตั้งรหัสผ่านและกรอกยืนยันให้ตรงกันทั้งสองช่อง");
      return;
    }
    if (!/^\d{6}$/.test(tuyaVerificationCode.trim())) {
      setTuyaSdkStatus("กรอกรหัส 6 หลักที่ได้รับทางอีเมล");
      return;
    }
    setIsTuyaSigningIn(true);
    try {
      await TuyaDevicePairing.registerWithEmail(tuyaCountryCode.trim(), tuyaEmail.trim(), tuyaPassword, tuyaVerificationCode.trim());
      setTuyaRegistering(false);
      setTuyaVerificationCode("");
      setTuyaConfirmPassword("");
      setTuyaSdkStatus("สมัครสำเร็จ กำลังเข้าสู่ระบบ…");
      await signInToTuya();
    } catch (error) {
      showTuyaError("สมัครไม่สำเร็จ ตรวจสอบข้อมูลและรหัสยืนยันแล้วลองใหม่", error);
    } finally {
      setIsTuyaSigningIn(false);
    }
  }

  const controllableDevices = useMemo(
    () => devices.filter((device) => !device.entity_id.endsWith("_child_lock")),
    [devices],
  );

  const loadDevices = useCallback(async () => {
    if (!API_BASE_URL) {
      setIsDemoMode(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/devices`);
      const data = await response.json();
      if (!response.ok || !data.ok || !Array.isArray(data.devices))
        throw new Error("โหลดอุปกรณ์ไม่สำเร็จ");
      setDevices(data.devices);
      setIsDemoMode(false);
    } catch {
      setDevices(demoDevices);
      setIsDemoMode(true);
      Alert.alert(
        "เชื่อมต่อ Synapse ไม่ได้",
        "กำลังแสดงข้อมูลตัวอย่าง กรุณาตรวจสอบเครือข่ายและการเชื่อมต่อระบบบ้าน",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    if (!TuyaDevicePairing || activeTab !== "Pairing") return;

    const progressSubscription = TuyaDevicePairing.addListener(
      "onPairingProgress",
      () => {
        setTuyaSdkStatus("กำลังเชื่อมต่ออุปกรณ์ เปิดหน้านี้ค้างไว้สักครู่");
      },
    );
    const successSubscription = TuyaDevicePairing.addListener(
      "onPairingSuccess",
      ({ name }) => {
        setIsStartingTuyaPairing(false);
        setPairedDeviceName(name || "อุปกรณ์ใหม่");
        setWifiPassword("");
        setPairingErrorDetail(null);
        setTuyaSdkStatus("จับคู่อุปกรณ์สำเร็จแล้ว");
        setPairingResult(null);
      },
    );
    const errorSubscription = TuyaDevicePairing.addListener(
      "onPairingError",
      ({ code, message }) => {
        setIsStartingTuyaPairing(false);
        showTuyaError("ยังเชื่อมต่อไม่สำเร็จ ตรวจสอบรหัสผ่าน Wi-Fi และให้อุปกรณ์กลับมาอยู่ในโหมดไฟกะพริบเร็ว แล้วลองอีกครั้ง", `${code}: ${message}`);
      },
    );

    return () => {
      progressSubscription.remove();
      successSubscription.remove();
      errorSubscription.remove();
      TuyaDevicePairing?.stopPairing();
      setIsStartingTuyaPairing(false);
    };
  }, [activeTab]);

  async function toggleDevice(device: Device) {
    if (toggleBusy.current || isSending) return;
    const nextState = device.state === "on" ? "off" : "on";
    const feedback = (outcome: DeviceFeedback['outcome'], message: string) => setDeviceFeedback({ id: ++feedbackSequence.current, createdAt: Date.now(), entityId: device.entity_id, outcome, message });
    if (!API_BASE_URL || isDemoMode) {
      setDevices(current => current.map(item => item.entity_id === device.entity_id ? { ...item, state: nextState } : item));
      feedback('success', `ตัวอย่าง: ${nextState === 'on' ? 'เปิด' : 'ปิด'}${device.name}แล้ว`);
      return;
    }
    toggleBusy.current = true;
    setPendingDeviceId(device.entity_id);
    setIsSending(true);
    setDevices(current => current.map(item => item.entity_id === device.entity_id ? { ...item, state: nextState } : item));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      await setDevicePower(API_BASE_URL, device.entity_id, nextState, controller.signal);
      feedback('success', `${nextState === 'on' ? 'เปิด' : 'ปิด'}${device.name}แล้วค่ะ`);
    } catch {
      setDevices(current => current.map(item => item.entity_id === device.entity_id ? { ...item, state: device.state } : item));
      feedback('error', 'ติดต่ออุปกรณ์ไม่ได้ ลองอีกครั้งค่ะ');
    } finally { clearTimeout(timeout); toggleBusy.current = false; setIsSending(false); setPendingDeviceId(null); }
  }

  async function runScene(scene: Scene) {
    if (!API_BASE_URL || isDemoMode) {
      return "นี่คือโหมดตัวอย่าง เชื่อมต่อ Synapse เพื่อเรียกอุปกรณ์จริงค่ะ";
    }

    setIsSending(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ai/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: scene.command, source: "scene" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error("เรียกใช้โหมดไม่สำเร็จ");
      await loadDevices();
      return data.speech || "ส่งคำสั่งให้ Synapse แล้วค่ะ";
    } catch {
      return "เรียกใช้โหมดไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อระบบบ้านและผู้ช่วยค่ะ";
    } finally {
      setIsSending(false);
    }
  }

  function openPairing() {
    setPairingDeviceType(null);
    setPairingResult(null);
    setPairingBaseline(controllableDevices.map((device) => device.entity_id));
    setActiveTab("Pairing");
    void initializeTuyaSdk();
  }

  async function initializeTuyaSdk() {
    if (!TuyaDevicePairing) {
      setTuyaSdkStatus(
        "กรุณาเปิดแอป Synapse ที่ติดตั้งบนมือถือ เพื่อเพิ่มอุปกรณ์",
      );
      return;
    }

    setIsPreparingTuya(true);
    setPairingErrorDetail(null);
    try {
      const status = await TuyaDevicePairing.initialize();
      if (!status.initialized) throw new Error("เตรียมระบบเชื่อมต่ออุปกรณ์ไม่สำเร็จ");
      // The native SDK owns the session; do not store or request the password again.
      try {
        const homes = await TuyaDevicePairing.listHomes();
        setTuyaAccountReady(true);
        setTuyaHomes(homes);
        setSelectedTuyaHomeId((current) => homes.some((home) => home.homeId === current) ? current : homes[0]?.homeId ?? null);
        setTuyaSdkStatus(homes.length ? "บัญชีและบ้านพร้อมแล้ว เชื่อมต่อ Wi-Fi ต่อได้เลย" : "เข้าสู่ระบบแล้ว ตั้งชื่อบ้านเพื่อไปต่อ");
      } catch {
        setTuyaAccountReady(false);
        setTuyaSdkStatus("เข้าสู่บัญชีอุปกรณ์ของคุณเพื่อเริ่มต้น");
      }
    } catch (error) {
      showTuyaError("ยังเตรียมการเชื่อมต่อไม่ได้ กรุณากลับแล้วเปิดหน้านี้ใหม่", error);
    } finally {
      setIsPreparingTuya(false);
    }
  }

  async function signInToTuya() {
    if (!TuyaDevicePairing) return;
    if (!validTuyaEmail() || !tuyaPassword) {
      setTuyaSdkStatus("กรอกอีเมลและรหัสผ่านบัญชีอุปกรณ์ให้ครบ");
      return;
    }
    setIsTuyaSigningIn(true);
    setPairingErrorDetail(null);
    setTuyaSdkStatus("กำลังเข้าสู่ระบบ…");
    try {
      await TuyaDevicePairing.loginWithEmail(
        tuyaCountryCode.trim(),
        tuyaEmail.trim(),
        tuyaPassword,
      );
      setTuyaPassword("");
      const homes = await TuyaDevicePairing.listHomes();
      setTuyaHomes(homes);
      setTuyaAccountReady(true);
      setSelectedTuyaHomeId((current) => current ?? homes[0]?.homeId ?? null);
      setTuyaSdkStatus(
        homes.length > 0
          ? "เข้าสู่ระบบแล้ว เชื่อมต่อ Wi-Fi ต่อได้เลย"
          : "เข้าสู่ระบบแล้ว ตั้งชื่อบ้านเพื่อไปต่อ",
      );
    } catch (error) {
      showTuyaError("เข้าสู่ระบบไม่สำเร็จ ตรวจสอบอีเมลและรหัสผ่านบัญชีอุปกรณ์", error);
    } finally {
      setIsTuyaSigningIn(false);
    }
  }

  async function createTuyaHome() {
    if (!TuyaDevicePairing || !tuyaAccountReady || isCreatingTuyaHome) return;
    if (!newHomeName.trim()) { setTuyaSdkStatus("กรุณาตั้งชื่อบ้านก่อนดำเนินการต่อ"); return; }
    setIsCreatingTuyaHome(true);
    setPairingErrorDetail(null);
    try {
      const home = await TuyaDevicePairing.createHome(newHomeName.trim());
      setTuyaHomes((current) => [...current, home]);
      setSelectedTuyaHomeId(home.homeId);
      setChoosingTuyaHome(false);
      setTuyaSdkStatus(`บ้าน “${home.name}” พร้อมแล้ว เชื่อมต่อ Wi-Fi ต่อได้เลย`);
    } catch (error) {
      showTuyaError("สร้างบ้านไม่สำเร็จ ลองอีกครั้งได้เลย", error);
    } finally {
      setIsCreatingTuyaHome(false);
    }
  }

  async function requestPairingPermissions() {
    if (Platform.OS !== "android") return true;
    const permissions =
      Platform.Version >= 33
        ? [
            PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]
        : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    const results = await PermissionsAndroid.requestMultiple(permissions);
    return permissions.every(
      (permission) =>
        results[permission] === PermissionsAndroid.RESULTS.GRANTED,
    );
  }

  async function startTuyaPairing() {
    if (!TuyaDevicePairing || selectedTuyaHomeId === null || isStartingTuyaPairing || !wifiDetailsReady) return;
    if (!wifiSsid.trim()) {
      setTuyaSdkStatus("กรอกชื่อ Wi-Fi 2.4 GHz ที่อุปกรณ์จะใช้ก่อน");
      return;
    }

    setPairingErrorDetail(null);
    setIsStartingTuyaPairing(true);
    try {
      const permissionsGranted = await requestPairingPermissions();
      if (!permissionsGranted) {
        setIsStartingTuyaPairing(false);
        setTuyaSdkStatus(
          "กรุณาอนุญาตการเข้าถึงอุปกรณ์ใกล้เคียงและตำแหน่ง แล้วลองเชื่อมต่ออีกครั้ง",
        );
        return;
      }

      setTuyaSdkStatus(
        "กำลังเริ่มเชื่อมต่อ เปิดหน้านี้ค้างไว้",
      );
      const result = await TuyaDevicePairing.startEzPairing(
        selectedTuyaHomeId,
        wifiSsid.trim(),
        wifiPassword,
      );
      setTuyaSdkStatus(
        `กำลังเชื่อมต่อ ใช้เวลาได้ถึง ${result.timeoutSeconds} วินาที เปิดหน้านี้ค้างไว้`,
      );
    } catch (error) {
      setIsStartingTuyaPairing(false);
      showTuyaError("เริ่มเชื่อมต่อไม่สำเร็จ ตรวจสอบ Wi-Fi แล้วลองอีกครั้ง", error);
    }
  }

  function stopTuyaPairing() {
    TuyaDevicePairing?.stopPairing();
    setIsStartingTuyaPairing(false);
    setTuyaSdkStatus("หยุดเชื่อมต่อแล้ว ตรวจสอบอุปกรณ์ก่อนลองใหม่ได้เลย");
  }

  async function checkForPairedDevice() {
    if (!API_BASE_URL) {
      setPairingResult("ยังไม่ได้เชื่อมระบบบ้านกับ Synapse กรุณาตั้งค่าการเชื่อมต่อก่อนตรวจสอบอุปกรณ์");
      return;
    }

    const before = new Set(pairingBaseline || []);
    await loadDevices();
    try {
      const response = await fetch(`${API_BASE_URL}/devices`);
      const data = await response.json();
      if (!response.ok || !data.ok || !Array.isArray(data.devices))
        throw new Error("ตรวจสอบอุปกรณ์ไม่สำเร็จ");
      const added = data.devices.filter(
        (device: Device) => !before.has(device.entity_id),
      );
      setPairingResult(
        added.length > 0
          ? `พบอุปกรณ์ใหม่ ${added.length} รายการใน Synapse แล้ว`
          : "จับคู่กับ Tuya แล้ว แต่ยังไม่พบใน Synapse ต้องเชื่อมบัญชีอุปกรณ์นี้กับระบบบ้านก่อน",
      );
    } catch {
      setPairingResult(
        "ยังตรวจสอบรายการอุปกรณ์ไม่ได้ ตรวจสอบการเชื่อมต่อแล้วลองใหม่",
      );
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.paper, paddingTop: Platform.OS === "android" ? NativeStatusBar.currentHeight ?? 24 : 0 }}>
      <StatusBar style="dark" />
      <View
        style={{ flex: 1, display: activeTab === "Pairing" ? "none" : "flex" }}
      >
        <SynapseUI
          devices={controllableDevices}
          demo={isDemoMode}
          loading={isLoading}
          sending={isSending} pendingDeviceId={pendingDeviceId}
          deviceFeedback={deviceFeedback}
          tab={activeTab}
          setTab={setActiveTab}
          reload={loadDevices}
          toggle={toggleDevice}
          scene={runScene}
          pair={openPairing}
          api={API_BASE_URL}
        />
      </View>
      {activeTab === "Pairing" && pairingDeviceType === null && <AddDevicePicker onBack={() => setActiveTab('Home')} onSelect={setPairingDeviceType}/>}
      {activeTab === "Pairing" && pairingDeviceType !== null && (pairingPhase === 'ready' || pairingPhase === 'pairing') && <PairingGuide
        device={pairingDeviceType} connecting={pairingPhase === 'pairing'} status={tuyaSdkStatus} error={pairingErrorDetail}
        onBack={() => { setWifiDetailsReady(false); setPairingErrorDetail(null); }}
        onClose={() => { if (isStartingTuyaPairing) stopTuyaPairing(); setWifiDetailsReady(false); setPairingDeviceType(null); }}
        onConnect={() => void startTuyaPairing()}
      />}
      {activeTab === "Pairing" && pairingDeviceType !== null && pairingPhase !== 'ready' && pairingPhase !== 'pairing' && (
        <ScrollView ref={pairingScroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.pageHeader}>
            {<Pressable accessibilityRole="button" accessibilityLabel="กลับไปเลือกชนิดอุปกรณ์" onPress={() => setPairingDeviceType(null)} style={styles.pairingBackButton}><Text style={styles.pairingBackButtonText}>‹ เลือกอุปกรณ์</Text></Pressable>}
            <Text style={styles.pageTitle}>เพิ่มอุปกรณ์</Text>
            <Text style={styles.pageSubtitle}>{pairingDeviceType} · Wi-Fi 2.4 GHz</Text>
          </View>
          <View style={styles.stepTrack}>
            {(tuyaAccountReady && selectedTuyaHomeId !== null && !choosingTuyaHome ? ["Wi-Fi", "เตรียมอุปกรณ์", "เชื่อมต่อ"] : ["บัญชี", "บ้าน", "Wi-Fi"]).map((label, index) => {
              const current = pairingPhase === "account" || pairingPhase === "loading" || pairingPhase === "wifi" ? 0 : pairingPhase === "home" ? 1 : 2;
              return <View key={label} style={styles.stepItem}>
                <View style={[styles.stepDot, index === current && styles.stepActive]}><Text style={[styles.stepNumber, index === current && styles.stepNumberActive]}>{index < current || pairingPhase === "success" ? "✓" : index + 1}</Text></View>
                <Text style={styles.stepLabel}>{label}</Text>
              </View>;
            })}
          </View>
          {pairingPhase === "loading" ? (
            <View style={styles.pairingFormCard}><ActivityIndicator color={palette.brown} /><Text style={styles.pairingFormHint}>กำลังตรวจสอบบัญชีและบ้านของคุณ…</Text></View>
          ) : (
            <>
              {(pairingPhase !== "wifi" || pairingErrorDetail) && <View style={styles.tuyaSdkNotice} accessibilityLiveRegion="polite">
                <Text style={styles.tuyaSdkNoticeText}>{tuyaSdkStatus}</Text>
                {pairingErrorDetail && <>
                  <Pressable accessibilityRole="button" onPress={() => setShowPairingErrorDetail(!showPairingErrorDetail)} style={styles.pairingStopButton}>
                    <Text style={styles.pairingStopButtonText}>{showPairingErrorDetail ? "ซ่อนรายละเอียด" : "ดูรายละเอียดปัญหา"}</Text>
                  </Pressable>
                  {showPairingErrorDetail && <Text selectable style={styles.pairingFormHint}>{pairingErrorDetail}</Text>}
                </>}
              </View>}
              {TuyaDevicePairing && pairingPhase === "account" && (<View style={styles.pairingFormCard}>
                    <Text style={styles.pairingFormTitle}>
                      {tuyaRegistering ? "สมัครบัญชีอุปกรณ์" : "เข้าสู่บัญชีอุปกรณ์"}
                    </Text>
                    <Text style={styles.pairingFormHint}>
                      ใช้บัญชีอุปกรณ์ที่สมัครในหน้านี้ หากยังไม่มี ให้กดสมัครด้านล่าง
                    </Text>
                    <Text style={styles.fieldLabel}>รหัสประเทศ (ไทย 66) และอีเมล</Text>
<View style={styles.pairingInputRow}>
                      <TextInput
                        value={tuyaCountryCode}
                        editable={!isTuyaSigningIn && !isTuyaCodeSending}
                        accessibilityLabel="รหัสประเทศของบัญชี Tuya"
                        onChangeText={setTuyaCountryCode}
                        keyboardType="phone-pad"
                        placeholder="66"
                        placeholderTextColor={palette.muted}
                        style={[styles.pairingInput, styles.countryCodeInput]}
                      />
                      <TextInput
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        onChangeText={setTuyaEmail}
                        placeholder="อีเมล"
                        placeholderTextColor={palette.muted}
                        style={[styles.pairingInput, styles.pairingInputWide]}
                        value={tuyaEmail}
                        editable={!isTuyaSigningIn && !isTuyaCodeSending}
                        accessibilityLabel="อีเมลบัญชีอุปกรณ์ Tuya"
                      />
                    </View>
                    <Text style={styles.fieldLabel}>รหัสผ่านบัญชีอุปกรณ์</Text>
                    <TextInput
                      autoCapitalize="none"
                      autoComplete={tuyaRegistering ? "new-password" : "current-password"}
                      onChangeText={setTuyaPassword}
                      placeholder={tuyaRegistering ? "ตั้งรหัสผ่านใหม่" : "รหัสผ่านบัญชีอุปกรณ์"}
                      placeholderTextColor={palette.muted}
                      secureTextEntry
                      style={styles.pairingInput}
                      value={tuyaPassword}
                      editable={!isTuyaSigningIn}
                      accessibilityLabel="รหัสผ่านบัญชีอุปกรณ์"
                    />
                    {tuyaRegistering && (
                      <>
                        <Text style={styles.fieldLabel}>ยืนยันรหัสผ่าน</Text>
                        <TextInput
                          value={tuyaConfirmPassword}
                          onChangeText={setTuyaConfirmPassword}
                          placeholder="ยืนยันรหัสผ่านใหม่"
                          placeholderTextColor={palette.muted}
                          secureTextEntry
                          autoCapitalize="none"
                          autoComplete="new-password"
                          editable={!isTuyaSigningIn}
                          accessibilityLabel="ยืนยันรหัสผ่านบัญชีอุปกรณ์ Tuya"
                          style={styles.pairingInput}
                        />
                        <Pressable
                          accessibilityRole="button"
                          style={styles.pairingSecondaryButton}
                          disabled={isTuyaCodeSending || isTuyaSigningIn || tuyaCodeWait > 0}
                          onPress={() => void sendTuyaRegistrationCode()}
                        >
                          <Text style={styles.pairingSecondaryButtonText}>
                            {isTuyaCodeSending ? "กำลังส่งรหัส…" : tuyaCodeWait > 0 ? `ส่งใหม่ได้ใน ${tuyaCodeWait} วินาที` : "ส่งรหัสยืนยันทางอีเมล"}
                          </Text>
                        </Pressable>
                        <Text style={styles.fieldLabel}>รหัสยืนยันจากอีเมล</Text>
                        <TextInput
                          value={tuyaVerificationCode}
                          onChangeText={setTuyaVerificationCode}
                          placeholder="รหัส 6 หลักจากอีเมล"
                          placeholderTextColor={palette.muted}
                          keyboardType="number-pad"
                          maxLength={6}
                          autoComplete="one-time-code"
                          editable={!isTuyaSigningIn}
                          accessibilityLabel="รหัสยืนยันอีเมล Tuya"
                          style={styles.pairingInput}
                        />
                      </>
                    )}
                    <Pressable
                      style={[
                        styles.pairingPrimaryButton,
                        isTuyaSigningIn && styles.pairingButtonDisabled,
                      ]}
                      onPress={() => void (tuyaRegistering ? registerTuyaAccount() : signInToTuya())}
                      disabled={isTuyaSigningIn || isTuyaCodeSending}
                    >
                      <Text style={styles.pairingPrimaryButtonText}>
                        {isTuyaSigningIn
                          ? "กำลังดำเนินการ…"
                          : tuyaRegistering ? "สมัครและไปต่อ" : "เข้าสู่ระบบและไปต่อ"}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      style={styles.pairingSecondaryButton}
                      disabled={isTuyaSigningIn || isTuyaCodeSending}
                      onPress={() => {
                        setTuyaRegistering(!tuyaRegistering);
                        setTuyaPassword("");
                        setTuyaConfirmPassword("");
                        setTuyaVerificationCode("");
                        setTuyaSdkStatus("สมัครบัญชีสำหรับอุปกรณ์ ใช้อีเมลเดิมได้ แต่ต้องสมัครแยกจาก Tuya Developer");
                      }}
                    >
                      <Text style={styles.pairingSecondaryButtonText}>
                        {tuyaRegistering ? "มีบัญชีอุปกรณ์แล้ว · เข้าสู่ระบบ" : "ยังไม่มีบัญชี · สมัครที่นี่"}
                      </Text>
                    </Pressable>
                  </View>)}
              {TuyaDevicePairing && pairingPhase === "home" && (
                <View style={styles.pairingFormCard}>
                  <Text style={styles.pairingFormTitle}>{tuyaHomes.length ? "เลือกบ้านของอุปกรณ์" : "ตั้งชื่อบ้านของคุณ"}</Text>
                  <Text style={styles.pairingFormHint}>ใช้จัดกลุ่มอุปกรณ์ในบ้าน ตั้งค่าครั้งแรกเพียงครั้งเดียว</Text>
                  {tuyaHomes.map((home) => <Pressable key={home.homeId} accessibilityRole="button" style={styles.homeChoice} disabled={isCreatingTuyaHome}
                    onPress={() => { setSelectedTuyaHomeId(home.homeId); setChoosingTuyaHome(false); setPairingErrorDetail(null); setTuyaSdkStatus("เลือกบ้านแล้ว กรอก Wi-Fi เพื่อไปต่อ"); }}>
                    <Text style={styles.homeChoiceName}>{home.name}</Text><Text style={styles.homeChoiceMark}>เลือก →</Text>
                  </Pressable>)}
                  <Text style={styles.fieldLabel}>{tuyaHomes.length ? "หรือสร้างบ้านใหม่" : "ชื่อบ้าน"}</Text>
                  <TextInput accessibilityLabel="ชื่อบ้าน" style={styles.pairingInput} value={newHomeName} onChangeText={setNewHomeName} editable={!isCreatingTuyaHome} />
                  <Pressable accessibilityRole="button" style={[styles.pairingPrimaryButton, isCreatingTuyaHome && styles.pairingButtonDisabled]} disabled={isCreatingTuyaHome} onPress={() => void createTuyaHome()}>
                    <Text style={styles.pairingPrimaryButtonText}>{isCreatingTuyaHome ? "กำลังสร้างบ้าน…" : "บันทึกบ้านและไปต่อ"}</Text>
                  </Pressable>
                </View>
              )}
              {TuyaDevicePairing && pairingPhase === "wifi" && (
                <View style={styles.pairingFormCard}>
                  <Text style={styles.pairingFormTitle}>อุปกรณ์จะใช้ Wi-Fi ไหน?</Text>
                  <View style={styles.homeSummary}>
                    <Text style={styles.pairingFormHint}>บ้าน: {tuyaHomes.find((home) => home.homeId === selectedTuyaHomeId)?.name || "บ้านที่เลือก"}</Text>
                    <Pressable accessibilityRole="button" onPress={() => setChoosingTuyaHome(true)} style={styles.changeHomeButton}><Text style={styles.pairingStopButtonText}>เปลี่ยนบ้าน</Text></Pressable>
                  </View>
                  <Text style={styles.pairingFormHint}>ให้มือถือเชื่อม Wi-Fi 2.4 GHz เดียวกับที่จะใช้งานอุปกรณ์</Text>
                  <Text style={styles.fieldLabel}>ชื่อ Wi-Fi</Text>
                  <TextInput accessibilityLabel="ชื่อ Wi-Fi" autoCapitalize="none" autoCorrect={false} value={wifiSsid} onChangeText={setWifiSsid} style={styles.pairingInput} placeholder="ชื่อเครือข่าย 2.4 GHz" placeholderTextColor={palette.muted} />
                  <Text style={styles.fieldLabel}>รหัสผ่าน Wi-Fi</Text>
                  <TextInput accessibilityLabel="รหัสผ่าน Wi-Fi" autoCapitalize="none" autoCorrect={false} secureTextEntry value={wifiPassword} onChangeText={setWifiPassword} style={styles.pairingInput} placeholder="รหัสผ่านของเครือข่ายนี้" placeholderTextColor={palette.muted} />
                  {!wifiSsid.trim() && <Text style={styles.pairingFormHint}>กรอกชื่อ Wi-Fi ก่อนกดถัดไป</Text>}
                  <PairingCircle icon="wifi" label="ถัดไป" disabled={!wifiSsid.trim()} onPress={() => { setWifiDetailsReady(true); setPairingErrorDetail(null); setTuyaSdkStatus("เตรียมอุปกรณ์ให้ไฟกะพริบเร็ว แล้วแตะวงกลมเพื่อเริ่ม"); }} />
                </View>
              )}
              {pairingPhase === "success" && (
                <View style={styles.pairingFormCard}>
                  <PairingCircle label="จับคู่สำเร็จ" icon="check" />
                  <Text style={styles.fieldLabel}>{pairedDeviceName}</Text>
                  <Text style={styles.pairingFormHint}>อุปกรณ์เชื่อมต่อกับ Tuya แล้ว ขั้นต่อไปตรวจสอบว่าอุปกรณ์พร้อมควบคุมใน Synapse หรือยัง</Text>
                  <Pressable accessibilityRole="button" style={[styles.pairingPrimaryButton, isLoading && styles.pairingButtonDisabled]} disabled={isLoading} onPress={() => void checkForPairedDevice()}><Text style={styles.pairingPrimaryButtonText}>{isLoading ? "กำลังตรวจสอบ…" : "ตรวจสอบอุปกรณ์ใน Synapse"}</Text></Pressable>
                  {pairingResult && <Text accessibilityLiveRegion="polite" style={styles.pairingFormHint}>{pairingResult}</Text>}
                  <Pressable accessibilityRole="button" style={styles.pairingSecondaryButton} onPress={() => { setPairedDeviceName(null); setWifiDetailsReady(false); setPairingResult(null); setPairingBaseline(controllableDevices.map((device) => device.entity_id)); setTuyaSdkStatus("เตรียมอุปกรณ์ชิ้นถัดไป แล้วเชื่อมต่อได้เลย"); }}><Text style={styles.pairingSecondaryButtonText}>เพิ่มอุปกรณ์อีกชิ้น</Text></Pressable>
                </View>
              )}
            </>
          )}
          {<Pressable accessibilityRole="button" style={styles.pairingBackButton} onPress={() => setActiveTab("Settings")}><Text style={styles.pairingBackButtonText}>กลับไปตั้งค่า</Text></Pressable>}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 48 },
  stepTrack: { flexDirection: "row", gap: 8, marginTop: 18 },
  stepItem: { flex: 1, alignItems: "center", gap: 6 },
  stepDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.sandSurface, justifyContent: "center", alignItems: "center" },
  stepNumber: { color: palette.muted, fontSize: 13, fontWeight: "700" },
  stepNumberActive: { color: palette.white },
  stepLabel: { color: palette.muted, fontSize: 11, textAlign: "center" },
  stepActive: { backgroundColor: palette.brown },
  circlePanel: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 12 },
  circleTitle: { color: palette.brown, fontSize: 18, lineHeight: 28, fontWeight: "700", textAlign: "center" },
  circleHint: { color: palette.muted, fontSize: 13, lineHeight: 22, textAlign: "center", marginTop: 10 },
  fieldLabel: { color: palette.brown, fontSize: 12, fontWeight: "700", marginTop: 16 },
  homeSummary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" },
  changeHomeButton: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  pageHeader: { marginTop: 12 },
  pageTitle: { color: palette.brown, fontSize: 29, fontWeight: "800" },
  pageSubtitle: { color: palette.muted, fontSize: 13, marginTop: 5 },
  pairingHero: {
    backgroundColor: palette.sand,
    borderRadius: 21,
    marginTop: 24,
    padding: 19,
  },
  pairingHeroEyebrow: {
    color: palette.cream,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  pairingHeroTitle: {
    color: palette.white,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 7,
  },
  pairingHeroText: {
    color: palette.cream,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
  },
  tuyaSdkNotice: {
    backgroundColor: palette.cream,
    borderColor: palette.line,
    borderRadius: 15,
    borderWidth: 1,
    marginTop: 14,
    padding: 13,
  },
  tuyaSdkNoticeTitle: { color: palette.brown, fontSize: 12, fontWeight: "800" },
  tuyaSdkNoticeText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 20,
    marginTop: 4,
  },
  pairingFormCard: {
    backgroundColor: palette.white,
    borderColor: palette.line,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 15,
    padding: 15,
  },
  pairingFormTitle: { color: palette.brown, fontSize: 14, fontWeight: "800" },
  pairingFormHint: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 20,
    marginTop: 5,
  },
  pairingInputRow: { flexDirection: "row", gap: 9, marginTop: 12 },
  pairingInput: {
    backgroundColor: palette.cream,
    borderColor: palette.line,
    borderRadius: 11,
    borderWidth: 1,
    color: palette.brown,
    fontSize: 12,
    marginTop: 10,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  countryCodeInput: { flex: 0.26, marginTop: 0 },
  pairingInputWide: { flex: 1, marginTop: 0 },
  pairingSecondaryButton: {
    alignItems: "center",
    backgroundColor: palette.sandSurface,
    borderRadius: 11,
    marginTop: 11,
    paddingVertical: 12,
  },
  pairingSecondaryButtonText: {
    color: palette.brown,
    fontSize: 12,
    fontWeight: "800",
  },
  pairingButtonDisabled: { opacity: 0.55 },
  homeChoiceList: { gap: 8, marginTop: 12 },
  homeChoice: {
    alignItems: "center",
    backgroundColor: palette.cream,
    borderColor: palette.line,
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 45,
    marginTop: 10,
    paddingHorizontal: 12,
  },
  homeChoiceSelected: { backgroundColor: palette.cream, borderColor: palette.sand },
  homeChoiceName: {
    color: palette.brown,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  homeChoiceNameSelected: { color: palette.brown, fontWeight: "800" },
  homeChoiceMark: { color: palette.sand, fontSize: 10 },
  pairingStopButton: { alignItems: "center", paddingTop: 13 },
  pairingStopButtonText: { color: palette.muted, fontSize: 12, fontWeight: "800" },
  pairingSteps: {
    backgroundColor: palette.white,
    borderColor: palette.line,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 15,
    paddingHorizontal: 15,
  },
  pairingStep: {
    alignItems: "flex-start",
    borderColor: palette.sandSurface,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingVertical: 16,
  },
  pairingStepNumber: {
    alignItems: "center",
    backgroundColor: palette.sandSurface,
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  pairingStepNumberText: { color: palette.brown, fontSize: 12, fontWeight: "800" },
  pairingStepCopy: { flex: 1, marginLeft: 11 },
  pairingStepTitle: { color: palette.brown, fontSize: 13, fontWeight: "800" },
  pairingStepText: {
    color: palette.sand,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  pairingPrimaryButton: {
    alignItems: "center",
    backgroundColor: palette.brown,
    borderRadius: 14,
    marginTop: 18,
    paddingVertical: 14,
  },
  pairingPrimaryButtonText: {
    color: palette.white,
    fontSize: 13,
    fontWeight: "800",
  },
  pairingResult: {
    backgroundColor: palette.cream,
    borderColor: palette.line,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    padding: 13,
  },
  pairingResultText: { color: palette.brown, fontSize: 12, lineHeight: 17 },
  pairingBackButton: { alignItems: "center", paddingVertical: 18 },
  pairingBackButtonText: { color: palette.sand, fontSize: 12, fontWeight: "800" },
});
