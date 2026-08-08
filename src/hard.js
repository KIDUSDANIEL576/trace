/* trace — the hard parts: repair (p46), cover me (p47), every interruption
 * (p50) and the end (p51).
 *
 * The README puts these before "everything else" for a reason: they are cheap
 * now and expensive to retrofit, and they are the reason anyone trusts the app
 * with the ordinary days. Three of the four are about the app doing *less*.
 *
 * The one piece of architecture here is `quiet` — the README asks for a single
 * "quiet the machinery" switch rather than a conditional per feature, because
 * repair, cover, newborn and grief all want the same silence and a per-feature
 * flag will always miss one.
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
  modes: {},              /* repair | cover | newborn | grief | guest | armour | solo | visitor */
  covered: [],            /* task ids handed over */
  ended: null,            /* 'pause' | 'closed' — the app's last state */
});

/* p50 is the honest list, so it has to be the same list the push path reads.
   `db.loud` is that store (flows.js owns the fuller per-kind panel); these are
   the four the spec permits, projected onto it. A screen that promises to
   silence something and writes to a key nobody reads is worse than no screen. */
const LOUD_KEY = { leave: 'leave', agreed: 'agreed', goodnight: 'goodnight' };
const isLoud = (k) => (db.loud || {})[LOUD_KEY[k]] !== 'off';
const setLoud = (k, on) => {
  db.loud = db.loud || {};
  db.loud[LOUD_KEY[k]] = on ? (k === 'goodnight' ? 'banner' : 'banner') : 'off';
  save();
};

/* =========================================================== quiet the machinery
 *
 * One switch, four doors. Anything that counts, congratulates, nags or scores
 * asks this before it speaks. Adding a fifth hard mode should not mean editing
 * five features — it should mean adding a name to this list. */

const QUIET_MODES = ['repair', 'cover', 'newborn', 'grief'];
function quiet() { return QUIET_MODES.some((m) => db.modes[m]); }
function quietReason() { return QUIET_MODES.find((m) => db.modes[m]) || null; }
window.TRACE_QUIET = quiet;

function setMode(name, on) {
  db.modes[name] = !!on;
  if (!on) delete db.modes[name];
  save();
  R.push('mode', { name, on: !!on });
  document.documentElement.classList.toggle('is-quiet', quiet());
  window.dispatchEvent(new Event('quietchange'));
  R.paint && R.paint();
}
R.quiet = quiet;
R.setMode = setMode;
document.documentElement.classList.toggle('is-quiet', quiet());

/* The switch is worthless without consumers, so this is the machinery it
   actually silences, in one place: the streak stops counting, the goodnight
   countdown stops nagging, and the prompt deck stops offering itself. README:
   "Build this as one shared 'quiet the machinery' switch rather than
   per-feature conditionals."
   Everything here is a read, so a mode pauses the machinery — it never
   destroys anything, and leaving the mode restores the real numbers. */
function paintQuiet() {
  const on = quiet();
  const st = $('#st-streak');
  if (st) {
    st.style.opacity = on ? .4 : 1;
    st.textContent = on ? 'paused' : (db.streak || 41) + ' days';
  }
  const gn = $('#st-goodnight');
  if (gn && on) gn.textContent = '—';
  const w = $('#whisper');            /* where the prompt deck offers itself */
  if (w && on) { w.textContent = ''; w.classList.remove('on'); }
}
window.addEventListener('quietchange', paintQuiet);
setInterval(paintQuiet, 1200);

/* what the rest of the app asks before it counts, offers or records */
R.counts = () => !quiet();
R.offers = () => !quiet();
R.records = () => !quiet();

/* ---------------------------------------------------------------- screens */

for (const id of ['repair', 'cover', 'interrupt', 'theend']) {
  const sec = document.createElement('section');
  sec.className = 'scr hidden';
  sec.id = 'sc-' + id;
  $('#stack').appendChild(sec);
  screens[id] = sec;
}
const back = (s, to) => $$('[data-back],[data-close]', s).forEach((b) =>
  b.addEventListener('click', () => show(to || 'rooms')));

/* =================================================================== p46 repair
 *
 * The screen is mostly an absence. Nothing here asks what happened, scores it,
 * or writes it down — the three things a product is most tempted to do with a
 * fight, and the three that would make the app unsafe to keep open. */

