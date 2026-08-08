/* qa/drive.mjs — one way to open any screen in the app and look at it.
 *
 * Every QA check needs the same three things: get past onboarding, reach a
 * named screen, and then either screenshot it or interrogate the DOM. Having
 * one driver means a finding on one screen reproduces the same way on another.
 *
 *   node qa/drive.mjs list                       every reachable screen
 *   node qa/drive.mjs shot <screen> [out.png]    screenshot it (paper)
 *   node qa/drive.mjs shot <screen> out.png dark screenshot it (dark)
 *   node qa/drive.mjs probe <screen>             JSON: text, buttons, colours
 *   node qa/drive.mjs click <screen> <selector>  click, then report the result
 *
 * <screen> is either a directory row label ("Repair", "Cover me") or a
 * room:row pair ("Household:Meal wheel"). Matching is substring, case-exact.
 */
import pkg from '/opt/node22/lib/node_modules/playwright/index.js';
const { chromium } = pkg;

const URL = process.env.QA_URL || 'http://localhost:8123/app.html';
const [cmd, target, arg3, arg4] = process.argv.slice(2);

async function boot(theme) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 470, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL, { waitUntil: 'networkidle' });
  if (theme) { await page.evaluate((t) => window.TRACE_THEME.set(t), theme); await page.waitForTimeout(250); }
  await page.evaluate(() => { document.querySelector('.ob-skip')?.click(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    document.getElementById('home')?.classList.add('hidden');
    document.getElementById('appview')?.classList.remove('hidden');
    const t = document.getElementById('toast'); if (t) t.style.display = 'none';
  });
  await page.waitForTimeout(500);
  return { browser, page, errors };
}

const openDirectory = (page) => page.evaluate(() => document.getElementById('cb-room').click());

/* Reaching a screen is either one hop through the directory or two through a
   room. Returns false rather than throwing so a caller can report "not
   reachable" as a finding instead of a crash. */
async function goto(page, spec) {
  if (!spec || spec === 'canvas') return true;
  const [a, b] = spec.split(':');
  await openDirectory(page); await page.waitForTimeout(400);
  const hit = await page.evaluate((label) => {
    const r = [...document.querySelectorAll('#rooms-list .row')].find((x) => x.textContent.includes(label));
    if (!r) return false; r.click(); return true;
  }, a);
  if (!hit) return false;
  await page.waitForTimeout(550);
  if (!b) return true;
  const sub = await page.evaluate((label) => {
    const r = [...document.querySelectorAll('#sc-room .row')].find((x) => x.textContent.includes(label));
    if (!r) return false; r.click(); return true;
  }, b);
  await page.waitForTimeout(600);
  return sub;
}

const visible = (page) => page.evaluate(() => {
  const s = [...document.querySelectorAll('.scr')].find((x) => !x.classList.contains('hidden'));
  return s ? s.id : null;
});

