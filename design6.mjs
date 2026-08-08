/* design6.mjs — the six surfaces that were built but never drawn, now drawn.
 *
 *   1. The colour cascade      — any colour, in a system that only ever had four
 *   2. Pen thickness           — shown as ink, never as numbers
 *   3. Pages: us / mine / hers — the core idea, finally with a shape
 *   4. Your key                — the scariest screen in the app
 *   5. The front door          — the first thing anyone ever sees
 *   6. How loud                — 13 card types x 3 loudnesses, small
 *
 * Nothing here is wired in. It renders standalone so it can be looked at first.
 *   node design6.mjs [outDir]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || 'site';
const at = (p) => (isAbsolute(p) ? p : join(ROOT, p));
const b64 = (p) => readFileSync(at(p)).toString('base64');
const face = (fam, file, weight = 400) =>
  `@font-face{font-family:'${fam}';font-style:normal;font-weight:${weight};font-display:swap;` +
  `src:url(data:font/woff2;base64,${b64(file)}) format('woff2')}`;

const fonts = [
  face('Caveat', 'src/fonts/caveat-latin.woff2', '500 700'),
  face('Dancing Script', 'src/fonts/script/Dancing-Script.woff2', '400 700'),
].join('\n');

/* the phone, verbatim from the Clean system: 390x844, r46, 8px #08080B */
const phone = (id, inner, bg = '#0A0A0C') => `
<div class="ph" id="${id}" style="background:${bg}">
  <div class="sb">
    <span class="sb-t">9:41</span>
    <span class="sb-r">
      <svg viewBox="0 0 18 12" class="sb-i"><path d="M1 11h2V7H1zM5 11h2V5H5zM9 11h2V3H9zM13 11h2V1h-2z"/></svg>
      <svg viewBox="0 0 16 12" class="sb-i"><path d="M8 10.4 1 4.2A10.4 10.4 0 0 1 15 4.2z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
      <svg viewBox="0 0 26 12" class="sb-i" style="width:24px"><rect x=".7" y=".7" width="21" height="10.6" rx="3.2" fill="none" stroke="currentColor" stroke-width="1.1" opacity=".5"/><rect x="2.2" y="2.2" width="14" height="7.6" rx="2" fill="currentColor"/><path d="M23.4 4.2v3.6a2.4 2.4 0 0 0 0-3.6z" fill="currentColor" opacity=".5"/></svg>
    </span>
  </div>
  ${inner}
  <div class="hi"></div>
</div>`;

/* ------------------------------------------------- 1 + 2 · brush and colour */

/* five thicknesses, drawn as real tapered strokes rather than five dots */
const nib = (w, on) => `
<button class="nib${on ? ' on' : ''}">
  <svg viewBox="0 0 54 26">
    <path d="M5 17 C18 9, 34 18, 49 10" fill="none" stroke="currentColor"
      stroke-width="${w}" stroke-linecap="round"/>
  </svg>
</button>`;

const brushSheet = `
<div class="canv">
  <div class="canv-hd"><span class="k">Today’s canvas</span><span class="v">14 marks, 2 hands</span></div>
  <div class="canv-ink">
    <svg viewBox="0 0 320 220" style="width:100%;height:100%">
      <path d="M28 150 C60 96, 92 176, 128 118 C150 84, 172 92, 190 120" fill="none" stroke="#FFB020" stroke-width="7" stroke-linecap="round" opacity=".95"/>
      <path d="M196 78 C214 60, 236 74, 250 58" fill="none" stroke="#FF7BC5" stroke-width="4" stroke-linecap="round" opacity=".9"/>
      <text x="34" y="66" font-family="Caveat" font-size="34" fill="rgba(237,239,247,.75)">good morning</text>
    </svg>
  </div>
</div>

<div class="sheet">
  <div class="grab"></div>

  <div class="s-lab">Thickness<span>pressure still travels</span></div>
  <div class="nibs">${nib(2)}${nib(4.5)}${nib(8, true)}${nib(12)}${nib(17)}</div>

  <div class="s-lab">Colour</div>
  <div class="sw-row">
    <button class="sw" style="background:#FFB020"></button>
    <button class="sw" style="background:#FF7BC5"></button>
    <button class="sw" style="background:#6EA8FF"></button>
    <button class="sw" style="background:#4ADE80"></button>
    <button class="sw" style="background:#EDEFF7"></button>
    <button class="sw any on"><span></span></button>
  </div>
  <div class="s-hint">Her last colour was <b style="color:#7FE3B8">mint</b> — tap to draw in it</div>
</div>`;

