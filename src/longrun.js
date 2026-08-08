/* trace — the long run: the drift (p57), the friend of the relationship
 * (p58), solo nights (p59), ageing parents (p60), the visitor (p61).
 *
 * These are the screens about years rather than days. Four of the five show a
 * number that is uncomfortable — hours together falling, 82% of the care, 70%
 * of the hosting — and none of them attaches a verdict to it. The design's
 * position is that a couple can act on a fact and cannot act on a judgement,
 * so the app supplies the fact and stops.
 *
 * p58 is the exception and the safeguard: the one place a third person is
 * allowed in, read-only, by mutual consent, expiring on its own.
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
  drift: [88, 76, 60, 48, 36, 26],          /* hours awake together, six weeks */
  driftSeen: false,
  friend: { name: 'Dr. Karin Møller', role: 'Couples counsellor · invited by Maya, agreed by you',
    days: 21, active: true },
  friendSees: { hours: true, split: true, mood: false, canvas: false, pocket: false },
  solo: { yours: 'Wednesdays', hers: 'Mondays', on: true },
  care: { who: 'Your mum', age: 78, you: 82 },
  careItems: [
    { id: 'c1', t: 'Thursday pharmacy run', s: 'Weekly · always you', swap: true },
    { id: 'c2', t: 'Cardiology, Sep 3', s: 'Someone has to drive' },
    { id: 'c3', t: 'The forms, again', s: 'Third time this year', swap: true },
  ],
  visitor: { who: 'Her cousin', nights: 3, day: 2, on: true,
    pact: '“Three nights, not four. We say it on day one, not day three.”', signed: 'Aug 30' },
});

for (const id of ['drift', 'friend', 'solo', 'care', 'visitor']) {
  const sec = document.createElement('section');
  sec.className = 'scr hidden'; sec.id = 'sc-' + id;
  $('#stack').appendChild(sec);
  screens[id] = sec;
}
const back = (s, to) => $$('[data-back],[data-close]', s).forEach((b) =>
  b.addEventListener('click', () => show(to || 'rooms')));
const head = (k, h, l) => `<div class="head"><div class="k">${k}</div>
  <div class="h sm">${h}</div>${l ? `<div class="l">${l}</div>` : ''}</div>`;
/* a split bar where both halves are effort — never a winner and a loser */
const split = (a, label) => `
  <div style="padding:16px 24px 0;flex:none">
    <div style="height:10px;border-radius:99px;background:var(--ground-alt);overflow:hidden;display:flex">
      <div style="width:${a}%;background:var(--ink)"></div>
      <div style="flex:1;background:var(--red)"></div></div>
    <div style="display:flex;justify-content:space-between;padding-top:8px;font-size:12px;color:var(--ink-3)">
      ${label}</div></div>`;

/* ================================================================= p57 the drift
 *
 * Six bars and no advice. The app's only move is to show the shape and offer
 * one small thing — anything more would be a product telling two adults their
 * relationship is in trouble, which is not a thing software gets to say. */

