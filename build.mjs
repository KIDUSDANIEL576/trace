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

import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from 'node:fs';
import { dirname, join, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPRITE, EMOJI_ICONS } from './src/icons.mjs';

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

// Newer exports carry several <style> blocks (e.g. inlined Google-Fonts
// @font-face first, then the real sheet) — merge them all, but drop Caveat
// @font-face rules: their src urls point at the bundler's dead resource ids,
// and we inject our own base64 Caveat instead.
const styleBlocks = [...helmet[0].matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
if (!styleBlocks.length) throw new Error('prototype <style> not found inside helmet');

let protoCss = styleBlocks
  .map((b) => b.replace(/@font-face\s*\{[^}]*Caveat[^}]*\}/g, ''))
  .join('\n');

// Drop the hover-gating the perf passes added; motion is always-on here and
// re-gated at runtime by the `motion` toggle / prefers-reduced-motion.
const paused = protoCss.match(/\.dv-opt[^{]*\{[^}]*animation-play-state[^}]*\}/g) || [];
protoCss = protoCss.replace(/\.dv-opt[^{]*\{[^}]*animation-play-state[^}]*\}/g, '');
if (!paused.length) notes.push('no hover-pause rules found — prototype may already be always-on');

const keyframes = (protoCss.match(/@keyframes\s+([\w-]+)/g) || []).map((k) => k.split(/\s+/)[1]);

// helmet also carried support.js / image-slot.js / Google Fonts — all replaced
frames = frames.replace(/<helmet[\s\S]*?<\/helmet>/, '').trim();

/* ------------------------------------------------ locally-authored turns */
// Turns reconstructed here rather than exported from Claude Design. They are
// prepended (newest first, matching the canvas convention). Once the authored
// export includes them, delete src/turns.html and they drop out cleanly.

let localTurns = 0;
if (existsSync(at('src/turns.html'))) {
  const extra = read('src/turns.html');
  const ids = [...extra.matchAll(/<section class="dv-turn" id="(t\d+)"/g)].map((m) => m[1]);
  // don't double up if the authored export has caught up
  const dupes = ids.filter((id) => frames.includes(`<section class="dv-turn" id="${id}"`));
  if (dupes.length) {
    notes.push(`src/turns.html duplicates authored ${dupes.join(', ')} — skipped; delete the file`);
  } else if (ids.length) {
    frames = extra.trim() + '\n\n' + frames;
    localTurns = ids.length;
  }
}

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
  // Top-edge highlight — real glass catches light on its lip. Appended to the
  // inline style rather than set in CSS so authored glows (the presence pill's
  // red bloom, dock shadows) are never overridden.
  const lit = /box-shadow/.test(style)
    ? style
    : `${style};box-shadow:inset 0 1px 0 rgba(255,255,255,.09)`;
  return `<div class="ts-glass" style="${lit}"`;
});

/* ----------------------------------------------------- emoji → icons */
// Every emoji becomes a monoline stroke icon (SF Symbols / Lucide language —
// what real apps in this genre ship). currentColor, sized by font-size.

let iconSwaps = 0;
for (const [emoji, id] of EMOJI_ICONS) {
  const before = frames.length;
  frames = frames.split(emoji).join(`<svg class="ts-i"><use href="#i-${id}"/></svg>`);
  if (frames.length !== before) iconSwaps++;
}
// anything pictographic left is unmapped — surface it, don't ship it silently
const leftover = [...new Set(frames.match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu) || [])]
  .filter((c) => !'✕✓⋯▮→↑↓️🥰'.includes(c));
if (leftover.length) notes.push('unmapped emoji still present: ' + leftover.join(' '));

/* ----------------------------------------------- button modernization */
// One primary CTA language across every turn (the old turns shipped three
// flat variants): pill radius, tactile top highlight, single brand red.
// Targeted rewrites of the exact recurring style strings — layout untouched.

