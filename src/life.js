/* trace — life happens: the unsaid (p52), newborn (p53), grief (p54),
 * moving (p55), money shock (p56).
 *
 * Four of these five put the app into a mode where it stops counting. The
 * fifth, the unsaid, never syncs at all. Between them they are the reason the
 * quiet switch in hard.js exists as one predicate rather than five flags.
 *
 * The tone rule across the block: state the fact, offer the door, say nothing
 * about how anyone should feel. p56 recalculates without a single red warning;
 * p54 tells the *other* person and never the one who is grieving.
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
  /* private, and it must stay that way — the unsaid never rides the channel */
  unsaid: [
    { id: 'u1', t: 'I think I’ve been coasting since March', days: 11, edits: 4 },
    { id: 'u2', t: 'thank you for the thing with my dad', days: 3 },
    { id: 'u3', t: 'that comment at Sam’s really landed', days: 42, let_go: true },
  ],
  nights: [
    { at: '01:20', t: 'Fed · 20 min', who: 'You' },
    { at: '02:55', t: 'Changed, back down', who: 'You' },
    { at: '03:47', t: 'Awake now', who: 'You' },
  ],
  sleep: { hers: '5h 10m', yours: '2h 40m', week: 3 },
  grief: { date: '11th of October', who: 'your dad', years: 3, dismissedYear: null },
  move: { days: 24, you: 38, them: 22 },
  moveDone: { sign: true },
  /* not `money` — p24's money truth already owns that key with another shape */
  shock: { free: 118, held: 3180, runway: 7, cancel: 94 },
});

for (const id of ['unsaid', 'newborn', 'grieving', 'moving', 'money']) {
  const sec = document.createElement('section');
  sec.className = 'scr hidden'; sec.id = 'sc-' + id;
  $('#stack').appendChild(sec);
  screens[id] = sec;
}
const back = (s, to) => $$('[data-back],[data-close]', s).forEach((b) =>
  b.addEventListener('click', () => show(to || 'rooms')));
const head = (k, h, l, big) => `<div class="head"><div class="k">${k}</div>
  <div class="h${big ? '' : ' sm'}">${h}</div>${l ? `<div class="l">${l}</div>` : ''}</div>`;

/* ================================================================ p52 the unsaid
 *
 * Per-user private state: it must be absent from the partner's device
 * entirely, so nothing here calls push(). The 90-day offer is the point — a
 * resentment that survives three months needs a person, not a text box. */

function renderUnsaid() {
  const s = screens.unsaid;
  const live = db.unsaid.filter((u) => !u.let_go);
  const gone = db.unsaid.filter((u) => u.let_go);
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>The unsaid</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      ${head('Only you can see this', 'The unsaid',
        'Things you keep meaning to say. Write them here badly, at midnight, in the wrong words. ' +
        'Send one when it’s ready — or never.', true)}
      <div class="stackcol">
        ${live.map((u) => `
          <div class="card">
            <div class="hand" style="font-size:26px;line-height:1.2">${esc(u.t)}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px">
              <span style="font-size:12px;color:var(--ink-4)">held ${u.days} days${u.edits ? ` · edited ${u.edits} times` : ''}</span>
              <button style="font-size:13px;font-weight:700;color:var(--red-text)" data-send="${u.id}">send it</button>
            </div>
          </div>`).join('')}
        ${gone.map((u) => `
          <div class="card quiet">
            <div class="hand" style="font-size:24px;line-height:1.2;color:var(--ink-3)">${esc(u.t)}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px">
              <span style="font-size:12px;color:var(--ink-4)">held ${Math.round(u.days / 7)} weeks · you let this one go</span>
              <button style="font-size:13px;color:var(--ink-4)" data-release="${u.id}">release</button>
            </div>
          </div>`).join('')}
        <button class="card" data-new style="border-style:dashed;text-align:center;color:var(--ink-3)">
          <span class="t" style="font-weight:500;color:var(--ink-3)">Write one badly</span></button>
      </div>
      <div style="padding:14px 20px 0;flex:none">
        <div class="card ink"><div class="body" style="margin:0">Anything untouched for 90 days offers to be
          deleted. Resentment that survives three months usually needs a person, not an app.</div></div>
      </div>
      <div class="spacer"></div>
      <div class="foot">Never synced, never backed up, never in search. Not even as a count.</div>
    </div>`;
  back(s);
  $$('[data-send]', s).forEach((b) => b.addEventListener('click', () => {
    const u = db.unsaid.find((x) => x.id === b.dataset.send);
    /* sending turns a private note into a canvas mark in your own hand —
       there is no "message" object in this product to turn it into */
    APP.addTextStroke(u.t, 'Caveat', 30);
    db.unsaid = db.unsaid.filter((x) => x !== u); save(); buzz(14);
    toast('said. it’s on the canvas, in your hand.');
    show('canvas');
  }));
  $$('[data-release]', s).forEach((b) => b.addEventListener('click', () => {
    db.unsaid = db.unsaid.filter((x) => x.id !== b.dataset.release); save(); buzz(8);
    toast('let go — no copy anywhere'); renderUnsaid();
  }));
  $$('[data-new]', s).forEach((b) => b.addEventListener('click', () => {
    ui.panel('write one badly', (body) => {
      const ta = el(`<textarea rows="4" placeholder="in the wrong words, at midnight"
        style="padding:14px 16px;border-radius:16px;border:1px solid var(--hairline);background:var(--surface);
        color:var(--ink);font-family:Caveat,cursive;font-weight:700;font-size:24px;outline:none;resize:none"></textarea>`);
      body.appendChild(ta);
      const save2 = el(`<button class="p-cta">Hold it</button>`);
      save2.addEventListener('click', () => {
        const t = ta.value.trim(); if (!t) return;
        db.unsaid.unshift({ id: 'u' + Date.now(), t, days: 0 }); save();
        toast('held. only you.'); renderUnsaid(); APP.closePanel && APP.closePanel();
      });
      body.appendChild(save2);
      body.appendChild(el(`<div class="p-hint">This stays on this phone. It is not in the backup.</div>`));
      ta.focus();
    });
  }));
}

