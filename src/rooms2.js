/* trace — the rest of the design.
 *
 * Turns 20, 23, 24 and 25: everything the redesign drew that the first pass
 * of rooms.js didn't build. Registered through TRACE_ROOMS so the five rooms,
 * the board and the widget deck all pick these up without knowing about them.
 *
 * Copy and numbers are the frames', including the ones that are the point:
 * "Maya holds 71%", "€412 free to spend", "3 waiting", "2 flares left".
 */
(() => {
'use strict';
const R = window.TRACE_ROOMS;
if (!R) return;
const { el, esc, count, tickRow, save, push, paint, ui, resetDeck } = R;
const db = R.db;
const toast = ui.toast, buzz = ui.buzz;

/* ------------------------------------------------------------- new state */

R.defaults({
  /* 25a decision debt */
  debts: [
    { id: 'k1', t: 'The car — repair or replace', n: 14, w: '6 weeks', tint: 'var(--red)' },
    { id: 'k2', t: 'Whether to visit your mum at Christmas', n: 9, w: '3 weeks', tint: 'var(--ink)' },
    { id: 'k3', t: 'Leo’s school for next year', n: 6, w: '2 weeks', tint: 'var(--ink)' },
  ],
  decided: {},
  /* 25b mental load */
  load: [
    { id: 'l1', t: 'Knows when the bins go out', who: 'Maya' },
    { id: 'l2', t: 'Knows Leo’s shoe size', who: 'Maya' },
    { id: 'l3', t: 'Tracks what’s running out', who: 'Maya' },
    { id: 'l4', t: 'Handles the car and insurance', who: 'You', w: 1.6 },
    { id: 'l5', t: 'Remembers birthdays, both sides', who: 'Maya' },
  ],
  /* 25c waiting room */
  blocked: [
    { id: 'w1', on: 'Maya', t: 'Her passport number', b: 'Blocks: booking Kyoto', d: '6d' },
    { id: 'w2', on: 'Maya', t: 'Yes or no to Sam’s dinner', b: 'Blocks: the sitter', d: '2d' },
    { id: 'w3', on: 'Maya', t: 'Which Thursday she can swap', b: 'Blocks: your dentist', d: '1d' },
    { id: 'w4', on: 'You', t: 'Call the plumber back', b: 'Blocks: her Saturday', d: '4d' },
  ],
  unblocked: {},
  /* 25d money truth */
  money: { free: 412, in: 4180, committed: 3268, agreed: 500 },
  /* 25f the brief */
  brief: {
    task: 'Leo’s pickup, Thursday',
    rows: [['Gate code', '4471'], ['Ask for', 'Mrs. Adeyemi'], ['He needs', 'His green bag'], ['Don’t say', '“swimming”']],
    note: '“he’ll say he’s not hungry. he is.”', got: false,
  },
  /* 25g energy match */
  energy: 1,
  /* 25h renewal radar */
  renewals: [
    { id: 'r1', t: 'Car insurance', s: 'Auto-renews at +18% · yours', d: '11d' },
    { id: 'r2', t: 'Maya’s passport', s: 'Expires before Kyoto · hers', d: '4mo' },
    { id: 'r3', t: 'Three streaming things', s: 'Nobody has opened two of them', d: '€41' },
    { id: 'r4', t: 'Gym, since March', s: 'Last used: never · yours', d: '€32' },
    { id: 'r5', t: 'Boiler service', s: 'Due · nobody’s job yet', d: '—' },
  ],
  cancelled: {},
  /* 25i yes/no board */
  invites: [
    { id: 'i1', t: 'Sam’s birthday dinner', w: 'Sat 21st · they need numbers by Friday' },
    { id: 'i2', t: 'Work thing, plus one', w: 'Thu 12th · you can skip' },
    { id: 'i3', t: 'Maya’s cousin, staying over', w: 'Sep 4–6 · the spare room' },
  ],
  rsvp: {},
  /* 25j where is it */
  things: [
    { n: 0, t: 'Spare keys', w: 'Blue bowl, hall shelf', who: 'You put them there, May 2' },
    { n: 1, t: 'Passports', w: 'Filing box, bottom drawer', who: 'Maya, after Lisbon' },
    { n: 2, t: 'The drill', w: 'Lent to Sam — 3 weeks ago', who: 'You said yes at a barbecue' },
    { n: 3, t: 'Leo’s birth certificate', w: 'Green folder with the tax papers', who: 'Maya, school application' },
  ],
  /* 23a guest mode, 24c sleep, 24h car, 24b flare */
  guest: false, awake: true, carMode: false,
  /* three a year, resetting in January — README Interruptions #1, and the
     panel's own copy. It shipped at 2 and never reset. */
  flares: 3, flareYear: null,
  /* 24d widget stack order */
  stack: ['Live trace', 'Must do', 'This week', 'Thinking of you', 'Goodnight'],
  /* 23b doctor's note */
  doctor: { when: 'today, 2:15 PM', qs: ['is the tiredness related?', 'ask about the iron again', 'can I still run?'], sent: false },
  /* 23c recurring + ask nicely */
  asks: [
    { n: 0, t: 'Could you grab milk?', sub: 'she can say no with one tap' },
    { n: 1, t: 'Any chance you can call them?', sub: 'no follow-up, ever' },
    { n: 2, t: 'Swap Thursday with me?', sub: 'offers you take hers back' },
  ],
  asked: -1,
  /* 23f morning handoff */
  overnight: [
    { at: '11:48 PM', t: 'A last mark, after you’d gone to sleep' },
    { at: '6:05 AM', t: '“bins — I’ll be gone by 7, sorry”' },
    { at: 'Today’s shape', t: 'She’s free after 4' },
  ],
  handoffSeen: false,
  /* 23g rituals */
  rituals: [
    { t: 'Tea at 9, both of you', s: '142 nights running' },
    { t: 'She draws first on Thursdays', s: '11 weeks in a row' },
    { t: 'Sunday with no plans', s: 'Co-signed · never booked over' },
  ],
  ritualDone: false,
  /* 23d tiny AI */
  tiny: true,
  /* 22d weekly ten */
  weeklyTen: [['Money, two minutes', '2:00'], ['The week ahead', '4:00'], ['One appreciation each', '4:00']],
  /* 20g day map, 20h wall, 20m kid's corner, 20n letter, 20r pocket */
  dayNotes: ['slept badly, coffee helped', 'she called at lunch', 'long way home, on purpose'],
  places: [['Home', '8:10'], ['Studio', '9:02'], ['Market', '6:40']],
  wallKept: 9,
  wrongBin: ['“The dishwasher is basically fine”', '“We’ll pack the night before”', '“Leo will nap in the car”'],
  letter: { from: 'Building management', by: 'Aug 15', added: false },
  pocket: {
    what: 'Her birthday', when: '13 days out',
    steps: [{ t: 'Table at Nobelhart, 8 PM', done: true }, { t: 'Sitter confirmed', done: true },
            { t: 'Pick up the card from her mum', done: false }, { t: 'Arrived at the shop yesterday', done: true }],
    reveal: 'Reveals itself Aug 20, 7 PM',
  },
  /* 20s chapters, 20t journal, 20u legacy, 24f movie */
  chapters: [
    { n: 4, when: 'since May', t: 'The Berlin months', s: '96 days · 218 marks · one flat, finally', now: true },
    { n: 3, when: 'Jan – May', t: 'Two cities, one canvas', s: 'Long distance · 122 goodnight seals, zero missed' },
    { n: 2, when: 'last autumn', t: 'The loud year quiets', s: 'Maya’s new job · the Sunday rule begins' },
  ],
  movie: 38,
  /* 20i the week, seven days */
  week7: [
    ['Mon', 'rent due — paid ✓'], ['Tue', '—'], ['Wed', 'Maya — late shift'],
    ['Thu', 'dentist 3pm · pick up cake'], ['Fri', 'dinner at Sam’s, bring wine'],
    ['Sat', '—'], ['Sun', 'no plans — co-signed'],
  ],
});

/* ---------------------------------------------------------------- pieces */

/* The value slot is 14px, which is below the size at which AA lets a colour
   through on 3:1 — and the flat brand red on a white card measures 4.39:1. The
   token table already names the answer: red-deep is "red text on paper,
   contrast-safe". Callers pass the brand red because that is what they mean;
   this is where "red, as text" gets resolved to the token that can be read. */
const redText = (tint) => (tint === 'var(--red)' ? 'var(--red-text)' : (tint || 'var(--ink)'));

const kv = (k, v, tint) =>
  `<div style="display:flex;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:14px;
    background:var(--surface);border:1px solid var(--surface)">
    <span style="font-size:13px;color:var(--ink-3)">${esc(k)}</span>
    <span style="font-size:14px;font-weight:600;color:${redText(tint)}">${esc(v)}</span></div>`;

const bigNum = (v, k) =>
  `<div style="text-align:center;padding:8px 0 2px">
    <div style="font-size:15px;color:var(--ink-70)">${esc(k)}</div>
    <div style="font-size:40px;font-weight:600;letter-spacing:-.02em;margin-top:2px">${esc(v)}</div></div>`;

const note = (t) => el(`<div class="p-note">${t}</div>`);
const bar = (pct, a, b) =>
  `<div class="splitbar" style="margin:2px 0 6px"><div class="a" style="width:${pct}%;background:${a}"></div>
   <div class="b" style="background:${b || 'var(--hairline)'}"></div></div>`;

/* =========================================================== 25 · the ten */

R.addSub('debt', 'decision debt', (body) => {
  const draw = () => {
    body.innerHTML = '';
    const open = db.debts.length - count(db.decided);
    body.appendChild(el(bigNum(open, 'Open decisions, ageing')));
    body.appendChild(note('Not more chores — the ones you keep pushing. Each carries how long you’ve carried it.'));
    db.debts.forEach((d) => {
      const on = !!db.decided[d.id];
      const r = el(`<div class="row" style="${on ? 'background:var(--ground-alt);border-color:var(--hairline);opacity:.6' : ''}">
        <span class="grow"><span class="n">${esc(d.t)}</span>
          <span class="s">${d.n} times deferred · ${esc(d.w)} old</span></span>
        <button class="who" style="background:${on ? 'var(--ground-alt)' : 'var(--ink)'};color:${on ? 'var(--ink)' : 'var(--emph-ink)'}">
          ${on ? 'Decided ✓' : 'Decide in 2 min'}</button></div>`);
      r.querySelector('button').addEventListener('click', () => {
        db.decided[d.id] = !db.decided[d.id]; buzz(12); push('decided', { id: d.id }); draw();
      });
      body.appendChild(r);
    });
  };
  draw();
});

R.addSub('load', 'mental load', (body) => {
  const draw = () => {
    body.innerHTML = '';
    /* weighted, so the opening state reads 71% exactly as frame 25b does —
       and still moves the moment you take one over */
    const wt = (l) => l.w || 1;
    const all = db.load.reduce((n, l) => n + wt(l), 0);
    const hers = db.load.filter((l) => l.who === 'Maya').reduce((n, l) => n + wt(l), 0);
    const pct = Math.round(hers / all * 100);
    body.appendChild(el(`<div style="text-align:center;padding:6px 0 2px">
      <div style="font-size:15px;color:var(--ink-70)">Who is <span style="color:var(--red-text)">remembering</span>, not doing</div>
      <div style="font-size:30px;font-weight:600;margin-top:4px">Maya holds ${pct}%</div></div>`));
    body.appendChild(el(bar(pct, 'var(--red)', 'var(--ink)')));
    db.load.forEach((l) => {
      const r = el(`<div class="row"><span style="width:8px;height:8px;border-radius:50%;flex:none;
        background:${l.who === 'Maya' ? 'var(--red)' : 'var(--ink)'}"></span>
        <span class="grow"><span class="n light">${esc(l.t)}</span></span>
        <button class="who ${l.who === 'Maya' ? 'them' : ''}">${l.who}</button></div>`);
      r.querySelector('button').addEventListener('click', () => {
        l.who = l.who === 'Maya' ? 'You' : 'Maya'; buzz(12); push('load', { id: l.id, who: l.who }); draw();
        toast(l.who === 'You' ? 'yours now — permanently. trace stops telling you about it.' : 'handed back');
      });
      body.appendChild(r);
    });
    body.appendChild(note('Take one <b>permanently</b> — not the task, the knowing. Trace stops telling you about it.'));
  };
  draw();
});

R.addSub('waiting', 'the waiting room', (body) => {
  const draw = () => {
    body.innerHTML = '';
    const live = db.blocked.filter((b) => !db.unblocked[b.id]);
    body.appendChild(el(bigNum(live.length + ' things', 'Nothing moves until')));
    for (const who of ['Maya', 'You']) {
      const mine = live.filter((b) => b.on === who);
      if (!mine.length) continue;
      body.appendChild(el(`<div class="eyebrow" style="padding:10px 0 2px">Waiting on ${who} · ${mine.length}</div>`));
      mine.forEach((b) => {
        const r = el(`<button class="row"><span class="grow"><span class="n">${esc(b.t)}</span>
          <span class="s">${esc(b.b)} · ${esc(b.d)}</span></span>
          <span class="cnt" style="color:var(--red-text)">${esc(b.d)}</span></button>`);
        r.addEventListener('click', () => {
          db.unblocked[b.id] = true; buzz(12); resetDeck(); push('unblock', { id: b.id }); draw(); paint();
          toast('unblocked — it drops off both sides');
        });
        body.appendChild(r);
      });
    }
    body.appendChild(note(`One number on her widget: <b>${db.blocked.filter((b) => b.on === 'Maya' && !db.unblocked[b.id]).length} waiting</b>. No nagging, just visible.`));
  };
  draw();
});

R.addSub('money', 'money truth', (body) => {
  const m = db.money;
  body.appendChild(el(bigNum('€' + m.free, 'Free to spend, this month')));
  body.appendChild(note('After rent, bills, the standing orders, and what you both said you’d save.'));
  body.appendChild(el(kv('In', '€' + m.in.toLocaleString('en-US'), 'var(--ink)')));
  body.appendChild(el(kv('Committed', '−€' + m.committed.toLocaleString('en-US'), 'var(--red)')));
  body.appendChild(el(kv('Kyoto, agreed', '−€' + m.agreed, 'var(--ink)')));
  body.appendChild(note('One number, both phones, updated nightly. No categories, no budgets to break, no lecture — just the truth you’d otherwise argue about at 11 PM.'));
  body.appendChild(note('Read-only from your banks. Trace never moves money.'));
});

R.addSub('brief', 'the brief', (body) => {
  const b = db.brief;
  body.appendChild(el(`<div style="padding:4px 0 2px">
    <div style="font-size:15px;color:var(--ink-70)">You’re taking over</div>
    <div style="font-size:26px;font-weight:600;margin-top:2px">${esc(b.task)}</div></div>`));
  body.appendChild(note('Everything Maya knows about it, handed over in one card. No “wait, what’s the code?” at 3 PM.'));
  b.rows.forEach(([k, v]) => body.appendChild(el(kv(k, v, 'var(--red-text)'))));
  body.appendChild(el(`<div class="row" style="background:var(--red-wash);border-color:var(--red-line)">
    <span class="grow"><span class="s">Maya’s note</span>
    <span class="n light hand" style="font-size:23px;line-height:1.25;margin-top:4px">${esc(b.note)}</span></span></div>`));
  const got = el(`<button class="${b.got ? 'p-ghost' : 'p-cta'}">${b.got ? 'Got it ✓' : 'Got it'}</button>`);
  got.addEventListener('click', () => {
    b.got = true; save(); buzz(14); got.textContent = 'Got it ✓'; got.className = 'p-ghost';
    toast('she can stop holding it now');
  });
  body.appendChild(got);
  body.appendChild(note('Builds itself from every time she’s done it. Grows each handover.'));
});

R.addSub('energy', 'energy match', (body) => {
  const BANDS = [
    { n: 0, t: 'Early', s: '6–9 AM', you: 82, her: 30 },
    { n: 1, t: 'Midday', s: '12–2 PM', you: 54, her: 76 },
    { n: 2, t: 'Evening', s: '7–10 PM', you: 28, her: 88 },
  ];
  const TIPS = [
    'Hard conversations land best here — you’re sharp, she isn’t yet.',
    'Admin and calls. Both of you are functional, neither is precious about it.',
    'Her window. Anything that needs her judgement waits until now.',
  ];
  const draw = () => {
    body.innerHTML = '';
    const row = el(`<div style="display:flex;gap:10px"></div>`);
    BANDS.forEach((b) => {
      const on = db.energy === b.n;
      const c = el(`<button style="flex:1;padding:12px 8px;border-radius:18px;
        background:${on ? 'var(--hairline)' : 'rgba(255,255,255,.045)'};
        border:1px solid ${on ? 'var(--ink-5)' : 'var(--surface)'};color:var(--ink)">
        <div style="display:flex;gap:6px;align-items:flex-end;justify-content:center;height:90px">
          <span style="width:14px;border-radius:99px;background:var(--ink);height:${b.you}%"></span>
          <span style="width:14px;border-radius:99px;background:var(--red);height:${b.her}%"></span></div>
        <div style="font-size:14px;font-weight:600;margin-top:8px">${b.t}</div>
        <div style="font-size:11px;color:var(--ink-3)">${b.s}</div></button>`);
      c.addEventListener('click', () => { db.energy = b.n; save(); buzz(8); draw(); });
      row.appendChild(c);
    });
    body.append(row, note(TIPS[db.energy]),
      note('<b style="color:var(--ink)">You</b> · <b style="color:var(--red-text)">Maya</b> — measured from when you each actually do things, never from a wearable.'));
  };
  draw();
});

R.addSub('renewals', 'renewal radar', (body) => {
  const draw = () => {
    body.innerHTML = '';
    body.appendChild(el(bigNum('€94/mo', 'Everything that expires')));
    db.renewals.forEach((r) => {
      const off = !!db.cancelled[r.id];
      const row = el(`<button class="row" style="${off ? 'opacity:.45' : ''}">
        <span class="grow"><span class="n" style="text-decoration:${off ? 'line-through' : 'none'}">${esc(r.t)}</span>
        <span class="s">${esc(r.s)}</span></span>
        <span class="cnt" style="color:var(--red-text)">${esc(r.d)}</span></button>`);
      row.addEventListener('click', () => { db.cancelled[r.id] = !off; buzz(10); push('renewal', { id: r.id }); draw(); });
      body.appendChild(row);
    });
    body.appendChild(note('The quiet money leak. Cancelling here only marks it — Trace never touches an account.'));
  };
  draw();
});

R.addSub('rsvp', 'yes / no board', (body) => {
  const draw = () => {
    body.innerHTML = '';
    db.invites.forEach((i) => {
      const v = db.rsvp[i.id];
      const row = el(`<div class="row" style="flex-direction:column;align-items:stretch;gap:10px">
        <div><div class="n">${esc(i.t)}</div><div class="s">${esc(i.w)}</div></div>
        <div style="display:flex;gap:8px">
          <button data-v="y" style="flex:1;min-height:44px;border-radius:14px;font-size:14px;font-weight:600;
            border:1px solid ${v === 'y' ? 'transparent' : 'var(--hairline)'};
            background:${v === 'y' ? 'var(--emph)' : 'var(--surface)'};color:${v === 'y' ? 'var(--emph-ink)' : 'var(--ink)'}">Yes</button>
          <button data-v="n" style="flex:1;min-height:44px;border-radius:14px;font-size:14px;font-weight:600;
            border:1px solid ${v === 'n' ? 'transparent' : 'var(--hairline)'};
            background:${v === 'n' ? 'var(--red)' : 'var(--surface)'};color:${v === 'n' ? 'var(--on-red)' : 'var(--ink)'}">No</button>
        </div>
        <div class="s">${v === 'y' ? 'Both in — added to the week' : v === 'n' ? 'Declined — nobody has to explain' : 'Waiting on you both'}</div>
      </div>`);
      row.querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => {
        const nv = b.dataset.v;
        db.rsvp[i.id] = db.rsvp[i.id] === nv ? undefined : nv;
        buzz(10); push('rsvp', { id: i.id, v: db.rsvp[i.id] }); draw();
      }));
      body.appendChild(row);
    });
    body.appendChild(note('Answered together. Neither of you has to be the one who says no.'));
  };
  draw();
});

