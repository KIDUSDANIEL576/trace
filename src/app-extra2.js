/* trace — the remaining designed features: canvas shell, marks, and world.
   Chains onto TRACE_EXTRA so both extension files register together. */
(() => {
const prev = window.TRACE_EXTRA;
window.TRACE_EXTRA = (api) => {
'use strict';
const base = prev ? prev(api) : [];
const { openPanel, closePanel, miniCanvas, toast, log, buzz, store, SHAPES,
        wobblePath, jit, sara, redraw, closeSheet, strokes, canvas, note, $, now, DPR } = api;

const el = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; };
const hint = (t) => el(`<div class="p-hint">${t}</div>`);
const noteEl = (t) => el(`<div class="p-note">${t}</div>`);
const cta = (t, fn) => { const b = el(`<button class="p-cta">${t}</button>`); b.addEventListener('click', fn); return b; };
const ghostBtn = (t, fn) => { const b = el(`<button class="p-ghost">${t}</button>`); b.addEventListener('click', fn); return b; };

/* ------------------------------------------------------ skies & themes */

const SKIES = {
  dusk:     ['#33445f', '#5c5f78', '#8a6b73', '#2e2733'],
  daylight: ['#bfe3ff', '#ffd7e6', '#ffe9c7', '#fff1e6'],
  night:    ['#05070f', '#111a2e', '#1b2340', '#05060d'],
  sunset:   ['#ff9a5a', '#ff6f7d', '#c14a86', '#5b2a6b'],
  sea:      ['#04121f', '#0d3b45', '#2c7a6b', '#123a52'],
  bruise:   ['#1b0b18', '#3f1130', '#6b1b44', '#2a0d22'],
  ember:    ['#2b1216', '#6d2530', '#c04a3d', '#f2894f'],
};
window.TRACE_SKY = (n, st) => applySky(n, st, true);
const applySky = (name, strength, fromRemote) => {
  if (!fromRemote && window.TRACE_NET) TRACE_NET.emit('sky', { name, strength });
  const c = SKIES[name] || SKIES.dusk;
  const sky = $('#sky');
  sky.style.background = `linear-gradient(180deg,${c[0]} 0%,${c[1]} 45%,${c[2]} 70%,${c[3]} 100%)`;
  sky.style.opacity = (0.35 + 0.65 * strength).toFixed(2);
  const light = name === 'daylight';
  $('#screen').classList.toggle('is-light', light);
  store.set('sky', { name, strength });
};
const savedSky = store.get('sky', { name: 'dusk', strength: 1 });
setTimeout(() => applySky(savedSky.name, savedSky.strength), 0);

function skyPicker() {
  openPanel('sky & strength', (body) => {
    body.appendChild(noteEl('Pick a background and how strongly it shows. The ink stays legible either way — that’s what strength is for.'));
    const grid = el('<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:9px"></div>');
    let cursky = store.get('sky', { name: 'dusk', strength: 1 });
    for (const [name, c] of Object.entries(SKIES)) {
      const b = el(`<button style="aspect-ratio:.72;border-radius:14px;border:2px solid ${name === cursky.name ? '#e23343' : 'rgba(255,255,255,.14)'};
        background:linear-gradient(180deg,${c[0]},${c[1]} 45%,${c[2]} 70%,${c[3]});position:relative;overflow:hidden">
        <span style="position:absolute;left:5px;bottom:4px;font:700 8px ui-monospace,monospace;color:${name === 'daylight' ? '#2b2029' : '#fff'};opacity:.85">${name}</span></button>`);
      b.addEventListener('click', () => {
        cursky = { ...cursky, name };
        [...grid.children].forEach((x, i) => x.style.borderColor = Object.keys(SKIES)[i] === name ? '#e23343' : 'rgba(255,255,255,.14)');
        applySky(name, cursky.strength); buzz(8); log('sky → ' + name);
      });
      grid.appendChild(b);
    }
    body.appendChild(grid);
    body.appendChild(el('<div class="p-note" style="margin-top:6px">strength</div>'));
    const sl = el(`<input type="range" min="0" max="100" value="${cursky.strength * 100}" style="width:100%;accent-color:#e23343">`);
    sl.addEventListener('input', () => { cursky.strength = sl.value / 100; applySky(cursky.name, cursky.strength); });
    body.appendChild(sl);
    body.appendChild(hint('the same sky is on her phone right now'));
  });
}

/* -------------------------------------------------- draw on a photo */
function drawOnPhoto() {
  closeSheet();
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.addEventListener('change', () => {
    const f = inp.files[0]; if (!f) return;
    const url = URL.createObjectURL(f);
    const sky = $('#sky');
    sky.style.background = `#000 center/cover no-repeat url("${url}")`;
    sky.style.opacity = 1;
    note('a photo you both can draw on');
    toast('she can draw on it too');
    log('photo canvas set');
    setTimeout(() => note(''), 4500);
  });
  inp.click();
}

/* ------------------------------------------------------ clear canvas */
function clearCanvas() {
  closeSheet();
  if (!confirm('Clear the canvas? This erases it for both of you.')) return;
  strokes.clear();
  window.TRACE_NET && TRACE_NET.emit('clear', {});
  toast('cleared — for both of you');
  log('canvas cleared (both sides)');
}

/* ---------------------------------------------- three pages: us / me / her */
const PAGES = ['us', 'mine', 'hers'];
let page = 'us';
const pageStrokes = { us: [], mine: [], hers: [] };

function mountTabs() {
  if ($('#tabs')) return;
  const bar = el(`<div id="tabs" class="glass" style="position:relative;z-index:5;align-self:center;display:flex;gap:4px;padding:4px;border-radius:99px;margin:2px 0 4px">
    <button data-p="us" class="tb on">us</button>
    <button data-p="mine" class="tb">my page</button>
    <button data-p="hers" class="tb">Sara</button></div>`);
  $('#top').after(bar);
  bar.querySelectorAll('.tb').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.p === page) return;
    pageStrokes[page] = strokes.all();
    page = b.dataset.p;
    bar.querySelectorAll('.tb').forEach(x => x.classList.toggle('on', x === b));
    strokes.set(pageStrokes[page]);
    note(page === 'us' ? '' : page === 'mine' ? 'only you can see this page' : 'a page just for her — she sees it, you can’t erase it');
    toast(page === 'us' ? 'the shared canvas' : page === 'mine' ? 'your page — private' : 'her page');
    log('page → ' + page);
    setTimeout(() => note(''), 3500);
  }));
}
setTimeout(mountTabs, 60);

