import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { HouseWalkFrame } from './HouseWalk';
import SynapsePose from './SynapsePose';
import RoomActivityProps from './RoomActivityProps';
import { plantWaterPoint } from './roomWatering';
import { useMotionEnabled } from './Motion';
import { furnitureCatalog, type Decoration } from './roomScene';
import { bedRestPose, furnitureFootprint, furnitureLayer, groundLayer, planCaretaker, sampleCaretakerLife, type Destination } from './caretakerPath';

import type { RoomDeviceState } from './roomDeviceState';
export type { RoomDeviceState } from './roomDeviceState';
import { useHouseReaction, type DeviceFeedback } from './houseInteraction';
import HouseReactionHand from './HouseReactionHand';
import { routeToRoomActivity } from './roomActivityRequest';
import type { CaretakerLeg } from './caretakerPath';

/** Decorative patrol: device state comes from the room, never sends commands. */
export default function RoomCaretaker({ devices, items, width, height, activities = false, interactive = false, feedback, request }: { devices: readonly RoomDeviceState[]; items: Decoration[]; width: number; height: number; activities?: boolean; interactive?: boolean; feedback?: DeviceFeedback | null; request?: { id: string; nonce: number } | null }) {
  const { reaction, react } = useHouseReaction();
  const paused = useRef(false);
  paused.current = reaction !== null;
  const feedbackInRoom = !!feedback && devices.some(d => d.entity_id === feedback.entityId);
  useEffect(() => { if (feedback && feedbackInRoom && Date.now() - feedback.createdAt < 4000) react(feedback.outcome); }, [feedback, feedbackInRoom, react]);
  const motion = useMotionEnabled();
  const [elapsed, setElapsed] = useState(0);
  const size = Math.min(84, width * 0.2, height * 0.32);
  const basePlan = useMemo(() => {
    const obstacles = items.flatMap(item => {
      if (item.support) return [];
      const itemSize = width * furnitureCatalog.find(f => f.kind === item.kind)!.size * (item.scale ?? 1);
      const footprint = furnitureFootprint(item.kind, item.x * width, item.y * height, itemSize);
      return footprint ? [footprint] : [];
    });
    const destinations: Destination[] = activities ? [] : [{ x: 0.5, y: 0.85, activity: 'awake', dwell: 2800 }];
    const seats = activities ? items.filter(item => item.kind.startsWith('bed') || item.kind.startsWith('sofa')) : [items.find(item => item.kind.startsWith('bed')) || items.find(item => item.kind.startsWith('sofa'))].filter((item): item is Decoration => !!item);



    for (const window of items.filter(item => item.kind.startsWith('window'))) destinations.push({ x: window.x, y: 0.59, activity: 'attentive', dwell: activities ? 5200 : 4200, task: activities ? 'look' : undefined, targetId: window.id });
    for (const plant of items.filter(item => item.kind.startsWith('plant'))) destinations.push({ x: plant.x - 0.12, y: Math.min(0.84, plant.y + 0.1), activity: 'awake', dwell: activities ? 6200 : 3600, task: activities ? 'water' : undefined, targetId: plant.id, reachPoint: activities ? plantWaterPoint(plant, width, height) : undefined });
    for (const table of items.filter(item => item.kind.startsWith('table') || item.kind.startsWith('shelf'))) destinations.push({ x: table.x - 0.15, y: Math.min(0.86, table.y + 0.1), activity: activities ? 'rest' : 'attentive', dwell: activities ? 6500 : 3400, task: activities ? 'read' : undefined, targetId: table.id });
    for (const seat of seats) destinations.push({ x: seat.x - 0.16, y: Math.min(0.84, seat.y + 0.14), activity: 'rest', dwell: seat.kind.startsWith('bed') ? (activities ? 30000 : 10400) : activities ? 9000 : 7600, bedId: seat.kind.startsWith('bed') ? seat.id : undefined, task: activities ? seat.kind.startsWith('bed') ? 'sleep' : 'sit' : undefined, targetId: seat.id });
    if (!activities && destinations.length < 3) destinations.push({ x: 0.3, y: 0.72, activity: 'awake', dwell: 3500 }, { x: 0.68, y: 0.74, activity: 'rest', dwell: 5500 });
    if (activities && !destinations.length) return [];
    if (activities) {
      const order = { water: 0, sleep: 1, sit: 2, read: 3, look: 4 };
      destinations.sort((a, b) => order[a.task!] - order[b.task!]);
    }
    const route = planCaretaker(width, height, size, obstacles, destinations);
    if (!activities) return route;
    const tasks = route.filter(leg => !!leg.task);
    const firstWater = tasks.findIndex(leg => leg.task === 'water');
    return firstWater > 0 ? [...tasks.slice(firstWater), ...tasks.slice(0, firstWater)] : tasks;
  }, [items, width, height, size, activities]);
  const [requestedPlan, setRequestedPlan] = useState<CaretakerLeg[] | null>(null);
  const pendingRequest = useRef<string | null>(null);
  const resumeRoutine = useRef(false);
  const plan = requestedPlan ?? basePlan;
  useEffect(() => { setRequestedPlan(null); pendingRequest.current = null; }, [basePlan]);
  useEffect(() => { if (request) pendingRequest.current = request.id; }, [request]);
  useEffect(() => {
    setElapsed(0);
    if (!motion || !plan.length) return;
    let frame = 0;
    let previous: number | undefined;
    let clock = 0;
    let rendered = -Infinity;
    const tick = (now: number) => {
      // A delayed/background frame must not jump the character through a turn.
      if (!paused.current) clock += Math.min(32, Math.max(0, now - (previous ?? now)));
      previous = now;
      const current = sampleCaretakerLife(plan, clock, Math.max(18, size * 0.34));
      if (pendingRequest.current && current && !current.moving && current.restElapsed >= current.restDuration - 40) {
        const redirected = routeToRoomActivity(basePlan, basePlan.findIndex(leg => leg.targetId === current.targetId), pendingRequest.current);
        pendingRequest.current = null;
        if (redirected) { resumeRoutine.current = true; setElapsed(0); setRequestedPlan(redirected); return; }
      }
      if (resumeRoutine.current && current && current.leg === 0 && !current.moving && current.restElapsed >= current.restDuration - 40) {
        const completed = basePlan.findIndex(leg => leg.targetId === current.targetId);
        resumeRoutine.current = false;
        setElapsed(0);
        setRequestedPlan([...basePlan.slice(completed + 1), ...basePlan.slice(0, completed + 1)]);
        return;
      }
      if (now - rendered >= 16) { setElapsed(clock); rendered = now; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [motion, plan, basePlan, size]);
  const onCount = devices.filter(device => device.state === 'on').length;
  const previousOn = useRef(onCount);
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    const changed = onCount > previousOn.current;
    previousOn.current = onCount;
    if (activities) { setCelebrating(false); return; }
    if (!changed) return;
    setCelebrating(true);
    const timer = setTimeout(() => setCelebrating(false), 2600);
    return () => { clearTimeout(timer); setCelebrating(false); };
  }, [onCount, activities]);
  const uncertain = !activities && devices.some(device => device.state !== 'on' && device.state !== 'off');
  const life = sampleCaretakerLife(plan, elapsed, Math.max(18, size * 0.34));
  if (!life) return null;
  const bed = !life.moving && motion ? items.find(item => (item.id === life.bedId && item.kind.startsWith('bed')) || (activities && life.task === 'sit' && item.id === life.targetId && item.kind.startsWith('sofa'))) : undefined;
  const bedSize = bed ? width * furnitureCatalog.find(f => f.kind === bed.kind)!.size * (bed.scale ?? 1) : 0;
  const mattress = bed ? { x: bed.x * width + ((bed.rotation ?? 0) % 2 ? -0.12 : 0.12) * bedSize - size / 2, y: bed.y * height + (0.62 - 0.86) * bedSize - size * 0.86 } : life.position;
  const canReachBed = bed && Math.hypot(mattress.x - life.position.x, mattress.y - life.position.y) <= bedSize * 1.1;
  const bedRest = canReachBed ? bedRestPose(life.position, mattress, life.restElapsed, life.restDuration, bed.kind.startsWith('bed')) : null;
  const position = bedRest?.position ?? life.position;
  const floorLayer = groundLayer(life.position.y + size * 0.94);
  const bedLayer = bed ? furnitureLayer(bed.kind, bed.y * height, bedSize) + 1 : floorLayer;
  const walking = reaction ? 0 : motion ? bedRest?.walkWeight ?? life.walkWeight : 0;
  // Tie footfalls to ground distance so acceleration does not cause skating.
  const gaitTime = bedRest?.stepTime ?? (life.distance + (bedRest?.stepDistance ?? 0)) / (size * 0.34) * 1000;
  const walkingHeading = bedRest?.descending ? Math.sign(life.position.x - mattress.x) : life.headingX;
  const activity = activities ? life.activity : uncertain ? 'attentive' : celebrating ? 'dance' : life.activity;
  const target = items.find(item => item.id === life.targetId);
  const waterPoint = life.task === 'water' && target?.kind.startsWith('plant') ? plantWaterPoint(target, width, height) : undefined;
  const waterTarget = waterPoint ? { x: (waterPoint.x - position.x) / size * 100, y: (waterPoint.y - position.y) / size * 100 } : undefined;
  const withinWateringReach = !waterPoint || Math.hypot(waterPoint.x - (position.x + size * 0.5), waterPoint.y - (position.y + size * 0.58)) <= size * 0.95;
  const doingTask = activities && motion && !life.moving && life.settled && withinWateringReach && !!target;
  const fadeIn = Math.max(0, Math.min(1, (life.restElapsed - (bedRest ? 2500 : 400)) / 600));
  const fadeOut = Math.max(0, Math.min(1, (life.restDuration - life.restElapsed - (bedRest ? 2500 : 700)) / 600));
  const taskOpacity = doingTask && !reaction ? fadeIn * fadeOut : 0;
  const looking = life.task === 'look' ? Math.sin(life.restElapsed / 1200) * 3 * taskOpacity : 0;
  const restingActivity = bedRest && bed?.kind.startsWith('sofa') && bedRest.activity === 'sleep' ? 'rest' : bedRest?.activity;
  const approachingSeat = activities && (life.task === 'sleep' || life.task === 'sit');
  const poseActivity = restingActivity ?? (approachingSeat ? 'rest' : life.moving || life.preparing || !life.settled ? 'awake' : activity);
  // Sort by planted feet: furniture occludes only when it is in front of us.
  const squash = bedRest?.squash ?? 0;
  const character = <View style={{ width: size, height: size, transform: [
    { translateY: size * 0.9 }, { scaleX: 1 + squash * 0.5 }, { scaleY: 1 - squash }, { translateY: -size * 0.9 },
  ] }}>
    <View style={{ position: 'absolute', bottom: size * 0.04, left: size * 0.2, width: size * 0.6, height: size * 0.1, borderRadius: size, backgroundColor: '#61442B28' }}/>
    <View style={{ position: 'absolute', opacity: walking, width: size, height: size, transform: [{ rotate: `${walkingHeading * walking * 2}deg` }] }}>
      <View style={{ width: 208, height: 208, transform: [{ translateX: (size - 208) / 2 }, { translateY: (size - 208) / 2 }, { scale: size / 208 }] }}><HouseWalkFrame elapsed={gaitTime} facingLeft={approachingSeat && walkingHeading < -0.05}/></View>
    </View>
    <View style={{ opacity: 1 - walking, transform: [{ translateY: motion ? Math.sin(elapsed / 550) * 0.6 * (1 - walking) : 0 }, { rotate: `${looking}deg` }] }}>
      {reaction ? <SynapsePose activity={reaction === 'sleepy' ? 'waking' : reaction === 'error' ? 'attentive' : 'dance'} mood={reaction === 'error' ? 'error' : 'idle'} width={size} height={size} transitionMs={300}/> : activities && poseActivity === 'awake' ? <View style={{ width: size, height: size }}>
        <View style={{ width: 208, height: 208, transform: [{ translateX: (size - 208) / 2 }, { translateY: (size - 208) / 2 }, { scale: size / 208 }] }}><HouseWalkFrame elapsed={0}/></View>
      </View> : <SynapsePose activity={poseActivity} width={size} height={size} transitionMs={600}/>}
    </View>
    {(reaction === 'happy' || reaction === 'success') && <HouseReactionHand size={size} success={reaction === 'success'}/>}
    {life.task && taskOpacity > 0 && <RoomActivityProps task={life.task} size={size} elapsed={life.restElapsed} opacity={taskOpacity} waterTarget={waterTarget} left={!!target && target.x * width < position.x + size / 2}/>}
  </View>;
  // Fade between depth layers during the climb instead of popping through the bed.
  return <>{[{ layer: floorLayer, opacity: bedRest ? 1 - bedRest.layerBlend : 1 }, ...(bedRest ? [{ layer: bedLayer, opacity: bedRest.layerBlend }] : [])].map((entry, index) => <View key={index} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: position.x, top: position.y, width: size, height: size, zIndex: entry.layer, opacity: entry.opacity }}>{character}</View>)}
    {interactive && <Pressable accessibilityRole="button" accessibilityLabel={poseActivity === 'sleep' ? 'ทักทายบ้านที่กำลังหลับ' : 'ทักทายบ้าน Synapse'} onPress={event => { event.stopPropagation(); react(poseActivity === 'sleep' || reaction === 'sleepy' ? 'sleepy' : 'happy'); }} style={{ position: 'absolute', left: position.x, top: position.y, width: Math.max(44, size), height: Math.max(44, size), zIndex: bedRest && bedRest.layerBlend >= 0.5 ? bedLayer : floorLayer }}/>}</>;
}
