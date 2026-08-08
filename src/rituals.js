/* trace — the two canvas rituals: goodnight (p3) and the prompt deck (p4).
 *
 * These are the other half of build-order step one. p2 gives the day a
 * surface; p3 gives it an ending, and p4 gives it a way to start. Without a
 * seal a shared canvas becomes an infinite scroll of guilt; without a prompt
 * most nights die on the blank page.
 */
(() => {
'use strict';
const R = window.TRACE_ROOMS, APP = window.TRACE_APP;
if (!R || !APP) return;
const { el, esc, ui, screens, show, db, save } = R;
const toast = ui.toast, buzz = ui.buzz;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

R.defaults({
  sealAt: '23:30',        /* per-couple, set once, changeable */
  sealedOn: null,         /* the date string of the last seal */
  streak: 41,
  promptIdx: 0,
  promptOrder: null,
  pinnedPrompt: null,     /* {text, day} — a caption for today only */
});

/* --------------------------------------------------------- the two screens */

for (const id of ['goodnight', 'prompt']) {
  const sec = document.createElement('section');
  sec.className = 'scr hidden';
  sec.id = 'sc-' + id;
  $('#stack').appendChild(sec);
  screens[id] = sec;
}

const today = () => new Date().toDateString();

/* ------------------------------------------------------------ p3 goodnight */

/* Seal time is a wall clock, so the countdown has to survive midnight: if
   tonight's seal has already passed, the next one is tomorrow's. */
function untilSeal() {
  const [h, m] = (db.sealAt || '23:30').split(':').map(Number);
  const t = new Date(); t.setHours(h, m, 0, 0);
  let ms = t - Date.now();
  if (ms < 0) ms += 864e5;
  return ms;
}
function clock(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const hh = Math.floor(total / 3600), mm = Math.floor(total / 60) % 60, ss = total % 60;
  return hh ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
            : `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
/* the p2 stat card wants the same number, rounded to something human */
function coarse(ms) {
  const mins = Math.max(0, Math.round(ms / 6e4));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

function renderGoodnight() {
  const s = screens.goodnight;
  const sealed = db.sealedOn === today();
  const marks = APP.strokeCount();
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Tonight</button>
      <button class="icob" data-close>✕</button></div>
    <div style="text-align:center;padding:44px 24px 0;flex:none">
      <div style="font-size:15px;color:var(--ink-70)">${sealed ? 'Tonight’s canvas is sealed' : 'Tonight’s canvas seals in'}</div>
      <div id="gn-count" style="font-size:60px;font-weight:700;letter-spacing:-.02em;color:var(--red);margin-top:6px;
        font-variant-numeric:tabular-nums">${sealed ? '—' : clock(untilSeal())}</div>
    </div>
    <div style="margin:32px 56px 0;height:240px;border-radius:24px;background:var(--surface);
      border:1px solid var(--hairline);position:relative;overflow:hidden;flex:none">
      <canvas id="gn-ink" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
      <div style="position:absolute;left:14px;bottom:12px;font-size:12px;color:var(--ink-3)">
        ${marks} mark${marks === 1 ? '' : 's'} today</div>
    </div>
    <div style="flex:1"></div>
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:0 20px 20px;flex:none">
      ${sealed
        ? `<div style="font-size:13px;color:var(--ink-3)">Sealed. It lives in Memory now.</div>
           <div class="btn-plain" data-memory>${R.counts && !R.counts() ? 'It lives in Memory' : (db.streak || 41) + ' days of you two'}</div>`
        : `<div style="font-size:13px;color:var(--ink-3)">Maya already said hers</div>
           <button class="btn-red" data-seal>Say goodnight</button>`}
      <button data-time style="font-size:13px;color:var(--ink-3);text-decoration:underline;
        text-underline-offset:3px">Seals at ${esc(db.sealAt)}</button>
    </div>`;

  const cv = $('#gn-ink', s);
  if (cv) requestAnimationFrame(() => APP.paintWidgetInk(cv));

  $$('[data-back],[data-close]', s).forEach((b) => b.addEventListener('click', () => show('canvas')));
  $$('[data-memory]', s).forEach((b) => b.addEventListener('click', () => R.openRoom('Memory')));
  $$('[data-seal]', s).forEach((b) => b.addEventListener('click', seal));
  $$('[data-time]', s).forEach((b) => b.addEventListener('click', pickSealTime));
}

function seal() {
  db.sealedOn = today();
  /* Streak counts the night either of you sealed, and a missed night pauses
     it rather than resetting — there is no version of this product where the
     app tells you that you broke something. In a quiet mode the day still
     seals; it just does not become a number. */
  if (!R.quiet || !R.quiet()) db.streak += 1;
  save();
  R.push('seal', { on: db.sealedOn, streak: db.streak });
  window.TRACE_SEALED = true;
  buzz(14);
  toast('goodnight — the canvas is sealed');
  renderGoodnight();
  paintStat();
}

function pickSealTime() {
  ui.panel('when the day ends', (body) => {
    body.appendChild(el(`<div class="p-note">The canvas seals at this hour and moves to Memory.
      One nudge, if you asked for one — it is off unless you turn it on.</div>`));
    const row = el(`<div class="p-row" style="flex-wrap:wrap"></div>`);
    for (const t of ['21:30', '22:00', '22:30', '23:00', '23:30', '00:00']) {
      const b = el(`<button class="chip" style="text-align:center;flex:0 0 30%">${t}</button>`);
      if (t === db.sealAt) { b.style.borderColor = 'var(--red)'; b.style.background = 'var(--red-wash)'; }
      b.addEventListener('click', () => {
        db.sealAt = t; save(); buzz(8); toast('the day now ends at ' + t);
        APP.closePanel ? APP.closePanel() : null;
        renderGoodnight(); paintStat();
      });
      row.appendChild(b);
    }
    body.appendChild(row);
  });
}

/* the p2 stat card and the live countdown share one timer */
function paintStat() {
  if (R.quiet && R.quiet()) return;      /* hard.js owns the display while quiet */
  const v = $('#st-goodnight');
  if (v) v.textContent = db.sealedOn === today() ? 'sealed' : coarse(untilSeal());
  const st = $('#st-streak');
  if (st) st.textContent = db.streak + ' days';
  const c = $('#gn-count');
  if (c && db.sealedOn !== today()) c.textContent = clock(untilSeal());
}
setInterval(paintStat, 1000);
paintStat();

/* tapping the countdown card is the way in — it is the only affordance p2
   has for the ritual, and a stat you can't act on is decoration */
const gnCard = $('.stat2 > div');
if (gnCard) {
  gnCard.style.cursor = 'pointer';
  gnCard.addEventListener('click', () => show('goodnight'));
}

/* -------------------------------------------------------- p4 prompt deck */

/* 52, one a week for a year, shipped locally. No server call and no
   personalisation — a prompt that knows things about you is a different,
   worse product. */
const PROMPTS = [
  'Draw the best thing you ate this week',
  'Draw where you were when you first thought about me',
  'Draw the weather inside your head',
  'Draw the thing you almost said today',
  'Draw our kitchen at 7am',
  'Draw what you want Sunday to look like',
  'Draw the last thing that made you laugh',
  'Draw me, badly, on purpose',
  'Draw the room you’d like us to have',
  'Draw what you’re carrying this week',
  'Draw a place we have never been',
  'Draw the sound of the flat when I’m out',
  'Draw the first thing you noticed about me',
  'Draw tonight, if nothing had to be done',
  'Draw the shape of today',
  'Draw something you’ve been putting off',
  'Draw what you’d cook if it were only for you',
  'Draw the view from your desk',
  'Draw a small good thing from this morning',
  'Draw where you go when you go quiet',
  'Draw us in ten years, one line only',
  'Draw the last dream you remember',
  'Draw what you’d take if we left tomorrow',
  'Draw a thing you want to be asked about',
  'Draw the song stuck in your head',
  'Draw how tired you are, as a landscape',
  'Draw the part of the day you look forward to',
  'Draw something we own that should go',
  'Draw the last time you felt properly still',
  'Draw a door you want opened',
  'Draw what you think I’m doing right now',
  'Draw the weather we deserve this weekend',
  'Draw a promise, without words',
  'Draw the smallest thing you’re grateful for',
  'Draw where you’d put a window',
  'Draw the version of you from five years ago',
  'Draw something you want to learn',
  'Draw what home smells like',
  'Draw the argument we no longer have',
  'Draw a plant we would definitely kill',
  'Draw the walk you take when you need to think',
  'Draw what you’d like me to stop worrying about',
  'Draw the meal you want on a bad day',
  'Draw the corner of the house that is yours',
  'Draw a memory you keep going back to',
  'Draw what tomorrow needs from you',
  'Draw the thing you’re proud of and never mention',
  'Draw us, but as animals',
  'Draw the light in the room right now',
  'Draw what you’d do with a free Tuesday',
  'Draw the last kind thing a stranger did',
  'Draw the year, as one line',
];

/* Fisher–Yates over indices, consumed in order and reshuffled at the end —
   a cycle you can finish, so nothing repeats before everything has shown. */
function order() {
  if (!db.promptOrder || db.promptOrder.length !== PROMPTS.length) {
    const a = PROMPTS.map((_, i) => i);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    db.promptOrder = a; db.promptIdx = 0; save();
  }
  return db.promptOrder;
}

function renderPrompt() {
  const s = screens.prompt;
  const o = order();
  const n = db.promptIdx % o.length;
  const text = PROMPTS[o[n]];
  s.innerHTML = `
    <div class="hd"><div class="pill">Prompt deck</div>
      <button class="icob" data-close>✕</button></div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:0 34px">
      <div style="position:relative;width:100%">
        <div style="position:absolute;inset:-8px 10px auto;height:100%;border-radius:26px;
          background:var(--ink-5);opacity:.18;transform:rotate(-3deg)"></div>
        <div style="position:relative;border-radius:26px;background:var(--emph);color:var(--emph-ink);
          padding:36px 30px;min-height:320px;display:flex;flex-direction:column;justify-content:space-between">
          <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--emph-red)">Tonight, together</div>
          <div class="hand" style="font-size:44px;line-height:1.1">${esc(text)}</div>
          <div style="font-size:13px;color:var(--emph-ink-3)">${n + 1} of ${PROMPTS.length} ·
            answers live on the canvas, not in a feed</div>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:12px;padding:0 20px 24px;flex:none">
      <button class="btn-plain" data-shuffle>Shuffle</button>
      <button class="btn-red" data-draw>Draw this</button>
    </div>`;
  $$('[data-close]', s).forEach((b) => b.addEventListener('click', () => show('canvas')));
  $$('[data-shuffle]', s).forEach((b) => b.addEventListener('click', () => {
    db.promptIdx = (db.promptIdx + 1) % PROMPTS.length;
    if (db.promptIdx === 0) db.promptOrder = null;      /* cycle done — reshuffle */
    save(); buzz(8); renderPrompt();
  }));
  $$('[data-draw]', s).forEach((b) => b.addEventListener('click', () => {
    db.pinnedPrompt = { text, day: today() };
    save(); buzz(10); show('canvas'); paintPin();
  }));
}

/* The deck's way in is the blank canvas, because the blank canvas is the
   problem it exists for. Once a prompt is pinned it becomes the caption, and
   the moment there is ink it gets out of the way. It never survives the
   night — a prompt is an offer, not a task. */
function paintPin() {
  const w = $('#whisper');
  if (!w) return;
  if (R.quiet && R.quiet()) { w.textContent = ''; w.classList.remove('on'); return; }
  const pin = db.pinnedPrompt;
  const pinned = pin && pin.day === today();
  const empty = APP.strokeCount() === 0;
  w.textContent = !empty ? '' : pinned ? pin.text : 'Tonight, together — need something to draw?';
  w.classList.toggle('on', empty);
  w.style.pointerEvents = empty && !pinned ? 'auto' : 'none';
  w.style.cursor = 'pointer';
}
setInterval(paintPin, 1200);
const whisper = $('#whisper');
if (whisper) whisper.addEventListener('click', () => { if (APP.strokeCount() === 0) show('prompt'); });

R.addRow('Canvas', 'prompts', 'Prompt deck', () => '52 ways to start a canvas');
R.addNav('prompts', () => show('prompt'));

R.addScreen('goodnight', renderGoodnight);
R.addScreen('prompt', renderPrompt);
renderGoodnight(); renderPrompt();
})();