const BTN = [
  // old-turn primary CTAs (54px, three different flat reds)
  [/min-height:54px;border-radius:16px;background:#db3141;box-shadow:0 6px 14px rgba\(226,51,67,\.35\)/g,
   'min-height:54px;border-radius:27px;background:linear-gradient(180deg,#ea4256,#d92b40);box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 8px 20px rgba(226,51,67,.32)'],
  [/min-height:54px;border-radius:16px;background:#c64b52;box-shadow:0 6px 14px rgba\(239,90,99,\.35\)/g,
   'min-height:54px;border-radius:27px;background:linear-gradient(180deg,#ea4256,#d92b40);box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 8px 20px rgba(226,51,67,.32)'],
  // new-turn primary CTAs (48px flat) — same language, same tokens
  [/height:48px;border-radius:15px;background:#e23343;/g,
   'height:48px;border-radius:24px;background:linear-gradient(180deg,#ea4256,#d92b40);box-shadow:inset 0 1px 0 rgba(255,255,255,.28),0 8px 20px rgba(226,51,67,.32);'],
  // small pill CTA (4e "reply in ink") — align its red with the token
  [/border-radius:99px;background:#cf3e58;/g,
   'border-radius:99px;background:linear-gradient(180deg,#ea4256,#d92b40);box-shadow:inset 0 1px 0 rgba(255,255,255,.25);'],
  // ghost secondaries ("save it for later", "let go") — pill, crisper border
  [/min-height:54px;border-radius:16px;background:rgba\(255,255,255,\.07\);border:1px solid rgba\(255,255,255,\.14\)/g,
   'min-height:54px;border-radius:27px;background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.22)'],
];
let btnUpgrades = 0;
for (const [re, to] of BTN) {
  const n = (frames.match(re) || []).length;
  if (!n) { notes.push('button pattern not found: ' + re.source.slice(0, 48) + '…'); continue; }
  frames = frames.replace(re, to);
  btnUpgrades += n;
}

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
  .replace('<!--FRAMES-->', () => SPRITE + '\n' + frames);

mkdirSync(at(OUT), { recursive: true });
writeFileSync(join(at(OUT), 'plan.html'),
  read('src/plan.html').replace('<!--FONT-->', `<style>${caveatCss}</style>`));

