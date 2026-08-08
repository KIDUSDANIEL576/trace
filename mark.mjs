/* mark.mjs — THE mark: Dancing Script "trac" + the red swoosh as the e.
 *
 * Direction 1's hand, 27a's idea, the user's sketch: the word stops at c and
 * the last letter IS the stroke — a red swoosh that still reads as a cursive
 * e because it keeps the e's loop before it flies.
 *
 * The launch: a white pen writes t-r-a-c connected; the pen lifts for a
 * beat; a RED pen draws the swoosh-e — the tip follows the actual curve
 * (getPointAtLength, not a horizontal ride), the stroke lands with a flick
 * and one glow, the slogan breathes in, then the lift. Loop mode = the same
 * write without the lift: brand and spinner, one object.
 *
 *   node mark.mjs [outDir]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || 'site';
const at = (p) => (isAbsolute(p) ? p : join(ROOT, p));
const b64 = (p) => readFileSync(at(p)).toString('base64');

const ds = `@font-face{font-family:'Dancing Script';font-weight:700;font-display:block;` +
  `src:url(data:font/woff2;base64,${b64('src/fonts/script/Dancing-Script.woff2')}) format('woff2')}`;
const caveat = `@font-face{font-family:Caveat;font-weight:500 700;font-display:block;` +
  `src:url(data:font/woff2;base64,${b64('src/fonts/caveat-latin.woff2')}) format('woff2')}`;

/* The swoosh-e: the ORIGINAL mark's gesture (27a's single wave), sitting in
   the e's slot — up, down, up, with a small flick. No loop; the sketch the
   user drew has none, and the old logo is exactly this stroke. */
const SWOOSH = 'M6 50 C28 12, 60 66, 98 28 C110 17, 122 15, 133 21';

