/* trace — the remaining designed features, wired for real.
   Registered into the main app through the explicit API in app.js. */
window.TRACE_EXTRA = (api) => {
'use strict';
const { openPanel, miniCanvas, playInto, toast, log, buzz, store, SHAPES,
        wobblePath, jit, sara, redraw, closeSheet, strokes, canvas, note,
        hooks, $, now, DPR } = api;

const el = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; };
const hint = (t) => el(`<div class="p-hint">${t}</div>`);
const noteEl = (t) => el(`<div class="p-note">${t}</div>`);
const cta = (t, fn) => { const b = el(`<button class="p-cta">${t}</button>`); b.addEventListener('click', fn); return b; };
const ghostBtn = (t, fn) => { const b = el(`<button class="p-ghost">${t}</button>`); b.addEventListener('click', fn); return b; };

function toggleRow(body, label, sub, on, onChange) {
  const row = el(`<button style="display:flex;align-items:center;gap:12px;justify-content:space-between;width:100%;padding:13px 14px;border-radius:16px;background:var(--surface);border:1px solid var(--hairline);color:var(--ink);text-align:left">
    <span><b style="display:block;font-size:14px;font-weight:600">${label}</b><i style="display:block;font-style:normal;font-size:11.5px;color:var(--ink-3);margin-top:2px">${sub}</i></span>
    <span class="tg" style="flex:none;width:44px;height:26px;border-radius:99px;position:relative;transition:background .2s"><i style="position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:99px;background:#fff;transition:transform .2s"></i></span></button>`);
  const k = row.querySelector('.tg');
  const paint = () => { k.style.background = on ? '#c64b52' : 'var(--hairline)'; k.firstChild.style.transform = on ? 'translateX(18px)' : ''; };
  paint();
  row.addEventListener('click', () => { on = !on; paint(); buzz(8); onChange && onChange(on); });
  body.appendChild(row);
  return { get: () => on };
}

/* ---------------------------------------------------------- 10c palm */
function palmToPalm() {
  openPanel('palm to palm', (body) => {
    body.appendChild(noteEl('Flatten your hand on the screen and hold. It keeps the outline — actual size. She lays hers on top.'));
    const { box, c, x, fit } = miniCanvas(400);
    body.appendChild(box);
    const stat = el('<div class="p-note" style="text-align:center"></div>');
    body.appendChild(stat);
    const h = hint('press and hold with your whole hand'); body.appendChild(h);
    let yours = null, raf;
    const hand = (w2, h2, scale, col, lw) => {
      // crude, deliberately — a traced hand, not a vector glyph
      const base = [[.42,.96],[.34,.74],[.30,.56],[.24,.50],[.22,.42],[.28,.40],[.33,.47],
        [.34,.26],[.40,.24],[.41,.44],[.46,.16],[.52,.16],[.53,.44],[.58,.20],[.64,.22],
        [.62,.46],[.70,.30],[.75,.34],[.68,.52],[.66,.74],[.60,.96]];
      x.lineCap = x.lineJoin = 'round'; x.strokeStyle = col; x.lineWidth = lw;
      x.beginPath();
      base.forEach(([px, py], i) => {
        const X = (px - .5) * w2 * scale + w2 / 2, Y = (py - .5) * h2 * scale + h2 / 2;
        i ? x.lineTo(jit(X, 2), jit(Y, 2)) : x.moveTo(X, Y);
      });
      x.stroke();
    };
    const paint = () => {
      requestAnimationFrame(fit);
      const w2 = box.clientWidth, h2 = box.clientHeight;
      x.clearRect(0, 0, w2, h2);
      // guide, so the panel is never an empty box
      if (!yours) { x.setLineDash([6, 9]); hand(w2, h2, .96, 'rgba(247,239,233,.22)', 3); x.setLineDash([]); }
      if (yours) hand(w2, h2, .96, 'rgba(247,239,233,.6)', 4);
      if (yours && yours.her) hand(w2, h2, .87, '#ff9ea9', 4);
      raf = requestAnimationFrame(paint);
    };
    paint();
    let t0 = 0;
    box.addEventListener('pointerdown', () => { t0 = now(); h.textContent = 'hold still…'; });
    box.addEventListener('pointerup', () => {
      if (now() - t0 > 500) {
        yours = { her: false };
        stat.textContent = 'YOURS 19.8 cm';
        h.textContent = 'sent. she’ll lay hers on top when she wakes.';
        log('palm captured');
        sara.after(2200, () => {
          yours.her = true;
          stat.textContent = 'YOURS 19.8 cm · HERS 17.2 cm';
          h.textContent = '2.6 cm of her, missing';
          buzz([20, 40, 20]);
        });
      }
    });
    return () => cancelAnimationFrame(raf);
  });
}

