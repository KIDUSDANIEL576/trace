/* trace — the motion budget.
 *
 * THESIS: the bloom. One authored moment — light spreading through the glass
 * when a mark lands or a heartbeat is sent. Everything else is feedback.
 *
 * The table from GLASS-AND-MOTION.md §4, implemented as written:
 *
 *   press feedback      160ms   scale to .975            (CSS, app.css)
 *   card entrance       620ms   opacity + translateY 14, 60ms stagger,
 *                               capped at 320ms so a long screen does not
 *                               animate for two seconds
 *   number arriving     900ms   ease-out cubic, a counted value
 *   capsule ring       1100ms   strokeDashoffset to the REAL fraction
 *   heartbeat pulse     900ms   ring 1 -> 2.7, opacity .85 -> 0
 *   glass lights up    1100ms   bloom on the shadow
 *   ambient field        26s    one loop, UI thread            (CSS)
 *
 * Exits run faster than entrances. No bounce, no elastic, anywhere.
 *
 * Reduce Motion is not "no motion": entrances become opacity-only, numbers
 * land at their final value, the ring draws instantly. Feedback stays, because
 * reduced motion means gentler, not absent — a control that answers nothing
 * feels broken to everyone.
 */
(() => {
'use strict';
const R = window.TRACE_ROOMS;
if (!R) return;

const reduce = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

/* ---------------------------------------------------------------- numbers */
/* A counted value, not a slot machine: it runs once, eases out, and lands on
   the number that was always true. Rolling digits would be decoration on a
   fact. */
function count(el) {
  const to = +el.dataset.count;
  if (!isFinite(to)) return;
  if (reduce()) { el.textContent = to; return; }
  const t0 = performance.now(), dur = 900;
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ------------------------------------------------------------------ rings */
/* Drawn to the real remaining fraction, which is carried on the element —
   an arc chosen to look good is a lie about how much time is left. */
function ring(c) {
  const off = +c.dataset.off;
  if (!isFinite(off)) return;
  if (reduce()) { c.style.strokeDashoffset = off; return; }
  requestAnimationFrame(() => {
    c.style.transition = 'stroke-dashoffset 1100ms cubic-bezier(.16,1,.3,1)';
    c.style.strokeDashoffset = off;
  });
}

/* -------------------------------------------------------------- entrances */
/* Once per mount, never on re-render of the same screen — a list that
   re-animates every time a switch flips is a screen that will not sit still. */
const entered = new WeakSet();

function enter(root) {
  if (!root) return;
  const items = $$('.rise', root);
  if (!items.length) return;
  const soft = reduce();
  items.forEach((el, i) => {
    if (entered.has(el)) { el.classList.add('is-in'); return; }
    entered.add(el);
    /* the stagger is capped, so the last card on a long screen still arrives
       inside a third of a second */
    const d = el.style.getPropertyValue('--d') || Math.min(320, i * 60) + 'ms';
    el.style.setProperty('--d', d);
    el.classList.toggle('soft', soft);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
  });
  $$('[data-count]', root).forEach(count);
  $$('.us-prog', root).forEach(ring);
}

/* ------------------------------------------------------------- the bloom */
/* The one authored moment. Light spreads through the glass and fades; it is
   never idle, and nothing else in the app is allowed to glow. */
function bloom(el, ms = 1100) {
  if (!el) return;
  el.classList.add('g-lit');
  setTimeout(() => el.classList.remove('g-lit'), ms);
}

R.motion = { enter, count, ring, bloom, reduce };
})();