R.addSub('where', 'where is it', (body) => {
  let found = -1;
  const draw = () => {
    body.innerHTML = '';
    db.things.forEach((t) => {
      const on = found === t.n;
      const row = el(`<button class="row" style="flex-direction:column;align-items:stretch;gap:6px;
        ${on ? 'background:var(--red-wash);border-color:var(--red-line)' : ''}">
        <span class="n">${esc(t.t)}</span>
        ${on ? `<span class="s big">${esc(t.w)}</span><span class="s">${esc(t.who)}</span>` : '<span class="s">tap to reveal</span>'}
      </button>`);
      row.addEventListener('click', () => { found = on ? -1 : t.n; buzz(8); draw(); });
      body.appendChild(row);
    });
    body.appendChild(note('Where things physically are, and who put them there. The question that costs a couple twenty minutes a week.'));
  };
  draw();
});

/* =============================================== 23 · guests, notes, asks */

R.addSub('guest', 'guest mode', (body) => {
  const ROWS = [['Shared shopping list', 'visible', 'visible'], ['Week calendar', 'visible', 'visible'],
    ['Canvas & traces', 'hidden', 'visible'], ['Mood weather', 'hidden', 'visible'],
    ['The pocket', 'never existed', 'always hidden']];
  const draw = () => {
    body.innerHTML = '';
    body.appendChild(el(`<div style="padding:2px 0 4px"><div style="font-size:15px;color:var(--ink-70)">Someone’s coming</div>
      <div style="font-size:26px;font-weight:600;margin-top:2px">Your parents, Saturday</div></div>`));
    const sw = el(`<button class="row"><span class="grow"><span class="n">Guest mode</span>
      <span class="s">${db.guest ? 'The phone can sit on the table' : 'Hide the private layer'}</span></span>
      <span class="sw amber${db.guest ? ' on' : ''}"><i></i></span></button>`);
    sw.addEventListener('click', () => {
      db.guest = !db.guest;
      /* it says it ends at midnight, so it has to record which day it began */
      db.guestDay = db.guest ? new Date().toDateString() : null;
      save(); buzz(12); push('guest', { on: db.guest }); draw(); paint();
      toast(db.guest ? 'guest mode on — ends itself at midnight' : 'back to normal');
    });
    body.appendChild(sw);
    ROWS.forEach(([k, g, n]) => body.appendChild(el(kv(k, db.guest ? g : n,
      (db.guest ? g : n) === 'visible' ? 'var(--ink)' : 'var(--red)'))));
    body.appendChild(note('Ends itself at midnight. Maya’s widget shows a small “guests” dot, nothing more.'));
  };
  draw();
});

