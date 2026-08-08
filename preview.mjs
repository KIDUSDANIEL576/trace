/* preview.mjs — proposals, standing on their own, before anything is wired in.
 *
 *   1. The 27a launch animation (the unfinished e) + the app icon at real sizes
 *   2. The drawing pad: direction model, live — mine → her widget, hers → my
 *      widget, and what changes when it is an US surface
 *   3. Handwriting: type on a keyboard, it lands as a human wrote it —
 *      six hands to choose from, with the wobble that makes it not-a-font
 *   4. How settings look in this system
 *
 *   node preview.mjs [outDir]
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
  face('Shadows Into Light', 'src/fonts/hand/shadows.woff2'),
  face('Patrick Hand', 'src/fonts/hand/patrick.woff2'),
  face('Gochi Hand', 'src/fonts/hand/gochi.woff2'),
  face('Kalam', 'src/fonts/hand/kalam.woff2', 400),
  face('Kalam', 'src/fonts/hand/kalam7.woff2', 700),
  face('Indie Flower', 'src/fonts/hand/indie.woff2'),
].join('\n');

const page = `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>trace — proposals</title>
<style>
${fonts}
:root{--ink:#F3F0F4;--i2:rgba(243,240,244,.55);--i3:rgba(243,240,244,.45);--i4:rgba(243,240,244,.4);
  --amber:#F4C66B;--pink:#FF7A9C;--blue:#7EC8FF;--green:#4ADE80;--red:#E23343;
  --card:rgba(255,255,255,.055);--cbd:rgba(255,255,255,.07);--chip:rgba(255,255,255,.08)}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;background:#0C0B10;color:var(--ink);
  font-family:-apple-system,'SF Pro Display','Segoe UI',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
body{padding:44px 40px 120px}
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;padding:0}
h1{margin:0 0 6px;font-size:38px;font-weight:600;letter-spacing:-.02em}
.sub{margin:0 0 40px;font-size:16px;color:var(--i2);max-width:760px;line-height:1.55}
section{margin:0 0 76px;max-width:1180px}
.eyebrow{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.eyebrow span:first-child{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--red)}
.eyebrow .rule{height:1px;flex:1;background:rgba(255,255,255,.12)}
h2{margin:0 0 8px;font-size:28px;font-weight:600;letter-spacing:-.02em}
.lede{margin:0 0 24px;font-size:15px;line-height:1.55;color:var(--i2);max-width:720px}
.row{display:flex;gap:26px;flex-wrap:wrap;align-items:flex-start}
.cap{font-size:13px;color:var(--i3);margin-top:10px}
.card{border-radius:22px;background:var(--card);border:1px solid var(--cbd);padding:20px}
.btn{padding:11px 20px;border-radius:999px;background:#F3F0F4;color:#0C0B10;font-size:14px;font-weight:600}
.btn.ghost{background:rgba(255,255,255,.08);color:var(--ink);border:1px solid rgba(255,255,255,.12)}
.phone{width:330px;height:714px;border-radius:40px;border:7px solid #08080B;overflow:hidden;position:relative;
  background:linear-gradient(180deg,#0C1234 0%,#080B22 60%,#05060F 100%);box-shadow:0 28px 60px rgba(0,0,0,.6);flex:none}

/* ---------- 1 · launch ---------- */
#launch{width:330px;height:714px;border-radius:40px;border:7px solid #08080B;overflow:hidden;position:relative;
  background:#0C0B10;display:flex;align-items:center;justify-content:center;flex:none;box-shadow:0 28px 60px rgba(0,0,0,.6)}
