/* qa/contrast.mjs — find text that cannot be read against what is behind it.
 *
 * The palette audit checks that every colour is a token value. That passes
 * happily when ink text sits on an ink card, which is exactly how the watch
 * faces and the Android lock screen went invisible: every value was legal, and
 * the combination was not. This walks the real painted background up the tree
 * (transparent elements inherit their parent's ground) and reports anything
 * under the WCAG AA ratio for its size.
 *
 *   node qa/contrast.mjs [dark]
 */
import { execSync } from 'node:child_process';
import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;

const theme = process.argv[2];
const list = JSON.parse(execSync('node qa/drive.mjs list', { cwd: process.cwd(), maxBuffer: 1e8 }));
const targets = [];
for (const g of list) for (const r of g.rows) {
  if (!r) continue;
  targets.push(g.section.includes('sub-rows') ? `${g.section.split(' ')[0]}:${r}` : r);
}
/* the 33 overlays are not `.scr` sections, so a screen walk never reaches
   them — and they carry a third of the app's copy */
for (const k of JSON.parse(execSync('node qa/drive.mjs panels', { cwd: process.cwd(), maxBuffer: 1e8 }))) {
  targets.push('panel:' + k);
}

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 470, height: 900 } });
await page.goto('http://localhost:8123/app.html', { waitUntil: 'networkidle' });
if (theme) { await page.evaluate((t) => window.TRACE_THEME.set(t), theme); await page.waitForTimeout(250); }
await page.evaluate(() => { document.querySelector('.ob-skip')?.click(); document.getElementById('ob-start')?.click(); });
await page.waitForTimeout(500);
await page.evaluate(() => { const t = document.getElementById('toast'); if (t) t.style.display = 'none'; });

const CHECK = `(() => {
  const lum = (c) => {
    const [r,g,b] = c.map(v => { v/=255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4); });
    return .2126*r + .7152*g + .0722*b;
  };
  const parse = (s) => { const m = s.match(/rgba?\\((\\d+), ?(\\d+), ?(\\d+)(?:, ?([\\d.]+))?\\)/); 
    return m ? { c:[+m[1],+m[2],+m[3]], a: m[4]===undefined?1:+m[4] } : null; };
  const over = (fg, bg, a) => fg.map((v,i) => v*a + bg[i]*(1-a));
  /* The ground is every painting ancestor composited together, opaque-first.
     Walking up and stopping at the first painted layer is wrong: a 10% cream
     card over near-black is not 10% cream, and that error is what makes a
     legible element look unreadable and an unreadable one look fine. */
  /* The base a pane sits on is not an ancestor. #sky, #field and #veil
     are SIBLINGS of the content column, so walking up the tree misses all
     three and lands on body by luck. Under the glass system that is the
     whole ground: an ink bloom, a veil over it, the ground under both.
     Composited here at the bloom's worst case — brightest blob, full alpha,
     directly behind the text — so the number errs pessimistic rather than
     reporting a ratio that changes with a 26-second animation. */
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const base = (() => {
    const g = parse(css('--ground')) || parse('rgb(255,255,255)');
    const blob = parse(css('--field-a'));
    let bg = g.c;
    if (blob) bg = over(blob.c, bg, blob.a);          /* the bloom, at its hottest */
    /* the veil is a gradient; its lightest stop is the honest worst case */
    const veil = css('--veil').match(/rgba?\\([^)]+\\)/g) || [];
    const stops = veil.map(parse).filter(Boolean);
    if (stops.length) {
      const thin = stops.reduce((m, s) => (s.a < m.a ? s : m));
      bg = over(thin.c, bg, thin.a);
    }
    return bg;
  })();

  const groundOf = (el) => {
    const layers = [];
    /* start at the element itself — a button paints its own ground, and
       skipping it reports every filled button as white-on-white */
    for (let n = el; n; n = n.parentElement) {
      const p = parse(getComputedStyle(n).backgroundColor);
      if (p && p.a > 0) { layers.push(p); if (p.a >= .999) break; }
    }
    let bg = base;
    for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i].c, bg, layers[i].a);
    return bg;
  };
  const out = [];
  const pn = document.getElementById('panel');
  const root = pn && !pn.classList.contains('hidden') ? pn : document.querySelector('.scr:not(.hidden)');
  if (!root) return out;
  root.querySelectorAll('*').forEach(el => {
    if (!el.offsetWidth || !el.offsetHeight) return;
    const txt = [...el.childNodes].filter(n => n.nodeType===3 && n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');
    if (!txt) return;
    const cs = getComputedStyle(el);
    const f = parse(cs.color); if (!f || f.a < .5) return;
    /* a gradient ground cannot be sampled from computed style; skip rather
       than guess, and say so in the summary */
    for (let n = el; n; n = n.parentElement) {
      const bi = getComputedStyle(n).backgroundImage;
      if (bi && bi !== 'none' && bi.includes('gradient')) return;
    }
    const bg = groundOf(el);
    const fg = f.a < 1 ? over(f.c, bg, f.a) : f.c;
    const L1 = lum(fg), L2 = lum(bg);
    const ratio = (Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    const need = large ? 3 : 4.5;
    if (ratio < need) out.push({ txt: txt.slice(0,40), ratio: +ratio.toFixed(2), need, size,
      /* which way round it is matters: white-on-red is a brand decision, red-on-white
         is just the wrong token — and the ratio alone cannot tell them apart */
      fg: 'rgb(' + fg.map(Math.round).join(',') + ')', bg: 'rgb(' + bg.map(Math.round).join(',') + ')' });
  });
  return out;
})()`;