R.addSub('doctor', 'doctor’s note', (body) => {
  const d = db.doctor;
  body.appendChild(el(`<div class="p-hint">Maya’s appointment · ${esc(d.when)}</div>`));
  body.appendChild(el(`<div class="eyebrow" style="padding:8px 0 2px">What to ask · written together, last night</div>`));
  d.qs.forEach((q) => body.appendChild(el(
    `<div class="chip hand" style="font-size:23px;line-height:1.25">${esc(q)}</div>`)));
  body.appendChild(el(kv('After, on your widget', 'one line only', 'var(--red-text)')));
  body.appendChild(el(kv('Details', 'hers to share', 'var(--red)')));
  body.appendChild(note('Health is the one room Trace never summarizes, never trends, never guesses. It just holds the questions you’d forget in the chair.'));
  const b = el(`<button class="${d.sent ? 'p-ghost' : 'p-cta'}">${d.sent ? 'On her widget ✓' : 'Send to her widget'}</button>`);
  b.addEventListener('click', () => {
    d.sent = true; save(); buzz(14);
    db.notices = [{ id: 'doc', t: 'Appointment', when: d.when }].concat(db.notices.filter((n) => n.id !== 'doc'));
    resetDeck(); push('notice', { t: 'Appointment' }); paint();
    b.textContent = 'On her widget ✓'; b.className = 'p-ghost';
  });
  body.appendChild(b);
});

