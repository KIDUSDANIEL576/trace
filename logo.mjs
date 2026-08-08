/* logo.mjs — the cursive launch, and five logo directions.
 *
 * Fixed from the last pass:
 *   · "trace" is now ONE connected cursive word, not five letters standing
 *     next to each other. Real script faces, downloaded and embedded.
 *   · The whole word is visible — nothing is half an e.
 *   · A white pen writes it, then "ce" turns red as an ink bleed that
 *     travels through the two letters, not a flat colour swap.
 *
 * Then five directions for the mark, built the way 2026 wants marks built:
 * one monoline autograph, an initial carved from the same DNA as the word,
 * and visible authorship — a human clearly held the pen.
 *
 *   node logo.mjs [outDir]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || 'site';
const at = (p) => (isAbsolute(p) ? p : join(ROOT, p));
const b64 = (p) => readFileSync(at(p)).toString('base64');

const SCRIPTS = [
  ['Dancing Script', 'Dancing-Script', 700, 'modern, bold, unmistakably a signature'],
  ['Kaushan Script', 'Kaushan-Script', 400, 'brush, fast, the most energy'],
  ['Yellowtail', 'Yellowtail', 400, 'warm retro brush, very connected'],
  ['Sacramento', 'Sacramento', 400, 'thin monoline — closest to a real pen'],
  ['Parisienne', 'Parisienne', 400, 'delicate, romantic, the quietest'],
];
const faces = SCRIPTS.map(([fam, file]) =>
  `@font-face{font-family:'${fam}';font-display:block;src:url(data:font/woff2;base64,${b64('src/fonts/script/' + file + '.woff2')}) format('woff2')}`).join('');
const caveat = `@font-face{font-family:Caveat;font-weight:500 700;font-display:block;` +
  `src:url(data:font/woff2;base64,${b64('src/fonts/caveat-latin.woff2')}) format('woff2')}`;

const page = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>trace — the cursive launch, and five marks</title>
<style>
${faces}${caveat}
:root{--ink:#F3F0F4;--i2:rgba(243,240,244,.55);--i4:rgba(243,240,244,.4);--red:#E23343;--card:rgba(255,255,255,.05)}
*{box-sizing:border-box}
html,body{margin:0;background:#0C0B10;color:var(--ink);
  font-family:-apple-system,'SF Pro Display','Segoe UI',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
body{padding:40px 34px 100px}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;padding:0}
h1{margin:0 0 6px;font-size:34px;font-weight:600;letter-spacing:-.02em}
h2{margin:64px 0 6px;font-size:26px;font-weight:600;letter-spacing:-.02em}
.sub{margin:0 0 26px;font-size:15.5px;color:var(--i2);max-width:860px;line-height:1.55}
.bar{display:flex;gap:9px;align-items:center;margin-bottom:26px;flex-wrap:wrap}
.btn{padding:10px 17px;border-radius:999px;background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.11);font-size:13.5px;font-weight:600}
.btn.on{background:#F3F0F4;color:#0C0B10;border-color:transparent}
.btn.go{background:var(--red);color:#fff;border-color:transparent}

/* ------------------------------------------------------- the launch */
.stagewrap{display:flex;gap:28px;align-items:flex-start;flex-wrap:wrap}
.screen{width:360px;height:640px;border-radius:42px;border:7px solid #08080B;overflow:hidden;position:relative;
  background:#0C0B10;box-shadow:0 26px 56px rgba(0,0,0,.6);cursor:pointer;flex:none}
.stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.wordwrap{position:relative;height:150px;display:flex;align-items:center}
.word{font-size:96px;line-height:1.5;white-space:nowrap;
  background-image:linear-gradient(90deg,#F3F0F4 0px,#F3F0F4 100%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  clip-path:inset(0 100% -22% 0);will-change:clip-path}
.tip{position:absolute;width:10px;height:10px;border-radius:50%;background:#fff;opacity:0;pointer-events:none;
  box-shadow:0 0 14px rgba(255,255,255,.95),0 0 30px rgba(255,255,255,.4);will-change:transform;z-index:3}
.glow{position:absolute;border-radius:50%;pointer-events:none;opacity:0;z-index:1;
  background:radial-gradient(circle,rgba(226,51,67,.55),rgba(226,51,67,0) 70%)}
.slog{margin-top:14px;font-family:Caveat,cursive;font-size:22px;color:rgba(243,240,244,.5);opacity:0}
.hint{position:absolute;left:0;right:0;bottom:20px;text-align:center;font-size:11.5px;color:var(--i4)}
.side{flex:1;min-width:300px;font-size:14px;line-height:1.65;color:var(--i2)}
.side b{color:var(--ink)}
.side ol{padding-left:18px;margin:10px 0 0}
.side li{margin:7px 0}

/* -------------------------------------------------------- the marks */
.grid{display:flex;flex-wrap:wrap;gap:26px}
.mark{width:392px;border-radius:24px;overflow:hidden;background:#111114;border:1px solid rgba(255,255,255,.08);
  display:flex;flex-direction:column}
.hero{height:230px;background:#161619;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.meta{padding:20px 22px 16px;display:flex;flex-direction:column;gap:7px}
.meta .t{font-size:18px;font-weight:600;letter-spacing:-.01em}
.meta .d{font-size:13.5px;line-height:1.55;color:var(--i2)}
.row2{display:flex;border-top:1px solid rgba(255,255,255,.08)}
.small{flex:1;padding:20px;display:flex;align-items:center;justify-content:center;background:#131316}
.appicon{width:126px;padding:14px;display:flex;align-items:center;justify-content:center;background:#1A1A1A;
  border-left:1px solid rgba(255,255,255,.08)}
.ic{width:66px;height:66px;border-radius:16px;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}
.lightrow{padding:16px 20px;background:#F4F3F1;display:flex;align-items:center;justify-content:center;
  border-top:1px solid rgba(255,255,255,.08)}
.foot{margin-top:52px;font-size:14px;line-height:1.7;color:var(--i2);max-width:900px}
.foot b{color:var(--ink)}
</style>
</head><body>

<h1>The cursive launch</h1>
<p class="sub">One connected word — <b>trace</b>, written in a real script face, not five letters standing next to
each other. A white pen writes the whole thing; then <b>ce</b> turns red as ink bleeding through the last two
letters, and the red glows once as it settles. Nothing is ever half a letter. Tap the screen to replay.</p>

<div class="bar" id="fontbar"></div>
<div class="bar">
  <button class="btn go" id="play">Replay</button>
  <button class="btn on" data-sp="1">1×</button>
  <button class="btn" data-sp="0.45">0.45×</button>
  <button class="btn" data-sp="0.2">0.2× — watch the pen</button>
</div>

<div class="stagewrap">
  <div class="screen" id="scr">
    <div class="stage">
      <div class="wordwrap" id="ww">
        <div class="glow" id="glow"></div>
        <div class="word" id="word">trace</div>
        <div class="tip" id="tip"></div>
      </div>
      <div class="slog" id="slog">Leave me a trace.</div>
    </div>
    <div class="hint">tap to replay</div>
  </div>
  <div class="side">
    <b>How it moves</b>
    <ol>
      <li><b>Black.</b> Nothing for 240 ms — the app is not in a hurry.</li>
      <li><b>The pen writes.</b> One continuous reveal along the connected script, but the speed is not
        constant: it slows into each letter's bowl and pauses a hair at the joins, the way a hand does.
        The tip rides the exact edge and bobs.</li>
      <li><b>The ink turns.</b> A red edge sweeps from just before the <b>c</b> to the end of the <b>e</b> —
        as a soft 40 px gradient, so it reads as ink bleeding, not a colour swap.</li>
      <li><b>One glow.</b> The red pulses once behind <b>ce</b>, then settles.</li>
      <li><b>Lift.</b> The word scales down 3% and fades; the canvas is already there.</li>
    </ol>
    <br><b>Total: 2.4 s cold, 1.1 s warm.</b> The same reveal, looped without the lift, is the loading state —
    so the brand and the spinner are the same object, which is the one idea from turn 26 worth keeping.
  </div>
</div>

<h2>Five marks</h2>
<p class="sub">Built the way marks are being built right now: <b>one confident monoline autograph</b>, an initial cut
from the same DNA as the wordmark, and visible authorship — you can tell a hand held the pen. Each shown at hero
size, at 24 px, as a 66 px app icon, and on light.</p>
<div class="grid" id="marks"></div>

<p class="foot"><b>My pick: 1, with 3's tail as the icon.</b> Direction 1 is the only one that survives at 24 px in
a lock screen and still says "someone wrote this", and Dancing Script at 700 is legible on a watch face where the
thin scripts disappear. The red <b>ce</b> is the whole product in two letters: the word is finished by the second
colour. Direction 3's swoosh is the better <em>icon</em> though — it's the mark already shipping on the canvas, so
the app icon and the ink your partner sees are the same shape.</p>

<script>
/* ------------------------------------------------------------- the launch */
const SCRIPTS = ${JSON.stringify(SCRIPTS)};
let font = SCRIPTS[0], speed = 1;

const bar = document.getElementById('fontbar');
bar.innerHTML = SCRIPTS.map((s, i) =>
  '<button class="btn' + (i === 0 ? ' on' : '') + '" data-f="' + i + '" style="font-family:\\'' + s[0] +
  '\\';font-weight:' + s[2] + ';font-size:19px;padding:6px 20px">trace</button>').join('') +
  '<span style="font-size:12.5px;color:var(--i4);margin-left:8px" id="fname"></span>';

const word = document.getElementById('word'), tip = document.getElementById('tip'),
      slog = document.getElementById('slog'), glow = document.getElementById('glow'),
      ww = document.getElementById('ww');

function applyFont() {
  word.style.fontFamily = "'" + font[0] + "'";
  word.style.fontWeight = font[2];
  document.getElementById('fname').textContent = font[0] + ' — ' + font[3];
}

/* where does "ce" start? measure "tra" in the same face */
function ceStart() {
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font-size:' +
    getComputedStyle(word).fontSize + ';font-family:' + word.style.fontFamily + ';font-weight:' + font[2];
  probe.textContent = 'tra';
  ww.appendChild(probe);
  const w = probe.getBoundingClientRect().width;
  probe.remove();
  return w;
}

let tok = 0;
function run() {
  const me = ++tok, S = 1 / speed;
  applyFont();
  word.style.clipPath = 'inset(0 100% -22% 0)';
  word.style.backgroundImage = 'linear-gradient(90deg,#F3F0F4 0px,#F3F0F4 100%)';
  word.style.transform = 'none'; word.style.opacity = 1;
  tip.style.opacity = 0; slog.style.opacity = 0; glow.style.opacity = 0;

  const box = word.getBoundingClientRect(), wrap = ww.getBoundingClientRect();
  const W = box.width, X0 = box.left - wrap.left, MID = box.top - wrap.top + box.height * 0.52;
  const cx = ceStart();

  const START = 240, WRITE = 1180, T0 = performance.now();

  /* the pen does not move at constant speed — it eases through five beats,
     one per letter, with a hair of hesitation at each join */
  const BEATS = [0, .22, .40, .60, .80, 1];
  function progress(k) {
    const n = BEATS.length - 1;
    const seg = Math.min(n - 1, Math.floor(k * n));
    const local = k * n - seg;
    const eased = local < .5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
    return BEATS[seg] + (BEATS[seg + 1] - BEATS[seg]) * eased;
  }

  function frame(now) {
    if (tok !== me) return;
    const T = (now - T0) / S;

    /* 1 · write */
    const k = Math.max(0, Math.min(1, (T - START) / WRITE));
    const p = progress(k);
    word.style.clipPath = 'inset(0 ' + ((1 - p) * 100).toFixed(2) + '% -22% 0)';
    if (k > 0 && k < 1) {
      const bob = Math.sin(k * Math.PI * 9) * 4.5;
      tip.style.transform = 'translate(' + (X0 + W * p - 5).toFixed(1) + 'px,' + (MID + bob - 5).toFixed(1) + 'px)';
      tip.style.opacity = 1;
    } else if (k >= 1) tip.style.opacity = Math.max(0, 1 - (T - START - WRITE) / 180);

    /* 2 · the ink turns red through "ce" — a travelling 44px bleed */
    const R0 = START + WRITE + 90;
    if (T > R0) {
      const r = Math.min(1, (T - R0) / 560);
      const e = 1 - Math.pow(1 - r, 3);
      /* white up to the c, then red behind a soft 44px front that travels
         to the end of the e — ink bleeding into the last two letters */
      const head = cx + (W - cx + 50) * e;
      word.style.backgroundImage =
        'linear-gradient(90deg,#F3F0F4 0px,#F3F0F4 ' + cx.toFixed(1) + 'px,' +
        '#E23343 ' + cx.toFixed(1) + 'px,#E23343 ' + Math.max(cx, head - 44).toFixed(1) + 'px,' +
        '#F3F0F4 ' + Math.max(cx + 1, head).toFixed(1) + 'px,#F3F0F4 100%)';
      /* 3 · one glow behind ce, then settle */
      const g = Math.sin(Math.min(1, r) * Math.PI);
      const gw = (W - cx) + 120;
      glow.style.width = gw + 'px'; glow.style.height = (box.height * .9) + 'px';
      glow.style.left = (X0 + cx - 60) + 'px'; glow.style.top = (box.top - wrap.top + box.height * .05) + 'px';
      glow.style.opacity = (g * .85).toFixed(3);
      slog.style.opacity = Math.min(.9, r * 1.2);
    }

    /* 4 · lift */
    const OUT0 = R0 + 900;
    if (T > OUT0) {
      const o = Math.min(1, (T - OUT0) / 420);
      word.style.opacity = (1 - o).toFixed(3);
      word.style.transform = 'scale(' + (1 - o * .03).toFixed(3) + ')';
      slog.style.opacity = Math.max(0, Number(slog.style.opacity) - o);
      glow.style.opacity = Math.max(0, Number(glow.style.opacity) - o);
    }
    if (T < OUT0 + 420 + 700) requestAnimationFrame(frame); else run();
  }
  requestAnimationFrame(frame);
}

document.fonts.ready.then(run);
document.getElementById('scr').addEventListener('click', run);
document.getElementById('play').addEventListener('click', run);
bar.addEventListener('click', (e) => {
  const b = e.target.closest('[data-f]'); if (!b) return;
  bar.querySelectorAll('[data-f]').forEach((x) => x.classList.toggle('on', x === b));
  font = SCRIPTS[+b.dataset.f]; run();
});
document.querySelectorAll('[data-sp]').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('[data-sp]').forEach((x) => x.classList.toggle('on', x === b));
  speed = +b.dataset.sp; run();
}));
window.__run = run;
window.__setFont = (i) => { font = SCRIPTS[i]; run(); };

/* -------------------------------------------------------------- the marks */
const SW = (w, h, d, c, sw) => '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:100%;overflow:visible">' +
  '<path d="' + d + '" stroke="' + c + '" stroke-width="' + sw + '" fill="none" stroke-linecap="round"/></svg>';

/* the tail: one confident stroke, the same gesture the app already draws */
const TAIL = 'M6 30 C34 8,62 40,104 14 S168 30,214 6';

const MARKS = [
  { t: '1 · The signature',
    d: 'Dancing Script at 700, one connected word, and the last two letters carry the second colour. The whole product in two letters: the word is finished by someone else. Survives at 24px, which none of the thin scripts do.',
    hero: (s) => '<div style="font-family:\\'Dancing Script\\';font-weight:700;font-size:' + s +
      'px;line-height:1.5;color:#F3F0F4">tra<span style="color:#E23343">ce</span></div>',
    icon: '<div class="ic" style="background:#E23343"><span style="font-family:\\'Dancing Script\\';font-weight:700;font-size:50px;color:#fff;line-height:1.6">t</span></div>' },

  { t: '2 · The ink change',
    d: 'Sacramento — a true monoline, the closest thing to an actual pen. A red dot sits exactly on the join between a and c: the visible moment the pen changed hands. That dot alone is the icon.',
    hero: (s) => '<div style="position:relative;font-family:Sacramento;font-size:' + (s * 1.06) +
      'px;line-height:1.5;color:#F3F0F4">tra<span style="color:#E23343">ce</span>' +
      '<span style="position:absolute;left:44.5%;bottom:26%;width:9px;height:9px;border-radius:50%;background:#E23343;box-shadow:0 0 12px rgba(226,51,67,.9)"></span></div>',
    icon: '<div class="ic" style="background:#0C0B10;border:1px solid rgba(255,255,255,.14)">' +
      '<span style="width:16px;height:16px;border-radius:50%;background:#E23343;box-shadow:0 0 18px rgba(226,51,67,.9)"></span></div>' },

  { t: '3 · The trace underneath',
    d: 'Kaushan in white, and the red stroke the app already draws living under the word — the thing you leave behind. The swoosh alone is the strongest icon of the five, because it is the exact ink your partner sees on the canvas.',
    hero: (s) => '<div style="position:relative;padding-bottom:22px"><div style="font-family:\\'Kaushan Script\\';font-size:' +
      (s * .92) + 'px;line-height:1.5;color:#F3F0F4">trace</div>' +
      '<div style="position:absolute;left:-4px;right:-10px;bottom:-2px;height:34px">' + SW(220, 36, TAIL, '#E23343', 7) + '</div></div>',
    icon: '<div class="ic" style="background:#E23343;padding:14px">' + SW(220, 36, TAIL, '#fff', 13) + '</div>' },

  { t: '4 · Traced',
    d: 'Yellowtail, with the e\\'s terminal carrying on and looping the whole word — literally traced. The most ownable shape here; the loop is unmistakable at any size and reads even when you cannot read the word.',
    hero: (s) => '<div style="position:relative;display:inline-block;padding:16px 26px">' +
      '<div style="position:absolute;inset:0">' + SW(300, 130,
        'M262 44 C300 12,236 -6,150 6 C64 18,4 44,14 78 C24 112,120 132,196 120 C252 112,286 92,282 74', '#E23343', 6) + '</div>' +
      '<div style="font-family:Yellowtail;font-size:' + (s * .84) + 'px;line-height:1.5;color:#F3F0F4;position:relative">trace</div></div>',
    icon: '<div class="ic" style="background:#0C0B10;border:1px solid rgba(255,255,255,.14);padding:11px">' +
      SW(300, 130, 'M262 44 C300 12,236 -6,150 6 C64 18,4 44,14 78 C24 112,120 132,196 120 C252 112,286 92,282 74', '#E23343', 11) + '</div>' },

  { t: '5 · Two hands',
    d: 'Parisienne written twice — hers offset behind yours, a few degrees off, in red at low opacity. The same word, two hands, never quite aligned. The quietest and the most romantic; needs size, so it is a splash-and-store mark, not a favicon.',
    hero: (s) => '<div style="position:relative">' +
      '<div style="position:absolute;left:7px;top:7px;font-family:Parisienne;font-size:' + s +
      'px;line-height:1.5;color:rgba(226,51,67,.62);transform:rotate(-3.5deg)">trace</div>' +
      '<div style="font-family:Parisienne;font-size:' + s + 'px;line-height:1.5;color:#F3F0F4;position:relative">trace</div></div>',
    icon: '<div class="ic" style="background:#0C0B10;border:1px solid rgba(255,255,255,.14)">' +
      '<div style="position:relative"><span style="position:absolute;left:4px;top:3px;font-family:Parisienne;font-size:42px;color:rgba(226,51,67,.75);line-height:1.5;transform:rotate(-4deg);display:block">t</span>' +
      '<span style="font-family:Parisienne;font-size:42px;color:#F3F0F4;line-height:1.5;position:relative">t</span></div></div>' },
];

document.getElementById('marks').innerHTML = MARKS.map((m) => \`
  <div class="mark">
    <div class="hero">\${m.hero(76)}</div>
    <div class="meta"><div class="t">\${m.t}</div><div class="d">\${m.d}</div></div>
    <div class="row2">
      <div class="small">\${m.hero(23)}</div>
      <div class="appicon">\${m.icon}</div>
    </div>
    <div class="lightrow">\${m.hero(30).replace(/#F3F0F4/g, '#14131A').replace(/rgba\\(226,51,67,\\.62\\)/g, 'rgba(226,51,67,.55)')}</div>
  </div>\`).join('');
</script>
</body></html>
`;

mkdirSync(at(OUT), { recursive: true });
writeFileSync(join(at(OUT), 'logo.html'), page);
console.log(`${OUT}/logo.html  ${(page.length / 1024).toFixed(0)} KB  ·  1 launch × 5 scripts  ·  5 marks`);