/* --------------------------------------------- 3a their finger, live */
function fingerLive() {
  closeSheet();
  note('watch her hesitate — the dot moves before any ink lands');
  log('ghost finger: live');
  const ghost = $('#ghost-finger');
  const { W, H } = canvas();
  let t = 0, iv = setInterval(() => {
    t += .05;
    // she hovers, drifts back, commits
    const x = W * (.35 + Math.sin(t) * .22 + Math.sin(t * 3.1) * .05);
    const y = H * (.4 + Math.cos(t * .8) * .18);
    ghost.style.left = x + 'px'; ghost.style.top = y + 'px'; ghost.style.opacity = 1;
  }, 40);
  setTimeout(() => {
    clearInterval(iv); ghost.style.opacity = 0;
    note('she redid it twice before sending');
    sara.drawShape('heart');
    setTimeout(() => note(''), 4000);
  }, 7000);
}

/* --------------------------------------------------------- 6d the line */
function theLine() {
  openPanel('the line', (body) => {
    const today = new Date().toDateString();
    const used = store.get('lineDay', '') === today;
    body.appendChild(noteEl('One canvas for the entire app. Each couple gets a single stroke, once a day, and it never resets — a drawing half a million people are making together.'));
    const { box, c, x, fit } = miniCanvas(240);
    body.appendChild(box);
    const stat = el('<div class="p-stat" style="font-size:19px"></div>'); body.appendChild(stat);
    let off = 0, raf, mine = store.get('lineMine', null);
    const paint = () => {
      if (!box.isConnected) return;
      fit();
      const w2 = box.clientWidth, h2 = box.clientHeight;
      x.clearRect(0, 0, w2, h2);
      x.lineCap = 'round'; x.lineWidth = 4;
      const g = x.createLinearGradient(0, 0, w2, 0);
      ['#7ec8ff', '#f4c66b', '#ff7a9c', '#e23343'].forEach((cc, i) => g.addColorStop(i / 3, cc));
      x.strokeStyle = g; x.beginPath();
      for (let px = -20; px < w2 + 20; px += 3) {
        const py = h2 / 2 + Math.sin((px + off) / 31) * 24 + Math.sin((px + off) / 7) * 5;
        px === -20 ? x.moveTo(px, py) : x.lineTo(px, py);
      }
      x.stroke();
      if (mine) { // your stroke, marked forever
        x.strokeStyle = '#fff'; x.lineWidth = 6;
        const px = w2 * .5;
        x.beginPath(); x.moveTo(px - 14, h2 / 2 + 6); x.lineTo(px + 12, h2 / 2 - 10); x.stroke();
        x.fillStyle = 'rgba(255,255,255,.7)'; x.font = '9px ui-monospace,monospace';
        x.fillText('yours', px - 12, h2 / 2 + 26);
      }
      off += .5;
      raf = requestAnimationFrame(paint);
    };
    paint();
    stat.textContent = (511904 + (mine ? 1 : 0)).toLocaleString() + ' strokes · never erased';
    const b = used ? ghostBtn('you drew today — come back tomorrow', () => toast('one a day. that’s the whole rule.'))
                   : cta('add your one stroke for today', () => {
        store.set('lineDay', today); store.set('lineMine', true); mine = true;
        stat.textContent = (511905).toLocaleString() + ' strokes · never erased';
        toast('that’s yours, in there, forever'); log('the line: stroke added'); buzz([20, 40, 20]);
        b.replaceWith(ghostBtn('you drew today — come back tomorrow', () => {}));
      });
    body.appendChild(b);
    return () => cancelAnimationFrame(raf);
  });
}

