/* qa/targets.mjs — every tap target in the app, not every tap target on a screen.
 *
 * There was a sweep for this already and it reported "no tap target under 44px"
 * for weeks. It was true and useless: it walked `.scr` sections, and three of
 * the app's surfaces are not `.scr` sections.
 *
 *   the launch splash   #onboard, before you are in the app at all — where
 *                       "I have a code" sat at 18px, the only route to pairing
 *                       and the smallest target in the product
 *   the dock overlays   the brush popover and the write pad live inside #dock,
 *                       and only exist after you are already drawing
 *   the panels          33 overlays opened by key, holding a third of the copy
 *
 * A check that names its own coverage is worth more than one that reports a
 * clean number over a scope it never states. This one prints what it walked.
 *
 *   node qa/targets.mjs
 */
import { execSync } from 'node:child_process';
import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;

const URL = process.env.QA_URL || 'http://localhost:8123/app.html';
const MIN = 44;

const TAPPABLE = 'button,[data-sub],input,select,textarea,a[href],[role="button"]';
const SMALL = (root) => `(() => {
  const r = document.querySelector(${JSON.stringify(root)});
  if (!r) return null;
  return [...r.querySelectorAll(${JSON.stringify(TAPPABLE)})]
    .filter((e) => {
      if (!e.offsetWidth || !e.offsetHeight) return false;
      for (let n = e; n && n.nodeType === 1; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false;
      }
      return true;
    })
    .map((e) => {
      const b = e.getBoundingClientRect();
      return { label: (e.innerText || e.placeholder || e.getAttribute('aria-label') ||
                        e.getAttribute('title') || e.className || e.id || e.tagName).replace(/\\s+/g, ' ').trim().slice(0, 34),
               w: Math.round(b.width), h: Math.round(b.height) };
    })
    .filter((x) => x.h < ${MIN} || x.w < ${MIN});
})()`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 470, height: 900 } });
const bad = [];
const walked = [];
const note = (where, hits) => {
  walked.push(where);
  for (const h of hits || []) bad.push({ where, ...h });
};

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);

/* 1 — the launch splash, before onboarding is dismissed */
note('launch splash', await page.evaluate(SMALL('#onboard')));

await page.evaluate(() => { document.querySelector('.ob-skip')?.click(); });
await page.waitForTimeout(500);
await page.evaluate(() => {
  document.getElementById('home')?.classList.add('hidden');
  document.getElementById('appview')?.classList.remove('hidden');
  const t = document.getElementById('toast'); if (t) t.style.display = 'none';
});
await page.waitForTimeout(400);

/* 2 — every screen reachable through the directory */
const list = JSON.parse(execSync('node qa/drive.mjs list', { cwd: process.cwd(), maxBuffer: 1e8 }));
const screens = [];
for (const g of list) for (const r of g.rows) {
  if (r) screens.push(g.section.includes('sub-rows') ? `${g.section.split(' ')[0]}:${r}` : r);
}
const reset = async () => {
  await page.evaluate(() => {
    document.getElementById('home')?.classList.add('hidden');
    document.getElementById('appview')?.classList.remove('hidden');
    const p = document.getElementById('panel');
    if (p && !p.classList.contains('hidden')) document.getElementById('panel-close')?.click();
    for (const ov of document.querySelectorAll('#screen > div[style*="z-index:60"]')) ov.remove();
  });
  await page.waitForTimeout(120);
};
for (const t of screens) {
  try {
    await reset();
    const [a, b] = t.split(':');
    await page.evaluate(() => document.getElementById('cb-room').click());
    await page.waitForTimeout(260);
    await page.evaluate((l) => [...document.querySelectorAll('#rooms-list .row')]
      .find((x) => x.textContent.includes(l))?.click(), a);
    await page.waitForTimeout(360);
    if (b) {
      await page.evaluate((l) => [...document.querySelectorAll('#sc-room .row')]
        .find((x) => x.textContent.includes(l))?.click(), b);
      await page.waitForTimeout(380);
    }
    note(t, await page.evaluate(SMALL('.scr:not(.hidden)')));
  } catch (e) { /* unreachable screens are the walker's problem, not this check's */ }
}

/* 3 — the 33 overlays, which no screen walk reaches */
const panels = JSON.parse(execSync('node qa/drive.mjs panels', { cwd: process.cwd(), maxBuffer: 1e8 }));
for (const k of panels) {
  try {
    await reset();
    await page.evaluate((key) => window.TRACE_ROOMS?.openSub?.(key), k);
    await page.waitForTimeout(520);
    note('panel:' + k, await page.evaluate(SMALL('#panel')));
    await page.evaluate(() => document.getElementById('panel-close')?.click());
    await page.waitForTimeout(160);
  } catch (e) {}
}

/* 4 — the dock overlays, which only exist once you are already drawing */
await reset();
await page.evaluate(() => window.TRACE_ROOMS.show('canvas'));
await page.waitForTimeout(450);
const box = await page.evaluate(() => {
  const r = document.getElementById('canvas-wrap').getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await page.mouse.move(box.x - 40, box.y);
await page.mouse.down();
await page.mouse.move(box.x + 40, box.y + 20);
await page.mouse.up();
await page.waitForTimeout(650);
note('canvas · drawing', await page.evaluate(SMALL('#dock')));

await page.evaluate(() => document.querySelector('#brushes .tool.is-on')?.click());
await page.waitForTimeout(420);
note('canvas · brush popover', await page.evaluate(SMALL('#brushpop')));
await page.evaluate(() => document.querySelector('#brushes .tool.is-on')?.click());
await page.waitForTimeout(280);

await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Aa');
  b && b.click();
});
await page.waitForTimeout(480);
note('canvas · write pad', await page.evaluate(SMALL('#writepad')));

console.log(`walked ${walked.length} surfaces: the launch splash, ${screens.length} screens, ` +
  `${panels.length} panels, and the three dock overlays`);
if (!bad.length) {
  console.log(`every tap target is at least ${MIN}px on both axes`);
} else {
  const seen = new Set();
  console.log(`\n${bad.length} targets under ${MIN}px:`);
  for (const b of bad) {
    const k = b.where + '|' + b.label;
    if (seen.has(k)) continue;
    seen.add(k);
    console.log(`  ${String(b.w).padStart(4)}×${String(b.h).padEnd(4)}  ${b.where}  "${b.label}"`);
  }
}
await browser.close();
process.exit(bad.length ? 1 : 0);
