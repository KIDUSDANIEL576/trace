/* trace — the last six: meal wheel (p10), memory (p21), the daily loop (p26),
 * kid's corner (p33), the people layer (p48), settle up (p49).
 *
 * Nothing links these except that each removes a recurring negotiation. The
 * wheel ends "what do you want for dinner"; settle up ends the running tally
 * in two heads; the people layer ends "who booked the sitter last time".
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
  vetoUsed: false,
  chapter: 4, chapterName: 'The Berlin months',
  kid: { name: 'Leo', drewAt: '4:12' },
  school: [
    { d: 'Mon', t: 'Drop + collect', who: 'You' }, { d: 'Tue', t: 'Drop only', who: 'Maya' },
    { d: 'Wed', t: 'Drop + collect', who: 'Maya' }, { d: 'Thu', t: 'Collect only', who: 'You' },
    { d: 'Fri', t: 'Both, then the park', who: 'Both' },
  ],
  people: [
    { id: 'p1', n: 'Rita · the sitter', s: 'Last booked 3 weeks ago · Maya arranges', tag: 'R', red: true },
    { id: 'p2', n: 'Pádraig · the plumber', s: 'Came in June · you called him', tag: 'P' },
    { id: 'p3', n: 'Sam & Jo', s: 'Dinner owed — they hosted twice', tag: 'S' },
    { id: 'p4', n: 'Your mum', s: 'Sunday call · usually you', tag: 'M' },
    { id: 'p5', n: 'Dr. Okafor', s: 'Leo’s GP · both registered', tag: 'D' },
  ],
  ledger: [
    { t: 'Weekly shop', who: 'Maya', v: 94 },
    { t: 'Leo’s shoes', who: 'Maya', v: 48 },
    { t: 'Plumber deposit', who: 'You', v: 60 },
    { t: 'Train tickets', who: 'You', v: 18 },
  ],
});

for (const id of ['wheel', 'memory', 'loop', 'kid', 'people', 'settle']) {
  const sec = document.createElement('section');
  sec.className = 'scr hidden'; sec.id = 'sc-' + id;
  $('#stack').appendChild(sec);
  screens[id] = sec;
}
const back = (s, to) => $$('[data-back],[data-close]', s).forEach((b) =>
  b.addEventListener('click', () => show(to || 'rooms')));
const head = (k, h, l) => `<div class="head"><div class="k">${k}</div>
  <div class="h sm">${h}</div>${l ? `<div class="l">${l}</div>` : ''}</div>`;

/* ============================================================= p10 meal wheel
 *
 * "Maya can veto once. Then it's law." The single veto is what makes the wheel
 * work: without it nobody trusts the spin, and with two of them you are back
 * to negotiating. */

