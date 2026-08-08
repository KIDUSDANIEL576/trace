/* repaint.mjs — the dark shell onto the Trace Paper system.
 *
 * This is not a hue swap. The old build was dark-first: the ground was near
 * black and every surface was a white film floating on it. Paper inverts the
 * relationship — the ground is warm off-white, surfaces are solid white, and
 * the *dark* card is now the emphasis step (README: "Dark surfaces are used
 * as inversions for emphasis, not as a dark mode").
 *
 * So the mapping is semantic, and two rules do most of the work:
 *
 *   old bright thing  ->  new ink thing      (#F3F0F4 text -> #1A1A1A text,
 *                                             #F3F0F4 button -> the ink button)
 *   old white film    ->  new white card     (rgba(255,255,255,.06) -> #fff
 *                                             + a 1px hairline)
 *
 * Everything resolves to a var(), so dark mode comes free: app.css redefines
 * the same tokens under [data-theme="dark"] and nothing here has to change.
 *
 * The palette also loses colours on purpose. Paper allows exactly one accent
 * (README, "Palette discipline"), so the old green and pink both collapse:
 * green was "done", and in p7 a done task is an ink-filled tick on a dimmed
 * row, not a green one; pink was a second accent and becomes red. Blue only
 * survives as the violet pen, because the canvas pen palette is the one place
 * the design still allows four colours.
 *
 * clean.mjs and design6.mjs are excluded: they parse the untouched design
 * sources, and rewriting their colour literals stops them matching.
 *
 *   node repaint.mjs            apply
 *   node repaint.mjs --dry      show what would change, touch nothing
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), 'src');
const DRY = process.argv.includes('--dry');

/* Order matters: longest / most specific first, because these run as plain
   string replacements and `rgba(255,255,255,.1)` is a prefix of `.12`. */