R.addSub('ask', 'recurring + ask nicely', (body) => {
  const draw = () => {
    body.innerHTML = '';
    body.appendChild(el(kv('Bins out', 'yours this week', 'var(--ink)')));
    body.appendChild(el(`<div class="s" style="padding:0 2px 4px;color:var(--ink-3);font-size:12px">Alternates between you</div>`));
    body.appendChild(el(`<div class="eyebrow" style="padding:8px 0 2px">Ask nicely — never a reminder she didn’t choose</div>`));
    db.asks.forEach((a) => {
      const on = db.asked === a.n;
      const r = el(`<button class="row" style="${on ? 'background:var(--red-wash);border-color:var(--red-line)' : ''}">
        <span class="grow"><span class="n light">${esc(a.t)}</span><span class="s">${esc(a.sub)}</span></span>
        <span class="cnt" style="color:var(--red-text)">${on ? '✓ asked' : ''}</span></button>`);
      r.addEventListener('click', () => {
        db.asked = a.n; buzz(10); push('ask', { t: a.t }); draw();
        toast('arrives as ink, in your hand — one tap: yes, not now, or nothing');
      });
      body.appendChild(r);
    });
    body.appendChild(note('Arrives on her widget as ink, in your hand. One tap: yes, not now, or nothing at all.'));
  };
  draw();
});

R.addSub('tiny', 'the tiny one', (body) => {
  const draw = () => {
    body.innerHTML = '';
    body.appendChild(el(`<div class="p-hint">Runs on this phone · Sunday, in three lines</div>`));
    ['Three things are unclaimed for Saturday.',
     'Your overlap shrank 40 minutes this week.',
     'The landlord letter is due in 8 days.'].forEach((l) =>
      body.appendChild(el(`<div class="chip">${esc(l)}</div>`)));
    [['Reads drawings', 'never'], ['Gives advice', 'never'], ['Leaves the device', 'never'],
     ['Counts things you both own', 'that’s all']].forEach(([k, v]) =>
      body.appendChild(el(kv(k, v, v === 'never' ? 'var(--red)' : 'var(--ink)'))));
    const off = el(`<button class="p-ghost">${db.tiny ? 'Turn it off' : 'Turn it back on'}</button>`);
    off.addEventListener('click', () => { db.tiny = !db.tiny; save(); buzz(8); draw();
      toast(db.tiny ? 'back on — counts only' : 'off. it never ran anywhere else anyway.'); });
    const go = el(`<button class="p-cta">Sort Saturday</button>`);
    go.addEventListener('click', () => { buzz(12); toast('three unclaimed things, on both boards'); });
    body.append(go, off);
  };
  draw();
});

R.addSub('handoff', 'morning handoff', (body) => {
  body.appendChild(el(`<div style="padding:2px 0 2px"><div style="font-size:15px;color:var(--ink-70)">While you slept</div>
    <div style="font-size:26px;font-weight:600;margin-top:2px">Maya left you three things</div></div>`));
  db.overnight.forEach((o) => body.appendChild(el(`<div class="row"><span class="grow">
    <span class="s">${esc(o.at)}</span><span class="n light" style="margin-top:3px">${esc(o.t)}</span></span></div>`)));
  const b = el(`<button class="p-cta">Leave her one back</button>`);
  b.addEventListener('click', () => { db.handoffSeen = true; save(); R.show('canvas'); buzz(12);
    toast('draw it — she’ll find it when she wakes'); });
  body.append(b, note('Appears once, at your wake time. Never a notification — it’s just there.'));
});