function renderDrift() {
  const s = screens.drift;
  const d = db.drift;
  const max = Math.max(...d);
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>The drift</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      ${head('Six weeks, honestly', 'You’ve been passing each other')}
      <div style="padding:18px 20px 0;flex:none">
        <div class="card" style="border-radius:22px;padding:18px">
          <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)">
            Hours awake together, per week</div>
          <div style="display:flex;align-items:flex-end;justify-content:space-between;height:120px;margin-top:14px">
            ${d.map((v, i) => {
              /* the colour is the trend, not a threshold — the last weeks are
                 red because they are the recent ones, not because they failed */
              const t = i / (d.length - 1);
              const c = t < .5 ? 'var(--ink)' : `rgba(226,51,67,${(0.5 + t * 0.5).toFixed(2)})`;
              return `<div style="width:24px;height:${Math.round((v / max) * 100)}%;border-radius:6px;background:${c}"></div>`;
            }).join('')}
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:var(--ink-4)">
            <span>Jun</span><span>now</span></div>
        </div>
      </div>
      <div class="stackcol">
        <div class="card quiet"><div class="t">${d[0]} hours, then. ${d[d.length - 1]} hours, now.</div>
          <div class="d">Nothing is wrong. Both of your calendars simply filled up, one week at a time.</div></div>
        <button class="card" data-d="time"><div class="t">Find us one evening</div>
          <div class="d">The next window you’re both actually free — and awake.</div></button>
        <button class="card" data-d="solo"><div class="t">Protect one night each</div>
          <div class="d">Time apart on purpose is what makes the rest deliberate.</div></button>
      </div>
      <div class="spacer"></div>
      <div style="padding:0 20px;flex:none">
        <div class="note">Trace shows the shape and stops. It will never tell you what this means
          about the two of you — it doesn’t know, and neither does any app.</div>
      </div>
      <div class="foot">Shown once every six weeks, at most. Never as a notification.</div>
    </div>`;
  back(s);
  $$('[data-d]', s).forEach((b) => b.addEventListener('click', () => {
    buzz(8); show(b.dataset.d === 'time' ? 'findtime' : 'solo');
  }));
}

/* ============================================= p58 the friend of the relationship
 *
 * Read-only, mutually agreed, self-expiring. Every one of those three is
 * load-bearing: without consent it is surveillance, without read-only it is a
 * third party in the marriage, and without the expiry someone forgets. */

const FRIEND_ROWS = [
  ['hours', 'Hours together, per week'],
  ['split', 'The fair split'],
  ['mood', 'Mood weather'],
  ['canvas', 'The canvas'],
  ['pocket', 'Either pocket'],
];

function renderFriend() {
  const s = screens.friend;
  const f = db.friend;
  const initials = f.name.replace(/[^A-ZÆØÅ]/g, '').slice(0, 2);
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>One person in</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      ${head('When you’re stuck', 'Let one person in',
        'A counsellor, a sister, the friend who tells you both the truth. Both of you have to agree, ' +
        'and it expires by itself.')}
      <div style="padding:18px 20px 0;flex:none">
        <div class="card" style="border-radius:22px;padding:18px">
          <div style="display:flex;align-items:center;gap:14px">
            <span style="width:44px;height:44px;border-radius:50%;background:var(--emph);color:var(--emph-ink);
              display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;flex:none">${initials}</span>
            <span style="flex:1"><span class="t" style="font-size:16px">${esc(f.name)}</span>
              <span class="d">${esc(f.role)}</span></span>
          </div>
          <div style="display:flex;gap:8px;margin-top:14px">
            <span class="who them">expires in ${f.days} days</span>
            <span class="who">read only</span>
          </div>
        </div>
      </div>
      <div class="eyebrow">What she can see</div>
      <div style="padding:0 20px;flex:none">
        <div class="sheet">
          ${FRIEND_ROWS.map(([k, label]) => {
            const on = db.friendSees[k];
            const locked = k === 'pocket' || k === 'canvas';
            return `<div class="r"><span class="k">${label}</span>
              ${locked
                ? '<span class="v" style="color:var(--ink-4)">never</span>'
                : `<button class="v end" data-see="${k}"
                    style="color:${on ? 'var(--ink)' : 'var(--ink-4)'}">${on ? 'yes' : 'no'}</button>`}</div>`;
          }).join('')}
        </div>
      </div>
      <div class="spacer"></div>
      <div style="padding:0 20px;flex:none">
        <div class="note">The canvas and both pockets are never on this list, at any setting.
          A third person can see how you are doing, never what you said.</div>
      </div>
      <div class="actions" style="padding-top:14px">
        <button class="${f.active ? 'btn-plain' : 'btn-red'}" data-toggle>
          ${f.active ? 'End it now' : 'Invite someone'}</button>
      </div>
    </div>`;
  back(s);
  $$('[data-see]', s).forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.see;
    db.friendSees[k] = !db.friendSees[k]; save(); R.push('friend-sees', { k }); buzz(8); renderFriend();
  }));
  $$('[data-toggle]', s).forEach((b) => b.addEventListener('click', () => {
    /* ending is one-sided on purpose — consent that only two people together
       can withdraw is not consent */
    db.friend = { ...f, active: !f.active }; save(); R.push('friend', { active: db.friend.active });
    buzz(12);
    toast(db.friend.active ? 'invited — she has to agree too' : 'ended. either of you can, alone.');
    renderFriend();
  }));
}

