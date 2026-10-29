import { useEffect, useRef, useState } from "react";
import { AppState, PermissionsAndroid, Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import { homeWifiStatus, parseHomeWifiNames, wifiName } from "./homeWifi";

const defaults: string[] = (process.env.EXPO_PUBLIC_HOME_WIFI_SSIDS || "")
  .split(",").map((name: string) => name.trim()).filter(Boolean);
const settingsFile = () => new File(Paths.document, "home-wifi.json");

async function readWifi(requestPermission: boolean) {
  if (Platform.OS !== "android") throw new Error("ตรวจ Wi-Fi บ้านได้ในแอป Android");
  const permission = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  let allowed = await PermissionsAndroid.check(permission);
  if (!allowed && requestPermission) {
    allowed = (await PermissionsAndroid.request(permission, {
      title: "ตรวจ Wi-Fi บ้าน",
      message: "Android ต้องใช้สิทธิ์ตำแหน่งเพื่ออ่านชื่อ Wi-Fi และตรวจว่าเชื่อม Wi-Fi บ้านอยู่หรือไม่",
      buttonPositive: "ดำเนินการต่อ", buttonNegative: "ไว้ภายหลัง",
    })) === PermissionsAndroid.RESULTS.GRANTED;
  }
  if (!allowed) throw new Error("อนุญาตตำแหน่งเพื่ออ่านชื่อ Wi-Fi บ้าน");
  // Query Wi-Fi explicitly so Tailscale is not mistaken for leaving home.
  const NetInfo = (await import("@react-native-community/netinfo")).default;
  const state = await NetInfo.fetch("wifi");
  return { type: state.type, isConnected: state.isConnected,
    details: { ssid: state.type === "wifi" ? state.details?.ssid : undefined } };
}

export function useHomeWifi(active: boolean) {
  const [names, setNames] = useState<string[]>(defaults);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [wifi, setWifi] = useState<Awaited<ReturnType<typeof readWifi>> | null>(null);
  const [message, setMessage] = useState("กำลังตรวจสอบ Wi-Fi บ้าน…");
  const [saving, setSaving] = useState(false);
  const mutation = useRef(false);
  const asked = useRef(false);

  useEffect(() => {
    try {
      if (Platform.OS === "android") {
        const file = settingsFile();
        if (file.exists) setNames(parseHomeWifiNames(file.textSync()));
      }
    } catch { setStorageError("อ่านรายการ Wi-Fi บ้านที่บันทึกไว้ไม่ได้"); }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    let disposed = false;
    let checking = false;
    async function check() {
      if (checking || disposed || AppState.currentState !== "active") return;
      checking = true;
      const requestPermission = !asked.current;
      asked.current = true;
      try {
        const state = await readWifi(requestPermission);
        if (!disposed) { setWifi(state); setMessage("อ่านชื่อ Wi-Fi ไม่ได้ · ตรวจสิทธิ์และการเปิดตำแหน่ง"); }
      } catch (error) {
        if (!disposed) {
          setWifi(null);
          setMessage(error instanceof Error && !error.message.includes("RNCNetInfo")
            ? error.message : "ต้องอัปเดตแอปเพื่ออ่านสถานะ Wi-Fi");
        }
      } finally { checking = false; }
    }
    void check();
    const interval = setInterval(() => void check(), 5000);
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") void check();
      else if (!disposed) setWifi(null);
    });
    return () => { disposed = true; clearInterval(interval); subscription.remove(); };
  }, [active]);

  function save(next: string[]) {
    if (Platform.OS !== "android") throw new Error("ตั้ง Wi-Fi บ้านได้ในแอป Android");
    if (!loaded || storageError) throw new Error(storageError || "กำลังอ่านการตั้งค่า");
    const unique = [...new Set(next)];
    // Write before updating the UI so failed writes never look saved.
    settingsFile().write(JSON.stringify({ version: 1, names: unique }));
    setNames(unique);
  }
  async function addCurrent() {
    if (mutation.current) return;
    mutation.current = true;
    setSaving(true);
    try {
      // Re-read on tap; do not save a network from an old scan.
      const state = await readWifi(true);
      setWifi(state);
      const name = state.isConnected === true ? wifiName(state.details.ssid) : null;
      if (!name) throw new Error("เชื่อมต่อ Wi-Fi ที่ต้องการและเปิดตำแหน่งก่อนบันทึก");
      save([...names, name]);
    } finally { mutation.current = false; setSaving(false); }
  }
  function remove(name: string) {
    if (mutation.current) return;
    save(names.filter(item => item !== name));
  }

  const currentName = wifi?.isConnected ? wifiName(wifi.details.ssid) : null;
  const atHome = loaded && !storageError && wifi ? homeWifiStatus(wifi, names) : null;
  return { atHome, names, currentName, saving, loaded, storageError, addCurrent, remove,
    message: storageError || (!loaded ? "กำลังอ่านการตั้งค่า…" : !names.length ? "ยังไม่ได้ตั้ง Wi-Fi บ้าน · เพิ่มได้ใน Settings"
      : atHome === true ? "เชื่อมต่อ " + currentName : atHome === false ? "ไม่ได้เชื่อมต่อ Wi-Fi บ้าน" : message) };
}
