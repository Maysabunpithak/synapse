import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { RobotMood } from "./robotMood";
import RobotDance from "./RobotDance";
import CompanionGarden from "./CompanionGarden";
import type { HouseActivity } from "./houseBehavior";

export default function RobotStage({ mood, active, disabled, onTap, audioLevel }: {
  mood: RobotMood; active: boolean; disabled: boolean; audioLevel: number;
  onTap: () => void;
}) {
  const [touching, setTouching] = useState(false);
  const [activity, setActivity] = useState<HouseActivity>("awake");
  return <View style={s.stage}>
    <CompanionGarden sleeping={activity === "sleep"} mood={mood} level={audioLevel}/>
    <Pressable disabled={disabled} onPress={onTap} onPressIn={() => setTouching(true)} onPressOut={() => setTouching(false)} accessibilityRole="button" accessibilityLabel={active ? "ยกเลิกคำสั่งเสียง" : "แตะบ้าน Synapse เพื่อพูดคำสั่ง"} accessibilityState={{ disabled, busy: active }} style={s.touchSurface}>
      <View pointerEvents="none">
      <RobotDance mood={mood} active={active} touching={touching} onActivityChange={setActivity}/>
    </View></Pressable>
  </View>;
}
const s = StyleSheet.create({
  touchSurface: { width: 268, height: 268, alignItems: "center", justifyContent: "center" },
  stage: { height: 324, marginHorizontal: -20, marginTop: 12, alignItems: "center", justifyContent: "center" },
});