const cascade = `
<div class="canv dim">
  <div class="canv-hd"><span class="k">Today’s canvas</span><span class="v">14 marks, 2 hands</span></div>
  <div class="canv-ink">
    <svg viewBox="0 0 320 220" style="width:100%;height:100%">
      <path d="M28 150 C60 96, 92 176, 128 118 C150 84, 172 92, 190 120" fill="none" stroke="#FFB020" stroke-width="7" stroke-linecap="round" opacity=".5"/>
    </svg>
  </div>
</div>

<div class="sheet tall">
  <div class="grab"></div>
  <div class="s-lab">Any colour<span>drag the ring, then the light</span></div>

  <div class="ring-wrap">
    <div class="ring"></div>
    <div class="ring-hole">
      <svg viewBox="0 0 96 60" class="ring-nib">
        <path d="M10 42 C28 12, 52 50, 86 18" fill="none" stroke="#7FE3B8" stroke-width="9" stroke-linecap="round"/>
      </svg>
    </div>
    <div class="ring-knob" style="--a:225deg"></div>
  </div>

  <div class="ramp"><div class="ramp-knob"></div></div>

  <div class="s-lab" style="margin-top:20px">Yours<span>held on this phone, never sent</span></div>
  <div class="sw-row">
    <button class="sw on" style="background:#7FE3B8"></button>
    <button class="sw" style="background:#E9754F"></button>
    <button class="sw" style="background:#B07BFF"></button>
    <button class="sw" style="background:#FFD166"></button>
    <button class="sw" style="background:#5B7FFF"></button>
    <button class="sw empty">+</button>
  </div>
</div>`;

/* ------------------------------------------------------------ 3 · the pages */

const pages = `
<div class="hd">
  <div class="pill"><span class="dot"></span>with Sara</div>
  <button class="icob">⤴</button>
</div>

<div class="pgs">
  <button class="pg"><span>us</span></button>
  <button class="pg on"><span>mine</span><i class="arr">→</i></button>
  <button class="pg"><span>hers</span><svg viewBox="0 0 20 12" class="eye"><path d="M1 6s3.4-4.6 9-4.6S19 6 19 6s-3.4 4.6-9 4.6S1 6 1 6z" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="6" r="2.1" fill="currentColor"/></svg></button>
</div>

<div class="pg-line">Only you draw here. It lands on her widget — she can look, never touch.</div>

<div class="canv mine">
  <div class="canv-ink">
    <svg viewBox="0 0 320 260" style="width:100%;height:100%">
      <text x="30" y="80" font-family="Caveat" font-size="44" fill="#FFB020">good morning</text>
      <path d="M32 96 C86 108, 150 96, 206 104" fill="none" stroke="#FFB020" stroke-width="3" stroke-linecap="round" opacity=".7"/>
      <text x="44" y="164" font-family="Caveat" font-size="30" fill="rgba(237,239,247,.72)">milk. and you.</text>
      <path d="M212 178 C238 156, 252 196, 276 168" fill="none" stroke="#FF7BC5" stroke-width="6" stroke-linecap="round"/>
    </svg>
  </div>
  <div class="to-her"><span class="thw"></span>her widget</div>

</div>

<div class="pg-foot">
  <div class="pgf"><div class="k">On her widget</div><div class="v" style="color:#FFB020">right now</div></div>
  <div class="pgf"><div class="k">She has seen it</div><div class="v" style="color:rgba(237,239,247,.45)">not yet</div></div>
</div>

<div class="cbar">
  <button class="cb">✎</button>
  <button class="cb-room">Canvas</button>
  <button class="cb">Aa</button>
</div>`;

/* --------------------------------------------------------- 4 · your key */

const key = `
<div class="hd2"><button class="icob">‹</button><span>Your key</span><span style="width:32px"></span></div>

<div class="key-say">There is no account. Nobody at trace can bring this back —
not us, not a password reset. This is the whole of it.</div>

<div class="key-card">
  <div class="key-grid">
    <span>7QF4</span><span>MZ2K</span><span>8XRD</span>
    <span>V903</span><span>LNB6</span><span>TS1W</span>
  </div>
  <div class="key-side">
    <button class="key-b">Copy</button>
    <button class="key-b">Save a photo</button>
  </div>
</div>

<div class="key-what">
  <div class="kw"><span class="kwi" style="color:#4ADE80">✓</span><div><b>Every mark you two have made</b><span>41 days of canvas, both hands</span></div></div>
  <div class="kw"><span class="kwi" style="color:#4ADE80">✓</span><div><b>Your board and hers</b><span>lists, week, notices, the pocket</span></div></div>
  <div class="kw"><span class="kwi" style="color:#4ADE80">✓</span><div><b>The pairing itself</b><span>you land back on the same canvas, not a new one</span></div></div>
</div>

<div class="key-warn">
  <span class="wi">!</span>
  <div>Lose the phone <b>and</b> this key and the canvas is gone. That is the promise —
  it is why nothing you draw sits on a server we can read.</div>
</div>

<button class="cta">I’ve written it down</button>
<button class="ghost">Remind me tonight</button>`;