function renderRepair() {
  const s = screens.repair;
  s.dataset.ground = 'alt';
  const on = !!db.modes.repair;
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Repair</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
    <div class="head" style="padding-top:34px">
      <div class="k">Somebody said it first</div>
      <div class="h">We’re not okay right now</div>
      <div class="l">Trace has gone quiet. No streaks, no missions, no prompts, no cheerful
        anything — until one of you comes back.</div>
    </div>
    <div style="display:flex;flex-direction:column;align-items:center;padding:26px 0 0;flex:none">
      <svg viewBox="0 0 200 90" style="width:200px;height:90px">
        <path d="M14 34 C40 10,58 52,86 26" stroke="var(--ink)" stroke-width="6"
          fill="none" stroke-linecap="round"></path>
        <path d="M114 62 C142 38,160 80,186 56" stroke="var(--red)" stroke-width="6"
          fill="none" stroke-linecap="round"></path>
      </svg>
      <div style="font-size:12px;color:var(--ink-4)">two marks, not touching</div>
    </div>
    <div class="stackcol">
      <button class="card" data-act="line"><div class="t">Leave a line, don’t discuss it</div>
        <div class="d">One drawing. No reply expected tonight.</div></button>
      <button class="card" data-act="sleep"><div class="t">Sleep on it — ask me tomorrow at 9</div>
        <div class="d">Trace will bring it up once, gently, then drop it.</div></button>
      <button class="card ink" data-act="ready"><div class="t">I’m ready to talk</div>
        <div class="d">She sees it only when she opens the app. Never a buzz.</div></button>
    </div>
    <div class="spacer"></div>
    <div style="padding:0 20px;flex:none">
      <div class="note">Trace never asks what happened, never scores it, never remembers it in
        the journal. The day just goes quiet.</div>
    </div>
    <div style="padding:14px 20px 10px;flex:none">
      <button class="${on ? 'btn-plain' : 'btn-red'}" data-toggle>${on ? 'We’re alright now' : 'Go quiet'}</button>
    </div>
    <div class="foot">Either of you can end it. Nobody has to apologise to a phone.</div>
    </div>`;
  back(s);
  $$('[data-toggle]', s).forEach((b) => b.addEventListener('click', () => {
    setMode('repair', !db.modes.repair);
    buzz(10);
    toast(db.modes.repair ? 'the app has gone quiet' : 'welcome back');
    renderRepair();
  }));
  $$('[data-act]', s).forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (!db.modes.repair) setMode('repair', true);
    if (a === 'line') { show('canvas'); toast('one line. no reply expected.'); }
    if (a === 'sleep') { db.repairAsk = Date.now() + 864e5; save(); toast('once tomorrow, then dropped'); renderRepair(); }
    /* "ready" is deliberately not a notification — it waits on her side */
    if (a === 'ready') { R.push('repair-ready', {}); toast('she’ll see it when she opens the app'); }
    buzz(10);
  }));
}

/* =============================================================== p47 cover me
 *
 * The interesting part is the fourth row. Trace can move what it owns and
 * nothing else, so work stays put and says so — a handover screen that
 * pretended to cancel a board meeting would be lying about the one thing the
 * person is anxious about. */

function coverables() {
  const open = db.tasks.filter((t) => !db.done[t.id] && t.who !== 'Maya');
  return open.map((t) => ({ id: t.id, title: t.title, meta: t.meta, movable: true }))
    .concat([{ id: 'work', title: 'Board review, 2 PM', meta: 'Yours — Trace can’t cancel work', movable: false }]);
}

function renderCover() {
  const s = screens.cover;
  const on = !!db.modes.cover;
  const rows = coverables();
  const moving = rows.filter((r) => r.movable).length;
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Cover me</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
    <div class="head">
      <div class="k">${on ? 'Maya has you' : 'You’re ill'}</div>
      <div class="h">${on ? 'She’s got it today' : 'Cover me today'}</div>
      <div class="l">One tap moves everything of yours to Maya — with the briefs attached,
        so she doesn’t have to ask.</div>
    </div>
    <div class="eyebrow">${on ? 'Moved to her' : 'Moving to her'} · ${moving} thing${moving === 1 ? '' : 's'}</div>
    <div class="stackcol" style="padding-top:0">
      ${rows.map((r) => `
        <div class="row${r.movable ? '' : ' quiet'}" style="${r.movable ? '' : 'background:var(--ground-alt)'}">
          <span class="grow"><span class="n" style="font-size:15px">${esc(r.title)}</span>
            <span class="s">${esc(r.meta || '')}</span></span>
          <span style="font-size:12px;font-weight:700;color:${r.movable ? 'var(--red-text)' : 'var(--ink-4)'}">
            ${r.movable ? '→ Maya' : 'stays'}</span>
        </div>`).join('')}
      <div class="card ink" style="margin-top:6px">
        <div class="lbl">Also switched off</div>
        <div class="body">Streaks paused · missions skipped · fair split not counted today ·
          nothing asks anything of you until tomorrow.</div>
      </div>
    </div>
    <div class="actions" style="padding-top:14px">
      <button class="${on ? 'btn-plain' : 'btn-red'}" data-hand>${on ? 'I’ve got it back' : 'Hand it all over'}</button>
    </div>
    <div class="foot">Works for a bad day too. You don’t have to be sick.</div>
    </div>`;
  back(s);
  $$('[data-hand]', s).forEach((b) => b.addEventListener('click', () => {
    const next = !db.modes.cover;
    db.covered = next ? rows.filter((r) => r.movable).map((r) => r.id) : [];
    setMode('cover', next);
    buzz(14);
    toast(next ? 'handed over — she has the briefs' : 'yours again');
    renderCover();
  }));
}

