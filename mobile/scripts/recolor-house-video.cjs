// Recolor the supplied video without generating or changing the character's poses.
// Usage: node mobile/scripts/recolor-house-video.cjs <input.mp4> <ffmpeg.exe>
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const [input, ffmpeg] = process.argv.slice(2);
if (!input || !ffmpeg) throw new Error('Pass the source MP4 and FFmpeg executable.');
const root = path.resolve(__dirname, '../..');
const temp = path.join(root, 'tmp/house-recolor');
const assets = path.join(root, 'mobile/assets');
fs.mkdirSync(temp, { recursive: true });
const width = 1280, height = 720, fps = 25;
function run(args, options = {}) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', ...args], {
    maxBuffer: 256 * 1024 * 1024, ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(String(result.stderr));
  return result.stdout;
}
// Decode to disk and process one frame at a time rather than retaining the entire
// high-resolution clip in memory.
const decoded = path.join(temp, 'decoded-hq.rgb');
const raw = path.join(temp, 'recolored-hq.rgb');
run(['-i', input, '-an', '-vf', `scale=${width}:${height}:flags=lanczos`,
  '-pix_fmt', 'rgb24', '-f', 'rawvideo', '-y', decoded]);
const frameBytes = width * height * 3;
const frameCount = fs.statSync(decoded).size / frameBytes;
if (!Number.isInteger(frameCount) || frameCount < 2) throw new Error('Invalid decoded frames.');
const frames = Buffer.allocUnsafe(frameBytes);
const source = fs.openSync(decoded, 'r');
const destination = fs.openSync(raw, 'w');
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const blend = (a, b, t) => a + (b - a) * t;
const background = [63, 35, 5];
let keyed = 0;
let minX = width, minY = height, maxX = 0, maxY = 0;
try {
for (let frame = 0; frame < frameCount; frame++) {
  if (fs.readSync(source, frames, 0, frameBytes, null) !== frameBytes) throw new Error('Incomplete frame.');
for (let p = 0; p < frames.length; p += 3) {
  const rgb = [frames[p], frames[p + 1], frames[p + 2]];
  const [r, g, b] = rgb;
  const max = Math.max(...rgb), min = Math.min(...rgb), delta = max - min;
  const saturation = max ? delta / max : 0;
  let hue = delta === 0 ? 0 : max === r ? 60 * (((g - b) / delta + 6) % 6)
    : max === g ? 60 * ((b - r) / delta + 2) : 60 * ((r - g) / delta + 4);
  let color = rgb;
  const isBackground = hue > 165 && hue < 235 && saturation > 0.35;
  if (!isBackground) {
    const pixel = (p / 3) % (width * height);
    const x = pixel % width, y = Math.floor(pixel / width);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  // The source's cyan studio background is replaced with the assistant card color.
  if (isBackground) {
    color = background;
    keyed++;
  } else if (hue > 48 && hue <= 165 && saturation > 0.22) {
    const roofWeight = clamp((hue - 100) / 18);
    const roofShade = clamp(Math.pow(g / 150, 0.65), 0.28, 1.12);
    const bodyShade = clamp(Math.pow(g / 240, 0.60), 0.20, 1.04);
    // Feet and lower legs receive the warm sand accent, while the walls stay ivory.
    const y = Math.floor((p / 3) % (width * height) / width) / height;
    const sandWeight = clamp((y - 0.72) / 0.10);
    const cream = [255, 243, 226], sand = [186, 154, 129], orange = [255, 171, 85];
    color = cream.map((c, i) => blend(blend(c, sand[i], sandWeight) * bodyShade, orange[i] * roofShade, roofWeight));
  } else if (max < 155 && saturation < 0.45) {
    // Preserve lens reflections and black line detail, with a restrained brown tint.
    color = [r * 1.08 + 9, g * 0.91 + 4, b * 0.70 + 2];
  }
  for (let c = 0; c < 3; c++) frames[p + c] = Math.round(clamp(color[c], 0, 255));
}
  fs.writeSync(destination, frames);
}
} finally {
  fs.closeSync(source);
  fs.closeSync(destination);
}
const rawInput = ['-f', 'rawvideo', '-pixel_format', 'rgb24', '-video_size', `${width}x${height}`, '-framerate', String(fps), '-i', raw];
const cropWidth = maxX - minX + 1, cropHeight = maxY - minY + 1;
const side = Math.max(cropWidth, cropHeight) + 48;
const pad = `crop=${cropWidth}:${cropHeight}:${minX}:${minY},pad=${side}:${side}:(ow-iw)/2:(oh-ih)/2:color=0x3F2305`;
const appFilter = `${pad},scale=600:600:flags=lanczos`;
run([...rawInput, '-vf', appFilter, '-frames:v', '1', '-y', path.join(assets, 'synapse-house-poster-hq.png')]);
run([...rawInput, '-filter_complex', `${appFilter},split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a`,
  '-loop', '0', '-y', path.join(assets, 'synapse-house-dance-hq.gif')]);
run([...rawInput, '-vf', `${pad},scale=720:720:flags=lanczos`, '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  '-y', path.join(assets, 'synapse-house-dance-hq.mp4')]);
fs.writeFileSync(path.join(temp, 'report-hq.json'), JSON.stringify({ frameCount, fps, duration: frameCount / fps, decodeSize: [width, height], appSize: 600, videoSize: 720, keyedPixels: keyed, bounds: { minX, minY, maxX, maxY } }, null, 2));
// Only remove these two explicitly-created intermediate files after successful encoding.
fs.unlinkSync(decoded);
fs.unlinkSync(raw);
console.log(JSON.stringify({ frameCount, fps, duration: frameCount / fps, gifBytes: fs.statSync(path.join(assets, 'synapse-house-dance-hq.gif')).size }));