/* ------------------------------------------------------- 5 · the front door */

const door = `
<div class="door">
  <div class="door-mark">
    <span class="dm-box">
      <span class="dm-word">trac</span>
      <svg viewBox="0 0 140 70" class="dm-e"><path d="M6 50 C28 12, 60 66, 98 28 C110 17, 122 15, 133 21"
        fill="none" stroke="#E23343" stroke-width="8.5" stroke-linecap="round"/></svg>
    </span>
  </div>
  <div class="door-line">One canvas. Two people. Nobody else.</div>

  <div class="door-steps">
    <div class="step">
      <span class="sn">1</span>
      <div><b>Add trace to your home screen</b>
        <span>Tap <svg viewBox="0 0 20 24" class="shr"><path d="M10 2v13M10 2 6 6M10 2l4 4M4 11H2v11h16V11h-2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
        below, then <b>Add to Home Screen</b>. That is what makes the widget real.</span></div>
    </div>
    <div class="step">
      <span class="sn">2</span>
      <div><b>Open it from the icon</b><span>Not from Safari. From the icon — otherwise she never gets a buzz.</span></div>
    </div>
    <div class="step">
      <span class="sn">3</span>
      <div><b>Trade one five-letter code</b><span>Say it out loud, once. It is the only thing you ever type.</span></div>
    </div>
  </div>

  <div class="door-code">
    <div class="dc-lab">Her code</div>
    <div class="dc-box"><i>k</i><i>7</i><i>m</i><i class="cur"></i><i></i></div>
  </div>

  <button class="cta">Start the canvas</button>
  <div class="door-foot">No email. No password. Nothing to delete later.</div>
</div>`;

/* -------------------------------------------------------- 6 · how loud */

const LOUD = [
  ['ring', '#E23343', [
    ['Flare', 'she needs you, now', 'locked'],
    ['“Leaving now”', 'only when it is you leaving', ''],
    ['Come here', 'one button, no text', ''],
  ]],
  ['buzz', '#FFB020', [
    ['A trace arrives', 'she drew something', 'capped'],
    ['Handoff', 'the morning pass', ''],
    ['Notices', 'a deadline read off a letter', ''],
    ['Waiting on you', 'she is blocked', ''],
    ['Guests', 'someone is coming over', ''],
    ['Doses', 'the one you keep forgetting', ''],
  ]],
  ['sits quietly', 'rgba(237,239,247,.4)', [
    ['List ticks', 'the count just changes', 'locked'],
    ['Mood weather', 'never a notification, ever', ''],
    ['The week', 'it is only ever a glance', ''],
    ['Asleep', 'that is the point', ''],
  ]],
];

const seg = (i) => `<span class="seg">${[0, 1, 2].map((n) =>
  `<i class="${n === i ? 'on' : ''}"></i>`).join('')}</span>`;

const loud = `
<div class="hd2"><button class="icob">‹</button><span>How loud</span><span style="width:32px"></span></div>

<div class="loud-sum"><b>3</b> ring · <b>6</b> buzz · <b>4</b> sit quietly</div>

<div class="quiet">
  <div><b>Quiet hours</b><span>10pm – 7am. Only a flare gets through.</span></div>
  <span class="tog on"><i></i></span>
</div>

${LOUD.map(([name, c, rows], gi) => `
<div class="l-grp" style="color:${c}">${name}</div>
<div class="l-set" style="color:${c}">
${rows.map(([n, s, lock]) => `
<div class="l-row">
  <div class="l-txt"><b>${n}</b><span>${s}</span></div>
  ${lock === 'locked'
    ? `<span class="l-lock"><svg viewBox="0 0 14 16"><path d="M3.4 7V4.6a3.6 3.6 0 0 1 7.2 0V7" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="1.6" y="7" width="10.8" height="7.6" rx="2.2" fill="currentColor"/></svg></span>`
    : lock === 'capped'
      ? `<span class="l-cap">banner max</span>${seg(gi)}`
      : seg(gi)}
</div>`).join('')}
</div>`).join('')}

<div class="l-note">Two of these you cannot change. A flare has to ring or it is not a flare;
a tick has to stay silent or the app becomes a nag.</div>`;

/* ------------------------------------------------------------------- page */

const page = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>trace — the six that were never drawn</title>
<style>
${fonts}
:root{--ink:#EDEFF7;--i2:rgba(237,239,247,.55);--i3:rgba(237,239,247,.45);--i4:rgba(237,239,247,.32);
  --amber:#FFB020;--pink:#FF7BC5;--blue:#6EA8FF;--green:#4ADE80;--red:#E23343;
  --card:rgba(255,255,255,.055);--cbd:rgba(255,255,255,.07)}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;background:#0A0A0C;color:var(--ink);
  font-family:-apple-system,'SF Pro Display','Segoe UI',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
