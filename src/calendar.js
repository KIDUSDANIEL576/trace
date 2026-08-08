/* trace — the calendar block: find a time (p28), new event (p41), the clash
 * (p42), trips (p43), anniversaries (p44), and the two clocks (p5).
 *
 * The thread running through all of these is that Trace proposes and never
 * decides. It reads both calendars and offers windows; it lays three doors on
 * the table for a clash and picks none of them; it notices a passport expires
 * and does not renew it. The moment it decides, the couple is arguing with an
 * app instead of with each other.
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
  findKind: 'dinner',
  trip: { name: 'Kyoto', days: 241, have: 3180, goal: 5000, weekly: 60 },
  tripPrep: { off: true },
  dates: [
    { t: 'Your first canvas', s: 'One year · Trace made a movie', when: 'Sep 2', soon: true },
    { t: 'Leo starts school', s: 'Both of you, no meetings', when: 'Sep 4' },
    { t: 'Her mum’s birthday', s: 'You always remember this one', when: 'Sep 19' },
    { t: 'The flat, two years', s: 'Chapter 3 closed here', when: 'Oct 1' },
  ],
  clash: { on: true, day: 'Saturday 21', a: 'Sam’s birthday', b: 'your mum’s lunch' },
  clashPicked: null,
  draft: null,
});

for (const id of ['findtime', 'newevent', 'clash', 'trip', 'dates', 'clocks']) {
  const sec = document.createElement('section');
  sec.className = 'scr hidden';
  sec.id = 'sc-' + id;
  $('#stack').appendChild(sec);
  screens[id] = sec;
}
const back = (s, to) => $$('[data-back],[data-close]', s).forEach((b) =>
  b.addEventListener('click', () => show(to || 'rooms')));
const head = (k, h, l) => `<div class="head"><div class="k">${k}</div>
  <div class="h sm">${h}</div>${l ? `<div class="l">${l}</div>` : ''}</div>`;

/* ============================================================= p28 find a time
 *
 * The dashed note at the bottom is the feature. Any tool can list free slots;
 * saying out loud what it removed — and that it removed anything after 10 PM —
 * is what makes someone trust the three it kept. */

const KINDS = [['dinner', 'Dinner'], ['call', 'A call'], ['day', 'A whole day']];
const WINDOWS = {
  dinner: [
    { t: 'Saturday 10, evening', s: 'Nothing on either side · her best energy', best: true },
    { t: 'Tuesday 12, lunch', s: '90 min window · you’re both sharp' },
    { t: 'Sunday 17, all day', s: 'Co-signed no-plans day — protected' },
  ],
  call: [
    { t: 'Today, 21:10', s: 'After Leo’s bedtime · 40 min', best: true },
    { t: 'Thursday, 13:00', s: 'Both between meetings' },
    { t: 'Saturday 10, morning', s: 'Slow start on both sides' },
  ],
  day: [
    { t: 'Sunday 17', s: 'Co-signed no-plans day — protected', best: true },
    { t: 'Saturday 23', s: 'Nothing booked, either side' },
    { t: 'Monday 25', s: 'Bank holiday · you both have it' },
  ],
};
const SKIPPED = 'Skipped: Thursday (dentist), Friday (Sam’s), Wednesday (her late shift), ' +
  'and anything after 10 PM.';

