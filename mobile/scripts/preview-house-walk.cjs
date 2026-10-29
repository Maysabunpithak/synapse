// Render the actual HouseWalkFrame SVG for visual review without a mobile device.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const React = require('../../node_modules/react');
const { renderToStaticMarkup } = require('../../node_modules/react-dom/server');
const sharp = require('../../node_modules/sharp');
const ts = require('../node_modules/typescript');
const root = path.resolve(__dirname, '../..');
const destination = path.join(root, 'tmp/house-walk-review');
fs.mkdirSync(destination, { recursive: true });
const body = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'mobile/assets/synapse-house-happy-walk-body-v1.png')).toString('base64');
const sleep = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'mobile/assets/synapse-reference-sleep-v2.png')).toString('base64');
const modules = {
  react: React, 'react/jsx-runtime': require('../../node_modules/react/jsx-runtime'),
  'react-native-svg': { __esModule: true, default: ({ accessibilityLabel, ...props }) => React.createElement('svg', { ...props, 'aria-label': accessibilityLabel }), Defs: 'defs', Ellipse: 'ellipse', G: 'g', Image: 'image', LinearGradient: 'linearGradient', Path: 'path', Stop: 'stop' },
  './houseGait': require('../src/houseGait.ts'), './Motion': { useMotionEnabled: () => false },
  'react-native': {
    View: ({ children }) => React.createElement('g', null, children),
    StyleSheet: { absoluteFill: {} },
    Animated: {
      Value: class { constructor(value) { this.value = value; } interpolate({ outputRange }) { return outputRange[this.value ? 1 : 0]; } },
      View: ({ children, style }) => {
        const opacity = style[1].opacity;
        return React.createElement('g', { opacity: typeof opacity === 'number' ? opacity : opacity.value }, children);
      },
    },
  },
  '../assets/synapse-house-happy-walk-body-v1.png': body,
  '../assets/synapse-house-low-glasses-body-v1.png': 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'mobile/assets/synapse-house-low-glasses-body-v1.png')).toString('base64'),
  '../assets/synapse-reference-sleep-v2.png': sleep,
};
const context = { exports: {}, require: name => { if (!(name in modules)) throw new Error(name); return modules[name]; } };
const code = ts.transpileModule(fs.readFileSync(path.join(root, 'mobile/src/HouseWalk.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
vm.runInNewContext(code, context);
(async () => {
  for (let i = 0; i < 144; i++) {
    const elapsed = i * 1000 / 30;
    const leftward = i >= 72;
    const offset = leftward ? 26 - (i - 72) / 71 * 52 : -26 + i / 71 * 52;
    const frame = renderToStaticMarkup(React.createElement(context.exports.HouseWalkFrame, { elapsed, facingLeft: leftward }));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="536" height="536" viewBox="0 0 268 268"><rect width="268" height="268" fill="#3F2305"/><g transform="translate(${30 + offset} 30)">${frame}</g></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(path.join(destination, `frame-${String(i).padStart(3, '0')}.png`));
  }
  const ffmpeg = path.join(root, 'tmp/video-reference/tools/node_modules/ffmpeg-static/ffmpeg.exe');
  const encoded = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-framerate', '30', '-i', path.join(destination, 'frame-%03d.png'),
    '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-y', path.join(destination, 'walking-left-right.mp4')], { encoding: 'utf8' });
  if (encoded.status !== 0) throw new Error(encoded.stderr);
  console.log(path.join(destination, 'walking-left-right.mp4'));
})().catch(error => { console.error(error); process.exitCode = 1; });