async function main() {
  if (cmd === 'list') {
    const { browser, page } = await boot();
    await openDirectory(page); await page.waitForTimeout(500);
    const out = await page.evaluate(() => {
      const groups = [];
      let cur = null;
      for (const n of document.getElementById('rooms-list').children) {
        if (n.classList.contains('eyebrow')) { cur = { section: n.textContent, rows: [] }; groups.push(cur); }
        else if (cur) cur.rows.push(n.querySelector('.n')?.textContent);
      }
      return groups;
    });
    /* room sub-rows are only visible once the room is open */
    for (const room of ['Canvas', 'Household', 'Together', 'Memory', 'Wellbeing']) {
      await openDirectory(page); await page.waitForTimeout(300);
      await page.evaluate((l) => {
        [...document.querySelectorAll('#rooms-list .row')].find((x) => x.textContent.includes(l))?.click();
      }, room);
      await page.waitForTimeout(500);
      const subs = await page.evaluate(() =>
        [...document.querySelectorAll('#sc-room .row[data-sub]')].map((r) => r.querySelector('.n')?.textContent));
      if (subs.length) out.push({ section: room + ' (sub-rows)', rows: subs });
    }
    console.log(JSON.stringify(out, null, 2));
    await browser.close(); return;
  }

  if (cmd === 'shot') {
    const { browser, page, errors } = await boot(arg4);
    const ok = await goto(page, target);
    if (!ok) { console.log(JSON.stringify({ error: 'screen not reachable: ' + target })); await browser.close(); process.exit(1); }
    await page.screenshot({ path: arg3 || 'shot.png', clip: { x: 40, y: 20, width: 390, height: 844 } });
    console.log(JSON.stringify({ screen: await visible(page), file: arg3 || 'shot.png', errors }));
    await browser.close(); return;
  }

  if (cmd === 'probe') {
    const { browser, page, errors } = await boot(arg3);
    const ok = await goto(page, target);
    if (!ok) { console.log(JSON.stringify({ error: 'screen not reachable: ' + target })); await browser.close(); process.exit(1); }
    const data = await page.evaluate(() => {
      const s = [...document.querySelectorAll('.scr')].find((x) => !x.classList.contains('hidden'));
      if (!s) return { error: 'no visible screen' };
      const rect = (e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) }; };
      const cs = (e, p) => getComputedStyle(e)[p];
      return {
        id: s.id,
        text: s.innerText.split('\n').map((t) => t.trim()).filter(Boolean),
        /* anything a finger can hit, with the size it presents */
        tappables: [...s.querySelectorAll('button,[data-sub],input,textarea,a')].map((e) => ({
          tag: e.tagName.toLowerCase(),
          label: (e.innerText || e.placeholder || e.getAttribute('aria-label') || '').trim().slice(0, 40),
          attrs: [...e.attributes].filter((a) => a.name.startsWith('data-')).map((a) => a.name + '=' + a.value),
          ...rect(e),
          disabled: e.disabled === true,
        })),
        /* the values actually painted, so palette drift is measurable */
        colours: [...new Set([...s.querySelectorAll('*')].flatMap((e) =>
          ['color', 'backgroundColor', 'borderTopColor'].map((p) => cs(e, p))
            .filter((v) => v && v !== 'rgba(0, 0, 0, 0)')))],
        /* does the screen fit, or is content unreachable below the fold */
        overflow: (() => {
          const p = s.querySelector('.page') || s;
          return { scrollH: p.scrollHeight, clientH: p.clientHeight, scrolls: p.scrollHeight > p.clientHeight + 2 };
        })(),
        fontSizes: [...new Set([...s.querySelectorAll('*')]
          .filter((e) => e.innerText && e.children.length === 0)
          .map((e) => parseFloat(cs(e, 'fontSize'))))].sort((a, b) => a - b),
      };
    });
    console.log(JSON.stringify({ ...data, pageErrors: errors }, null, 2));
    await browser.close(); return;
  }

  if (cmd === 'click') {
    const { browser, page, errors } = await boot(arg4);
    const ok = await goto(page, target);
    if (!ok) { console.log(JSON.stringify({ error: 'screen not reachable: ' + target })); await browser.close(); process.exit(1); }
    const before = await visible(page);
    const beforeText = await page.evaluate(() => document.querySelector('.scr:not(.hidden)')?.innerText || '');
    const found = await page.evaluate((sel) => {
      const e = document.querySelector('.scr:not(.hidden) ' + sel); if (!e) return false; e.click(); return true;
    }, arg3);
    await page.waitForTimeout(900);
    const after = await visible(page);
    const afterText = await page.evaluate(() => document.querySelector('.scr:not(.hidden)')?.innerText || '');
    console.log(JSON.stringify({
      selectorFound: found, screenBefore: before, screenAfter: after,
      navigated: before !== after,
      textChanged: beforeText !== afterText,
      toast: await page.evaluate(() => document.getElementById('toast')?.textContent || ''),
      afterText: afterText.split('\n').map((t) => t.trim()).filter(Boolean).slice(0, 30),
      pageErrors: errors,
    }, null, 2));
    await browser.close(); return;
  }

  console.log('usage: list | shot <screen> [out] [dark] | probe <screen> [dark] | click <screen> <selector> [dark]');
  process.exit(1);
}
main();