R.addSub('rituals', 'your rituals', (body) => {
  const draw = () => {
    body.innerHTML = '';
    body.appendChild(el(`<div class="p-hint">Small things you always do · Trace learned ${db.rituals.length + 1}</div>`));
    db.rituals.forEach((r) => body.appendChild(el(`<div class="row"><span class="grow">
      <span class="n">${esc(r.t)}</span><span class="s">${esc(r.s)}</span></span></div>`)));
    body.appendChild(el(`<div class="eyebrow" style="padding:10px 0 2px">Tonight’s ritual · Tea at 9 — in 3 hours</div>`));
    const b = el(`<button class="${db.ritualDone ? 'p-ghost' : 'p-cta'}">${db.ritualDone ? '143 nights ✓ — she knows' : 'I’ll put the kettle on'}</button>`);
    b.addEventListener('click', () => { db.ritualDone = true; push('ritual', {}); buzz(16); draw(); });
    body.append(b, note('Noticed, never enforced. Break one and nothing happens — that’s the deal.'));
  };
  draw();
});

/* ================================== 24 · the flare, sleep, car, the stack */

R.addSub('flare', 'the flare', (body) => {
  const draw = () => {
    body.innerHTML = '';
    body.appendChild(el(bigNum('I need you', 'The only thing that interrupts')));
    body.appendChild(note('Breaks armour, quiet hours, guest mode — everything. Three a year.'));
    /* the reset is lazy: nobody is online at midnight on New Year's Day */
    const yr = new Date().getFullYear();
    if (db.flareYear !== yr) { db.flares = 3; db.flareYear = yr; save(); }
    if (db.flares > 0) {
      const b = el(`<button class="p-cta" style="background:var(--red);color:var(--on-red);min-height:64px;font-weight:700">Hold three seconds</button>`);
      let t = null;
      const start = () => { t = setTimeout(() => {
        db.flares--; db.flare = { ts: Date.now() }; resetDeck(); push('flare', {}); buzz(40); paint(); draw();
        window.TRACE_PUSH && TRACE_PUSH.ring('flare', 'I need you');
        toast('sent — her phone is ringing, whatever she’s doing');
      }, 3000); };
      const stop = () => clearTimeout(t);
      b.addEventListener('pointerdown', start);
      b.addEventListener('pointerup', stop);
      b.addEventListener('pointerleave', stop);
      body.appendChild(b);
    } else {
      body.appendChild(el(`<div class="p-ghost">No flares left this year</div>`));
    }
    body.appendChild(note(`${db.flares} flare${db.flares === 1 ? '' : 's'} left this year. It resets every January.`));
    body.appendChild(note('No message, no reason needed. Full screen on her side.'));
  };
  draw();
});

R.addSub('sleep', 'her state', (body) => {
  const draw = () => {
    body.innerHTML = '';
    const a = db.awake;
    body.appendChild(el(`<div style="text-align:center;padding:8px 0">
      <div style="width:72px;height:72px;border-radius:50%;margin:0 auto;
        background:${a ? 'radial-gradient(circle at 40% 35%,var(--amber),var(--amber))' : 'radial-gradient(circle at 40% 35%,var(--ink-3),var(--ink))'}"></div>
      <div style="font-size:24px;font-weight:600;margin-top:14px">${a ? 'She just woke up' : 'Maya is asleep'}</div>
      <div style="font-size:14px;color:var(--ink-3);margin-top:4px">${a ? 'Berlin, 7:02 AM · your marks are waiting for her' : 'Berlin, 2:41 AM · nothing will buzz on her side'}</div></div>`));
    [['Your marks', 'wait quietly'], ['Her widget', 'dims, doesn’t update'], ['The flare', 'still gets through']]
      .forEach(([k, v]) => body.appendChild(el(kv(k, v, k === 'The flare' ? 'var(--red)' : 'var(--ink)'))));
    const b = el(`<button class="p-ghost">${a ? 'Show her asleep' : 'Show her awake'}</button>`);
    b.addEventListener('click', () => { db.awake = !db.awake; save(); buzz(8); draw(); paint(); });
    body.append(b, note('Sleep is a state, not a status. No times, no tracking — just awake or not.'));
  };
  draw();
});

R.addSub('car', 'car mode', (body) => {
  const draw = () => {
    body.innerHTML = '';
    body.appendChild(el(`<div class="p-hint">Trace noticed you’re moving</div>`));
    const sw = el(`<button class="row"><span class="grow"><span class="n">Car mode</span>
      <span class="s">${db.carMode ? 'Voice ink only, nothing to read' : 'Hands stay on the wheel'}</span></span>
      <span class="sw${db.carMode ? ' on' : ''}"><i></i></span></button>`);
    sw.addEventListener('click', () => {
      db.carMode = !db.carMode;
      /* through R.leaving(), not around it — writing db.leaving and pushing
         inline bypassed the solo-night guard entirely, so car mode broadcast a
         departure on exactly the evening p59 promises it will not */
      if (db.carMode) R.leaving(24);
      buzz(10); resetDeck(); push('car', { on: db.carMode }); draw(); paint();
      toast(db.carMode ? '“Home in 24 min” is on her widget — it updates itself' : 'car mode off');
    });
    body.appendChild(sw);
    [['Auto-sent to Maya’s widget', db.carMode ? 'Home in 24 min' : '—'], ['Canvas', 'normal'],
     ['Lists', 'normal'], ['Detected', 'moving, 48 km/h']]
      .forEach(([k, v]) => body.appendChild(el(kv(k, v, k === 'Detected' ? 'var(--red-text)' : 'var(--ink)'))));
    body.appendChild(note('Say it once — it lands as a line in your handwriting, not a transcript. CarPlay and Android Auto show the same one card. Nothing else.'));
  };
  draw();
});

R.addSub('stack', 'widget stack', (body) => {
  const draw = () => {
    body.innerHTML = '';
    body.appendChild(el(`<div class="p-hint">The order she sees — tap a row to move it up</div>`));
    db.stack.forEach((name, n) => {
      const r = el(`<button class="row"><span class="cnt" style="color:${['var(--red-text)', 'var(--ink)', 'var(--red-text)', 'var(--ink)', 'var(--red-text)'][n % 5]};width:22px">${n + 1}</span>
        <span class="grow"><span class="n light">${esc(name)}</span></span>
        <span class="chev">↑↓</span></button>`);
      r.addEventListener('click', () => {
        const i = n === 0 ? db.stack.length - 1 : n - 1;
        const a = db.stack; [a[n], a[i]] = [a[i], a[n]];
        save(); buzz(8); draw();
      });
      body.appendChild(r);
    });
    body.appendChild(note('Urgency still wins: leaving now and the flare jump the queue no matter where you put them.'));
    const b = el(`<button class="p-cta">Save order</button>`);
    b.addEventListener('click', () => { save(); push('stack', { order: db.stack }); toast('saved — that’s what she sees'); });
    body.appendChild(b);
  };
  draw();
});

