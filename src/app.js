/* trace — app simulation.
   A working, single-file Trace: real ink, a simulated partner, and every
   feature from the ten design turns functional in-browser. This file is the
   behavioral spec for the production React Native build. */
(() => {
'use strict';

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const store = {
  get: (k, d) => { try { const v = JSON.parse(localStorage.getItem('trace:' + k)); return v === null ? d : v; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem('trace:' + k, JSON.stringify(v)); } catch {} },
};
const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch {} };
const now = () => performance.now();

let toastT;
function toast(msg, ms = 2200) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms);
}
function log(msg) {
  const l = $('#sim-log'); if (!l) return;
  const d = document.createElement('div'); d.textContent = msg;
  l.appendChild(d); l.scrollTop = l.scrollHeight;
}

/* ================================================================ ink */

const wrap = $('#canvas-wrap');
const cv = $('#ink');
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = Math.min(2, devicePixelRatio || 1);

function sizeCanvas() {
  if (!wrap.clientWidth) return;   // view hidden — keep the ink and its size
  W = wrap.clientWidth; H = wrap.clientHeight;
  cv.width = W * DPR; cv.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  redraw();
}

// stroke: {pts:[{x,y,t}], c, w, brush, who, born}
let strokes = [];
let fadeTimers = [];

const BRUSH_DEFAULTS = {
  pen:    { size: 9,  alpha: 1,   taper: true  },
  spark:  { size: 8,  alpha: 1,   taper: false },
  zap:    { size: 7,  alpha: 1,   taper: false },
  marker: { size: 16, alpha: .88, taper: false },
  hi:     { size: 17, alpha: .38, taper: false },
  ghost:  { size: 9,  alpha: 1,   taper: true  },
  eraser: { size: 18, alpha: 1,   taper: false },
};
const brushCfg = Object.assign({}, BRUSH_DEFAULTS, store.get('brushCfg', {}));
const saveBrushCfg = () => store.set('brushCfg', brushCfg);

const state = {
  brush: 'pen', color: '#FFB020',
  mode: null,            // null | mirror | trace | passpen | onemore...
  bothHere: false,
  penHolder: 'you',
  traceGuide: null, traceHits: 0,
};