function renderWheel() {
  const s = screens.wheel;
  const meal = db.meals[db.mealIdx % db.meals.length];
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Dinner</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      <div class="head" style="padding-top:26px">
        <div class="k">Nobody decides, so</div>
        <div class="h sm">the wheel does</div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px 0">
        <div style="font-size:18px;color:var(--red-text)">▼</div>
        <div style="position:relative;width:270px;height:270px">
          <div id="wheel-disc" style="position:absolute;inset:0;border-radius:50%;border:2px solid var(--ink);
            transition:transform 1.6s cubic-bezier(.16,.9,.24,1);
            background:conic-gradient(var(--ink) 0 60deg,var(--red) 60deg 120deg,var(--ground) 120deg 180deg,
              var(--ink) 180deg 240deg,var(--red) 240deg 300deg,var(--ground) 300deg 360deg)"></div>
          <div style="position:absolute;inset:52px;border-radius:50%;background:var(--ground);
            border:2px solid var(--ink);display:flex;flex-direction:column;align-items:center;
            justify-content:center;gap:4px;padding:10px;text-align:center">
            <span style="font-size:12px;color:var(--ink-3)">tonight</span>
            <span class="hand" style="font-size:30px;line-height:1">${esc(meal)}</span>
          </div>
        </div>
        <div style="padding:8px 16px;border-radius:999px;background:var(--surface);
          border:1px solid var(--hairline);font-size:13px;color:var(--ink-70)">
          ${db.vetoUsed ? 'Veto spent. Tonight is law.' : 'Maya can veto once. Then it’s law.'}</div>
      </div>
      <div class="actions">
        <button class="btn-red" data-spin>Spin</button>
        <button class="btn-plain" style="flex:0 0 120px" data-veto ${db.vetoUsed ? 'disabled' : ''}
          >${db.vetoUsed ? 'Spent' : 'Veto'}</button>
      </div>
    </div>`;
  back(s);
  if (db.vetoUsed) $('[data-veto]', s).style.opacity = .4;
  let turns = 0;
  $$('[data-spin]', s).forEach((b) => b.addEventListener('click', () => {
    /* the wheel has to actually land somewhere — a spin that always stops in
       the same place is a button pretending to be chance */
    const steps = 3 + Math.floor(Math.random() * db.meals.length);
    db.mealIdx = (db.mealIdx + steps) % db.meals.length;
    db.vetoUsed = false; save(); R.push('meal', { idx: db.mealIdx }); buzz(12);
    turns += 2 + steps / db.meals.length;
    $('#wheel-disc', s).style.transform = `rotate(${turns * 360}deg)`;
    setTimeout(() => { if (s.isConnected) renderWheel(); }, 1650);
  }));
  $$('[data-veto]', s).forEach((b) => b.addEventListener('click', () => {
    if (db.vetoUsed) { toast('one veto. it’s spent.'); return; }
    db.mealIdx = (db.mealIdx + 1) % db.meals.length;
    db.vetoUsed = true; save(); R.push('meal', { idx: db.mealIdx, veto: true }); buzz(10);
    toast('vetoed. the next one is law.');
    renderWheel();
  }));
}

/* ================================================================== p21 memory
 *
 * A year of marks as a grid, then the chapters. The grid is the only place in
 * the app where a long run of empty days is visible, and it is deliberately
 * not scored — the empty squares are just paper. */

function renderMemory() {
  const s = screens.memory;
  /* empty days are a pale ink tint, not white — on paper, white cells would be
     the brightest thing on the grid and the blank weeks would read as the loud
     ones. SCREENS.md p21: "Empty days are pale, never red." */
  const shades = ['var(--grid-empty)', 'rgba(226,51,67,.35)', 'rgba(226,51,67,.6)', 'var(--red)', 'var(--ink)'];
  const cells = Array.from({ length: 98 }, (_, n) => {
    const h = ((n * 2654435761) >>> 0) % 10;
    return shades[h < 4 ? 0 : h < 6 ? 1 : h < 8 ? 2 : h < 9 ? 3 : 4];
  });
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Memory</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      ${head(`Chapter ${db.chapter} · ${esc(db.chapterName)}`, `${db.marks} marks this year`)}
      <div style="padding:18px 20px 0;flex:none">
        <div style="display:grid;grid-template-columns:repeat(14,1fr);gap:4px">
          ${cells.map((c) => `<div style="aspect-ratio:1;border-radius:4px;background:${c}"></div>`).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:11px;color:var(--ink-4)">
          <span>14 weeks</span><span>the pale ones are just paper</span></div>
      </div>
      <div class="eyebrow">Chapters</div>
      <div class="stackcol" style="padding-top:0">
        <button class="card" data-c="4"><div class="t">4 · The Berlin months</div>
          <div class="d">Open · 61 marks so far</div></button>
        <button class="card" data-c="3"><div class="t">3 · The flat with the bad boiler</div>
          <div class="d">Closed Jun 2 · 148 marks · printed</div></button>
        <button class="card" data-c="2"><div class="t">2 · Two cities, one canvas</div>
          <div class="d">Closed Jan 14 · 122 goodnight seals, zero missed</div></button>
      </div>
      <div style="padding:14px 20px 0;flex:none">
        <div class="card ink"><div class="t">The jar</div>
          <div class="d" style="line-height:1.5">${db.jarN} notes, sealed until the date you set.
            Neither of you can open one early — that is the whole point of a jar.</div></div>
      </div>
      <div class="spacer"></div>
      <div class="foot">Chapters close when you say so. Trace never ends one for you.</div>
    </div>`;
  back(s);
  $$('[data-c]', s).forEach((b) => b.addEventListener('click', () => {
    buzz(8); toast(b.dataset.c === String(db.chapter) ? 'this one is still being written' : 'reopened for reading only');
  }));
}

