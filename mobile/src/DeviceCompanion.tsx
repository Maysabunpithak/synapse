import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import { useMotionEnabled } from "./Motion";
import SynapsePose from "./SynapsePose";
import { useHouseReaction, type DeviceFeedback } from './houseInteraction';
import HouseReactionHand from './HouseReactionHand';

/** The house reacts to confirmed device state, including unavailable devices. */
export default function DeviceCompanion({ state, fan = false, size = 76, restWhenOff = true, interactive = false, feedback }: {
  state: string; fan?: boolean; size?: number; restWhenOff?: boolean; interactive?: boolean; feedback?: DeviceFeedback | null;
}) {
  const { reaction, react } = useHouseReaction();
  useEffect(() => { if (feedback && Date.now() - feedback.createdAt < 4000) react(feedback.outcome); }, [feedback, react]);
  const motion = useMotionEnabled();
  const phase = useRef(new Animated.Value(0)).current;
  const on = state === "on";
  const off = state === "off";
  const idle = !on && !restWhenOff;
  const duration = on ? (fan ? 1100 : 850) : idle ? 1600 : 2300;

  useEffect(() => {
    phase.setValue(0);
    if (!motion || (!on && !off && !idle)) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(phase, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(phase, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [motion, on, off, idle, duration, phase]);

  const character = <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
    <Animated.View style={{ transform: [
      { translateY: phase.interpolate({ inputRange: [0, 1], outputRange: [0, on ? -3 : idle ? -2.5 : -0.5] }) },
      { translateX: phase.interpolate({ inputRange: [0, 1], outputRange: [0, idle ? 1.5 : 0] }) },
      { rotate: phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: ["0deg", on ? (fan ? "-4deg" : "-2deg") : idle ? "-3deg" : "0deg", on ? (fan ? "4deg" : "2deg") : idle ? "3deg" : "0deg"] }) },
      { scale: phase.interpolate({ inputRange: [0, 1], outputRange: [1, on || idle ? 1.025 : 1.012] }) },
    ] }}>
      <SynapsePose activity={reaction === 'sleepy' ? 'waking' : reaction === 'happy' || reaction === 'success' ? 'dance' : reaction === 'error' ? 'attentive' : on ? (fan ? "awake" : "dance") : off ? (restWhenOff ? "rest" : "awake") : "attentive"} mood={reaction === 'error' ? 'error' : 'idle'} width={size} height={size} />
      {(reaction === 'happy' || reaction === 'success') && <HouseReactionHand size={size} success={reaction === 'success'}/>}
    </Animated.View>
  </View>;
  return interactive ? <Pressable accessibilityRole="button" accessibilityLabel="ทักทายบ้าน Synapse" onPress={() => react(off && restWhenOff ? 'sleepy' : 'happy')} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>{character}</Pressable> : character;
}
