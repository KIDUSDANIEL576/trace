#!/usr/bin/env node
/**
 * build.mjs — compiles the Claude Design prototype into the deliverable site.
 *
 *   source   project/Trace Social.dc.html   (frames, read verbatim)
 *            src/shell.html                 (gallery chrome)
 *            src/trace.css                  (prototype CSS + finish + chrome)
 *            src/trace.js                   (filters, slots, PNG/ZIP export)
 *            src/fonts/*.woff2              (Caveat, extracted from the handoff)
 *
 *   output   site/index.html                single self-contained file, works
 *                                           from file:// with no network
 *
 * Transforms applied to the prototype markup:
 *   1. strip the <helmet> runtime block (support.js / image-slot.js scaffolding)
 *   2. <image-slot> → .ts-slot (click/drag to fill, persists via localStorage)
 *   3. fix 1h's dead `style-hover` attribute → .ts-ink (hover reveal works)
 *   4. re-add glass blur to the panels the perf passes stripped it from
 *   5. wrap every artwork root in .ts-fw (export bar, grain, format tags)
 *   6. add per-turn export buttons
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/* ---------------------------------------------------------------- source */

const dc = read('project/Trace Social.dc.html');

const open = dc.indexOf('<x-dc>');
const close = dc.lastIndexOf('</x-dc>');
if (open === -1 || close === -1) throw new Error('x-dc envelope not found');
let frames = dc.slice(open + '<x-dc>'.length, close);

// 1. drop the helmet (design-tool runtime config, fonts loaded from Google,
//    image-slot.js — all replaced by inlined equivalents)
frames = frames.replace(/<helmet[\s\S]*?<\/helmet>/, '').trim();

/* ------------------------------------------------- 2. image-slot → ts-slot */

frames = frames.replace(
  /<image-slot id="([^"]+)"[^>]*?placeholder="([^"]*)"[^>]*><\/image-slot>/g,
  (_, id, ph) =>
    `<div class="ts-slot" data-slot="${id}">` +
    `<div class="ts-slot-cap">${ph}</div>` +
    `<button class="ts-slot-clear" title="Remove photo" aria-label="Remove photo">×</button>` +
    `</div>`
);
if (frames.includes('<image-slot')) throw new Error('unconverted image-slot remains');

/* --------------------------------------- 3. 1h invisible-ink hover reveal */

const inkBefore = frames;
frames = frames.replace(
  /<svg viewBox="0 0 440 440" style="(position:absolute;inset:0;width:100%;height:100%;opacity:\.07;transition:opacity \.5s)" style-hover="opacity:\.9"/,
  '<svg viewBox="0 0 440 440" class="ts-ink" style="$1"'
);
if (frames === inkBefore) throw new Error('1h style-hover fix did not apply');

/* ----------------------------------------------------- 4. restore glass */
// The perf passes removed backdrop-filter document-wide. These background
// values are the app's glass surfaces (pills, docks, sheets — from Glass.tsx
// tokens); everything else translucent is a plain tint and stays as-is.

const GLASS = /^(?:(?:22,21,28|30,21,26|18,17,24|10,9,13|37,26,32|12,11,16),\.(?:42|45|55|5|72|86|88)|255,255,255,\.(?:7|86))$/;

let glassCount = 0;
frames = frames.replace(/<div style="([^"]*)"/g, (m, style) => {
  const bg = style.match(/background:rgba\(([^)]+)\)/);
  if (bg && GLASS.test(bg[1])) { glassCount++; return `<div class="ts-glass" style="${style}"`; }
  return m;
});

/* -------------------------------------------- 5. wrap artwork roots */

// export scale per prototype frame size → real platform size
function exportPlan(w, h) {
  if (w === 440 && h === 440) return { scale: 1080 / 440, fmt: '1:1' };        // 1080×1080
  if (w === 270 && h === 480) return { scale: 4, fmt: '9:16' };                // 1080×1920
  if (w === 560 && h === 315) return { scale: 1920 / 560, fmt: '16:9' };       // 1920×1080
  if (w === 280 && h === 606) return { scale: 1290 / 280, fmt: 'appstore' };   // 1290×2792
  if (w === 330 && h === 714) return { scale: 3, fmt: 'phone' };               // 990×2142
  if (w === 196 && h === 348) return { scale: 1080 / 196, fmt: 'beat' };       // 1080×1918
  if (w === 260 && h === 150) return { scale: 4, fmt: 'lockup' };              // 1040×600
  return { scale: 3, fmt: 'beat' };                                            // 5d production sheet
}

// find the index just past the matching </div> for the <div at openIdx
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