/* PRD: minimal markdown -> styled page (headings, tables, lists, code, bold) */
{
  const md = read('docs/PRD.md');
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const inline = (t) => esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\*([^*]+)\*/g, '<i>$1</i>')
    .replace(/§([\w.]+)/g, '<span class="ref">§$1</span>');
  const lines = md.split('\n');
  let html = '', inCode = false, inList = false, inTable = false;
  const closeAll = () => { if (inList) { html += '</ul>'; inList = false; } if (inTable) { html += '</table>'; inTable = false; } };
  for (const ln of lines) {
    if (ln.startsWith('```')) { closeAll(); html += inCode ? '</pre>' : '<pre>'; inCode = !inCode; continue; }
    if (inCode) { html += esc(ln) + '\n'; continue; }
    if (/^\|/.test(ln)) {
      if (/^\|[\s:-]+\|/.test(ln.replace(/\|/g, '|'))) continue;
      if (/^\|[-\s|:]+$/.test(ln)) continue;
      if (!inTable) { closeAll(); html += '<table>'; inTable = true; }
      const cells = ln.split('|').slice(1, -1).map(c => inline(c.trim()));
      html += '<tr>' + cells.map(c => '<td>' + c + '</td>').join('') + '</tr>';
      continue;
    }
    if (inTable) { html += '</table>'; inTable = false; }
    if (/^- /.test(ln)) { if (!inList) { html += '<ul>'; inList = true; } html += '<li>' + inline(ln.slice(2)) + '</li>'; continue; }
    if (inList) { html += '</ul>'; inList = false; }
    if (/^### /.test(ln)) html += '<h3>' + inline(ln.slice(4)) + '</h3>';
    else if (/^## /.test(ln)) html += '<h2>' + inline(ln.slice(3)) + '</h2>';
    else if (/^# /.test(ln)) html += '<h1>' + inline(ln.slice(2)) + '</h1>';
    else if (/^---/.test(ln)) html += '<hr>';
    else if (ln.trim()) html += '<p>' + inline(ln) + '</p>';
  }
  closeAll();
  const page = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>trace — PRD</title>
<style>${caveatCss}</style>
<style>
*{box-sizing:border-box}body{margin:0;background:#0c0b10;color:#f3f0f4;font:15px/1.65 -apple-system,BlinkMacSystemFont,"Helvetica Neue",sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:820px;margin:0 auto;padding:44px 22px 90px}
h1{font-family:Caveat,cursive;font-weight:700;font-size:48px;line-height:1;margin:0 0 6px}
h2{font-family:Caveat,cursive;font-weight:700;font-size:31px;margin:40px 0 10px;color:#ff9ea9}
h3{font:700 12px ui-monospace,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;color:rgba(243,240,244,.55);margin:26px 0 8px}
p{margin:0 0 12px;color:rgba(243,240,244,.82)}
b{color:#fff}i{color:#f4c66b;font-style:normal}
code{font:12.5px ui-monospace,Menlo,monospace;background:rgba(255,255,255,.08);padding:1.5px 6px;border-radius:5px;color:#7ec8ff}
pre{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:16px;overflow:auto;font:12px/1.7 ui-monospace,Menlo,monospace;color:#a9c8e8}
table{width:100%;border-collapse:collapse;margin:10px 0 18px;font-size:13px}
td{padding:9px 10px;border-bottom:1px solid rgba(255,255,255,.08);vertical-align:top}
tr:first-child td{font:700 10px ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;color:rgba(243,240,244,.5)}
ul{margin:0 0 14px;padding-left:20px}li{margin:4px 0;color:rgba(243,240,244,.82)}
hr{border:0;border-top:1px solid rgba(255,255,255,.1);margin:26px 0}
.ref{color:#f4c66b;font-weight:600}
table{display:block;overflow-x:auto}
</style></head><body><div class="wrap">${html}</div></body></html>`;
  writeFileSync(join(at(OUT), 'prd.html'), page);
}
const scriptFaces = [
  ['Dancing Script', 'Dancing-Script'], ['Sacramento', 'Sacramento'],
  ['Kaushan Script', 'Kaushan-Script'], ['Yellowtail', 'Yellowtail'], ['Parisienne', 'Parisienne'],
].map(([fam, file]) =>
  `@font-face{font-family:'${fam}';font-display:swap;src:url(data:font/woff2;base64,${b64('src/fonts/script/' + file + '.woff2')}) format('woff2')}`
).join('');
/* ------------------------------------------------------------- PWA shell */
/* the one realistic 7-day launch path: the app installs to the home screen,
   runs standalone, and works offline (it is one self-contained file) */
const SW_VERSION = Date.now().toString(36);
writeFileSync(join(at(OUT), 'manifest.webmanifest'), JSON.stringify({
  name: 'trace', short_name: 'trace',
  description: 'One canvas, both of you, all day.',
  start_url: './app.html', scope: './', display: 'standalone',
  background_color: '#0C0B10', theme_color: '#0C0B10',
  icons: [
    { src: 'pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'pwa/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2));
cpSync(at('src/pwa'), join(at(OUT), 'pwa'), { recursive: true });
writeFileSync(join(at(OUT), 'sw.js'), `/* trace sw ${SW_VERSION} */
const C='trace-${SW_VERSION}';
const CORE=['./app.html','./manifest.webmanifest','./pwa/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r})
    .catch(()=>caches.match(e.request).then(r=>r||caches.match('./app.html'))));
});
self.addEventListener('push',e=>{
  let d={kind:'note',body:''}; try{d=e.data.json()}catch(_){ }
  const flare=d.kind==='flare';
  e.waitUntil(self.registration.showNotification(flare?'I need you':'trace',{
    body:d.body||(flare?'The flare. Open now.':'Something landed for you.'),
    tag:'trace-'+d.kind, renotify:flare, requireInteraction:flare,
    icon:'pwa/icon-512.png', badge:'pwa/icon-512.png', vibrate:flare?[300,120,300,120,600]:[60],
  }));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(ws=>{
    for(const w of ws){ if('focus' in w) return w.focus(); }
    return clients.openWindow('./app.html');
  }));
});`);
const PWA_HEAD = `<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#0C0B10">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="trace">
<link rel="apple-touch-icon" href="pwa/apple-touch-512.png">
<script>if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));</script>`;
writeFileSync(join(at(OUT), 'app.html'),
  read('src/app.html')
    .replace('<!--FONT-->', () => PWA_HEAD + `\n<style>${caveatCss}${scriptFaces}</style>`)
    .replace('<!--CSS-->', () => `<style>\n${read('src/app.css')}\n</style>`)
    .replace('<!--SPRITE-->', () => SPRITE + `<style>.ts-i{width:1em;height:1em;display:inline-block;vertical-align:-.12em;flex:none}</style>`)
    .replace('<!--JS-->', () => `<script>\n${read('src/app-extra.js')}\n</script>\n<script>\n${read('src/app-sync.js')}\n</script>\n<script>\n${read('src/app-extra2.js')}\n</script>\n<script>\n${read('src/app.js')}\n</script>\n<script>\n${read('src/rooms.js')}\n</script>\n<script>\n${read('src/rooms2.js')}\n</script>\n<script>\n${read('src/surfaces.js')}\n</script>\n<script>\n${read('src/flows.js')}\n</script>\n<script>\n${read('src/write.js')}\n</script>\n<script>\n${read('src/rituals.js')}\n</script>\n<script>\n${read('src/hard.js')}\n</script>\n<script>\n${read('src/calendar.js')}\n</script>\n<script>\n${read('src/life.js')}\n</script>\n<script>\n${read('src/longrun.js')}\n</script>\n<script>\n${read('src/more.js')}\n</script>`));
writeFileSync(join(at(OUT), 'index.html'), html);

/* ------------------------------------------------- manifest + change log */

const manifestPath = join(at(OUT), 'manifest.json');
const prev = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
const manifest = { turns: [...turns], formats: present, frames: inventory };
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`${OUT}/index.html   ${(html.length / 1024).toFixed(0)} KB`);
console.log(`turns             ${[...turns].join(' ')}${localTurns ? '  (' + localTurns + ' reconstructed locally)' : ''}`);
console.log(`frames            ${inventory.length}`);
console.log(`formats           ${present.join(', ')}`);
console.log(`glass restored    ${glassCount}`);
console.log(`keyframes         ${keyframes.length} (${keyframes.join(' ')})`);
console.log(`hover fixes       ${hoverFixes}`);
console.log(`icons             ${iconSwaps} glyphs swapped to stroke icons`);
console.log(`buttons           ${btnUpgrades} CTAs unified`);

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

/* ------------------------------------------------- the front door + legal */
{
  const md2html = (md) => md.split(/\n\n+/).map((blk) => {
    const t = blk.trim();
    if (t.startsWith('# ')) return `<h1>${t.slice(2)}</h1>`;
    if (t.startsWith('## ')) return `<h2>${t.slice(3)}</h2>`;
    if (/^([-*]|\d+\.) /m.test(t)) return '<ul>' + t.split(/\n/).map((l) =>
      `<li>${l.replace(/^([-*]|\d+\.) /, '')}</li>`).join('') + '</ul>';
    return `<p>${t}</p>`;
  }).join('\n').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  const legalCss = `<style>*{box-sizing:border-box}body{margin:0;background:#0C0B10;color:#F3F0F4;
    font:15px/1.65 -apple-system,'Segoe UI',system-ui,sans-serif;padding:40px 22px 80px}
    .w{max-width:680px;margin:0 auto}h1{font-size:26px;letter-spacing:-.01em}h2{font-size:18px;margin-top:26px}
    p,li{color:rgba(243,240,244,.72)}b{color:#F3F0F4}a{color:#7EC8FF}ul{padding-left:20px}
    .back{font-size:13px;color:rgba(243,240,244,.45)}</style>`;
  for (const [src2, out2, title2] of [['docs/PRIVACY.md', 'privacy.html', 'privacy'], ['docs/TERMS.md', 'terms.html', 'terms']]) {
    writeFileSync(join(at(OUT), out2),
      `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>trace — ${title2}</title>${legalCss}</head><body><div class="w">
      <p class="back"><a href="start.html">← trace</a></p>${md2html(read(src2))}</div></body></html>`);
  }

  const dsB64 = readFileSync(at('src/fonts/script/Dancing-Script.woff2')).toString('base64');
  writeFileSync(join(at(OUT), 'start.html'), `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>trace — one canvas, both of you</title>
<meta name="theme-color" content="#0C0B10">
<style>
@font-face{font-family:'Dancing Script';font-weight:700;src:url(data:font/woff2;base64,${dsB64}) format('woff2')}
*{box-sizing:border-box;margin:0}
body{background:#0C0B10;color:#F3F0F4;font:16px/1.6 -apple-system,'SF Pro Text','Segoe UI',system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;min-height:100vh;display:flex;flex-direction:column;align-items:center;
  justify-content:center;padding:40px 24px;text-align:center}
.mark{font-family:'Dancing Script';font-weight:700;font-size:88px;line-height:1.35;display:flex;align-items:baseline}
.mark svg{width:82px;height:40px;overflow:visible;transform:translateY(-8px)}
.line{font-size:18px;color:rgba(243,240,244,.6);margin:10px 0 34px;max-width:34ch;text-wrap:balance}
.go{display:inline-block;padding:16px 42px;border-radius:999px;background:#F3F0F4;color:#0C0B10;
  font-size:17px;font-weight:650;text-decoration:none}
.how{margin-top:38px;max-width:420px;width:100%;text-align:left;border:1px solid rgba(255,255,255,.1);
  border-radius:18px;padding:18px 20px;background:rgba(255,255,255,.04)}
.how b{font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:rgba(243,240,244,.45)}
.how p{font-size:14.5px;color:rgba(243,240,244,.72);margin-top:8px}
.foot{margin-top:40px;font-size:12.5px;color:rgba(243,240,244,.35)}
.foot a{color:rgba(243,240,244,.5)}
</style></head><body>
<div class="mark">trac<svg viewBox="0 0 140 70"><path d="M6 50 C28 12, 60 66, 98 28 C110 17, 122 15, 133 21"
  fill="none" stroke="#E23343" stroke-width="10" stroke-linecap="round"/></svg></div>
<p class="line">One canvas, both of you, all day. Draw, and it lands on their home screen.</p>
<a class="go" href="app.html">Open trace</a>
<div class="how" id="how"><b>Put it on your home screen</b><p id="steps"></p></div>
<p class="foot">Two people. No feed. No audience. · <a href="privacy.html">privacy</a> · <a href="terms.html">terms</a></p>
<script>
const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
document.getElementById('steps').innerHTML = ios
  ? 'Open in <b>Safari</b> → tap <b>Share</b> → <b>Add to Home Screen</b>. It runs full-screen, works offline, and notifications work from the installed icon (iOS 16.4+).'
  : 'Tap the browser menu <b>⋮</b> → <b>Install app</b> (or <b>Add to Home screen</b>). It installs like any app — offline, notifications, the lot.';
</script></body></html>`);
}

/* ------------------------------------------- the clean redesign (t19-27) */

/* Trace Clean is a separate design document with its own runtime (templated,
   not static markup), so it gets its own compiler. Run it here so a single
   `node build.mjs` absorbs both handoffs. */
{
  const clean = at('project/Trace Clean.dc.html');
  if (existsSync(clean)) {
    console.log('');
    const { execFileSync } = await import('node:child_process');
    execFileSync(process.execPath, [at('clean.mjs'), clean, at(OUT)], { stdio: 'inherit' });
  }
  /* design assets referenced by src="assets/..." in either document */
  const assets = at('project/assets');
  if (existsSync(assets)) cpSync(assets, join(at(OUT), 'assets'), { recursive: true });
}
