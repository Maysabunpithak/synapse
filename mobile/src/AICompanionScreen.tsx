import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import RobotStage from "./RobotStage";
import { resolveRobotMood, robotMoods } from "./robotMood";
import { palette as C } from "./theme";
import { celebrationRemaining } from "./houseBehavior";

type Props = {
  active: boolean; listening: boolean; busy: boolean; demo: boolean;
  speaking: boolean; outcome: "success" | "error" | null;
  successAt: number;
  status: string;
  audioLevel: number;
  onTap: () => void;
};

export default function AICompanionScreen(p: Props) {
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    const remaining = celebrationRemaining(p.outcome, p.successAt, Date.now());
    setCelebrating(remaining > 0);
    if (!remaining) return;
    const timer = setTimeout(() => setCelebrating(false), remaining);
    return () => clearTimeout(timer);
  }, [p.outcome, p.successAt]);
  const mood = resolveRobotMood({ ...p, celebrating });
  return <View>
    <View style={s.hero}>
      <RobotStage mood={mood} active={p.active} audioLevel={p.audioLevel} disabled={(p.busy || p.speaking) && !p.active}
        onTap={p.onTap}/>
      <View style={s.heroCopy} accessibilityLiveRegion="polite">
        <Text style={s.heroTitle}>{robotMoods[mood].title}</Text>
        <Text style={s.status}>{p.active ? (p.listening ? "พูดจบแล้วส่งอัตโนมัติ · แตะเพื่อยกเลิก" : "กำลังเปิดไมโครโฟน · แตะเพื่อยกเลิก") : p.status}</Text>
      </View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  hero: { backgroundColor: C.white, borderRadius: 30, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 19, overflow: "hidden" },
  heroCopy: { alignItems: "center", gap: 8, marginTop: 5 }, eyebrow: { color: C.brown, fontSize: 11, lineHeight: 19 }, heroTitle: { color: C.brown, fontSize: 26, fontWeight: "600", lineHeight: 37, textAlign: "center" }, status: { color: C.muted, fontSize: 12, lineHeight: 20, textAlign: "center" },
});