/* ============================================================ p26 the daily loop
 *
 * The product in one screen: four moments, ninety seconds, and the list of
 * what never interrupts underneath. Anyone who reads this screen knows what
 * the app is for. */

const LOOP = [
  ['6:04', 'Morning handoff', 'What she left overnight. Type one back.'],
  ['13:00', 'The two-minute pile', 'Clear the small stuff together, once.'],
  ['18:30', 'Leaving now', 'It sends itself. Nobody asks where you are.'],
  ['23:30', 'Goodnight', 'The canvas seals. The day is closed.'],
];

function renderLoop() {
  const s = screens.loop;
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>The loop</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      ${head('Four moments, ninety seconds', 'The daily loop')}
      <div class="stackcol">
        ${LOOP.map(([at, t, d]) => `
          <div class="card line" style="border-radius:18px;padding:14px 16px">
            <span style="font-size:13px;font-weight:700;color:var(--red-text);width:46px;flex:none">${at}</span>
            <span class="grow"><span class="t" style="font-size:15px;font-weight:600">${t}</span>
              <span class="d">${d}</span></span></div>`).join('')}
      </div>
      <div class="eyebrow">And the three rules</div>
      <div style="padding:0 20px;flex:none">
        <div class="card ink" style="padding:0;overflow:hidden">
          <div style="padding:14px 18px;font-size:14px">1 · Home is always the canvas</div>
          <div style="padding:14px 18px;font-size:14px;border-top:1px solid var(--emph-line)">2 · No room notifies about itself</div>
          <div style="padding:14px 18px;font-size:14px;border-top:1px solid var(--emph-line)">3 · Nothing that reads a drawing leaves the device</div>
        </div>
      </div>
      <div style="padding:14px 20px 0;flex:none">
        <div class="note">Everything else waits on the widget until somebody looks. That is the
          entire notification strategy, and it is why most days nobody opens the app.</div>
      </div>
      <div class="spacer"></div>
      <div class="actions">
        <button class="btn-ink" data-see>See what can interrupt</button>
      </div>
    </div>`;
  back(s);
  $$('[data-see]', s).forEach((b) => b.addEventListener('click', () => show('interrupt')));
}

/* ============================================================ p33 kid's corner
 *
 * His rules, his corner. The one part of the canvas the adults do not curate,
 * and nothing he draws is scored, shared outward, or kept as a metric. */

function renderKid() {
  const s = screens.kid;
  const k = db.kid;
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Kid’s corner</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      ${head('Kid’s corner', `${esc(k.name)}’s own patch`)}
      <div style="padding:18px 20px 0;flex:none">
        <div class="card" style="border-radius:22px;height:250px;position:relative;overflow:hidden;padding:0">
          <svg viewBox="0 0 330 250" style="position:absolute;inset:0;width:100%;height:100%">
            <path d="M40 190 L90 90 L140 190 Z" stroke="var(--red)" stroke-width="7" fill="none"
              stroke-linejoin="round" stroke-linecap="round"></path>
            <circle cx="240" cy="80" r="34" stroke="var(--amber)" stroke-width="7" fill="none"></circle>
            <path d="M170 200 C200 150,240 220,300 170" stroke="var(--ink)" stroke-width="7"
              fill="none" stroke-linecap="round"></path>
            <path d="M60 50 L70 70 L90 46" stroke="var(--violet)" stroke-width="6" fill="none"
              stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
          <div style="position:absolute;left:14px;bottom:14px;padding:7px 13px;border-radius:999px;
            background:var(--emph);color:var(--emph-ink);font-size:12px">
            ${esc(k.name)} drew at ${esc(k.drewAt)} — his rules, his corner</div>
        </div>
      </div>
      <div class="eyebrow">School run · this week</div>
      <div class="stackcol" style="padding-top:0">
        ${db.school.map((r) => `
          <div class="card line" style="border-radius:16px;padding:12px 16px">
            <span style="width:34px;font-size:13px;font-weight:700;color:var(--ink-3);flex:none">${r.d}</span>
            <span class="grow" style="font-size:15px">${esc(r.t)}</span>
            <span class="who${r.who === 'Maya' ? ' them' : ''}">${r.who}</span></div>`).join('')}
      </div>
      <div class="spacer"></div>
      <div style="padding:0 20px;flex:none">
        <div class="note">Nothing he draws is counted, shared outside this phone, or kept as a
          record of anything. It is a corner of paper, not a profile.</div>
      </div>
      <div class="foot">He has no account, and never will.</div>
    </div>`;
  back(s);
}

