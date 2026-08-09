/* qa/inventory.mjs — the app as a list of things you can say yes or no to.
 *
 * Every other tool here asks whether the app is built correctly. This one asks
 * whether it should exist. It walks the same surfaces `targets.mjs` walks —
 * the launch splash, every screen, every panel, the dock overlays — and for
 * each one records a screenshot and the units inside it a person judges
 * separately.
 *
 * Two distinctions do the real work:
 *
 *   capability vs content   a row that opens something, a switch, an action
 *                           and a card are decisions. The five demo tasks
 *                           underneath them are the same decision drawn five
 *                           times, so they are listed apart and not counted.
 *   screen vs panel         a third of the room sub-rows open an overlay, not
 *                           a section. Walking them as screens records the
 *                           room behind the overlay — nineteen surfaces came
 *                           back as byte-identical copies of Household that
 *                           way, and each one read as a real screen.
 *
 * Output is `qa/inventory.json`, which `audit.mjs` turns into a page.
 *
 *   node qa/inventory.mjs             every surface
 *   node qa/inventory.mjs --fast      skip screenshots (structure only)
 *
 * Screenshots are 390×844 at scale 1, JPEG q62 — about 21 KB each, which is
 * what keeps a hundred of them inside an artifact's 16 MB.
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;

const URL = process.env.QA_URL || 'http://localhost:8123/app.html';
const FAST = process.argv.includes('--fast');
const CLIP = { x: 40, y: 20, width: 390, height: 844 };

/* Chrome, not features. The close cross and the back pill are on every
   surface; judging them a hundred times is the fastest way to abandon an
   audit. */
const CHROME = new Set(['✕', '‹', '›', '⋯', 'Aa', '']);

const UNITS = `(root) => {
  const clean = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const chrome = new Set(${JSON.stringify([...CHROME])});
  const seen = new Set();
  const out = [];
  const push = (kind, name, sub) => {
    name = clean(name); sub = clean(sub);
    if (!name || chrome.has(name) || name.length > 90) return;
    const k = kind + '|' + name;
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ kind, name, sub: sub.slice(0, 120) });
  };
  const shown = (e) => {
    if (!e.offsetWidth && !e.offsetHeight) return false;
    for (let n = e; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false;
    }
    return true;
  };
  const claimed = new Set();
  const claim = (e) => { for (const n of e.querySelectorAll('*')) claimed.add(n); };

  for (const e of root.querySelectorAll('.row, .card, .note, button, input, textarea, select')) {
    if (claimed.has(e) || !shown(e)) continue;
    if (e.dataset.back !== undefined || e.id === 'panel-close') continue;
    const n = clean(e.querySelector('.n')?.textContent);
    const s = clean(e.querySelector('.s')?.textContent);
    if (e.classList.contains('row')) {
      const key = e.dataset.sub || e.dataset.go || '';
      const kind = e.querySelector('[data-toggle], .sw, .switch') || e.dataset.toggle !== undefined ? 'switch'
        : key ? 'opens' : 'row';
      push(kind, n || e.innerText, s);
      claim(e);
    } else if (e.classList.contains('card') || e.classList.contains('note')) {
      const head = n || clean(e.querySelector('h1,h2,h3,strong,b,.t,.k,.hd')?.textContent)
        || clean(e.innerText).slice(0, 60);
      push(e.classList.contains('note') ? 'note' : 'card', head, s || clean(e.innerText).slice(0, 120));
      claim(e);
    } else if (e.tagName === 'BUTTON') {
      push('action', e.innerText || e.getAttribute('aria-label') || e.title);
    } else {
      push('input', e.placeholder || e.getAttribute('aria-label') || e.name || e.type);
    }
  }
  return out;
}`;

/* The panel's title lives in the bar above it, not inside it — but reading it
   unconditionally means a screen inherits the last panel that happened to be
   open, which is how "Household" came back titled "feature". */
const HEAD = `(root) => {
  const c = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  if (root.id === 'panel') return { title: c(document.getElementById('panel-title')?.textContent), kicker: '', blurb: '' };
  const t = root.querySelector('.title');
  return {
    title: c(t?.querySelector('.v')?.textContent),
    kicker: c(t?.querySelector('.k')?.textContent),
    blurb: c(t?.querySelector('.s')?.textContent).slice(0, 160),
  };
}`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 470, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message)));

const surfaces = [];
const seenSig = new Map();

/* A screen is photographed as the whole phone, because that is how you meet
   it. An overlay is not — a panel that fills a third of the screen leaves two
   thirds of empty device in the frame, and thirty-three of those is most of
   the audit page. Overlays are cropped to themselves, padded, and clamped to
   the phone so the crop never runs off the device. */