/* ============================================================ p59 solo nights
 *
 * Time apart on purpose, protected like an appointment. The interesting rule
 * is the last one: on a solo night the app tells the other person less, not
 * more. */

const SOLO_RULES = [
  ['Presence dot', 'off', true],
  ['“Leaving now”', 'off', true],
  ['Her widget', 'says nothing'],
  ['The canvas', 'still open'],
  ['The flare', 'gets through', true],
];

function renderSolo() {
  const s = screens.solo;
  const so = db.solo;
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Solo nights</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      ${head('Time apart, on purpose', so.on ? esc(so.yours) + ' is yours' : 'Nothing is protected yet')}
      <div style="padding:18px 20px 0;flex:none">
        <div class="card ink" style="border-radius:22px;padding:20px 22px">
          <div style="display:flex;justify-content:space-between;gap:20px">
            <span><span class="lbl">Your night</span>
              <span style="display:block;font-size:24px;font-weight:700;margin-top:4px">${esc(so.yours)}</span></span>
            <span style="text-align:right"><span class="lbl">Hers</span>
              <span style="display:block;font-size:24px;font-weight:700;margin-top:4px">${esc(so.hers)}</span></span>
          </div>
          <div class="d" style="margin-top:12px;line-height:1.5">Protected like an appointment. Trace declines
            invitations on both, and won’t show either of you the other’s whereabouts.</div>
        </div>
      </div>
      <div class="eyebrow">On a solo night</div>
      <div style="padding:0 20px;flex:none">
        <div class="sheet">
          ${SOLO_RULES.map(([k, v, red]) => `<div class="r"><span class="k">${k}</span>
            <span class="v${red ? ' red' : ''}">${v}</span></div>`).join('')}
        </div>
      </div>
      <div class="spacer"></div>
      <div style="padding:0 20px;flex:none">
        <div class="note">A night off is not an absence to be explained. Neither of you gets a report
          about the other’s evening, before or after.</div>
      </div>
      <div class="actions" style="padding-top:14px">
        <button class="${so.on ? 'btn-plain' : 'btn-red'}" data-toggle>
          ${so.on ? 'Stop protecting them' : 'Protect one night each'}</button>
      </div>
    </div>`;
  back(s);
  $$('[data-toggle]', s).forEach((b) => b.addEventListener('click', () => {
    db.solo = { ...so, on: !so.on }; save(); R.setMode('solo', db.solo.on); buzz(10);
    toast(db.solo.on ? 'both nights are in the calendar' : 'unprotected');
    renderSolo();
  }));
}

/* ========================================================== p60 ageing parents
 *
 * "Maya couldn't see it until it was here" is the whole reason the screen
 * exists. Invisible care is the kind that gets resented, and a number is the
 * cheapest way to make it visible without anyone having to complain. */

function renderCare() {
  const s = screens.care;
  const c = db.care;
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Care</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      ${head(`${esc(c.who)} · ${c.age}`, 'The care you carry',
        'It’s mostly you, and Maya couldn’t see it until it was here.')}
      ${split(c.you, `<span>You · ${c.you}%</span><span>Maya · ${100 - c.you}%</span>`)}
      <div class="stackcol">
        ${db.careItems.map((i) => `
          <div class="card line" style="border-radius:16px;padding:13px 16px">
            <span class="grow"><span class="t" style="font-size:15px;font-weight:600">${esc(i.t)}</span>
              <span class="d">${esc(i.s)}</span></span>
            ${i.swap ? `<button class="end red" data-swap="${i.id}">swap?</button>` : ''}
          </div>`).join('')}
      </div>
      <div style="padding:14px 20px 0;flex:none">
        <div class="card ink"><div class="t">It counts as household work</div>
          <div class="d" style="line-height:1.5">Hours spent on a parent go into the fair split like
            anything else. That is the only opinion Trace has about it.</div></div>
      </div>
      <div class="spacer"></div>
      <div style="padding:0 20px;flex:none">
        <div class="note">Nobody is asked to take a turn. The number is here so it can be discussed,
          not so it can be enforced.</div>
      </div>
      <div class="foot">Her parents get the same page, whenever it’s needed.</div>
    </div>`;
  back(s);
  $$('[data-swap]', s).forEach((b) => b.addEventListener('click', () => {
    const i = db.careItems.find((x) => x.id === b.dataset.swap);
    i.s = 'Asked — she sees it when she opens the app'; delete i.swap;
    db.care = { ...c, you: Math.max(50, c.you - 6) };
    save(); R.push('care', { id: i.id }); buzz(10);
    toast('asked, not assigned'); renderCare();
  }));
}

