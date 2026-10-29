// Downloads only the official icons used by Synapse; runtime works offline.
const fs = require('node:fs/promises');
const path = require('node:path');
const names = [
  'arrow_back', 'arrow_forward', 'expand_more', 'chevron_right', 'add', 'close',
  'check', 'home', 'grid_view', 'monitoring', 'schedule', 'settings', 'person',
  'notifications', 'mail', 'lock', 'info', 'language', 'wifi', 'bedtime',
  'desktop_windows', 'menu_book', 'door_front', 'door_open', 'auto_awesome',
  'mic', 'lightbulb', 'outlet', 'mode_fan', 'power_settings_new',
];
const root = path.resolve(__dirname, '..');
const upstream = 'https://raw.githubusercontent.com/google/material-design-icons/master';
async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response.text();
}
async function main() {
  const results = await Promise.allSettled(names.map(async name => {
    const variants = await Promise.all(['', '_fill1'].map(async suffix => {
      const svg = await fetchText(`${upstream}/symbols/web/${name}/materialsymbolsrounded/${name}${suffix}_24px.svg`);
      const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1] || (/height="24"/.test(svg) && /width="24"/.test(svg) ? '0 0 24 24' : null);
      const paths = [...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(match => match[1]);
      if (!viewBox || !paths.length || /<(circle|rect|polygon|g)\b/.test(svg)) throw new Error(`Unsupported SVG: ${name}${suffix}`);
      return { viewBox, paths };
    }));
    return [name, { outline: variants[0], filled: variants[1] }];
  }));
  const failures = results.filter(result => result.status === 'rejected');
  if (failures.length) throw new AggregateError(failures.map(result => result.reason), 'Icon download failed');
  const license = await fetchText(`${upstream}/LICENSE`);
  const data = Object.fromEntries(results.map(result => result.value));
  await fs.mkdir(path.join(root, 'src/icons'), { recursive: true });
  await fs.writeFile(path.join(root, 'src/icons/material-rounded.json'), JSON.stringify(data, null, 2) + '\n');
  await fs.writeFile(path.join(root, 'src/icons/LICENSE.material-symbols'), license);
  console.log(`Saved ${names.length} official Rounded symbols, with outline and filled variants.`);
}
main().catch(error => { console.error(error.errors || error); process.exitCode = 1; });