body{padding:48px 44px 140px}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;padding:0}
h1{margin:0 0 8px;font-size:40px;font-weight:600;letter-spacing:-.025em}
.sub{margin:0 0 52px;font-size:16px;color:var(--i2);max-width:820px;line-height:1.6}
section{margin:0 0 84px;max-width:1240px}
.eyebrow{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.eyebrow span:first-child{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--red)}
.eyebrow .rule{height:1px;flex:1;background:rgba(255,255,255,.12)}
h2{margin:0 0 10px;font-size:27px;font-weight:600;letter-spacing:-.02em}
.lede{margin:0 0 26px;font-size:15px;line-height:1.6;color:var(--i2);max-width:760px}
.lede b{color:var(--ink);font-weight:600}
.row{display:flex;gap:34px;flex-wrap:wrap;align-items:flex-start}
.cap{font-size:13px;color:var(--i3);margin-top:12px;max-width:390px;line-height:1.5}

/* -------------------------------------------------------------- the phone */
.ph{width:390px;height:844px;border-radius:46px;border:8px solid #08080B;overflow:hidden;
  position:relative;flex:none;box-shadow:0 30px 70px rgba(0,0,0,.62);display:flex;flex-direction:column}
.sb{height:52px;flex:none;display:flex;align-items:center;justify-content:space-between;
  padding:14px 26px 0;font-size:15px;font-weight:600;letter-spacing:.01em}
.sb-r{display:flex;align-items:center;gap:6px;color:var(--ink)}
.sb-i{width:17px;height:12px;fill:currentColor}
.hi{position:absolute;left:50%;bottom:9px;transform:translateX(-50%);
  width:134px;height:5px;border-radius:3px;background:rgba(237,239,247,.34)}

.hd{display:flex;align-items:center;justify-content:space-between;padding:10px 20px 0;flex:none}
.pill{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;
  background:var(--card);border:1px solid var(--cbd);font-size:13px;color:var(--i2)}
.pill .dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 9px var(--green)}
.icob{width:32px;height:32px;border-radius:50%;background:var(--card);border:1px solid var(--cbd);
  font-size:15px;color:var(--i2);display:flex;align-items:center;justify-content:center}
.hd2{display:flex;align-items:center;justify-content:space-between;padding:8px 20px 14px;flex:none;
  font-size:17px;font-weight:600}
.cta{margin:18px 20px 0;flex:none;height:52px;border-radius:999px;background:#EDEFF7;color:#0A0A0C;
  font-size:16px;font-weight:600}
.ghost{margin:10px 20px 0;flex:none;height:46px;border-radius:999px;background:none;
  border:1px solid var(--cbd);color:var(--i2);font-size:14px}