/* ------------------------------------------------- 10g · fogged glass */
function fogged() {
  openPanel('fogged glass', (body) => {
    body.appendChild(noteEl('Breathe on it and wipe. She wipes from her side. You meet in the middle.'));
    const { box, c, x, fit } = miniCanvas(380);
    body.appendChild(box);
    const h = hint('wipe with your finger'); body.appendChild(h);
    let ready = false;
    requestAnimationFrame(() => {
      fit();
      const w2 = box.clientWidth, h2 = box.clientHeight;
      const g = x.createLinearGradient(0, 0, 0, h2);
      g.addColorStop(0, TOK('--ground-alt')); g.addColorStop(1, TOK('--ink-3'));
      x.fillStyle = g; x.fillRect(0, 0, w2, h2);
      x.lineCap = 'round'; x.strokeStyle = '#fff'; x.lineWidth = 10;
      const pts = SHAPES.heart.map(([px, py]) => ({ x: px * w2, y: py * h2 }));
      x.beginPath(); x.moveTo(pts[0].x, pts[0].y); pts.forEach(p => x.lineTo(jit(p.x, 3), jit(p.y, 3))); x.stroke();
      const fog = document.createElement('canvas');
      fog.width = w2 * DPR; fog.height = h2 * DPR;
      fog.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
      const fx = fog.getContext('2d'); fx.setTransform(DPR, 0, 0, DPR, 0, 0);
      fx.fillStyle = 'rgba(226,232,240,.93)'; fx.fillRect(0, 0, w2, h2);
      box.appendChild(fog);
      const wipe = (px, py, r) => { fx.save(); fx.globalCompositeOperation = 'destination-out';
        fx.beginPath(); fx.arc(px, py, r, 0, 7); fx.fill(); fx.restore(); };
      box.addEventListener('pointermove', (e) => {
        if (!e.buttons) return;
        const r = box.getBoundingClientRect();
        wipe(e.clientX - r.left, e.clientY - r.top, 24); buzz(3);
      });
      // she wipes from her side, unprompted
      let sy = h2 * .3;
      const her = setInterval(() => {
        if (!box.isConnected) return clearInterval(her);
        wipe(w2 * (.62 + Math.sin(sy / 40) * .1), sy, 20);
        sy += 9; if (sy > h2 * .9) { sy = h2 * .2; }
      }, 90);
      setTimeout(() => { if (box.isConnected) h.textContent = 'she’s wiping from her side'; }, 1800);
      ready = true;
    });
  });
}

