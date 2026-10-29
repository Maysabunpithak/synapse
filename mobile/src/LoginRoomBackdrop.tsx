import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import RobotDance from './RobotDance';
import { useMotionEnabled } from './Motion';
import DollhouseRoom from './DollhouseRoom';
import FurnitureLayer from './FurnitureLayer';
import type { Decoration } from './roomScene';
import { useHouseReaction } from './houseInteraction';

const welcomeFurniture: Decoration[] = [
  { id: 'welcome-window', kind: 'window_arch', x: 0.68, y: 0.35, color: '#FFF5DF', scale: 1.1 },
  { id: 'welcome-plant', kind: 'plant_flower', x: 0.81, y: 0.68, color: '#F5A7BB', scale: 0.9 },
  { id: 'welcome-rug', kind: 'rug_round', x: 0.52, y: 0.82, color: '#FFE1AC', scale: 1.2 },
];

export default function LoginRoomBackdrop() {
  const { reaction, react } = useHouseReaction();
  const enabled = useMotionEnabled();
  const [roomSize, setRoomSize] = useState({ width: 0, height: 0 });
  const roll = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    roll.setValue(0);
    if (!enabled) return;
    const turn = (toValue: number, duration: number) => Animated.timing(roll, {
      toValue, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false,
    });
    const loop = Animated.loop(Animated.sequence([
      turn(-1, 1800), turn(-1, 1000),
      turn(1, 3000), turn(1, 1200),
      turn(0, 1800), turn(0, 1000),
    ]));
    loop.start();
    return () => loop.stop();
  }, [enabled, roll]);
  return <View pointerEvents="box-none" style={styles.stage}>
    <View pointerEvents="none" style={styles.room} onLayout={({ nativeEvent }) => setRoomSize({ width: nativeEvent.layout.width, height: nativeEvent.layout.height })}>
      <DollhouseRoom wall="#FFF5DF" floor="#CFA17F"/>
      <FurnitureLayer items={welcomeFurniture} width={roomSize.width} height={roomSize.height}/>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="ทักทายบ้านที่กำลังหลับ" onPress={() => react('sleepy')} style={styles.mascot}>
      <View style={styles.scale}>
      <Animated.View style={{ width: 268, height: 268, transform: [
        { translateX: roll.interpolate({ inputRange: [-1, 1], outputRange: [-7, 7] }) },
        { translateY: 62 },
        { rotate: roll.interpolate({ inputRange: [-1, 1], outputRange: ['-13deg', '13deg'] }) },
        { translateY: -62 },
      ] }}>
        <RobotDance mood="idle" active={false} touching={false} forcedActivity={reaction ? 'waking' : 'sleep'}/>
      </Animated.View>
      </View>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  stage: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 },
  room: { position: 'absolute', top: 0, bottom: 0, width: '100%', maxWidth: 440, alignSelf: 'center' },
  mascot: { width: 224, height: 224 },
  scale: { position: 'absolute', left: -22, top: -22, width: 268, height: 268, transform: [{ scale: 224 / 268 }] },
});
