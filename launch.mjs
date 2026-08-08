/* launch.mjs — three launch animations, side by side, to pick one.
 *
 * All three share the same spine, which is what you asked for:
 *   blank  →  the word "trace" is WRITTEN, letter by letter, with a pen tip
 *             you can see  →  then the stylish move that leaves the logo.
 *
 * They differ only in the last beat — the part that turns a wordmark into
 * the 27a mark. Each is the animation and the logo at the same time.
 *
 *   node launch.mjs [outDir]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || 'site';
const at = (p) => (isAbsolute(p) ? p : join(ROOT, p));
const b64 = (p) => readFileSync(at(p)).toString('base64');

const caveat =
  `@font-face{font-family:Caveat;font-style:normal;font-weight:500 700;font-display:block;` +
  `src:url(data:font/woff2;base64,${b64('src/fonts/caveat-latin.woff2')}) format('woff2')}`;

const page = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>trace — three launches</title>
<style>
${caveat}
:root{--ink:#EDEFF7;--i2:rgba(237,239,247,.55);--i3:rgba(237,239,247,.45);--i4:rgba(237,239,247,.4);--red:#E23343}
*{box-sizing:border-box}
html,body{margin:0;background:#0A0A0C;color:var(--ink);
  font-family:-apple-system,'SF Pro Display','Segoe UI',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
body{padding:40px 34px 90px}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;padding:0}
h1{margin:0 0 6px;font-size:34px;font-weight:600;letter-spacing:-.02em}
.sub{margin:0 0 30px;font-size:15.5px;color:var(--i2);max-width:820px;line-height:1.55}
.bar{display:flex;gap:10px;align-items:center;margin-bottom:34px;flex-wrap:wrap}
.btn{padding:11px 20px;border-radius:999px;background:#EDEFF7;color:#0A0A0C;font-size:14px;font-weight:600}
.btn.ghost{background:rgba(255,255,255,.08);color:var(--ink);border:1px solid rgba(255,255,255,.12)}
.btn.on{background:var(--red);color:#fff}
.rack{display:flex;gap:30px;flex-wrap:wrap;align-items:flex-start}
.slot{width:330px}
.name{display:flex;align-items:baseline;gap:9px;margin-bottom:11px}
.name b{font-size:11px;font-weight:700;letter-spacing:.1em;padding:3px 8px;border-radius:6px;
  background:rgba(255,255,255,.09);color:rgba(237,239,247,.75)}
.name span{font-size:15px;font-weight:600}
.why{font-size:13px;line-height:1.55;color:var(--i2);margin-top:12px;min-height:76px}
.why em{color:var(--ink);font-style:normal;font-weight:600}
.screen{width:330px;height:640px;border-radius:40px;border:7px solid #08080B;overflow:hidden;position:relative;
  background:#0A0A0C;box-shadow:0 26px 56px rgba(0,0,0,.6);cursor:pointer}
.stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.wm{position:relative;display:flex;align-items:baseline;height:96px}
.wm .ltr{font-family:Caveat,cursive;font-weight:700;font-size:78px;line-height:1;color:#EDEFF7;
  display:inline-block;clip-path:inset(0 100% -25% 0);will-change:clip-path}
.tip{position:absolute;width:9px;height:9px;border-radius:50%;background:#fff;opacity:0;pointer-events:none;
  box-shadow:0 0 12px rgba(255,255,255,.9),0 0 26px rgba(255,255,255,.35);will-change:transform}
.tip.red{background:#fff;box-shadow:0 0 12px rgba(226,51,67,.95),0 0 30px rgba(226,51,67,.5)}
.slog{margin-top:26px;font-family:Caveat,cursive;font-size:23px;color:rgba(237,239,247,.5);opacity:0}
.under{position:absolute;left:0;bottom:-4px;height:0;overflow:visible}
.icon-morph{position:absolute;left:50%;top:50%;width:72px;height:72px;margin:-36px 0 0 -36px;border-radius:17px;
  background:var(--red);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;
  box-shadow:0 14px 34px rgba(226,51,67,.45)}
.hint{position:absolute;left:0;right:0;bottom:22px;text-align:center;font-size:11.5px;color:var(--i4)}
.strip{margin-top:34px}
.strip img{border-radius:10px;display:block}
.foot{margin-top:44px;font-size:13.5px;line-height:1.6;color:var(--i2);max-width:860px}
.foot b{color:var(--ink)}
</style>
</head><body>

<h1>Three launches</h1>
<p class="sub">Same spine in all three, the one you described: <b>black screen → the word is written, letter by letter,
by a pen you can see → then the move that leaves the logo behind.</b> They differ only in that last beat.
Tap any screen to replay it.</p>

<div class="bar">
  <button class="btn" id="all">Play all three</button>
  <button class="btn ghost on" data-sp="1">1×</button>
  <button class="btn ghost" data-sp="0.5">0.5× — slow</button>
  <button class="btn ghost" data-sp="0.25">0.25× — very slow</button>
</div>

<div class="rack" id="rack"></div>

<p class="foot"><b>What they have in common.</b> The pen tip is real — it rides the exact edge of the reveal, bobbing
slightly, pausing a beat between letters the way a hand does. Nothing is a wipe. The word is set in Caveat, the same
hand as the wordmark that already ships, so the launch and the logo are the same object.
<br><br><b>My pick is B.</b> The whole product is <i>two people, taking turns</i> — and B is the only one where you
can see two hands: yours writes four letters, hers finishes the word in red. It also gives you the loading state for
free, since the same two-tone stroke can loop forever without ever being a spinner.</p>

<script>
const LETTERS = ['t','r','a','c','e'];
const VARIANTS = [
  { id:'A', name:'One hand', why:'One pen writes the whole word, then the <em>e</em> lifts off the baseline and settles as the red mark. Simplest, warmest — the logo is something you finished writing.' },
  { id:'B', name:'Taking turns', why:'You write <em>trac</em> in white. Then the pen changes hands — <em>her</em> pen, in red, finishes the word. The mark is the letter she wrote. This is the product, in 1.9 seconds.' },
  { id:'C', name:'What\\'s left behind', why:'The whole word is written in red, then everything fades but the <em>e</em> — the trace that remains. It scales into the app icon, so launch and icon are literally the same shape.' },
];
let speed = 1;

const rack = document.getElementById('rack');
rack.innerHTML = VARIANTS.map(v => \`
  <div class="slot">
    <div class="name"><b>\${v.id}</b><span>\${v.name}</span></div>
    <div class="screen" id="scr\${v.id}">
      <div class="stage">
        <div class="wm" id="wm\${v.id}">
          \${LETTERS.map((l,i) => '<span class="ltr" data-i="'+i+'">'+l+'</span>').join('')}
          <div class="tip" id="tip\${v.id}"></div>
        </div>
        <div class="slog" id="slog\${v.id}">Leave me a trace.</div>
        <div class="icon-morph" id="ico\${v.id}">
          <span style="font-family:Caveat,cursive;font-weight:700;font-size:44px;color:#fff;line-height:1">e</span>
        </div>
      </div>
      <div class="hint">tap to replay</div>
    </div>
    <div class="why">\${v.why}</div>
  </div>\`).join('');

/* ---------------------------------------------------------------- engine */

