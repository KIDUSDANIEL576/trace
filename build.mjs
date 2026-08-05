#!/usr/bin/env node
/**
 * build.mjs — compiles the Claude Design prototype into the deliverable site.
 *
 *   source   project/Trace Social.dc.html   (frames + prototype CSS, verbatim)
 *            src/shell.html                 (gallery chrome)
 *            src/trace.css                  (finish + gallery styles)
 *            src/trace.js                   (filters, slots, PNG/ZIP export)
 *            src/fonts/*.woff2              (Caveat, extracted from the handoff)
 *
 *   output   site/index.html                self-contained, works from file://
 *            site/manifest.json             frame inventory, diffed run to run
 *
 * Designed to absorb design updates without edits here: the prototype's own
 * <style> block is lifted wholesale (so new @keyframes and classes come along),
 * unrecognised frame sizes are classified by aspect ratio rather than dropped,
 * and the format filter chips are generated from whatever is actually present.
 * Anything the build had to guess at is reported at the end.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const at = (p) => (isAbsolute(p) ? p : join(ROOT, p));
const read = (p) => readFileSync(at(p), 'utf8');
const notes = [];

// node build.mjs [sourceDcHtml] [outDir] — defaults to the handoff + site/
const SRC = process.argv[2] || 'project/Trace Social.dc.html';
const OUT = process.argv[3] || 'site';

/* ---------------------------------------------------------------- source */

const dc = read(SRC);

const open = dc.indexOf('<x-dc>');
const close = dc.lastIndexOf('</x-dc>');
if (open === -1 || close === -1) throw new Error('x-dc envelope not found');
let frames = dc.slice(open + '<x-dc>'.length, close);

/* ------------------------------------------- prototype CSS, lifted whole */
// Taking this from the source rather than hand-copying means a design update
// that adds keyframes or frame classes needs no change in src/trace.css.

const helmet = frames.match(/<helmet[\s\S]*?<\/helmet>/);
if (!helmet) throw new Error('helmet block not found — prototype structure changed');

const protoStyle = helmet[0].match(/<style>([\s\S]*?)<\/style>/);
if (!protoStyle) throw new Error('prototype <style> not found inside helmet');

let protoCss = protoStyle[1];

// Drop the hover-gating the perf passes added; motion is always-on here and
// re-gated at runtime by the `motion` toggle / prefers-reduced-motion.
const paused = protoCss.match(/\.dv-opt[^{]*\{[^}]*animation-play-state[^}]*\}/g) || [];
protoCss = protoCss.replace(/\.dv-opt[^{]*\{[^}]*animation-play-state[^}]*\}/g, '');
if (!paused.length) notes.push('no hover-pause rules found — prototype may already be always-on');

const keyframes = (protoCss.match(/@keyframes\s+([\w-]+)/g) || []).map((k) => k.split(/\s+/)[1]);

// helmet also carried support.js / image-slot.js / Google Fonts — all replaced
frames = frames.replace(/<helmet[\s\S]*?<\/helmet>/, '').trim();

/* ------------------------------------------------- image-slot → ts-slot */
// Attribute-order independent: a design update may emit these differently.

let slotCount = 0;
frames = frames.replace(/<image-slot\b([^>]*)>\s*<\/image-slot>/g, (_, attrs) => {
  const attr = (n) => (attrs.match(new RegExp(`${n}="([^"]*)"`)) || [])[1] || '';
  const id = attr('id') || `slot-${slotCount + 1}`;
  slotCount++;
  return (
    `<div class="ts-slot" data-slot="${id}">` +
    `<div class="ts-slot-cap">${attr('placeholder') || 'Drop an image'}</div>` +
    `<button class="ts-slot-clear" title="Remove photo" aria-label="Remove photo">×</button>` +
    `</div>`
  );
});
if (frames.includes('<image-slot')) throw new Error('unconverted image-slot remains');

/* ----------------------------------------- style-hover → real hover state */
// The prototype uses a `style-hover` attribute that no browser honours, so the
// reveals it describes never fire (1h's invisible ink). Convert to a class.