const MAP = [
  /* ---- the old ink, which is now the new ink -------------------------- */
  ['rgba(243,240,244,.75)', 'var(--ink-2)'],
  ['rgba(243,240,244,.55)', 'var(--ink-2)'],
  ['rgba(243,240,244,.45)', 'var(--ink-3)'],
  ['rgba(243,240,244,.4)',  'var(--ink-4)'],
  ['rgba(243,240,244,.3)',  'var(--ink-5)'],
  ['rgba(243,240,244,.2)',  'var(--ink-5)'],
  ['#F3F0F4', 'var(--ink)'],

  /* ---- the old ground, which is now the ink card's text ---------------- */
  ['#0C0B10', 'var(--emph-ink)'],
  ['#05060F', 'var(--ground)'],
  ['#08080B', 'var(--bezel)'],

  /* ---- the old night-sky gradients. Paper has no sky. ------------------ */
  ['#0C1234', 'var(--ground)'], ['#080B22', 'var(--ground)'],
  ['#101A4A', 'var(--ground)'], ['#0A1030', 'var(--ground)'], ['#06081A', 'var(--ground)'],
  ['#0D1436', 'var(--ground)'], ['#160F2E', 'var(--ground-alt)'], ['#0A0A22', 'var(--ground-alt)'],
  ['#05050F', 'var(--ground-alt)'], ['#2A1030', 'var(--ground-alt)'], ['#140A22', 'var(--ground-alt)'],
  ['#06050F', 'var(--ground-alt)'], ['#1B2A6B', 'var(--ground-alt)'], ['#0C1440', 'var(--ground-alt)'],
  ['#06081C', 'var(--ground)'], ['#04050E', 'var(--ground)'], ['#141E4E', 'var(--surface)'],
  ['#0A0F2E', 'var(--surface)'], ['#0E1740', 'var(--surface)'],
  ['rgba(10,12,26,.96)', 'var(--surface)'],
  ['rgba(10,12,26,.94)', 'var(--surface)'],
  ['rgba(10,12,30,.72)', 'var(--emph)'],

  /* ---- the white film becomes a solid card ----------------------------- */
  ['rgba(255,255,255,.055)', 'var(--surface)'],
  ['rgba(255,255,255,.04)', 'var(--surface)'], ['rgba(255,255,255,.05)', 'var(--surface)'],
  ['rgba(255,255,255,.06)', 'var(--surface)'], ['rgba(255,255,255,.07)', 'var(--surface)'],
  ['rgba(255,255,255,.08)', 'var(--surface)'], ['rgba(255,255,255,.09)', 'var(--surface)'],
  ['rgba(255,255,255,.1)',  'var(--hairline)'], ['rgba(255,255,255,.12)', 'var(--hairline)'],
  ['rgba(255,255,255,.14)', 'var(--hairline)'], ['rgba(255,255,255,.16)', 'var(--hairline)'],
  ['rgba(255,255,255,.18)', 'var(--hairline)'], ['rgba(255,255,255,.2)',  'var(--ink-5)'],
  ['rgba(255,255,255,.25)', 'var(--ink-5)'],  ['rgba(255,255,255,.3)',  'var(--ink-5)'],
  ['rgba(255,255,255,.35)', 'var(--ink-4)'],  ['rgba(255,255,255,.5)',  'var(--ink-4)'],
  ['rgba(255,255,255,.55)', 'var(--ink-3)'],  ['rgba(255,255,255,.6)',  'var(--ink-3)'],

  /* ---- green was "done". On paper, done is ink on a dimmed row. -------- */
  ['rgba(74,222,128,.35)', 'var(--hairline)'],
  ['rgba(74,222,128,.1)',  'var(--ground-alt)'],
  ['#4ADE80', 'var(--ink)'], ['#4ade80', 'var(--ink)'],

  /* ---- pink was the second accent. There is no second accent. --------- */
  ['rgba(255,123,197,.85)', 'var(--red)'], ['rgba(255,123,197,.5)', 'var(--red-wash)'],
  ['rgba(255,123,197,0)', 'transparent'],
  ['rgba(255,122,156,.12)', 'var(--red-wash)'],
  ['#FF7A9C', 'var(--red)'], ['#ff7a9c', 'var(--red)'],
  ['#FF7BC5', 'var(--red)'], ['#ff7bc5', 'var(--red)'],
  ['#ff4d6d', 'var(--red)'], ['#c14a86', 'var(--red-text)'],

  /* ---- amber keeps its job, and moves to the paper amber -------------- */
  ['rgba(244,198,107,.7)', 'rgba(233,161,59,.45)'],
  ['rgba(244,198,107,.6)', 'rgba(233,161,59,.4)'],
  ['rgba(244,198,107,.3)', 'var(--hairline)'],
  ['rgba(244,198,107,.08)', 'var(--ground-alt)'],
  ['#F4C66B', 'var(--amber)'], ['#f4c66b', 'var(--amber)'], ['#FFD98A', 'var(--amber)'],
  ['#ff9a5a', 'var(--amber)'],

  /* ---- blue survives only as the violet pen --------------------------- */
  ['rgba(110,168,255,.10)', 'transparent'], ['rgba(110,168,255,0)', 'transparent'],
  ['#7EC8FF', 'var(--violet)'], ['#7ec8ff', 'var(--violet)'],
  ['#9CC0FF', 'var(--violet)'], ['#6EA8FF', 'var(--violet)'],

  /* ---- red is unchanged, but becomes a token so dark mode can lift it -- */
  ['rgba(226,51,67,.42)', 'var(--red-line)'], ['rgba(226,51,67,.35)', 'var(--red-line)'],
  ['rgba(226,51,67,.14)', 'var(--red-wash)'], ['rgba(226,51,67,.12)', 'var(--red-wash)'],
  ['rgba(226,51,67,.1)',  'var(--red-wash)'], ['rgba(226,51,67,.07)', 'var(--red-wash)'],
  ['#E23343', 'var(--red)'], ['#e23343', 'var(--red)'],


  /* ---- the tail: opacities the first pass did not name ---------------- */
  ['rgba(243,240,244,.8)', 'var(--ink-2)'], ['rgba(243,240,244,.65)', 'var(--ink-2)'],
  ['rgba(243,240,244,.6)', 'var(--ink-2)'], ['rgba(243,240,244,.5)', 'var(--ink-3)'],
  ['#f3f0f4', 'var(--ink)'], ['#1a1a1a', 'var(--ink)'], ['#1A1A1A', 'var(--ink)'],
  ['rgba(255,255,255,.9)', 'var(--surface)'], ['rgba(255,255,255,.86)', 'var(--surface)'],
  ['rgba(255,255,255,.85)', 'var(--surface)'], ['rgba(255,255,255,.8)', 'var(--surface)'],
  ['rgba(255,255,255,.7)', 'var(--ink-3)'], ['rgba(255,255,255,.22)', 'var(--ink-5)'],
  ['rgba(255,255,255,.15)', 'var(--hairline)'], ['rgba(255,255,255,.11)', 'var(--hairline)'],
  ['rgba(244,198,107,.55)', 'rgba(233,161,59,.4)'], ['rgba(244,198,107,.4)', 'rgba(233,161,59,.3)'],
  ['rgba(244,198,107,.35)', 'var(--hairline)'], ['rgba(244,198,107,.16)', 'var(--ground-alt)'],
  ['rgba(74,222,128,.3)', 'var(--hairline)'], ['rgba(74,222,128,.16)', 'var(--ground-alt)'],
  ['rgba(226,51,67,.5)', 'var(--red-line)'], ['rgba(226,51,67,.16)', 'var(--red-wash)'],
  ['#153A2C', 'var(--ground-alt)'], ['#0B1F18', 'var(--ground-alt)'],
  ['rgba(0,0,0,.5)', 'var(--scrim)'], ['rgba(0,0,0,.13)', 'var(--hairline)'],

  /* ---- leftovers from the old room tints ------------------------------ */
  ['#2b2029', 'var(--ground-alt)'], ['#9a93a5', 'var(--ink-3)'], ['#8a6b73', 'var(--ink-3)'],
  ['#5b2a6b', 'var(--ground-alt)'], ['#33445f', 'var(--ground-alt)'],

  /* ---- scrims: a dark room dims with black, a paper room dims warm ----- */
  ['rgba(0,0,0,.55)', 'var(--scrim)'], ['rgba(0,0,0,.6)', 'var(--scrim)'],
  ['rgba(0,0,0,.45)', 'var(--scrim)'], ['rgba(0,0,0,.35)', 'var(--ink-5)'],
  ['rgba(0,0,0,.12)', 'transparent'],
];

/* app.css is already written on the paper system by hand — it is the token
   layer itself, and running the map over it would rewrite the definitions. */
const SKIP = new Set(['app.css']);

const files = readdirSync(SRC).filter((f) => /\.(js|css|html)$/.test(f) && !SKIP.has(f));
let total = 0;
const report = [];

for (const f of files) {
  const p = join(SRC, f);
  let s = readFileSync(p, 'utf8');
  const before = s;
  let n = 0;
  for (const [from, to] of MAP) {
    const re = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
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
console.log((DRY ? 'would rewrite ' : 'rewrote ') + total + ' colours across ' + report.length + ' files');