function drawStroke(s, upTo = Infinity, alpha = 1) {
  const pts = s.pts; if (pts.length < 2) return;
  const boost = state.bothHere ? 1.35 : 1;
  ctx.save();
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.globalAlpha = alpha * (s.alpha !== undefined ? s.alpha : 1);
  ctx.strokeStyle = s.c;
  if (s.brush === 'eraser') { ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = 1; }
  if (s.brush === 'spark') { ctx.shadowColor = s.c; ctx.shadowBlur = 10; }
  const n = Math.min(pts.length, upTo);

  if (s.taper && s.brush !== 'zap' && s.brush !== 'hi' && s.brush !== 'eraser') {
    // velocity-tapered ink: fast segments thin out, ends breathe — this is
    // what makes a line read as drawn by a hand instead of plotted
    for (let i = 1; i < n; i++) {
      const a = pts[i - 1], b = pts[i];
      const v = Math.min(1, Math.hypot(b.x - a.x, b.y - a.y) / 26);
      const end = Math.min(1, (n - i) / 6) * Math.min(1, i / 4);
      const pr = b.pr !== undefined ? b.pr : 1;   // stylus pressure rides on top
      ctx.lineWidth = Math.max(1.2, s.w * boost * pr * (1 - v * .55) * (.55 + .45 * end));
      ctx.beginPath();
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (i === 1) { ctx.moveTo(a.x, a.y); ctx.lineTo(mx, my); }
      else {
        const p0 = pts[i - 2];
        ctx.moveTo((p0.x + a.x) / 2, (p0.y + a.y) / 2);
        ctx.quadraticCurveTo(a.x, a.y, mx, my);
      }
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  ctx.lineWidth = s.w * boost;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  if (s.brush === 'zap') {
    for (let i = 1; i < n; i += 2) ctx.lineTo(pts[i].x, pts[i].y);
  } else {
    for (let i = 1; i < n - 1; i++) {
      const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    if (n > 1) ctx.lineTo(pts[n - 1].x, pts[n - 1].y);
  }
  ctx.stroke();
  ctx.restore();
}

function redraw() {
  ctx.clearRect(0, 0, W, H);
  if (state.traceGuide) drawStroke(state.traceGuide, Infinity, .16);
  const t = now();
  for (const s of strokes) {
    let a = 1;
    if (s.brush === 'ghost') {
      const age = (t - s.born) / 1000;
      a = holdReveal ? .95 : Math.max(0, 1 - age / 2.6);
      if (a <= 0) continue;
    }
    drawStroke(s, Infinity, a);
    if (s.mirror) {
      ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1);
      drawStroke(s, Infinity, a * .92); ctx.restore();
    }
  }
}

let holdReveal = false;

/* wobble helpers — nothing in trace is a perfect shape */
const jit = (v, j) => v + (Math.random() - .5) * j;
function wobblePath(base, j = 3, steps = 4) {
  // base: array of [x,y] anchors in 0..1 space → dense jittered points
  const pts = [];
  for (let i = 0; i < base.length - 1; i++) {
    const [ax, ay] = base[i], [bx, by] = base[i + 1];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      pts.push({ x: jit((ax + (bx - ax) * t) * W, j), y: jit((ay + (by - ay) * t) * H, j) });
    }
  }
  const [lx, ly] = base[base.length - 1];
  pts.push({ x: jit(lx * W, j), y: jit(ly * H, j) });
  return pts;
}
const SHAPES = {
  heart: [[.5,.62],[.42,.55],[.36,.44],[.40,.36],[.47,.37],[.5,.44],[.53,.36],[.61,.35],[.65,.44],[.6,.55],[.5,.63]],
  sun: [[.5,.32],[.44,.34],[.4,.4],[.4,.48],[.45,.54],[.53,.55],[.6,.5],[.61,.42],[.56,.35],[.5,.33]],
  squiggle: [[.2,.5],[.3,.42],[.4,.55],[.5,.44],[.6,.56],[.7,.45],[.8,.52]],
  xo: [[.35,.42],[.45,.56],[.4,.49],[.45,.42],[.35,.56]],
  come: [[.25,.55],[.4,.45],[.55,.55],[.7,.47],[.72,.45],[.68,.42],[.72,.47],[.68,.52]],
};
SHAPES.heartL = [[.5,.62],[.42,.55],[.36,.44],[.40,.36],[.47,.37],[.5,.44]];

/* ================================================================ input */

let cur = null;
let touching = { on: false };  // 10a state

let smooth = null;                 // EMA of pointer samples — the jitter filter
const SMOOTH = .42;                // lower = silkier, higher = snappier

wrap.addEventListener('pointerdown', (e) => {
  if (state.mode === 'passpen' && state.penHolder !== 'you') { toast("she has the pen"); return; }
  try { wrap.setPointerCapture(e.pointerId); } catch {}
  const p = pos(e);
  smooth = { ...p };
  if (featureHooks.down && featureHooks.down(p)) return;
  const cfg = brushCfg[state.brush] || BRUSH_DEFAULTS.pen;
  cur = { pts: [{ ...p, t: now(), pr: pressure(e) }], c: state.color, w: cfg.size, alpha: cfg.alpha, taper: cfg.taper, brush: state.brush, who: 'you', born: now(), mirror: state.mode === 'mirror' };
  cur.id = Math.random().toString(36).slice(2, 9);
  strokes.push(cur);
  window.TRACE_NET && TRACE_NET.emit('sb', { id: cur.id, c: cur.c, w: cur.w, alpha: cur.alpha, taper: cur.taper, brush: cur.brush, mirror: cur.mirror });
});
wrap.addEventListener('pointermove', (e) => {
  let p = pos(e);
  if (featureHooks.move && featureHooks.move(p, e)) return;
  if (!cur) return;
  if (smooth) {
    smooth = { x: smooth.x + (p.x - smooth.x) * SMOOTH, y: smooth.y + (p.y - smooth.y) * SMOOTH };
    p = { x: smooth.x, y: smooth.y };
  }
  const lp = cur.pts[cur.pts.length - 1];
  if (Math.hypot(p.x - lp.x, p.y - lp.y) < 1.6) return;
  const pr = pressure(e);
  cur.pts.push({ ...p, t: now(), pr });
  window.TRACE_NET && TRACE_NET.emit('sp', { id: cur.id, pt: [+(p.x / W).toFixed(4), +(p.y / H).toFixed(4), pr === 1 ? 1 : +pr.toFixed(2)] });
  if (state.traceGuide) scoreTrace(p);
  redraw();
});
const up = (e) => {
  if (featureHooks.up && featureHooks.up()) { cur = null; return; }
  if (cur && cur.pts.length > 3) {
    onYouDrew(cur);
  } else if (cur) strokes.pop();
  cur = null; redraw();
};
wrap.addEventListener('pointerup', up);
wrap.addEventListener('pointercancel', up);

function pos(e) {
  const r = wrap.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
/* real stylus pressure when the hardware reports it (Pencil, S-Pen);
   fingers and mice report a flat .5/0 — those stay 1 so nothing changes */
function pressure(e) {
  if (e.pointerType === 'pen' && e.pressure > 0) return Math.max(.15, Math.min(1, e.pressure * 1.5));
  return 1;
}
function brushWidth() { return (brushCfg[state.brush] || BRUSH_DEFAULTS.pen).size; }

let featureHooks = {};

function onYouDrew(s) {
  store.set('lastDrawn', Date.now());
  lastInkAt = Date.now();
  window.TRACE_NET && TRACE_NET.emit('se', { id: s.id });
  if (window.TRACE_NET && TRACE_NET.live()) return;   // a real person answers now
  if (state.mode === 'passpen') {
    state.penHolder = 'sara';
    $('#presence-txt').textContent = 'Sara has the pen';
    sara.after(1400, () => sara.drawShape('squiggle', { then: () => {
      state.penHolder = 'you'; $('#presence-txt').textContent = 'with Sara';
      toast('the pen is yours');
    }}));
  } else if (state.mode === 'mirror') {
    // she finishes her half sometimes
    if (Math.random() < .5) sara.after(1600, () => sara.drawShape('heartL', { mirror: true }));
  } else if (!state.mode && Math.random() < .45) {
    sara.after(2200 + Math.random() * 2600, () => sara.reply());
  }
}

/* ================================================================ sara */

const ghostEl = $('#ghost-finger');
let drawingNow = false;   // is the other side inking right now
const sara = {
  timers: [],
  after(ms, fn) { this.timers.push(setTimeout(fn, ms)); },
  clear() { this.timers.forEach(clearTimeout); this.timers = []; },
  presence(on) {
    drawingNow = !!on;
    $('#presence').classList.toggle('live', on);
    $('#presence-txt').textContent = on ? 'Maya is drawing' : 'Maya is here';
    $('#presence-dot').style.background = on ? '#FF7BC5' : '#4ADE80';
    const tag = $('#canvas-tag'); if (tag) tag.classList.toggle('on', !!on);
    window.TRACE_BOARD && TRACE_BOARD.paint && TRACE_BOARD.paint();
  },
  finger(x, y, show) {
    ghostEl.style.left = x + 'px'; ghostEl.style.top = y + 'px';
    ghostEl.style.opacity = show ? 1 : 0;
  },
  drawShape(name, opts = {}) {
    const base = SHAPES[name] || SHAPES.squiggle;
    const pts = wobblePath(base, 4, 5);
    const s = { pts: [], c: opts.c || '#ff7a9c', w: opts.w || 9, brush: 'pen', who: 'sara', born: now(), mirror: !!opts.mirror };
    strokes.push(s);
    this.presence(true);
    log('sara draws ' + name);
    let i = 0;
    const speed = opts.speed || 24;
    const step = () => {
      if (i < pts.length) {
        s.pts.push({ ...pts[i], t: now() });
        this.finger(pts[i].x, pts[i].y, true);
        redraw(); i++;
        // her hesitations are part of it
        const pause = Math.random() < .04 ? 420 : speed;
        this.timers.push(setTimeout(step, pause));
      } else {
        this.presence(false); this.finger(0, 0, false);
        buzz(18);
        opts.then && opts.then();
      }
    };
    step();
  },
  reply() {
    const pick = ['heart', 'sun', 'xo', 'come', 'squiggle'][Math.floor(Math.random() * 5)];
    this.drawShape(pick);
  },
  heartbeat() {
    log('sara sends a heartbeat');
    heartArrive('sara');
  },
  openCanvas() { enterBothHere(); },
  tug() { stringTug('sara'); },
};

/* ============================================================ heartbeat */

let yourHeartAt = 0, saraHeartAt = 0;
$('#heart-btn').addEventListener('click', () => {
  yourHeartAt = now();
  heartBloom(W * .5, H * .55, '#e23343');
  buzz(24);
  window.TRACE_NET && TRACE_NET.emit('heart', {});
  if (now() - saraHeartAt < 3000) erupt();
  else if (!(window.TRACE_NET && TRACE_NET.live())) {
    $('#heart-btn').classList.add('armed');
    sara.after(1200 + Math.random() * 2200, () => sara.heartbeat());
  } else $('#heart-btn').classList.add('armed');
});
function heartArrive(who) {
  saraHeartAt = now();
  heartBloom(W * .5, H * .45, '#ff7a9c');
  buzz([20, 60, 20]);
  if (now() - yourHeartAt < 3000) erupt();
}
function heartBloom(x, y, c) {
  const s = { pts: wobblePath(SHAPES.heart, 3, 5), c, w: 12, brush: 'pen', who: 'fx', born: now() };
  strokes.push(s); redraw();
  fadeTimers.push(setTimeout(() => { strokes = strokes.filter(k => k !== s); redraw(); }, 2600));
}
function erupt() {
  $('#heart-btn').classList.remove('armed');
  toast('you pressed at the same time');
  log('ERUPTION — same second');
  buzz([30, 40, 30, 40, 80]);
  const b = $('#bloom');
  b.style.left = W * .5 + 'px'; b.style.top = H * .5 + 'px'; b.style.opacity = 1;
  for (let i = 0; i < 7; i++) {
    const a = Math.random() * Math.PI * 2, d = .1 + Math.random() * .22;
    const cx = .5 + Math.cos(a) * d, cy = .5 + Math.sin(a) * d * .8;
    const mini = SHAPES.heart.map(([x, y]) => [cx + (x - .5) * .3, cy + (y - .5) * .3]);
    const s = { pts: wobblePath(mini, 2, 4), c: i % 2 ? '#ff7a9c' : '#e23343', w: 6, brush: 'pen', who: 'fx', born: now() };
    strokes.push(s);
  }
  redraw();
  fadeTimers.push(setTimeout(() => { strokes = strokes.filter(k => k.who !== 'fx'); $('#bloom').style.opacity = 0; redraw(); }, 3200));
}

/* ============================================================ dock wiring */

$$('#brushes .tool').forEach(b => b.addEventListener('click', () => {
  if (state.brush === b.dataset.brush && b.classList.contains('is-on')) { toggleBrushPop(); return; }
  closeBrushPop();
  $$('#brushes .tool').forEach(x => x.classList.toggle('is-on', x === b));
  state.brush = b.dataset.brush;
  if (state.brush === 'ghost') toast('invisible ink — it vanishes as it lands. hold ⦿ reveal in ⋯');
  if (state.brush === 'eraser') toast('eraser — lifts any ink, hers too. undo brings it back.');
  if (state.brush === 'hi') toast('highlighter — lay it over ink, it never covers');
}));

/* brush options — tap the active tool again (thickness, opacity, taper) */
let popEl = null;
function closeBrushPop() { if (popEl) { popEl.remove(); popEl = null; } }
function toggleBrushPop() {
  if (popEl) return closeBrushPop();
  const cfg = brushCfg[state.brush];
  const isEraser = state.brush === 'eraser';
  const isHi = state.brush === 'hi';
  popEl = document.createElement('div');
  popEl.id = 'brushpop';
  popEl.innerHTML = `
    <div class="bp-row">
      <canvas class="bp-prev" width="120" height="40"></canvas>
    </div>
    <div class="bp-row"><span>size</span>
      <button class="bp-quick" data-s="5">fine</button>
      <button class="bp-quick" data-s="9">med</button>
      <button class="bp-quick" data-s="16">bold</button>
    </div>
    <div class="bp-row"><span></span>
      <input class="bp-size" type="range" min="3" max="26" step="1" value="${cfg.size}">
      <b class="bp-sizen">${cfg.size}</b></div>
    <div class="bp-row"${isEraser ? ' hidden' : ''}><span>ink</span>
      <input class="bp-alpha" type="range" min="20" max="100" step="5" value="${Math.round(cfg.alpha * 100)}">
      <b class="bp-alphan">${Math.round(cfg.alpha * 100)}%</b></div>
    <button ${isEraser || isHi ? 'hidden ' : ''}class="bp-taper${cfg.taper ? ' on' : ''}">${cfg.taper ? 'taper on — ends breathe' : 'taper off — even line'}</button>`;
  $('#dock').before(popEl);
  const prev = popEl.querySelector('.bp-prev').getContext('2d');
  const paintPrev = () => {
    prev.clearRect(0, 0, 120, 40);
    const fake = { pts: [], c: state.color, w: cfg.size * .8, alpha: cfg.alpha, taper: cfg.taper, brush: state.brush };
    for (let i = 0; i <= 20; i++) fake.pts.push({ x: 8 + i * 5.2, y: 20 + Math.sin(i / 2.6) * 9 });
    const save = { ctx: null };
    // draw with the same routine on the preview context
    const realCtx = ctx; const swap = Object.getOwnPropertyDescriptor(window, 'noop');
    prev.save(); prev.lineCap = prev.lineJoin = 'round';
    prev.globalAlpha = isEraser ? .5 : cfg.alpha;
    prev.strokeStyle = isEraser ? 'rgba(243,240,244,.6)' : state.color;
    if (isEraser) prev.setLineDash([2, 7]);
    if (cfg.taper) {
      const pts = fake.pts;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b2 = pts[i];
        const end = Math.min(1, (pts.length - i) / 6) * Math.min(1, i / 4);
        prev.lineWidth = Math.max(1, fake.w * (.55 + .45 * end));
        prev.beginPath(); prev.moveTo(a.x, a.y); prev.lineTo(b2.x, b2.y); prev.stroke();
      }
    } else {
      prev.lineWidth = fake.w; prev.beginPath();
      fake.pts.forEach((p, i) => i ? prev.lineTo(p.x, p.y) : prev.moveTo(p.x, p.y));
      prev.stroke();
    }
    prev.restore();
  };
  paintPrev();
  popEl.querySelectorAll('.bp-quick').forEach((q) => q.addEventListener('click', () => {
    cfg.size = +q.dataset.s;
    popEl.querySelector('.bp-size').value = cfg.size;
    popEl.querySelector('.bp-sizen').textContent = cfg.size;
    saveBrushCfg(); paintPrev(); buzz(6);
  }));
  popEl.querySelector('.bp-size').addEventListener('input', (e) => {
    cfg.size = +e.target.value; popEl.querySelector('.bp-sizen').textContent = cfg.size; saveBrushCfg(); paintPrev();
  });
  popEl.querySelector('.bp-alpha').addEventListener('input', (e) => {
    cfg.alpha = e.target.value / 100; popEl.querySelector('.bp-alphan').textContent = e.target.value + '%'; saveBrushCfg(); paintPrev();
  });
  popEl.querySelector('.bp-taper').addEventListener('click', (e) => {
    cfg.taper = !cfg.taper;
    e.target.classList.toggle('on', cfg.taper);
    e.target.textContent = cfg.taper ? 'taper on — ends breathe' : 'taper off — even line';
    saveBrushCfg(); paintPrev(); buzz(8);
  });
}
wrap.addEventListener('pointerdown', closeBrushPop);
$$('.swatch').forEach(b => { if (b.id === 'swatch-any') return; b.addEventListener('click', () => {
  closeColorPop();
  $$('.swatch').forEach(x => x.classList.toggle('is-on', x === b));
  state.color = b.dataset.c;
}); });

/* ---- the universal color cascade: any hue, any shade, three taps ---- */
const hsl2hex = (h, sN, l) => {
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - (sN / 100) * Math.min(l / 100, 1 - l / 100) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return ('#' + f(0) + f(8) + f(4)).toUpperCase();
};
const anyBtn = $('#swatch-any');
let colorPop = null, cpHue = store.get('cpHue', 24);
const recentColors = store.get('recentColors', []);
function rememberColor(c) {
  const i = recentColors.indexOf(c);
  if (i >= 0) recentColors.splice(i, 1);
  recentColors.unshift(c);
  recentColors.length = Math.min(recentColors.length, 8);
  store.set('recentColors', recentColors);
}
function pickCustom(c) {
  state.color = c;
  anyBtn.style.setProperty('--picked', c);
  $$('.swatch').forEach(x => x.classList.toggle('is-on', x === anyBtn));
  rememberColor(c);
}
function closeColorPop() { if (colorPop) { colorPop.remove(); colorPop = null; } }
function openColorPop() {
  closeBrushPop(); closeColorPop();
  colorPop = document.createElement('div');
  colorPop.id = 'colorpop';
  colorPop.innerHTML = `
    <div class="cp-head">
      <div class="cp-chip"></div>
      <input class="cp-hex" maxlength="7" spellcheck="false">
      <button class="cp-ok">Use it</button>
    </div>
    <input class="cp-hue" type="range" min="0" max="359" step="1" value="${cpHue}">
    <div class="cp-label">every shade of this hue</div>
    <div class="cp-grid"></div>
    <div class="cp-label" ${recentColors.length ? '' : 'hidden'}>yours, lately</div>
    <div class="cp-recent"></div>`;
  $('#dock').before(colorPop);
  const chip = colorPop.querySelector('.cp-chip');
  const hex = colorPop.querySelector('.cp-hex');
  const grid = colorPop.querySelector('.cp-grid');
  let sel = state.color;
  const setSel = (c) => { sel = c.toUpperCase(); chip.style.background = sel; hex.value = sel; };
  const cascade = () => {
    grid.innerHTML = '';
    // a true cascade: rows step lightness, columns sweep saturation from
    // muted to vivid — with the hue slider this reaches any color worth having
    for (const light of [86, 71, 58, 44]) for (let c2 = 0; c2 < 8; c2++) {
      const col = hsl2hex(cpHue, 22 + c2 * 11, light - c2 * 1.5);
      const btn = document.createElement('button');
      btn.style.background = col;
      btn.addEventListener('click', () => {
        setSel(col);
        grid.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === btn));
        buzz(6);
      });
      grid.appendChild(btn);
    }
    for (let g = 0; g < 8; g++) {
      const col = hsl2hex(0, 0, 4 + g * 13.5);
      const btn = document.createElement('button');
      btn.style.background = col;
      btn.addEventListener('click', () => {
        setSel(col);
        grid.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === btn));
        buzz(6);
      });
      grid.appendChild(btn);
    }
  };
  cascade(); setSel(sel);
  colorPop.querySelector('.cp-hue').addEventListener('input', (e) => {
    cpHue = +e.target.value; store.set('cpHue', cpHue); cascade();
    setSel(hsl2hex(cpHue, 88, 60));
  });
  hex.addEventListener('input', () => {
    let v = hex.value.trim().replace(/^([0-9a-f]{6})$/i, '#$1');
    if (/^#[0-9a-f]{6}$/i.test(v)) chip.style.background = sel = v.toUpperCase();
  });
  const recent = colorPop.querySelector('.cp-recent');
  recentColors.forEach((c) => {
    const b2 = document.createElement('button');
    b2.style.background = c;
    b2.addEventListener('click', () => { pickCustom(c); closeColorPop(); toast(c + ' — yours again'); });
    recent.appendChild(b2);
  });
  colorPop.querySelector('.cp-ok').addEventListener('click', () => {
    pickCustom(sel); closeColorPop(); buzz(10);
  });
}
anyBtn.addEventListener('click', () => (colorPop ? closeColorPop() : openColorPop()));
wrap.addEventListener('pointerdown', closeColorPop);
/* fixed swatches remember themselves too — the cascade's recent row is universal */
$$('.swatch').forEach(b => { if (b.dataset.c) b.addEventListener('click', () => rememberColor(b.dataset.c)); });
$('#undo-btn').addEventListener('click', () => {
  for (let i = strokes.length - 1; i >= 0; i--) {
    if (strokes[i].who === 'you') { strokes.splice(i, 1); redraw(); return; }
  }
});