/* ============================ 20 · the day, the wall, the week, the pocket */

R.addSub('daymap', 'map of your day', (body) => {
  body.appendChild(el(`<div class="p-canvas" style="height:220px;display:flex;align-items:center;justify-content:center">
    <svg viewBox="0 0 300 200" style="width:100%;height:100%">
      <path d="M40 160 C90 120,80 60,140 50 S250 80,262 140" stroke="var(--amber)" stroke-width="4" fill="none"
        stroke-linecap="round" opacity=".9"/>
      <circle cx="40" cy="160" r="6" fill="var(--ink)"/><circle cx="140" cy="50" r="6" fill="var(--red)"/>
      <circle cx="262" cy="140" r="6" fill="var(--ink)"/>
    </svg></div>`));
  db.dayNotes.forEach((n) => body.appendChild(el(`<div class="chip" style="font-style:italic">${esc(n)}</div>`)));
  db.places.forEach(([p, t]) => body.appendChild(el(kv(p, t, 'var(--ink)'))));
  body.appendChild(note('Drawn from your steps. Never uploaded, shared as a shape only.'));
});

R.addSub('wall', 'the wall', (body) => {
  body.appendChild(el(bigNum(db.wallKept + ' kept forever', 'Permanent ink')));
  const grid = el(`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px"></div>`);
  const COLS = ['var(--red-text)', 'var(--red)', 'var(--ink)', 'var(--ink)', 'var(--ink)'];
  for (let i = 0; i < db.wallKept; i++) {
    grid.appendChild(el(`<div style="aspect-ratio:1;border-radius:14px;background:var(--surface);
      border:1px solid ${i === db.wallKept - 1 ? 'rgba(233,161,59,.4)' : 'var(--surface)'};
      display:flex;align-items:center;justify-content:center;position:relative">
      <svg viewBox="0 0 70 70" style="width:80%;height:80%"><path d="M14 44 C28 18,40 52,58 26"
        stroke="${COLS[i % 5]}" stroke-width="5" fill="none" stroke-linecap="round"/></svg>
      ${i === db.wallKept - 1 ? '<span style="position:absolute;bottom:4px;font-size:12px;color:var(--ink-3)">today</span>' : ''}
    </div>`));
  }
  body.appendChild(grid);
  body.appendChild(note('Everything else fades at midnight. These both of you chose to keep.'));
});

R.addSub('week7', 'week 32', (body) => {
  const draw = () => {
    body.innerHTML = '';
    db.week7.forEach(([d, t], n) => {
      const r = el(`<button class="row"><span class="cnt" style="width:38px;color:${t === '—' ? 'var(--ink-5)' : 'var(--red-text)'}">${d}</span>
        <span class="grow"><span class="n light ${t === '—' ? '' : 'hand'}" style="font-size:${t === '—' ? 16 : 23}px;
          color:${t === '—' ? 'var(--ink-5)' : 'var(--ink)'}">${esc(t)}</span></span></button>`);
      r.addEventListener('click', () => editDay(d, n, t, draw));
      body.appendChild(r);
    });
    body.appendChild(note('Type it, she sees it in your handwriting. Whatever’s next also rides her widget.'));
  };
  draw();
});

/* The signature interaction is typed → handwritten: you type on a normal
   keyboard and watch it become your hand before you send it. A native
   window.prompt is the exact opposite — a system dialog in a system font,
   with no preview and no way to see what lands on her widget. p14's composer
   is the pattern, so the week uses it too. */
function editDay(day, n, current, redraw) {
  const wrap = el(`<div style="display:flex;flex-direction:column;gap:11px"></div>`);
  const input = el(`<input placeholder="${esc(day)} — what's happening"
    style="padding:14px 16px;border-radius:16px;border:1px solid var(--hairline);background:var(--surface);
    color:var(--ink);font-size:17px;font-family:inherit">`);
  input.value = current === '—' ? '' : current;
  const prev = el(`<div style="border-radius:18px;background:var(--red-wash);border:1px solid var(--red-line);padding:14px 16px">
    <div style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--red-text)">Rendered in your hand</div>
    <div class="hand" style="font-size:28px;line-height:1.2;margin-top:8px;min-height:34px;color:var(--ink)"></div></div>`);
  const paintPrev = () => { prev.lastElementChild.textContent = input.value.trim() || 'nothing yet'; };
  input.addEventListener('input', paintPrev); paintPrev();

  const commit = (v) => {
    db.week7[n][1] = v.trim() || '—';
    if (day === 'Thu') db.week.items = db.week7[n][1].split('·').map((x, i) =>
      ({ t: x.trim(), c: i ? 'red' : 'ink' })).filter((x) => x.t && x.t !== '—');
    save(); push('week', { n, t: db.week7[n][1] }); redraw(); paint(); buzz(10);
    window.TRACE_APP && TRACE_APP.closePanel && TRACE_APP.closePanel();
  };
  const send = el(`<button class="p-cta">Put it on her week</button>`);
  send.addEventListener('click', () => commit(input.value));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(input.value); });
  const clear = el(`<button class="p-ghost">Clear ${esc(day)}</button>`);
  clear.addEventListener('click', () => commit(''));

  wrap.appendChild(input); wrap.appendChild(prev); wrap.appendChild(send);
  if (current !== '—') wrap.appendChild(clear);

  ui.panel(day.toLowerCase() + ' — in your hand', (b2) => {
    b2.appendChild(wrap);
    b2.appendChild(el(`<div class="p-hint">She sees this in your handwriting, on her widget.</div>`));
    setTimeout(() => input.focus(), 60);
  });
}

R.addSub('kids', 'kid’s corner', (body) => {
  /* The bin holds things a child said, so they are in a hand — and restoring
     one has to actually take it out of the bin. It toasted success and left
     the row sitting there, which is the worst of both. */
  const draw = () => {
    body.innerHTML = '';
    body.appendChild(el(`<div class="p-canvas" style="height:170px;display:flex;align-items:center;justify-content:center">
      <svg viewBox="0 0 260 140" style="width:100%;height:100%">
        <path d="M30 100 C60 40,90 120,120 60 S190 30,230 90" stroke="var(--ink)" stroke-width="7" fill="none" stroke-linecap="round"/>
        <circle cx="90" cy="46" r="10" fill="var(--amber)"/></svg></div>`));
    body.appendChild(el(`<div class="p-hint">Leo drew at 4:12 — his own corner, his own rules</div>`));
    body.appendChild(el(`<div class="eyebrow" style="padding:8px 0 2px">Wrong-answer bin</div>`));
    if (!db.wrongBin.length) body.appendChild(el(`<div class="p-hint">Empty. Everything he said turned out true.</div>`));
    db.wrongBin.forEach((w) => {
      const r = el(`<button class="row"><span class="grow"><span class="n light hand"
        style="font-size:23px;line-height:1.2">${esc(w)}</span></span>
        <span class="chev">↺</span></button>`);
      r.addEventListener('click', () => {
        db.wrongBin = db.wrongBin.filter((x) => x !== w);
        save(); buzz(8); toast('restored — turns out it was true'); draw();
      });
      body.appendChild(r);
    });
    body.appendChild(note('Kept for laughing at later. Restore one if it turns out true.'));
  };
  draw();
});

