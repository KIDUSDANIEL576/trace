/* qa/deadends.mjs — click everything, and report what did nothing.
 *
 * A screen can pass every other check in here — on-palette, legible, 44px
 * targets, no console errors — and still be a photograph. The palette audit
 * cannot tell a working switch from a painted one, and neither can a
 * screenshot. The only way to know a control is wired is to press it and look
 * at whether the world moved.
 *
 * "Moved" is deliberately generous. A control counts as live if pressing it
 * changes any of:
 *
 *   the visible screen        navigation
 *   the screen's text         a count, a label, a list, a state word
 *   the DOM inside it         a class flip with no text change (a switch)
 *   a toast                   an acknowledgement
 *   an open panel             a sheet or overlay
 *   localStorage              anything that persists
 *
 * Anything that moves none of those is reported. That is not automatically a
 * bug — a disabled control, a text input, or a second tap on an already-open
 * accordion all legitimately do nothing — so the output is a list to judge,
 * not a list to fix. It is verified per finding afterwards.
 *
 * State is snapshotted and restored between screens, because "Delete
 * everything" and "Hold to unpair" are real buttons and the sweep presses
 * them.
 *
 *   node qa/deadends.mjs             every screen and panel
 *   node qa/deadends.mjs Repair      one target, for a repro
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;

const URL = process.env.QA_URL || 'http://localhost:8123/app.html';
const only = process.argv[2];

const list = JSON.parse(execSync('node qa/drive.mjs list', { cwd: process.cwd(), maxBuffer: 1e8 }));
const targets = [];
for (const g of list) {
  for (const r of g.rows) {
    if (!r) continue;
    targets.push(g.section.includes('sub-rows') ? `${g.section.split(' ')[0]}:${r}` : r);
  }
}
for (const k of JSON.parse(execSync('node qa/drive.mjs panels', { cwd: process.cwd(), maxBuffer: 1e8 }))) {
  targets.push('panel:' + k);
}
const work = only ? targets.filter((t) => t.includes(only)) : targets;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 470, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message)));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => { document.querySelector('.ob-skip')?.click(); });
await page.waitForTimeout(400);

/* the clean store, captured once and put back before every screen */
const CLEAN = await page.evaluate(() => JSON.stringify(localStorage));
const restore = () => page.evaluate((s) => {
  localStorage.clear();
  for (const [k, v] of Object.entries(JSON.parse(s))) localStorage.setItem(k, v);
}, CLEAN);

const ROOT = `(() => {
  const p = document.getElementById('panel');
  if (p && !p.classList.contains('hidden')) return p;
  return document.querySelector('.scr:not(.hidden)');
})()`;

/* Everything about the app that a press could plausibly move. The DOM
   signature carries class names so a switch that only flips a class — the
   commonest shape in here — is not mistaken for a dead control. */
const SNAP = `(() => {
  const root = ${ROOT};
  return {
    screen: document.getElementById('home')?.classList.contains('hidden') === false
      ? 'springboard'
      : (document.querySelector('.scr:not(.hidden)')?.id || null),
    panel: (() => { const p = document.getElementById('panel');
      return p && !p.classList.contains('hidden') ? (p.dataset.key || 'open') : null; })(),
    text: root ? root.innerText.replace(/\\s+/g, ' ').trim() : '',
    dom: root ? [...root.querySelectorAll('*')].map(e => e.tagName + '.' + e.className +
      (e.checked ? ':on' : '') + (e.value !== undefined ? ':' + e.value : '')).join('|') : '',
    store: JSON.stringify(localStorage),
    toast: (() => { const t = document.getElementById('toast');
      return t && !t.classList.contains('hidden') && getComputedStyle(t).opacity !== '0'
        ? t.textContent.trim() : ''; })(),
  };
})()`;