const page = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>trace — the mark</title>
<style>
${ds}${caveat}
:root{--ink:#F3F0F4;--i2:rgba(243,240,244,.55);--i4:rgba(243,240,244,.4);--red:#E23343}
*{box-sizing:border-box}
html,body{margin:0;background:#0C0B10;color:var(--ink);
  font-family:-apple-system,'SF Pro Display','Segoe UI',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
body{padding:40px 34px 100px}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;padding:0}
h1{margin:0 0 6px;font-size:34px;font-weight:600;letter-spacing:-.02em}
h2{margin:60px 0 16px;font-size:24px;font-weight:600;letter-spacing:-.02em}
.sub{margin:0 0 26px;font-size:15.5px;color:var(--i2);max-width:840px;line-height:1.55}
.bar{display:flex;gap:9px;align-items:center;margin-bottom:26px;flex-wrap:wrap}
.btn{padding:10px 17px;border-radius:999px;background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.11);font-size:13.5px;font-weight:600}
.btn.on{background:#F3F0F4;color:#0C0B10;border-color:transparent}
.btn.go{background:var(--red);color:#fff;border-color:transparent}

.stagewrap{display:flex;gap:30px;align-items:flex-start;flex-wrap:wrap}
.screen{width:380px;height:660px;border-radius:44px;border:7px solid #08080B;overflow:hidden;position:relative;
  background:#0C0B10;box-shadow:0 26px 56px rgba(0,0,0,.6);cursor:pointer;flex:none}
.stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.lock{position:relative;display:flex;align-items:baseline}
.trac{font-family:'Dancing Script';font-weight:700;font-size:104px;line-height:1.4;color:#F3F0F4;
  clip-path:inset(0 100% -20% -8%);will-change:clip-path}
.sw{position:absolute;overflow:visible;pointer-events:none}
.sw path{fill:none;stroke:var(--red);stroke-linecap:round}
.tip{position:absolute;width:10px;height:10px;border-radius:50%;background:#fff;opacity:0;pointer-events:none;
  box-shadow:0 0 14px rgba(255,255,255,.95),0 0 30px rgba(255,255,255,.4);will-change:transform;z-index:4}
.tip.red{box-shadow:0 0 14px rgba(226,51,67,.95),0 0 34px rgba(226,51,67,.55)}
.glow{position:absolute;border-radius:50%;pointer-events:none;opacity:0;z-index:1;
  background:radial-gradient(circle,rgba(226,51,67,.5),rgba(226,51,67,0) 70%)}
.slog{margin-top:20px;font-family:Caveat,cursive;font-size:23px;color:rgba(243,240,244,.5);opacity:0}
.hint{position:absolute;left:0;right:0;bottom:20px;text-align:center;font-size:11.5px;color:var(--i4)}
.side{flex:1;min-width:300px;font-size:14px;line-height:1.65;color:var(--i2)}
.side b{color:var(--ink)}

/* the lockup, everywhere it has to live */
.sheet{display:flex;flex-wrap:wrap;gap:22px}
.card{border-radius:22px;overflow:hidden;background:#111114;border:1px solid rgba(255,255,255,.08)}
.cap{padding:12px 16px;font-size:12px;color:var(--i4);border-top:1px solid rgba(255,255,255,.07)}
.cell{display:flex;align-items:center;justify-content:center;background:#161619}
</style>
</head><body>

<h1>The mark</h1>
<p class="sub"><b>trac</b> in the signature hand — and the e is the red stroke itself. It keeps the e's loop before
it flies, so it still reads as a letter; it ends the way your ink ends on the canvas, so it is also the product.
The word is always whole: four letters and one gesture. Tap to replay.</p>

<div class="bar">
  <button class="btn go" id="play">Replay</button>
  <button class="btn" id="loopb">Loop mode — the loading state</button>
  <button class="btn on" data-sp="1">1×</button>
  <button class="btn" data-sp="0.45">0.45×</button>
  <button class="btn" data-sp="0.2">0.2× — watch the pen</button>
</div>

<div class="stagewrap">
  <div class="screen" id="scr">
    <div class="stage">
      <div class="lock" id="lock">
        <div class="glow" id="glow"></div>
        <div class="trac" id="trac">trac</div>
        <svg class="sw" id="sw" viewBox="0 0 140 70"><path id="swp" d="${SWOOSH}" stroke-width="8"/></svg>
        <div class="tip" id="tip"></div>
      </div>
      <div class="slog" id="slog">Leave me a trace.</div>
    </div>
    <div class="hint">tap to replay</div>
  </div>

  <div class="side">
    <b>The beats</b><br><br>
    <b>0.00</b> — black. 240 ms of nothing.<br>
    <b>0.24</b> — a white pen writes <b>t-r-a-c</b>, one connected reveal, easing through each letter.<br>
    <b>1.15</b> — the pen lifts. A 170 ms beat of stillness — the anticipation is the design.<br>
    <b>1.32</b> — a <b>red</b> pen takes over and draws the e: the tip follows the actual curve of the stroke,
    through the loop, into the tail.<br>
    <b>1.85</b> — the flick. The tail overshoots 4° and springs back; the red glows once.<br>
    <b>2.10</b> — <i>Leave me a trace.</i> breathes in.<br>
    <b>2.90</b> — the lift. 3% scale down, fade; the canvas is already behind it.<br><br>
    <b>Loop mode</b> is the same write with no lift — white writes, red answers, forever. The loading state
    and the brand are one object.
  </div>
</div>

<h2>Where it lives</h2>
<div class="sheet" id="sheet"></div>

<script>
/* ------------------------------------------------------------ geometry */
const lock = document.getElementById('lock'), trac = document.getElementById('trac'),
      sw = document.getElementById('sw'), swp = document.getElementById('swp'),
      tip = document.getElementById('tip'), glow = document.getElementById('glow'),
      slog = document.getElementById('slog');

/* hang the swoosh off the c: measured against the text, every run */
function place() {
  const b = trac.getBoundingClientRect();
  const fs = parseFloat(getComputedStyle(trac).fontSize);
  const w = fs * 1.06, h = w * .5;
  sw.style.width = w + 'px'; sw.style.height = h + 'px';
  /* the entry (y=42/70 of the box) meets the c's exit stroke, and the loop
     sits on the x-height band like a real cursive e */
  sw.style.left = (b.width - fs * .13) + 'px';
  sw.style.top = (b.height * .565 - h * .60) + 'px';
  swp.setAttribute('stroke-width', (8 * fs / 104).toFixed(2));
  lock.style.marginLeft = '-' + (w * .5) + 'px';    /* centre incl. the tail */
  return { b, w, h };
}

let tok = 0, speed = 1, loop = false;
function run() {
  const me = ++tok, S = 1 / speed;
  trac.style.clipPath = 'inset(0 100% -20% -8%)';
  trac.style.opacity = 1; trac.style.transform = 'none';
  lock.style.opacity = 1; lock.style.transform = 'none';
  sw.style.opacity = 1; sw.style.transform = 'none'; sw.style.transformOrigin = '6% 62%';
  tip.style.opacity = 0; tip.classList.remove('red');
  slog.style.opacity = 0; glow.style.opacity = 0;

  const { b } = place();
  const wrap = lock.getBoundingClientRect();
  const X0 = 0, W = b.width, MID = b.height * .52;
  const L = swp.getTotalLength();
  swp.style.strokeDasharray = L; swp.style.strokeDashoffset = L;

  const START = 240, WRITE = 910, LIFT = 170, DRAW = 530;
  const R0 = START + WRITE + LIFT;             /* red pen starts */
  const FLICK = R0 + DRAW;                     /* tail lands */
  const OUT0 = FLICK + 1050;                   /* lift, unless looping */
  const T0 = performance.now();

  const BEATS = [0, .27, .52, .76, 1];         /* t r a c */
  function prog(k) {
    const n = BEATS.length - 1;
    const seg = Math.min(n - 1, Math.floor(k * n));
    const local = k * n - seg;
    const e = local < .5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
    return BEATS[seg] + (BEATS[seg + 1] - BEATS[seg]) * e;
  }

  function frame(now) {
    if (tok !== me) return;
    const T = (now - T0) / S;

    /* white writes trac */
    const k = Math.max(0, Math.min(1, (T - START) / WRITE));
    const p = prog(k);
    trac.style.clipPath = 'inset(0 ' + ((1 - p) * 108).toFixed(2) + '% -20% -8%)';
    if (k > 0 && k < 1) {
      const bob = Math.sin(k * Math.PI * 7) * 4.5;
      tip.style.transform = 'translate(' + (X0 + W * p - 5).toFixed(1) + 'px,' + (MID + bob - 5).toFixed(1) + 'px)';
      tip.style.opacity = 1; tip.classList.remove('red');
    } else if (k >= 1 && T < R0) tip.style.opacity = Math.max(0, 1 - (T - START - WRITE) / (LIFT * .8));

    /* red draws the e — the tip rides the real curve */
    if (T > R0) {
      const r = Math.max(0, Math.min(1, (T - R0) / DRAW));
      const e = 1 - Math.pow(1 - r, 2.4);
      swp.style.strokeDashoffset = (L * (1 - e)).toFixed(2);
      if (r < 1) {
        const pt = swp.getPointAtLength(L * e);
        const sb = sw.getBoundingClientRect();
        const scale = sb.width / 120;
        tip.style.transform = 'translate(' + (sb.left - wrap.left + pt.x * scale - 5).toFixed(1) +
          'px,' + (sb.top - wrap.top + pt.y * scale - 5).toFixed(1) + 'px)';
        tip.style.opacity = 1; tip.classList.add('red');
      } else tip.style.opacity = Math.max(0, 1 - (T - R0 - DRAW) / 160);
    }

    /* the flick: overshoot and spring, plus one glow */
    if (T > FLICK) {
      const f = Math.min(1, (T - FLICK) / 480);
      const spring = Math.sin(f * Math.PI * 2.4) * Math.pow(1 - f, 1.6) * 4;
      sw.style.transform = 'rotate(' + spring.toFixed(2) + 'deg)';
      const g = Math.sin(Math.min(1, f * 1.25) * Math.PI);
      const sb = sw.getBoundingClientRect();
      glow.style.width = sb.width * 1.5 + 'px'; glow.style.height = sb.height * 1.7 + 'px';
      glow.style.left = (sb.left - wrap.left - sb.width * .25) + 'px';
      glow.style.top = (sb.top - wrap.top - sb.height * .35) + 'px';
      glow.style.opacity = (g * .8).toFixed(3);
      slog.style.opacity = Math.min(.9, f * 1.5);
    }

    /* lift — or loop */
    if (T > OUT0) {
      if (loop) { run(); return; }
      const o = Math.min(1, (T - OUT0) / 420);
      lock.style.opacity = (1 - o).toFixed(3);
      lock.style.transform = 'scale(' + (1 - o * .03).toFixed(3) + ')';
      slog.style.opacity = Math.max(0, .9 - o);
    }
    if (T < OUT0 + 420 + 720) requestAnimationFrame(frame); else run();
  }
  requestAnimationFrame(frame);
}

document.fonts.ready.then(run);
document.getElementById('scr').addEventListener('click', run);
document.getElementById('play').addEventListener('click', () => { loop = false; run(); });
document.getElementById('loopb').addEventListener('click', function () {
  loop = !loop; this.classList.toggle('on', loop); run();
});
document.querySelectorAll('[data-sp]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-sp]').forEach((x) => x.classList.toggle('on', x === b));
  speed = +b.dataset.sp; run();
}));
window.__run = run;

/* ------------------------------------------------------------ the sheet */
const SWOOSH = '${SWOOSH}';
const lockup = (fs, ink) => \`
  <div style="position:relative;display:inline-flex;align-items:baseline;margin-right:\${fs * .5}px">
    <span style="font-family:'Dancing Script';font-weight:700;font-size:\${fs}px;line-height:1.4;color:\${ink}">trac</span>
    <svg viewBox="0 0 140 70" style="position:absolute;left:calc(100% - \${fs * .115}px);top:\${(fs * 1.4 * .385).toFixed(1)}px;
      width:\${fs * .92}px;height:\${fs * .43}px;overflow:visible">
      <path d="\${SWOOSH}" fill="none" stroke="#E23343" stroke-width="8.5" stroke-linecap="round"/></svg>
  </div>\`;
const swooshOnly = (px, c) => \`
  <svg viewBox="0 0 140 70" style="width:\${px}px;height:\${px * .5}px;overflow:visible">
    <path d="\${SWOOSH}" fill="none" stroke="\${c}" stroke-width="15" stroke-linecap="round"/></svg>\`;

document.getElementById('sheet').innerHTML = \`
  <div class="card" style="width:430px">
    <div class="cell" style="height:190px;padding-right:40px">\${lockup(84, '#F3F0F4')}</div>
    <div class="cap">Hero — splash, store, marketing</div>
  </div>
  <div class="card" style="width:300px">
    <div class="cell" style="height:110px;padding-right:20px">\${lockup(30, '#F3F0F4')}</div>
    <div class="cell" style="height:80px;background:#F4F3F1;padding-right:20px">\${lockup(30, '#14131A')}</div>
    <div class="cap">In-app header · on light</div>
  </div>
  <div class="card" style="width:300px">
    <div class="cell" style="height:190px;gap:20px">
      <div style="width:74px;height:74px;border-radius:18px;background:#E23343;display:flex;align-items:center;justify-content:center">\${swooshOnly(52, '#fff')}</div>
      <div style="width:74px;height:74px;border-radius:18px;background:linear-gradient(160deg,#1B2A6B,#0E1740);border:1px solid rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center">\${swooshOnly(52, '#E23343')}</div>
      <div style="width:30px;height:30px;border-radius:8px;background:#E23343;display:flex;align-items:center;justify-content:center">\${swooshOnly(21, '#fff')}</div>
    </div>
    <div class="cap">App icon, two grounds · 30px favicon — the e alone IS the icon</div>
  </div>\`;
</script>
</body></html>
`;

mkdirSync(at(OUT), { recursive: true });
writeFileSync(join(at(OUT), 'mark.html'), page);
console.log(`${OUT}/mark.html  ${(page.length / 1024).toFixed(0)} KB`);