function renderFind() {
  const s = screens.findtime;
  const kind = db.findKind;
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Find a time</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      ${head('Plan something', 'Find a time',
        'Trace reads both calendars and only shows windows you’re both actually free — and awake.')}
      <div class="seg">${KINDS.map(([k, l]) =>
        `<button data-kind="${k}" class="${k === kind ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="eyebrow">Both free · next 10 days</div>
      <div class="stackcol" style="padding-top:0">
        ${WINDOWS[kind].map((w) => `
          <button class="card line${w.best ? ' pick' : ''}" data-win="${esc(w.t)}">
            <span class="grow"><span class="t" style="font-size:16px">${esc(w.t)}</span>
              <span class="d">${esc(w.s)}</span></span>
            ${w.best ? '<span class="who free">best</span>' : '<span class="chev">›</span>'}
          </button>`).join('')}
        <div class="note">${SKIPPED}</div>
      </div>
      <div class="spacer"></div>
      <div class="actions">
        <button class="btn-red" data-ask>Ask Maya</button>
        <button class="btn-plain" style="flex:0 0 130px" data-book>Just book</button>
      </div>
    </div>`;
  back(s);
  $$('[data-kind]', s).forEach((b) => b.addEventListener('click', () => {
    db.findKind = b.dataset.kind; save(); buzz(6); renderFind();
  }));
  let picked = WINDOWS[kind].find((w) => w.best).t;
  $$('[data-win]', s).forEach((b) => b.addEventListener('click', () => {
    picked = b.dataset.win;
    $$('[data-win]', s).forEach((x) => x.classList.toggle('pick', x === b));
    buzz(6);
  }));
  /* "Ask" is a reminder both people agreed to only once she says yes, so it
     waits on her board rather than ringing her now. */
  $$('[data-ask]', s).forEach((b) => b.addEventListener('click', () => {
    R.push('ask', { when: picked, kind }); buzz(12);
    toast('asked — it’s on her board, not her lock screen'); show('rooms');
  }));
  $$('[data-book]', s).forEach((b) => b.addEventListener('click', () => {
    db.week.items.push({ t: picked.toLowerCase(), c: 'ink' }); save(); R.push('week', db.week);
    buzz(12); toast('booked for both of you'); show('rooms');
  }));
}

/* =============================================================== p41 new event
 *
 * "Trace noticed" is the whole screen. The event is four fields; the value is
 * the three consequences nobody would have thought of until Friday evening. */

function renderNew() {
  const s = screens.newevent;
  const d = db.draft || { what: '', when: 'Fri 8, 7 PM', who: 'Both of us', remind: 'Day before' };
  s.innerHTML = `
    <div class="hd" style="padding:12px 12px 0">
      <button style="font-size:15px;color:var(--ink-70);min-height:44px;padding:0 12px" data-close>Cancel</button>
      <div style="font-size:17px;font-weight:600">New event</div>
      <button style="font-size:15px;font-weight:700;color:var(--red-text);min-height:44px;padding:0 12px" data-save>Save</button>
    </div>
    <div class="page">
      <div style="padding:18px 20px 0;flex:none">
        <div class="card" style="border-width:1px">
          <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-4)">What</div>
          <input id="ev-what" placeholder="dinner at Sam’s" value="${esc(d.what)}"
            style="width:100%;min-height:44px;border:0;background:none;color:var(--ink);margin-top:4px;
            font-family:Caveat,cursive;font-weight:700;font-size:30px;caret-color:var(--red)">
        </div>
      </div>
      <div style="display:flex;gap:10px;padding:12px 20px 0;flex:none">
        <div class="card" style="flex:1;border-radius:16px;padding:14px 16px">
          <div style="font-size:11px;color:var(--ink-3)">When</div>
          <div style="font-size:17px;font-weight:700;margin-top:2px">${esc(d.when)}</div></div>
        <div class="card" style="flex:1;border-radius:16px;padding:14px 16px">
          <div style="font-size:11px;color:var(--ink-3)">For</div>
          <div style="font-size:17px;font-weight:700;margin-top:2px">${esc(d.who)}</div></div>
      </div>
      <div class="eyebrow">Trace noticed</div>
      <div class="stackcol" style="padding-top:0">
        <div class="card line warn" style="border-radius:16px;padding:13px 16px">
          <span class="grow" style="font-size:14px">Maya works till 6 — she’ll be late</span>
          <button class="end red" data-fix="shift">shift it?</button></div>
        <button class="card line" style="border-radius:16px;padding:13px 16px" data-fix="wine">
          <span class="grow" style="font-size:14px">Bring wine — added to Groceries</span>
          <span class="end">✓</span></button>
        <button class="card line" style="border-radius:16px;padding:13px 16px" data-fix="sitter">
          <span class="grow" style="font-size:14px">Leo needs a sitter</span>
          <span class="end red">book</span></button>
      </div>
      <div class="eyebrow">Remind us</div>
      <div style="display:flex;gap:8px;padding:0 20px;flex-wrap:wrap;flex:none">
        ${['Day before', 'Two hours', 'When I leave work', 'Never'].map((t) =>
          `<button data-remind="${t}" class="chipbtn" style="padding:0 15px;border-radius:999px;font-size:13px;
            font-weight:${t === d.remind ? 600 : 400};
            background:${t === d.remind ? 'var(--emph)' : 'var(--surface)'};
            color:${t === d.remind ? 'var(--emph-ink)' : 'var(--ink)'};
            border:1px solid ${t === d.remind ? 'transparent' : 'var(--hairline)'}">${t}</button>`).join('')}
      </div>
      <div class="foot">A reminder both of you can see is the only kind that may ring.</div>
    </div>`;
  back(s, 'rooms');
  const what = $('#ev-what', s);
  what.addEventListener('input', () => { d.what = what.value; db.draft = d; save(); });
  $$('[data-remind]', s).forEach((b) => b.addEventListener('click', () => {
    d.remind = b.dataset.remind; db.draft = d; save(); buzz(6); renderNew();
  }));
  $$('[data-fix]', s).forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const k = b.dataset.fix;
    if (k === 'shift') { d.when = 'Fri 8, 7:30 PM'; db.draft = d; save(); toast('shifted to 7:30 — she makes it'); renderNew(); }
    if (k === 'wine') { db.items.push({ id: 'g' + Date.now(), name: 'Wine for Sam’s', who: 'Both' }); save(); toast('on the list'); }
    if (k === 'sitter') toast('asked in the people layer');
    buzz(8);
  }));
  $$('[data-save]', s).forEach((b) => b.addEventListener('click', () => {
    const t = what.value.trim();
    /* Refusing to save an untitled event is right; refusing in silence is not.
       This used to be `what.focus(); return;` — and focus() is invisible (there
       is no :focus rule in the sheet) and does nothing at all when the field is
       already focused, which is the normal case, because you have to tap into
       the field to discover it is required. So the one control on this screen
       that answered a tap with nothing was the one that needed to explain
       itself. Every sibling handler above ends in a buzz and a toast; so does
       this one now. */
    if (!t) { what.focus(); buzz(6); toast('give it a name first'); return; }
    db.week.items.push({ t, c: 'ink' });
    db.draft = null; save(); R.push('week', db.week); buzz(12);
    toast('in both calendars, in your hand');
    show('rooms');
  }));
}

/* ================================================================= p42 clash
 *
 * Three doors and no verdict. Trace lays them on the table so the argument is
 * about the choice rather than about who forgot. */

const DOORS = [
  { id: 'split', t: 'Split it — you take lunch, she takes the party', s: 'Both families covered · home by 9', lead: true },
  { id: 'move', t: 'Move lunch to Sunday', s: 'Costs your no-plans Sunday — co-signed' },
  { id: 'skip', t: 'Skip the party', s: 'Trace sends the no. Nobody has to explain.' },
];

function renderClash() {
  const s = screens.clash;
  const c = db.clash;
  const chosen = db.clashPicked;
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Clash</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      <div class="banner">
        <div class="lbl">Clash · ${esc(c.day)}</div>
        <div class="h">${esc(c.a)} and ${esc(c.b)} are the same afternoon.</div>
      </div>
      <div class="eyebrow">Ways out</div>
      <div class="stackcol" style="padding-top:0">
        ${DOORS.map((d) => `
          <button class="card${chosen ? (chosen === d.id ? ' pick' : '') : (d.lead ? ' pick-ink' : '')}" data-door="${d.id}">
            <div class="t" style="font-size:16px">${esc(d.t)}</div>
            <div class="d">${esc(d.s)}</div></button>`).join('')}
        <div class="note">Trace never picks. It lays the three doors on the table so the argument
          is about the choice, not about who forgot.</div>
      </div>
      <div class="spacer"></div>
      <div class="actions">
        <button class="btn-ink" data-decide>${chosen ? 'Send it to her' : 'Decide together — 2 min'}</button>
      </div>
    </div>`;
  back(s);
  $$('[data-door]', s).forEach((b) => b.addEventListener('click', () => {
    db.clashPicked = b.dataset.door; save(); buzz(8); renderClash();
  }));
  $$('[data-decide]', s).forEach((b) => b.addEventListener('click', () => {
    if (!chosen) { toast('pick a door first — Trace won’t'); return; }
    R.push('clash', { day: c.day, door: chosen });
    db.clash = { ...c, on: false }; save(); buzz(14);
    toast('sent. she sees it when she opens the app.');
    show('rooms');
  }));
}

/* ================================================================= p43 trips
 *
 * A countdown, a savings bar, and a prep list where the only red row is the
 * one with a deadline outside your control. */

function renderTrip() {
  const s = screens.trip;
  const t = db.trip;
  const pct = Math.min(100, Math.round((t.have / t.goal) * 100));
  const prep = [
    { id: 'passport', t: 'Maya’s passport', s: 'Expires before the trip', warn: true, end: 'renew' },
    { id: 'off', t: 'Time off booked, both', tick: true },
    { id: 'leo', t: 'Someone for Leo · 9 nights', tick: true },
    { id: 'flights', t: 'Flights — prices drop in Nov', tick: true },
  ];
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Trips</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      ${head(esc(t.name), 'In ' + t.days + ' days')}
      <div style="padding:18px 20px 0;flex:none">
        <div class="card" style="border-radius:22px;padding:18px">
          <div style="display:flex;align-items:baseline;gap:8px">
            <span style="font-size:13px;color:var(--ink-3);flex:1">Saved</span>
            <span style="font-size:22px;font-weight:700;color:var(--red-text)">€${t.have.toLocaleString()}</span>
            <span style="font-size:13px;color:var(--ink-3)">of €${t.goal.toLocaleString()}</span>
          </div>
          <div class="bar"><i style="width:${pct}%"></i></div>
          <div style="font-size:12px;color:var(--ink-3);margin-top:10px">€${t.weekly}/week keeps you on track.</div>
        </div>
      </div>
      <div class="eyebrow">Before you go</div>
      <div class="stackcol" style="padding-top:0">
        ${prep.map((p) => p.warn
          ? `<div class="card line warn" style="border-radius:16px;padding:13px 16px">
               <span class="grow"><span class="t" style="font-size:15px;font-weight:600">${esc(p.t)}</span>
                 <span class="d">${esc(p.s)}</span></span>
               <button class="end red" data-prep="${p.id}">${p.end}</button></div>`
          : `<button class="card line" style="border-radius:16px;padding:13px 16px" data-prep="${p.id}">
               <span class="tick${db.tripPrep[p.id] ? ' on' : ''}" style="width:22px;height:22px;font-size:11px">${db.tripPrep[p.id] ? '✓' : ''}</span>
               <span class="grow" style="font-size:15px">${esc(p.t)}</span></button>`).join('')}
      </div>
      <div class="eyebrow">While you’re apart</div>
      <div style="padding:0 20px;flex:none">
        <div class="card ink"><div class="t">Two clocks, one canvas</div>
          <div class="d">Her hours show on your side so nobody draws into an empty room at 4 AM.</div></div>
      </div>
      <div class="spacer"></div>
      <div class="foot">Money moves only when you both say so.</div>
    </div>`;
  back(s);
  $$('[data-prep]', s).forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.prep;
    if (k === 'passport') { toast('renewal takes 6 weeks — that’s the deadline, not the trip'); buzz(8); return; }
    db.tripPrep[k] = !db.tripPrep[k]; save(); buzz(8); renderTrip();
  }));
}

/* ========================================================= p44 anniversaries
 *
 * The nearest date is an ink card with a red button into the pocket, because
 * the planning for someone's birthday is the one thing that must not sync. */

function renderDates() {
  const s = screens.dates;
  const soon = db.dates.find((d) => d.soon) || db.dates[0];
  const rest = db.dates.filter((d) => d !== soon);
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Dates</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      ${head('Dates that matter', 'Nobody forgets alone')}
      <div style="padding:18px 20px 0;flex:none">
        <div class="card ink" style="border-radius:22px;padding:20px 22px">
          <div class="lbl">In 13 days</div>
          <div style="font-size:26px;font-weight:700;margin-top:8px">Maya’s birthday</div>
          <div class="d" style="margin-top:6px">Planning lives in your pocket — she can’t see this.</div>
          <button data-pocket style="width:100%;height:44px;border-radius:999px;background:var(--red);
            color:var(--on-red);font-size:15px;font-weight:600;margin-top:14px">Open the pocket</button>
        </div>
      </div>
      <div class="eyebrow">Coming up</div>
      <div class="stackcol" style="padding-top:0">
        ${rest.map((d) => `
          <div class="card line" style="border-radius:16px;padding:13px 16px">
            <span class="grow"><span class="t" style="font-size:15px;font-weight:600">${esc(d.t)}</span>
              <span class="d">${esc(d.s)}</span></span>
            <span style="font-size:17px;font-weight:700">${esc(d.when)}</span></div>`).join('')}
      </div>
      <div class="spacer"></div>
      <div style="padding:0 20px;flex:none">
        <div class="note">Trace reminds you both, separately, a week out. Neither of you finds out
          the other was reminded.</div>
      </div>
      <div class="foot">Add a date and it belongs to the couple, not to whoever typed it.</div>
    </div>`;
  back(s);
  $$('[data-pocket]', s).forEach((b) => b.addEventListener('click', () => {
    buzz(10); R.openSub ? R.openSub('pocket') : show('rooms');
  }));
}

/* ============================================================== p5 two clocks
 *
 * Long distance, drawn as an arc rather than two digital readouts: the point
 * is the overlap, not the offset. */

function renderClocks() {
  const s = screens.clocks;
  const hers = new Date(Date.now() + 8 * 36e5);   /* the demo partner is +8 */
  const fmt = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Two clocks</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      <div class="head" style="text-align:center">
        <div class="k">Maya’s evening starts in</div>
        <div class="h" style="font-size:34px">3 hours, 20 minutes</div>
      </div>
      <div style="position:relative;height:190px;margin-top:10px;flex:none">
        <svg viewBox="0 0 360 190" style="position:absolute;inset:0;width:100%;height:100%">
          <path d="M0 165 C90 20, 270 20, 360 165" stroke="var(--ink-5)" stroke-width="2" fill="none"></path>
          <circle cx="98" cy="64" r="9" fill="var(--ink)"></circle>
          <circle cx="252" cy="64" r="9" fill="var(--red)"></circle>
        </svg>
        <div style="position:absolute;left:58px;top:18px;font-size:12px;font-weight:600">You · ${fmt(new Date())}</div>
        <div style="position:absolute;right:38px;top:18px;font-size:12px;font-weight:600;color:var(--red-text)">Maya · ${fmt(hers)}</div>
      </div>
      <div class="stackcol">
        <div class="card"><div class="t">Both awake, 6 hours a day</div>
          <div class="d">18:00–24:00 yours · 10:00–16:00 hers. The canvas is loudest here.</div></div>
        <div class="card"><div class="t">Marks wait, they don’t wake</div>
          <div class="d">Anything you draw while she’s asleep is there when she opens her eyes.</div></div>
        <div class="card"><div class="t">Her widget dims when she sleeps</div>
          <div class="d">So you can tell without asking, and without a location.</div></div>
      </div>
      <div class="spacer"></div>
      <div style="padding:0 20px;flex:none">
        <div class="note">Presence is a dot, never a place. Trace shows that she’s here — never where.</div>
      </div>
      <div class="foot">Two cities, one canvas.</div>
    </div>`;
  back(s);
}

/* ------------------------------------------------------------------ wiring */

R.addScreen('findtime', renderFind);
R.addScreen('newevent', renderNew);
R.addScreen('clash', renderClash);
R.addScreen('trip', renderTrip);
R.addScreen('dates', renderDates);
R.addScreen('clocks', renderClocks);

R.addRow('Household', 'findtime', 'Find us a time', () => 'Windows you’re both free — and awake');
R.addNav('findtime', () => show('findtime'));
R.addRow('Household', 'newevent', 'New event', () => 'Four fields, and what Trace noticed');
R.addNav('newevent', () => show('newevent'));
R.addRow('Household', 'clash', 'A clash', () => 'Three doors, no verdict');
R.addNav('clash', () => show('clash'));
R.addRow('Together', 'trip', 'Trips', () => 'The countdown, the money, the prep');
R.addNav('trip', () => show('trip'));
R.addRow('Memory', 'dates', 'Anniversaries', () => 'Nobody forgets alone');
R.addNav('dates', () => show('dates'));
R.addRow('Canvas', 'clocks', 'Two clocks', () => 'Long distance, drawn as an overlap');
R.addNav('clocks', () => show('clocks'));

/* ========================================================== p36 canvas extras
 *
 * Invariant one says the Canvas row opens the canvas, which leaves the room's
 * quiet corners with nowhere to live. This is that shelf — the frame's four
 * small things, followed by whatever else registers against the Canvas room.
 *
 * All four are on-device by construction: the voice becomes a line and the
 * recording is discarded, the day map is a shape and never coordinates. */

screens.extras = (() => {
  const sec = document.createElement('section');
  sec.className = 'scr hidden'; sec.id = 'sc-extras';
  $('#stack').appendChild(sec);
  return sec;
})();

function renderExtras() {
  const s = screens.extras;
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Canvas</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      ${head('Canvas, the quiet corners', 'Four small things')}
      <div class="stackcol">
        <button class="card" data-x="voice"><div class="t">Voice ink</div>
          <div style="display:flex;align-items:center;gap:12px;margin:10px 0">
            <span style="display:flex;align-items:flex-end;gap:3px;height:26px">
              ${[40, 75, 50, 95, 60, 35].map((h) => `<i style="width:3px;height:${h}%;background:var(--ink);display:block"></i>`).join('')}
            </span>
            <span style="font-size:16px;color:var(--ink-5)">→</span>
            <svg viewBox="0 0 140 30" style="width:140px;height:30px">
              <path d="M4 22 C24 4,40 26,62 12 C84 -2,104 24,136 8" stroke="var(--red)"
                stroke-width="4" fill="none" stroke-linecap="round"></path></svg>
          </div>
          <div class="d">A line with your cadence. Never a recording, never text.</div></button>

        <button class="card" data-x="sky"><div class="t">Someone else’s sky</div>
          <div style="display:flex;gap:10px;margin:10px 0">
            <span style="flex:1;height:52px;border-radius:12px;display:flex;align-items:flex-end;padding:6px 10px;
              background:linear-gradient(180deg,#F7D8A8,#E9A13B);font-size:11px;color:#5A3A0E">Her 6:12 AM</span>
            <span style="flex:1;height:52px;border-radius:12px;display:flex;align-items:flex-end;padding:6px 10px;
              background:linear-gradient(180deg,#8E7FA8,#3A3050);font-size:11px;color:rgba(255,255,255,.85)">Your 8:58 PM</span>
          </div>
          <div class="d">Dark at the same time: 5h 10m.</div></button>

        <button class="card" data-x="map"><div class="t">Map of your day</div>
          <div style="display:flex;align-items:center;gap:12px;margin:10px 0">
            <svg viewBox="0 0 150 56" style="width:150px;height:56px">
              <path d="M8 46 C30 10,58 50,84 22 C104 2,124 34,142 14" stroke="var(--ink-5)"
                stroke-width="3" fill="none" stroke-linecap="round"></path>
              <circle cx="8" cy="46" r="5" fill="var(--ink)"></circle>
              <circle cx="142" cy="14" r="5" fill="var(--red)"></circle></svg>
            <span class="hand" style="font-size:22px;color:var(--ink-70);line-height:1.15;font-weight:700">long way home,<br>on purpose</span>
          </div>
          <div class="d">Drawn from your steps. Shared as a shape only.</div></button>

        <div class="card ink"><div class="t">Nothing today</div>
          <div class="d" style="line-height:1.5">That’s allowed. The canvas stays open, nobody is
            asked for anything, and quiet days don’t break a thing.
            ${db.streak || 41} days — still yours.</div></div>
      </div>
      <div class="eyebrow">Also on the canvas</div>
      <div class="stackcol" style="padding-top:0">${R.subRows('Canvas')}</div>
      <div class="spacer"></div>
      <div class="foot">Everything here is read on this phone and stays on it.</div>
    </div>`;
  back(s, 'rooms');
  $$('[data-sub]', s).forEach((b) => b.addEventListener('click', () => R.openSub(b.dataset.sub)));
  $$('[data-x]', s).forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.x; buzz(8);
    if (k === 'voice') toast('hold the canvas to speak — the recording never leaves this phone');
    if (k === 'sky') show('clocks');
    if (k === 'map') toast('a shape, not a route — she never sees where');
  }));
}
R.addScreen('extras', renderExtras);
R.addBeyond('Canvas extras', 'Voice ink · sky · day map · nothing today', 'extras');
renderExtras();

renderFind(); renderNew(); renderClash(); renderTrip(); renderDates(); renderClocks();
})();