/* =========================================================== p48 the people layer
 *
 * The value is the second line of every row: who arranges this one. That is
 * the invisible labour nobody logs, and writing it down ends the argument
 * about who booked the sitter last time. */

function renderPeople() {
  const s = screens.people;
  const draw = (q) => {
    const list = db.people.filter((p) => !q || (p.n + ' ' + p.s).toLowerCase().includes(q.toLowerCase()));
    return list.map((p) => `
      <div class="card line" style="border-radius:16px;padding:12px 16px">
        <span style="width:36px;height:36px;border-radius:50%;flex:none;display:flex;align-items:center;
          justify-content:center;font-size:14px;font-weight:700;
          background:${p.red ? 'var(--red)' : 'var(--emph)'};
          color:${p.red ? 'var(--on-red)' : 'var(--emph-ink)'}">${p.tag}</span>
        <span class="grow"><span class="t" style="font-size:15px;font-weight:600">${esc(p.n)}</span>
          <span class="d">${esc(p.s)}</span></span>
        <button class="callbtn" data-call="${p.id}">✆</button></div>`).join('')
      || `<div class="foot" style="padding-top:24px">Nobody by that name.</div>`;
  };
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>People</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      ${head('Your people', 'Who to call, and who calls them')}
      <div class="search" style="margin:16px 20px 0">
        <input id="ppl-q" placeholder="Search people" autocomplete="off"><span>⌕</span></div>
      <div class="stackcol" id="ppl-list">${draw('')}</div>
      <div class="eyebrow">In an emergency</div>
      <div style="padding:0 20px;flex:none">
        <div class="card ink"><div class="t">Reachable from a locked phone</div>
          <div class="d" style="line-height:1.5">Maya · Leo’s GP · your mum’s ward. No passcode, no
            app, nothing else visible.</div>
          <button data-emerg style="width:100%;min-height:44px;border-radius:999px;background:var(--red);
            color:var(--on-red);font-size:15px;font-weight:600;margin-top:14px">Set who’s on it</button></div>
      </div>
      <div class="spacer"></div>
      <div style="padding:0 20px;flex:none">
        <div class="note">The second line is the point: who usually arranges this one. It is the
          work nobody logs, and it is why one of you thinks the sitter books herself.</div>
      </div>
      <div class="foot">Numbers stay on this phone. Trace never uploads a contact list.</div>
    </div>`;
  back(s);
  const q = $('#ppl-q', s), list = $('#ppl-list', s);
  const wire = () => $$('[data-call]', list).forEach((b) => b.addEventListener('click', () => {
    const p = db.people.find((x) => x.id === b.dataset.call);
    buzz(10); toast(`calling ${p.n.split(' · ')[0]} — logged so the other one knows`);
    p.s = 'Called just now · you arranged it'; save();
  }));
  q.addEventListener('input', () => { list.innerHTML = draw(q.value); wire(); });
  wire();
  $$('[data-emerg]', s).forEach((b) => b.addEventListener('click', () => {
    buzz(10); toast('three people, on the lock screen. nothing else is exposed.');
  }));
}

/* ================================================================ p49 settle up
 *
 * "She's ahead. That's all it says." The number is deliberately without a
 * verdict or a nudge to pay — a couple's money is not a debt ledger, and an
 * app that chases one is a debt collector living in the kitchen. */

function renderSettle() {
  const s = screens.settle;
  const mine = db.ledger.filter((l) => l.who === 'You').reduce((a, l) => a + l.v, 0);
  const theirs = db.ledger.filter((l) => l.who !== 'You').reduce((a, l) => a + l.v, 0);
  const gap = Math.abs(theirs - mine);
  const ahead = theirs > mine ? 'She’s' : 'You’re';
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Settle up</button>
      <button class="icob" data-close>✕</button></div>
    <div class="page">
      <div style="padding:32px 30px 0;text-align:center;flex:none">
        <div style="font-size:14px;color:var(--ink-3)">This month, between you</div>
        <div style="font-size:52px;font-weight:700;letter-spacing:-.03em;color:var(--red);margin-top:4px">€${gap}</div>
        <div style="font-size:15px;color:var(--ink-70);margin-top:6px">${ahead} ahead. That’s all it says.</div>
      </div>
      <div style="padding:22px 20px 0;flex:none">
        <div class="sheet">
          ${db.ledger.map((l) => `<div class="r">
            <span class="k" style="flex:1">${esc(l.t)}</span>
            <span style="font-size:12px;color:var(--ink-4)">${esc(l.who)}</span>
            <span class="v" style="font-size:16px;width:62px;text-align:right">€${l.v}</span></div>`).join('')}
        </div>
      </div>
      <div class="spacer"></div>
      <div style="padding:0 20px;flex:none">
        <div class="note">No running total across months. It resets on the 1st whether you settle
          or not — because a relationship isn’t a balance sheet, and “leave it” is a real answer.</div>
      </div>
      <div class="actions" style="padding-top:14px">
        <button class="btn-ink" data-even>Even it up</button>
        <button class="btn-plain" data-leave>Leave it</button>
      </div>
      <div style="padding:0 20px 18px;flex:none">
        <button class="btn-plain" data-add style="min-height:44px;font-size:15px">Add one</button>
      </div>
    </div>`;
  back(s);
  /* Both endings clear the month and neither is scored. "Leave it" is not a
     lesser button — the frame gives it the same size, and the note says so. */
  $$('[data-even]', s).forEach((b) => b.addEventListener('click', () => {
    db.ledger = []; save(); R.push('settle', { even: true }); buzz(12);
    toast('evened up. no record of who was ahead.'); renderSettle();
  }));
  $$('[data-leave]', s).forEach((b) => b.addEventListener('click', () => {
    db.ledger = []; save(); R.push('settle', { left: true }); buzz(10);
    toast('left. it resets on the 1st either way.'); renderSettle();
  }));
  $$('[data-add]', s).forEach((b) => b.addEventListener('click', () => {
    ui.panel('add one', (body) => {
      const t = el(`<input placeholder="what it was" style="padding:14px 16px;border-radius:16px;
        border:1px solid var(--hairline);background:var(--surface);color:var(--ink);font:15px inherit">`);
      const v = el(`<input placeholder="€" inputmode="decimal" style="padding:14px 16px;border-radius:16px;
        border:1px solid var(--hairline);background:var(--surface);color:var(--ink);font:15px inherit">`);
      body.appendChild(t); body.appendChild(v);
      const go = el(`<button class="p-cta">Add</button>`);
      go.addEventListener('click', () => {
        const n = parseFloat(v.value);
        if (!t.value.trim() || !(n > 0)) return;
        db.ledger.push({ t: t.value.trim(), who: 'You', v: Math.round(n) });
        save(); R.push('settle', {}); renderSettle(); APP.closePanel && APP.closePanel();
      });
      body.appendChild(go);
      t.focus();
    });
  }));
}