/* ------------------------------------------------------ 7b the day itself */
function theDay() {
  openPanel('the day', (body) => {
    const d = new Date();
    body.appendChild(el(`<div style="text-align:center;padding:10px 0">
      <div style="font-family:Caveat,cursive;font-weight:700;font-size:96px;line-height:.9">${d.getDate()}</div>
      <div style="font-family:Caveat,cursive;font-weight:700;font-size:30px;color:#ff9ea9;margin-top:2px">the day we met, 4 years ago</div>
      <div style="font:700 10px ui-monospace,monospace;letter-spacing:.16em;color:rgba(243,240,244,.45);margin-top:10px">${d.toLocaleDateString(undefined,{month:'long',year:'numeric'}).toUpperCase()}</div></div>`));
    body.appendChild(noteEl('Not “Event”. What it actually is, in your own handwriting. You’ve both drawn on it — hers is underneath yours.'));
    const { box, c, x, fit } = miniCanvas(180);
    body.appendChild(box);
    requestAnimationFrame(() => {
      fit();
      const w2 = box.clientWidth, h2 = box.clientHeight;
      x.lineCap = x.lineJoin = 'round';
      x.strokeStyle = '#ff7a9c'; x.lineWidth = 8; x.beginPath();
      SHAPES.heart.forEach(([px, py], i) => { const X = jit((px - .1) * w2, 3), Y = jit(py * h2 * 1.2, 3); i ? x.lineTo(X, Y) : x.moveTo(X, Y); });
      x.stroke();
      x.strokeStyle = '#e23343'; x.beginPath();
      SHAPES.sun.forEach(([px, py], i) => { const X = jit((px + .25) * w2, 3), Y = jit(py * h2 * 1.2, 3); i ? x.lineTo(X, Y) : x.moveTo(X, Y); });
      x.stroke();
    });
    body.appendChild(hint('both of you, on the same square'));
  });
}

/* --------------------------------------------------- 2e quick marks */
const MARKS = [
  ['sunny here', 'sun', '#f4c66b'], ['raining', 'squiggle', '#7ec8ff'], ['coffee?', 'come', '#f3f0f4'],
  ['the cat', 'xo', '#ff7a9c'], ['come here', 'come', '#e23343'], ['6:40 wake me', 'squiggle', '#f4c66b'],
  ['happy bday', 'sun', '#fff'], ['meet here', 'come', '#7ec8ff'], ['xoxo', 'xo', '#ff7a9c'],
  ['your turn', 'squiggle', '#fff'], ['i’m sorry', 'heartL', '#f3f0f4'], ['a flower', 'sun', '#ff7a9c'],
  ['just a squiggle', 'squiggle', '#fff'], ['ok, one heart', 'heart', '#e23343'],
];
function quickMarks(title, list, blurb) {
  openPanel(title, (body) => {
    body.appendChild(noteEl(blurb));
    const grid = el('<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px"></div>');
    for (const [label, shape, col] of list) {
      const cell = el(`<button style="position:relative;aspect-ratio:1;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);overflow:hidden"></button>`);
      const cc = document.createElement('canvas');
      cc.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
      cell.appendChild(cc);
      cell.appendChild(el(`<span style="position:absolute;left:6px;bottom:4px;font-size:9px;color:rgba(255,255,255,.55)">${label}</span>`));
      grid.appendChild(cell);
      requestAnimationFrame(() => {
        cc.width = cell.clientWidth * DPR; cc.height = cell.clientHeight * DPR;
        const cx = cc.getContext('2d'); cx.setTransform(DPR, 0, 0, DPR, 0, 0);
        cx.lineCap = cx.lineJoin = 'round'; cx.strokeStyle = col; cx.lineWidth = 4;
        const w2 = cell.clientWidth, h2 = cell.clientHeight;
        cx.beginPath();
        (SHAPES[shape] || SHAPES.squiggle).forEach(([px, py], i) => {
          const X = jit(px * w2, 2), Y = jit((py - .06) * h2, 2); i ? cx.lineTo(X, Y) : cx.moveTo(X, Y); });
        cx.stroke();
      });
      cell.addEventListener('click', () => {
        closePanel();
        strokes.add({ pts: wobblePath(SHAPES[shape] || SHAPES.squiggle, 4, 5), c: col, w: 9, brush: 'pen', who: 'you', born: now() });
        toast('sent — “' + label + '”'); buzz(14); log('mark sent: ' + label);
      });
    }
    body.appendChild(grid);
    body.appendChild(hint('tap one and it lands on her canvas'));
  });
}
const markVocab = () => quickMarks('things we draw', MARKS,
  'Sixteen real things people send. None of them is a heart, except the one that is.');
