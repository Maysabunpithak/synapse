type WifiState = {
  type: string;
  isConnected: boolean | null;
  details?: { ssid?: string | null } | null;
};

export function wifiName(value: string | null | undefined): string | null {
  const name = value?.replace(/^"|"$/g, "");
  return name && name !== "<unknown ssid>" && name !== "0x" ? name : null;
}

export function parseHomeWifiNames(value: string): string[] {
  const data = JSON.parse(value);
  if (data?.version !== 1 || !Array.isArray(data.names) ||
      !data.names.every((name: unknown) => typeof name === "string" && wifiName(name) === name))
    throw new Error("อ่านรายการ Wi-Fi บ้านที่บันทึกไว้ไม่ได้");
  return [...new Set<string>(data.names)];
}

export function homeWifiStatus(state: WifiState, homeNames: string[]): boolean | null {
  if (!homeNames.length) return null;
  if (state.isConnected === false) return false;
  if (state.isConnected !== true || state.type !== "wifi") return null;
  const ssid = wifiName(state.details?.ssid);
  if (!ssid) return null;
  return homeNames.includes(ssid);
}
