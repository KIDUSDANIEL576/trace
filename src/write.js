/* trace — pages and the handwriting keyboard.
 *
 * The model, exactly as the owner stated it:
 *   · US    — one shared canvas, both hands, live. Interactive.
 *   · MINE  — my page. What I draw or write here lands on HER widget as a
 *             one-time trace. Nothing of hers can touch it.
 *   · HERS  — her page, arriving on my side. Read-only: it arrives, I watch.
 *
 * The keyboard: type a line, pick a hand (five script faces + Caveat), see
 * it as written — per-glyph wobble, not a font specimen — and send. On MINE
 * it rides the board channel to her widget; on US it lands on both phones.
 */
(() => {
'use strict';
const R = window.TRACE_ROOMS, APP = window.TRACE_APP;
if (!R || !APP) return;
const { el, esc, ui } = R;
const toast = ui.toast, buzz = ui.buzz;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

/* ------------------------------------------------------- the page pills */

const PAGES = [
  ['us', 'us', 'one canvas, both hands — live'],
  ['mine', 'mine', 'your page — lands on her widget, she can’t touch it'],
  ['hers', 'hers', 'her page — it arrives, you watch'],
];

const title = $('#sc-canvas .title');
const pills = el(`<div style="display:flex;gap:6px;padding:12px 24px 0;flex:none">
  ${PAGES.map(([k, label]) => `<button data-page="${k}" style="min-height:44px;padding:0 18px;border-radius:999px;
    font-size:13.5px;font-weight:600;border:1px solid transparent;color:var(--ink)">${label}</button>`).join('')}
</div>`);
title.after(pills);

function paintPills() {
  const cur = APP.curPage();
  $$('[data-page]', pills).forEach((b) => {
    const on = b.dataset.page === cur;
    /* red is the selection colour now — the store shot's active pill is a red
       outline on a dark red fill, not a lighter grey */
    b.style.background = on ? 'var(--red-wash)' : 'var(--surface)';
    b.style.borderColor = on ? 'var(--red)' : 'var(--surface)';
    b.style.color = on ? 'var(--ink)' : 'var(--ink)';
    b.style.opacity = on ? 1 : .65;
  });
  const k = $('#sc-canvas .title .k');
  const page = PAGES.find(([p]) => p === cur);
  if (k) k.textContent = cur === 'us' ? 'Today’s canvas' : (cur === 'mine' ? 'Your page' : 'Her page');
  const note = $('#canvas-note');
  if (note) { note.textContent = cur === 'us' ? '' : page[2]; if (cur !== 'us') setTimeout(() => { if (APP.curPage() === cur) note.textContent = ''; }, 3600); }
}
$$('[data-page]', pills).forEach((b) => b.addEventListener('click', () => {
  APP.setPage(b.dataset.page); buzz(6); paintPills();
}));
paintPills();

/* the canvas headline stays honest per page */
setInterval(() => {
  const cur = APP.curPage();
  const cc = $('#canvas-count');
  if (!cc || cur === 'us') return;
  if (cur === 'hers') cc.textContent = APP.hersCount() + ' from her hand';
}, 900);

/* ------------------------------------------------- the handwriting keys */

const FONTS = [
  ['Caveat', 'the house hand'],
  ['Dancing Script', 'the signature'],
  ['Sacramento', 'thin pen'],
  ['Kaushan Script', 'brush'],
  ['Yellowtail', 'retro'],
  ['Parisienne', 'love letter'],
];
let font = FONTS[0][0], size = 34;

/* canvas fillText never triggers @font-face loading — warm every hand now,
   and repaint whatever is on screen once they land */
Promise.all(FONTS.map(([f]) => document.fonts.load(`700 20px '${f}'`).catch(() => {})))
  .then(() => { const rd = window.TRACE_APP; rd && rd.paintWidgetInk && R.paint(); });

/* the Aa key lives with the round buttons, before undo */
const keysBtn = el(`<button class="rbtn" title="write in your hand" aria-label="write in your hand"
  style="font:700 15px 'Caveat',cursive">Aa</button>`);
$('#undo-btn').before(keysBtn);

let pad = null;
/* p14 is a composer screen, not a drawing one — the brush bar has no job
   while you are typing, and hiding it is what makes the pad fit on a 390. */
function closePad() {
  if (!pad) return;
  pad.remove(); pad = null;
  const dock = $('#dock'); if (dock) dock.style.display = '';
  $('#sc-canvas').classList.remove('composing');
}
function openPad() {
  if (pad) return closePad();
  if (APP.curPage() === 'hers') { toast('her page — you can’t write here'); return; }
  pad = el(`<div id="writepad" style="position:relative;z-index:12;margin:0 20px;border-radius:22px;
    background:var(--surface);border:1px solid var(--hairline);backdrop-filter:blur(16px);
    padding:14px 16px;display:flex;flex-direction:column;gap:11px;flex:none">
    <input id="wp-in" placeholder="good morning…" maxlength="40" autocomplete="off"
      style="padding:14px 16px;border-radius:16px;border:1px solid var(--hairline);
      background:var(--surface);color:var(--ink);font:17px inherit;outline:none">
    <div style="border-radius:18px;background:var(--red-wash);border:1px solid var(--red-line);padding:14px 16px">
      <div style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--red-text)">Rendered in your hand</div>
      <div id="wp-prev" style="min-height:44px;margin-top:8px;overflow:hidden;word-break:break-word;
        font:700 ${size}px '${font}',cursive;color:var(--ink);line-height:1.15"></div>
    </div>
    <div style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none" id="wp-fonts">
      ${FONTS.map(([f, d]) => `<button data-font="${f}" title="${d}" style="flex:none;padding:7px 14px;
        border-radius:999px;font:600 16px '${f}',cursive;color:var(--ink);border:1px solid var(--hairline);
        background:var(--surface)">${f === 'Caveat' ? 'trace' : 'trace'}</button>`).join('')}
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      <span style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-4);width:32px">size</span>
      <input id="wp-size" type="range" min="20" max="56" step="2" value="${size}" style="flex:1;accent-color:var(--red);min-width:0">
      <button id="wp-send" style="padding:12px 24px;border-radius:999px;background:var(--red);color:var(--on-red);
        font-size:15px;font-weight:600">Send</button>
    </div>
  </div>`);
  const dock = $('#dock');
  dock.before(pad);
  dock.style.display = 'none';
  $('#sc-canvas').classList.add('composing');

  const input = $('#wp-in', pad), prev = $('#wp-prev', pad);
  const wobble = () => {
    const t = input.value || 'good morning';
    /* the preview wobbles per glyph, same idea as the canvas renderer */
    prev.innerHTML = [...t].map((ch, i) =>
      `<span style="display:inline-block;transform:rotate(${((i * 37 % 11) - 5) * .8}deg) translateY(${((i * 53 % 7) - 3) * .8}px);
        font:inherit">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
    prev.style.font = `700 ${size}px '${font}',cursive`;
  };
  wobble();
  input.addEventListener('input', wobble);
  input.focus();
  $$('#wp-fonts [data-font]', pad).forEach((b) => b.addEventListener('click', () => {
    font = b.dataset.font; buzz(6); wobble();
    $$('#wp-fonts [data-font]', pad).forEach((x) => x.style.borderColor =
      x === b ? 'var(--red)' : 'var(--hairline)');
  }));
  $('#wp-size', pad).addEventListener('input', (e) => { size = +e.target.value; wobble(); });
  const send = () => {
    const t = input.value.trim();
    if (!t) { input.focus(); return; }
    APP.addTextStroke(t, font, size, undefined);
    buzz(12); closePad();
  };
  $('#wp-send', pad).addEventListener('click', send);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
}
keysBtn.addEventListener('click', openPad);
$('#canvas-wrap').addEventListener('pointerdown', closePad);