/* ========================================================= p50 interruptions
 *
 * Four things, listed where anyone can count them. The flare has no toggle
 * because a flare you can mute is not a flare; the other three do, and
 * goodnight ships off. */

const INTERRUPTS = [
  { id: 'flare', t: 'The flare', d: '3 a year · breaks everything, by design', fixed: true },
  { id: 'leave', t: 'Leaving now', d: 'Only when someone starts moving home' },
  { id: 'agreed', t: 'A reminder you both agreed to', d: 'Never one person’s idea alone' },
  { id: 'goodnight', t: 'Goodnight, if you want it', d: 'One nudge at your hour · off by default' },
];

function renderInterrupt() {
  const s = screens.interrupt;
  const L = { leave: isLoud('leave'), agreed: isLoud('agreed'), goodnight: isLoud('goodnight') };
  const silenced = !L.leave && !L.agreed && !L.goodnight;
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Interruptions</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
    <div class="head">
      <div class="k">The honest list</div>
      <div class="h sm">Everything that can ping you</div>
      <div class="l">Four things. That’s the entire set — there is no hidden fifth.</div>
    </div>
    <div class="stackcol">
      ${INTERRUPTS.map((i) => i.fixed
        ? `<div class="card ink" style="display:flex;align-items:center;gap:14px">
             <span style="flex:1"><span class="t">${i.t}</span><div class="d">${i.d}</div></span>
             <span style="font-size:12px;font-weight:700;color:var(--emph-red)">always</span></div>`
        : `<button class="card" data-loud="${i.id}" style="display:flex;align-items:center;gap:14px">
             <span style="flex:1"><span class="t">${i.t}</span><div class="d">${i.d}</div></span>
             <span class="sw${L[i.id] ? ' on' : ''}"><i></i></span></button>`).join('')}
    </div>
    <div class="eyebrow">Never notifies · ever</div>
    <div style="padding:0 20px;flex:none">
      <div class="note" style="border-style:solid">Her drawings · your streak · missions · the journal ·
        mood weather · anything a room wants to say about itself. They wait on the widget until you look.</div>
    </div>
    <div class="spacer"></div>
    <div class="actions">
      <button class="btn-ink" data-silence>${silenced ? 'Turn the three back on' : 'Silence everything but the flare'}</button>
    </div>
    </div>`;
  back(s);
  $$('[data-loud]', s).forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.loud; setLoud(k, !L[k]); buzz(8); renderInterrupt();
  }));
  $$('[data-silence]', s).forEach((b) => b.addEventListener('click', () => {
    const next = silenced;
    setLoud('leave', next); setLoud('agreed', next); setLoud('goodnight', false);
    buzz(10);
    toast(next ? 'back on — except goodnight' : 'only the flare can reach you now');
    renderInterrupt();
  }));
}

/* ==================================================================== p51 the end
 *
 * Written on day one, before there were users. Everything here is a promise
 * the code has to be able to keep, which is why the archive is "both keep"
 * rather than "primary account holder keeps". */

const ENDINGS = [
  ['Every canvas, full quality', 'both keep'],
  ['Chapters &amp; the printed book', 'both keep'],
  ['The gratitude jar', 'opens early', true],
  ['Your pocket', 'deleted, unread'],
];

function renderEnd() {
  const s = screens.theend;
  s.dataset.ground = 'alt';
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>The end</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
    <div class="head" style="padding-top:26px">
      <div class="k">If it ends</div>
      <div class="h sm">Everything is yours to take</div>
      <div class="l">We wrote this screen on day one, before we had users. An app that holds a
        relationship has to say what happens when the relationship stops.</div>
    </div>
    <div style="padding:18px 20px 0;flex:none">
      <div class="sheet">
        ${ENDINGS.map(([k, v, red]) => `<div class="r"><span class="k">${k}</span>
          <span class="v${red ? ' red' : ''}">${v}</span></div>`).join('')}
      </div>
    </div>
    <div class="eyebrow">Three ways to close it</div>
    <div class="stackcol" style="padding-top:0">
      <button class="card" data-end="pause"><div class="t">Pause</div>
        <div class="d">Everything freezes. Nothing deletes. Come back any time.</div></button>
      <button class="card" data-end="closed"><div class="t">Close the book</div>
        <div class="d">Both get the full archive. The canvas stops. No last message.</div></button>
      <button class="card ink" data-end="died"><div class="t">If one of you dies</div>
        <div class="d">The other keeps everything, forever, free. Named person can be added.</div></button>
    </div>
    <div class="spacer"></div>
    <div class="foot">No hostage-taking, no export fee, no “are you sure” three times.</div>
    </div>`;
  back(s);
  /* One confirm, in place, and it says what it does. The frame's own footer
     rules out the three-modal exit ramp, so the button becomes the ramp. */
  $$('[data-end]', s).forEach((b) => b.addEventListener('click', () => {
    const kind = b.dataset.end;
    if (kind === 'died') { openLegacy(); return; }
    const t = $('.t', b);
    if (!b.dataset.armed) {
      b.dataset.armed = '1';
      b.style.borderColor = 'var(--red)';
      t.textContent = kind === 'pause' ? 'Tap again to pause everything' : 'Tap again — both archives are sent first';
      setTimeout(() => { if (b.isConnected && b.dataset.armed) renderEnd(); }, 5000);
      return;
    }
    db.ended = kind; save(); R.push('ended', { kind }); buzz(16);
    toast(kind === 'pause' ? 'paused. nothing was deleted.' : 'closed. the archive is on its way to you both.');
    renderEnd();
  }));
}