let hoverFixes = 0;
frames = frames.replace(/<(\w+)([^>]*?)\s+style-hover="[^"]*"([^>]*)>/g, (_, tag, a, b) => {
  hoverFixes++;
  const attrs = (a + b).trim();
  return /class="/.test(attrs)
    ? `<${tag} ${attrs.replace(/class="/, 'class="ts-ink ')}>`
    : `<${tag} class="ts-ink" ${attrs}>`;
});
if (!hoverFixes) notes.push('no style-hover attributes found (1h fix may no longer apply)');

/* ----------------------------------------------------- 4. restore glass */
// Background values matching the app's glass surfaces (pills, docks, sheets —
// Glass.tsx tokens). Everything else translucent is a flat tint and stays.

const GLASS_TINT = /^(?:22,21,28|30,21,26|18,17,24|10,9,13|37,26,32|12,11,16)$/;

let glassCount = 0;
frames = frames.replace(/<div style="([^"]*)"/g, (m, style) => {
  const bg = style.match(/background:rgba\((\d+,\d+,\d+),(\.\d+|1|0?\.\d+)\)/);
  if (!bg) return m;
  const alpha = parseFloat(bg[2]);
  const glass =
    (GLASS_TINT.test(bg[1]) && alpha >= 0.4) ||          // dark glass
    (bg[1] === '255,255,255' && alpha >= 0.7);            // daylight glass
  if (!glass) return m;

  // A glass panel is a surface, not a dot — 2g's 14px fingertips read as
  // translucent white but blurring them is meaningless and costs a layer.
  const w = +((style.match(/(?:^|;)width:(\d+)px/) || [])[1] || 0);
  const h = +((style.match(/(?:^|;)height:(\d+)px/) || [])[1] || 0);
  if (w && h && w < 40 && h < 40) return m;

  glassCount++;
  return `<div class="ts-glass" style="${style}"`;
});

/* ------------------------------- artwork classification + export sizing */

// Frame sizes the design ships today, mapped to their real platform size.
const EXACT = {
  '440x440': { scale: 1080 / 440, fmt: '1:1' },
  '270x480': { scale: 4, fmt: '9:16' },
  '560x315': { scale: 1920 / 560, fmt: '16:9' },
  '280x606': { scale: 1290 / 280, fmt: 'appstore' },
  '330x714': { scale: 3, fmt: 'phone' },
  '196x348': { scale: 1080 / 196, fmt: 'beat' },
  '260x150': { scale: 4, fmt: 'lockup' },
};

// Aspect families, for frame sizes a design update introduces.
const FAMILIES = [
  { fmt: '1:1', r: 1, long: 1080 },
  { fmt: '4:5', r: 0.8, long: 1350 },
  { fmt: '9:16', r: 0.5625, long: 1920 },
  { fmt: '2:3', r: 2 / 3, long: 1800 },
  { fmt: '3:4', r: 0.75, long: 1600 },
  { fmt: '4:3', r: 4 / 3, long: 1600 },
  { fmt: '3:2', r: 1.5, long: 1200 },
  { fmt: '16:9', r: 16 / 9, long: 1920 },
  { fmt: '1.91:1', r: 1.91, long: 1200 },
];

const unknown = new Map();

function exportPlan(w, h, style) {
  if (!w || !h) return { scale: 2, fmt: 'sheet' };            // 5d production sheet
  const hit = EXACT[`${w}x${h}`];
  if (hit) return hit;

  // device mockup? the prototype draws a black bezel around the screen
  if (/padding:5px/.test(style) && /background:#000/.test(style)) {
    unknown.set(`${w}x${h}`, 'phone (bezel detected)');
    return { scale: 3, fmt: 'phone' };
  }

  const r = w / h;
  let best = null;
  for (const f of FAMILIES) {
    const err = Math.abs(r - f.r) / f.r;
    if (err < 0.045 && (!best || err < best.err)) best = { ...f, err };
  }
  if (best) {
    unknown.set(`${w}x${h}`, `${best.fmt} by ratio → long edge ${best.long}px`);
    return { scale: best.long / Math.max(w, h), fmt: best.fmt };
  }
  unknown.set(`${w}x${h}`, 'unrecognised ratio → 3× fallback');
  return { scale: 3, fmt: 'other' };
}