/* ------------------------------------------------------- 1+2 brush sheet */
.canv{margin:12px 20px 0;flex:1;display:flex;flex-direction:column;min-height:0}
.canv.dim{opacity:.34}
.canv-hd{display:flex;flex-direction:column;gap:2px;padding:6px 2px 12px}
.canv-hd .k{font-size:22px;font-weight:600;letter-spacing:-.02em}
.canv-hd .v{font-size:13px;color:var(--i3)}
.canv-ink{flex:1;border-radius:18px;background:linear-gradient(180deg,#0E1330 0%,#090C22 100%);
  border:1px solid var(--cbd);overflow:hidden;min-height:0}

.sheet{flex:none;margin:14px 10px 22px;padding:14px 18px 20px;border-radius:26px;
  background:rgba(20,20,26,.94);border:1px solid var(--cbd);backdrop-filter:blur(20px)}
.sheet.tall{margin-top:0}
.grab{width:38px;height:4px;border-radius:2px;background:rgba(237,239,247,.18);margin:0 auto 16px}
.s-lab{font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:var(--i4);
  display:flex;align-items:baseline;gap:10px;margin:0 0 12px}
.s-lab span{letter-spacing:0;text-transform:none;font-size:11.5px;color:var(--i4)}
.nibs{display:flex;gap:8px;margin-bottom:22px}
.nib{flex:1;height:52px;border-radius:14px;background:rgba(255,255,255,.045);
  border:1px solid transparent;color:rgba(237,239,247,.5);display:flex;align-items:center;justify-content:center}
.nib svg{width:44px;height:21px}
.nib.on{background:rgba(255,176,32,.14);border-color:rgba(255,176,32,.4);color:var(--amber)}
.sw-row{display:flex;gap:10px;align-items:center}
.sw{width:36px;height:36px;border-radius:50%;border:2px solid transparent;flex:1;max-width:40px}
.sw.on{border-color:var(--ink);box-shadow:0 0 0 3px rgba(10,10,12,1),0 0 0 4px rgba(237,239,247,.25)}
.sw.any{background:conic-gradient(from 0deg,#FF5B5B,#FFB020,#4ADE80,#6EA8FF,#B07BFF,#FF7BC5,#FF5B5B);
  display:flex;align-items:center;justify-content:center}
.sw.any span{width:12px;height:12px;border-radius:50%;background:#0A0A0C}
.sw.empty{background:rgba(255,255,255,.05);border:1px dashed rgba(255,255,255,.2);
  color:var(--i4);font-size:18px;line-height:0}
.s-hint{margin-top:14px;font-size:12.5px;color:var(--i3)}

.ring-wrap{position:relative;width:250px;height:250px;margin:4px auto 22px}
.ring{position:absolute;inset:0;border-radius:50%;
  background:conic-gradient(from 90deg,#FF5B5B,#FF8A3D,#FFB020,#D7E24A,#4ADE80,#3FD9C0,#6EA8FF,#8B7BFF,#B07BFF,#FF7BC5,#FF5B7B,#FF5B5B);
  mask:radial-gradient(circle,transparent 0 76px,#000 77px);
  -webkit-mask:radial-gradient(circle,transparent 0 76px,#000 77px)}
.ring-hole{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
  width:150px;height:150px;border-radius:50%;background:rgba(12,12,16,.9);
  border:1px solid var(--cbd);display:flex;align-items:center;justify-content:center}
.ring-nib{width:104px;height:66px}
.ring-knob{position:absolute;left:50%;top:50%;width:0;height:0;transform:rotate(var(--a))}
.ring-knob::after{content:'';position:absolute;left:-15px;top:-115px;width:30px;height:30px;
  border-radius:50%;background:#7FE3B8;border:3px solid #EDEFF7;box-shadow:0 4px 14px rgba(0,0,0,.6)}
.ramp{height:22px;border-radius:999px;position:relative;
  background:linear-gradient(90deg,#0A0A0C,#7FE3B8,#FFFFFF)}
.ramp-knob{position:absolute;left:62%;top:50%;transform:translate(-50%,-50%);
  width:26px;height:26px;border-radius:50%;background:#7FE3B8;border:3px solid #EDEFF7;
  box-shadow:0 4px 14px rgba(0,0,0,.6)}

/* ---------------------------------------------------------- 3 the pages */
.pgs{display:flex;gap:8px;padding:14px 20px 0;flex:none}
.pg{flex:1;height:44px;border-radius:999px;background:rgba(255,255,255,.045);
  border:1px solid transparent;color:var(--i3);font-size:15px;display:flex;
  align-items:center;justify-content:center;gap:7px}
.pg.on{background:rgba(255,176,32,.13);border-color:rgba(255,176,32,.42);color:var(--amber);font-weight:600}
.pg .arr{font-style:normal;font-size:13px;opacity:.85}
.pg .eye{width:17px;height:11px;opacity:.75;flex:none}
.pg-line{padding:12px 22px 0;font-size:12.5px;line-height:1.5;color:var(--i3);flex:none}
.canv.mine{position:relative;margin-top:12px}
.canv.mine .canv-ink{border-color:rgba(255,176,32,.28);
  box-shadow:inset -14px 0 26px -18px rgba(255,176,32,.75)}
.to-her{position:absolute;right:12px;top:12px;display:flex;align-items:center;gap:7px;
  padding:6px 11px 6px 9px;border-radius:999px;background:rgba(255,176,32,.11);
  border:1px solid rgba(255,176,32,.28);font-size:10.5px;letter-spacing:.1em;
  text-transform:uppercase;color:rgba(255,176,32,.9);white-space:nowrap}
.thw{width:16px;height:1.5px;background:rgba(255,176,32,.75);position:relative;border-radius:1px}
.thw::after{content:'';position:absolute;right:-1px;top:-2.5px;border:3.5px solid transparent;
  border-left-color:rgba(255,176,32,.75)}
.pg-foot{display:flex;gap:10px;padding:14px 20px 0;flex:none}
.pgf{flex:1;padding:12px 14px;border-radius:16px;background:var(--card);border:1px solid var(--cbd)}
.pgf .k{font-size:11px;color:var(--i4)}
.pgf .v{font-size:15px;font-weight:600;margin-top:3px}
.cbar{height:54px;flex:none;margin:14px 16px 26px;border-radius:999px;background:rgba(20,20,26,.92);
  border:1px solid var(--cbd);display:flex;align-items:center;justify-content:space-between;padding:0 8px}
.cbar .cb{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.06);font-size:15px;
  display:flex;align-items:center;justify-content:center;color:var(--i2)}
.cb-room{font-size:14.5px;color:var(--i2)}

/* --------------------------------------------------------- 4 your key */
.key-say{padding:0 22px;font-size:13.5px;line-height:1.6;color:var(--i2);flex:none}
.key-card{margin:20px 18px 0;padding:18px 16px;border-radius:20px;flex:none;
  background:rgba(255,176,32,.06);border:1px solid rgba(255,176,32,.24)}
.key-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px 8px}
.key-grid span{font-family:'SF Mono',ui-monospace,Menlo,monospace;font-size:19px;letter-spacing:.09em;
  text-align:center;color:var(--amber);padding:9px 0;border-radius:11px;background:rgba(255,176,32,.09)}
.key-side{display:flex;gap:9px;margin-top:14px}
.key-b{flex:1;height:40px;border-radius:999px;background:rgba(255,255,255,.07);
  border:1px solid var(--cbd);font-size:13.5px;color:var(--ink)}
.key-what{margin:18px 20px 0;flex:none;display:flex;flex-direction:column;gap:14px}
.kw{display:flex;gap:11px;align-items:flex-start}
.kwi{font-size:14px;line-height:1.3;flex:none}
.kw b{display:block;font-size:14px;font-weight:600}
.kw span{display:block;font-size:12px;color:var(--i3);margin-top:2px}
.key-warn{margin:20px 20px 0;padding:14px 16px;border-radius:18px;flex:none;display:flex;gap:12px;
  background:rgba(226,51,67,.07);border:1px solid rgba(226,51,67,.24);font-size:12.5px;line-height:1.55;color:var(--i2)}
.key-warn b{color:var(--ink)}
.wi{width:20px;height:20px;border-radius:50%;background:rgba(226,51,67,.85);color:#0A0A0C;
  font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none}

/* -------------------------------------------------------- 5 front door */
.door{flex:1;display:flex;flex-direction:column;padding:0 22px 26px;min-height:0}
.door-mark{display:flex;align-items:center;justify-content:center;margin:auto 0 0}
.dm-box{position:relative;display:inline-flex;align-items:baseline;margin-right:31px}
.dm-word{font-family:'Dancing Script',cursive;font-weight:700;font-size:62px;color:#EDEFF7;line-height:1.4}
.dm-e{position:absolute;left:calc(100% - 1px);top:33.4px;width:57px;height:26.7px;
  margin-left:-28.5px;overflow:visible}
.door-line{text-align:center;font-size:14px;color:var(--i3);margin:12px 0 34px}
.door-steps{display:flex;flex-direction:column;gap:26px}
.step{display:flex;gap:13px;align-items:flex-start}
.sn{width:25px;height:25px;border-radius:50%;flex:none;background:rgba(255,255,255,.07);
  border:1px solid var(--cbd);font-size:12px;font-weight:600;color:var(--i2);
  display:flex;align-items:center;justify-content:center}
.step b{display:block;font-size:14.5px;font-weight:600}
.step span{display:block;font-size:12.5px;line-height:1.55;color:var(--i3);margin-top:3px}
.step span b{display:inline;font-size:12.5px;color:var(--ink)}
.shr{width:13px;height:15px;vertical-align:-3px;color:var(--blue)}
.door-code{margin:auto 0 0;padding-top:30px}
.dc-lab{font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:var(--i4);margin-bottom:10px}
.dc-box{display:flex;gap:9px}
.dc-box i{flex:1;height:58px;border-radius:15px;background:var(--card);border:1px solid var(--cbd);
  font-style:normal;font-size:25px;font-weight:600;display:flex;align-items:center;justify-content:center}
.dc-box i.cur{border-color:rgba(255,176,32,.55);background:rgba(255,176,32,.07);position:relative}
.dc-box i.cur::after{content:'';width:2px;height:26px;background:var(--amber);border-radius:1px}
.door .cta{margin:26px 0 0}
.door-foot{text-align:center;font-size:11.5px;color:var(--i4);margin-top:14px}

/* ----------------------------------------------------------- 6 how loud */
.loud-sum{padding:0 22px 14px;font-size:13px;color:var(--i3);flex:none}
.loud-sum b{color:var(--ink);font-weight:600}
.quiet{margin:0 18px 6px;padding:14px 16px;border-radius:18px;flex:none;display:flex;
  align-items:center;justify-content:space-between;gap:14px;
  background:var(--card);border:1px solid var(--cbd)}
.quiet b{display:block;font-size:14.5px;font-weight:600}
.quiet span{display:block;font-size:12px;color:var(--i3);margin-top:2px}
.tog{width:44px;height:26px;border-radius:999px;background:rgba(255,255,255,.1);flex:none;position:relative}
.tog.on{background:var(--green)}
.tog i{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#EDEFF7}
.tog.on i{left:21px}
.l-grp{padding:16px 22px 7px;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;flex:none}
.l-set{flex:none}
.l-row{display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:9px 22px;flex:none}
.l-txt b{display:block;font-size:14px;font-weight:500;color:var(--ink)}
.l-txt span{display:block;font-size:11.5px;color:var(--i4);margin-top:1px}
.seg{display:flex;gap:4px;flex:none;padding:4px;border-radius:999px;background:rgba(255,255,255,.05)}
.seg i{width:20px;height:8px;border-radius:999px;background:rgba(255,255,255,.12)}
.seg i.on{background:currentColor}
.l-lock{width:26px;height:26px;border-radius:50%;flex:none;display:flex;align-items:center;
  justify-content:center;background:rgba(255,255,255,.05);color:var(--i4)}
.l-lock svg{width:11px;height:13px}
.l-cap{font-size:10px;color:var(--i4);letter-spacing:.04em}
.l-note{margin:18px 22px 26px;font-size:11.5px;line-height:1.6;color:var(--i4);flex:none}
.ph.unroll{height:auto;padding-top:14px}
.ph.unroll .hi{position:static;margin:0 auto 12px}
</style></head><body>

<h1>The six that were never drawn</h1>
<p class="sub">Built because the app could not ship without them, but never in a frame — so the look
was mine by default. Here is what I would draw. Nothing below is wired in; it renders on its own so you
can kill any of it before it costs anything.</p>

<section>
  <div class="eyebrow"><span>One &amp; two</span><div class="rule"></div></div>
  <h2>Thickness and colour live in the same sheet</h2>
  <p class="lede">They are one gesture — you pick up a pen, and a pen has a nib and a colour. Splitting
  them into two panels would be two taps for one thought. <b>Thickness is drawn as ink, never as numbers</b>:
  five real tapered strokes at the size they actually come out. And the sheet carries the one line that
  makes the whole thing feel alive — <b>her last colour, offered back to you</b>.</p>
  <div class="row">
    <div><div>${phone('p1', brushSheet)}</div>
      <div class="cap">The sheet at rest. The nib row is the thickness control; the last swatch is the
      whole spectrum, and it is the only one that is a ring rather than a dot.</div></div>
    <div><div>${phone('p2', cascade)}</div>
      <div class="cap">Tapped. The hue ring is 250px because thumbs are not precise, the centre shows a
      real stroke in the colour rather than a flat chip, and the ramp below is light — not opacity.
      Six saved slots, held on this phone.</div></div>
  </div>
</section>

<section>
  <div class="eyebrow"><span>Three</span><div class="rule"></div></div>
  <h2>us · mine · hers — the core idea, given a shape</h2>
  <p class="lede">This is the sentence you wrote: <b>what I draw shall be on her widget without her
  affecting it, unless it is an US feature.</b> So the pills carry direction, not just a name — <b>mine</b>
  has an arrow out, <b>hers</b> has an eye. The canvas itself changes: on <b>mine</b> the right edge glows
  amber and says where it is going, and the two feet tell you the only two things you actually want to
  know — is it on her widget, and has she seen it.</p>
  <div class="row">
    <div><div>${phone('p3', pages)}</div>
      <div class="cap">On <b>hers</b>, the pen in the control bar goes away entirely. Not greyed —
      gone. You cannot touch her page, and the bar should not pretend otherwise.</div></div>
    <div style="max-width:420px;padding-top:8px">
      <div class="cap" style="margin:0 0 18px;font-size:14px;color:var(--i2);line-height:1.6">
      <b style="color:var(--ink)">Why pills and not a swipe.</b> A swipe between three pages is invisible —
      you would never know <em>hers</em> existed. Three pills state the model on sight: there are exactly
      three places ink can be, and you are in one of them.</div>
      <div class="cap" style="margin:0 0 18px;font-size:14px;color:var(--i2);line-height:1.6">
      <b style="color:var(--ink)">Why amber for mine.</b> Amber is already the app's "this is going out"
      colour — the widget's own tint. Her page is never amber, because nothing you do there travels.</div>
      <div class="cap" style="margin:0;font-size:14px;color:var(--i2);line-height:1.6">
      <b style="color:var(--ink)">The one I am unsure about.</b> "She has seen it — not yet" is a read
      receipt, and read receipts change how people behave. Say the word and it comes out.</div>
    </div>
  </div>
</section>

<section>
  <div class="eyebrow"><span>Four</span><div class="rule"></div></div>
  <h2>Your key — the scariest screen in the app</h2>
  <p class="lede">Everything else in trace is soft. This one should not be. It says the bad news first,
  in the second person, before it shows the key: <b>nobody at trace can bring this back.</b> Then the key
  in six blocks, big enough to read off a photograph. Then, in green, exactly what it buys —
  people do not write down a code until they know what it is holding.</p>
  <div class="row">
    <div><div>${phone('p4', key)}</div>
      <div class="cap">Amber, not red. Red is the colour of destruction in this app — unpair, delete.
      This is a thing you <em>keep</em>, so it gets the widget's colour.</div></div>
    <div style="max-width:420px;padding-top:8px">
      <div class="cap" style="margin:0 0 18px;font-size:14px;color:var(--i2);line-height:1.6">
      <b style="color:var(--ink)">"Save a photo" is the honest button.</b> Nobody writes anything down.
      They screenshot it. So give them a rendered card made to be photographed rather than pretending
      they own a pen.</div>
      <div class="cap" style="margin:0 0 18px;font-size:14px;color:var(--i2);line-height:1.6">
      <b style="color:var(--ink)">"Remind me tonight" exists</b> because the moment this screen appears is
      the worst moment to ask — someone is 30 seconds into a new app. Let them defer once, then ask again
      when they have something worth losing.</div>
      <div class="cap" style="margin:0;font-size:14px;color:var(--i2);line-height:1.6">
      <b style="color:var(--ink)">The red block at the bottom is not a warning, it is the pitch.</b>
      "It is why nothing you draw sits on a server we can read" — the risk and the reason are the same
      sentence, and they should be printed as one.</div>
    </div>
  </div>
</section>

<section>
  <div class="eyebrow"><span>Five</span><div class="rule"></div></div>
  <h2>The front door — the first thing anyone ever sees</h2>
  <p class="lede">Web has no App Store, so this screen has to do a job an install normally does: get the
  icon onto the home screen <b>before</b> anyone judges the app. Three steps, in the order they happen,
  with the share glyph drawn inline so nobody has to hunt for it. Step 2 is the one everybody skips and
  it is the one that breaks notifications, so it gets its own line and says the consequence out loud.</p>
  <div class="row">
    <div><div>${phone('p5', door)}</div>
      <div class="cap">The mark is the mark — <b>trac</b> in Dancing Script and the old swoosh as the e.
      It is the only place on the front door with any colour in it.</div></div>
    <div style="max-width:420px;padding-top:8px">
      <div class="cap" style="margin:0 0 18px;font-size:14px;color:var(--i2);line-height:1.6">
      <b style="color:var(--ink)">The code boxes are on the door, not behind a button.</b> Half the people
      who open this are the second person — they already have a code in a text message and want to type it
      now. Making them read three steps first is a wall.</div>
      <div class="cap" style="margin:0 0 18px;font-size:14px;color:var(--i2);line-height:1.6">
      <b style="color:var(--ink)">Platform-detected copy.</b> On Android step 1 reads "tap ⋮ then
      <em>Install app</em>" and the glyph changes. Same layout, one string.</div>
      <div class="cap" style="margin:0;font-size:14px;color:var(--i2);line-height:1.6">
      <b style="color:var(--ink)">"No email. No password. Nothing to delete later."</b> is the last line
      on the screen on purpose. It is the objection everyone has at a sign-up wall, answered before it
      is asked.</div>
    </div>
  </div>
</section>

<section>
  <div class="eyebrow"><span>Six</span><div class="rule"></div></div>
  <h2>How loud — a matrix that stopped being a matrix</h2>
  <p class="lede">Thirteen card types across three loudnesses is a grid, and a grid at 390px wide is
  unreadable. So it stops being a grid: <b>the rows are grouped by the answer</b>. Everything under
  "ring" rings. Move a row and it physically moves to another group — the list <em>is</em> the state,
  and you can audit it in one glance instead of reading thirteen dropdowns.</p>
  <div class="row">
    <div><div>${phone('p6', loud)}</div>
      <div class="cap">As it opens. The three-dot segment on each row is the control; the filled dot is
      where that row sits. Dragging a row between groups does the same thing — both work.</div></div>
    <div><div class="ph unroll" id="p6b">${loud}<div class="hi"></div></div>
      <div class="cap">The same screen unrolled, so you can see all thirteen at once. On the phone
      it scrolls — the top four lines never move.</div></div>
    <div style="max-width:420px;padding-top:8px">
      <div class="cap" style="margin:0 0 18px;font-size:14px;color:var(--i2);line-height:1.6">
      <b style="color:var(--ink)">The count at the top is the whole point.</b> "3 ring · 6 buzz · 4 sit
      quietly" is the only number anyone actually wants: <em>how much will this thing interrupt me.</em></div>
      <div class="cap" style="margin:0 0 18px;font-size:14px;color:var(--i2);line-height:1.6">
      <b style="color:var(--ink)">Two rows are locked and say so.</b> A flare has to ring or it is not a
      flare. A list tick has to stay silent or the app becomes a nag. Locking them is a product promise,
      so the lock is visible rather than the option just being missing.</div>
      <div class="cap" style="margin:0;font-size:14px;color:var(--i2);line-height:1.6">
      <b style="color:var(--ink)">Traces are capped, not locked.</b> You can turn her drawings down to
      silent, but never up past a banner — nobody should be able to make the canvas ring.</div>
    </div>
  </div>
</section>

</body></html>`;

mkdirSync(at(OUT), { recursive: true });
writeFileSync(join(at(OUT), 'undesigned.html'), page);
console.log(join(OUT, 'undesigned.html'), '·', (page.length / 1024 | 0) + ' KB · 6 screens');
