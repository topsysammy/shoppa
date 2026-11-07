// Re-encodes Figma PNG exports to WebP at 2x display size using headless
// Chrome's canvas encoder (no image library dependency). PRD section 8 data
// budget: first visit under 500KB.
// Usage: node scripts/encode-webp.mjs <in.png> <out.webp> <maxWidth> [quality]
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const [input, output, maxWidth = '964', quality = '0.75'] = process.argv.slice(2);
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const dir = mkdtempSync(join(tmpdir(), 'webp-'));
const page = join(dir, 'encode.html');
writeFileSync(
  page,
  `<!doctype html><body><img id="i" src="file://${resolve(input)}"><pre id="o"></pre><script>
  i.onload = () => { const s = Math.min(1, ${maxWidth} / i.naturalWidth); const c = document.createElement('canvas');
  c.width = Math.round(i.naturalWidth * s); c.height = Math.round(i.naturalHeight * s);
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(i, 0, 0, c.width, c.height);
  o.textContent = c.toDataURL('image/webp', ${quality}); };
  </script>`,
);
const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--virtual-time-budget=5000', '--dump-dom', `file://${page}`], {
  maxBuffer: 64 * 1024 * 1024,
}).toString();
const m = dom.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/);
rmSync(dir, { recursive: true, force: true });
if (!m) throw new Error('Encoding failed');
writeFileSync(output, Buffer.from(m[1], 'base64'));
console.log(`wrote ${output} (${Math.round(Buffer.from(m[1], 'base64').length / 1024)} KB)`);