/* Identify a control by what it is, not by where it sits.
 *
 * The first version of this addressed controls by their index in the query
 * result and re-indexed at press time. That is wrong for the same reason the
 * screen walk was once wrong: the moment a press re-renders a list or unfolds
 * a dock, the index points at a different element, and the report blames the
 * wrong button — or worse, reports a working one as dead because the press
 * landed somewhere else entirely. That is exactly what happened to the canvas
 * brush buttons.
 *
 * So each control gets a key made of what it is — tag, classes, data
 * attributes, label — plus an occurrence number to separate identical
 * siblings. At press time the key is looked up again; if it is gone, the sweep
 * says so instead of pressing whatever took its place.
 *
 * Visibility is a hit test, not a size test. `max-height:0` with
 * `overflow:hidden` leaves children with a perfectly good bounding box while
 * clipping them out of sight, and an `opacity:0` parent still hit-tests — the
 * canvas tool dock is both, and got enumerated while invisible.
 *
 * But a hit test is only meaningful where the control actually is. Filtering
 * on "inside the viewport" at enumeration time silently dropped everything
 * below the fold — 154 controls, most of a long screen — and turned a blind
 * spot into a much bigger one. So enumeration only asks the questions that
 * scrolling cannot change (display, visibility, opacity, a real size), and the
 * hit test happens at press time, after the control has been scrolled to. A
 * control that is still not hittable once it has been scrolled into view is
 * genuinely unreachable, and is counted and named as such rather than being
 * quietly folded into either total. */
const KEYFN = `(e) => e.tagName.toLowerCase() + '|' + (e.className || '') + '|' +
  [...e.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name + '=' + a.value).join(',') +
  '|' + (e.innerText || e.placeholder || e.getAttribute('aria-label') ||
         e.getAttribute('title') || '').replace(/\\s+/g, ' ').trim().slice(0, 44)`;

/* everything scrolling cannot fix */
const LAID_OUT = `(e) => {
  for (let n = e; n && n.nodeType === 1; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) return false;
  }
  const r = e.getBoundingClientRect();
  return r.width >= 1 && r.height >= 1;
}`;

/* clipped by an ancestor's overflow, or covered — asked only once it is in view */
const HITTABLE = `(e) => {
  const r = e.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return false;
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return !!hit && (e === hit || e.contains(hit) || hit.contains(e));
}`;

const LIST = `[...${ROOT}.querySelectorAll('button,[data-sub],input,textarea,select,a[href],[role="button"]')]
  .filter(${LAID_OUT})`;

const TAPPABLES = `(() => {
  const root = ${ROOT};
  if (!root) return [];
  const key = ${KEYFN};
  const seen = {};
  return ${LIST}.map((e) => {
    const k = key(e);
    seen[k] = (seen[k] || 0) + 1;
    return {
      key: k, nth: seen[k],
      tag: e.tagName.toLowerCase(),
      label: (e.innerText || e.placeholder || e.getAttribute('aria-label') ||
              e.getAttribute('title') || e.className || '').replace(/\\s+/g, ' ').trim().slice(0, 44),
      cls: e.className || '',
      data: [...e.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name).join(','),
      disabled: e.disabled === true || e.getAttribute('aria-disabled') === 'true',
    };
  });
})()`;

async function reset() {
  await page.evaluate(() => {
    document.getElementById('home')?.classList.add('hidden');
    document.getElementById('appview')?.classList.remove('hidden');
    const p = document.getElementById('panel');
    if (p && !p.classList.contains('hidden')) document.getElementById('panel-close')?.click();
    document.getElementById('sheet')?.classList.add('hidden');
    const t = document.getElementById('toast'); if (t) t.style.display = 'none';
  });
  await page.waitForTimeout(120);
}

async function goto(spec) {
  await reset();
  const [a, b] = spec.split(':');
  if (a === 'panel') {
    await page.evaluate((k) => window.TRACE_ROOMS?.openSub?.(k), b);
    await page.waitForTimeout(600);
    return page.evaluate(() => !document.getElementById('panel').classList.contains('hidden'));
  }
  await page.evaluate(() => document.getElementById('cb-room').click());
  await page.waitForTimeout(300);
  const hit = await page.evaluate((l) => {
    const r = [...document.querySelectorAll('#rooms-list .row')].find((x) => x.textContent.includes(l));
    if (!r) return false; r.click(); return true;
  }, a);
  if (!hit) return false;
  await page.waitForTimeout(450);
  if (!b) return true;
  const sub = await page.evaluate((l) => {
    const r = [...document.querySelectorAll('#sc-room .row')].find((x) => x.textContent.includes(l));
    if (!r) return false; r.click(); return true;
  }, b);
  await page.waitForTimeout(500);
  return sub;
}

const dead = [];
const threw = [];
const unreachable = [];
let pressed = 0, live = 0, skipped = 0, gone = 0;