async function shot(sel, crop) {
  if (FAST) return null;
  let clip = CLIP;
  if (crop) {
    /* The overlay's own box is no help — `#panel` is a full-height container
       with the sheet sitting at the top of it, so cropping to it crops to the
       whole phone. What's wanted is where the ink actually stops, which is the
       union of what's drawn inside. */
    const b = await page.evaluate((s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const n of e.querySelectorAll('*')) {   /* not `e` itself — it is the container */
        if (!n.offsetWidth && !n.offsetHeight) continue;
        const cs = getComputedStyle(n);
        if (cs.visibility === 'hidden' || +cs.opacity < 0.05) continue;
        const r = n.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        /* Only things that actually put something on the pixel grid: a filled
           background, or text of its own. `textContent` is the wrong test —
           `#panel-body` is a transparent scroller 205px taller than its
           content, and it inherits every word inside it, so by that test the
           overlay always reached the bottom of the phone. */
        const paints = cs.backgroundColor !== 'rgba(0, 0, 0, 0)'
          || cs.borderTopWidth !== '0px' || cs.borderBottomWidth !== '0px'
          || [...n.childNodes].some((c) => c.nodeType === 3 && c.data.trim());
        if (!paints) continue;
        x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y);
        x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
      }
      if (!isFinite(x0)) return null;
      return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    }, sel);
    if (b && b.width > 40 && b.height > 40) {
      const pad = 14;
      const x = Math.max(CLIP.x, b.x - pad), y = Math.max(CLIP.y, b.y - pad);
      clip = {
        x, y,
        width: Math.min(CLIP.x + CLIP.width, b.x + b.width + pad) - x,
        height: Math.min(CLIP.y + CLIP.height, b.y + b.height + pad) - y,
      };
    }
  }
  const buf = await page.screenshot({ type: 'jpeg', quality: 62, clip });
  return { src: 'data:image/jpeg;base64,' + buf.toString('base64'), w: Math.round(clip.width), h: Math.round(clip.height) };
}
const inPage = (sel, fn) => page.evaluate(([s, f]) => {
  const r = document.querySelector(s);
  return r ? eval('(' + f + ')')(r) : null;
}, [sel, fn]);

async function record(id, group, label, rootSel, extra = {}) {
  const units = await inPage(rootSel, UNITS);
  if (!units) return false;
  /* A surface whose contents match one already recorded is the same surface
     seen through a route that did not go anywhere. Say so rather than list it
     twice. */
  const sig = units.map((u) => u.kind + u.name).join('|');
  if (sig && seenSig.has(sig)) {
    surfaces.push({ id, group, label, duplicateOf: seenSig.get(sig), units: [], image: null, ...extra });
    return true;
  }
  if (sig) seenSig.set(sig, id);
  const head = (await inPage(rootSel, HEAD)) || {};
  const img = await shot(rootSel, !!extra.overlay);
  surfaces.push({
    id, group, label, ...head,
    capabilities: units.filter((u) => u.kind !== 'row'),
    content: units.filter((u) => u.kind === 'row'),
    units, image: img && img.src, shotW: img && img.w, shotH: img && img.h, ...extra,
  });
  return true;
}

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

/* 1 — the launch splash, the one surface that exists before the app does */
await record('splash', 'Getting in', 'Launch splash', '#onboard');

await page.evaluate(() => document.querySelector('.ob-skip')?.click());
await page.waitForTimeout(600);
await page.evaluate(() => {
  document.getElementById('home')?.classList.add('hidden');
  document.getElementById('appview')?.classList.remove('hidden');
  const t = document.getElementById('toast'); if (t) t.style.display = 'none';
});
await page.waitForTimeout(500);

const reset = async () => {
  await page.evaluate(() => {
    document.getElementById('home')?.classList.add('hidden');
    document.getElementById('appview')?.classList.remove('hidden');
    const p = document.getElementById('panel');
    if (p && !p.classList.contains('hidden')) document.getElementById('panel-close')?.click();
    document.getElementById('sheet')?.classList.add('hidden');
    for (const ov of document.querySelectorAll('#screen > div[style*="z-index:60"]')) ov.remove();
  });
  await page.waitForTimeout(140);
};
const panelOpen = () => page.evaluate(() => {
  const p = document.getElementById('panel');
  return !!p && !p.classList.contains('hidden');
});

/* 2 — the canvas, which is home, and therefore not reached like a screen */
await reset();
await page.evaluate(() => window.TRACE_ROOMS.show('canvas'));
await page.waitForTimeout(600);
await record('canvas', 'The canvas', 'The canvas — home', '.scr:not(.hidden)');

/* 3 — every screen the directory reaches.
   A sub-row whose key is a panel key is skipped here and picked up in step 4,
   where it opens as itself instead of leaving the room on screen. */
const list = JSON.parse(execSync('node qa/drive.mjs list', { cwd: process.cwd(), maxBuffer: 1e8 }));
const panelKeys = new Set(JSON.parse(execSync('node qa/drive.mjs panels', { cwd: process.cwd(), maxBuffer: 1e8 })));
const panelName = new Map();
const panelRoom = new Map();

