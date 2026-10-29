import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { makeRoomScene, upgradeRoomScene, validRoomScene, type RoomScene } from './roomScene';
const key = 'synapse-room-scenes-v1';
let scenes: Record<string, RoomScene> = {};
let loaded = false;
let storageError = '';
const listeners = new Set<() => void>();
const defaults = new Map<string, RoomScene>();
function initial(room: string) { if (!defaults.has(room)) defaults.set(room, makeRoomScene(room)); return defaults.get(room)!; }
const emit = () => listeners.forEach(fn => fn());
function load() {
  if (loaded) return;
  try {
    const file = Platform.OS === 'web' ? null : new File(Paths.document, key + '.json');
    const raw = Platform.OS === 'web' ? localStorage.getItem(key) : file?.exists ? file.textSync() : null;
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !Object.values(parsed).every(validRoomScene)) throw new Error();
    scenes = Object.fromEntries(Object.entries(parsed as Record<string, RoomScene>).map(([room, scene]) => [room, upgradeRoomScene(room, scene)]));
  } catch { storageError = 'อ่านการจัดห้องที่บันทึกไว้ไม่ได้'; }
  loaded = true; emit();
}
function subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function saveRoomScene(room: string, scene: RoomScene) {
  load();
  if (storageError) throw new Error(storageError);
  if (!validRoomScene(scene)) throw new Error('ตำแหน่งของตกแต่งไม่ถูกต้อง');
  const next = { ...scenes, [room]: { ...scene, period: 'auto' as const } };
  try {
    const raw = JSON.stringify(next);
    if (Platform.OS === 'web') localStorage.setItem(key, raw);
    else new File(Paths.document, key + '.json').write(raw);
  } catch { throw new Error('บันทึกห้องไม่ได้ กรุณาลองอีกครั้ง'); }
  scenes = next; emit();
}
export function useRoomScene(room: string) {
  useEffect(load, []);
  return useSyncExternalStore(subscribe, () => scenes[room] || initial(room), () => initial(room));
}