// the streak pill is The Thread's door — days of you two, never a breakable run
const sp = $('#streakpill');
if (sp) sp.addEventListener('click', () => openFeature('thread'));

// long-press wordmark → settings/guardrails (the hidden door, as designed)
let wmT;
$('#wordmark').addEventListener('pointerdown', () => { wmT = setTimeout(() => openFeature('guardrails'), 650); });
$('#wordmark').addEventListener('pointerup', () => clearTimeout(wmT));

/* ============================================================ both here */

let bothTimer = null, bothStart = 0;
function enterBothHere() {
  if (state.bothHere) return;
  state.bothHere = true;
  $('#sky').classList.add('warm');
  $('#canvas-note').textContent = '';
  toast('Sara opened the canvas — you’re both here', 3000);
  log('BOTH HERE begins · notifications off for both');
  buzz([15, 30, 15]);
  bothStart = now();
  const n = store.get('bothCount', 31) + 1; store.set('bothCount', n);
  bothTimer = setInterval(() => {
    const s = Math.floor((now() - bothStart) / 1000);
    $('#presence-txt').textContent = `both here · ${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    $('#presence').classList.add('live');
  }, 500);
  sara.after(20000 + Math.random() * 20000, leaveBothHere);
}
function leaveBothHere() {
  if (!state.bothHere) return;
  state.bothHere = false;
  clearInterval(bothTimer);
  $('#sky').classList.remove('warm');
  $('#presence').classList.remove('live');
  $('#presence-txt').textContent = 'with Sara';
  toast('she left. it keeps what you made.');
  log('both-here ends');
}

/* ============================================================ trace-over */

function scoreTrace(p) {
  const g = state.traceGuide; if (!g) return;
  for (const q of g.pts) if (Math.hypot(p.x - q.x, p.y - q.y) < 16) { state.traceHits++; break; }
}

/* ============================================================ the string */

function stringTug(who) {
  if (who === 'sara') { toast('she tugged. that’s the whole message.'); buzz([12, 40, 12]); log('sara tugs the string'); }
}

/* ================================================================ panel */

const panel = $('#panel'), ptitle = $('#panel-title'), paux = $('#panel-aux');
let pbody = $('#panel-body');
let panelTeardown = null;

function openPanel(title, build) {
  closePanel();
  ptitle.textContent = title; paux.textContent = '';
  // fresh body node every time — features attach listeners to it, and a
  // stale pointerdown from a previous feature must never fire in this one
  const fresh = pbody.cloneNode(false);
  pbody.replaceWith(fresh);
  pbody = fresh;
  panel.classList.remove('hidden');
  panelTeardown = build(pbody) || null;
}
function closePanel() {
  panel.classList.add('hidden');
  if (panelTeardown) { panelTeardown(); panelTeardown = null; }
}
$('#panel-close').addEventListener('click', closePanel);

// mini canvas helper for panel features
function miniCanvas(h = 340) {
  const box = document.createElement('div');
  box.className = 'p-canvas'; box.style.height = h + 'px';
  const c = document.createElement('canvas');
  box.appendChild(c);
  const x = c.getContext('2d');
  const fit = () => { c.width = box.clientWidth * DPR; c.height = box.clientHeight * DPR; x.setTransform(DPR, 0, 0, DPR, 0, 0); };
  requestAnimationFrame(fit);
  return { box, c, x, fit };
}
function playInto(x, box, shapes, opts = {}) {
  // draws a sequence of wobbled shapes with real pauses; returns stop()
  let stop = false, timers = [];
  const bw = () => box.clientWidth, bh = () => box.clientHeight;
  (async () => {
    for (const sh of shapes) {
      if (stop) return;
      const base = SHAPES[sh.shape] || SHAPES.squiggle;
      const pts = base.map(([px, py]) => ({ x: px * bw(), y: py * bh() }));
      const dense = [];
      for (let i = 0; i < pts.length - 1; i++)
        for (let s = 0; s < 5; s++) dense.push({
          x: jit(pts[i].x + (pts[i + 1].x - pts[i].x) * s / 5, 3),
          y: jit(pts[i].y + (pts[i + 1].y - pts[i].y) * s / 5, 3) });
      x.lineCap = x.lineJoin = 'round'; x.strokeStyle = sh.c || '#ff7a9c'; x.lineWidth = sh.w || 8;
      for (let i = 1; i < dense.length; i++) {
        if (stop || !box.isConnected) return;
        x.beginPath(); x.moveTo(dense[i - 1].x, dense[i - 1].y); x.lineTo(dense[i].x, dense[i].y); x.stroke();
        await new Promise(r => timers.push(setTimeout(r, sh.speed || 26)));
      }
      if (sh.pause) { opts.onPause && opts.onPause(sh.pause); await new Promise(r => timers.push(setTimeout(r, sh.pause))); }
    }
    opts.done && opts.done();
  })();
  return () => { stop = true; timers.forEach(clearTimeout); };
}

/* ============================================================= features */

const FEATURES = [
  { g: 'draw together' },
  { id: 'mirror', n: 'Mirror', d: 'your half appears on her side, flipped', i: 'mirror',
    run() { toggleMode('mirror'); $('#mirror-line').style.opacity = state.mode === 'mirror' ? 1 : 0;
      $('#canvas-note').textContent = state.mode === 'mirror' ? 'draw half of something' : ''; } },
  { id: 'traceover', n: 'Trace over mine', d: 'her stroke arrives faint — go over it', i: 'pencil',
    run() {
      toggleMode('trace');
      if (state.mode === 'trace') {
        state.traceGuide = { pts: wobblePath(SHAPES.heart, 3, 6), c: '#f3f0f4', w: 14, brush: 'pen' };
        state.traceHits = 0;
        $('#canvas-note').textContent = 'her line. put yours on top of it.';
      } else { state.traceGuide = null; $('#canvas-note').textContent = ''; }
      redraw();
    } },
  { id: 'passpen', n: 'Pass the pen', d: 'one pen between two people', i: 'pen-line',
    run() { toggleMode('passpen'); state.penHolder = 'you';
      $('#canvas-note').textContent = state.mode === 'passpen' ? 'one pen. draw, and it’s hers.' : ''; } },
  { id: 'scratch', n: 'Scratch-off arrival', d: 'her drawing lands covered — rub it off', i: 'gift',
    run() { openScratch(); } },
  { id: 'reveal', n: 'Hold to reveal', d: 'invisible ink shows while you press', i: 'eye',
    run() { openReveal(); } },

  { g: 'being there' },
  { id: 'bothhere', n: 'Both Here', d: 'the same minute, on purpose', i: 'flame',
    run() { closeSheet(); enterBothHere(); } },
  { id: 'hold', n: 'Hold', d: 'pressure answering pressure', i: 'heart',
    run() { openHold(); } },
  { id: 'touching', n: 'Touching', d: 'right now, technically', i: 'heart-fill',
    run() { openTouching(); } },
  { id: 'warm', n: 'Warm spots', d: 'where she rested, the glass stays warm', i: 'sunrise',
    run() { openWarm(); } },
  { id: 'breathe', n: 'Breathe', d: '4 in, 6 out, together', i: 'ghost',
    run() { openBreathe(); } },
  { id: 'string', n: 'The string', d: 'one line, both ends held', i: 'repeat',
    run() { openString(); } },

  { g: 'games' },
  { id: 'eyesshut', n: 'Eyes shut', d: 'feel the buzz, draw what she drew', i: 'zap', run() { openEyesShut(); } },
  { id: 'hotcold', n: 'Hot & cold', d: 'she hid something. the glass warms.', i: 'flame', run() { openHotCold(); } },

  { g: 'memory' },
  { id: 'replay', n: 'Replay', d: 'watch this canvas draw itself again', i: 'play', run() { closeSheet(); runReplay(); } },
  { id: 'slept', n: 'While you slept', d: 'what she drew at 03:04, her speed', i: 'music', run() { openSlept(); } },
  { id: 'capsule', n: 'Seal a time capsule', d: 'hide this drawing until a date', i: 'hourglass', run() { openCapsule(); } },
  { id: 'thread', n: 'The Thread', d: '412 days, one line, never broken', i: 'undo', run() { openThread(); } },
  { id: 'yearago', n: 'One year ago tonight', d: 'draw it again, worse', i: 'redo', run() { openYearAgo(); } },

  { g: 'the days' },
  { id: 'days', n: 'The days', d: 'a calendar for exactly two people', i: 'bookmark', run() { openDays(); } },
  { id: 'say', n: 'Something to say', d: 'real words, in your handwriting', i: 'mail-heart', run() { openSay(); } },
  { id: 'prompt', n: 'Today’s prompt', d: 'one whisper, same on both phones', i: 'sparkles', run() { closeSheet(); showPrompt(); } },

  { g: 'us & the world' },
  { id: 'dict', n: 'Our dictionary', d: 'marks and what they really mean', i: 'message', run() { openDict(); } },
  { id: 'compose', n: 'Make a post', d: 'this canvas, shaped for sharing', i: 'share', run() { openCompose(); } },
  { id: 'donate', n: 'Donate a sign', d: 'one mark, given to everyone', i: 'coin', run() { openDonate(); } },
  { id: 'world', n: 'The world thread', d: '511,904 strokes, never erased', i: 'arrows-h', run() { openWorld(); } },
  { id: 'widget', n: 'The widget', d: 'it’s just there on her home screen', i: 'camera', run() { openWidget(); } },
  { id: 'guardrails', n: 'What we won’t do', d: 'the rules that keep this kind', i: 'trash', run() { openGuardrails(); } },
];

function toggleMode(m) {
  closeSheet();
  const was = state.mode === m;
  state.mode = was ? null : m;
  $('#mirror-line').style.opacity = 0;
  if (m !== 'trace') { state.traceGuide = null; }
  toast(was ? 'back to the open canvas' : null || (was ? 'back to the open canvas' : ({
    mirror: 'mirror on — neither of you can finish alone',
    trace: 'trace over mine',
    passpen: 'pass the pen — you have it',
  }[m] || '')));
  redraw();
}

/* --- sheet --- */
const sheet = $('#sheet');
function openSheet() {
  const list = $('#sheet-list'); list.innerHTML = '';
  // 50+ features: a filter is no longer optional
  const q = document.createElement('input');
  q.type = 'search'; q.placeholder = 'search features';
  q.style.cssText = 'width:calc(100% - 24px);margin:0 12px 6px;padding:11px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#f3f0f4;font:14px system-ui;outline:none';
  q.addEventListener('input', () => {
    const v = q.value.trim().toLowerCase();
    let lastGroup = null, groupHas = false;
    for (const n of [...list.children]) {
      if (n === q) continue;
      if (n.classList.contains('sh-group')) {
        if (lastGroup) lastGroup.style.display = groupHas ? '' : 'none';
        lastGroup = n; groupHas = false; continue;
      }
      const hit = !v || n.textContent.toLowerCase().includes(v);
      n.style.display = hit ? '' : 'none';
      if (hit) groupHas = true;
    }
    if (lastGroup) lastGroup.style.display = groupHas ? '' : 'none';
  });
  list.appendChild(q);

  // "right now" — three context-aware suggestions (audit P0-2)
  const hr = new Date().getHours();
  const paired = window.TRACE_NET && TRACE_NET.live();
  const nowIds = [];
  if (!paired) nowIds.push('pair');
  if (hr >= 6 && hr < 11) nowIds.push('slept', 'prompt');
  else if (hr >= 21 || hr < 2) nowIds.push('bothhere', 'touching');
  else nowIds.push('prompt', 'mirror');
  const picks = nowIds.map(id => FEATURES.find(f => f.id === id)).filter(Boolean).slice(0, 3);
  if (picks.length) {
    const g = document.createElement('div'); g.className = 'sh-group'; g.textContent = 'right now';
    list.appendChild(g);
    for (const f of picks) {
      const b = document.createElement('button');
      b.className = 'sh-item sh-now';
      b.innerHTML = `<svg class="ts-i"><use href="#i-${f.i}"/></svg><span><b>${f.n}</b><i>${f.d}</i></span>`;
      b.addEventListener('click', () => openFeature(f.id));
      list.appendChild(b);
    }
  }
  for (const f of FEATURES) {
    if (f.g) { const g = document.createElement('div'); g.className = 'sh-group'; g.textContent = f.g; list.appendChild(g); continue; }
    const b = document.createElement('button');
    b.className = 'sh-item';
    b.innerHTML = `<svg class="ts-i"><use href="#i-${f.i}"/></svg><span><b>${f.n}</b><i>${f.d}</i></span>`;
    b.addEventListener('click', () => openFeature(f.id));
    list.appendChild(b);
  }
  sheet.classList.remove('hidden');
}
const closeSheet = () => sheet.classList.add('hidden');
$('#more-btn').addEventListener('click', openSheet);
sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });

function openFeature(id) {
  const f = FEATURES.find(x => x.id === id);
  if (f) { closeSheet(); f.run(); }
}

/* --- reveal (invisible ink) --- */
function openReveal() {
  closeSheet();
  const note = $('#canvas-note');
  note.textContent = 'press and hold the canvas';
  featureHooks = {
    down() { holdReveal = true; redraw(); note.textContent = 'only while you press'; return true; },
    up() { holdReveal = false; redraw(); note.textContent = 'press and hold the canvas';
      return true; },
  };
  toast('hold-to-reveal on — draw with the ghost brush first. tap ✕ ⋯ to exit');
  sara.after(400, () => { if (!strokes.some(s => s.brush === 'ghost'))
    sara.drawShape('xo', { c: '#7ec8ff' }), strokes[strokes.length - 1] && (strokes[strokes.length - 1].brush = 'ghost'); });
  exitOnSheet(() => { featureHooks = {}; holdReveal = false; note.textContent = ''; });
}
function exitOnSheet(fn) {
  const orig = openSheet;
  $('#more-btn').addEventListener('click', function once() {
    fn(); $('#more-btn').removeEventListener('click', once);
  }, { once: true });
}

/* --- scratch-off --- */
function openScratch() {
  openPanel('it arrived covered', (body) => {
    const { box, c, x, fit } = miniCanvas(380);
    body.appendChild(box);
    const note = document.createElement('div'); note.className = 'p-hint'; note.textContent = 'scratch it off';
    body.appendChild(note);
    let stopPlay = null;
    requestAnimationFrame(() => {
      fit();
      const w = box.clientWidth, h = box.clientHeight;
      // her drawing underneath
      const g = c.getContext('2d');
      const under = document.createElement('canvas'); under.width = w * DPR; under.height = h * DPR;
      const ux = under.getContext('2d'); ux.setTransform(DPR, 0, 0, DPR, 0, 0);
      const grad = ux.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#ff9a5a'); grad.addColorStop(.5, '#c14a86'); grad.addColorStop(1, '#5b2a6b');
      ux.fillStyle = grad; ux.fillRect(0, 0, w, h);
      ux.lineCap = ux.lineJoin = 'round'; ux.strokeStyle = '#fff'; ux.lineWidth = 11;
      const pts = SHAPES.heart.map(([px, py]) => ({ x: px * w, y: py * h }));
      ux.beginPath(); ux.moveTo(pts[0].x, pts[0].y);
      pts.forEach(p => ux.lineTo(jit(p.x, 3), jit(p.y, 3))); ux.stroke();
      // cover
      g.fillStyle = '#2b2029';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#37262f';
      for (let i = -h; i < w; i += 14) { g.save(); g.translate(i, 0); g.rotate(.45); g.fillRect(0, 0, 7, h * 1.6); g.restore(); }
      let cleared = 0;
      const scratch = (e) => {
        const r = box.getBoundingClientRect();
        const px = e.clientX - r.left, py = e.clientY - r.top;
        g.save(); g.globalCompositeOperation = 'destination-out';
        g.beginPath(); g.arc(px, py, 26, 0, 7); g.fill(); g.restore();
        cleared++;
        buzz(4);
        if (cleared === 30) { note.textContent = 'she’ll see the moment you uncover it'; }
        if (cleared > 90) { g.clearRect(0, 0, w, h); note.textContent = 'from Sara · 4 minutes ago'; box.removeEventListener('pointermove', scratch); log('scratch-off revealed'); }
      };
      box.style.backgroundImage = `url(${under.toDataURL()})`;
      box.style.backgroundSize = 'cover';
      box.addEventListener('pointermove', scratch);
    });
    return () => stopPlay && stopPlay();
  });
}

/* --- hold --- */
function openHold() {
  openPanel('hold', (body) => {
    body.insertAdjacentHTML('beforeend', '<div class="p-hint">press anywhere and keep pressing. she’s holding too.</div>');
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:center;gap:34px;padding:12px 0';
    const mk = (c) => { const b = document.createElement('div'); b.className = 'bar-v';
      const f = document.createElement('div'); f.style.background = c; b.appendChild(f); row.appendChild(b); return f; };
    const you = mk('linear-gradient(180deg,#e23343,#8f2b3d)');
    const her = mk('linear-gradient(180deg,#ff7a9c,#c14a86)');
    body.appendChild(row);
    const stat = document.createElement('div'); stat.className = 'p-stat'; stat.textContent = '00:00'; body.appendChild(stat);
    const best = document.createElement('div'); best.className = 'p-note'; best.style.textAlign = 'center';
    best.textContent = 'longest together ' + store.get('holdBest', '4:12'); body.appendChild(best);
    let pressing = false, t0 = 0, raf;
    const loop = () => {
      if (!you.isConnected) return;
      const yl = pressing ? 55 + Math.sin(now() / 300) * 20 : 16;
      you.style.height = yl + '%';
      her.style.height = (pressing ? 48 + Math.sin(now() / 380 + 2) * 18 : 12) + '%';
      if (pressing) {
        const s = Math.floor((now() - t0) / 1000);
        stat.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
        if (s > 0 && s % 5 === 0) buzz(6);
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    const down = () => { pressing = true; t0 = now(); log('hold begins'); };
    const upH = () => { if (pressing) log('hold ends at ' + stat.textContent); pressing = false; };
    body.addEventListener('pointerdown', down);
    body.addEventListener('pointerup', upH);
    return () => { cancelAnimationFrame(raf); };
  });
}

/* --- touching --- */
function openTouching() {
  openPanel('touching', (body) => {
    paux.textContent = '';
    const { box, c, x, fit } = miniCanvas(400);
    body.appendChild(box);
    const hint = document.createElement('div'); hint.className = 'p-hint';
    hint.textContent = 'find her finger. you can’t see your own.';
    body.appendChild(hint);
    const bestRow = document.createElement('div'); bestRow.className = 'p-note'; bestRow.style.textAlign = 'center';
    const bestVal = store.get('touchBest', 11);
    bestRow.textContent = `longest 00:${String(bestVal).padStart(2, '0')} · ${store.get('touchCount', 1204).toLocaleString()} times since March`;
    body.appendChild(bestRow);
    let sx = .3, sy = .3, tx = .7, ty = .6, you = null, held = 0, t0 = 0, raf;
    const loop = () => {
      if (!box.isConnected) return;
      requestAnimationFrame(fit);
      const w = box.clientWidth, h = box.clientHeight;
      // sara wanders
      if (Math.random() < .01) { tx = .15 + Math.random() * .7; ty = .15 + Math.random() * .7; }
      sx += (tx - sx) * .012; sy += (ty - sy) * .012;
      x.clearRect(0, 0, w, h);
      const g = x.createRadialGradient(sx * w, sy * h, 4, sx * w, sy * h, 30);
      g.addColorStop(0, 'rgba(255,122,156,.95)'); g.addColorStop(1, 'rgba(255,122,156,0)');
      x.fillStyle = g; x.beginPath(); x.arc(sx * w, sy * h, 30, 0, 7); x.fill();
      if (you) {
        const d = Math.hypot(you.x - sx * w, you.y - sy * h);
        if (d < 26) {
          if (!t0) { t0 = now(); log('TOUCHING'); }
          held = (now() - t0) / 1000;
          buzz(8);
          const glow = x.createRadialGradient(you.x, you.y, 8, you.x, you.y, 90);
          glow.addColorStop(0, 'rgba(255,205,170,.8)'); glow.addColorStop(1, 'rgba(255,160,140,0)');
          x.fillStyle = glow; x.beginPath(); x.arc(you.x, you.y, 90, 0, 7); x.fill();
          hint.textContent = 'right now, technically, we’re touching';
          paux.textContent = '00:' + String(Math.floor(held)).padStart(2, '0');
        } else if (t0) {
          if (held > bestVal) { store.set('touchBest', Math.floor(held)); }
          store.set('touchCount', store.get('touchCount', 1204) + 1);
          t0 = 0; held = 0;
          hint.textContent = 'find her finger. you can’t see your own.';
        }
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    const mv = (e) => { const r = box.getBoundingClientRect(); you = { x: e.clientX - r.left, y: e.clientY - r.top }; };
    box.addEventListener('pointermove', mv);
    box.addEventListener('pointerdown', mv);
    box.addEventListener('pointerleave', () => you = null);
    return () => cancelAnimationFrame(raf);
  });
}

/* --- warm spots --- */
function openWarm() {
  closeSheet();
  const layer = $('#warm-layer');
  layer.innerHTML = '';
  const spots = store.get('warmSpots', [
    { x: .3, y: .25, age: 9 }, { x: .62, y: .45, age: 14 }, { x: .4, y: .7, age: 19 },
  ]);
  for (const s of spots) {
    const d = document.createElement('div');
    d.className = 'warm-spot';
    const size = 70 + (20 - s.age) * 3;
    d.style.cssText += `left:${s.x * 100}%;top:${s.y * 100}%;width:${size}px;height:${size}px;opacity:${Math.max(.12, 1 - s.age / 22)}`;
    layer.appendChild(d);
  }
  $('#canvas-note').textContent = 'she was here 47 minutes ago. nothing was drawn.';
  toast('put your hand on a warm one and it stops cooling');
  sara.after(9000, () => { $('#canvas-note').textContent = ''; layer.innerHTML = ''; });
}

/* --- breathe --- */
function openBreathe() {
  openPanel('breathe', (body) => {
    body.insertAdjacentHTML('beforeend', '<div class="p-hint">hold your thumb down. the ring paces you both.</div>');
    const ringWrap = document.createElement('div');
    ringWrap.style.cssText = 'position:relative;height:240px;display:flex;align-items:center;justify-content:center';
    ringWrap.innerHTML = `
      <div id="br-ring" style="position:absolute;width:180px;height:180px;border-radius:99px;border:2px solid rgba(255,122,156,.55);transform:scale(.72);transition:transform 4s ease-in-out"></div>
      <div style="width:70px;height:70px;border-radius:99px;background:radial-gradient(circle,rgba(255,122,156,.9),rgba(226,51,67,.35) 70%);box-shadow:0 0 40px rgba(226,51,67,.5)"></div>`;
    body.appendChild(ringWrap);
    const word = document.createElement('div'); word.className = 'p-hint';
    word.style.cssText = 'font-size:34px;font-weight:700'; word.textContent = 'hold to begin';
    body.appendChild(word);
    const together = document.createElement('div'); together.className = 'p-note'; together.style.textAlign = 'center';
    body.appendChild(together);
    let holding = false, phase = 0, timers = [], t0 = 0;
    const cycle = () => {
      const ring = $('#br-ring');
      if (!holding || !ring || !ring.isConnected) return;
      if (phase === 0) { word.textContent = 'breathe in'; ring.style.transitionDuration = '4s'; ring.style.transform = 'scale(1.18)'; buzz(10); timers.push(setTimeout(() => { phase = 1; cycle(); }, 4000)); }
      else { word.textContent = 'breathe out'; ring.style.transitionDuration = '6s'; ring.style.transform = 'scale(.72)'; timers.push(setTimeout(() => { phase = 0; cycle(); }, 6000)); }
      const s = Math.floor((now() - t0) / 1000);
      together.textContent = `she’s holding too · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} together`;
    };
    body.addEventListener('pointerdown', () => { holding = true; t0 = now(); phase = 0; cycle(); log('breathing together'); });
    body.addEventListener('pointerup', () => { holding = false; timers.forEach(clearTimeout); word.textContent = 'let go whenever'; });
    return () => timers.forEach(clearTimeout);
  });
}

/* --- the string --- */
function openString() {
  openPanel('the string', (body) => {
    const { box, c, x, fit } = miniCanvas(300);
    body.appendChild(box);
    body.insertAdjacentHTML('beforeend', '<div class="p-hint">drag your end gently. one tug = thinking of you.</div>');
    const note = document.createElement('div'); note.className = 'p-note'; note.style.textAlign = 'center';
    note.textContent = 'held since 21:40'; body.appendChild(note);
    let pull = 0, snapped = false, raf, sag = 40;
    const loop = () => {
      if (!box.isConnected) return;
      requestAnimationFrame(fit);
      const w = box.clientWidth, h = box.clientHeight;
      x.clearRect(0, 0, w, h);
      const y0 = h * .45;
      x.lineCap = 'round';
      if (!snapped) {
        x.strokeStyle = '#f4c66b'; x.lineWidth = 4.5;
        x.beginPath(); x.moveTo(26, y0);
        x.quadraticCurveTo(w / 2, y0 + sag - pull * 1.6, w - 26, y0);
        x.stroke();
      } else {
        x.strokeStyle = 'rgba(244,198,107,.55)'; x.lineWidth = 4;
        x.beginPath(); x.moveTo(26, y0); x.quadraticCurveTo(w * .3, y0 + 30, w * .42, y0 + 60); x.stroke();
        x.beginPath(); x.moveTo(w - 26, y0); x.quadraticCurveTo(w * .7, y0 + 30, w * .58, y0 + 60); x.stroke();
      }
      const dot = (px, col) => { x.fillStyle = col; x.beginPath(); x.arc(px, y0, 12, 0, 7); x.fill();
        x.strokeStyle = '#fff'; x.lineWidth = 3; x.stroke(); };
      dot(26, '#e23343'); dot(box.clientWidth - 26, '#ff7a9c');
      pull *= .92;
      raf = requestAnimationFrame(loop);
    };
    loop();
    let dy = 0, y00 = 0;
    box.addEventListener('pointerdown', (e) => { y00 = e.clientY; });
    box.addEventListener('pointermove', (e) => {
      if (!e.buttons || snapped) return;
      pull = Math.max(0, y00 - e.clientY);
      if (pull > 12 && pull < 20) { buzz(10); }
      if (pull > 95) { snapped = true; note.textContent = 'it snapped. for both of you.'; buzz([60, 50, 120]); log('the string SNAPPED'); }
    });
    box.addEventListener('pointerup', () => {
      if (!snapped && pull > 12) {
        toast('she felt that'); log('you tug the string');
        if (window.TRACE_NET && TRACE_NET.live()) TRACE_NET.emit('tug', {});
        else sara.after(2400, () => stringTug('sara'));
      }
    });
    return () => cancelAnimationFrame(raf);
  });
}

/* --- eyes shut --- */
function openEyesShut() {
  openPanel('eyes shut', (body) => {
    body.insertAdjacentHTML('beforeend', '<div class="p-hint">feel the pattern. then draw what she drew.</div>');
    const bars = document.createElement('div');
    bars.style.cssText = 'display:flex;gap:5px;align-items:flex-end;height:34px;justify-content:center';
    for (const hgt of [40, 80, 55, 95, 35]) {
      const b = document.createElement('div');
      b.style.cssText = `width:6px;height:${hgt}%;border-radius:3px;background:#f4c66b;opacity:.25;transition:opacity .2s`;
      bars.appendChild(b);
    }
    body.appendChild(bars);
    const feel = document.createElement('button'); feel.className = 'p-ghost'; feel.textContent = 'feel it again';
    const playBuzz = () => {
      [...bars.children].forEach((b, i) => setTimeout(() => {
        b.style.opacity = 1; buzz(30 + i * 10);
        setTimeout(() => b.style.opacity = .25, 180);
      }, i * 330));
    };
    feel.addEventListener('click', playBuzz);
    body.appendChild(feel);
    const { box, c, x, fit } = miniCanvas(260);
    body.appendChild(box);
    const go = document.createElement('button'); go.className = 'p-cta'; go.textContent = 'reveal side by side';
    body.appendChild(go);
    let your = [];
    box.addEventListener('pointermove', (e) => {
      if (!e.buttons) return;
      requestAnimationFrame(fit);
      const r = box.getBoundingClientRect();
      const p = { x: e.clientX - r.left, y: e.clientY - r.top };
      your.push(p);
      // blind: barely visible while drawing
      x.fillStyle = 'rgba(226,51,67,.12)'; x.beginPath(); x.arc(p.x, p.y, 4, 0, 7); x.fill();
    });
    go.addEventListener('click', () => {
      const w = box.clientWidth, h = box.clientHeight;
      x.clearRect(0, 0, w, h);
      // hers on left
      x.save(); x.translate(0, 0); x.scale(.5, 1);
      x.lineCap = x.lineJoin = 'round'; x.strokeStyle = '#ff7a9c'; x.lineWidth = 9;
      const pts = SHAPES.sun.map(([px, py]) => ({ x: px * w, y: py * h }));
      x.beginPath(); x.moveTo(pts[0].x, pts[0].y); pts.forEach(p => x.lineTo(jit(p.x, 3), jit(p.y, 3))); x.stroke(); x.restore();
      // yours on right
      x.save(); x.translate(w / 2, 0); x.scale(.5, 1);
      x.strokeStyle = '#e23343'; x.lineWidth = 9;
      if (your.length > 1) { x.beginPath(); x.moveTo(your[0].x, your[0].y); your.forEach(p => x.lineTo(p.x, p.y)); x.stroke(); }
      x.restore();
      x.strokeStyle = 'rgba(255,255,255,.25)'; x.setLineDash([5, 8]); x.beginPath(); x.moveTo(w / 2, 10); x.lineTo(w / 2, h - 10); x.stroke(); x.setLineDash([]);
      const match = 40 + Math.floor(Math.random() * 45);
      go.textContent = `match ${match}% — it was a sun`;
      log(`eyes shut: ${match}% match`);
    });
    playBuzz();
  });
}