function run(v) {
  const wm = document.getElementById('wm' + v);
  const tip = document.getElementById('tip' + v);
  const slog = document.getElementById('slog' + v);
  const ico = document.getElementById('ico' + v);
  const ltrs = [...wm.querySelectorAll('.ltr')];
  const token = (run.tok = (run.tok || {}));
  const me = (token[v] = (token[v] || 0) + 1);
  const S = 1 / speed;

  /* --- reset to black --- */
  ltrs.forEach((l) => { l.style.clipPath = 'inset(0 100% -25% 0)'; l.style.color = '#EDEFF7';
    l.style.opacity = 1; l.style.transform = 'none'; l.style.transition = 'none'; l.style.filter = 'none'; });
  tip.style.opacity = 0; tip.className = 'tip';
  const und = wm.querySelector('svg.und');
  if (und) und.remove();                      /* the trace is drawn fresh each time */
  slog.style.opacity = 0; slog.style.transform = 'none';
  ico.style.opacity = 0; ico.style.transform = 'scale(.6)';
  wm.style.opacity = 1; wm.style.transform = 'none';

  /* letter geometry, measured now so the pen rides the true edge */
  const wmBox = wm.getBoundingClientRect();
  const boxes = ltrs.map((l) => {
    const b = l.getBoundingClientRect();
    return { x: b.left - wmBox.left, w: b.width, y: b.top - wmBox.top, h: b.height };
  });

  /* a hand does not write at constant speed: wide letters take longer, and
     there is a short lift between them */
  const PER = 210, LIFT = 62, START = 260;
  const plan = boxes.map((b, i) => ({ i, dur: PER * (0.62 + b.w / 46), box: b }));
  let t = START;
  plan.forEach((p) => { p.t0 = t; t += p.dur + LIFT; });
  const writeEnd = t - LIFT;

  const ease = (x) => 1 - Math.pow(1 - x, 2.1);       /* pen slows into a letter */
  const t0 = performance.now();

  function frame(now) {
    if (token[v] !== me) return;
    const T = (now - t0) / S;

    /* --- write --- */
    let active = null;
    plan.forEach((p) => {
      const k = Math.max(0, Math.min(1, (T - p.t0) / p.dur));
      const e = ease(k);
      const l = ltrs[p.i];
      l.style.clipPath = 'inset(0 ' + ((1 - e) * 100).toFixed(2) + '% -25% 0)';
      /* B: her pen writes the last letter, in red */
      if (v === 'B' && p.i === 4) l.style.color = '#E23343';
      if (v === 'C') l.style.color = '#E23343';
      if (k > 0 && k < 1) active = { p, e };
    });

    if (active) {
      const { p, e } = active;
      const x = p.box.x + p.box.w * e;
      /* the tip sits on the letter's writing line and bobs a little */
      const bob = Math.sin(e * Math.PI * 2.2) * 5;
      const y = p.box.y + p.box.h * 0.62 + bob;
      tip.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      tip.style.opacity = 1;
      tip.className = 'tip' + ((v === 'B' && p.i === 4) || v === 'C' ? ' red' : '');
    } else if (T > writeEnd) { tip.style.opacity = 0; }

    /* --- the promise --- */
    if (T > writeEnd - 60) slog.style.opacity = Math.min(1, (T - writeEnd + 60) / 340);

    /* --- the stylish beat, per variant --- */
    const S0 = writeEnd + 260;
    if (T > S0) {
      const k = Math.min(1, (T - S0) / 620);
      const e = 1 - Math.pow(1 - k, 3);
      const eL = ltrs[4];
      if (v === 'A') {
        /* the e leaves the baseline, turns red on the way up, and lands as
           the mark — one gesture, the way you'd underline your own name */
        const arc = Math.sin(e * Math.PI);
        eL.style.color = 'rgb(' + Math.round(237 + (226 - 237) * e) + ',' +
          Math.round(239 + (51 - 239) * e) + ',' + Math.round(247 + (67 - 247) * e) + ')';
        eL.style.transform = 'translateY(' + (-26 * arc).toFixed(2) + 'px) rotate(' +
          (-14 * arc).toFixed(2) + 'deg) scale(' + (1 + .22 * arc + .06 * e).toFixed(3) + ')';
        eL.style.filter = e > .9 ? 'drop-shadow(0 0 14px rgba(226,51,67,' + ((e - .9) * 6).toFixed(2) + '))' : 'none';
      }
      if (v === 'B') {
        /* the red letter settles, and a red trace is left under the word */
        eL.style.transform = 'scale(' + (1 + .07 * Math.sin(e * Math.PI)).toFixed(3) + ')';
        drawUnder(v, e);
      }
      if (v === 'C') {
        /* everything fades but the e, which grows into the app icon */
        for (let i = 0; i < 4; i++) ltrs[i].style.opacity = (1 - e).toFixed(3);
        slog.style.opacity = Math.max(0, 1 - e * 1.6);
        eL.style.opacity = (1 - Math.min(1, e * 1.5)).toFixed(3);
        ico.style.opacity = Math.min(1, e * 1.8);
        ico.style.transform = 'scale(' + (.55 + .45 * e).toFixed(3) +
          ') rotate(' + ((1 - e) * -9).toFixed(2) + 'deg)';
      }
    }

    /* --- hold, then lift; the app is simply there --- */
    const OUT0 = S0 + 900;
    if (T > OUT0) {
      const o = Math.min(1, (T - OUT0) / 380);
      wm.style.opacity = 1 - o;
      slog.style.opacity = Math.min(Number(slog.style.opacity || 0), 1 - o);
      ico.style.opacity = Math.max(0, Number(ico.style.opacity || 0) - o);
      wm.style.transform = 'scale(' + (1 - o * .03).toFixed(3) + ')';
    }

    if (T < OUT0 + 380 + 800 / 1) requestAnimationFrame(frame);
    else run(v);   /* loop */
  }
  requestAnimationFrame(frame);
}