/* =============================================================== p53 newborn
 *
 * The only screen in the product allowed to nag, and it nags about exactly one
 * thing: whose turn it is to sleep. Everything else is switched off. */

function renderNewborn() {
  const s = screens.newborn;
  const on = !!db.modes.newborn;
  const sl = db.sleep;
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Newborn</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      ${head(`Week ${sl.week} · newborn mode`, on ? 'You’re on until 6' : 'One of you is always on')}
      <div style="padding:18px 20px 0;flex:none">
        <div class="card ink" style="border-radius:22px;padding:20px 22px">
          <div style="display:flex;justify-content:space-between">
            <span class="lbl">She slept</span><span class="lbl">You slept</span></div>
          <div style="display:flex;justify-content:space-between;margin-top:8px">
            <span style="font-size:32px;font-weight:700">${sl.hers}</span>
            <span style="font-size:32px;font-weight:700;color:var(--emph-red)">${sl.yours}</span></div>
          <div class="d" style="margin-top:10px">Tomorrow night is hers. Trace will hold you to it —
            that’s the only thing it will nag about.</div>
        </div>
      </div>
      <div class="eyebrow">Tonight so far</div>
      <div class="stackcol" style="padding-top:0">
        ${db.nights.map((n) => `
          <div class="card line" style="border-radius:16px;padding:12px 16px">
            <span style="font-size:13px;font-weight:700;width:48px;flex:none">${esc(n.at)}</span>
            <span class="grow" style="font-size:15px">${esc(n.t)}</span>
            <span style="font-size:12px;color:var(--ink-4)">${esc(n.who)}</span></div>`).join('')}
        <button class="card" data-log style="border-style:dashed;text-align:center;color:var(--ink-3)">
          <span class="t" style="font-weight:500;color:var(--ink-3)">Log one, one tap</span></button>
      </div>
      <div class="spacer"></div>
      <div style="padding:0 20px;flex:none">
        <div class="note">Streaks, missions, prompts and the fair split are all off. Nothing in here
          becomes a score you have to look at later.</div>
      </div>
      <div style="padding:14px 20px 10px;flex:none">
        <button class="${on ? 'btn-plain' : 'btn-red'}" data-toggle>${on ? 'We’re through it' : 'Turn on newborn mode'}</button>
      </div>
      <div class="foot">It ends when you say so, not on a schedule.</div>
    </div>`;
  back(s);
  $$('[data-toggle]', s).forEach((b) => b.addEventListener('click', () => {
    R.setMode('newborn', !db.modes.newborn); buzz(10);
    toast(db.modes.newborn ? 'everything else is off' : 'welcome back');
    renderNewborn();
  }));
  $$('[data-log]', s).forEach((b) => b.addEventListener('click', () => {
    const at = new Date().toTimeString().slice(0, 5);
    db.nights.push({ at, t: 'Up again', who: 'You' }); save(); R.push('night', { at }); buzz(8);
    renderNewborn();
  }));
}

/* ================================================================== p54 grief
 *
 * The one date Trace treats differently, and the asymmetry is the design: it
 * warns the other person and never the one who is grieving. Three doors, one
 * of which is "nothing, thanks" — and that one has to actually work, for a
 * whole year, or the screen is a lie. */

function renderGrief() {
  const s = screens.grieving;
  s.dataset.ground = 'deep';
  const g = db.grief;
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Today</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:20px 34px 0">
        <div style="font-size:14px;color:var(--ink-3)">Today is the ${esc(g.date)}</div>
        <div style="font-size:30px;font-weight:700;letter-spacing:-.02em;line-height:1.25;margin-top:8px">
          ${g.years} years since ${esc(g.who)}.</div>
        <div style="font-size:15px;line-height:1.6;color:var(--ink-2);margin-top:16px">Maya knows. Trace told her
          quietly this morning, the way you asked it to. She hasn’t been asked to do anything about it.</div>
        <div style="display:flex;flex-direction:column;gap:9px;margin-top:30px">
          <button class="card" data-g="canvas"><div class="t">Show me the canvas from that week</div>
            <div class="d">You drew every night. She sat with you.</div></button>
          <button class="card" data-g="empty"><div class="t">Keep the day empty</div>
            <div class="d">Trace blocks the calendar. No one asks why.</div></button>
          <button class="card ink" data-g="none"><div class="t">Nothing, thanks</div>
            <div class="d">It closes and doesn’t mention it again this year.</div></button>
        </div>
      </div>
      <div style="padding:26px 20px 0;flex:none">
        <div class="note">Hard anniversaries are the one date Trace treats differently: it warns the
          <em>other</em> person, and never the one who is grieving.</div>
      </div>
      <div class="foot">No streak breaks today. Nothing does.</div>
    </div>`;
  back(s);
  $$('[data-g]', s).forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.g; buzz(10);
    if (k === 'canvas') { R.openRoom('Memory'); return; }
    if (k === 'empty') { toast('the day is blocked. nobody is told why.'); show('rooms'); return; }
    /* "doesn't mention it again this year" has to be literal */
    g.dismissedYear = new Date().getFullYear(); save();
    toast('closed. not again this year.');
    show('canvas');
  }));
}
/* the grief mode quiets the machinery for the day, like the others */
function griefToday() {
  const g = db.grief;
  return g.dismissedYear !== new Date().getFullYear();
}

