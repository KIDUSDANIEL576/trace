/* trace — every surface (design frames 24a, 22b, 22c, 24i).
 *
 * The board is not a phone screen; it is a thing that shows up wherever the
 * other person happens to be looking. So the watch, both lock screens, the
 * Android home and the wall-mounted tablet all render here — and all of them
 * read the same deck() the phone widget reads, so they can never drift from
 * what the board actually says.
 *
 * Chrome values are the frames': 168×200 r48 Apple Watch, 180 circle Wear OS,
 * the split iOS/Android lock, the 30px Material widget stack, the 820×600
 * tablet with its 210px rail.
 */
(() => {
'use strict';
const R = window.TRACE_ROOMS;
if (!R) return;
const { el, esc, count, deck, screens, ui } = R;
const db = R.db;
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

let tab = 'watch';

/* ------------------------------------------------------------ live values */

/* whatever the widget would be showing right now, in the deck's own order */
const top = () => deck()[0] || {};
const openTasks = () => db.tasks.filter((t) => !db.done[t.id]);
const groceriesLeft = () => db.items.length - count(db.got);
const waiting = () => db.blocked.filter((b) => b.on === 'Maya' && !db.unblocked[b.id]).length;
const nextWeekItem = () => (db.week.items[0] || {}).t || 'nothing booked';
const leavingMins = () => (db.leaving ? db.leaving.mins : null);
const drawing = () => top().kind === 'trace';

const trace = (c, w) => `<svg viewBox="0 0 130 40" style="width:100%;height:${w || 40}px">
  <path d="M6 28 C30 6,54 36,80 16 S116 30,126 10" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;

/* ----------------------------------------------------- 24a · on your wrist */

function watchFaces() {
  const left = openTasks().length;
  const lm = leavingMins();
  return `
    <div style="display:flex;flex-direction:column;align-items:center;gap:24px;padding:6px 0 2px">

      <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
        <div style="width:168px;height:200px;border-radius:48px;background:var(--emph);border:3px solid var(--emph);
          box-shadow:0 18px 40px var(--scrim);padding:18px 16px;display:flex;flex-direction:column;justify-content:space-between">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:11px;color:var(--red);font-weight:600">Maya</span>
            <span style="font-size:13px;font-weight:600" data-clock>9:41</span>
          </div>
          ${trace(drawing() ? 'var(--red)' : 'var(--amber)')}
          <div style="display:flex;gap:6px">
            <div style="flex:1;border-radius:10px;background:var(--hairline);padding:6px 8px">
              <div style="font-size:9px;color:var(--ink-3)">LEFT</div>
              <div style="font-size:15px;font-weight:600;color:var(--violet)">${left}</div></div>
            <div style="flex:1;border-radius:10px;background:var(--hairline);padding:6px 8px">
              <div style="font-size:9px;color:var(--ink-3)">NIGHT</div>
              <div style="font-size:15px;font-weight:600;color:var(--red)">27m</div></div>
          </div>
        </div>
        <span style="font-size:12px;color:var(--ink-3)">Apple Watch · complication + trace</span>
      </div>

      <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
        <div style="width:180px;height:180px;border-radius:50%;background:var(--emph);border:3px solid var(--emph);
          box-shadow:0 18px 40px var(--scrim);position:relative;display:flex;flex-direction:column;
          align-items:center;justify-content:center;gap:3px">
          <div style="position:absolute;inset:10px;border-radius:50%;border:2px solid var(--hairline)"></div>
          <div style="position:absolute;inset:10px;border-radius:50%;border:2px solid transparent;
            border-top-color:var(--ink);border-right-color:var(--ink);transform:rotate(38deg)"></div>
          <span style="font-size:30px;font-weight:600;letter-spacing:-.02em" data-clock>9:41</span>
          <span style="font-size:11px;color:${lm ? 'var(--ink)' : 'var(--ink-3)'}">
            ${lm ? 'home in ' + lm + ' min' : esc(nextWeekItem())}</span>
          <svg viewBox="0 0 80 20" style="width:80px;height:20px;margin-top:2px">
            <path d="M4 14 C22 3,38 18,76 6" stroke="var(--amber)" stroke-width="3" fill="none" stroke-linecap="round"/></svg>
        </div>
        <span style="font-size:12px;color:var(--ink-3)">Wear OS · tile + ambient trace</span>
      </div>
    </div>
    <div class="foot">Raise-to-wrist shows her last mark. A long press taps back.</div>`;
}

/* ------------------------------------------- 22b · lock screens, both sides */

function lockScreens() {
  const t = openTasks();
  const lm = leavingMins();
  return `
    <div style="min-height:500px;display:flex;flex-direction:column;margin:4px 16px 0;border-radius:22px;overflow:hidden;
      border:1px solid var(--hairline)">

      <div style="flex:1;background:linear-gradient(180deg,var(--ground) 0%,var(--ground) 100%);position:relative;overflow:hidden">
        <div style="position:absolute;top:12px;left:14px;padding:4px 10px;border-radius:999px;
          background:var(--hairline);font-size:10px;letter-spacing:.12em;color:var(--ink-2)">iOS LOCK</div>
        <div style="display:flex;justify-content:center;padding-top:38px">
          <div style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:999px;background:var(--emph);color:var(--emph-ink);font-size:12px">
            <span style="width:6px;height:6px;border-radius:50%;background:var(--red);animation:pulseDot 2s ease-in-out infinite"></span>
            ${drawing() ? 'Maya is drawing' : 'Maya is here'}<span style="color:var(--ink-4)">· live</span></div>
        </div>
        <div style="text-align:center;margin-top:18px">
          <div style="font-size:14px;font-weight:500;color:rgba(243,240,244,.7)" data-date>Thursday, August 7</div>
          <div style="font-size:58px;font-weight:600;letter-spacing:-.03em;line-height:1" data-clock>9:41</div>
        </div>
        <div style="display:flex;justify-content:center;gap:10px;margin-top:14px;padding-bottom:16px">
          <div style="width:140px;border-radius:18px;background:var(--hairline);backdrop-filter:blur(8px);padding:10px 12px">
            <div style="font-size:10px;color:var(--ink-2)">TRACE · GOODNIGHT</div>
            <div style="font-size:20px;font-weight:600;color:var(--red);margin-top:2px">27:14</div></div>
          <div style="width:140px;border-radius:18px;background:var(--hairline);backdrop-filter:blur(8px);padding:10px 12px">
            <div style="font-size:10px;color:var(--ink-2)">TRACE · MUST DO</div>
            <div style="font-size:13px;font-weight:600;margin-top:4px">${esc((t[0] || {}).title || 'nothing left')}
              ${t.length > 1 ? `<span style="color:var(--amber)">+${t.length - 1}</span>` : ''}</div></div>
        </div>
      </div>

      <div style="height:2px;background:var(--hairline)"></div>

      <div style="flex:1;background:linear-gradient(180deg,#0B0F2C 0%,#07091C 100%);position:relative;overflow:hidden">
        <div style="position:absolute;top:12px;right:14px;padding:4px 10px;border-radius:999px;
          background:var(--hairline);font-size:10px;letter-spacing:.12em;color:var(--ink-2)">ANDROID LOCK</div>
        <div style="padding:34px 26px 0">
          <div style="font-size:52px;font-weight:500;letter-spacing:-.02em;line-height:1.02" data-clock>9:41</div>
          <div style="font-size:14px;color:var(--ink-2);margin-top:6px" data-date-short>Thu, Aug 7</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:14px;font-size:13px;color:var(--ink-2)">
            <span style="width:7px;height:7px;border-radius:50%;background:${lm ? 'var(--ink)' : 'var(--amber)'}"></span>
            ${lm ? `Trace · Leaving now — home in <span style="color:var(--ink);font-weight:600">${lm} min</span>`
                 : `Trace · ${waiting() ? waiting() + ' waiting on you' : 'nothing needs you'}`}</div>
        </div>
        <div style="margin:16px 20px 0;border-radius:22px;background:var(--surface);padding:12px 15px;
          display:flex;align-items:center;gap:12px">
          <svg viewBox="0 0 30 30" style="width:24px;height:24px;flex:none">
            <path d="M5 20 C11 8,15 24,25 10" stroke="var(--amber)" stroke-width="3" fill="none" stroke-linecap="round"/></svg>
          <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600">Trace</div>
            <div style="font-size:12px;color:var(--ink-2)">One-time trace from him — opens once</div></div>
          <div style="font-size:11px;color:var(--ink-4)">now</div>
        </div>
      </div>
    </div>
    <div class="foot">A live activity, not a notification. It never asks to be dismissed.</div>`;
}

/* -------------------------------------------------------- 22c · Android home */

function androidHome() {
  const lm = leavingMins();
  return `
    <div style="min-height:520px;display:flex;flex-direction:column;margin:4px 16px 0;border-radius:26px;overflow:hidden;
      border:1px solid var(--hairline);
      background:radial-gradient(130% 80% at 80% 0%,#16246B 0%,var(--ground-alt) 40%,var(--ground) 78%,var(--ground) 100%)">

      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 22px 0;font-size:13px;font-weight:500">
        <span data-clock>9:41</span><span style="font-size:10px;opacity:.85;letter-spacing:2px">▍ ◗ ▬</span></div>

      <div style="margin:16px 16px 0;border-radius:30px;background:linear-gradient(160deg,#1E2C63,var(--ground));
        border:1px solid var(--hairline);padding:16px 18px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="font-size:12px;font-weight:600;color:var(--ink-2)">Trace · her board</div>
          <span style="width:7px;height:7px;border-radius:50%;background:var(--red);animation:pulseDot 2s ease-in-out infinite"></span>
        </div>
        <svg viewBox="0 0 310 64" style="width:100%;height:56px;margin-top:8px">
          <path d="M8 44 C56 12,96 58,152 26 S244 50,302 18" stroke="var(--red)" stroke-width="5" fill="none" stroke-linecap="round"/></svg>
        <div style="display:flex;gap:7px;margin-top:10px;flex-wrap:wrap">
          <div style="padding:7px 12px;border-radius:999px;background:var(--hairline);font-size:12px">${openTasks().length} left today</div>
          <div style="padding:7px 12px;border-radius:999px;background:var(--hairline);font-size:12px;font-style:italic;color:var(--amber)">${esc(nextWeekItem())}</div>
          <div style="padding:7px 12px;border-radius:999px;background:var(--ground-alt);font-size:12px;color:var(--ink)">41 days</div>
        </div>
      </div>

      <div style="display:flex;gap:12px;margin:12px 16px 0">
        <div style="flex:1;aspect-ratio:1;border-radius:30px;background:linear-gradient(160deg,#2A1E5C,#170F33);
          border:1px solid var(--hairline);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">
          <div style="font-size:11px;color:var(--ink-3)">${lm ? 'LEAVING NOW' : 'GOODNIGHT'}</div>
          <div style="font-size:24px;font-weight:600;color:var(--red)">${lm ? lm + ' min' : '27:14'}</div></div>
        <div style="flex:1;aspect-ratio:1;border-radius:30px;background:linear-gradient(160deg,var(--ground-alt),var(--ground-alt));
          border:1px solid rgba(74,222,128,.28);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">
          <div style="font-size:11px;color:var(--ink-3)">${db.mission ? 'MISSION' : 'GROCERIES'}</div>
          <div style="font-size:14px;font-weight:600;color:var(--ink);text-align:center;padding:0 10px">
            ${db.mission ? 'Both in · Sun 6 PM' : groceriesLeft() + ' left'}</div></div>
      </div>

      <div style="flex:1"></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);padding:0 22px;justify-items:center">
        <div style="width:50px;height:50px;border-radius:50%;background:var(--surface)"></div>
        <div style="width:50px;height:50px;border-radius:50%;background:var(--surface)"></div>
        <div style="width:50px;height:50px;border-radius:50%;background:var(--surface)"></div>
        <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(160deg,var(--ground-alt),var(--surface));
          border:1px solid var(--hairline);display:flex;align-items:center;justify-content:center">
          <svg viewBox="0 0 30 30" style="width:22px;height:22px">
            <path d="M5 20 C11 8,15 24,25 10" stroke="var(--amber)" stroke-width="3" fill="none" stroke-linecap="round"/></svg></div>
      </div>
      <div style="margin:16px 18px 20px;height:46px;border-radius:999px;background:var(--hairline);
        border:1px solid var(--surface);display:flex;align-items:center;padding:0 18px;gap:12px">
        <span style="font-size:15px;opacity:.6">⌕</span>
        <span style="font-size:13px;color:var(--ink-3)">Search</span></div>
    </div>
    <div class="foot">Material widgets, resizable. Same board, same one-time rules.</div>`;
}

/* --------------------------------------------------- 24i · the mounted board */

function tabletBoard() {
  const t = openTasks();
  const room = (icon, name, n, tint, on) => `
    <div style="display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:14px;font-size:15px;
      ${on ? 'background:var(--hairline);font-weight:600' : 'color:var(--ink-2)'}">
      <span style="font-size:15px">${icon}</span>${name}
      ${n ? `<span style="margin-left:auto;font-size:13px;color:${tint}">${n}</span>` : ''}</div>`;
  /* 820×600 at the frame's proportions, scaled to whatever width we have */
  return `
    <div style="height:270px;display:flex;align-items:center;justify-content:center;overflow:hidden">
      <div style="width:820px;height:600px;flex:none;transform:scale(.41);transform-origin:center;
        border-radius:28px;border:2px solid #FFFFFF;overflow:hidden;position:relative;display:flex;
        background:linear-gradient(160deg,var(--ground) 0%,var(--ground) 45%,var(--ground) 100%);box-shadow:0 34px 70px var(--scrim)">

        <div style="width:210px;border-right:1px solid var(--surface);padding:24px 18px;
          display:flex;flex-direction:column;gap:6px">
          <div style="font-size:19px;font-weight:700;letter-spacing:-.01em;padding:0 10px 16px">Trace</div>
          ${room('✎', 'Canvas', '', '', true)}
          ${room('⌂', 'Household', t.length, 'var(--violet)')}
          ${room('❑', 'Together', db.buckets.length - count(db.bucket), 'var(--ink)')}
          ${room('◔', 'Memory', '', '')}
          ${room('◍', 'Wellbeing', '', '')}
          <div style="flex:1"></div>
          <div style="display:flex;align-items:center;gap:9px;padding:11px 12px;border-radius:14px;
            background:var(--surface);font-size:13px">
            <span style="width:7px;height:7px;border-radius:50%;background:var(--ink);animation:pulseDot 2.4s ease-in-out infinite"></span>
            ${drawing() ? 'Maya is drawing' : 'Maya is here'}</div>
        </div>

        <div style="flex:1;padding:24px;display:flex;gap:16px">
          <div style="flex:1.35;border-radius:24px;background:var(--surface);
            border:1px solid var(--surface);position:relative;overflow:hidden">
            <svg viewBox="0 0 420 520" style="position:absolute;inset:0;width:100%;height:100%">
              <path d="M50 110 C130 50,180 170,270 100" stroke="var(--amber)" stroke-width="8" fill="none" stroke-linecap="round"/>
              <path d="M70 270 C160 200,210 350,330 260" stroke="var(--red)" stroke-width="8" fill="none" stroke-linecap="round"/>
              <path d="M90 410 C170 360,230 460,340 390" stroke="var(--violet)" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"/>
            </svg>
            <div style="position:absolute;left:18px;bottom:16px;padding:8px 14px;border-radius:999px;
              background:var(--emph);border:1px solid var(--hairline);font-size:13px" data-canvascap>Today’s canvas</div>
          </div>
          <div style="width:250px;display:flex;flex-direction:column;gap:12px">
            <div style="border-radius:20px;background:var(--surface);border:1px solid var(--surface);padding:16px">
              <div style="font-size:12px;color:var(--ink-3)">Goodnight in</div>
              <div style="font-size:26px;font-weight:600;color:var(--red);margin-top:2px">2h 14m</div></div>
            <div style="border-radius:20px;background:var(--surface);border:1px solid var(--surface);padding:16px">
              <div style="font-size:12px;color:var(--ink-3)">Left to do</div>
              <div style="font-size:26px;font-weight:600;color:var(--violet);margin-top:2px">${t.length} things</div></div>
            <div style="border-radius:20px;background:linear-gradient(160deg,var(--ground-alt),var(--ground-alt));
              border:1px solid var(--hairline);padding:16px">
              <div style="font-size:12px;color:var(--ink)">Week 32 mission</div>
              <div style="font-size:15px;font-weight:600;margin-top:4px;line-height:1.3">Cook something neither of you can pronounce</div></div>
            <div style="flex:1;border-radius:20px;background:var(--surface);
              border:1px solid var(--surface);padding:16px">
              <div style="font-size:12px;color:var(--ink-3)">This week</div>
              ${db.week.items.map((i, n) => `<div style="font-size:15px;font-style:italic;color:${i.c};margin-top:${n ? 6 : 8}px">${esc(i.t)}</div>`).join('')}
              <div style="font-size:15px;font-style:italic;color:var(--ink);margin-top:6px">Sunday, no plans</div></div>
          </div>
        </div>
      </div>
    </div>
    <div class="foot">iPad and Android tablet — the one that lives on the kitchen wall.</div>`;
}

/* ------------------------------------------------------------------ screen */

const TABS = [
  ['watch', 'Watch', 'Same board, smallest surface', 'Watch faces', watchFaces],
  ['lock', 'Lock', 'Before you unlock anything', 'Lock screens', lockScreens],
  ['android', 'Android', 'Material widgets, resizable', 'Android home', androidHome],
  ['tablet', 'Tablet', 'The one on the kitchen wall', 'The mounted board', tabletBoard],
];

function render() {
  const s = screens.surfaces;
  const cur = TABS.find((t) => t[0] === tab) || TABS[0];
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Every surface</button>
      <button class="icob" data-close>✕</button></div>
    <div class="title"><div class="k">${esc(cur[2])} · <span style="color:var(--amber)">coming with the store build</span></div><div class="v">${esc(cur[3])}</div></div>
    <div class="deck" style="padding:16px 20px 0">
      ${TABS.map(([k, label]) => `<button class="c" data-tab="${k}" style="min-width:0;height:38px;padding:0 16px;
        display:flex;align-items:center;justify-content:center;border-radius:999px;font-size:13px;font-weight:600;
        background:${k === tab ? 'var(--ink)' : 'var(--surface)'};color:${k === tab ? 'var(--emph-ink)' : 'var(--ink)'};
        border:1px solid ${k === tab ? 'transparent' : 'var(--hairline)'}">${label}</button>`).join('')}
    </div>
    <div class="body" style="padding:10px 0 0;gap:0">${cur[4]()}</div>`;

  $$('[data-back]', s).forEach((b) => b.addEventListener('click', () => R.show('board')));
  $$('[data-close]', s).forEach((b) => b.addEventListener('click', () => R.show('rooms')));
  $$('[data-tab]', s).forEach((b) => b.addEventListener('click', () => {
    tab = b.dataset.tab; ui.buzz(8); render();
  }));
  stamp(s);
}

/* the device clocks are real, like every other clock in the sim */
function stamp(s) {
  const d = new Date();
  const t = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  $$('[data-clock]', s).forEach((n) => (n.textContent = t));
  $$('[data-date]', s).forEach((n) =>
    (n.textContent = d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })));
  $$('[data-date-short]', s).forEach((n) =>
    (n.textContent = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })));
  const cap = s.querySelector('[data-canvascap]');
  if (cap && window.TRACE_APP && TRACE_APP.strokeCount) {
    const n = TRACE_APP.strokeCount(), h = TRACE_APP.handCount();
    cap.textContent = `Today’s canvas · ${n} mark${n === 1 ? '' : 's'}, ${h} hand${h === 1 ? '' : 's'}`;
  }
}

R.addScreen('surfaces', render);

/* while you're looking at them, they follow the board — a task ticked on
   her phone changes the watch complication here, without a reload */
setInterval(() => {
  if (screens.surfaces && !screens.surfaces.classList.contains('hidden')) render();
}, 3000);

/* the board's ⤴ now offers the surfaces too */
R.addRow('Board', 'surfaces', 'Every surface', () => 'Watch, lock screen, Android, tablet');
R.addNav('surfaces', () => R.show('surfaces'));

render();
})();