const screens = [];
for (const g of list) for (const r of g.rows) {
  if (!r) continue;
  const room = g.section.split(' ')[0];
  screens.push(g.section.includes('sub-rows')
    ? { group: room, label: r, spec: `${room}:${r}`, sub: true }
    : { group: g.section, label: r, spec: r });
}

for (const s of screens) {
  try {
    await reset();
    const [a, b] = s.spec.split(':');
    await page.evaluate(() => document.getElementById('cb-room').click());
    await page.waitForTimeout(280);
    const hit = await page.evaluate((l) => {
      const r = [...document.querySelectorAll('#rooms-list .row')].find((x) => x.textContent.includes(l));
      if (!r) return false; r.click(); return true;
    }, a);
    if (!hit) continue;
    await page.waitForTimeout(420);

    /* the room's own sub-rows name its panels — the only place `waiting` is
       ever spelled "The waiting room" */
    for (const [k, v] of await page.evaluate(() => [...document.querySelectorAll('#sc-room .row[data-sub]')]
      .map((r) => [r.dataset.sub, r.querySelector('.n')?.textContent?.trim() || r.dataset.sub]))) {
      if (!panelName.has(k)) { panelName.set(k, v); panelRoom.set(k, a); }
    }

    if (!b) { await record(s.spec, s.group, s.label, '.scr:not(.hidden)', { path: s.spec }); continue; }

    const key = await page.evaluate((l) => {
      const r = [...document.querySelectorAll('#sc-room .row')].find((x) => x.textContent.includes(l));
      if (!r) return null;
      const k = r.dataset.sub || '';
      r.click();
      return k;
    }, b);
    if (key === null) continue;
    if (panelKeys.has(key)) continue;               // an overlay; step 4 owns it
    await page.waitForTimeout(460);
    const sel = (await panelOpen()) ? '#panel' : '.scr:not(.hidden)';
    await record(s.spec, s.group, s.label, sel, { path: s.spec, overlay: sel === '#panel' });
  } catch (e) { /* an unreachable screen is drive.mjs's finding, not this one's */ }
}

/* 4 — the panels, a third of the copy and not a `.scr` between them */
for (const k of panelKeys) {
  try {
    await reset();
    await page.evaluate((key) => window.TRACE_ROOMS?.openSub?.(key), k);
    await page.waitForTimeout(560);
    if (!(await panelOpen())) continue;
    await record('panel:' + k, panelRoom.get(k) || 'Panels', panelName.get(k) || k, '#panel',
      { path: 'panel:' + k, overlay: true });
    await page.evaluate(() => document.getElementById('panel-close')?.click());
    await page.waitForTimeout(160);
  } catch (e) {}
}

/* 5 — the dock overlays, which only exist once a stroke is already down */
await reset();
await page.evaluate(() => window.TRACE_ROOMS.show('canvas'));
await page.waitForTimeout(500);
const box = await page.evaluate(() => {
  const r = document.getElementById('canvas-wrap').getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await page.mouse.move(box.x - 40, box.y);
await page.mouse.down();
await page.mouse.move(box.x + 40, box.y + 20);
await page.mouse.up();
await page.waitForTimeout(700);
await record('dock', 'The canvas', 'The dock — while drawing', '#dock', { overlay: true });

await page.evaluate(() => document.querySelector('#brushes .tool.is-on')?.click());
await page.waitForTimeout(450);
await record('brushpop', 'The canvas', 'Brush popover', '#brushpop', { overlay: true });
await page.evaluate(() => document.querySelector('#brushes .tool.is-on')?.click());
await page.waitForTimeout(280);

await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Aa');
  b && b.click();
});
await page.waitForTimeout(520);
await record('writepad', 'The canvas', 'Write pad', '#writepad', { overlay: true });

await browser.close();

const real = surfaces.filter((s) => !s.duplicateOf);
const caps = real.reduce((n, s) => n + (s.capabilities || []).length, 0);
const content = real.reduce((n, s) => n + (s.content || []).length, 0);
writeFileSync('qa/inventory.json', JSON.stringify({ surfaces: real, dupes: surfaces.filter((s) => s.duplicateOf), caps, content, errors }, null, 1));

console.log(`walked ${surfaces.length} surfaces: the launch splash, the canvas, ` +
  `${screens.length} directory rows, ${panelKeys.size} panels, the three dock overlays`);
console.log(`${real.length} distinct, ${surfaces.length - real.length} the same surface reached twice`);
console.log(`${caps} capabilities to judge, ${content} rows of sample content alongside them`);
console.log(FAST ? 'no screenshots (--fast)' : 'with screenshots');
if (errors.length) console.log(`${errors.length} page errors while walking:`, errors.slice(0, 3));
