/* appicon.mjs — render the app icons from the mark, rather than keeping PNGs.
 *
 * The brand sheet is explicit: red #E23343 field, white stroke, ink dot. The
 * dot is not decoration — it is the wet tip of the other person's stroke, and
 * it doubles as the live-presence indicator used throughout the app. An icon
 * without it is a different mark.
 *
 * Path and geometry are the README's, verbatim:
 *   viewBox 0 0 120 120 · M18 82 C42 26,66 96,102 34 · stroke-width 13 · dot r8 @ 102,34
 *
 * The maskable variant insets the mark to survive a platform circle crop:
 * Android may cut to a circle inscribed in the middle 80%, so anything inside
 * that radius has to carry the whole mark.
 *
 *   node appicon.mjs        write src/pwa/*.png
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, 'src', 'pwa');
mkdirSync(OUT, { recursive: true });

const RED = '#E23343', INK = '#1A1A1A', WHITE = '#FFFFFF';

/* scale is the fraction of the canvas the 120-unit mark occupies; the maskable
   icon uses a smaller one so the crop never reaches the stroke */
const mark = (scale) => {
  const pad = (1 - scale) / 2 * 120;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="512" height="512">
    <rect width="120" height="120" fill="${RED}"/>
    <g transform="translate(${pad} ${pad}) scale(${scale})">
      <path d="M18 82 C42 26,66 96,102 34" stroke="${WHITE}" stroke-width="13"
            fill="none" stroke-linecap="round"/>
      <circle cx="102" cy="34" r="8" fill="${INK}"/>
    </g>
  </svg>`;
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 512, height: 512 } });

for (const [file, scale] of [
  ['icon-512.png', 1],
  ['apple-touch-512.png', 1],
  ['icon-maskable-512.png', 0.72],   /* survives a circle crop at 80% */
]) {
  await page.setContent(
    `<body style="margin:0">${mark(scale).replace('width="512" height="512"', 'width="512" height="512" style="display:block"')}</body>`);
  await page.waitForTimeout(60);
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 512, height: 512 }, omitBackground: false });
  writeFileSync(join(OUT, file), buf);
  console.log('  wrote src/pwa/' + file + (scale < 1 ? `  (inset ${Math.round((1 - scale) * 100)}% for the crop)` : ''));
}

await browser.close();
console.log('run `node build.mjs` to copy them into site/');