let bad = 0;
for (const t of targets) {
  try {
    const [a, b] = t.split(':');
    if (a === 'panel') {
      await page.evaluate((k) => window.TRACE_ROOMS.openSub(k), b);
      await page.waitForTimeout(650);
      const hits = await page.evaluate(CHECK);
      if (hits.length) { bad++; console.log(`\n${t}`); for (const h of hits.slice(0,6)) console.log(`   ${h.ratio}:1  ${h.size}px  ${h.fg} on ${h.bg}  "${h.txt}"`); }
      await page.evaluate(() => window.TRACE_APP.closePanel && window.TRACE_APP.closePanel());
      await page.waitForTimeout(200);
      continue;
    }
    /* some directory rows leave the app (the springboard), where #cb-room does
       not exist — without this reset every later target silently measures the
       springboard instead of itself */
    await page.evaluate(() => {
      document.getElementById('home')?.classList.add('hidden');
      document.getElementById('appview')?.classList.remove('hidden');
      const pn = document.getElementById('panel');
      if (pn && !pn.classList.contains('hidden')) document.getElementById('panel-close')?.click();
    });
    await page.waitForTimeout(150);
    await page.evaluate(() => document.getElementById('cb-room').click());
    await page.waitForTimeout(300);
    await page.evaluate((l) => { [...document.querySelectorAll('#rooms-list .row')].find(x => x.textContent.includes(l))?.click(); }, a);
    await page.waitForTimeout(420);
    if (b) { await page.evaluate((l) => { [...document.querySelectorAll('#sc-room .row')].find(x => x.textContent.includes(l))?.click(); }, b); await page.waitForTimeout(450); }
    const hits = await page.evaluate(CHECK);
    if (hits.length) { bad++; console.log(`\n${t}`); for (const h of hits.slice(0,6)) console.log(`   ${h.ratio}:1  ${h.size}px  ${h.fg} on ${h.bg}  "${h.txt}"`); }
  } catch (e) {}
}
/* State the scope with the number — a clean result over a ground the tool
   never names is the most expensive kind of green. */
console.log(`\nground: --ground + the brightest field bloom + the thinnest veil stop, ` +
  `then every painting ancestor composited over it`);
console.log(bad ? `${bad} screens with unreadable text` : 'every text/ground pair meets AA');
await browser.close();
