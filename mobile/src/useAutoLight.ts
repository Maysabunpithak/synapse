import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { createDebouncedWriter } from "./debouncedWriter";

type Light = { entity_id: string; attributes?: Record<string, unknown> };
type Update = { device: Light; brightness: number; warm: boolean; revision: number; api: string; demo: boolean };
type Options = { deviceId?: string; api: string; demo: boolean; reload: () => Promise<void> };

export function useAutoLight(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const mounted = useRef(true);
  const revision = useRef(0);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [writer] = useState(() => createDebouncedWriter<Update>(async update => {
    const isCurrent = () => mounted.current && update.revision === revision.current && latest.current.deviceId === update.device.entity_id;
    if (update.demo) { if (isCurrent()) setStatus("saved"); return; }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const attrs = update.device.attributes;
      const supported = attrs?.supported_color_modes;
      const body: Record<string, unknown> = { entity_id: update.device.entity_id, brightness_pct: update.brightness };
      if (Array.isArray(supported) && supported.includes("color_temp")) {
        body.color_temp_kelvin = update.warm ? Number(attrs?.min_color_temp_kelvin ?? 2700) : Number(attrs?.max_color_temp_kelvin ?? 6500);
      } else if (Array.isArray(supported) && supported.some(mode => ["hs", "rgb", "rgbw", "rgbww", "xy"].includes(mode))) {
        body.hs_color = update.warm ? [35, 35] : [45, 0];
      }
      const response = await fetch(update.api + "/light", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error("ปรับแสงไฟไม่สำเร็จ");
      if (isCurrent()) setStatus("saved");
      if (mounted.current) await latest.current.reload().catch(() => {});
    } catch {
      if (isCurrent()) setStatus("error");
    } finally { clearTimeout(timeout); }
  }));

  useEffect(() => {
    revision.current += 1;
    void writer.cancel();
    setStatus("idle");
  }, [options.deviceId, options.api, options.demo, writer]);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener("change", state => {
      if (state !== "active") {
        revision.current += 1;
        void writer.cancel();
        if (mounted.current) setStatus("idle");
      }
    });
    return () => { mounted.current = false; subscription.remove(); void writer.cancel(); };
  }, [writer]);

  return {
    status,
    change(device: Light, brightness: number, warm: boolean) {
      revision.current += 1;
      setStatus("saving");
      writer.enqueue({ device, brightness, warm, revision: revision.current, api: latest.current.api, demo: latest.current.demo });
    },
    flush: writer.flush,
    async cancel() {
      revision.current += 1;
      setStatus("idle");
      await writer.cancel();
    },
  };
}
