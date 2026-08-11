/* trace — rooms, board and the widget deck.
 *
 * This is the Trace Clean system (design turns 19–21) sitting on top of the
 * canvas engine: five rooms plus one directory instead of a 59-item sheet,
 * a board you curate, and the widget that is the other person's window into
 * it. Data models, copy and colour are taken from the frames' own
 * renderVals() — tasks, groceries, doses, buckets, habits, moods, savings,
 * publish switches and the privacy toggles are the design's, not invented.
 *
 * Load order: app.js boots first and hands us TRACE_APP; we take over the
 * home screen widget and everything above the control bar.
 */
(() => {
'use strict';
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const APP = window.TRACE_APP || {};
const toast = APP.toast || (() => {});
const buzz = APP.buzz || (() => {});

/* =============================================================== store */

const KEY = 'trace.clean.v2';
const DEFAULTS = () => ({
  /* 19d — household */
  tasks: [
    { id: 't1', title: 'Bins out before 7', meta: 'Recurring · Thursdays', who: 'You' },
    { id: 't2', title: 'Call the plumber', meta: 'Claimed 2h ago', who: 'Maya' },
    { id: 't3', title: 'Pick up the prescription', meta: 'Doctor’s note attached', who: 'Free' },
    { id: 't4', title: 'Reply to the landlord', meta: 'Photo of the letter', who: 'You' },
    { id: 't5', title: 'Book Sunday table', meta: 'Someone’s coming', who: 'Free' },
    { id: 't6', title: 'Ten minutes, together', meta: 'Weekly reset', who: 'Both' },
  ],
  done: { t2: true },
  split: 60,
  /* 19f — the list */
  items: [
    { id: 'g1', name: 'Oat milk', who: 'Maya' }, { id: 'g2', name: 'Sourdough', who: 'You' },
    { id: 'g3', name: 'Tomatoes, the small ones', who: 'Maya' }, { id: 'g4', name: 'Coffee beans', who: 'You' },
    { id: 'g5', name: 'Dish soap', who: 'You' }, { id: 'g6', name: 'Lemons', who: 'Maya' },
    { id: 'g7', name: 'Something for Sunday', who: 'Both' },
  ],
  got: { g1: true, g4: true },
  shopping: false,
  /* 20j — meal wheel */
  meals: ['Ramen night', 'Big salad', 'Maya’s curry', 'Breakfast for dinner', 'Whatever’s left', 'Out, somewhere small'],
  mealIdx: 0,
  /* 20w — doses */
  doses: [
    { id: 'd1', name: 'Vitamin D', meta: 'Morning, with food' },
    { id: 'd2', name: 'Iron', meta: 'Evening · Maya’s' },
    { id: 'd3', name: 'Allergy tab', meta: 'Before bed' },
  ],
  dosed: { d1: true },
  /* 20p — handover baton, 25e — two-minute pile */
  baton: false,
  minis: [
    { id: 'm1', t: 'Reply to the sitter', s: '30 sec' }, { id: 'm2', t: 'Move €40 to Kyoto', s: '20 sec' },
    { id: 'm3', t: 'Book the car in', s: '90 sec' }, { id: 'm4', t: 'Text your mum back', s: '40 sec' },
    { id: 'm5', t: 'Bin the expired meds', s: '60 sec' },
  ],
  miniDone: {},
  /* 19g + 24g — together */
  savings: { name: 'Kyoto, April', have: 3180, goal: 5000 },
  dreams: [
    { t: 'A kitchen with light', s: 'Both signed' },
    { t: 'Learn to sail', s: 'Maya added' },
  ],
  promise: 'One Sunday a month, no plans',
  buckets: [
    { id: 'b1', t: 'Surf at dawn, badly', who: 'Maya' }, { id: 'b2', t: 'Drive the coast road, no map', who: 'You' },
    { id: 'b3', t: 'Learn to sail', who: 'Maya' }, { id: 'b4', t: 'Kyoto in April', who: 'Both' },
    { id: 'b5', t: 'Teach Leo chess', who: 'You' },
  ],
  bucket: { b1: true, b5: true },
  mission: false,
  /* 19h — memory */
  marks: 218, chapter: 4, jarN: 12,
  /* 19i + 22f — wellbeing */
  mood: -1, herMood: 0,
  habits: [
    { name: 'Walk after dinner', meta: '5 of 7', days: [1, 1, 0, 1, 1, 0, 1] },
    { name: 'Phones down by 10', meta: '4 of 7', days: [1, 0, 1, 1, 0, 1, 0] },
    { name: 'One good question', meta: '6 of 7', days: [1, 1, 1, 0, 1, 1, 1] },
  ],
  focusOn: false, armour: false,
  /* 21a — what her widget gets */
  pub: { trace: true, list: true, cal: true, mood: false, leave: true, notice: true },
  /* 19j — rules */
  /* coach ships ON: SCREENS.md p4 says the prompt exists because "most nights
     die on the blank page", so suggestions are the designed default and this
     switch is how you turn them off, not how you turn them on. */
  sw: { presence: true, quiet: false, pocket: true, ink: true, coach: true, backup: true },
  /* board content */
  notices: [{ id: 'n1', t: 'Landlord letter — reply by', when: 'Aug 15' }],
  week: { dow: 'THU', day: 7, items: [{ t: 'dentist 3pm', c: 'ink' }, { t: 'pick up cake', c: 'amber' }] },
  leaving: null,          /* {mins} — auto, breaks through armour */
  thinking: null,         /* {ts} — "thinking of you" */
  traceSeen: false,       /* one-time trace burns after she sees it */
});

let db;
try { db = Object.assign(DEFAULTS(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
catch (e) { db = DEFAULTS(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };

/* board changes go over the same channel as ink, with the same semantics.
   Offline (or before the partner appears) they queue, in order, and flush
   the moment the channel is back — a tick made in airplane mode still
   lands on her widget when you surface. */
let outbox = [];
try { outbox = JSON.parse(localStorage.getItem('trace.outbox') || '[]'); } catch (e) {}
const saveOutbox = () => { try { localStorage.setItem('trace.outbox', JSON.stringify(outbox.slice(-60))); } catch (e) {} };
function netLive() { return navigator.onLine !== false && window.TRACE_NET && TRACE_NET.live && TRACE_NET.live(); }
function push(kind, payload) {
  save();
  const ts = Date.now();
  if (netLive()) { TRACE_NET.emit('board', { kind, payload, ts }); return; }
  outbox.push({ kind, payload, ts });
  saveOutbox();
}
function flushOutbox() {
  if (!netLive() || !outbox.length) return;
  const n = outbox.length;
  for (const m of outbox.splice(0)) TRACE_NET.emit('board', { kind: m.kind, payload: m.payload, ts: m.ts });
  saveOutbox();
  toast(n + (n === 1 ? ' change' : ' changes') + ' from while you were away — delivered');
}
addEventListener('online', () => setTimeout(flushOutbox, 1200));
setInterval(flushOutbox, 5000);

/* =============================================================== helpers */

const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const count = (o) => Object.values(o).filter(Boolean).length;

/* `hand` marks content a person wrote — the one rule that separates what the
   app says from what a partner said. It is the product, not a flourish. */
function tickRow({ on, title, meta, right, hand }) {
  return `<button class="row"><span class="tick${on ? ' on' : ''}">${on ? '✓' : ''}</span>` +
    `<span class="grow"><span class="n light${hand ? ' hand' : ''}" style="opacity:${on ? .45 : 1};display:block${hand ? ';font-size:23px;line-height:1.2' : ''}">${esc(title)}</span>` +
    (meta ? `<span class="s">${esc(meta)}</span>` : '') + `</span>` +
    (right || '') + `</button>`;
}
function navRow(title, sub, right) {
  return `<button class="row"><span class="grow"><span class="n">${esc(title)}</span>` +
    (sub ? `<span class="s">${esc(sub)}</span>` : '') + `</span>` +
    `<span class="chev">${right || '›'}</span></button>`;
}
function swRow(id, name, sub, on, amber) {
  return `<button class="row" data-sw="${id}"><span class="grow"><span class="n">${esc(name)}</span>` +
    `<span class="s">${esc(sub)}</span></span>` +
    `<span class="sw${on ? ' on' : ''}${amber ? ' amber' : ''}"><i></i></span></button>`;
}

/* Some of these are not preferences. The pocket's absence from her device is
   unconditional — docs/PRIVACY.md states it as policy and every egress path
   already enforces it, including the export, which drops it before the file is
   written. A switch there was worse than a switch that does nothing: it told
   you the guarantee had an off position. This states it instead. */
function factRow(name, sub) {
  return `<div class="row"><span class="grow"><span class="n">${esc(name)}</span>` +
    `<span class="s">${esc(sub)}</span></span>` +
    `<span class="who free" style="pointer-events:none">always</span></div>`;
}

/* =============================================================== screens */

const stack = $('#stack');
const screens = {
  canvas: $('#sc-canvas'), rooms: $('#sc-rooms'), room: $('#sc-room'),
  board: $('#sc-board'), states: $('#sc-states'), rules: $('#sc-rules'),
  surfaces: $('#sc-surfaces'),
};
const RENDERERS = {};                              /* name -> () => void */
let current = 'canvas', activeRoom = 'Canvas', roomKey = null;

function show(name, room) {
  /* rebuild on entry so late registrations and fresh data always show */
  if (name === 'board') renderBoard();
  if (name === 'states') renderStates();
  if (name === 'rules') renderRules();
  if (RENDERERS[name]) RENDERERS[name]();
  if (name === 'rooms') renderRooms($('#room-search') ? $('#room-search').value : '');
  current = name;
  for (const k in screens) screens[k].classList.toggle('hidden', k !== name);
  if (room) activeRoom = room;
  if (name === 'canvas') activeRoom = 'Canvas';
  if (name === 'rooms') activeRoom = 'Rooms';
  if (name === 'board') activeRoom = 'Your board';
  if (name === 'states') activeRoom = 'Widget';
  if (name === 'rules') activeRoom = 'Quiet & private';
  if (name === 'surfaces') activeRoom = 'Every surface';
  if (name !== 'canvas') window.dispatchEvent(new Event('traceroom'));
  $('#cb-room').textContent = activeRoom;
  $('#screen').dataset.room = name === 'room' ? room : (name === 'canvas' ? 'Canvas' : 'Rooms');
  /* innerHTML, not textContent — the pen is a drawn glyph now, and assigning
     markup to textContent would print the markup */
  $('#cb-left').innerHTML = '✎';
  if (name === 'canvas') requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
}

/* ------------------------------------------------- 19c the directory */

const ROOMS = [
  { name: 'Canvas', sub: 'Draw, presence, goodnight', tint: 'var(--red)', icon: '✎', count: () => 'live' },
  { name: 'Household', sub: 'Tasks, lists, meals, split', tint: 'var(--ink)', icon: '⌂',
    count: () => String(db.tasks.length - count(db.done)) },
  { name: 'Together', sub: 'Savings, dreams, promises', tint: 'var(--ink)', icon: '❑',
    count: () => String(db.buckets.length - count(db.bucket)) },
  { name: 'Memory', sub: 'Chapters, movies, jar', tint: 'var(--ink)', icon: '◔', count: () => String(db.marks) },
  { name: 'Wellbeing', sub: 'Mood, habits, focus', tint: 'var(--ink)', icon: '◍',
    count: () => String(db.habits.length - 1) },
];

/* which room each of the engine's features belongs to (the directory's
   "Search 60 features" has to actually reach all of them) */
const FEATURE_ROOM = {
  Canvas: ['mirror', 'traceover', 'passpen', 'scratch', 'reveal', 'sky', 'photo', 'clear', 'fingerlive',
    'vocab', 'stickers', 'translate', 'whisper', 'blind', 'finish', 'alive', 'theday', 'gestures', 'bad'],
  Household: ['days', 'calx', 'say', 'comehere', 'banner'],
  Together: ['bothhere', 'hold', 'touching', 'warm', 'string', 'palm', 'fog', 'thumb', 'hr',
    'prompt', 'eyesshut', 'hotcold', 'pair', 'signs'],
  Memory: ['replay', 'slept', 'capsule', 'thread', 'yearago', 'dict', 'yearmarks', 'moments',
    'riso', 'replayx', 'weather', 'compose'],
  Wellbeing: ['breathe', 'guardrails', 'positioning', 'donate', 'world', 'theline', 'widget'],
};
const roomOf = (id) => {
  for (const r in FEATURE_ROOM) if (FEATURE_ROOM[r].includes(id)) return r;
  return 'Canvas';
};
const featuresIn = (room) => (APP.features ? APP.features() : []).filter((f) => f.id && roomOf(f.id) === room);

function renderRooms(query) {
  const list = $('#rooms-list');
  const q = (query || '').trim().toLowerCase();
  list.innerHTML = '';

  if (!q) {
    list.appendChild(el(`<div class="eyebrow" style="padding:6px 4px 2px">Five rooms</div>`));
    for (const r of ROOMS) {
      const row = el(`<button class="row">
        <span class="ico${r.name === 'Canvas' ? ' red' : ' ink'}">${r.icon}</span>
        <span class="grow"><span class="n">${r.name}</span><span class="s big">${r.sub}</span></span>
        <span class="cnt" style="color:${r.tint}">${r.count()}</span>
        <span class="chev">›</span></button>`);
      row.addEventListener('click', () => openRoom(r.name));
      list.appendChild(row);
    }
    /* Twenty-odd screens belong to no room. Grouped the way SCREENS.md groups
       them, because one flat list of that length is a wall, not a directory. */
    const groups = [['Beyond the rooms', [
      ['Your board', 'What her widget shows — you decide', () => show('board')],
      ['Quiet & private', 'Three rules the app can’t break', () => show('rules')],
      ['Every surface', 'Watch, lock screen, Android, tablet', () => show('surfaces')],
    ]]];
    for (const [label, sub, go, group] of BEYOND) {
      const name = group || 'Beyond the rooms';
      let g = groups.find((x) => x[0] === name);
      if (!g) groups.push(g = [name, []]);
      g[1].push([label, sub, go]);
    }
    for (const [name, rows] of groups) {
      if (!rows.length) continue;
      list.appendChild(el(`<div class="eyebrow" style="padding:16px 4px 2px">${esc(name)}</div>`));
      for (const [label, sub, go] of rows) {
        const row = el(navRow(label, sub));
        row.addEventListener('click', go);
        list.appendChild(row);
      }
    }
    return;
  }

  /* search runs across every feature the engine has, grouped by room */
  const all = (APP.features ? APP.features() : []).filter((f) => f.id);
  const hits = all.filter((f) => (f.n + ' ' + f.d).toLowerCase().includes(q));
  if (!hits.length) {
    list.appendChild(el(`<div class="foot" style="padding-top:30px">Nothing matches “${esc(q)}”.</div>`));
    return;
  }
  let last = null;
  for (const f of hits) {
    const r = roomOf(f.id);
    if (r !== last) { list.appendChild(el(`<div class="eyebrow" style="padding:14px 4px 2px">${r}</div>`)); last = r; }
    const row = el(navRow(f.n, f.d));
    row.addEventListener('click', () => APP.openFeature && APP.openFeature(f.id));
    list.appendChild(row);
  }
}

/* ------------------------------------------------------ the five rooms */

function openRoom(name) {
  if (name === 'Canvas') return show('canvas');
  /* a name nobody built a view for goes to the directory, never to a crash */
  if (!ROOM_VIEWS[name]) return show('rooms');
  roomKey = name;
  const s = screens.room;
  s.innerHTML = ROOM_VIEWS[name]();
  wireRoom(s, name);
  show('room', name);
}

const ROOM_VIEWS = {

  /* 19d — household */
  Household() {
    const open = db.tasks.length - count(db.done);
    return `
      <div class="hd"><button class="pill" data-back>Thursday</button>
        <button class="icob" data-go="board">⤴</button></div>
      <div class="title">
        <div class="k">Left to do</div>
        <div class="v">${open} thing${open === 1 ? '' : 's'}</div>
        <div class="s">You’re carrying ${db.split}% of today.</div>
      </div>
      <div class="splitbar"><div class="a" style="width:${db.split}%"></div><div class="b"></div></div>
      <div class="body">
        ${db.tasks.map((t) => {
          /* "Cover me" recorded which chores it handed over in db.covered and
             nothing read it, so the screen said "she has the briefs" and this
             list carried on showing them as yours. The owner shown here is the
             owner the app actually believes in. */
          const covered = (db.covered || []).includes(t.id);
          const who = covered ? 'Maya' : t.who;
          const meta = covered ? 'Covered — she has the brief' : t.meta;
          return `<button class="row" data-task="${t.id}">
            <span class="tick${db.done[t.id] ? ' on' : ''}">${db.done[t.id] ? '✓' : ''}</span>
            <span class="grow"><span class="n light" style="opacity:${db.done[t.id] ? .45 : 1};display:block">${esc(t.title)}</span>
              <span class="s">${esc(meta)}</span></span>
            <span class="who ${who === 'Free' ? 'free' : who === 'You' || who === 'Both' ? '' : 'them'}">${who}</span></button>`;
        }).join('')}
        <button class="row" data-sub="sprint"><span class="grow">
            <span class="n">Two-minute pile</span><span class="s">${db.minis.length - count(db.miniDone)} quick ones — clear them in a burst</span></span>
            <span class="chev">›</span></button>
        <div class="eyebrow" style="padding:14px 4px 2px">Also in Household</div>
        ${[['list', 'Groceries', `${db.items.length - count(db.got)} left`],
           ['meal', 'What’s for dinner', db.meals[db.mealIdx]],
           ['split', 'Fair split', 'A month, not a scoreboard'],
           ['baton', 'Handover baton', db.baton ? 'You’re carrying it' : 'Nobody has it'],
           ['doses', 'Doses', `${count(db.dosed)} of ${db.doses.length} today`]]
          .map(([k, n, s2]) => `<button class="row" data-sub="${k}"><span class="grow">
            <span class="n">${esc(n)}</span><span class="s">${esc(s2)}</span></span>
            <span class="chev">›</span></button>`).join('')}
        ${subRows('Household')}
        ${featureRows('Household')}
      </div>`;
  },

  /* 19g — together */
  Together() {
    const pct = Math.round(db.savings.have / db.savings.goal * 100);
    const eur = (n) => '€' + n.toLocaleString('en-US');
    return `
      <div class="hd"><button class="pill" data-back>Together</button>
        <button class="icob" data-go="board">⤴</button></div>
      <div class="title">
        <div class="k">${esc(db.savings.name)}</div>
        <div class="v">${eur(db.savings.have)} <span style="font-size:17px;font-weight:500;color:var(--ink-3)">of ${eur(db.savings.goal)}</span></div>
      </div>
      <div class="splitbar" style="height:10px"><div class="a" style="width:${pct}%;background:var(--ink)"></div>
        <div class="b" style="background:var(--surface)"></div></div>
      <div class="body">
        <div class="deck" style="padding:2px 0 4px">
          ${[40, 80, 150].map((v) => `<button class="c" data-dep="${v}" style="min-width:88px;height:52px;display:flex;align-items:center;justify-content:center">
            <b style="font-size:16px">+€${v}</b></button>`).join('')}
        </div>
        <div class="eyebrow" style="padding:10px 4px 2px">Dream board</div>
        ${db.dreams.map((d) => `<div class="row"><span class="grow"><span class="n">${esc(d.t)}</span>
          <span class="s">${esc(d.s)}</span></span></div>`).join('')}
        <button class="row" data-sub="bucket"><span class="grow"><span class="n">Bucket list</span>
          <span class="s hand" style="font-size:20px;color:var(--ink)">${esc(db.promise)}</span></span>
          <span class="chev">✒</span></button>
        ${subRows('Together')}
        ${featureRows('Together')}
      </div>`;
  },

  /* 19h — memory */
  Memory() {
    const shades = ['var(--grid-empty)', 'rgba(226,51,67,.18)', 'rgba(226,51,67,.42)', 'var(--red)', 'var(--ink)'];
    const heat = Array.from({ length: 98 }, (_, n) => {
      const h = ((n * 2654435761) >>> 0) % 10;
      return shades[h < 4 ? 0 : h < 6 ? 1 : h < 8 ? 2 : h < 9 ? 3 : 4];
    });
    return `
      <div class="hd"><button class="pill" data-back>Chapter ${db.chapter}</button>
        <button class="icob" data-go="board">⤴</button></div>
      <div class="title">
        <div class="k">The year, one square a day</div>
        <div class="v">${db.marks} marks</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(14,1fr);gap:4px;padding:20px 20px 0;flex:none">
        ${heat.map((c) => `<div style="aspect-ratio:1;border-radius:3px;background:${c}"></div>`).join('')}
      </div>
      <div class="body" style="padding-top:20px">
        <button class="row" data-sub="jar"><span class="grow"><span class="n">Gratitude jar</span>
          <span class="s">${db.jarN} folded notes · drop one in</span></span><span class="chev">＋</span></button>
        ${subRows('Memory')}
        ${featureRows('Memory', 'What’s in Memory')}
      </div>`;
  },

  /* 19i — wellbeing */
  Wellbeing() {
    /* p22's weather runs warm — amber through red to ink. It reads as a single
       dial rather than five unrelated hues, and it keeps red meaning "heavy". */
    const MOODS = [
      { n: 0, name: 'Bright', g: '#E9A13B' },
      { n: 1, name: 'Soft', g: '#F7D8A8' },
      { n: 2, name: 'Grey', g: '#F0A9B0' },
      { n: 3, name: 'Heavy', g: '#E23343' },
      { n: 4, name: 'Storm', g: '#B3202E' },
    ];
    const mine = db.mood >= 0 ? MOODS[db.mood] : null;
    const hers = MOODS[db.herMood];
    return `
      <div class="hd"><button class="pill" data-back>Weather between us</button>
        <button class="icob" data-go="board">⤴</button></div>
      <div class="title">
        <div class="k">Right now</div>
        <div class="v">${mine ? mine.name + ', and ' + hers.name.toLowerCase() : 'Tell it how it is'}</div>
      </div>
      <div style="display:flex;gap:12px;padding:20px 20px 0;flex:none">
        <div style="flex:1;padding:16px;border-radius:20px;background:var(--card);border:1px solid var(--card-bd);text-align:center">
          <div style="width:54px;height:54px;border-radius:50%;margin:0 auto;background:${mine ? mine.g : 'var(--surface)'}"></div>
          <div style="font-size:13px;color:var(--ink-70);margin-top:10px">You · ${mine ? mine.name.toLowerCase() : 'not said'}</div>
        </div>
        <div style="flex:1;padding:16px;border-radius:20px;background:var(--card);border:1px solid var(--card-bd);text-align:center">
          <div style="width:54px;height:54px;border-radius:50%;margin:0 auto;background:${hers.g}"></div>
          <div style="font-size:13px;color:var(--ink-70);margin-top:10px">Maya · ${hers.name.toLowerCase()}</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;padding:14px 20px 0;justify-content:center;flex:none">
        ${MOODS.map((m) => `<button data-mood="${m.n}" style="width:44px;height:44px;border-radius:50%;
          background:${m.g};border:3px solid ${db.mood === m.n ? 'var(--ink)' : 'transparent'};
          opacity:${db.mood === -1 || db.mood === m.n ? 1 : .4}"></button>`).join('')}
      </div>
      <div class="body" style="padding-top:20px">
        <div class="eyebrow" style="padding:0 4px 2px">Habits, side by side</div>
        ${db.habits.map((h) => `<div class="row"><span class="grow"><span class="n light">${esc(h.name)}</span>
          <span class="s">${esc(h.meta)}</span></span>
          <span style="display:flex;gap:5px">${h.days.map((d) => `<span style="width:9px;height:9px;border-radius:50%;
            background:${d ? 'var(--ink)' : 'var(--hairline)'}"></span>`).join('')}</span></div>`).join('')}
        <div class="eyebrow" style="padding:14px 4px 2px">Also in Wellbeing</div>
        <button class="row" data-sw="armour"><span class="grow"><span class="n">Meeting armour</span>
          <span class="s">${db.armour ? 'Armoured until 3:30' : 'Armour is off'}</span></span>
          <span class="sw${db.armour ? ' on' : ''}"><i></i></span></button>
        ${subRows('Wellbeing')}
        ${featureRows('Wellbeing')}
      </div>`;
  },
};

function featureRows(room, label) {
  const fs = featuresIn(room);
  if (!fs.length) return '';
  return `<div class="eyebrow" style="padding:14px 4px 2px">${label || 'On the canvas, from here'}</div>` +
    fs.map((f) => `<button class="row" data-feat="${f.id}"><span class="grow">
      <span class="n">${esc(f.n)}</span><span class="s">${esc(f.d)}</span></span>
      <span class="chev">›</span></button>`).join('');
}

function wireRoom(s, name) {
  $$('[data-back]', s).forEach((b) => b.addEventListener('click', () => show('rooms')));
  $$('[data-go="board"]', s).forEach((b) => b.addEventListener('click', () => show('board')));
  $$('[data-feat]', s).forEach((b) => b.addEventListener('click', () => APP.openFeature && APP.openFeature(b.dataset.feat)));

  $$('[data-task]', s).forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.task;
    db.done[id] = !db.done[id];
    buzz(10);
    push('todo', { id, done: !!db.done[id] });
    openRoom(name); paintWidget();
    toast(db.done[id] ? 'done — it ticks on her widget too' : 'back on the list');
  }));
  $$('[data-sub]', s).forEach((b) => b.addEventListener('click', () => openSub(b.dataset.sub)));
  $$('[data-dep]', s).forEach((b) => b.addEventListener('click', () => {
    db.savings.have += +b.dataset.dep; push('savings', { have: db.savings.have });
    buzz(12); openRoom(name); toast('€' + b.dataset.dep + ' in. Split by what each can give.');
  }));
  $$('[data-mood]', s).forEach((b) => b.addEventListener('click', () => {
    db.mood = +b.dataset.mood; push('mood', { n: db.mood }); buzz(10); openRoom(name);
    toast(db.pub.mood ? 'she’ll see the weather change' : 'kept private — no gap shown');
  }));
  $$('[data-sw="armour"]', s).forEach((b) => b.addEventListener('click', () => {
    db.armour = !db.armour; push('armour', { on: db.armour }); openRoom(name);
    toast(db.armour ? 'armoured — only “leaving now” breaks through' : 'armour off');
  }));
}

/* ------------------------------------------------- sub-surfaces (20x/25x) */

/* rooms2.js registers the rest of the design's surfaces through these. */
const SUBS = {};                                   /* kind -> {title, build} */
const NAVS = {};                                   /* kind -> () => void     */
const SUBLISTS = { Household: [], Together: [], Memory: [], Wellbeing: [], Canvas: [] };
/* screens that belong to no room — the hard parts, the life-happens modes.
   Registered by the modules that own them so the directory stays one list. */
const BEYOND = [];
const EXTRA_CARDS = [];                            /* (db) => card | null    */
const PRESENCE_EXTRAS = [];                        /* (panelBody) => void    */

function subRows(room) {
  const list = SUBLISTS[room] || [];
  if (!list.length) return '';
  return list.map((r) => `<button class="row" data-sub="${r.key}"><span class="grow">
    <span class="n">${esc(r.name)}</span><span class="s">${esc(r.sub())}</span></span>
    <span class="chev">${r.right || '›'}</span></button>`).join('');
}

function openSub(kind) {
  if (NAVS[kind]) {                               /* goes to a screen, not a panel */
    /* a door inside a panel can lead here; the panel must not stay parked
       over the screen it opened */
    if (APP.closePanel) APP.closePanel();
    return NAVS[kind]();
  }
  const P = APP.openPanel; if (!P) return;
  if (SUBS[kind]) return P(SUBS[kind].title, SUBS[kind].build);
  if (kind === 'list') {
    P('groceries', (body) => {
      const draw = () => {
        body.innerHTML = '';
        body.appendChild(el(`<div class="p-note">${db.items.length - count(db.got)} left · ticks sync both ways, instantly</div>`));
        db.items.forEach((i) => {
          const r = el(tickRow({ on: !!db.got[i.id], title: i.name, hand: true, meta: null,
            right: `<span class="who">${i.who}</span>` }));
          r.addEventListener('click', () => {
            db.got[i.id] = !db.got[i.id]; buzz(8);
            push('list', { id: i.id, got: !!db.got[i.id] }); draw(); paintWidget();
          });
          body.appendChild(r);
        });
        const sh = el(`<button class="${db.shopping ? 'p-ghost' : 'p-cta'}">${db.shopping ? 'Done shopping' : 'I’m at the shop'}</button>`);
        sh.addEventListener('click', () => {
          db.shopping = !db.shopping; push('shopping', { on: db.shopping }); draw(); paintWidget();
          toast(db.shopping ? 'her widget shows the list while you shop' : 'list card off her widget');
        });
        body.appendChild(sh);
      };
      draw();
    });
  }
  if (kind === 'meal') {
    P('what’s for dinner', (body) => {
      const big = el(`<div class="p-stat" style="font-size:34px;padding:26px 0">${esc(db.meals[db.mealIdx])}</div>`);
      const b = el(`<button class="p-cta">Spin it</button>`);
      b.addEventListener('click', () => {
        db.mealIdx = (db.mealIdx + 1 + Math.floor(Math.random() * 3)) % db.meals.length;
        big.textContent = db.meals[db.mealIdx]; buzz(14); push('meal', { i: db.mealIdx });
      });
      body.append(big, b, (() => { const d = el(`<button class="row"><span class="grow"><span class="n">Make it a ceremony</span>
        <span class="s">The meal wheel — spin it together</span></span><span class="chev">›</span></button>`);
        d.addEventListener('click', () => openSub('wheel')); return d; })(),
        el(`<div class="p-note">Neither of you decides. That’s the point.</div>`));
    });
  }
  if (kind === 'split') {
    P('fair split', (body) => {
      body.append(
        el(`<div class="p-stat">${db.split}% / ${100 - db.split}%</div>`),
        el(`<div class="p-hint">You / Maya, this month</div>`),
        el(`<div class="splitbar" style="margin:6px 0"><div class="a" style="width:${db.split}%"></div><div class="b"></div></div>`),
        (() => { const d = el(`<button class="row"><span class="grow"><span class="n">The invisible column</span>
        <span class="s">Mental load — the work nobody counts</span></span><span class="chev">›</span></button>`);
        d.addEventListener('click', () => openSub('load')); return d; })(),
        el(`<div class="p-note">A month, not a scoreboard. It resets on the 1st and nobody gets a notification about it.</div>`));
    });
  }
  if (kind === 'baton') {
    P('handover baton', (body) => {
      const b = el(`<button class="${db.baton ? 'p-ghost' : 'p-cta'}">${db.baton ? 'Pass it back' : 'Take it'}</button>`);
      b.addEventListener('click', () => {
        db.baton = !db.baton; push('baton', { on: db.baton }); buzz(16);
        b.textContent = db.baton ? 'Pass it back' : 'Take it';
        b.className = db.baton ? 'p-ghost' : 'p-cta';
        toast(db.baton ? 'you’re carrying today' : 'passed back');
      });
      body.append(el(`<div class="p-note">One of you is carrying the day. Taking the baton tells her she can stop holding it — no message needed.</div>`), b,
        el(`<div class="eyebrow" style="padding:12px 0 2px">It travels with</div>`),
        (() => { const d = el(`<button class="row"><span class="grow"><span class="n">The brief</span>
        <span class="s">Everything the day needs, attached</span></span><span class="chev">›</span></button>`);
        d.addEventListener('click', () => openSub('brief')); return d; })(),
        (() => { const d = el(`<button class="row"><span class="grow"><span class="n">Morning handoff</span>
        <span class="s">What she left overnight</span></span><span class="chev">›</span></button>`);
        d.addEventListener('click', () => openSub('handoff')); return d; })());
    });
  }
  if (kind === 'doses') {
    P('doses', (body) => {
      const draw = () => {
        body.innerHTML = '';
        db.doses.forEach((d) => {
          const r = el(tickRow({ on: !!db.dosed[d.id], title: d.name, meta: d.meta }));
          r.addEventListener('click', () => { db.dosed[d.id] = !db.dosed[d.id]; buzz(8); push('dose', { id: d.id }); draw(); });
          body.appendChild(r);
        });
        body.appendChild(el(`<div class="p-note">Counts only. What the medicine is for never leaves this phone.</div>`));
      };
      draw();
    });
  }
  if (kind === 'sprint') {
    P('two-minute pile', (body) => {
      const draw = () => {
        body.innerHTML = '';
        body.appendChild(el(`<div class="p-hint">${db.minis.length - count(db.miniDone)} left · do them together</div>`));
        db.minis.forEach((m) => {
          const r = el(tickRow({ on: !!db.miniDone[m.id], title: m.t, meta: m.s }));
          r.addEventListener('click', () => { db.miniDone[m.id] = !db.miniDone[m.id]; buzz(8); save(); draw(); });
          body.appendChild(r);
        });
      };
      draw();
    });
  }
  if (kind === 'bucket') {
    P('bucket list', (body) => {
      const draw = () => {
        body.innerHTML = '';
        body.appendChild(el(`<div class="p-stat hand" style="font-size:24px;line-height:1.35;padding:8px 0 2px">${esc(db.promise)}</div>`));
        body.appendChild(el(`<div class="p-hint">Co-signed. It can be dropped, but only together.</div>`));
        db.buckets.forEach((b2) => {
          const r = el(tickRow({ on: !!db.bucket[b2.id], title: b2.t, meta: null,
            right: `<span class="who">${b2.who}</span>` }));
          r.addEventListener('click', () => { db.bucket[b2.id] = !db.bucket[b2.id]; buzz(10); push('bucket', { id: b2.id }); draw(); });
          body.appendChild(r);
        });
        body.appendChild((() => { const d = el(`<button class="row"><span class="grow"><span class="n">Missions</span>
        <span class="s">${db.mission ? 'Both in' : 'One waiting on the other'}</span></span><span class="chev">›</span></button>`);
        d.addEventListener('click', () => openSub('mission')); return d; })());
      };
      draw();
    });
  }
  if (kind === 'mission') {
    P('missions', (body) => {
      const b = el(`<button class="${db.mission ? 'p-ghost' : 'p-cta'}">${db.mission ? 'Both in ✓' : 'I’m in'}</button>`);
      b.addEventListener('click', () => {
        db.mission = true; push('mission', { on: true }); buzz(20);
        b.textContent = 'Both in ✓'; b.className = 'p-ghost';
        toast('both in — that’s the whole ceremony');
      });
      body.append(el(`<div class="p-note">A mission only starts when both of you accept it. No nagging in between.</div>`), b);
    });
  }
  if (kind === 'promise') {
    P('co-signed promise', (body) => {
      body.append(el(`<div class="p-stat" style="font-size:22px;line-height:1.4">${esc(db.promise)}</div>`),
        el(`<div class="p-note">Signed by both of you. It can be dropped, but only together.</div>`));
    });
  }
  if (kind === 'jar') {
    P('gratitude jar', (body) => {
      const n = el(`<div class="p-stat">${db.jarN}</div>`);
      const b = el(`<button class="p-cta">Drop one in</button>`);
      b.addEventListener('click', () => { db.jarN++; n.textContent = db.jarN; buzz(12); push('jar', { n: db.jarN }); });
      body.append(n, el(`<div class="p-hint">folded notes, unread until the year turns</div>`), b);
    });
  }
  if (kind === 'focus') {
    P('couple focus', (body) => {
      const b = el(`<button class="${db.focusOn ? 'p-ghost' : 'p-cta'}">${db.focusOn ? 'End early' : 'Start 25 minutes'}</button>`);
      b.addEventListener('click', () => {
        db.focusOn = !db.focusOn; push('focus', { on: db.focusOn });
        b.textContent = db.focusOn ? 'End early' : 'Start 25 minutes';
        b.className = db.focusOn ? 'p-ghost' : 'p-cta';
        toast(db.focusOn ? 'both phones down. it ends if either of you picks up.' : 'focus ended');
      });
      body.append(el(`<div class="p-note">Invite Maya — it only counts if you both put the phone down.</div>`), b);
    });
  }
}

/* ------------------------------------------------------ 21a your board */

const PUBS = [
  { id: 'trace', name: 'Drawing traces', sub: 'One-time — burns after she sees it' },
  { id: 'list', name: 'Today’s list', sub: 'Live counts, ticks as you go' },
  { id: 'cal', name: 'This week', sub: 'Whatever’s next, in your hand' },
  { id: 'mood', name: 'Mood weather', sub: 'Off = private, no gap shown' },
  { id: 'leave', name: '“Leaving now”', sub: 'Auto · breaks through armour' },
  { id: 'notice', name: 'Notices', sub: 'Deadlines from letters, doses' },
];

function renderBoard() {
  const s = screens.board;
  const next = deck().slice(0, 3);
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Your board</button>
      <button class="icob" data-states>⤴</button></div>
    <div class="title">
      <div class="k">What Maya’s widget shows</div>
      <div class="v">You decide, always</div>
    </div>
    <div class="eyebrow">Next up on her widget</div>
    <div class="deck">
      ${next.map((c) => `<div class="c">
        ${c.spark || `<b style="color:${c.tint}">${esc(c.head)}</b>`}
        <i>${esc(c.foot)}</i></div>`).join('') || '<div class="c"><i>nothing right now — quiet</i></div>'}
    </div>
    <div class="eyebrow">Published from your board</div>
    <div class="body" style="padding-top:0">
      ${PUBS.map((p) => swRow(p.id, p.name, p.sub, !!db.pub[p.id])).join('')}
      ${subRows('Board') ? '<div class="eyebrow" style="padding:14px 4px 2px">How the widget behaves</div>' + subRows('Board') : ''}
    </div>
      <button class="row" data-states style="margin-top:8px"><span class="grow"><span class="n">Every widget state</span>
        <span class="s">And who wins when they compete</span></span><span class="chev">›</span></button>
    <div class="foot">She curates hers the same way. You never see your own widget.</div>`;
  $$('[data-back]', s).forEach((b) => b.addEventListener('click', () => show('rooms')));
  $$('[data-states]', s).forEach((b) => b.addEventListener('click', () => show('states')));
  $$('[data-sub]', s).forEach((b) => b.addEventListener('click', () => openSub(b.dataset.sub)));
  $$('[data-sw]', s).forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.sw;
    db.pub[id] = !db.pub[id];
    buzz(8); push('pub', { id, on: db.pub[id] });
    renderBoard(); paintWidget();
    toast(db.pub[id] ? 'on her widget from now on' : 'off her widget — no gap shown');
  }));
}

/* --------------------------------------------------- 21c every state */

function renderStates() {
  const s = screens.states;
  const card = (bd, bg, tint, k, v, note, big) => `
    <div class="row" style="border-radius:20px;background:${bg};border:1px solid ${bd};padding:14px 16px;align-items:center">
      <span class="grow"><span style="font-size:13px;font-weight:600;color:${tint};display:block">${k}</span>
        <span style="font-size:${big ? 26 : 17}px;font-weight:600;margin-top:${big ? 2 : 4}px;display:block">${v}</span></span>
      <span style="font-size:11px;color:var(--ink-4);text-align:right;width:104px;flex:none">${note}</span>
    </div>`;
  s.innerHTML = `
    <div class="hd"><button class="pill" data-back>Every widget state</button>
      <button class="icob" data-close>✕</button></div>
    <div class="body" style="padding-top:18px;gap:10px">
      ${card('var(--hairline)', 'linear-gradient(160deg,var(--surface),var(--surface))', 'var(--red)',
        '<span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--red);margin-right:6px"></span>Goodnight in',
        '27:14', 'shows nightly<br>from 9 PM', true)}
      ${card('var(--hairline)', 'linear-gradient(160deg,var(--surface),var(--surface))', 'var(--ink-2)', 'Groceries',
        `${db.items.length - count(db.got)} <span style="font-size:13px;font-weight:500;color:var(--ink-3)">left · he’s at the shop</span>`,
        'only while<br>someone shops', true)}
      ${card('var(--hairline)', 'linear-gradient(160deg,var(--ground-alt),var(--ground-alt))', 'var(--ink)', 'Leaving now',
        '<span style="color:var(--ink)">32 min</span>', 'auto · breaks<br>through armour', true)}
      ${card('var(--hairline)', 'linear-gradient(160deg,var(--surface),var(--surface))', 'var(--ink-2)', 'Notice',
        'Landlord letter — reply by <span style="color:var(--ink)">Aug 15</span>', 'until it’s<br>handled')}
      ${card('var(--hairline)', 'linear-gradient(160deg,var(--surface),var(--surface))', 'var(--ink-2)', 'Quiet day',
        `Nothing today. <span style="color:var(--ink)">41 days</span> still yours.`, 'when there’s<br>nothing — calm')}
      <div class="row" style="border-radius:20px;background:var(--surface);border:1px dashed var(--hairline);padding:14px 16px">
        <span style="font-size:13px;line-height:1.55;color:var(--ink-70)">Priority when states compete: leaving now → live drawing →
          must-dos → notices → week → quiet. One-time things show once, then burn. Nothing repeats, nothing nags.</span>
      </div>
    </div>
    <div class="foot">The widget is the app for days you never open it.</div>`;
  $$('[data-back]', s).forEach((b) => b.addEventListener('click', () => show('rooms')));
  $$('[data-close]', s).forEach((b) => b.addEventListener('click', () => show('rooms')));
}

/* --------------------------------------------------------- 19j rules */

const SWS = [
  { id: 'presence', name: 'Show that I’m here', sub: 'A dot, never a location' },
  { id: 'quiet', name: 'Quiet hours', sub: 'Nothing buzzes 10pm–7am' },
  { id: 'pocket', name: 'The pocket', sub: 'Hidden planning, absent from her device', fact: true },
  { id: 'ink', name: 'Permanent ink', sub: 'Keep marks past the day' },
  { id: 'coach', name: 'Tiny suggestions', sub: 'Facts only, never advice' },
  /* Also not a preference. The transport is a broadcast relay: strokes are
     delivered and nothing is kept, and there is no code path that stores them
     server-side to opt into. README invariant 3 states it flatly — "drawings
     sync as encrypted strokes; they are never processed server-side" — so an
     off position here would have to be built before it could be offered. */
  { id: 'backup', name: 'On-device only', sub: 'Strokes are relayed to her phone and never kept on a server', fact: true },
];

const theme = () => (window.TRACE_THEME ? TRACE_THEME.get() : 'ink');

function renderRules() {
  const s = screens.rules;
  s.innerHTML = `
    <div class="hd"><div style="width:36px"></div>
      <div style="font-size:17px;font-weight:600">Quiet &amp; private</div>
      <button class="icob" data-back>✕</button></div>
    <div style="padding:18px 20px 0;flex:none">
      <div class="row" style="background:var(--surface);border-style:dashed">
        <span style="font-size:13px;line-height:1.55;color:var(--ink-70)">Three rules the app can’t break: home is always the canvas,
          no room notifies about itself, and nothing that reads a drawing leaves this phone.</span></div>
    </div>
    <div class="body" style="padding-top:12px">
      <div class="row" style="flex-direction:column;align-items:stretch;gap:10px">
        <span class="grow"><span class="n">Appearance</span>
          <span class="s">Two grounds, one ink. Ink is the room at 11pm.</span></span>
        <div style="display:flex;gap:6px">
          ${[['ink', 'Ink'], ['paper', 'Paper'], ['auto', 'Match phone']].map(([v, label]) =>
            `<button data-theme-pick="${v}" style="flex:1;padding:11px 0;border-radius:14px;font-size:13px;font-weight:600;
              border:1px solid ${theme() === v ? 'var(--lip)' : 'var(--hairline)'};
              background:${theme() === v ? 'var(--pane-2)' : 'transparent'};
              color:var(--ink);opacity:${theme() === v ? 1 : .62}">${label}</button>`).join('')}
        </div>
      </div>
      ${SWS.map((w) => (w.fact ? factRow(w.name, w.sub) : swRow(w.id, w.name, w.sub, !!db.sw[w.id]))).join('')}
    </div>
    <div style="padding:0 20px;flex:none;display:flex;flex-direction:column;gap:8px;margin-bottom:10px">
      <button class="row" data-sub="loud"><span class="grow"><span class="n">How loud</span>
        <span class="s">What rings, what banners, what stays on the widget</span></span><span class="chev">›</span></button>
      <button class="row" data-sub="key"><span class="grow"><span class="n">Your key</span>
        <span class="s">Restore everything on a new phone</span></span><span class="chev">›</span></button>
      <button class="row" data-sub="unpair"><span class="grow"><span class="n" style="color:var(--red-text)">Unpair</span>
        <span class="s">The canvas seals. Nothing is deleted for her.</span></span><span class="chev">›</span></button>
    </div>
    <div style="display:flex;gap:10px;padding:10px 20px 6px;flex:none">
      <button class="p-cta" data-save>Save</button>
      <button class="p-ghost" data-export>Export data</button>
    </div>
    <button data-wipe style="margin:0 20px 18px;min-height:44px;padding:12px;border-radius:999px;font-size:13px;
      color:var(--red-text);background:none;border:1px solid var(--red-line);flex:none">Delete everything on this phone</button>`;
  $$('[data-back]', s).forEach((b) => b.addEventListener('click', () => show('rooms')));
  $$('[data-sub]', s).forEach((b) => b.addEventListener('click', () => openSub(b.dataset.sub)));
  $$('[data-sw]', s).forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.sw; db.sw[id] = !db.sw[id]; buzz(8); save(); renderRules();
  }));
  $$('[data-theme-pick]', s).forEach((b) => b.addEventListener('click', () => {
    window.TRACE_THEME && TRACE_THEME.set(b.dataset.themePick); buzz(8); renderRules();
  }));
  $$('[data-save]', s).forEach((b) => b.addEventListener('click', () => { save(); toast('saved on this device'); }));
  $$('[data-wipe]', s).forEach((b) => b.addEventListener('click', () => {
    /* two-step, in place — no modal theatre, but no accidents either */
    if (b.dataset.armed) {
      try { localStorage.clear(); } catch (e) {}
      location.reload();
      return;
    }
    b.dataset.armed = '1';
    b.textContent = 'Tap again — gone for good, no copy exists anywhere';
    b.style.background = 'var(--red-wash)';
    setTimeout(() => { if (b.isConnected) { delete b.dataset.armed;
      b.textContent = 'Delete everything on this phone'; b.style.background = 'none'; } }, 4000);
  }));
  $$('[data-export]', s).forEach((b) => b.addEventListener('click', () => {
    /* "everything you have" has to mean everything — the board, the ink on all
       three pages, your name, your pairing. Never the channel token: that is a
       live key, and a file that leaks it hands someone your canvas. */
    /* The pocket, the unsaid and the flare count are per-user private state.
       README: the pocket "must be absent from the partner's device entirely,
       including search indexes and shared backups" — and an export file is a
       backup that gets emailed. `board: db` shipped all three. */
    const PRIVATE = ['pocket', 'unsaid', 'flares', 'flare', 'pocketSteps'];
    const shared = {};
    for (const k in db) if (!PRIVATE.includes(k)) shared[k] = db[k];
    const all = { exported: new Date().toISOString(), version: 1, board: shared, ink: {}, you: {} };
    try {
      if (APP.exportPages) all.ink = APP.exportPages();
      all.you.name = localStorage.getItem('trace:myname') || 'me';
      all.you.pairCode = localStorage.getItem('trace:pairCode') || null;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('trace:') && !k.startsWith('trace:token:')) all.you[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'trace-everything.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('everything you have, as a file');
  }));
}

/* ============================================== the widget deck — 21b/21c */

/* 21c: leaving now → live drawing → must-dos → notices → week → quiet.
   Cards are built fresh each paint so the deck reflects the board exactly. */
/* Guest mode and meeting armour were toggles nobody read — the private layer
   stayed visible with a guest in the room, and armour held nothing. Both are
   promises about what reaches the other person, so the deck is where they are
   kept.
   Armour holds rather than drops: at 3:30 everything arrives at once, as one
   summary rather than eleven buzzes (p13). Guest mode hides the intimate
   layer and leaves the useful one — lists and calendar stay (p35). */
const GUEST_HIDES = ['trace', 'think', 'mood', 'pocket'];
const ARMOUR_HOLDS = ['trace', 'think', 'todo', 'shop', 'notice', 'week'];

/* "auto-ends at midnight" is a promise, and nobody is awake to run a timer —
   so it is checked whenever the deck is built. */
function guestExpired() {
  if (!db.guest) return false;
  if (db.guestDay && db.guestDay === new Date().toDateString()) return false;
  db.guest = false; db.guestDay = null; save(); push('guest', { on: false });
  return true;
}

function armourOver() {
  if (!db.armour) return true;
  const t = new Date(); const mins = t.getHours() * 60 + t.getMinutes();
  return mins >= 15 * 60 + 30 || mins < 14 * 60;      /* 2:00–3:30 PM */
}

function deck() {
  guestExpired();
  const cards = [];
  const held = [];
  const add = (pri, c) => {
    if (db.guest && GUEST_HIDES.includes(c.kind)) return;
    if (db.armour && !armourOver() && ARMOUR_HOLDS.includes(c.kind)) { held.push(c.kind); return; }
    cards.push(Object.assign({ pri }, c));
  };
  const partnerLive = APP.partnerDrawing && APP.partnerDrawing();
  const strokeN = APP.strokeCount ? APP.strokeCount() : 0;

  if (db.pub.leave && db.leaving)
    add(1, { kind: 'leave', tint: 'var(--ink)', head: db.leaving.mins + ' min',
      foot: 'leaving now', render: leaveCard });

  const hersN = (APP.hersCount && APP.hersCount()) || 0;
  if (db.pub.trace && (partnerLive || ((strokeN + hersN) && !db.traceSeen)))
    add(2, { kind: 'trace', tint: 'var(--red)', head: partnerLive ? 'drawing' : 'a trace',
      foot: 'trace · one-time', spark: sparkline('var(--red)'), render: traceCard });

  /* a fresh tap is the warmest thing on the deck, so it sits behind only
     "leaving now" and the live trace — it ages out after ten minutes */
  const freshTap = db.thinking && (Date.now() - db.thinking.ts) < 6e5;
  if (freshTap)
    add(3, { kind: 'think', tint: 'var(--red)', head: 'thinking of you',
      foot: 'tapped your name', render: thinkCard });

  const open = db.tasks.filter((t) => !db.done[t.id]);
  if (db.pub.list && open.length)
    add(5, { kind: 'todo', tint: 'var(--ink)', head: open.length + ' left',
      foot: 'today’s list', render: todoCard });

  if (db.shopping && db.pub.list)
    add(4, { kind: 'shop', tint: 'var(--ink)', head: (db.items.length - count(db.got)) + ' left',
      foot: 'groceries · he’s at the shop', render: shopCard });

  if (db.pub.notice && db.notices.length)
    add(7, { kind: 'notice', tint: 'var(--ink)', head: db.notices[0].when,
      foot: 'notice', render: noticeCard });

  if (db.pub.cal && db.week.items.length)
    add(8, { kind: 'week', tint: 'var(--red)', head: db.week.dow + ' ' + db.week.day,
      foot: 'this week', render: weekCard });

  for (const fn of EXTRA_CARDS) { const c = fn(db); if (c) add(c.pri, c); }

  /* p13: at 3:30 everything arrives at once, gently — one summary, not eleven
     buzzes. The count is the whole of the catch-up. */
  if (held.length)
    cards.push({ pri: 6, kind: 'held', tint: 'var(--ink-2)',
      head: held.length + (held.length === 1 ? ' thing' : ' things'),
      foot: 'waited while you were in', render: heldCard });

  if (!cards.length)
    add(99, { kind: 'quiet', tint: 'var(--ink-2)', head: 'Nothing today',
      foot: 'quiet day', render: quietCard });

  /* 21c's order, as a number — so the flare (0) outranks even "leaving now" */
  return cards.sort((a, b) => a.pri - b.pri);
}

const sparkline = (c) => `<svg viewBox="0 0 90 24" style="width:100%;height:24px">` +
  `<path d="M4 16 C24 4,40 22,86 8" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;

function traceCard(b, live) {
  b.innerHTML = `<div class="w-live" style="color:var(--red)"><b style="background:var(--red)"></b>` +
    (live ? 'Maya is drawing — live' : 'Maya left you a trace') + `</div>`;
  return { ink: true, cap: 'One-time trace · fades once you’ve seen it · tap to join' };
}
function todoCard(b) {
  const open = db.tasks.filter((t) => !db.done[t.id]).slice(0, 2);
  const oneDone = db.tasks.find((t) => db.done[t.id]);
  b.innerHTML = `<div class="w-kicker">Must do — from his board</div>` +
    open.map((t) => `<div class="w-row"><span class="w-tick"></span><span>${esc(t.title)}</span></div>`).join('') +
    (oneDone ? `<div class="w-row"><span class="w-tick done">✓</span><span class="off">${esc(oneDone.title)}</span></div>` : '');
  return { cap: 'Ticks sync both ways, instantly' };
}
function heldCard(b) {
  b.innerHTML = `<div class="w-kicker">Held while you were in</div>
    <div class="w-big">Arriving now</div>
    <div class="w-foot">One summary, not eleven buzzes.</div>`;
  return { cap: 'Nothing was dropped — only delayed' };
}
function shopCard(b) {
  const left = db.items.length - count(db.got);
  b.innerHTML = `<div class="w-kicker">Groceries</div>` +
    `<div class="w-big">${left} <span style="font-size:13px;font-weight:500;color:var(--ink-3)">left · he’s at the shop</span></div>`;
  return { cap: 'Only while someone is shopping' };
}
function weekCard(b) {
  b.innerHTML = `<div class="w-cal"><div class="d"><i>${db.week.dow}</i><b>${db.week.day}</b></div>
    <div class="rule"></div><div class="items">
    ${db.week.items.map((i) => `<p style="color:${i.c}">${esc(i.t)}</p>`).join('')}
    <div class="w-foot" style="margin-top:2px">His week, in his handwriting</div></div></div>`;
  return {};
}
function noticeCard(b) {
  const n = db.notices[0];
  b.innerHTML = `<div class="w-kicker" style="color:var(--red-text)">Notice</div>` +
    `<div class="w-note">${esc(n.t)} <span style="color:var(--ink-3)">${esc(n.when)}</span></div>`;
  return { cap: 'Stays until it’s handled' };
}
function leaveCard(b) {
  b.innerHTML = `<div class="w-kicker" style="color:var(--ink)">Leaving now</div>` +
    `<div class="w-big" style="color:var(--ink)">${db.leaving.mins} min</div>`;
  return { cap: 'Auto · breaks through armour' };
}
function thinkCard(b) {
  b.innerHTML = `<div class="w-mid"><div class="w-orb"></div><b>He’s thinking of you</b>
    <i>Tapped your name · just now · no reply needed</i></div>`;
  return {};
}
function quietCard(b) {
  /* Two bugs in one line: the streak was hardcoded at 41 and never read
     db.streak, and it was shown during the quiet modes, which are defined by
     not counting anything. R.counts() is the shared predicate for exactly
     that question and had no callers at all. */
  const counts = !window.TRACE_ROOMS || !TRACE_ROOMS.counts || TRACE_ROOMS.counts();
  b.innerHTML = `<div class="w-mid"><b>Nothing today.</b>` +
    (counts ? `<i><span style="color:var(--ink)">${db.streak || 41} days</span> still yours.</i>` : '') +
    `</div>`;
  return {};
}

let widIdx = 0, rotate = null, deckTouched = 0;
/* an arrival goes to the front and gets its full dwell — the rotation
   must not slide it away half a second later */
function resetDeck() { widIdx = 0; deckTouched = Date.now(); }
function paintWidget() {
  const cards = deck();
  if (widIdx >= cards.length) widIdx = 0;
  const c = cards[widIdx];
  const body = $('#widget-body'), ink = $('#widget-ink'), cap = $('#widget-cap'), dots = $('#widget-dots');
  if (!body) return;
  const live = APP.partnerDrawing && APP.partnerDrawing();
  const out = c.render(body, live) || {};
  ink.classList.toggle('hidden', !out.ink);
  if (out.ink && APP.paintWidgetInk) APP.paintWidgetInk(ink);
  cap.textContent = out.cap || '';
  cap.classList.toggle('hidden', !out.cap);
  dots.innerHTML = cards.map((_, n) => `<span class="${n === widIdx ? 'on' : ''}"></span>`).join('');
  $('#widget').dataset.card = c.kind;
}

function cycleWidget() {
  const cards = deck();
  const c = cards[widIdx % cards.length];
  /* the live-trace card says "tap to join" — so it opens the app instead */
  if (c.kind === 'trace') {
    db.traceSeen = true; save();
    return APP.showApp && APP.showApp();
  }
  widIdx = (widIdx + 1) % cards.length;
  buzz(6); paintWidget();
}

/* ================================================================= wire */

$('#widget').addEventListener('click', cycleWidget);
$('.apptile.trace').addEventListener('click', () => APP.showApp && APP.showApp());

$('#cb-room').addEventListener('click', () => show(current === 'rooms' ? 'canvas' : 'rooms'));
$('#cb-right').addEventListener('click', () => show(current === 'rules' ? 'canvas' : 'rules'));
$('#cb-left').addEventListener('click', () => {
  if (current !== 'canvas') return show('canvas');
  /* the tools live with drawing now, so the pencil opens draw mode first —
     and only reaches for the brush options once they are actually on screen */
  const drawing = $('#screen').classList.contains('drawing');
  if (!drawing) { window.TRACE_DRAWMODE && TRACE_DRAWMODE(true); return; }
  APP.brushPop && APP.brushPop();
});
$('#to-board').addEventListener('click', () => show('board'));

/* 20k "leaving now" + say-it, and 23e the tap — the two things you send
   without opening anything. They land on her widget, not in a chat. */
const SAY = ['Buy nothing, I cooked', 'Walk slow, it’s nice out', 'Call me when close'];
$('#presence').addEventListener('click', () => {
  if (!APP.openPanel) return;
  APP.openPanel('without saying much', (body) => {
    const tap = el(`<button class="p-cta">Tap her name — she feels it</button>`);
    tap.addEventListener('click', () => {
      TRACE_BOARD.thinking(); buzz(22);
      toast('she felt that · no reply needed');
    });
    const leave = el(`<button class="p-ghost">Leaving now — 32 min away</button>`);
    leave.addEventListener('click', () => {
      /* leaving() toasts its own refusal on a protected night; only claim it
         reached her when it actually did */
      const sent = TRACE_BOARD.leaving(32); buzz(14);
      if (sent) toast('on her widget now — it breaks through armour');
    });
    body.append(el(`<div class="p-note">Two things that don’t need a sentence. Both land on her widget and neither one asks for an answer.</div>`), tap, leave,
      el(`<div class="eyebrow" style="padding:14px 0 2px">Say it, roughly</div>`));
    for (const fn of PRESENCE_EXTRAS) fn(body);
    SAY.forEach((t) => {
      const c = el(`<button class="chip">${esc(t)}</button>`);
      c.addEventListener('click', () => {
        db.notices = [{ id: 'say', t, when: 'just now' }].concat(db.notices.filter((n) => n.id !== 'say'));
        resetDeck(); push('notice', { t }); paintWidget(); buzz(10); toast('said — it sits on her widget until she’s seen it');
      });
      body.appendChild(c);
    });
  });
});
$('#room-search').addEventListener('input', (e) => renderRooms(e.target.value));
/* p6 draws a ✕ in the Rooms header and it was never wired — the one screen in
   the build whose close button did nothing. It goes back to the canvas,
   because the canvas is what "closing" the directory reveals. */
$$('[data-back]', screens.rooms).forEach((b) => b.addEventListener('click', () => show('canvas')));

/* the room screens are built lazily, the light ones eagerly */
renderRooms(); renderBoard(); renderStates(); renderRules();
show('canvas');

/* keep the canvas headline and the widget honest */
function refresh() {
  const n = APP.strokeCount ? APP.strokeCount() : 0;
  const hands = APP.handCount ? APP.handCount() : 1;
  const cc = $('#canvas-count');
  if (cc) cc.textContent = `${n} mark${n === 1 ? '' : 's'}, ${hands} hand${hands === 1 ? '' : 's'}`;
  const home = $('#home');
  if (home && !home.classList.contains('hidden')) paintWidget();
}
setInterval(refresh, 700); refresh();
paintWidget();
rotate = setInterval(() => {
  const home = $('#home');
  if (window.TRACE_LOWPOWER) return;   // battery saver: the card holds still
  if (Date.now() - deckTouched < 5000) return;
  if (home && !home.classList.contains('hidden') && deck().length > 1) {
    widIdx = (widIdx + 1) % deck().length; paintWidget();
  }
}, 6000);

/* receive the other side's board changes over the same channel as ink */
const seenTs = {};   // per-key last-write-wins — the offline merge rule
window.TRACE_BOARD = {
  receive({ kind, payload, ts }) {
    if (ts && payload && payload.id) {
      const k = kind + ':' + payload.id;
      if (seenTs[k] && seenTs[k] > ts) return;   // an older offline echo — drop it
      seenTs[k] = ts;
    }
    if (kind === 'todo') db.done[payload.id] = payload.done;
    else if (kind === 'list') db.got[payload.id] = payload.got;
    else if (kind === 'shopping') db.shopping = payload.on;
    else if (kind === 'mood') db.herMood = payload.n;
    else if (kind === 'savings') db.savings.have = payload.have;
    else if (kind === 'leaving') db.leaving = payload;
    else if (kind === 'thinking') db.thinking = { ts: Date.now() };
    else if (kind === 'notice') db.notices = [{ id: 'say', t: payload.t, when: 'just now' }]
      .concat(db.notices.filter((n) => n.id !== 'say'));
    else if (kind === 'flare') db.flare = { ts: Date.now() };
    else if (kind === 'pageink') { window.TRACE_APP && TRACE_APP.receivePageInk(payload); db.traceSeen = false; }
    else if (kind === 'guest') {
      /* guestDay is what keeps guest mode to a single evening — guestExpired()
         clears anything without today's date on it. Receiving the flag without
         it meant the very next paint reverted it and pushed {on:false} back
         down the wire, so turning guest mode on from her side never survived
         one tick. */
      db.guest = payload.on;
      db.guestDay = payload.on ? new Date().toDateString() : null;
    }
    else if (kind === 'car') db.carMode = payload.on;
    else if (kind === 'unblock') db.unblocked[payload.id] = true;
    else if (kind === 'decided') db.decided[payload.id] = !db.decided[payload.id];
    else if (kind === 'load') { const l = (db.load || []).find((x) => x.id === payload.id); if (l) l.who = payload.who; }
    else if (kind === 'rsvp') db.rsvp[payload.id] = payload.v;
    else if (kind === 'renewal') db.cancelled[payload.id] = !db.cancelled[payload.id];
    else if (kind === 'bucket') db.bucket[payload.id] = !db.bucket[payload.id];
    else if (kind === 'week') { if (db.week7 && db.week7[payload.n]) db.week7[payload.n][1] = payload.t; }
    else if (kind === 'stack') db.stack = payload.order;
    else if (kind === 'meal') db.mealIdx = payload.i;
    else if (kind === 'jar') db.jarN = payload.n;
    else if (kind === 'baton') db.baton = payload.on;
    else if (kind === 'dose') db.dosed[payload.id] = !db.dosed[payload.id];
    /* anything that arrives goes to the front of the deck — that's the
       whole arrival moment; it never repeats once it has been seen */
    resetDeck();
    save(); paintWidget();
    if (current === 'room' && roomKey) openRoom(roomKey);
  },
  sendPageInk(payload) { push('pageink', payload); },
  /* the engine tells us a stroke landed, so the one-time trace re-arms */
  inked() { db.traceSeen = false; resetDeck(); save(); paintWidget(); },
  paint: paintWidget,
  /* the registry rooms2.js builds the rest of the design on */
  addSub(kind, title, build) { SUBS[kind] = { title, build }; },
  subKeys() { return Object.keys(SUBS); },
  addNav(kind, go) { NAVS[kind] = go; },
  addRow(room, key, name, sub, right) { (SUBLISTS[room] || (SUBLISTS[room] = [])).push({ key, name, sub, right }); },
  addCard(fn) { EXTRA_CARDS.push(fn); },
  addPresence(fn) { PRESENCE_EXTRAS.push(fn); },
  addScreen(name, render) { RENDERERS[name] = render; },
  subRows,
  /* `screen` is a screen name, or a function for the few doors that are not
     screens (the p16 springboard demo lives on the shell, not in the stack) */
  addBeyond(label, sub, screen, group) {
    BEYOND.push([label, sub, typeof screen === 'function' ? screen : () => show(screen), group]);
  },
  screens, deck, resetDeck,
  defaults(more) { for (const k in more) if (!(k in db)) db[k] = more[k]; save(); },
  openSub, openRoom, show, save, push,
  el, esc, count, tickRow, navRow, swRow,
  ui: { toast, buzz, panel: (t, b) => APP.openPanel && APP.openPanel(t, b) },
  /* "leaving now" and "thinking of you" are pushed, not polled */
  /* p59 protects a named evening each week. Two things were wrong here.
     `db.modes` is the quiet-modes store — repair, cover, newborn, grief — and
     nothing has ever written `modes.solo`, so `modes.solo && solo.on` was an
     AND with a flag that is permanently false: the screen said it was
     protecting the night while every departure still broadcast. And there was
     no day check at all, so once armed it would have suppressed every night of
     the week, where the screen names one. */
  soloNight() {
    if (!db.solo || !db.solo.on || !db.solo.yours) return false;
    const today = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][new Date().getDay()];
    return db.solo.yours === today;
  },
  /* Returns whether it actually went out, because the caller used to toast
     "on her widget now" unconditionally — straight over the top of "your night
     — nothing was sent". The false one won, and it was the reassuring one. */
  leaving(mins) {
    /* the departure still records locally; it just does not broadcast */
    db.leaving = { mins }; resetDeck(); paintWidget();
    if (this.soloNight()) { save(); toast('your night — nothing was sent'); return false; }
    push('leaving', { mins });
    if ((db.loud || {}).leave !== 'off' && (db.loud || {}).leave !== 'widget' && window.TRACE_PUSH)
      TRACE_PUSH.ring('leave', 'Leaving now — home in ' + mins + ' min');
    return true; },
  thinking() { db.thinking = { ts: Date.now() }; resetDeck(); push('thinking', {}); paintWidget(); },
  db,
};
/* the same object, under the name rooms2.js builds against */
window.TRACE_ROOMS = window.TRACE_BOARD;

})();
