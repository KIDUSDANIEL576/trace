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

/* Identify a control by what it is, not by index — indices shift the moment a
   list re-renders, and then the report blames the wrong button. */
const TAPPABLES = `(() => {
  const root = ${ROOT};
  if (!root) return [];
  return [...root.querySelectorAll('button,[data-sub],input,textarea,select,a[href],[role="button"]')]
    .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
    .map((e, i) => ({
      i,
      tag: e.tagName.toLowerCase(),
      label: (e.innerText || e.placeholder || e.getAttribute('aria-label') ||
              e.getAttribute('title') || e.className || '').replace(/\\s+/g, ' ').trim().slice(0, 44),
      cls: e.className || '',
      data: [...e.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name).join(','),
      disabled: e.disabled === true || e.getAttribute('aria-disabled') === 'true',
    }));
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
let pressed = 0, live = 0, skipped = 0;

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
    let clicked = false;
    try {
      clicked = await page.evaluate((sel) => {
        const root = (() => {
          const p = document.getElementById('panel');
          if (p && !p.classList.contains('hidden')) return p;
          return document.querySelector('.scr:not(.hidden)');
        })();
        if (!root) return false;
        const all = [...root.querySelectorAll('button,[data-sub],input,textarea,select,a[href],[role="button"]')]
          .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        const e = all[sel.i];
        if (!e) return false;
        e.click();
        return true;
      }, c);
    } catch (e) { threw.push({ target: t, label: c.label, why: String(e.message).slice(0, 120) }); }
    if (!clicked) { skipped++; continue; }

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

console.log(`pressed ${pressed} controls across ${work.length} screens`);
console.log(`  ${live} moved something`);
console.log(`  ${dead.length} moved nothing`);
console.log(`  ${skipped} skipped (disabled, or a text field)`);
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
writeFileSync('qa/deadends.json', JSON.stringify({ pressed, live, dead, threw }, null, 2));
console.log(`\nqa/deadends.json written`);
await browser.close();
process.exit(0);