/* --- hot & cold --- */
function openHotCold() {
  openPanel('hot & cold', (body) => {
    body.insertAdjacentHTML('beforeend', '<div class="p-hint">she hid something on a canvas ten screens wide.<br>move. the glass warms.</div>');
    const { box, c, x, fit } = miniCanvas(360);
    body.appendChild(box);
    const temp = document.createElement('div'); temp.className = 'p-stat'; temp.textContent = 'cold';
    body.appendChild(temp);
    const target = { x: .2 + Math.random() * .6, y: .2 + Math.random() * .6 };
    let found = false;
    const paint = (heat) => {
      requestAnimationFrame(fit);
      const w = box.clientWidth, h = box.clientHeight;
      x.clearRect(0, 0, w, h);
      const cold = [11, 18, 46], hot = [201, 102, 58];
      const mix = cold.map((cc, i) => Math.round(cc + (hot[i] - cc) * heat));
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, `rgb(${mix.map(v => Math.max(0, v - 24)).join(',')})`);
      g.addColorStop(1, `rgb(${mix.join(',')})`);
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      if (found) {
        x.lineCap = x.lineJoin = 'round'; x.strokeStyle = '#fff'; x.lineWidth = 10;
        const pts = SHAPES.heart.map(([px, py]) => ({ x: (target.x * .6 + .2 + (px - .5) * .4) * w, y: (target.y * .6 + .2 + (py - .5) * .4) * h }));
        x.beginPath(); x.moveTo(pts[0].x, pts[0].y); pts.forEach(p => x.lineTo(jit(p.x, 2), jit(p.y, 2))); x.stroke();
      }
    };
    paint(0);
    box.addEventListener('pointermove', (e) => {
      if (found) return;
      const r = box.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      const d = Math.hypot(px - target.x, py - target.y);
      const heat = Math.max(0, 1 - d * 1.8);
      paint(heat);
      temp.textContent = heat > .92 ? 'BURNING' : heat > .7 ? 'hot' : heat > .45 ? 'warmer' : heat > .25 ? 'warm' : 'cold';
      if (heat > .5) buzz(Math.round(heat * 12));
      if (heat > .96) { found = true; paint(1); temp.textContent = 'found it.'; toast('she hid it 2 days ago. she watched you get close.'); log('hot&cold: found'); buzz([30, 40, 80]); }
    });
  });
}