/* ================================================================= p55 moving
 *
 * A split bar where both halves are effort, not blame — and a checklist that
 * is one project rather than two lists that drift apart. */

const MOVE_STAGES = [
  { id: 'sign', t: 'Before you sign', d: 'Survey · deposit · read the small print together' },
  { id: 'four', t: 'Four weeks out — now', d: 'Movers booked ✓ · council ✓ · redirect post · broadband · school letter', now: true, left: 3 },
  { id: 'week', t: 'The last week', d: 'Pack the kitchen last · meter readings · keys' },
  { id: 'after', t: 'First night', d: 'Kettle, bedding, and one box marked OPEN FIRST' },
];

function renderMoving() {
  const s = screens.moving;
  const m = db.move;
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Moving</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      ${head(`Moving · ${m.days} days out`, 'One project, two people')}
      <div style="padding:18px 24px 0;flex:none">
        <div style="height:10px;border-radius:99px;background:var(--ground-alt);overflow:hidden;display:flex">
          <div style="width:${m.you}%;background:var(--ink)"></div>
          <div style="width:${m.them}%;background:var(--red)"></div>
        </div>
        <div style="display:flex;justify-content:space-between;padding-top:8px;font-size:12px;color:var(--ink-3)">
          <span>${m.you}% you</span><span>${m.them}% Maya</span><span>${m.you + m.them}% done</span></div>
      </div>
      <div class="stackcol">
        ${MOVE_STAGES.map((st) => {
          const done = !!db.moveDone[st.id];
          return `<button class="card${st.now && !done ? ' pick' : ''}" data-stage="${st.id}">
            <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px">
              <span class="t" style="font-size:15px">${esc(st.t)}</span>
              <span style="font-size:12px;font-weight:700;color:var(--red-text);flex:none">
                ${done ? 'done' : st.left ? st.left + ' left' : ''}</span></div>
            <div class="d">${st.d}</div></button>`;
        }).join('')}
      </div>
      <div class="spacer"></div>
      <div style="padding:0 20px;flex:none">
        <div class="note">Whoever has the time takes the next thing. Trace shows the split so nobody
          has to keep the tally in their head — it never says who is behind.</div>
      </div>
      <div class="actions" style="padding-top:14px">
        <button class="btn-red" data-claim>Take the next thing</button>
      </div>
    </div>`;
  back(s);
  $$('[data-stage]', s).forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.stage;
    db.moveDone[k] = !db.moveDone[k]; save(); R.push('move', { stage: k }); buzz(8); renderMoving();
  }));
  $$('[data-claim]', s).forEach((b) => b.addEventListener('click', () => {
    db.move = { ...m, you: Math.min(100 - m.them, m.you + 6) }; save();
    R.push('move', { you: db.move.you }); buzz(12); toast('yours — she sees it move');
    renderMoving();
  }));
}

/* =========================================================== p56 money shock
 *
 * Recalculated the day it noticed, with no alert and no advice. The list of
 * what it quietly stopped saying is longer than the list of what it says. */

function renderMoney() {
  const s = screens.money;
  const m = db.shock;
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Money</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      ${head('Since the 1st', 'One income, for now',
        'Trace recalculated everything the day it noticed. No alert, no red warnings, no advice.')}
      <div style="padding:18px 20px 0;flex:none">
        <div class="sheet">
          <div class="r"><span class="k">Free to spend</span><span class="v" style="font-size:22px">€${m.free}</span></div>
          <div class="r"><span class="k">Kyoto, paused</span>
            <span class="v" style="font-weight:600;color:var(--ink-3)">€${m.held.toLocaleString()} held</span></div>
          <div class="r"><span class="k">Runway at this rate</span>
            <span class="v red" style="font-size:22px">${m.runway} months</span></div>
        </div>
      </div>
      <div class="eyebrow">Quietly stopped</div>
      <div style="padding:0 20px;flex:none">
        <div class="note" style="border-style:solid">The savings nudge · the gym renewal ·
          “you’re 60% to Kyoto” · anything that would feel like a jab this month.</div>
      </div>
      <div style="padding:14px 20px 0;flex:none">
        <div class="card ink" style="border-radius:20px;padding:18px">
          <div class="t">Three things you can cancel today</div>
          <div class="d" style="line-height:1.5">€${m.cancel}/mo, already found. Trace won’t do it for
            you and won’t ask twice.</div>
          <button data-show style="width:100%;height:44px;border-radius:999px;background:var(--red);
            color:var(--on-red);font-size:15px;font-weight:600;margin-top:14px">Show me</button>
        </div>
      </div>
      <div class="spacer"></div>
      <div class="foot">Nothing here is on her widget unless you put it there.</div>
    </div>`;
  back(s);
  $$('[data-show]', s).forEach((b) => b.addEventListener('click', () => {
    ui.panel('three things', (body) => {
      body.appendChild(el(`<div class="p-note">Found by looking at what renews, not at what you
        spend. Trace cancels nothing — these are three links and a total.</div>`));
      for (const [t, cost] of [['A streaming tier you both forgot', '€17'],
                               ['The gym, unused since May', '€49'],
                               ['Cloud storage, 2 TB of duplicates', '€28']]) {
        body.appendChild(el(`<div class="chip" style="display:flex;justify-content:space-between">
          <span>${t}</span><b>${cost}/mo</b></div>`));
      }
      body.appendChild(el(`<div class="p-hint">It won’t ask about these again.</div>`));
    });
    buzz(8);
  }));
}

/* ------------------------------------------------------------------ wiring */

R.addScreen('unsaid', renderUnsaid);
R.addScreen('newborn', renderNewborn);
R.addScreen('grieving', renderGrief);
R.addScreen('moving', renderMoving);
R.addScreen('money', renderMoney);

R.addBeyond('The unsaid', 'Held here, private, until you mean it', 'unsaid');
R.addBeyond('Newborn mode', 'Whose turn to sleep — the only nag', 'newborn');
R.addBeyond('A hard anniversary', 'The date it remembers so you don’t have to', 'grieving');
R.addBeyond('Moving', 'One project, two people', 'moving');
R.addBeyond('Money changed', 'Recalculated, without the warnings', 'money');

renderUnsaid(); renderNewborn(); renderGrief(); renderMoving(); renderMoney();

/* the grief date lands on the canvas as a quiet offer, once, and only if it
   was not dismissed this year — never as a notification */
if (griefToday()) R.griefPending = true;
})();