/* -------------------------------------------------- 10g · thumbprint */
function thumbprint() {
  api.closeSheet();
  note('press anywhere — it never quite wipes clean of her');
  const { wrap } = canvas();
  const layer = $('#warm-layer');
  const smudge = (x, y, mine) => {
    const d = document.createElement('div');
    d.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:34px;height:44px;margin:-22px 0 0 -17px;border-radius:50% 50% 45% 45%;
      background:radial-gradient(ellipse at 50% 45%, rgba(255,255,255,${mine ? .13 : .10}), rgba(255,255,255,0) 68%);
      box-shadow:inset 0 0 0 1px var(--surface);transform:rotate(${(Math.random() - .5) * 40}deg);pointer-events:none`;
    layer.appendChild(d);
  };
  const onDown = (e) => {
    const r = wrap.getBoundingClientRect();
    smudge(e.clientX - r.left, e.clientY - r.top, true);
  };
  wrap.addEventListener('pointerdown', onDown);
  for (let i = 0; i < 5; i++) smudge(40 + Math.random() * 200, 60 + Math.random() * 380, false);
  toast('her thumbprints are already on it');
  log('thumbprint smudges on');
  setTimeout(() => { wrap.removeEventListener('pointerdown', onDown); note(''); }, 30000);
}

/* -------------------------------------------------- 10g · heart rate */
function heartRate() {
  openPanel('my heart rate, right now', (body) => {
    body.appendChild(noteEl('Not a number you send. A pulse she feels in her hand, live, for as long as you hold it.'));
    const ring = el(`<div style="position:relative;height:230px;display:flex;align-items:center;justify-content:center">
      <div class="hr" style="width:130px;height:130px;border-radius:99px;background:radial-gradient(circle,rgba(226,51,67,.9),rgba(226,51,67,.15) 70%);box-shadow:0 0 60px rgba(226,51,67,.45);transition:transform .12s"></div></div>`);
    body.appendChild(ring);
    const bpmEl = el('<div class="p-stat">— bpm</div>'); body.appendChild(bpmEl);
    const who = el('<div class="p-hint">hold to send yours</div>'); body.appendChild(who);
    const dot = ring.querySelector('.hr');
    let bpm = 68, holding = false, t = null;
    const beat = () => {
      if (!dot.isConnected) return;
      dot.style.transform = 'scale(1.16)';
      setTimeout(() => dot.style.transform = 'scale(1)', 120);
      if (holding) buzz(16);
      bpm += (Math.random() - .45) * 3;
      bpm = Math.max(58, Math.min(104, bpm));
      bpmEl.textContent = Math.round(bpm) + ' bpm';
      t = setTimeout(beat, 60000 / bpm);
    };
    beat();
    body.addEventListener('pointerdown', () => { holding = true; bpm += 9; who.textContent = 'she can feel it'; log('heart rate sent live'); });
    body.addEventListener('pointerup', () => { holding = false; who.textContent = 'hold to send yours'; });
    return () => clearTimeout(t);
  });
}

/* ------------------------------------------------ 10g · keep it alive */
function keepAlive() {
  api.closeSheet();
  const { W, H } = canvas();
  const s = { pts: wobblePath(SHAPES.sun, 4, 5), c: 'amber', w: 10, brush: 'pen', who: 'sara', born: now(), life: 1 };
  strokes.add(s);
  note('she drew this. it dies unless you trace it.');
  toast('go over her line to keep it alive');
  log('keep-it-alive started');
  let alive = 1;
  const decay = setInterval(() => {
    const { wrap } = canvas();
    if (!wrap.isConnected) return clearInterval(decay);
    alive -= .012;
    s.c = `rgba(233,161,59,${Math.max(0, alive)})`;
    redraw();
    if (alive <= 0) {
      clearInterval(decay);
      strokes.set(strokes.all().filter(k => k !== s));
      note('it died. she’ll know.');
      log('keep-it-alive: died');
      setTimeout(() => note(''), 4000);
    }
  }, 260);
  const { wrap } = canvas();
  const revive = (e) => {
    const r = wrap.getBoundingClientRect();
    const p = { x: e.clientX - r.left, y: e.clientY - r.top };
    for (const q of s.pts) if (Math.hypot(p.x - q.x, p.y - q.y) < 22) {
      alive = Math.min(1, alive + .06);
      s.c = `rgba(233,161,59,${alive})`;
      if (alive > .95) note('alive again. for now.');
      redraw(); break;
    }
  };
  wrap.addEventListener('pointermove', revive);
  setTimeout(() => wrap.removeEventListener('pointermove', revive), 60000);
}

/* --------------------------------------------- 10g · finish my sentence */
function finishSentence() {
  openPanel('finish my sentence', (body) => {
    body.appendChild(noteEl('Write. The pen leaves your hand mid-word and lands in hers — you cannot take it back.'));
    const { box, c, x, fit } = miniCanvas(300);
    body.appendChild(box);
    const h = hint('start writing'); body.appendChild(h);
    let pts = [], handed = false, count = 0;
    const draw = (col) => {
      x.lineCap = x.lineJoin = 'round'; x.strokeStyle = col; x.lineWidth = 7;
      x.beginPath();
      pts.forEach((p, i) => i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y));
      x.stroke();
    };
    box.addEventListener('pointermove', (e) => {
      if (!e.buttons || handed) return;
      requestAnimationFrame(fit);
      const r = box.getBoundingClientRect();
      pts.push({ x: e.clientX - r.left, y: e.clientY - r.top });
      draw('var(--ink)');
      if (++count > 45) {
        handed = true;
        h.textContent = 'the pen is hers now';
        buzz([40, 60, 40]);
        log('pen handed over mid-word');
        let i = 0;
        const last = pts[pts.length - 1];
        const cont = setInterval(() => {
          if (!box.isConnected) return clearInterval(cont);
          const a = i / 26;
          pts.push({ x: last.x + a * 90 + Math.sin(a * 7) * 12, y: last.y + Math.sin(a * 5) * 22 });
          draw('var(--red)');
          if (++i > 26) { clearInterval(cont); h.textContent = 'she finished it.'; }
        }, 60);
      }
    });
  });
}

/* ----------------------------------------------- 10g · blind portrait */
function blindPortrait() {
  openPanel('blind portrait', (body) => {
    body.appendChild(noteEl('Draw each other without looking down. Sixty seconds. Neither of you sees anything until it’s over.'));
    const { box, c, x, fit } = miniCanvas(320);
    body.appendChild(box);
    const timer = el('<div class="p-stat">0:60</div>'); body.appendChild(timer);
    const h = hint('draw. you cannot see it.'); body.appendChild(h);
    let pts = [], left = 60, iv = null, over = false;
    const start = () => {
      if (iv) return;
      iv = setInterval(() => {
        if (!box.isConnected) return clearInterval(iv);
        left--; timer.textContent = '0:' + String(left).padStart(2, '0');
        if (left <= 0) { clearInterval(iv); reveal(); }
      }, 1000);
    };
    const reveal = () => {
      over = true;
      requestAnimationFrame(fit);
      x.clearRect(0, 0, box.clientWidth, box.clientHeight);
      x.lineCap = x.lineJoin = 'round'; x.lineWidth = 6;
      x.strokeStyle = TOK('--red'); x.beginPath();
      pts.forEach((p, i) => i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y)); x.stroke();
      // hers
      x.strokeStyle = TOK('--red'); x.beginPath();
      const w2 = box.clientWidth, h2 = box.clientHeight;
      SHAPES.sun.forEach(([px, py], i) => { const X = jit(px * w2, 9), Y = jit(py * h2, 9); i ? x.lineTo(X, Y) : x.moveTo(X, Y); });
      x.stroke();
      h.textContent = 'that’s you, apparently.';
      log('blind portrait revealed');
    };
    box.addEventListener('pointerdown', start);
    box.addEventListener('pointermove', (e) => {
      if (!e.buttons || over) return;
      const r = box.getBoundingClientRect();
      pts.push({ x: e.clientX - r.left, y: e.clientY - r.top });
      // invisible while drawing — only the faintest trace
      x.fillStyle = TOK('--surface');
      x.beginPath(); x.arc(e.clientX - r.left, e.clientY - r.top, 3, 0, 7); x.fill();
    });
    body.appendChild(ghostBtn('reveal now', reveal));
    return () => clearInterval(iv);
  });
}

/* --------------------------------------------------- 10g · whisper */
function whisper() {
  openPanel('whisper', (body) => {
    body.appendChild(noteEl('Draw it tiny. She has to zoom right in to read it — which means she has to want to.'));
    const { box, c, x, fit } = miniCanvas(320);
    body.appendChild(box);
    let zoom = 1;
    const h = hint('drawn small. pinch or press zoom.'); body.appendChild(h);
    const paint = () => {
      fit();   // synchronous: painting before the backing store is sized draws into nothing
      const w2 = box.clientWidth, h2 = box.clientHeight;
      x.setTransform(DPR, 0, 0, DPR, 0, 0);
      x.clearRect(0, 0, w2, h2);
      x.save();
      x.translate(w2 / 2, h2 / 2); x.scale(zoom, zoom); x.translate(-w2 / 2, -h2 / 2);
      x.lineCap = x.lineJoin = 'round'; x.strokeStyle = TOK('--red'); x.lineWidth = 1.4 / zoom * 3;
      x.beginPath();
      const sc = .07;
      SHAPES.heart.forEach(([px, py], i) => {
        const X = w2 / 2 + (px - .5) * w2 * sc, Y = h2 / 2 + (py - .5) * h2 * sc;
        i ? x.lineTo(jit(X, .6), jit(Y, .6)) : x.moveTo(X, Y);
      });
      x.stroke();
      x.restore();
    };
    requestAnimationFrame(paint);
    body.appendChild(ghostBtn('zoom in', () => { zoom = Math.min(14, zoom * 1.9); paint(); buzz(6);
      if (zoom > 6) h.textContent = 'it says: “still awake?”'; }));
    box.addEventListener('wheel', (e) => { e.preventDefault(); zoom = Math.max(1, Math.min(14, zoom * (e.deltaY < 0 ? 1.15 : .87))); paint(); });
  });
}

/* -------------------------------------------------- 10g · come here */
function comeHere() {
  api.closeSheet();
  toast('sent. one button, no text.');
  log('COME HERE sent');
  buzz([50, 60, 50, 60, 120]);
  const { wrap } = canvas();
  wrap.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' },
    { transform: 'translateX(9px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(0)' }],
    { duration: 620, easing: 'ease-in-out' });
  note('her whole phone just leaned toward you');
  sara.after(3400, () => { note(''); sara.drawShape('come', { c: 'red' }); });
}

/* --------------------------------------------- 2g · gesture onboarding */
function gestures() {
  openPanel('how it feels', (body) => {
    body.appendChild(noteEl('Five things your fingers can do. You’ll forget four.'));
    const rows = [
      ['just draw', 'their screen has it in under 300ms', 'pencil'],
      ['tap the heart', 'press at the same second and it erupts', 'heart-fill'],
      ['hold to reveal', 'invisible ink shows only while you press', 'eye'],
      ['two fingers, swipe back', 'undo without looking down', 'undo'],
      ['long-press the wordmark', 'settings hide there, on purpose', 'pencil'],
    ];
    for (const [t, d, i] of rows) {
      body.appendChild(el(`<div style="display:flex;align-items:center;gap:14px;padding:13px 14px;border-radius:18px;background:var(--surface);border:1px solid var(--hairline)">
        <svg class="ts-i" style="font-size:22px;color:#ff8a94"><use href="#i-${i}"/></svg>
        <span><b style="display:block;font-size:14.5px">${t}</b><i style="display:block;font-style:normal;font-size:12px;color:var(--ink-3);margin-top:2px">${d}</i></span></div>`));
    }
    body.appendChild(hint('nothing else to learn.'));
    body.appendChild(cta('Draw something', () => { api.closePanel(); note('draw how today feels'); setTimeout(() => note(''), 4000); }));
  });
}

/* ------------------------------------------- 7d · happy birthday banner */
function bannerDay() {
  api.closeSheet();
  note('');
  toast('it’s her day — her banner is already here');
  log('marked-day banner drawing itself');
  const { W, H } = canvas();
  const letters = [
    [[.12,.42],[.12,.24],[.12,.33],[.20,.33],[.20,.24],[.20,.42]],   // H
    [[.26,.42],[.26,.26],[.32,.26],[.32,.33],[.26,.33]],             // B-ish
    [[.38,.26],[.38,.42]], [[.44,.42],[.48,.26],[.52,.42]],
    [[.58,.26],[.58,.42],[.64,.42]], [[.70,.26],[.70,.42]],
  ];
  letters.forEach((L, i) => {
    sara.after(400 + i * 520, () => {
      strokes.add({ pts: wobblePath(L, 3, 4), c: 'amber', w: 8, brush: 'pen', who: 'sara', born: now() });
      buzz(10);
    });
  });
  sara.after(400 + letters.length * 520 + 400, () => {
    strokes.add({ pts: wobblePath(SHAPES.heart.map(([x, y]) => [x * .5 + .3, y * .5 + .35]), 3, 5), c: 'red', w: 9, brush: 'pen', who: 'sara', born: now() });
    note('drawn two days ago. sealed until 00:00.');
    setTimeout(() => note(''), 5000);
  });
}

/* ------------------------------------------------ 7e · calendar extras */
function calendarExtras() {
  openPanel('what the calendar does', (body) => {
    body.appendChild(noteEl('Built for two people and nobody else — no invites, no guest lists, no sharing outside the pair.'));
    const S = store.get('calSettings', {});
    const opts = [
      ['both-hands days', 'a day only counts when you’ve both drawn on it', 'bothHands'],
      ['the quiet nudge', 'a reminder that fires on her phone, not yours', 'nudge'],
      ['sealed until the morning', 'what you draw tonight lands at her sunrise', 'sealed'],
      ['two timezones, one day', 'her 14th and your 14th, held together', 'tz'],
      ['countdown on the lock screen', 'the number gets bigger as it gets closer', 'countdown'],
      ['gentle days', 'days we both agree to expect nothing', 'gentle'],
      ['this day last year', 'what you drew, surfaced at the same hour', 'lastYear'],
    ];
    for (const [t, d, k] of opts) {
      toggleRow(body, t, d, !!S[k], (on) => { S[k] = on; store.set('calSettings', S);
        if (on) toast(t + ' — on'); log('calendar: ' + k + '=' + on); });
    }
    body.appendChild(hint('nobody else will ever see this calendar.'));
  });
}

/* ------------------------------------------ 6a · twenty-five ways */
function signVariants() {
  openPanel('“i’m outside”', (body) => {
    body.appendChild(noteEl('Twenty-five marks people invented for the same thing. Every one is a count, never a drawing — the app knows how many, never what.'));
    const grid = el('<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px"></div>');
    const counts = [4180, 2204, 1877, 1290, 998, 861, 744, 690, 612, 540, 498, 441, 402, 377, 340, 311];
    for (let i = 0; i < 16; i++) {
      const cell = el(`<div style="position:relative;aspect-ratio:1;border-radius:12px;background:var(--surface);border:1px solid var(--surface);overflow:hidden"></div>`);
      const cc = document.createElement('canvas');
      cc.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
      cell.appendChild(cc);
      cell.appendChild(el(`<div style="position:absolute;left:5px;bottom:3px;font:700 8.5px ui-monospace,monospace;color:var(--ink-3)">${counts[i].toLocaleString()}</div>`));
      grid.appendChild(cell);
      requestAnimationFrame(() => {
        cc.width = cell.clientWidth * DPR; cc.height = cell.clientHeight * DPR;
        const cx = cc.getContext('2d'); cx.setTransform(DPR, 0, 0, DPR, 0, 0);
        cx.lineCap = cx.lineJoin = 'round'; cx.strokeStyle = [TOK('--red'), TOK('--amber'), TOK('--violet'), TOK('--ink')][i % 4]; cx.lineWidth = 4;
        const w2 = cell.clientWidth, h2 = cell.clientHeight;
        // each variant is a different crude "here" arrow/corner
        const forms = [[[.3,.7],[.3,.35],[.7,.35]], [[.25,.5],[.7,.5],[.55,.35]], [[.3,.3],[.7,.7]],
          [[.3,.65],[.5,.35],[.7,.65]], [[.3,.5],[.7,.5]], [[.35,.7],[.35,.3],[.65,.5],[.35,.55]]];
        const f = forms[i % forms.length];
        cx.beginPath(); f.forEach(([px, py], j) => { const X = jit(px * w2, 3), Y = jit(py * h2, 3); j ? cx.lineTo(X, Y) : cx.moveTo(X, Y); }); cx.stroke();
      });
    }
    body.appendChild(grid);
    body.appendChild(hint('4,180 people invented the same corner.'));
  });
}

/* ------------------------------------------------- 6b · weather report */
function weatherReport() {
  openPanel('the weather report', (body) => {
    body.appendChild(noteEl('What the whole app felt like this week — in counts. No drawing ever leaves a phone to make this.'));
    const rows = [
      ['hearts sent', '1.42M', 'var(--red)'], ['drawings that arrived after midnight', '318,904', 'var(--red)'],
      ['“come here”', '92,410', 'var(--amber)'], ['apologies, drawn not typed', '11,208', 'var(--violet)'],
      ['capsules sealed', '4,116', 'var(--ink)'], ['couples who drew every day', '61,330', 'var(--red)'],
    ];
    for (const [t, n, c] of rows) {
      body.appendChild(el(`<div style="display:flex;align-items:baseline;justify-content:space-between;gap:14px;padding:11px 2px;border-bottom:1px solid var(--surface)">
        <span style="font-size:13px;color:var(--ink-2)">${t}</span>
        <b style="font:700 17px ui-monospace,Menlo,monospace;color:${c};font-variant-numeric:tabular-nums">${n}</b></div>`));
    }
    body.appendChild(hint('this week, everyone was up late.'));
    body.appendChild(ghostBtn('post the weather', () => { toast('posted — counts only, never a drawing'); log('weather report posted'); }));
  });
}

/* ---------------------------------------------------- 6f · riso print */
function risoPrint() {
  openPanel('printed and posted', (body) => {
    body.appendChild(noteEl('At twelve months, the year’s marks come back as a real risograph print — the only copy, mailed. Two colours, one edition.'));
    const sheet = el(`<div style="border-radius:14px;background:#f4ece0;padding:20px 18px;color:var(--ground-alt);box-shadow:0 18px 40px var(--scrim)">
      <div style="font:700 9px ui-monospace,monospace;letter-spacing:.14em;color:rgba(43,32,41,.55)">AUG 2025 — AUG 2026 · EDITION OF ONE</div></div>`);
    const grid = el('<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:16px"></div>');
    sheet.appendChild(grid);
    for (let i = 0; i < 12; i++) {
      const cc = document.createElement('canvas');
      cc.style.cssText = 'width:100%;aspect-ratio:1';
      grid.appendChild(cc);
      requestAnimationFrame(() => {
        cc.width = cc.clientWidth * DPR; cc.height = cc.clientWidth * DPR;
        const cx = cc.getContext('2d'); cx.setTransform(DPR, 0, 0, DPR, 0, 0);
        const s2 = cc.clientWidth;
        cx.lineCap = cx.lineJoin = 'round';
        cx.strokeStyle = i % 3 ? TOK('--red') : '#1d3f8f'; cx.lineWidth = 4;
        const shape = [SHAPES.heart, SHAPES.sun, SHAPES.squiggle, SHAPES.come, SHAPES.xo][i % 5];
        cx.beginPath();
        shape.forEach(([px, py], j) => { const X = jit((px - .2) * s2 * 1.3, 2), Y = jit((py - .15) * s2 * 1.3, 2); j ? cx.lineTo(X, Y) : cx.moveTo(X, Y); });
        cx.stroke();
      });
    }
    sheet.appendChild(el('<div style="margin-top:16px;font-family:Caveat,cursive;font-weight:700;font-size:24px">one year of us</div>'));
    body.appendChild(sheet);
    body.appendChild(cta('post it to us', () => { toast('one copy. no reprints, ever.'); log('riso print ordered'); }));
  });
}

/* ------------------------------------------------ 1c · replay, exported */
function replayExport() {
  openPanel('post the replay', (body) => {
    body.appendChild(noteEl('The growth loop is the drawing arriving, not a flat PNG. Scrub to the moment it lands, then export.'));
    const { box, c, x, fit } = miniCanvas(300);
    body.appendChild(box);
    const mine = strokes.all().filter(s => s.who !== 'fx');
    const total = mine.reduce((n, s) => n + s.pts.length, 0) || 1;
    const sliderWrap = el('<div style="display:flex;gap:5px;align-items:center"></div>');
    const range = el('<input type="range" min="0" max="100" value="100" style="flex:1;accent-color:var(--red)">');
    sliderWrap.appendChild(range);
    body.appendChild(sliderWrap);
    const tl = el('<div style="display:flex;justify-content:space-between;font:11px ui-monospace,monospace;color:var(--ink-3)"><span>first stroke</span><span>6.0s</span></div>');
    body.appendChild(tl);
    const paint = () => {
      requestAnimationFrame(fit);
      const w2 = box.clientWidth, h2 = box.clientHeight;
      const { W, H } = canvas();
      x.clearRect(0, 0, w2, h2);
      const g = x.createLinearGradient(0, 0, 0, h2);
      g.addColorStop(0, '#2a3a63'); g.addColorStop(1, '#ffd9a0');
      x.fillStyle = g; x.fillRect(0, 0, w2, h2);
      const k = Math.min(w2 / W, h2 / H);
      x.save(); x.translate((w2 - W * k) / 2, (h2 - H * k) / 2); x.scale(k, k);
      let budget = Math.round(total * range.value / 100);
      x.lineCap = x.lineJoin = 'round';
      for (const s of mine) {
        if (budget <= 0) break;
        const n = Math.min(s.pts.length, budget); budget -= n;
        x.strokeStyle = s.c; x.lineWidth = s.w; x.beginPath();
        for (let i = 0; i < n; i++) i ? x.lineTo(s.pts[i].x, s.pts[i].y) : x.moveTo(s.pts[i].x, s.pts[i].y);
        x.stroke();
      }
      x.restore();
    };
    range.addEventListener('input', paint);
    paint();
    if (!mine.length) body.appendChild(hint('draw something first, then come back'));
    body.appendChild(cta('save this frame', () => {
      const a = document.createElement('a');
      a.href = c.toDataURL('image/png'); a.download = 'trace-replay-frame.png'; a.click();
      toast('exported'); log('replay frame exported');
    }));
  });
}

/* ------------------------------------------------------------ register */
return [
  { g: 'more contact' },
  { id: 'palm', n: 'Palm to palm', d: 'actual size — hers 17.2, yours 19.8', i: 'heart', run: palmToPalm },
  { id: 'fog', n: 'Fogged glass', d: 'wipe from both sides, meet in the middle', i: 'eye', run: fogged },
  { id: 'thumb', n: 'Thumbprint smudges', d: 'it never quite wipes clean of her', i: 'pencil', run: thumbprint },
  { id: 'hr', n: 'My heart rate, right now', d: 'a pulse she feels, live', i: 'heart-fill', run: heartRate },
  { id: 'alive', n: 'Keep it alive', d: 'her drawing dies unless you trace it', i: 'sparkles', run: keepAlive },
  { id: 'finish', n: 'Finish my sentence', d: 'the pen leaves your hand mid-word', i: 'pen-line', run: finishSentence },
  { id: 'blind', n: 'Blind portrait', d: 'sixty seconds, no looking down', i: 'ghost', run: blindPortrait },
  { id: 'whisper', n: 'Whisper', d: 'drawn tiny — she has to want to read it', i: 'message', run: whisper },
  { id: 'comehere', n: 'Come here', d: 'one button. no text.', i: 'zap', run: comeHere },

  { g: 'more days' },
  { id: 'banner', n: 'Happy birthday, drawn on', d: 'her banner is already on the canvas', i: 'gift', run: bannerDay },
  { id: 'calx', n: 'What the calendar does', d: 'eight things, for two people only', i: 'bookmark', run: calendarExtras },

  { g: 'more world' },
  { id: 'signs', n: '“i’m outside”', d: 'twenty-five marks, counts only', i: 'coin', run: signVariants },
  { id: 'weather', n: 'The weather report', d: 'what the app felt like this week', i: 'sunrise', run: weatherReport },
  { id: 'riso', n: 'Printed and posted', d: 'the year, risographed, edition of one', i: 'camera', run: risoPrint },

  { g: 'more sharing' },
  { id: 'replayx', n: 'Post the replay', d: 'scrub to the moment it lands', i: 'play', run: replayExport },
  { id: 'gestures', n: 'How it feels', d: 'the five gestures, taught once', i: 'sparkles', run: gestures },
];
};