/* --- replay --- */
function runReplay() {
  const mine = strokes.filter(s => s.who !== 'fx');
  if (!mine.length) { toast('draw something first — then watch it again'); return; }
  toast('replay — every stroke, in order');
  const saved = strokes; strokes = []; redraw();
  let i = 0;
  const playNext = () => {
    if (i >= mine.length) { strokes = saved; redraw(); return; }
    const s = mine[i++]; const copy = { ...s, pts: [] };
    strokes.push(copy);
    let j = 0;
    const t = setInterval(() => {
      copy.pts.push(s.pts[j++]); redraw();
      if (j >= s.pts.length) { clearInterval(t); setTimeout(playNext, 260); }
    }, 16);
  };
  playNext();
}

/* --- while you slept --- */
function openSlept() {
  openPanel('while you slept', (body) => {
    paux.textContent = '03:04';
    body.insertAdjacentHTML('beforeend', '<div class="p-note">she drew this at 03:04. her speed, not sped up — the long pause is her deciding whether to send it.</div>');
    const { box, c, x } = miniCanvas(320);
    body.appendChild(box);
    const pauseNote = document.createElement('div'); pauseNote.className = 'p-hint'; pauseNote.textContent = '';
    body.appendChild(pauseNote);
    const stop = playInto(x, box, [
      { shape: 'heartL', c: '#ff7a9c', w: 10, speed: 46, pause: 2200 },
      { shape: 'heart', c: '#ff7a9c', w: 10, speed: 40 },
    ], {
      onPause: () => { pauseNote.textContent = 'she stopped here.'; setTimeout(() => pauseNote.textContent = '', 2100); },
      done: () => { pauseNote.textContent = 'she was awake 26 minutes.'; log('while-you-slept replay done'); },
    });
    return stop;
  });
}