/* B's red trace under the word — the thing you leave behind */
function drawUnder(v, e) {
  const wm = document.getElementById('wm' + v);
  let svg = wm.querySelector('svg.und');
  if (!svg) {
    const b = wm.getBoundingClientRect();
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'und');
    svg.setAttribute('viewBox', '0 0 ' + Math.round(b.width) + ' 26');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.cssText = 'position:absolute;left:0;right:0;bottom:2px;width:100%;height:26px;overflow:visible';
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M4 17 C' + (b.width * .28) + ' 5,' + (b.width * .55) + ' 24,' + (b.width - 6) + ' 9');
    p.setAttribute('stroke', '#E23343'); p.setAttribute('stroke-width', '5');
    p.setAttribute('fill', 'none'); p.setAttribute('stroke-linecap', 'round');
    svg.appendChild(p); wm.appendChild(svg);
  }
  const p = svg.querySelector('path');
  const L = p.getTotalLength();
  p.style.strokeDasharray = L;
  p.style.strokeDashoffset = L * (1 - e);
}

/* ---------------------------------------------------------------- wiring */
document.fonts.ready.then(() => VARIANTS.forEach((v) => run(v.id)));
VARIANTS.forEach((v) => document.getElementById('scr' + v.id)
  .addEventListener('click', () => run(v.id)));
document.getElementById('all').addEventListener('click', () => VARIANTS.forEach((v) => run(v.id)));
document.querySelectorAll('[data-sp]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-sp]').forEach((x) => x.classList.toggle('on', x === b));
  speed = +b.dataset.sp;
  VARIANTS.forEach((v) => run(v.id));
}));
window.__runAll = () => VARIANTS.forEach((v) => run(v.id));
window.__run = run;
</script>
</body></html>
`;

mkdirSync(at(OUT), { recursive: true });
writeFileSync(join(at(OUT), 'launch.html'), page);
console.log(`${OUT}/launch.html  ${(page.length / 1024).toFixed(0)} KB  ·  3 variants`);