/* -------------------------------------------- wrap every artwork root */

function divEnd(html, openIdx) {
  const re = /<\/?div\b/g;
  re.lastIndex = openIdx + 1;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    depth += m[0] === '<div' ? 1 : -1;
    if (depth === 0) return html.indexOf('>', m.index) + 1;
  }
  throw new Error('unbalanced div at ' + openIdx);
}

const inventory = [];

function wrapArtwork(html, openIdx, name) {
  const tagEnd = html.indexOf('>', openIdx) + 1;
  let tag = html.slice(openIdx, tagEnd);
  const style = (tag.match(/style="([^"]*)"/) || [])[1] || '';
  const w = +((style.match(/(?:^|;)width:(\d+)px/) || [])[1] || 0);
  const h = +((style.match(/(?:^|;)height:(\d+)px/) || [])[1] || 0);
  const { scale, fmt } = exportPlan(w, h, style);
  const ew = w ? Math.round(w * scale) : 0;
  const eh = h ? Math.round(h * scale) : 0;
  const sz = ew && eh ? `${ew}×${eh}` : `${scale}×`;

  inventory.push({ id: name, fmt, w, h, export: sz });

  const grain = fmt === 'sheet' ? '' : ' ts-grain';
  tag = tag.replace('<div ', `<div class="ts-art${grain}" data-name="${name}" data-scale="${scale}" `);

  const end = divEnd(html, openIdx);
  const bar =
    `<div class="ts-fbar"><span class="ts-fsz">${sz}</span>` +
    `<button class="ts-fx" data-x="${name}">PNG</button></div>`;

  return (
    html.slice(0, openIdx) +
    `<div class="ts-fw" data-fmt="${fmt}">` + bar + tag +
    html.slice(tagEnd, end) +
    `</div>` +
    html.slice(end)
  );
}

const optRe = /<div class="dv-opt" id="([^"]+)">/g;
let out = frames;
let cursor = 0;

for (;;) {
  optRe.lastIndex = cursor;
  const opt = optRe.exec(out);
  if (!opt) break;
  const id = opt[1];
  const optEnd = divEnd(out, opt.index);

  const labelIdx = out.indexOf('<div class="dv-olabel">', opt.index);
  if (labelIdx === -1 || labelIdx > optEnd) throw new Error(`no label in ${id}`);
  const scan = divEnd(out, labelIdx);

  const beatsIdx = out.indexOf('<div class="dv-beats">', scan);
  const plainIdx = out.indexOf('<div style=', scan);

  if (beatsIdx !== -1 && beatsIdx < optEnd && beatsIdx < plainIdx) {
    const beatsEnd = divEnd(out, beatsIdx);
    let b = beatsIdx, n = 0;
    for (;;) {
      const beat = out.indexOf('<div class="dv-beat">', b);
      if (beat === -1 || beat > divEnd(out, beatsIdx)) break;
      const bt = out.indexOf('<div class="dv-bt">', beat);
      const art = out.indexOf('<div style=', divEnd(out, bt));
      out = wrapArtwork(out, art, `${id}-b${++n}`);
      b = art + 1;
      if (b > beatsEnd) break;
    }
  } else {
    if (plainIdx === -1 || plainIdx > optEnd) throw new Error(`no artwork in ${id}`);
    out = wrapArtwork(out, plainIdx, id);
  }
  cursor = opt.index + 1;
}
frames = out;

/* ----------------------------------------------- per-turn export button */

const turns = new Set();
frames = frames.replace(
  /(<div class="dv-thd"><a class="dv-tid" href="#(t\d+)">[\s\S]*?<\/span>)/g,
  (m, head, t) => { turns.add(t); return `${head}<button class="ts-tx" data-turn="${t}">export turn</button>`; }
);

/* ------------------------------------------------ filter chips, generated */