/* --- capsule --- */
function openCapsule() {
  openPanel('seal a time capsule', (body) => {
    const caps = store.get('capsules', [{ label: 'us, drawn at 2am', opens: '2027-02-14' }]);
    body.insertAdjacentHTML('beforeend', '<div class="p-note">seal what’s on the canvas until a date. locked on both phones — even from you two.</div>');
    const list = document.createElement('div');
    const render = () => {
      list.innerHTML = '';
      for (const cp of caps) {
        const days = Math.max(0, Math.ceil((new Date(cp.opens) - Date.now()) / 864e5));
        list.insertAdjacentHTML('beforeend',
          `<div class="chip" style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
            <span>${cp.label}</span><span style="font:700 11px ui-monospace,monospace;color:#f4c66b">OPENS IN ${days} DAYS</span></div>`);
      }
    };
    render();
    body.appendChild(list);
    const seal = document.createElement('button'); seal.className = 'p-cta';
    seal.textContent = 'seal today’s canvas · one year';
    seal.addEventListener('click', () => {
      const d = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);
      caps.push({ label: 'sealed ' + new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), opens: d });
      store.set('capsules', caps);
      strokes = strokes.filter(s => s.who === 'fx');
      redraw(); render();
      toast('sealed. the canvas is blank again — that’s the point.');
      log('capsule sealed for a year');
    });
    body.appendChild(seal);
  });
}

/* --- thread --- */
function openThread() {
  openPanel('the thread', (body) => {
    const days = store.get('threadDays', 412);
    body.insertAdjacentHTML('beforeend', `<div class="p-note">one line for ${days} days. thin through the fortnight you were ill. never broken, never reset — nothing here will ever tell you off for a quiet week.</div>`);
    const { box, c, x, fit } = miniCanvas(160);
    body.appendChild(box);
    requestAnimationFrame(() => { fit();
      const w = box.clientWidth, h = box.clientHeight, y0 = h / 2;
      const segs = [[0, .28, 6, '#e23343'], [.28, .4, 3, '#8d8494'], [.4, .52, 2.2, '#6f6879'], [.52, .64, 3, '#8d8494'], [.64, 1, 6, '#e23343']];
      x.lineCap = 'round';
      for (const [a, b2, lw, col] of segs) {
        x.strokeStyle = col; x.lineWidth = lw; x.beginPath();
        for (let px = a * w; px <= b2 * w; px += 4) {
          const py = y0 + Math.sin(px / 26) * 8 + (Math.random() - .5) * 2.5;
          px === a * w ? x.moveTo(px, py) : x.lineTo(px, py);
        }
        x.stroke();
      }
    });
    body.insertAdjacentHTML('beforeend', `<div class="p-stat" style="font-family:Caveat,cursive;font-size:42px">${days} days, one line.</div>
      <div class="p-note" style="text-align:center">NO FLAME · NO RESET · NOT FOR SALE</div>`);
  });
}

/* --- one year ago --- */
function openYearAgo() {
  closeSheet();
  state.traceGuide = { pts: wobblePath(SHAPES.sun, 3, 6), c: '#f3f0f4', w: 13 };
  redraw();
  $('#canvas-note').textContent = 'one year ago tonight, she drew this. draw it again, worse.';
  toast('both versions stay, stacked, forever');
  sara.after(12000, () => { state.traceGuide = null; $('#canvas-note').textContent = ''; redraw(); });
}

/* --- days / calendar --- */
function openDays() {
  openPanel('the days', (body) => {
    const marked = store.get('daysMarked', [4, 14, 22]);
    const today = new Date().getDate();
    body.insertAdjacentHTML('beforeend', '<div class="p-note">a calendar for exactly two people. tap a day — you mark it by drawing on it, and on the morning it arrives, the canvas isn’t empty.</div>');
    const cal = document.createElement('div'); cal.className = 'cal';
    const dim = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    for (let d = 1; d <= dim; d++) {
      const b = document.createElement('button');
      b.textContent = d;
      if (marked.includes(d)) b.classList.add('marked');
      if (d === today) b.classList.add('today');
      b.addEventListener('click', () => {
        const i = marked.indexOf(d);
        i === -1 ? marked.push(d) : marked.splice(i, 1);
        store.set('daysMarked', marked);
        b.classList.toggle('marked');
        if (b.classList.contains('marked')) { toast(`${d} ${new Date().toLocaleDateString(undefined, { month: 'long' })} — drawn on, said out loud`); log('day marked: ' + d); }
      });
      cal.appendChild(b);
    }
    body.appendChild(cal);
    if (marked.includes(today)) body.insertAdjacentHTML('beforeend', '<div class="p-hint">today is marked — her banner is already on the canvas.</div>');
  });
}

/* --- something to say --- */
function openSay() {
  openPanel('something to say', (body) => {
    body.insertAdjacentHTML('beforeend', '<div class="p-note">for 14 august · ultrasound day. tap a line and it lands on her canvas in your handwriting.</div>');
    const lines = [
      'tell me the second you know. i’ll have my phone in my hand.',
      'you’re going to be so good at this.',
      'whatever they say today, i’m coming home to you.',
      'i’ve been awake since four. not in a bad way.',
    ];
    for (const l of lines) {
      const c = document.createElement('button'); c.className = 'chip'; c.textContent = l;
      c.addEventListener('click', () => {
        closePanel();
        writeOnCanvas(l);
        toast('held until 07:00 her time — it lands as she wakes');
        log('something-to-say queued');
      });
      body.appendChild(c);
    }
  });
}
function writeOnCanvas(text) {
  const note = $('#whisper');
  note.style.font = "700 24px/1.3 Caveat, cursive";
  note.style.color = '#fff';
  note.textContent = text;
  note.classList.add('on');
  setTimeout(() => { note.classList.remove('on'); note.style.font = ''; note.style.color = ''; }, 5200);
}