/* ------------------------------------------------------------------ wiring */

R.addScreen('wheel', renderWheel);
R.addScreen('memory', renderMemory);
R.addScreen('loop', renderLoop);
R.addScreen('kid', renderKid);
R.addScreen('people', renderPeople);
R.addScreen('settle', renderSettle);

R.addRow('Household', 'wheel', 'Meal wheel', () => 'Nobody decides, so the wheel does');
R.addNav('wheel', () => show('wheel'));
R.addRow('Household', 'kid', 'Kid’s corner', () => 'His patch, and the school run');
R.addNav('kid', () => show('kid'));
R.addRow('Memory', 'memoryyear', 'The year, in marks', () => 'Chapters, the grid, the jar');
R.addNav('memoryyear', () => show('memory'));

R.addBeyond('The daily loop', 'Four moments, ninety seconds, three rules', 'loop');
R.addBeyond('Your people', 'Who to call, and who calls them', 'people');
R.addBeyond('Settle up', 'The number, with no verdict attached', 'settle', 'The hard parts');
/* p16 — her phone, with your board on it. A demo surface, so it is a door in
   the directory rather than the screen the app opens on (invariant 1). */
R.addBeyond('Her home screen', 'What your board looks like from her side',
  () => window.TRACE_APP_SHOWHOME && window.TRACE_APP_SHOWHOME());

renderWheel(); renderMemory(); renderLoop(); renderKid(); renderPeople(); renderSettle();
})();