const badDays = () => quickMarks('for the hard days', [
  ['38.4 · staying in', 'squiggle', '#f3f0f4'], ['hot water bottle', 'come', '#ff4d6d'],
  ['out of spoons', 'squiggle', '#9a93a5'], ['cloud over my head', 'squiggle', '#7ec8ff'],
  ['don’t talk yet', 'xo', '#f3f0f4'], ['call me when you can', 'come', '#f4c66b'],
  ['i’m on the bus, crying', 'squiggle', '#8f9bb3'], ['it got better at 4pm', 'sun', '#f5a524'],
  ['left on your side of bed', 'heart', '#ff4d6d'],
], 'Every couples app sells the good bits. Some days you can’t type a sentence.');

/* ----------------------------------------------------- 4g sticker pack */
function stickers() {
  openPanel('sticker sheet №1', (body) => {
    body.appendChild(noteEl('The marks as die-cut stickers. Tap one to drop it on the canvas — or order the sheet.'));
    const row = el('<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center"></div>');
    const kinds = [['heart', '#ff4d6d', 1], ['xoxo', null, 0], ['6:40', null, 0], ['come', '#e23343', 1],
      ['sun', '#f5a524', 1], ['squiggle', '#2b2029', 1], ['trace', null, 0]];
    for (const [k, col, isShape] of kinds) {
      const st = el(`<button style="width:86px;height:86px;border-radius:${Math.random() > .5 ? '99px' : '18px'};background:#fff;border:3px solid #2b2029;
        transform:rotate(${(Math.random() - .5) * 16}deg);box-shadow:0 6px 14px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;
        font-family:Caveat,cursive;font-weight:700;font-size:24px;color:#2b2029;position:relative;overflow:hidden"></button>`);
      if (isShape) {
        const cc = document.createElement('canvas');
        cc.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
        st.appendChild(cc);
        requestAnimationFrame(() => {
          cc.width = 86 * DPR; cc.height = 86 * DPR;
          const cx = cc.getContext('2d'); cx.setTransform(DPR, 0, 0, DPR, 0, 0);
          cx.lineCap = cx.lineJoin = 'round'; cx.strokeStyle = col; cx.lineWidth = 6;
          cx.beginPath();
          SHAPES[k].forEach(([px, py], i) => { const X = jit(px * 86, 2), Y = jit((py - .05) * 86, 2); i ? cx.lineTo(X, Y) : cx.moveTo(X, Y); });
          cx.stroke();
        });
      } else st.textContent = k;
      st.addEventListener('click', () => {
        closePanel();
        if (isShape) strokes.add({ pts: wobblePath(SHAPES[k], 4, 5), c: col, w: 10, brush: 'pen', who: 'you', born: now() });
        toast('stuck it on'); buzz(12); log('sticker: ' + k);
      });
      row.appendChild(st);
    }
    body.appendChild(row);
    body.appendChild(cta('order the sheet — free with Forever', () => toast('on its way. stick one on their laptop.')));
  });
}