/* --- prompt --- */
const PROMPTS = ['draw a heart, but weird', 'draw how today feels', 'draw what you’d cook me', 'draw where you wish we were', 'draw me as a potato'];
function showPrompt() {
  const p = PROMPTS[new Date().getDay() % PROMPTS.length];
  const w2 = $('#whisper');
  w2.textContent = p;
  w2.classList.add('on');
  toast('the same prompt is on her phone');
  setTimeout(() => w2.classList.remove('on'), 6000);
}

/* --- dictionary --- */
function openDict() {
  openPanel('our dictionary', (body) => {
    const dict = store.get('dict', [
      { shape: 'squiggle', m: 'nothing. just here', n: 1140 },
      { shape: 'come', m: 'come here', n: 208 },
      { shape: 'xo', m: 'i’m at my mother’s. save me', n: 12 },
    ]);
    body.insertAdjacentHTML('beforeend', '<div class="p-note">marks and what they really mean. you’d have to be us to read it.</div>');
    for (const d of dict) {
      const row = document.createElement('div'); row.className = 'dict-row';
      const mc = document.createElement('canvas'); mc.width = 112; mc.height = 76;
      const mx = mc.getContext('2d');
      mx.lineCap = mx.lineJoin = 'round'; mx.strokeStyle = '#ff7a9c'; mx.lineWidth = 5;
      const pts = (SHAPES[d.shape] || SHAPES.squiggle).map(([px, py]) => ({ x: px * 112, y: py * 76 }));
      mx.beginPath(); mx.moveTo(pts[0].x, pts[0].y); pts.forEach(p => mx.lineTo(jit(p.x, 2), jit(p.y, 2))); mx.stroke();
      row.appendChild(mc);
      row.insertAdjacentHTML('beforeend', `<span><b>${d.m}</b><i>used ${d.n.toLocaleString()} times</i></span>`);
      body.appendChild(row);
    }
    const add = document.createElement('button'); add.className = 'p-ghost'; add.textContent = 'save the last mark you drew';
    add.addEventListener('click', () => {
      const m = prompt('what does it mean? (only you two will see this)');
      if (m) { dict.unshift({ shape: 'squiggle', m, n: 1 }); store.set('dict', dict); closePanel(); openDict(); }
    });
    body.appendChild(add);
  });
}

/* --- compose / share --- */
function openCompose() {
  openPanel('make a post', (body) => {
    body.insertAdjacentHTML('beforeend', '<div class="p-note">this canvas, shaped for sharing. the little trace mark stays, bottom-left, small.</div>');
    const shapes = [['1:1', 1080, 1080], ['9:16', 1080, 1920], ['16:9', 1920, 1080]];
    const row = document.createElement('div'); row.className = 'p-row';
    let pick = shapes[0];
    shapes.forEach((s, i) => {
      const b = document.createElement('button'); b.className = i ? 'p-ghost' : 'p-cta'; b.textContent = s[0];
      b.addEventListener('click', () => { pick = s; [...row.children].forEach((x, j) => x.className = shapes[j] === pick ? 'p-cta' : 'p-ghost'); });
      row.appendChild(b);
    });
    body.appendChild(row);
    const go = document.createElement('button'); go.className = 'p-cta'; go.textContent = 'share this trace';
    go.addEventListener('click', () => {
      const [label, ow, oh] = pick;
      const out = document.createElement('canvas'); out.width = ow; out.height = oh;
      const ox = out.getContext('2d');
      const g = ox.createLinearGradient(0, 0, 0, oh);
      ['#33445f', '#5c5f78', '#8a6b73', '#2e2733'].forEach((c2, i) => g.addColorStop([0, .45, .7, 1][i], c2));
      ox.fillStyle = g; ox.fillRect(0, 0, ow, oh);
      const k = Math.min(ow / W, oh / H) * .82;
      ox.save();
      ox.translate((ow - W * k) / 2, (oh - H * k) / 2); ox.scale(k / DPR, k / DPR);
      ox.drawImage(cv, 0, 0);
      ox.restore();
      ox.font = '700 ' + Math.round(oh * .045) + 'px Caveat, cursive';
      ox.fillStyle = '#f3f0f4'; ox.fillText('tra', ow * .05, oh * .95);
      ox.fillStyle = '#e23343'; ox.fillText('ce', ow * .05 + ox.measureText('tra').width, oh * .95);
      const a = document.createElement('a');
      a.href = out.toDataURL('image/png'); a.download = `trace-post-${label.replace(':', 'x')}.png`; a.click();
      toast('exported ' + ow + '×' + oh);
      log('post exported ' + label);
    });
    body.appendChild(go);
  });
}

/* --- donate a sign --- */
function openDonate() {
  openPanel('donate a sign', (body) => {
    body.insertAdjacentHTML('beforeend', `
      <div class="p-note">give one mark to everyone. one mark, chosen by you — nothing near it leaves the phone.</div>`);
    const consent1 = mkToggle(body, 'share the shape and the meaning', true);
    const consent2 = mkToggle(body, 'let others adopt it as theirs', false);
    body.insertAdjacentHTML('beforeend', '<div class="p-note" style="color:#f4c66b">4,180 people already did</div>');
    const go = document.createElement('button'); go.className = 'p-cta'; go.textContent = 'donate this sign';
    go.addEventListener('click', () => {
      toast(consent1.on() ? 'donated. it belongs to everyone now.' : 'pick what to share first');
      if (consent1.on()) log('sign donated (adopt=' + consent2.on() + ')');
    });
    body.appendChild(go);
  });
}
function mkToggle(body, label, on) {
  const row = document.createElement('button');
  row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;width:100%;padding:13px 14px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#f3f0f4;font-size:13.5px';
  const k = document.createElement('span');
  const paint = () => k.style.cssText = `width:44px;height:26px;border-radius:99px;position:relative;transition:background .2s;background:${on ? '#c64b52' : 'rgba(255,255,255,.15)'}`;
  k.innerHTML = '<i style="position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:99px;background:#fff;transition:transform .2s"></i>';
  const knob = () => k.firstChild.style.transform = on ? 'translateX(18px)' : '';
  paint(); requestAnimationFrame(knob);
  row.append(label, k);
  row.addEventListener('click', () => { on = !on; paint(); knob(); });
  body.appendChild(row);
  return { on: () => on };
}

/* --- world thread --- */
function openWorld() {
  openPanel('the world thread', (body) => {
    body.insertAdjacentHTML('beforeend', '<div class="p-note">one communal line. it has never been erased and never will be. someone in Osaka is adding to it.</div>');
    const { box, c, x, fit } = miniCanvas(220);
    body.appendChild(box);
    const n0 = 511904 + Math.floor(Math.random() * 40);
    const stat = document.createElement('div'); stat.className = 'p-stat'; body.appendChild(stat);
    let off = 0, count = n0, raf;
    const loop = () => {
      if (!box.isConnected) return;
      requestAnimationFrame(fit);
      const w = box.clientWidth, h = box.clientHeight;
      x.clearRect(0, 0, w, h);
      x.lineCap = 'round'; x.lineWidth = 5;
      const grad = x.createLinearGradient(0, 0, w, 0);
      ['#7ec8ff', '#f4c66b', '#ff7a9c', '#e23343'].forEach((c2, i) => grad.addColorStop(i / 3, c2));
      x.strokeStyle = grad;
      x.beginPath();
      for (let px = -20; px < w + 20; px += 4) {
        const py = h / 2 + Math.sin((px + off) / 34) * 26 + Math.sin((px + off) / 9) * 6;
        px === -20 ? x.moveTo(px, py) : x.lineTo(px, py);
      }
      x.stroke();
      off += 1.6;
      if (Math.random() < .02) { count++; stat.textContent = count.toLocaleString() + ' strokes'; }
      raf = requestAnimationFrame(loop);
    };
    stat.textContent = count.toLocaleString() + ' strokes';
    loop();
    const add = document.createElement('button'); add.className = 'p-cta'; add.textContent = 'add yours';
    add.addEventListener('click', () => { count++; stat.textContent = count.toLocaleString() + ' strokes'; buzz(15); toast('yours now, and everyone’s'); });
    body.appendChild(add);
    return () => cancelAnimationFrame(raf);
  });
}

/* --- widget --- */
function openWidget() {
  openPanel('the widget', (body) => {
    body.insertAdjacentHTML('beforeend', '<div class="p-note">no notification. it’s just there — the canvas lands where she already looks 80 times a day.</div>');
    const home = document.createElement('div');
    home.style.cssText = 'border-radius:22px;padding:18px;background:linear-gradient(180deg,#0b1226,#33406b);display:grid;grid-template-columns:1fr 1fr;gap:12px';
    const wg = document.createElement('div');
    wg.style.cssText = 'grid-column:span 2;aspect-ratio:2/1;border-radius:18px;overflow:hidden;position:relative;border:1px solid rgba(255,255,255,.18)';
    const wc = document.createElement('canvas');
    wc.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    wg.appendChild(wc);
    home.appendChild(wg);
    for (let i = 0; i < 4; i++) { const d = document.createElement('div'); d.style.cssText = 'aspect-ratio:1;border-radius:14px;background:rgba(255,255,255,.08)'; home.appendChild(d); }
    body.appendChild(home);
    requestAnimationFrame(() => {
      wc.width = wg.clientWidth * DPR; wc.height = wg.clientHeight * DPR;
      const wx = wc.getContext('2d');
      const g = wx.createLinearGradient(0, 0, 0, wc.height);
      g.addColorStop(0, '#ff9a5a'); g.addColorStop(.6, '#c14a86'); g.addColorStop(1, '#5b2a6b');
      wx.fillStyle = g; wx.fillRect(0, 0, wc.width, wc.height);
      const k = Math.min(wc.width / cv.width, wc.height / cv.height);
      wx.translate((wc.width - cv.width * k) / 2, (wc.height - cv.height * k) / 2);
      wx.scale(k, k); wx.drawImage(cv, 0, 0);
    });
    body.insertAdjacentHTML('beforeend', '<div class="p-hint">that’s your live canvas, on her home screen, 2 min ago</div>');
  });
}

/* --- guardrails --- */
function openGuardrails() {
  openPanel('what we won’t do', (body) => {
    body.insertAdjacentHTML('beforeend', `<div class="list-quiet">
      <div><span class="no">✕</span><b>No breakable streak.</b> The thread goes thin, never snaps.</div>
      <div><span class="no">✕</span><b>No "you haven’t drawn in 3 days".</b> We never guilt one person about another.</div>
      <div><span class="no">✕</span><b>No read receipts as leverage.</b> You see she’s here now — you can’t audit her.</div>
      <div><span class="no">✕</span><b>No scores or "relationship health".</b> Two people are not a dashboard.</div>
      <div><span class="no">✕</span><b>No notification from us.</b> Every buzz is a person, or it doesn’t happen.</div>
      <div><span class="yes">✓</span><b>You can close the door.</b> One tap ends it, archives everything, free.</div>
    </div>
    <div class="p-hint" style="margin-top:8px">If it works only because leaving hurts, it doesn’t work.</div>`);
    const close = document.createElement('button'); close.className = 'p-ghost'; close.textContent = 'close the door';
    close.addEventListener('click', () => {
      if (confirm('End it? This archives your canvas and stops every trace. No win-back emails. (Simulation: clears local data.)')) {
        localStorage.clear(); strokes = []; redraw(); closePanel();
        toast('the door is closed. take care of yourself.');
        log('CLOSE THE DOOR — everything archived, nothing retained');
      }
    });
    body.appendChild(close);
  });
}