const FMT_LABEL = {
  '1:1': '1:1', '4:5': '4:5', '9:16': '9:16', '2:3': '2:3', '3:4': '3:4',
  '4:3': '4:3', '3:2': '3:2', '16:9': '16:9', '1.91:1': 'link card',
  appstore: 'App&nbsp;Store', phone: 'in-app', lockup: 'lockups',
  beat: 'storyboards', sheet: 'specs', other: 'other',
};
const FMT_ORDER = Object.keys(FMT_LABEL);

const present = [...new Set(inventory.map((f) => f.fmt))].sort(
  (a, b) => (FMT_ORDER.indexOf(a) + 1 || 99) - (FMT_ORDER.indexOf(b) + 1 || 99)
);

const chips =
  `<button class="ts-chip is-on" data-filter="all">all</button>\n      <span class="ts-sep"></span>\n      ` +
  present.map((f) => `<button class="ts-chip" data-filter="fmt:${f}">${FMT_LABEL[f] || f}</button>`).join('\n      ');

/* ---------------------------------------------------------------- fonts */

const b64 = (p) => readFileSync(at(p)).toString('base64');
const face = (data, range) =>
  `@font-face{font-family:Caveat;font-style:normal;font-weight:500 700;font-display:swap;` +
  `src:url(data:font/woff2;base64,${data}) format('woff2');unicode-range:${range}}`;

const caveatCss =
  face(b64('src/fonts/caveat-latin-ext.woff2'),
    'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF') +
  face(b64('src/fonts/caveat-latin.woff2'),
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD');

/* ------------------------------------------------------------- assemble */

// NB: replacement callbacks, not strings — frame markup and JS contain `$`
const html = read('src/shell.html')
  .replace('<!--STYLES-->', () =>
    `<style id="ts-font" class="ts-style">${caveatCss}</style>\n` +
    `<style id="ts-proto" class="ts-style">\n${protoCss}\n</style>\n` +
    `<style id="ts-css" class="ts-style">\n${read('src/trace.css')}\n</style>`)
  .replace('<!--SCRIPT-->', () => `<script>\n${read('src/trace.js')}\n</script>`)
  .replace('<!--CHIPS-->', () => chips)
  .replace('<!--FRAMES-->', () => frames);

mkdirSync(at(OUT), { recursive: true });
writeFileSync(join(at(OUT), 'index.html'), html);

/* ------------------------------------------------- manifest + change log */

const manifestPath = join(at(OUT), 'manifest.json');
const prev = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
const manifest = { turns: [...turns], formats: present, frames: inventory };
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`${OUT}/index.html   ${(html.length / 1024).toFixed(0)} KB`);
console.log(`turns             ${[...turns].join(' ')}`);
console.log(`frames            ${inventory.length}`);
console.log(`formats           ${present.join(', ')}`);
console.log(`glass restored    ${glassCount}`);
console.log(`keyframes         ${keyframes.length} (${keyframes.join(' ')})`);
console.log(`hover fixes       ${hoverFixes}`);

if (prev) {
  const was = new Map(prev.frames.map((f) => [f.id, f]));
  const now = new Map(inventory.map((f) => [f.id, f]));
  const added = inventory.filter((f) => !was.has(f.id)).map((f) => f.id);
  const gone = prev.frames.filter((f) => !now.has(f.id)).map((f) => f.id);
  const changed = inventory.filter((f) => was.has(f.id) &&
    (was.get(f.id).w !== f.w || was.get(f.id).h !== f.h)).map((f) => f.id);
  if (added.length || gone.length || changed.length) {
    console.log('\nsince last build:');
    if (added.length) console.log(`  + ${added.length} new: ${added.join(' ')}`);
    if (gone.length) console.log(`  - ${gone.length} removed: ${gone.join(' ')}`);
    if (changed.length) console.log(`  ~ ${changed.length} resized: ${changed.join(' ')}`);
  } else {
    console.log('\nsince last build: no frame changes');
  }
}

if (unknown.size) {
  console.log('\nsizes not in the known table (classified automatically — check these):');
  for (const [dim, how] of unknown) console.log(`  ${dim}  ${how}`);
}
for (const n of notes) console.log(`\nnote: ${n}`);