/* ------------------------------------------------- 4c the year in marks */
function yearInMarks() {
  openPanel('us, in ink', (body) => {
    body.appendChild(noteEl('One mark a month, pulled from what you actually drew.'));
    const grid = el('<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px"></div>');
    const MO = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const cols = ['#dfeaf6','#ffdfe7','#e9f6d8','#3c4a5a','#fff4d6','#bfe6ff','#ff9a5a','#ffe9c4','#20304f','#2a0f1c','#0b1226','#33445f'];
    MO.forEach((m, i) => {
      const cell = el(`<div style="position:relative;aspect-ratio:1;border-radius:11px;overflow:hidden;background:linear-gradient(180deg,${cols[i]},rgba(0,0,0,.55))"></div>`);
      const cc = document.createElement('canvas'); cc.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
      cell.appendChild(cc);
      cell.appendChild(el(`<div style="position:absolute;left:5px;top:4px;font:700 8px ui-monospace,monospace;color:rgba(255,255,255,.85)">${m}</div>`));
      grid.appendChild(cell);
      requestAnimationFrame(() => {
        cc.width = cell.clientWidth * DPR; cc.height = cell.clientHeight * DPR;
        const cx = cc.getContext('2d'); cx.setTransform(DPR, 0, 0, DPR, 0, 0);
        const w2 = cell.clientWidth, h2 = cell.clientHeight;
        cx.lineCap = cx.lineJoin = 'round'; cx.strokeStyle = i === 11 ? '#e23343' : '#fff'; cx.lineWidth = 4;
        const sh = [SHAPES.squiggle, SHAPES.heart, SHAPES.sun, SHAPES.xo, SHAPES.come][i % 5];
        cx.beginPath();
        sh.forEach(([px, py], j) => { const X = jit(px * w2, 2), Y = jit((py - .05) * h2, 2); j ? cx.lineTo(X, Y) : cx.moveTo(X, Y); });
        cx.stroke();
      });
    });
    body.appendChild(grid);
    body.appendChild(el(`<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:14px;margin-top:6px">
      <div style="font-family:Caveat,cursive;font-weight:700;font-size:30px;line-height:.98">4,812 strokes.<br>none of them typed.</div>
      <div style="font:700 9.5px/1.7 ui-monospace,monospace;color:rgba(243,240,244,.5);text-align:right">318 DAYS DRAWN<br>41 CAPSULES<br>2 PEOPLE</div></div>`));
  });
}

/* ------------------------------------------------------- 4d translate this */
function translateThis() {
  openPanel('translate this', (body) => {
    body.appendChild(noteEl('Send a drawing nobody could read, with three guesses. It’s engagement bait that happens to be a perfect demo.'));
    const { box, c, x, fit } = miniCanvas(220);
    body.appendChild(box);
    requestAnimationFrame(() => {
      fit();
      const w2 = box.clientWidth, h2 = box.clientHeight;
      const g = x.createLinearGradient(0, 0, 0, h2);
      g.addColorStop(0, '#ff9a5a'); g.addColorStop(1, '#5b2a6b');
      x.fillStyle = g; x.fillRect(0, 0, w2, h2);
      x.lineCap = x.lineJoin = 'round'; x.strokeStyle = '#fff'; x.lineWidth = 9;
      x.beginPath();
      for (let i = 0; i < 26; i++) {
        const px = w2 * (.2 + i / 34), py = h2 * (.5 + Math.sin(i * 1.7) * .22 + Math.cos(i * .8) * .1);
        i ? x.lineTo(px, py) : x.moveTo(px, py);
      }
      x.stroke();
    });
    const answers = ['a bird, apparently', '“pick me up”', 'he was falling asleep'];
    const votes = store.get('translateVotes', [12, 31, 57]);
    answers.forEach((a, i) => {
      const b = el(`<button style="position:relative;width:100%;padding:13px 15px;border-radius:14px;background:rgba(255,255,255,.9);color:#2b2029;font-size:13.5px;font-weight:600;text-align:left;overflow:hidden">
        <span style="position:absolute;inset:0;width:${votes[i]}%;background:rgba(226,51,67,.22)"></span>
        <span style="position:relative">${a}</span>
        <span style="position:relative;float:right;font:700 12px ui-monospace,monospace">${votes[i]}%</span></button>`);
      b.addEventListener('click', () => { toast(i === 2 ? 'it was the third one. it’s always the third one.' : 'nope.'); buzz(10); log('translate vote: ' + a); });
      body.appendChild(b);
    });
    body.appendChild(hint('(it was the third one.)'));
  });
}