/* ================================================================ sim rail */

$$('#sim [data-sim]').forEach(b => b.addEventListener('click', () => {
  const k = b.dataset.sim;
  if (k === 'draw') sara.reply();
  if (k === 'heart') sara.heartbeat();
  if (k === 'open') sara.openCanvas();
  if (k === 'tug') stringTug('sara');
}));

/* Extra features live in app-extra.js and register through this API so the
   two files can't drift — everything they need is passed explicitly. */
if (typeof window !== 'undefined' && window.TRACE_EXTRA) {
  FEATURES.push(...window.TRACE_EXTRA({
    openPanel, closePanel, miniCanvas, playInto, toast, log, buzz, store,
    SHAPES, wobblePath, jit, sara, redraw, closeSheet,
    writeOnCanvas: (t) => writeOnCanvas(t),
    strokes: {
      all: () => strokes,
      add: (s) => { strokes.push(s); redraw(); },
      set: (v) => { strokes = v; redraw(); },
      clear: () => { strokes = []; redraw(); },
    },
    canvas: () => ({ cv, ctx, W, H, DPR, wrap }),
    note: (t) => { $('#canvas-note').textContent = t || ''; },
    hooks: (h) => { featureHooks = h || {}; },
    $, $$, now, DPR,
  }));
}

/* ================================================================ boot */

/* ---------------- views: home (widget-first) <-> canvas ---------------- */
const homeEl = $('#home'), appEl = $('#appview');
function showApp() {
  homeEl.classList.add('hidden'); appEl.classList.remove('hidden');
  document.getElementById('screen').classList.remove('on-home');
  requestAnimationFrame(sizeCanvas);
}
function showHome() {
  appEl.classList.add('hidden'); homeEl.classList.remove('hidden');
  document.getElementById('screen').classList.add('on-home');
  window.TRACE_BOARD && TRACE_BOARD.inked();
}
$('#home-bar').addEventListener('click', () => { closePanel(); closeSheet(); showHome(); });

/* The widget is rooms.js's — it decides which card shows. When that card is
   the one-time trace, it hands us the canvas to paint the ink into. */
let lastInkAt = Date.now();
function paintWidget(target) {
  const wInk = target || $('#widget-ink');
  if (!wInk) return;
  const r = wInk.getBoundingClientRect();
  if (!r.width) return;
  wInk.width = r.width * DPR; wInk.height = r.height * DPR;
  const wx = wInk.getContext('2d');
  wx.setTransform(DPR, 0, 0, DPR, 0, 0);
  wx.clearRect(0, 0, r.width, r.height);
  const mine = strokes.filter(k => k.who !== 'fx');
  if (!W || !H) return;
  const k = Math.max(r.width / W, r.height / H) * .9;
  wx.save();
  wx.translate((r.width - W * k) / 2, (r.height - H * k) / 2);
  wx.scale(k, k);
  wx.lineCap = wx.lineJoin = 'round';
  for (const s of mine) {
    if (s.pts.length < 2) continue;
    wx.globalCompositeOperation = s.brush === 'eraser' ? 'destination-out' : 'source-over';
    wx.globalAlpha = s.brush === 'eraser' ? 1 : (s.alpha !== undefined ? s.alpha : 1);
    wx.strokeStyle = s.c; wx.lineWidth = s.w;
    wx.beginPath(); wx.moveTo(s.pts[0].x, s.pts[0].y);
    for (const p of s.pts) wx.lineTo(p.x, p.y);
    wx.stroke();
  }
  wx.globalCompositeOperation = 'source-over'; wx.globalAlpha = 1;
  wx.restore();
}

/* the phone is the clean system's exact 390×844, scaled as one unit */
function fitPhone() {
  const simW = innerWidth > 760 ? 280 : 0;
  const z = Math.min((innerWidth - simW - 16) / 406, (innerHeight - 16) / 860);
  document.getElementById('phone').style.zoom = z.toFixed(3);
}
addEventListener('resize', fitPhone); fitPhone();

function tickClock() {
  const d = new Date();
  const t = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  $('#clock').textContent = t;
  const ht = $('#home-time');
  if (ht) ht.textContent = t + ' · ' + d.toLocaleDateString(undefined, { weekday: 'long' }).toLowerCase();
}
setInterval(tickClock, 20000); tickClock();

new ResizeObserver(sizeCanvas).observe(wrap);
sizeCanvas();

// ghost strokes fade over time
setInterval(() => { if (strokes.some(s => s.brush === 'ghost')) redraw(); }, 300);

// opening moment: she's finishing something as you arrive
/* first launch: pairing IS the front door (audit P0-1, Noteit pattern) */
function firstRun() {
  if (store.get('onboarded', false)) return;
  const code = store.get('pairCode', null) || Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 5);
  store.set('pairCode', code);
  const ob = document.createElement('div');
  ob.id = 'onboard';
  /* 19a: Meet Trace — one surface, both of you, all day. Pairing is the
     front door, so the code and the join field are the whole screen. */
  ob.innerHTML = `
    <div class="ob-card">
      <div style="font-size:15px;color:var(--ink-2)">Meet</div>
      <div class="ob-wm">Trace</div>
      <div class="ob-h">One surface, both of you, all day.</div>
      <input id="ob-name" placeholder="your name" maxlength="14">
      <div class="ob-code-l">Your code</div>
      <div class="ob-code">${code}</div>
      <button class="ob-share">Share it with your person</button>
      <input id="ob-their" placeholder="or type theirs" maxlength="5">
      <button class="ob-go">Start a canvas</button>
      <button class="ob-skip">Try it alone first — Maya will draw back</button>
    </div>`;
  document.getElementById('screen').appendChild(ob);
  const done = () => { store.set('onboarded', true); ob.remove(); };
  ob.querySelector('.ob-share').addEventListener('click', async () => {
    const text = 'draw with me on trace — my code is ' + code;
    try { if (navigator.share) { await navigator.share({ text }); return; } } catch {}
    try { await navigator.clipboard.writeText(text); toast('copied — send it to them'); } catch { toast('your code: ' + code); }
  });
  ob.querySelector('.ob-go').addEventListener('click', () => {
    const name = ob.querySelector('#ob-name').value.trim();
    if (name && window.TRACE_NET) { TRACE_NET.name = name; localStorage.setItem('trace:myname', name); }
    const theirs = ob.querySelector('#ob-their').value.trim().toLowerCase() || code;
    if (window.TRACE_NET) TRACE_NET.join(theirs, 'supabase', (st) => {
      if (st === 'open') toast('channel open — the first drawing does the rest');
      if (st === 'error') toast('no internet path here — ⋯ → Pair has a two-windows mode');
    });
    done(); showApp();
  });
  ob.querySelector('.ob-skip').addEventListener('click', () => {
    const name = ob.querySelector('#ob-name').value.trim();
    if (name && window.TRACE_NET) { TRACE_NET.name = name; localStorage.setItem('trace:myname', name); }
    done();
  });
}

showHome();
firstRun();
let opened = false;
$('#widget').addEventListener('click', () => {
  if (opened) return; opened = true;
  setTimeout(() => {
    if (window.TRACE_NET && TRACE_NET.live()) return;
    sara.drawShape('sun', { c: '#f4c66b' });
  }, 1200);
});
setTimeout(() => {
  if (true) return;   // opening moment now happens on first widget tap
  sara.drawShape('sun', { c: '#f4c66b', then: () => {
    $('#canvas-note').textContent = 'draw how today feels';
    setTimeout(() => $('#canvas-note').textContent = '', 5000);
  }});
}, 1600);
/* receive side for real pairing (TRACE_NET) + the surface rooms.js drives */
const remote = {};   // id -> stroke
window.TRACE_APP = {
  /* --- what the clean shell (rooms.js) needs from the engine --- */
  toast, buzz, log, openPanel, openFeature, openSheet,
  features: () => FEATURES,
  strokeCount: () => strokes.filter(k => k.who !== 'fx').length,
  handCount: () => new Set(strokes.filter(k => k.who !== 'fx').map(k => k.who)).size || 1,
  partnerDrawing: () => drawingNow,
  paintWidgetInk: (cv) => paintWidget(cv),
  showApp, showHome, brushPop: toggleBrushPop,
  remoteBoard(p) { window.TRACE_BOARD && TRACE_BOARD.receive(p); },
  remoteBegin(p) {
    remote[p.id] = { pts: [], c: p.c, w: p.w, alpha: p.alpha, taper: p.taper, brush: p.brush, who: 'partner', born: now(), mirror: p.mirror, id: p.id };
    strokes.push(remote[p.id]);
    sara.presence(true);
  },
  remotePts(p) {
    const s = remote[p.id]; if (!s) return;
    for (const [nx, ny, pr] of p.pts) {
      const pt = { x: nx * W, y: ny * H, t: now(), pr: pr === undefined ? 1 : pr };
      s.pts.push(pt);
      sara.finger(pt.x, pt.y, true);
    }
    redraw();
  },
  remoteEnd(p) {
    lastInkAt = Date.now(); sara.presence(false); sara.finger(0, 0, false); buzz(16); redraw();
    window.TRACE_BOARD && TRACE_BOARD.inked();
  },
  remoteHeart() { heartArrive('partner'); },
  remoteClear() { strokes = strokes.filter(k => k.who === 'fx'); redraw(); toast('they cleared the canvas'); },
  remoteSky(p) { window.TRACE_SKY && TRACE_SKY(p.name, p.strength); },
  remoteTug() { stringTug('sara'); },
  remoteNote(t2) { writeOnCanvas(t2); },
  partner(on, name) {
    const sim = $('#sim');
    if (sim) sim.style.opacity = on ? .28 : 1;
    $('#presence-txt').textContent = on ? ((name || 'They') + ' is here') : 'Maya is here';
    $('#presence').classList.toggle('live', on);
    if (on) { sara.clear(); log('REAL PARTNER: ' + name + ' — simulation standing down'); }
    else log('partner left — simulation resumes');
  },
};

log('simulation ready — you and a simulated Sara share this canvas');
toast('draw anywhere. the room pill opens all ' + FEATURES.filter(f => f.id).length + ' features.', 3600);

})();
