export type RoomDeviceState = { state: string; entity_id?: string; domain?: string; attributes?: Record<string, unknown> };
export function roomDeviceEffects(devices: readonly RoomDeviceState[]) {
  const domain = (d: RoomDeviceState) => d.domain ?? d.entity_id?.split('.')[0];
  const lights = devices.filter(d => domain(d) === 'light' && d.state === 'on');
  const brightness = lights.reduce((max, d) => {
    const value = typeof d.attributes?.brightness === 'number' && Number.isFinite(d.attributes.brightness) ? d.attributes.brightness / 255 : 1;
    return Math.max(max, Math.max(0, Math.min(1, value)));
  }, 0);
  const fans = devices.filter(d => domain(d) === 'fan');
  return { brightness, hasFan: fans.length > 0, fanOn: fans.some(d => d.state === 'on') };
}