/* --------------------------------------------------- 6g campaign moments */
function moments() {
  openPanel('twelve months', (body) => {
    body.appendChild(noteEl('Real dates people already feel, mapped to formats we’ve built. The highest-leverage page in the brief.'));
    const rows = [
      ['JAN', 'long-distance new year', 'Both Here'], ['FEB', 'valentine’s, drawn not bought', 'sticker sheet'],
      ['MAR', 'the boring Tuesday', 'dictionary'], ['APR', 'exam season', 'the quiet nudge'],
      ['MAY', 'moving in', 'the days'], ['JUN', 'the airport one', 'While You Slept'],
      ['JUL', 'summer apart', 'Touching'], ['AUG', 'ultrasound day', 'the films'],
      ['SEP', 'back to different cities', 'the Thread'], ['OCT', 'the fight', 'four strokes'],
      ['NOV', 'the anniversary', 'one year ago tonight'], ['DEC', 'the year in ink', 'riso print'],
    ];
    for (const [m, moment, format] of rows) {
      body.appendChild(el(`<div style="display:flex;align-items:baseline;gap:12px;padding:9px 2px;border-bottom:1px solid rgba(255,255,255,.08)">
        <b style="font:700 10px ui-monospace,monospace;color:#e23343;width:30px;flex:none">${m}</b>
        <span style="flex:1;font-size:12.5px">${moment}</span>
        <i style="font-style:normal;font-size:11px;color:#9a93a5">${format}</i></div>`));
    }
  });
}

/* ------------------------------------------------------- 6h positioning */
function positioning() {
  openPanel('the positioning', (body) => {
    body.appendChild(el(`<div class="list-quiet">
      <div><b>Not a messaging app.</b> Messaging is about information arriving. This is about a person being there.</div>
      <div><b>Not a social network.</b> The maximum audience is one. Nothing here gets more valuable with more people in it.</div>
      <div><b>Not a memory box.</b> Memory boxes are for after. This is for during.</div>
    </div>`));
    body.appendChild(el('<div class="p-note" style="margin-top:10px;color:#f4c66b;font-weight:700">and the three we will not build</div>'));
    body.appendChild(el(`<div class="list-quiet">
      <div><span class="no">✕</span><b>Story mining.</b> We never read a canvas to find content. Donation is opt-in, deliberate, and reversible.</div>
      <div><span class="no">✕</span><b>Engagement targets on a relationship.</b> No number in here is allowed to go up because we made someone anxious.</div>
      <div><span class="no">✕</span><b>Anything a third person can see by default.</b> Two people, or it doesn’t ship.</div>
    </div>`));
    body.appendChild(hint('the difference between a moat and a scandal'));
  });
}

/* ------------------------------------------------------------ register */
return base.concat([
  { g: 'the canvas' },
  { id: 'sky', n: 'Sky & strength', d: 'pick a background and how strongly it shows', i: 'sunrise', run: skyPicker },
  { id: 'photo', n: 'Draw on a photo', d: 'add a photo you both can draw on', i: 'camera', run: drawOnPhoto },
  { id: 'clear', n: 'Clear the canvas', d: 'erases it for both of you', i: 'trash', run: clearCanvas },
  { id: 'fingerlive', n: 'Their finger, live', d: 'watch her hesitate before the ink lands', i: 'eye', run: fingerLive },

  { g: 'marks' },
  { id: 'vocab', n: 'Things we draw', d: 'sixteen marks, tap to send', i: 'message', run: markVocab },
  { id: 'bad', n: 'For the hard days', d: 'when you can’t type a sentence', i: 'heart', run: badDays },
  { id: 'stickers', n: 'Sticker sheet', d: 'die-cut marks — stick one on the canvas', i: 'gift', run: stickers },
  { id: 'yearmarks', n: 'Us, in ink', d: 'one mark a month, the whole year', i: 'bookmark', run: yearInMarks },
  { id: 'translate', n: 'Translate this', d: 'an unreadable drawing and three guesses', i: 'sparkles', run: translateThis },

  { g: 'the world' },
  { id: 'theline', n: 'The Line', d: 'one stroke a day, half a million people', i: 'arrows-h', run: theLine },
  { id: 'theday', n: 'The day', d: 'the date, huge, in your handwriting', i: 'pen-line', run: theDay },
  { id: 'moments', n: 'Twelve months', d: 'the moments worth showing up for', i: 'repeat', run: moments },
  { id: 'positioning', n: 'The positioning', d: 'what this is, and the three we won’t build', i: 'coin', run: positioning },
]);
};
})();