function wrapArtwork(html, openIdx, name) {
  const tagEnd = html.indexOf('>', openIdx) + 1;
  let tag = html.slice(openIdx, tagEnd);
  const style = (tag.match(/style="([^"]*)"/) || [])[1] || '';
  const w = +((style.match(/(?:^|;)width:(\d+)px/) || [])[1] || 0);
  const h = +((style.match(/(?:^|;)height:(\d+)px/) || [])[1] || 0);
  const { scale, fmt } = exportPlan(w, h);
  const sz = w && h ? `${Math.round(w * scale)}×${Math.round(h * scale)}` : `${scale}×`;

  const grain = fmt !== 'beat' || w === 196 ? ' ts-grain' : ''; // no grain on the 5d paper sheet
  tag = tag.replace('<div ', `<div class="ts-art${grain}" data-name="${name}" data-scale="${scale}" `);

  const end = divEnd(html, openIdx);
  const bar =
    `<div class="ts-fbar"><span class="ts-fsz">${sz}</span>` +
    `<button class="ts-fx" data-x="${name}">PNG</button></div>`;

  return {
    html:
      html.slice(0, openIdx) +
      `<div class="ts-fw" data-fmt="${fmt}">` + bar + tag +
      html.slice(tagEnd, end) +
      `</div>` +
      html.slice(end),
    fmt,
  };
}

// iterate dv-opts; inside each, wrap either the single artwork div or each beat
const optRe = /<div class="dv-opt" id="([^"]+)">/g;
let out = frames;
let cursor = 0;
let frameCount = 0;

for (;;) {
  optRe.lastIndex = cursor;
  const opt = optRe.exec(out);
  if (!opt) break;
  const id = opt[1];
  const optEnd = divEnd(out, opt.index);

  // skip past the label div
  const labelIdx = out.indexOf('<div class="dv-olabel">', opt.index);
  if (labelIdx === -1 || labelIdx > optEnd) throw new Error(`no label in ${id}`);
  let scan = divEnd(out, labelIdx);

  const beatsIdx = out.indexOf('<div class="dv-beats">', scan);
  if (beatsIdx !== -1 && beatsIdx < optEnd && beatsIdx < out.indexOf('<div style=', scan)) {
    // storyboard strip — wrap each beat's artwork
    const beatsEnd = divEnd(out, beatsIdx);
    let b = beatsIdx, n = 0;
    for (;;) {
      const beat = out.indexOf('<div class="dv-beat">', b);
      if (beat === -1 || beat > divEnd(out, beatsIdx)) break;
      const bt = out.indexOf('<div class="dv-bt">', beat);
      const art = out.indexOf('<div style=', divEnd(out, bt));
      n++; frameCount++;
      const r = wrapArtwork(out, art, `${id}-b${n}`);
      out = r.html;
      b = art + 1;
      if (b > beatsEnd) break;
    }
    cursor = opt.index + 1;
  } else {
    const art = out.indexOf('<div style=', scan);
    if (art === -1 || art > optEnd) throw new Error(`no artwork in ${id}`);
    frameCount++;
    out = wrapArtwork(out, art, id).html;
    cursor = opt.index + 1;
  }
}
frames = out;

/* ----------------------------------------------- 6. per-turn export */

frames = frames.replace(
  /(<div class="dv-thd"><a class="dv-tid" href="#(t\d)">[\s\S]*?<\/span>)/g,
  '$1<button class="ts-tx" data-turn="$2">export turn</button>'
);

/* ---------------------------------------------------------------- fonts */

const b64 = (p) => readFileSync(join(ROOT, p)).toString('base64');
const face = (data, range) =>
  `@font-face{font-family:Caveat;font-style:normal;font-weight:500 700;font-display:swap;` +
  `src:url(data:font/woff2;base64,${data}) format('woff2');unicode-range:${range}}`;

const caveatCss =
  face(b64('src/fonts/caveat-latin-ext.woff2'),
    'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF') +
  face(b64('src/fonts/caveat-latin.woff2'),
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD');

/* ------------------------------------------------------------- assemble */

const css = read('src/trace.css');
const js = read('src/trace.js');

// NB: replacement callbacks, not strings — frame markup and JS contain `$`
const html = read('src/shell.html')
  .replace('<link rel="stylesheet" href="./trace.css">',
    () => `<style id="ts-font">${caveatCss}</style>\n<style id="ts-css">\n${css}\n</style>`)
  .replace('<script src="./caveat.js"></script>', '')
  .replace('<script src="./trace.js"></script>', () => `<script>\n${js}\n</script>`)
  .replace('{{FRAMES}}', () => frames);

mkdirSync(join(ROOT, 'site'), { recursive: true });
writeFileSync(join(ROOT, 'site/index.html'), html);

console.log(`site/index.html  ${(html.length / 1024).toFixed(0)} KB`);
console.log(`frames wrapped   ${frameCount}`);
console.log(`glass restored   ${glassCount}`);