R.addSub('letter', 'photo of the letter', (body) => {
  const l = db.letter;
  body.appendChild(el(`<div class="p-canvas" style="height:200px;background:var(--surface);
    display:flex;align-items:center;justify-content:center;color:var(--ink-4);font-size:13px">letter, read on device</div>`));
  body.appendChild(el(kv('From', l.from, 'var(--ink)')));
  body.appendChild(el(kv('Reply by', l.by, 'var(--red-text)')));
  body.appendChild(el(kv('Read on device', 'photo never uploaded', 'var(--ink)')));
  const b = el(`<button class="${l.added ? 'p-ghost' : 'p-cta'}">${l.added ? 'In Household ✓' : 'Add to Household'}</button>`);
  b.addEventListener('click', () => {
    if (l.added) return;
    l.added = true;
    db.tasks.push({ id: 'tl', title: 'Reply to ' + l.from, meta: 'From the letter · by ' + l.by, who: 'Free', chip: 'var(--ink)' });
    db.notices = [{ id: 'letter', t: 'Landlord letter — reply by', when: l.by }].concat(db.notices.filter((n) => n.id !== 'letter'));
    save(); resetDeck(); push('letter', {}); paint(); buzz(14);
    b.textContent = 'In Household ✓'; b.className = 'p-ghost';
    toast('a task on both boards, a notice on her widget');
  });
  body.appendChild(b);
});

R.addSub('pocket', 'the pocket', (body) => {
  const p = db.pocket;
  const draw = () => {
    body.innerHTML = '';
    body.appendChild(el(`<div class="row" style="background:var(--emph);border-color:transparent">
      <span style="font-size:18px;color:var(--emph-ink)">◈</span><span class="grow">
      <span style="display:block;font-size:13px;color:var(--emph-ink-2)">The pocket — does not exist on Maya’s device</span></span></div>`));
    body.appendChild(el(bigNum(p.what, p.when)));
    p.steps.forEach((st, n) => {
      const r = el(tickRow({ on: st.done, title: st.t }));
      r.addEventListener('click', () => { st.done = !st.done; save(); buzz(8); draw(); });
      body.appendChild(r);
    });
    body.appendChild(el(kv(p.reveal, 'as one drawing', 'var(--red)')));
    body.appendChild(note('Not even in her search. Not in the shared backup. Nowhere.'));
  };
  draw();
});

/* =========================================== 20s/20t/20u/24f · the memory */

R.addSub('chapters', 'chapters', (body) => {
  body.appendChild(el(bigNum(db.chapters.length + ' chapters', 'Your story so far')));
  db.chapters.forEach((c) => body.appendChild(el(`<div class="row" style="flex-direction:column;align-items:stretch;gap:4px;
    ${c.now ? 'border-color:var(--hairline)' : ''}">
    <span class="s">${c.now ? '<b style="color:var(--red-text)">NOW</b> · ' : ''}Chapter ${c.n} · ${esc(c.when)}</span>
    <span class="n">${esc(c.t)}</span><span class="s">${esc(c.s)}</span></div>`)));
  body.appendChild(note('Chapters close themselves when life visibly shifts. You can rename, never delete.'));
});

R.addSub('journal', 'journal', (body) => {
  [['Marks today', '6'], ['Lists finished', '2'], ['Overlap awake', '4h 10m'], ['Goodnight sealed', '11:32']]
    .forEach(([k, v]) => body.appendChild(el(kv(k, v, 'var(--ink)'))));
  body.appendChild(el(`<div class="eyebrow" style="padding:10px 0 2px">Noticed, not judged</div>`));
  body.appendChild(el(`<div class="chip" style="font-style:italic">Fridays are your quietest day. Thursdays, Maya draws first.</div>`));
  body.appendChild(note('Counts only. It never reads a word or a drawing’s meaning.'));
  const b = el(`<button class="p-ghost">Add a line in your hand</button>`);
  b.addEventListener('click', () => { R.show('canvas'); toast('write it on the canvas — it files itself'); });
  body.appendChild(b);
});

R.addSub('legacy', 'the year, as a book', (body) => {
  body.appendChild(el(bigNum('365 pages', 'One year of marks')));
  body.appendChild(el(`<div class="p-canvas" style="height:230px;display:flex;align-items:center;justify-content:center">
    <div style="width:150px;height:196px;border-radius:6px 14px 14px 6px;
      background:linear-gradient(160deg,var(--ground-alt),var(--surface));border:1px solid var(--hairline);
      box-shadow:0 16px 40px var(--scrim);display:flex;align-items:center;justify-content:center">
      <svg viewBox="0 0 80 80" style="width:56px;height:56px"><path d="M12 56 C28 20,44 66,68 26"
        stroke="var(--red)" stroke-width="8" fill="none" stroke-linecap="round"/></svg></div></div>`));
  body.appendChild(note('Printed, bound, edition of one. Nothing is uploaded to make it — the file is rendered here and posted from here.'));
});

R.addSub('movie', 'memory movie · June', (body) => {
  const draw = () => {
    body.innerHTML = '';
    body.appendChild(el(`<div class="p-canvas" style="height:240px;display:flex;align-items:center;justify-content:center">
      <svg viewBox="0 0 300 200" style="width:100%;height:100%">
        <path d="M30 140 C80 60,130 170,180 90 S260 60,280 120" stroke="var(--red)" stroke-width="6" fill="none"
          stroke-linecap="round" stroke-dasharray="400" stroke-dashoffset="${400 - db.movie * 4}"/></svg></div>`));
    body.appendChild(el(`<div class="p-hint">June 14 · the day it rained</div>`));
    body.appendChild(el(`<div style="display:flex;align-items:center;gap:10px">
      <span style="font-size:12px;color:var(--ink-3);width:74px">0:${String(Math.round(db.movie * .41)).padStart(2, '0')} / 0:41</span>
      <span style="flex:1;height:6px;border-radius:99px;background:var(--hairline);overflow:hidden;display:block">
        <span style="display:block;height:100%;width:${db.movie}%;background:var(--red)"></span></span></div>`));
    const row = el(`<div class="p-row"></div>`);
    [['↺', () => { db.movie = 0; }], ['▶', () => { db.movie = (db.movie + 17) % 100; }], ['⤓', null]]
      .forEach(([g, fn]) => {
        const b = el(`<button class="p-ghost">${g}</button>`);
        b.addEventListener('click', () => { if (fn) { fn(); save(); draw(); } else toast('rendered here, shared as a file or not at all'); });
        row.appendChild(b);
      });
    body.appendChild(row);
    body.appendChild(note('31 days of marks, replayed in the order you drew them.'));
  };
  draw();
});