for (const t of work) {
  await restore();
  if (!(await goto(t))) { threw.push({ target: t, why: 'not reachable' }); continue; }
  const controls = await page.evaluate(TAPPABLES);

  for (const c of controls) {
    if (c.disabled) { skipped++; continue; }
    /* a text field is not a control that "does" something on click */
    if (c.tag === 'input' || c.tag === 'textarea') { skipped++; continue; }

    const before = await page.evaluate(SNAP);
    const errAt = errors.length;
    /* bring it into view first — the hit test below is about whether the
       control is reachable, not about where the page happens to be scrolled */
    const found = await page.evaluate(
      new Function('sel', `
        const key = ${KEYFN};
        const seen = {};
        for (const e of ${LIST}) {
          const k = key(e);
          seen[k] = (seen[k] || 0) + 1;
          if (k === sel.key && seen[k] === sel.nth) {
            e.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
            return true;
          }
        }
        return false;
      `), c);
    if (!found) { gone++; continue; }
    await page.waitForTimeout(70);

    let clicked = '';
    try {
      clicked = await page.evaluate(
        new Function('sel', `
          const key = ${KEYFN};
          const seen = {};
          for (const e of ${LIST}) {
            const k = key(e);
            seen[k] = (seen[k] || 0) + 1;
            if (k !== sel.key || seen[k] !== sel.nth) continue;
            if (!(${HITTABLE})(e)) return 'unreachable';
            e.click();
            return 'ok';
          }
          return 'gone';   /* do not press a stand-in */
        `), c);
    } catch (e) { threw.push({ target: t, label: c.label, why: String(e.message).slice(0, 120) }); }
    if (clicked === 'gone') { gone++; continue; }
    if (clicked === 'unreachable') { unreachable.push({ target: t, label: c.label, cls: c.cls }); continue; }
    if (clicked !== 'ok') { gone++; continue; }

    pressed++;
    await page.waitForTimeout(230);
    const after = await page.evaluate(SNAP);
    const moved = before.screen !== after.screen || before.panel !== after.panel ||
      before.text !== after.text || before.dom !== after.dom ||
      before.store !== after.store || (after.toast && after.toast !== before.toast);

    if (moved) live++;
    else dead.push({ target: t, label: c.label, cls: c.cls, data: c.data, tag: c.tag });
    if (errors.length > errAt) {
      threw.push({ target: t, label: c.label, why: 'page error: ' + errors[errAt].slice(0, 120) });
    }

    /* the press may have navigated, opened a panel or wiped the store —
       put it back before judging the next control on this screen */
    if (before.screen !== after.screen || before.panel !== after.panel || before.store !== after.store) {
      await restore();
      if (!(await goto(t))) break;
    }
  }
}

const byTarget = new Map();
for (const d of dead) {
  if (!byTarget.has(d.target)) byTarget.set(d.target, []);
  byTarget.get(d.target).push(d);
}

/* Coverage is part of the result. A sweep that quietly tests fewer controls
   than it did last time reads as an improvement, so every control is accounted
   for in one of these buckets and none of them is allowed to hide. */
console.log(`${pressed + skipped + gone + unreachable.length} controls found across ${work.length} screens`);
console.log(`  ${pressed} pressed`);
console.log(`     ${live} moved something`);
console.log(`     ${dead.length} moved nothing`);
console.log(`  ${skipped} not pressed — disabled, or a text field`);
console.log(`  ${gone} not pressed — no longer on the screen by the time its turn came`);
console.log(`  ${unreachable.length} not pressed — still not hittable after scrolling to it`);
for (const u of unreachable.slice(0, 20)) console.log(`      ${u.target}  "${u.label}"  ${u.cls}`);
if (threw.length) {
  console.log(`\n${threw.length} errors while pressing:`);
  for (const e of threw.slice(0, 40)) console.log(`  ${e.target}  ${e.label || ''}  — ${e.why}`);
}
if (dead.length) {
  console.log(`\nmoved nothing, by screen:`);
  for (const [t, items] of [...byTarget].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n  ${t}  (${items.length})`);
    for (const d of items) console.log(`      "${d.label}"   ${d.cls}${d.data ? '  [' + d.data + ']' : ''}`);
  }
}
writeFileSync('qa/deadends.json', JSON.stringify({ pressed, live, skipped, gone, dead, threw, unreachable }, null, 2));
console.log(`\nqa/deadends.json written`);
await browser.close();
process.exit(0);