/* ------------------------------------------------------------- the sim */

const simActions = $('.sim-actions');
if (simActions) {
  const b = el(`<button>she draws on her page</button>`);
  b.addEventListener('click', () => {
    /* a little heart, normalized — exactly what the wire would carry */
    const pts = [];
    for (let i = 0; i <= 30; i++) {
      const t = (i / 30) * Math.PI * 2;
      pts.push([+(0.5 + 0.16 * Math.pow(Math.sin(t), 3) * 1.4).toFixed(4),
                +(0.42 - 0.13 * (Math.cos(t) - .45 * Math.cos(2 * t) - .2 * Math.cos(3 * t))).toFixed(4), 1]);
    }
    APP.receivePageInk({ pts, c: 'red', w: 8, alpha: 1, taper: true, brush: 'pen' });
    R.db.traceSeen = false; R.resetDeck(); R.save(); R.paint();
    toast('her page reached your widget');
  });
  simActions.appendChild(b);
  const b2 = el(`<button>she writes in her hand</button>`);
  b2.addEventListener('click', () => {
    APP.receivePageInk({ pts: [], text: 'miss you', font: 'Parisienne', size: 40, x: .2, y: .4, c: 'red' });
    R.db.traceSeen = false; R.resetDeck(); R.save(); R.paint();
    toast('“miss you”, in her hand, on your widget');
  });
  simActions.appendChild(b2);
}
})();