/* ============================================================== p61 the visitor
 *
 * The pact is written before the guest arrives and shown while they are here.
 * Everything else on the screen is the cost of hosting, made visible while it
 * is still happening rather than in the argument afterwards. */

function renderVisitor() {
  const s = screens.visitor;
  const v = db.visitor;
  const rows = [
    ['Guest mode', v.on ? 'on since Tue' : 'off', v.on],
    ['Extra hands each day', '+2 tasks'],
    ['Doing the hosting', 'you 70%'],
    ['The canvas', 'hidden'],
    ['Ends automatically', 'day ' + v.nights],
  ];
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>The visitor</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      ${head(`${esc(v.who)} · ${v.nights} nights`, `Day ${v.day} of ${v.nights}`)}
      <div style="padding:18px 20px 0;flex:none">
        <div class="card ink" style="border-radius:22px;padding:20px 22px">
          <div class="lbl">Agreed before he arrived</div>
          <div class="hand" style="font-size:28px;line-height:1.2;margin-top:10px">${esc(v.pact)}</div>
          <div style="font-size:12px;color:var(--emph-ink-4);margin-top:10px">Co-signed by you both, ${esc(v.signed)}</div>
        </div>
      </div>
      <div class="eyebrow">While he’s here</div>
      <div style="padding:0 20px;flex:none">
        <div class="sheet">
          ${rows.map(([k, val, red]) => `<div class="r"><span class="k">${k}</span>
            <span class="v${red ? ' red' : ''}">${val}</span></div>`).join('')}
        </div>
      </div>
      <div class="spacer"></div>
      <div style="padding:0 20px;flex:none">
        <div class="note">The pact is shown while it still matters. Trace will not raise it afterwards,
          and it keeps no record of whether you kept it.</div>
      </div>
      <div class="actions" style="padding-top:14px">
        <button class="btn-plain" data-extend>He’s staying another night</button>
      </div>
    </div>`;
  back(s);
  /* extending is allowed and unremarked — the pact is a plan, not a contract */
  $$('[data-extend]', s).forEach((b) => b.addEventListener('click', () => {
    db.visitor = { ...v, nights: v.nights + 1 }; save(); R.push('visitor', { nights: db.visitor.nights });
    buzz(10); toast('noted. nothing is said about the pact.'); renderVisitor();
  }));
}

/* ------------------------------------------------------------------ wiring */

R.addScreen('drift', renderDrift);
R.addScreen('friend', renderFriend);
R.addScreen('solo', renderSolo);
R.addScreen('care', renderCare);
R.addScreen('visitor', renderVisitor);

R.addBeyond('The drift', 'Six weeks of hours together, no verdict', 'drift', 'The long run');
R.addBeyond('Let one person in', 'A third pair of eyes, read-only, expiring', 'friend', 'The long run');
R.addBeyond('Solo nights', 'One protected night each, on purpose', 'solo', 'The long run');
R.addBeyond('Ageing parents', 'The care one of you is carrying', 'care', 'The long run');
R.addBeyond('A visitor', 'The pact, while it still matters', 'visitor', 'The long run');

renderDrift(); renderFriend(); renderSolo(); renderCare(); renderVisitor();
})();