.lk-word{display:flex;align-items:center;opacity:0}
.lk-word span{font-family:Caveat,cursive;font-weight:700;font-size:64px;color:#F3F0F4;line-height:1}
.lk-e{width:44px;height:44px;margin-left:-3px;margin-top:5px}
.lk-e path{stroke:#E23343;stroke-width:9;fill:none;stroke-linecap:round}
.lk-slogan{position:absolute;left:0;right:0;bottom:88px;text-align:center;font-family:Caveat,cursive;
  font-size:22px;color:rgba(243,240,244,.5);opacity:0}
.icons{display:flex;gap:26px;align-items:flex-end;flex-wrap:wrap}
.ic{border-radius:22.5%;background:#E23343;display:flex;align-items:center;justify-content:center;
  box-shadow:0 10px 26px rgba(0,0,0,.5)}
.ic.dark{background:#0C0B10;border:1px solid rgba(255,255,255,.12)}
.ic svg path{fill:none;stroke-linecap:round}

/* ---------- 2 · pad ---------- */
.pad-wrap{position:absolute;inset:0;display:flex;flex-direction:column;padding:44px 14px 14px}
.pad-hd{display:flex;justify-content:space-between;align-items:center;padding:0 6px 10px}
.pill{display:flex;align-items:center;gap:8px;padding:7px 13px;border-radius:999px;background:var(--chip);font-size:12.5px}
.dot{width:7px;height:7px;border-radius:50%;background:var(--green)}
.seg{display:flex;gap:5px;padding:4px;border-radius:999px;background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.09);margin:0 6px 10px}
.seg button{position:relative;flex:1;padding:9px 0;border-radius:999px;font-size:13px;font-weight:600;color:var(--i2)}
.seg button .nd{position:absolute;top:6px;right:12px;width:6px;height:6px;border-radius:50%;background:var(--pink);opacity:0}
.seg button .nd.on{opacity:1;animation:pulseDot 1.6s ease-in-out infinite}
@keyframes pulseDot{0%,100%{opacity:.4}50%{opacity:1}}
.seg button.on{background:#F3F0F4;color:#0C0B10}
.pad{position:relative;flex:1;border-radius:24px;background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.08);overflow:hidden;touch-action:none}
.pad canvas{position:absolute;inset:0;width:100%;height:100%}
.pad-note{position:absolute;left:10px;right:10px;bottom:12px;padding:7px 12px;text-align:center;
  border-radius:14px;background:rgba(10,12,30,.82);border:1px solid rgba(255,255,255,.1);
  font-size:11.5px;line-height:1.35;color:var(--i2)}
.pad-tools{display:flex;gap:8px;align-items:center;margin-top:10px;padding:0 4px}
.sw{width:26px;height:26px;border-radius:50%;border:3px solid transparent}
.sw.on{border-color:rgba(255,255,255,.9)}
.mini-phone{width:250px;height:520px;border-radius:34px;border:6px solid #08080B;overflow:hidden;position:relative;
  background:radial-gradient(130% 80% at 20% 0%,#1B2A6B 0%,#0C1440 40%,#06081C 75%,#04050E 100%);flex:none;
  box-shadow:0 24px 50px rgba(0,0,0,.55);display:flex;flex-direction:column}
.mw{margin:44px 14px 0;height:132px;border-radius:22px;background:linear-gradient(160deg,#141E4E,#0A0F2E);
  border:1px solid rgba(255,255,255,.16);position:relative;overflow:hidden}
.mw canvas{position:absolute;left:0;right:0;top:30px;bottom:26px;width:100%;height:calc(100% - 56px)}
.mw .lbl{position:absolute;left:13px;top:11px;font-size:10.5px;color:var(--pink);font-weight:600;z-index:2}
.mw .cap2{position:absolute;left:13px;right:13px;bottom:10px;font-size:10px;color:var(--i4);z-index:2}
.mgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px 0;padding:18px 20px 0;justify-items:center}
.mgrid div{width:44px;height:44px;border-radius:11px;background:rgba(255,255,255,.07)}
.legend{display:flex;flex-direction:column;gap:12px;max-width:300px}
.leg{display:flex;gap:12px;align-items:flex-start;font-size:13.5px;line-height:1.5;color:var(--i2)}
.leg b{color:var(--ink);font-weight:600}
.leg i{width:10px;height:10px;border-radius:50%;flex:none;margin-top:5px}

/* ---------- 3 · handwriting ---------- */
.hw-in{width:100%;padding:14px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.06);color:var(--ink);font:15px inherit;outline:none}
.hands{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}
.hands button{padding:9px 15px;border-radius:999px;background:rgba(255,255,255,.06);
  border:1px solid rgba(255,255,255,.1);font-size:17px;color:var(--i2)}
.hands button.on{background:#F3F0F4;color:#0C0B10;border-color:transparent}
#hw-stage{position:absolute;inset:0;padding:60px 22px}
#hw-out{font-size:27px;line-height:1.5;color:#F4C66B;white-space:pre-wrap;word-break:break-word}
#hw-out .ch{display:inline-block;opacity:0}
.hw-caret{display:inline-block;width:2px;height:1em;background:#F4C66B;vertical-align:-.14em;animation:blink 1s steps(1) infinite}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
.kb{position:absolute;left:0;right:0;bottom:0;background:rgba(10,12,26,.96);border-top:1px solid rgba(255,255,255,.1);
  padding:8px 5px 16px;display:flex;flex-direction:column;gap:6px}
.kb .kr{display:flex;gap:5px;justify-content:center}
.kb .kr span{flex:1;max-width:30px;height:38px;border-radius:6px;background:rgba(255,255,255,.12);
  display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--ink)}
.kb .kr span.wide{max-width:none;flex:2.4}

/* ---------- 4 · settings ---------- */
.set{position:absolute;inset:0;display:flex;flex-direction:column;padding:44px 0 0}
.set-hd{display:flex;align-items:center;justify-content:space-between;padding:12px 18px 0}
.set-body{flex:1;overflow-y:auto;padding:16px 16px 0;display:flex;flex-direction:column;gap:8px;scrollbar-width:none;
  -webkit-mask-image:linear-gradient(180deg,transparent 0,#000 22px);mask-image:linear-gradient(180deg,transparent 0,#000 22px)}
.set-body::-webkit-scrollbar{display:none}
.grp{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--i4);padding:12px 4px 2px}
.srow{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:var(--card);
  border:1px solid var(--cbd);text-align:left;width:100%}
.srow .g{flex:1;min-width:0}
.srow .n{font-size:14.5px;font-weight:600;display:block;line-height:1.25}
.srow .s{font-size:11.5px;color:var(--i3);display:block;margin-top:2px}
.srow .v{font-size:12.5px;color:var(--i2);flex:none;max-width:44%;text-align:right}
.srow .chev{color:rgba(243,240,244,.3);font-size:15px}
.tog{width:44px;height:26px;border-radius:99px;background:rgba(255,255,255,.16);padding:3px;display:flex;
  justify-content:flex-start;flex:none;transition:.18s}
.tog i{width:20px;height:20px;border-radius:50%;background:#fff;display:block}
.tog.on{background:var(--green);justify-content:flex-end}
.you{display:flex;align-items:center;gap:12px;padding:14px;border-radius:18px;
  background:linear-gradient(160deg,#1E2C63,#0D1436);border:1px solid rgba(255,255,255,.12)}
.you .av{width:42px;height:42px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#FFD98A,#F4C66B);flex:none}
.you .av.b{background:radial-gradient(circle at 40% 35%,#FF9ED4,#C2418C)}
.danger{color:var(--red);border-color:rgba(226,51,67,.3)!important}
.note{font-size:12px;color:var(--i4);padding:12px 6px 22px;text-align:center;line-height:1.5}
</style>
</head><body>

<h1>Four proposals</h1>
<p class="sub">Nothing here is wired into the app yet. Look, react, and I'll build what you approve —
including saying no to any of it.</p>

<!-- ============================ 1 ============================ -->
<section>
  <div class="eyebrow"><span>Proposal 1</span><span class="rule"></span></div>
  <h2>The 27a logo, animated</h2>
  <p class="lede">The word stops and the last letter becomes a stroke — still being drawn, by the other person.
    <b>The logo is literally waiting for someone.</b> That is also the loading state: it draws, holds, and the app
    is already there behind it. No spinner anywhere in Trace, ever — this is the spinner.</p>
  <div class="row">
    <div>
      <div id="launch">
        <div class="lk-word" id="lk-word">
          <span>trac</span>
          <svg class="lk-e" viewBox="0 0 60 60" overflow="visible">
            <path id="lk-e-path" d="M8 40 C20 10,38 50,52 18"/>
            <circle id="lk-e-tip" r="4.6" fill="#fff" opacity="0"/>
          </svg>
        </div>
        <div class="lk-slogan" id="lk-slogan">Leave me a trace.</div>
      </div>
      <div class="cap">Cold launch · 1.9 s. Tap to replay.</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:20px">
      <div class="card">
        <div style="font-size:13px;color:var(--i3);margin-bottom:14px">The app icon, at the sizes that matter</div>
        <div class="icons" id="icons"></div>
      </div>
      <div class="card">
        <div style="font-size:13px;color:var(--i3);margin-bottom:12px">The same mark, as the in-app loader</div>
        <div style="display:flex;gap:24px;align-items:center">
          <svg id="loader" viewBox="0 0 60 60" style="width:52px;height:52px">
            <path d="M8 40 C20 10,38 50,52 18" stroke="rgba(255,255,255,.12)" stroke-width="9" fill="none" stroke-linecap="round"/>
            <path id="loader-red" d="M8 40 C20 10,38 50,52 18" stroke="#E23343" stroke-width="9" fill="none" stroke-linecap="round"/>
          </svg>
          <div style="font-size:13px;color:var(--i2);line-height:1.5;max-width:280px">
            Red draws with a white tip, then white draws with a red tip — taking turns,
            the way you two do. It never spins.</div>
        </div>
      </div>
      <div style="display:flex;gap:10px"><button class="btn" id="replay">Replay the launch</button></div>
    </div>
  </div>
</section>

<!-- ============================ 2 ============================ -->
<section>
  <div class="eyebrow"><span>Proposal 2</span><span class="rule"></span></div>
  <h2>The drawing pad, and who it reaches</h2>
  <p class="lede">Your rule, built: <b>what I draw lands on her widget and she cannot change it</b> — unless the
    surface is an <b>US</b> one, and then we are both on the same ink. Draw in the pad; watch her phone on the right.
    Switch the mode and watch what changes.</p>
  <div class="row">
    <div>
      <div class="phone">
        <div class="pad-wrap">
          <div class="pad-hd">
            <div class="pill"><span class="dot"></span><span id="pad-presence">Maya is here</span></div>
            <div style="font-size:11px;color:var(--i4)" id="pad-mode-lbl">to her widget</div>
          </div>
          <div class="seg" id="pad-seg">
            <button data-m="mine" class="on">Mine</button>
            <button data-m="hers">Hers<span class="nd" id="hers-dot"></span></button>
            <button data-m="us">US</button>
          </div>
          <div class="pad" id="pad">
            <canvas id="pad-cv"></canvas>
            <div class="pad-note" id="pad-note">draw — it lands on her widget, read-only</div>
          </div>
          <div class="pad-tools">
            <button class="sw on" data-c="#F4C66B" style="background:#F4C66B"></button>
            <button class="sw" data-c="#FF7A9C" style="background:#FF7A9C"></button>
            <button class="sw" data-c="#7EC8FF" style="background:#7EC8FF"></button>
            <button class="sw" data-c="#4ADE80" style="background:#4ADE80"></button>
            <button class="sw" data-c="#F3F0F4" style="background:#F3F0F4"></button>
            <button class="btn ghost" id="pad-clear" style="margin-left:auto;padding:8px 14px;font-size:12px">Clear</button>
            <button class="btn ghost" id="pad-her" style="padding:8px 14px;font-size:12px">She draws</button>
          </div>
        </div>
      </div>
      <div class="cap">My phone</div>
    </div>

    <div>
      <div class="mini-phone">
        <div class="mw">
          <div class="lbl" id="mw-lbl">from him · one-time</div>
          <canvas id="mw-cv"></canvas>
          <div class="cap2" id="mw-cap">she can see it, not touch it</div>
        </div>
        <div class="mgrid"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
      </div>
      <div class="cap">Her home screen</div>
    </div>

    <div class="legend">
      <div class="leg"><i style="background:#F4C66B"></i><span><b>Mine →</b> my board. Ink goes one way: onto her
        widget, read-only. Good morning, a shopping doodle, a heart. She sees, she can't edit.</span></div>
      <div class="leg"><i style="background:#FF7A9C"></i><span><b>Hers →</b> her board, mirrored onto my widget.
        Same rule reversed. I never touch her ink.</span></div>
      <div class="leg"><i style="background:#4ADE80"></i><span><b>US →</b> the shared canvas. Both pens live on one
        surface — this is where mirror, trace-over, pass-the-pen and Both Here live. The only place either of us
        can change the other's marks.</span></div>
      <div class="leg" style="margin-top:6px;color:var(--i3)"><i style="background:transparent"></i>
        <span>My honest opinion: keep <b>US</b> as the app's home tab and the two boards one swipe away — the shared
        canvas is the thing nobody else has, so it should be what opens.</span></div>
    </div>
  </div>
</section>

<!-- ============================ 3 ============================ -->
<section>
  <div class="eyebrow"><span>Proposal 3</span><span class="rule"></span></div>
  <h2>Type it — it lands as a human wrote it</h2>
  <p class="lede">A keyboard when your hands are full, but never a chat bubble. It renders in a hand, letter by
    letter, with a small random tilt and baseline drift per character, so it reads as written, not typeset.
    Pick a hand; it becomes <b>your</b> hand and rides every typed note you send.</p>
  <div class="row">
    <div>
      <div class="phone">
        <div id="hw-stage">
          <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--i4);margin-bottom:14px">
            To Maya · lands as ink</div>
          <div id="hw-out"></div>
        </div>
        <div class="kb">
          <div class="kr"><span>q</span><span>w</span><span>e</span><span>r</span><span>t</span><span>y</span><span>u</span><span>i</span><span>o</span><span>p</span></div>
          <div class="kr"><span>a</span><span>s</span><span>d</span><span>f</span><span>g</span><span>h</span><span>j</span><span>k</span><span>l</span></div>
          <div class="kr"><span>z</span><span>x</span><span>c</span><span>v</span><span>b</span><span>n</span><span>m</span><span>⌫</span></div>
          <div class="kr"><span class="wide">space</span><span class="wide" style="background:#F3F0F4;color:#0C0B10">send</span></div>
        </div>
      </div>
      <div class="cap">Type below — it renders here</div>
    </div>
    <div style="flex:1;min-width:320px;max-width:520px">
      <input class="hw-in" id="hw-in" value="good morning. coffee's on." maxlength="90">
      <div class="hands" id="hands"></div>
      <div class="card" style="font-size:13.5px;line-height:1.6;color:var(--i2)">
        <b style="color:var(--ink)">Why it isn't just a font.</b> Every character gets its own rotation
        (±2.4°), vertical drift (±1.4px) and a hair of letter-spacing jitter, seeded per message so the same
        note always looks the same. Then it draws in at 34 ms a character — the speed of a hand, not a paste.
        <div style="height:12px"></div>
        <b style="color:var(--ink)">Where it lives.</b> One button on the canvas dock; the note lands on the
        canvas as ink you can draw around, and rides her widget like any trace.
        <div style="height:12px"></div>
        <b style="color:var(--ink)">One idea you didn't ask for, take it or leave it:</b> hold the send key and it
        arrives <i>as she'd hear you say it</i> — the drift doubles, the line slants, it reads rushed. Same words,
        different hand. It costs one setting and it's the kind of thing screenshots get taken of.
      </div>
      <div style="display:flex;gap:10px;margin-top:14px">
        <button class="btn" id="hw-replay">Write it again</button>
        <button class="btn ghost" id="hw-rush">Send it rushed</button>
      </div>
    </div>
  </div>
</section>

<!-- ============================ 4 ============================ -->
<section>
  <div class="eyebrow"><span>Proposal 4</span><span class="rule"></span></div>
  <h2>Settings, the way this system does them</h2>
  <p class="lede">One scroll, four groups, no tabs. It opens with the pair — because in a two-person app the
    first setting is <i>who</i> — then how loud, then the rules, then the two irreversible things kept together
    at the bottom where nobody taps by accident. Everything already built; this is the arrangement.</p>
  <div class="row">
    <div>
      <div class="phone">
        <div class="set">
          <div class="set-hd">
            <div style="width:30px"></div>
            <div style="font-size:16px;font-weight:600">Settings</div>
            <button style="width:30px;height:30px;border-radius:50%;background:var(--chip);
              display:flex;align-items:center;justify-content:center;font-size:13px">✕</button>
          </div>
          <div class="set-body" id="set-body"></div>
        </div>
      </div>
      <div class="cap">Scrollable — the whole thing</div>
    </div>
    <div class="legend" style="max-width:340px">
      <div class="leg"><i style="background:#F4C66B"></i><span><b>The pair comes first.</b> Your name, her name,
        how long, and the key that moves you both to a new phone. In a couples app this is the identity screen.</span></div>
      <div class="leg"><i style="background:#FF7A9C"></i><span><b>How loud is its own group</b>, not buried in
        toggles — it's the promise the product makes about silence, so it gets a row that shows its own state.</span></div>
      <div class="leg"><i style="background:#7EC8FF"></i><span><b>The rules read as sentences</b>, not switch labels.
        "A dot, never a location." You should be able to read this screen and know what the app won't do.</span></div>
      <div class="leg"><i style="background:#E23343"></i><span><b>The two ends live together</b> — delete everything,
        and unpair — in red, below a rule, after everything else. Nothing else is red anywhere in Trace.</span></div>
    </div>
  </div>
</section>

<script>
/* =================== 1 · launch =================== */
const wordEl = document.getElementById('lk-word');
const ePath = document.getElementById('lk-e-path');
const eTip = document.getElementById('lk-e-tip');
const slogan = document.getElementById('lk-slogan');
const L = ePath.getTotalLength();
ePath.style.strokeDasharray = L;

let loopToken = 0;
function playLaunch() {
  const me = ++loopToken;
  const t0 = performance.now();
  const WORD_IN = 380, DRAW = 820, HOLD = 520, OUT = 420;

  /* reset */
  wordEl.style.opacity = 0; wordEl.style.transform = 'translateY(7px)';
  ePath.style.strokeDashoffset = L;
  eTip.style.opacity = 0;
  slogan.style.opacity = 0;

  const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function frame(now) {
    if (me !== loopToken) return;
    const t = now - t0;

    /* the word arrives */
    const a = Math.min(1, t / WORD_IN);
    wordEl.style.opacity = ease(a);
    wordEl.style.transform = 'translateY(' + (7 * (1 - ease(a))).toFixed(2) + 'px)';

    /* the last letter is drawn — by someone. a white tip leads the red. */
    const d = Math.max(0, Math.min(1, (t - WORD_IN) / DRAW));
    const drawn = ease(d);
    ePath.style.strokeDashoffset = L * (1 - drawn);
    if (d > 0 && d < 1) {
      const pt = ePath.getPointAtLength(L * drawn);
      eTip.setAttribute('cx', pt.x); eTip.setAttribute('cy', pt.y);
      eTip.style.opacity = 1;
    } else eTip.style.opacity = 0;

    /* the promise, once the stroke lands */
    const sgo = Math.max(0, Math.min(1, (t - WORD_IN - DRAW + 120) / 420));
    slogan.style.opacity = sgo;

    /* held, then it lifts and the app is simply there */
    const outT = WORD_IN + DRAW + HOLD;
    if (t > outT) {
      const o = Math.min(1, (t - outT) / OUT);
      wordEl.style.opacity = 1 - o;
      slogan.style.opacity = (1 - o) * sgo;
      wordEl.style.transform = 'scale(' + (1 - o * .035).toFixed(3) + ')';
    }
    if (t < outT + OUT + 700) requestAnimationFrame(frame);
    else playLaunch();
  }
  requestAnimationFrame(frame);
}
playLaunch();
document.getElementById('launch').addEventListener('click', playLaunch);
document.getElementById('replay').addEventListener('click', playLaunch);
window.__replayLaunch = playLaunch;

/* icon at real sizes */
const ICONS = [[120, 'on the store'], [60, 'home screen'], [40, 'settings'], [29, 'notification']];
document.getElementById('icons').innerHTML = ICONS.map(([s, lab], i) => {
  const sw = Math.max(4, s * .085);
  const mark = '<svg viewBox="0 0 60 60" style="width:' + (s * .62) + 'px;height:' + (s * .62) + 'px">' +
    '<path d="M8 40 C20 10,38 50,52 18" stroke="' + (i === 3 ? '#E23343' : '#fff') + '" stroke-width="' + (sw * 1.6) + '" fill="none" stroke-linecap="round"/></svg>';
  return '<div style="text-align:center"><div class="ic ' + (i === 3 ? 'dark' : '') + '" style="width:' + s + 'px;height:' + s + 'px">' + mark +
    '</div><div style="font-size:10.5px;color:var(--i4);margin-top:8px">' + s + 'px<br>' + lab + '</div></div>';
}).join('');

/* the loader: red draws, then white draws over it, taking turns */
const lr = document.getElementById('loader-red');
const LL = lr.getTotalLength();
lr.style.strokeDasharray = LL;
let turn = 0;
setInterval(() => {
  turn = 1 - turn;
  lr.style.stroke = turn ? '#F3F0F4' : '#E23343';
  lr.animate([{ strokeDashoffset: LL }, { strokeDashoffset: 0 }],
    { duration: 900, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'forwards' });
}, 1000);

/* =================== 2 · the pad =================== */
const pad = document.getElementById('pad'), cv = document.getElementById('pad-cv');
const mwcv = document.getElementById('mw-cv');
const cx = cv.getContext('2d'), mx = mwcv.getContext('2d');
let mode = 'mine', color = '#F4C66B';
let mineStrokes = [], herStrokes = [], usStrokes = [];
const DPR = Math.min(2, devicePixelRatio || 1);
function fit() {
  for (const [c, host] of [[cv, pad], [mwcv, mwcv.parentElement]]) {
    const r = (c === mwcv ? c : host).getBoundingClientRect();
    c.width = r.width * DPR; c.height = r.height * DPR;
    c.getContext('2d').setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  paint();
}
function activeSet() { return mode === 'mine' ? mineStrokes : mode === 'hers' ? herStrokes : usStrokes; }
function drawInto(ctx, list, w, h, scale) {
  ctx.lineCap = ctx.lineJoin = 'round';
  for (const s of list) {
    if (s.pts.length < 2) continue;
    ctx.strokeStyle = s.c; ctx.globalAlpha = s.ghost ? .5 : 1;
    ctx.beginPath();
    for (let i = 0; i < s.pts.length; i++) {
      const p = s.pts[i];
      const x = p.x * scale.x, y = p.y * scale.y;
      const wd = Math.max(1.4, s.w * scale.k * (1 - Math.min(1, (p.v || 0) / 26) * .5));
      ctx.lineWidth = wd;
      if (i === 0) ctx.moveTo(x, y);
      else {
        const q = s.pts[i - 1];
        ctx.quadraticCurveTo(q.x * scale.x, q.y * scale.y, (q.x + p.x) / 2 * scale.x, (q.y + p.y) / 2 * scale.y);
      }
    }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
}
function paint() {
  const r = pad.getBoundingClientRect();
  cx.clearRect(0, 0, r.width, r.height);
  /* on US, hers shows underneath live; on Mine, only mine; on Hers, only hers */
  if (mode === 'us') { drawInto(cx, herStrokes, r.width, r.height, { x: 1, y: 1, k: 1 }); drawInto(cx, usStrokes, r.width, r.height, { x: 1, y: 1, k: 1 }); }
  else drawInto(cx, activeSet(), r.width, r.height, { x: 1, y: 1, k: 1 });

  /* her widget mirrors MY board only — never hers, never US-in-progress */
  const wr = mwcv.getBoundingClientRect();
  mx.clearRect(0, 0, wr.width, wr.height);
  const sc = { x: wr.width / r.width, y: wr.height / r.height };
  sc.k = Math.min(sc.x, sc.y);
  const feed = mode === 'us' ? usStrokes.concat(mineStrokes) : mineStrokes;
  drawInto(mx, feed, wr.width, wr.height, sc);
}
let cur = null;
const posOf = (e) => { const r = pad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
pad.addEventListener('pointerdown', (e) => {
  if (mode === 'hers') { note("this is her board — you're reading it, not writing it"); return; }
  pad.setPointerCapture(e.pointerId);
  cur = { pts: [posOf(e)], c: color, w: 8 };
  activeSet().push(cur); paint();
});
pad.addEventListener('pointermove', (e) => {
  if (!cur) return;
  const p = posOf(e), l = cur.pts[cur.pts.length - 1];
  const d = Math.hypot(p.x - l.x, p.y - l.y);
  if (d < 1.8) return;
  p.v = d; cur.pts.push(p); paint();
});
const endStroke = () => { cur = null; paint(); };
pad.addEventListener('pointerup', endStroke);
pad.addEventListener('pointercancel', endStroke);

document.querySelectorAll('#pad-seg button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('#pad-seg button').forEach((x) => x.classList.toggle('on', x === b));
  mode = b.dataset.m;
  if (mode === 'hers') document.getElementById('hers-dot').classList.remove('on');
  const L2 = document.getElementById('pad-mode-lbl'), N = document.getElementById('pad-note');
  const MW = document.getElementById('mw-lbl'), MC = document.getElementById('mw-cap');
  if (mode === 'mine') {
    L2.textContent = 'to her widget'; N.textContent = 'draw — it lands on her widget, read-only';
    MW.textContent = 'from him · one-time'; MC.textContent = 'she can see it, not touch it';
  } else if (mode === 'hers') {
    L2.textContent = 'her board, read-only'; N.textContent = 'hers. you can look. you cannot change it.';
    MW.textContent = 'from him · one-time'; MC.textContent = 'unchanged — her board never touches your widget feed';
  } else {
    L2.textContent = 'one surface, both pens'; N.textContent = 'US — both of you on the same ink';
    MW.textContent = 'us · live'; MC.textContent = 'the shared canvas, as it happens';
  }
  paint();
}));
document.querySelectorAll('.sw').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.sw').forEach((x) => x.classList.toggle('on', x === b));
  color = b.dataset.c;
}));
document.getElementById('pad-clear').addEventListener('click', () => {
  if (mode === 'hers') herStrokes = []; else if (mode === 'us') usStrokes = []; else mineStrokes = [];
  paint();
});
function note(t) {
  const n = document.getElementById('pad-note'), was = n.textContent;
  n.textContent = t; setTimeout(() => (n.textContent = was), 2200);
}
/* she draws — into her board on 'hers', into the shared ink on 'us' */
document.getElementById('pad-her').addEventListener('click', () => {
  const target = mode === 'us' ? usStrokes : herStrokes;
  const y0 = 60 + Math.random() * 260;
  const s = { c: '#FF7A9C', w: 8, pts: [], ghost: mode !== 'us' && mode !== 'hers' };
  for (let i = 0; i <= 26; i++) {
    s.pts.push({ x: 26 + i * 9, y: y0 + Math.sin(i / 3.2) * 30, v: 6 });
  }
  target.push(s);
  document.getElementById('pad-presence').textContent = 'Maya is drawing';
  setTimeout(() => (document.getElementById('pad-presence').textContent = 'Maya is here'), 1800);
  if (mode === 'mine') {
    note("her ink went to HER board — your widget feed is untouched");
    document.getElementById('hers-dot').classList.add('on');
  }
  paint();
});
addEventListener('resize', fit); fit();

/* =================== 3 · handwriting =================== */
const HANDS = [
  { f: 'Caveat', n: 'Caveat', size: 30 },
  { f: 'Shadows Into Light', n: 'Shadows', size: 26 },
  { f: 'Patrick Hand', n: 'Patrick', size: 25 },
  { f: 'Gochi Hand', n: 'Gochi', size: 25 },
  { f: 'Kalam', n: 'Kalam', size: 24 },
  { f: 'Indie Flower', n: 'Indie', size: 26 },
];
let hand = 0, rushed = false;
document.getElementById('hands').innerHTML = HANDS.map((h, i) =>
  '<button data-h="' + i + '" class="' + (i === 0 ? 'on' : '') + '" style="font-family:\\'' + h.f + '\\',cursive">' + h.n + '</button>').join('');
document.querySelectorAll('#hands button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('#hands button').forEach((x) => x.classList.toggle('on', x === b));
  hand = +b.dataset.h; write();
}));
/* seeded so the same message always looks the same */
function seeded(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; }; }
let writeTimer = null;
function write() {
  clearTimeout(writeTimer);
  const txt = document.getElementById('hw-in').value;
  const out = document.getElementById('hw-out');
  const H = HANDS[hand];
  const rnd = seeded(txt + H.f + (rushed ? '!' : ''));
  const drift = rushed ? 2.6 : 1.4, tilt = rushed ? 5 : 2.4;
  out.style.fontFamily = "'" + H.f + "', cursive";
  out.style.fontSize = (rushed ? H.size * 1.04 : H.size) + 'px';
  out.style.transform = rushed ? 'rotate(-1.6deg)' : 'none';
  out.innerHTML = [...txt].map((ch) => {
    if (ch === ' ') return ' ';
    const r1 = (rnd() - .5) * 2, r2 = (rnd() - .5) * 2, r3 = (rnd() - .5) * 2;
    return '<span class="ch" style="transform:translateY(' + (r1 * drift).toFixed(2) + 'px) rotate(' +
      (r2 * tilt).toFixed(2) + 'deg);margin-right:' + (r3 * .7).toFixed(2) + 'px">' + ch + '</span>';
  }).join('') + '<span class="hw-caret"></span>';
  const chars = [...out.querySelectorAll('.ch')];
  let i = 0;
  const step = () => {
    if (i >= chars.length) return;
    chars[i].style.opacity = 1;
    chars[i].animate([{ opacity: 0, filter: 'blur(1.5px)' }, { opacity: 1, filter: 'blur(0)' }],
      { duration: 120, fill: 'forwards' });
    i++;
    writeTimer = setTimeout(step, rushed ? 22 : 34);
  };
  step();
}
document.getElementById('hw-in').addEventListener('input', () => { rushed = false; write(); });
document.getElementById('hw-replay').addEventListener('click', () => { rushed = false; write(); });
document.getElementById('hw-rush').addEventListener('click', () => { rushed = true; write(); });
write();

/* =================== 4 · settings =================== */
const SET = [
  { g: 'The two of you' },
  { pair: true },
  { n: 'Your key', s: 'Move you both to a new phone', v: 'trace-8f2k1…', chev: 1 },
  { n: 'Your hand', s: 'How your typed notes are written', v: 'Caveat', chev: 1 },

  { g: 'How loud' },
  { n: 'Notifications', s: 'Rings, banners, widget-only — per kind', v: '3 exceptions', chev: 1 },
  { n: 'Quiet hours', s: 'Nothing buzzes 10pm–7am', tog: 0 },
  { n: 'The flare always gets through', s: 'This one can’t be turned off', locked: 1 },

  { g: 'The rules' },
  { n: 'Show that I’m here', s: 'A dot, never a location', tog: 1 },
  { n: 'The pocket', s: 'Hidden planning, absent from her device', tog: 1 },
  { n: 'Permanent ink', s: 'Keep marks past the day', tog: 1 },
  { n: 'Tiny suggestions', s: 'Facts only, never advice', tog: 0 },
  { n: 'On-device only', s: 'Drawings never sync raw', tog: 1 },

  { g: 'Your things' },
  { n: 'Export everything', s: 'One file, yours, readable', chev: 1 },
  { n: 'Widget', s: 'What her board shows on your screen', v: 'On', chev: 1 },
  { n: 'Subscription', s: 'One sub covers both of you', v: 'Trace Two', chev: 1 },

  { rule: 1 },
  { n: 'Delete everything on this phone', danger: 1 },
  { n: 'Unpair', s: 'The canvas seals. Nothing is deleted for her.', danger: 1 },
  { note: 'Trace has no account, no feed and no ads. Version 1.0' },
];
document.getElementById('set-body').innerHTML = SET.map((r) => {
  if (r.g) return '<div class="grp">' + r.g + '</div>';
  if (r.rule) return '<div style="height:1px;background:rgba(255,255,255,.1);margin:16px 4px 6px"></div>';
  if (r.note) return '<div class="note">' + r.note + '</div>';
  if (r.pair) return '<div class="you"><div class="av"></div><div class="av b" style="margin-left:-18px"></div>' +
    '<div style="flex:1;min-width:0;margin-left:6px"><div style="font-size:15px;font-weight:600">You &amp; Maya</div>' +
    '<div style="font-size:12px;color:var(--i3);margin-top:2px">Paired 41 days · code 8f2k1</div></div>' +
    '<div style="font-size:15px;color:rgba(243,240,244,.3)">›</div></div>';
  const right = r.tog !== undefined ? '<span class="tog' + (r.tog ? ' on' : '') + '"><i></i></span>'
    : r.locked ? '<span style="font-size:11px;color:var(--green);font-weight:600">always</span>'
    : (r.v ? '<span class="v">' + r.v + '</span>' : '') + (r.chev ? '<span class="chev">›</span>' : '');
  return '<button class="srow' + (r.danger ? ' danger' : '') + '"><span class="g">' +
    '<span class="n"' + (r.danger ? ' style="color:var(--red)"' : '') + '>' + r.n + '</span>' +
    (r.s ? '<span class="s">' + r.s + '</span>' : '') + '</span>' + right + '</button>';
}).join('');
document.querySelectorAll('#set-body .tog').forEach((t) => t.addEventListener('click', (e) => {
  e.stopPropagation(); t.classList.toggle('on');
}));
</script>
</body></html>
`;

mkdirSync(at(OUT), { recursive: true });
writeFileSync(join(at(OUT), 'proposals.html'), page);
console.log(`${OUT}/proposals.html  ${(page.length / 1024).toFixed(0)} KB  (6 hands embedded)`);
