// Keep the mobile light panel's absolute settings separate from AI commands.
function lightPayload(body) {
  const { entity_id, brightness_pct, color_temp_kelvin, hs_color } = body || {};
  if (typeof entity_id !== 'string' || !/^light\.[a-zA-Z0-9_]+$/.test(entity_id)) return null;
  if (typeof brightness_pct !== 'number' || !Number.isFinite(brightness_pct) || brightness_pct < 1 || brightness_pct > 100) return null;
  const data = { entity_id, brightness_pct: Math.round(brightness_pct) };
  if (color_temp_kelvin !== undefined) {
    if (typeof color_temp_kelvin !== 'number' || !Number.isFinite(color_temp_kelvin) || color_temp_kelvin < 1000 || color_temp_kelvin > 10000) return null;
    data.color_temp_kelvin = Math.round(color_temp_kelvin);
  }
  if (hs_color !== undefined) {
    if (color_temp_kelvin !== undefined || !Array.isArray(hs_color) || hs_color.length !== 2 || hs_color.some(n => typeof n !== 'number' || !Number.isFinite(n)) || hs_color[0] < 0 || hs_color[0] > 360 || hs_color[1] < 0 || hs_color[1] > 100) return null;
    data.hs_color = hs_color;
  }
  return data;
}

module.exports = { lightPayload };
