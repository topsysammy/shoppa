// W1: builds PWA icons from the Figma logo (node 149:91) using the tile spec on
// Figma screen 69 (#F4F8FB tile, mark at 60% of tile height, 445:570 ratio).
// Renders PNGs with headless Chrome (no extra npm dependency).
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const mark = readFileSync('src/assets/logo-mark.svg', 'utf8')
  .replace(/<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '');
const TILE = '#F4F8FB';

function iconSvg(size, { markRatio, radius }) {
  const h = size * markRatio;
  const w = (h * 445) / 570;
  const s = h / 570;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" rx="${radius}" fill="${TILE}"/>
<g transform="translate(${(size - w) / 2} ${(size - h) / 2}) scale(${s})">${mark}</g></svg>`;
}

const tmp = resolve('node_modules/.cache/pwa-icons');
mkdirSync(tmp, { recursive: true });
const targets = [
  // "any" icons: rounded tile like Figma screen 69 (radius 64/280)
  ['icon-192.png', 192, { markRatio: 0.6, radius: 0 }],
  ['icon-512.png', 512, { markRatio: 0.6, radius: 0 }],
  // maskable: full-bleed, mark kept inside the 80% safe circle
  ['maskable-192.png', 192, { markRatio: 0.5, radius: 0 }],
  ['maskable-512.png', 512, { markRatio: 0.5, radius: 0 }],
  ['apple-touch-icon-180.png', 180, { markRatio: 0.6, radius: 0 }],
];
for (const [file, size, opts] of targets) {
  const svgPath = `${tmp}/${file}.html`;
  writeFileSync(svgPath, `<!doctype html><html><body style="margin:0">${iconSvg(size, opts)}</body></html>`);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${size},${size}`, `--screenshot=${resolve('public/icons', file)}`, `file://${svgPath}`,
  ], { stdio: 'ignore' });
  console.log('wrote public/icons/' + file);
}
// Favicon keeps the rounded tile from screen 69.
writeFileSync('public/favicon.svg', iconSvg(64, { markRatio: 0.6, radius: 14 }));
rmSync(tmp, { recursive: true, force: true });
