// PRD section 8: initial JS under 200KB gzipped. Sums the gzip size of every
// script and modulepreload referenced by dist/index.html (lazy chunks excluded).
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGET = 200 * 1024;
const html = readFileSync('dist/index.html', 'utf8');
const files = [...html.matchAll(/<(?:script[^>]+src|link[^>]+rel="modulepreload"[^>]+href)="\/([^"]+\.js)"/g)].map((m) => m[1]);
let total = 0;
for (const f of files) {
  const size = gzipSync(readFileSync(`dist/${f}`), { level: 9 }).length;
  total += size;
  console.log(`${(size / 1024).toFixed(1).padStart(7)} KB  ${f}`);
}
console.log(`${(total / 1024).toFixed(1).padStart(7)} KB  initial JS (gzip), budget ${BUDGET / 1024} KB`);
if (total > BUDGET) {
  console.error('Over budget');
  process.exit(1);
}
