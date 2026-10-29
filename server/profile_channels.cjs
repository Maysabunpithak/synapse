const { createHash } = require('node:crypto');

// Synthetic metadata: keep source=sample and all original usage timestamps.
function profileChannel(row) {
  const value = createHash('sha256').update(`${row.timestamp}|${row.entity_id}|${row.ai_action}`).digest().readUInt32BE(0) / 0x100000000;
  const hour = Number(row.timestamp.slice(11, 13));
  const day = Number(row.timestamp.slice(8, 10));
  const fan = row.entity_id === 'switch.smart_plug_2_socket_1';
  // Auto currently turns devices on only. Early days represent manual learning.
  const automaticChance = row.ai_action === 'on' && hour >= 17 && day > 7 ? (fan ? 0.18 : 0.34) : 0;
  if (value < automaticChance) return 'automatic';
  const voiceChance = fan ? 0.43 : row.ai_action === 'off' && hour >= 22 ? 0.48 : 0.27;
  return value < automaticChance + voiceChance ? 'voice' : 'manual';
}
module.exports = { profileChannel };