R.addSub('weekly10', 'weekly ten minutes', (body) => {
  body.appendChild(el(bigNum('10:00', 'Sunday, 6 PM')));
  db.weeklyTen.forEach(([t, m]) => body.appendChild(el(kv(t, m, 'var(--ink)'))));
  const b = el(`<button class="p-cta">Start the ten</button>`);
  b.addEventListener('click', () => { buzz(16); toast('ten minutes. both phones down.'); });
  body.appendChild(b);
  body.appendChild(note('The one recurring thing in Trace, because it is the only one both of you agreed to.'));
});

/* ------------------------------------------------------------ where they live */

const openN = () => db.blocked.filter((b) => !db.unblocked[b.id]).length;

R.addRow('Household', 'debt', 'Decision debt', () => `${db.debts.length - count(db.decided)} open, ageing`);
R.addRow('Household', 'load', 'Mental load', () => 'The work nobody counts');
R.addRow('Household', 'waiting', 'The waiting room', () => `${openN()} blocked`);
R.addRow('Household', 'rsvp', 'Yes / no board', () => `${db.invites.length - count(db.rsvp)} unanswered`);
R.addRow('Household', 'renewals', 'Renewal radar', () => '€94/mo you forgot');
R.addRow('Household', 'where', 'Where is it', () => `${db.things.length} things, findable`);
R.addRow('Household', 'brief', 'The brief', () => db.brief.got ? 'Handed over ✓' : db.brief.task);
R.addRow('Household', 'ask', 'Recurring + ask nicely', () => 'Bins out · yours this week');
R.addRow('Household', 'letter', 'Photo of the letter', () => db.letter.added ? 'Added ✓' : `${db.letter.from} · by ${db.letter.by}`);
R.addRow('Household', 'kids', 'Kid’s corner', () => 'And the wrong-answer bin');
R.addRow('Household', 'week7', 'The week', () => 'Typed, shown in your hand');

R.addRow('Together', 'money', 'Money truth', () => `€${db.money.free} free this month`);
R.addRow('Together', 'pocket', 'The pocket', () => 'Does not exist on her device');
R.addRow('Together', 'weekly10', 'Weekly ten minutes', () => 'Sunday, 6 PM');

R.addRow('Memory', 'chapters', 'Chapters', () => `${db.chapters.length} · the story shelves itself`);
R.addRow('Memory', 'movie', 'Memory movie', () => 'June · 31 days, replayed');
R.addRow('Memory', 'journal', 'Journal', () => 'Counts only, never meaning');
R.addRow('Memory', 'wall', 'The wall', () => `${db.wallKept} kept forever`);
R.addRow('Memory', 'daymap', 'Map of your day', () => 'Drawn from your steps');
R.addRow('Memory', 'legacy', 'The year, as a book', () => '365 pages, edition of one');

R.addRow('Wellbeing', 'energy', 'Energy match', () => 'When each of you is sharp');
R.addRow('Wellbeing', 'doctor', 'Doctor’s note', () => db.doctor.sent ? 'On her widget ✓' : `Maya · ${db.doctor.when}`);
R.addRow('Wellbeing', 'rituals', 'Your rituals', () => `${db.rituals.length} learned, none enforced`);
R.addRow('Wellbeing', 'tiny', 'The tiny one', () => db.tiny ? 'On device, counts only' : 'Off');
R.addRow('Wellbeing', 'handoff', 'Morning handoff', () => 'What she left overnight');

R.addRow('Board', 'guest', 'Guest mode', () => db.guest ? 'On — ends at midnight' : 'Someone’s coming');
R.addRow('Board', 'sleep', 'Her state', () => db.awake ? 'Awake' : 'Asleep — nothing buzzes');
R.addRow('Board', 'car', 'Car mode', () => db.carMode ? 'On — ETA on her widget' : 'Off');
R.addRow('Board', 'stack', 'Widget stack order', () => db.stack[0] + ' first');

/* the flare sits with the tap: both are things you send without a sentence */
R.addPresence((body) => {
  const b = R.el(`<button class="p-ghost" style="border-color:var(--red-line);color:var(--red)">The flare — I need you</button>`);
  b.addEventListener('click', () => R.openSub('flare'));
  body.appendChild(b);
});

/* ------------------------------------------------- what reaches her widget */

/* the flare is the only thing that outranks "leaving now" */
R.addCard((d) => {
  if (!d.flare || Date.now() - d.flare.ts > 6e5) return null;
  return { pri: 0, kind: 'flare', tint: 'var(--red)', head: 'I need you', foot: 'the flare',
    render(b) {
      b.innerHTML = `<div class="w-mid"><div class="w-orb" style="background:radial-gradient(circle at 40% 35%,#FF8A94,var(--red));
        box-shadow:0 0 44px rgba(226,51,67,.7)"></div><b>I need you</b>
        <i>Breaks armour, quiet hours, everything</i></div>`;
      return {};
    } };
});

/* 25c: one number on her widget, no nagging */
R.addCard((d) => {
  const n = d.blocked.filter((b) => b.on === 'Maya' && !d.unblocked[b.id]).length;
  if (!n || !d.pub.list) return null;
  return { pri: 6, kind: 'waiting', tint: 'var(--ink)', head: n + ' waiting', foot: 'blocked on her',
    render(b) {
      b.innerHTML = `<div class="w-kicker" style="color:var(--red-text)">Waiting on you</div>
        <div class="w-big">${n} <span style="font-size:13px;font-weight:500;color:var(--ink-3)">things can’t move</span></div>`;
      return { cap: 'One number. No nagging, just visible.' };
    } };
});

/* 23a: guests get a dot, nothing more */
R.addCard((d) => d.guest ? {
  pri: 9, kind: 'guests', tint: 'var(--ink-2)', head: 'guests', foot: 'guest mode',
  render(b) {
    b.innerHTML = `<div class="w-mid"><div style="width:10px;height:10px;border-radius:50%;background:var(--amber)"></div>
      <b>Guests</b><i>The private layer is hidden until midnight</i></div>`;
    return {};
  } } : null);

/* 24c: asleep — the widget dims and stops updating */
R.addCard((d) => d.awake ? null : {
  pri: 10, kind: 'asleep', tint: 'var(--ink-3)', head: 'asleep', foot: 'her state',
  render(b) {
    b.innerHTML = `<div class="w-mid" style="opacity:.55"><div class="w-orb"
      style="background:var(--ink-5);box-shadow:none"></div>
      <b>Maya is asleep</b><i>Your marks are waiting for her</i></div>`;
    return {};
  } });

/* 23f: what she left overnight, once, at your wake time */
R.addCard((d) => {
  if (d.handoffSeen) return null;
  const h = new Date().getHours();
  if (h < 5 || h > 11) return null;
  return { pri: 3.5, kind: 'handoff', tint: 'var(--ink)', head: 'three things', foot: 'while you slept',
    render(b) {
      b.innerHTML = `<div class="w-kicker" style="color:var(--red-text)">While you slept</div>
        <div class="w-note">Maya left you three things</div>`;
      return { cap: 'Appears once, at your wake time. Never a notification.' };
    } };
});

R.paint();
})();
