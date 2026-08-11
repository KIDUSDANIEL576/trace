/* trace — the paper inversion.
 *
 * THE SIGNATURE. When their trace arrives the entire screen goes PAPER
 * regardless of which ground you are on, and their strokes lay themselves down
 * in the order they were drawn. It is the only time the third colour owns the
 * whole screen, and the only motion in the app allowed to be an event rather
 * than feedback.
 *
 * Why replay instead of presenting it finished: a finished drawing is a
 * notification. Watching it arrive stroke by stroke is watching someone do
 * something, which is the entire product. The timing is theirs, compressed —
 * order and rhythm are preserved, the dead time between strokes is not.
 *
 * Three things are load-bearing:
 *
 *   the inversion is local   `.reveal` redeclares the PAPER tokens on itself,
 *                            so it inverts without touching <html> and without
 *                            a stored preference changing underneath the user.
 *   points are normalised    the sender's canvas is not the receiver's size,
 *                            and a trace that arrives 10% out of place is a
 *                            different drawing.
 *   a slot is not a colour   `c` is 'red' | 'ink' | 'amber' | 'violet' and is
 *                            resolved HERE, against the paper tokens, so ink
 *                            drawn at night arrives as ink and not as cream.
 *
 * Reduce Motion gets the finished drawing instantly, on paper, with no replay
 * and no inversion animation — the event still happened, it just does not move.
 */
(() => {
'use strict';
const $ = (s, r) => (r || document).querySelector(s);

const host = $('#screen');
if (!host) return;

const wrap = document.createElement('div');
wrap.className = 'reveal';
wrap.setAttribute('aria-hidden', 'true');
wrap.innerHTML = `
  <canvas class="reveal-ink"></canvas>
  <div class="reveal-by"></div>
  <button class="reveal-close" aria-label="Close">Close</button>`;
host.appendChild(wrap);

const cv = $('.reveal-ink', wrap);
const by = $('.reveal-by', wrap);
const ctx = cv.getContext('2d');
const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

let raf = 0, closing = 0;

/* The slot resolves against the reveal's own computed style, which is paper —
   never against the document, which may be ink. */
const slot = (c) => {
  if (!c || c[0] === '#' || c.startsWith('rgb')) return c || '#0C0B0F';
  const v = getComputedStyle(wrap).getPropertyValue('--' + (c === 'ink' ? 'ink' : c)).trim();
  return v || '#0C0B0F';
};

function size() {
  const r = wrap.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.max(1, Math.round(r.width * dpr));
  cv.height = Math.max(1, Math.round(r.height * dpr));
  cv.style.width = r.width + 'px';
  cv.style.height = r.height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w: r.width, h: r.height };
}

function drawUpTo(list, dims, upto) {
  ctx.clearRect(0, 0, dims.w, dims.h);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let n = 0;
  for (const s of list) {
    const pts = s.pts;
    if (!pts || pts.length < 2) { n += 1; continue; }
    const take = Math.max(0, Math.min(pts.length, Math.round(upto - n)));
    if (take < 2) { n += pts.length; if (upto <= n) break; continue; }
    ctx.beginPath();
    ctx.strokeStyle = slot(s.c);
    ctx.globalAlpha = s.alpha === undefined ? 1 : s.alpha;
    ctx.lineWidth = Math.max(1.5, (s.w || 4));
    ctx.moveTo(pts[0][0] * dims.w, pts[0][1] * dims.h);
    for (let i = 1; i < take; i++) ctx.lineTo(pts[i][0] * dims.w, pts[i][1] * dims.h);
    ctx.stroke();
    n += pts.length;
    if (upto <= n) break;
  }
  ctx.globalAlpha = 1;
}

function close() {
  cancelAnimationFrame(raf);
  clearTimeout(closing);
  wrap.classList.remove('in');
  wrap.setAttribute('aria-hidden', 'true');
}

/* `list` is [{ c, w, alpha, pts:[[nx,ny], …] }] in 0..1 space, in the order
   they were drawn. */
function play(list, who) {
  if (!list || !list.length) return;
  const total = list.reduce((n, s) => n + (s.pts ? s.pts.length : 0), 0);
  if (!total) return;

  by.textContent = (who || 'She') + ' drew this';
  wrap.classList.add('in');
  wrap.setAttribute('aria-hidden', 'false');
  const dims = size();

  if (reduce()) {
    drawUpTo(list, dims, total);
    closing = setTimeout(close, 2600);
    return;
  }

  /* ~1.4s for the whole trace, whatever it contains: a two-stroke heart and a
     forty-stroke scribble both want to feel like one delivered thing. */
  const dur = 1400;
  const t0 = performance.now();
  cancelAnimationFrame(raf);
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    drawUpTo(list, dims, total * (1 - Math.pow(1 - p, 2)));
    if (p < 1) raf = requestAnimationFrame(step);
    else closing = setTimeout(close, 1500);
  };
  raf = requestAnimationFrame(step);
}

$('.reveal-close', wrap).addEventListener('click', close);
wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
window.addEventListener('resize', () => { if (wrap.classList.contains('in')) size(); });

window.TRACE_REVEAL = { play, close };
})();
