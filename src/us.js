/* trace — the Us surface.
 *
 * A new screen, not a reskin of the canvas. It gives the app a home that isn't
 * a blank sheet, and it is where the glass widgets belong.
 *
 * Every card holds exactly one fact. The order is the order in
 * GLASS-AND-MOTION.md §3: greeting and presence, the streak as hero, the
 * capsule and the week as a pair, their last trace, the heartbeat.
 *
 * The rule that makes the streak worth having: a day fills RED ONLY WHEN BOTH
 * OF YOU DREW. A one-sided day is a plain dot. That single condition turns a
 * vanity metric into a picture of the relationship, and it is the reason red
 * is allowed here at all — a filled day is literally two marks, so it is ink,
 * not decoration. A neighbouring app cannot use it, because it needs two
 * people to be true.
 *
 * The canvas stays home in the invariant sense: this screen's primary action is
 * still the board, and every route out of here leads to it.
 */
(() => {
'use strict';
const R = window.TRACE_ROOMS;
if (!R) return;
const { el, esc, ui, screens, show, db, save } = R;
const toast = ui.toast, buzz = ui.buzz;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

R.defaults({
  /* Seven days, this week, from Monday. 2 = both drew, 1 = one of you, 0 =
     nobody. Only a 2 is allowed to be red. */
  weekBoth: [2, 2, 1, 2, 2, 2, 1],
  together: 247,          /* days since you paired */
  capsuleLeft: 6,         /* of a 14-day capsule */
  capsuleSpan: 14,
  weekMarks: 34,
  lastTrace: { who: 'Maya', ago: '4m ago', strokes: 7, secs: 14 },
});

const sec = document.createElement('section');
sec.className = 'scr hidden';
sec.id = 'sc-us';
$('#stack').appendChild(sec);
screens.us = sec;

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/* The mark itself, drawn — never a decorative squiggle. Two strokes that meet
   is the whole story of the product, so the thumbnail is that and nothing
   else. `w` scales the pen so the same path reads at thumbnail and full size
   without becoming a hairline. */
const traceMark = (w = 1) => `
  <svg viewBox="12 26 276 166" preserveAspectRatio="xMidYMid meet" class="us-mark" aria-hidden="true">
    <path fill="none" stroke="var(--red)" stroke-width="${7 * w}" stroke-linecap="round"
      stroke-linejoin="round" d="M150 118c-14-17-33-10-33 5 0 16 24 27 33 34 9-7 33-18 33-34 0-15-19-22-33-5z"/>
    <path fill="none" stroke="currentColor" stroke-width="${4.4 * w}" stroke-linecap="round"
      d="M104 62c7-11 17-11 24 0"/>
    <path fill="none" stroke="currentColor" stroke-width="${4.4 * w}" stroke-linecap="round"
      d="M172 62c7-11 17-11 24 0"/>
  </svg>`;

const hour = () => new Date().getHours();
const greeting = () => (hour() < 5 ? 'Still up' : hour() < 12 ? 'Good morning'
  : hour() < 18 ? 'Good afternoon' : 'Good evening');

function render() {
  const t = db.lastTrace;
  const her = (db.partner || 'Maya');
  /* The capsule ring is drawn to its real remaining fraction, never a pretty
     arc — r=40 gives a 251px circumference. */
  const frac = 1 - db.capsuleLeft / db.capsuleSpan;
  const quiet = R.quiet && R.quiet();

  sec.innerHTML = `
    <div class="hd">
      <div class="pill" id="us-presence"><span class="dot"></span><span>${esc(her)} is here</span></div>
      <button class="icob" data-go-board title="your board"><svg class="ts-i"><use href="#i-turn-out"/></svg></button>
    </div>

    <div class="body us-body">
      <div class="us-head rise" style="--d:20ms">
        <div>
          <div class="us-hi">${greeting()}<b>.</b></div>
          <div class="us-who">You and ${esc(her)} &middot; ${db.together} days</div>
        </div>
        <div class="us-av">${esc(her.slice(0, 1))}<i></i></div>
      </div>

      ${quiet ? `
      <div class="card rise" style="--d:80ms">
        <div class="k">It's gone quiet</div>
        <div class="us-quiet">No counts, no streaks, no suggestions &mdash; until one of you comes back.</div>
      </div>` : `
      <button class="card us-hero rise" data-go-thread style="--d:80ms">
        <div class="k">Your streak</div>
        <div class="us-num"><span data-count="${db.streak || 41}">0</span><small>days</small></div>
        <div class="us-week">
          ${db.weekBoth.map((v, i) => `<span class="us-day${v === 2 ? ' both' : v === 1 ? ' one' : ''}${i === 6 ? ' today' : ''}">
            <b></b>${DAYS[i]}</span>`).join('')}
        </div>
        <div class="us-legend">A day fills only when you both drew</div>
      </button>

      <div class="us-pair rise" style="--d:140ms">
        <button class="card us-stat" data-sub-open="capsule">
          <svg class="us-ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="6" opacity=".10"/>
            <circle class="us-prog" cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="6"
              stroke-dasharray="251" stroke-dashoffset="251" transform="rotate(-90 50 50)"
              data-off="${(251 * (1 - frac)).toFixed(1)}"/>
          </svg>
          <div class="k">Capsule</div>
          <div class="us-big">${db.capsuleLeft}<small>days</small></div>
        </button>
        <button class="card us-stat" data-go-marks>
          <div class="k">This week</div>
          <div class="us-big"><span data-count="${db.weekMarks}">0</span><small>marks</small></div>
        </button>
      </div>`}

      <button class="card us-trace rise" data-go-canvas style="--d:200ms">
        <div class="us-sheet">${traceMark(1)}</div>
        <div class="us-foot">
          <span class="us-nm">${esc(t.who)}</span>
          <span class="us-ago">${esc(t.ago)}</span>
          <span class="us-open">Open<span class="chev">›</span></span>
        </div>
      </button>

      <div class="card us-beat rise" style="--d:260ms">
        <div class="us-beat-t">
          <b>Send a heartbeat</b>
          <span>She'll feel it in a second</span>
        </div>
        <button class="us-btn" id="us-heart" aria-label="Send a heartbeat">
          <svg class="ts-i"><use href="#i-heart-fill"/></svg><span class="us-pulse"></span>
        </button>
      </div>
    </div>`;

  wire();
  R.motion && R.motion.enter(sec);
}

function wire() {
  $$('[data-go-board]', sec).forEach((b) => b.addEventListener('click', () => show('board')));
  $$('[data-go-canvas]', sec).forEach((b) => b.addEventListener('click', () => show('canvas')));
  $$('[data-go-thread]', sec).forEach((b) => b.addEventListener('click', () => R.openSub('journal')));
  $$('[data-go-marks]', sec).forEach((b) => b.addEventListener('click', () => R.openSub('wall')));
  $$('[data-sub-open]', sec).forEach((b) => b.addEventListener('click', () => R.openSub(b.dataset.subOpen)));

  const h = $('#us-heart', sec);
  if (h) h.addEventListener('click', () => {
    /* The pulse is the mark travelling, so the same verb reaches both ends:
       she is told you were thinking of her, not that a button was pressed. */
    const p = $('.us-pulse', h);
    p.classList.remove('go'); void p.offsetWidth; p.classList.add('go');
    const card = h.closest('.card');
    card.classList.add('g-lit');
    setTimeout(() => card.classList.remove('g-lit'), 1100);
    buzz(14);
    R.push('heartbeat', { at: Date.now() });
    toast(`${db.partner || 'Maya'} felt that.`);
  });
}

R.addScreen('us', render);
/* The canvas is still home. This is the room you land in from the directory,
   and its own primary action is the board. */
R.addBeyond('Us', 'The streak, the capsule, their last trace', 'us');
})();
