import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { defaultCamera, orbitCamera, projectRoom, roomGeometry } from './roomGeometry';
import type { RoomScene } from './roomScene';
import { palette as C } from './theme';
import { useFrameQueue } from './useFrameQueue';

export default function RoomOrbitView({ scene }: { scene: RoomScene }) {
  const [camera,setCamera]=useState(defaultCamera);
  const [moving,setMoving]=useState(false);
  const updates=useFrameQueue(setCamera);
  const latest=useRef(camera);latest.current=camera;
  const start=useRef(camera);
  const [bounds,setBounds]=useState({width:360,height:400});
  const geometry=useMemo(()=>roomGeometry(scene,moving),[scene,moving]);
  const faces=useMemo(()=>projectRoom(geometry,camera,bounds.width,bounds.height),[geometry,camera,bounds]);
  const gestures=useMemo(()=>PanResponder.create({
    onStartShouldSetPanResponder:()=>true,
    onMoveShouldSetPanResponder:()=>true,
    onPanResponderGrant:()=>{start.current=latest.current;setMoving(true);},
    onPanResponderMove:(_,g)=>updates.push(orbitCamera(start.current,g.dx,g.dy)),
    onPanResponderRelease:()=>{updates.flush();setMoving(false);},
    onPanResponderTerminate:()=>{updates.flush();setMoving(false);},
    onPanResponderTerminationRequest:()=>false,
  }),[]);
  return <View style={s.frame}>
    <View {...gestures.panHandlers} accessibilityLabel="ห้องสามมิติ ลากเพื่อหมุนมุมมอง" onLayout={e=>setBounds(e.nativeEvent.layout)} style={[s.canvas,Platform.OS==='web'?{touchAction:'none'} as never:undefined]}>
      <Svg width={bounds.width} height={bounds.height} pointerEvents="none">{faces.map(f=><Polygon key={f.key} points={f.points} fill={f.color} stroke={f.color} strokeWidth={0.35}/>)}</Svg>
    </View>
    <Text style={s.hint}>ลากเพื่อหมุนรอบห้อง · ลากขึ้นลงเพื่อปรับมุม</Text>
    <View style={s.tools}>
      <Pressable accessibilityRole="button" accessibilityLabel="หมุนห้องซ้าย" style={s.button} onPress={()=>setCamera(v=>({...v,yaw:v.yaw-0.35}))}><Text style={s.label}>↶</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="ย่อห้อง" style={s.button} onPress={()=>setCamera(v=>({...v,zoom:Math.max(0.65,v.zoom-0.15)}))}><Text style={s.label}>−</Text></Pressable>
      <Pressable accessibilityRole="button" style={s.reset} onPress={()=>setCamera(defaultCamera)}><Text style={s.label}>มุมเริ่มต้น</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="ขยายห้อง" style={s.button} onPress={()=>setCamera(v=>({...v,zoom:Math.min(1.7,v.zoom+0.15)}))}><Text style={s.label}>+</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="หมุนห้องขวา" style={s.button} onPress={()=>setCamera(v=>({...v,yaw:v.yaw+0.35}))}><Text style={s.label}>↷</Text></Pressable>
    </View>
  </View>;
}
const s=StyleSheet.create({frame:{flex:1,minHeight:250},canvas:{flex:1,overflow:'hidden',alignItems:'center',justifyContent:'center'},hint:{fontSize:11,color:C.muted,textAlign:'center',padding:10},tools:{flexDirection:'row',gap:8,justifyContent:'center',padding:12,paddingBottom:24},button:{width:44,height:44,borderRadius:16,backgroundColor:C.sandSurface,alignItems:'center',justifyContent:'center'},reset:{minHeight:44,paddingHorizontal:14,borderRadius:16,backgroundColor:C.white,alignItems:'center',justifyContent:'center'},label:{color:C.brown,fontSize:13}});