function openLegacy() {
  ui.panel('a named person', (body) => {
    body.appendChild(el(`<div class="p-note">If one of you dies, the other keeps every canvas,
      chapter and jar entry, forever, at no cost. You can also name someone who may be given a
      copy — a parent, a sibling, a child.</div>`));
    const inp = el(`<input placeholder="their name and email" style="padding:14px 16px;border-radius:16px;
      border:1px solid var(--hairline);background:var(--surface);color:var(--ink);font:15px inherit;outline:none">`);
    inp.value = db.legacy || '';
    body.appendChild(inp);
    const b = el(`<button class="p-cta">Save</button>`);
    b.addEventListener('click', () => { db.legacy = inp.value.trim(); save(); toast('saved on this phone'); });
    body.appendChild(b);
    body.appendChild(el(`<div class="p-hint">Nothing is sent to them now, and they are never told.</div>`));
  });
}

/* ------------------------------------------------------------------ wiring */

R.addScreen('repair', renderRepair);
R.addScreen('cover', renderCover);
R.addScreen('interrupt', renderInterrupt);
R.addScreen('theend', renderEnd);
window.addEventListener('quietchange', renderRepair);

R.addBeyond('Repair', 'When you’re not okay — the app goes quiet', 'repair', 'The hard parts');
R.addBeyond('Cover me', 'Hand your whole day over, briefs attached', 'cover', 'The hard parts');
R.addBeyond('Every interruption', 'The four things that can ping you', 'interrupt', 'The hard parts');
R.addBeyond('If it ends', 'Pause, close the book, or outlive it', 'theend', 'The hard parts');

renderRepair(); renderCover(); renderInterrupt(); renderEnd();
})();
