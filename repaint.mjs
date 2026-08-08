/* repaint.mjs — white and red, taken off the store screenshots.
 *
 * Every colour in the app was sampled from store/out/ios-01.png rather than
 * guessed. The swatch row in that shot reads, left to right:
 *
 *     #E23343  red      ← active, and first. this is the new primary
 *     #FF7A9C  pink
 *     #FFFFFF  white
 *     #F4C66B  amber    ← warmer and softer than the old #FFB020
 *     #7EC8FF  blue     ← lighter than the old #6EA8FF
 *
 * and the shell reads: ink #F3F0F4, surface #0C0B10, phone outline pure
 * white rather than near-black.
 *
 * The hues are a straight 1:1 rewrite. What is NOT rewritten is the meaning of
 * amber: in this app amber is "this is going out to her widget", and that is a
 * semantic, not a decoration. Turning it red would collide with the flare and
 * with every destructive action, which are the only two things allowed to be
 * red. So amber keeps its job and only changes its temperature; red is
 * promoted to primary on selection, the wordmark, the heart and the CTA.
 *

 * clean.mjs is deliberately excluded: it parses the untouched design source,
 * and rewriting its colour literals stops it matching (82 frames -> 0).
 *
 *   node repaint.mjs            apply
 *   node repaint.mjs --dry      show what would change, touch nothing
 *   node repaint.mjs --revert   put the old palette back
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), 'src');
const DRY = process.argv.includes('--dry');
const REV = process.argv.includes('--revert');

/* old -> new. Hex pairs are rewritten case-insensitively; the rgb() triples
   are rewritten too, because half the ink in this codebase is written as
   rgba(237,239,247,.55) inside a template literal. */
const HEX = [
  ['#EDEFF7', '#F3F0F4'],   /* ink        — the store shot's white */
  ['#0A0A0C', '#0C0B10'],   /* surface    — a touch warmer, a touch deeper */
  ['#FFB020', '#F4C66B'],   /* amber      — same job, softer */
  ['#FF7BC5', '#FF7A9C'],   /* pink       — pulled toward the red */
  ['#6EA8FF', '#7EC8FF'],   /* blue       — lighter */
];
const RGB = [
  ['237,239,247', '243,240,244'],   /* ink, as a triple */
  ['255,176,32', '244,198,107'],    /* amber, as a triple */
];

const MAP = REV
  ? [...HEX.map(([a, b]) => [b, a]), ...RGB.map(([a, b]) => [b, a])]
  : [...HEX, ...RGB];

/* The bezel is not a hex swap. In the store shots the phone is a thin white
   outline, not a chunky near-black bezel, so the width changes with the
   colour — 8px of pure white would read as a picture frame. */
const SHAPE = REV ? [
  ['border:2px solid #FFFFFF', 'border:8px solid #08080B'],
  ['border:2px solid #FFFFFF;', 'border:10px solid #08080B;'],
] : [
  ['border:8px solid #08080B', 'border:2px solid #FFFFFF'],
  ['border:10px solid #08080B', 'border:2px solid #FFFFFF'],
];

const files = readdirSync(SRC).filter((f) => /\.(js|css|html)$/.test(f));
let total = 0;
const report = [];

for (const f of files) {
  const p = join(SRC, f);
  let s = readFileSync(p, 'utf8');
  const before = s;
  let n = 0;
  for (const [from, to] of [...SHAPE, ...MAP]) {
    const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const hits = (s.match(re) || []).length;
    if (hits) { s = s.replace(re, to); n += hits; }
  }
  if (n) {
    report.push([f, n]);
    total += n;
    if (!DRY && s !== before) writeFileSync(p, s);
  }
}

for (const [f, n] of report.sort((a, b) => b[1] - a[1])) console.log('  ' + String(n).padStart(4) + '  ' + f);
console.log((DRY ? 'would rewrite ' : REV ? 'reverted ' : 'rewrote ') + total + ' colours across ' + report.length + ' files');
