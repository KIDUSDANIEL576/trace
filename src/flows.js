/* trace — the four missing flows, designed in the clean system's language,
 * plus the honest list (AUDIT-FLOWS.md P1/P2).
 *
 * These are the screens no design file draws and every shipped app has:
 *   1. Permission priming — one iOS prompt, ever, so the primer comes first,
 *      and only at the first moment of received value.
 *   2. The notification taxonomy — what rings, what banners, what stays on
 *      the widget. The flare is locked loud; the widget is locked silent.
 *   3. Your key — account restore without an account: one copyable key that
 *      re-arms the pairing and the board on a new phone.
 *   4. Unpair — the hardest screen in a couples app. Instant, no consent
 *      theatre, the canvas seals into a last chapter, the pocket burns.
 *
 * Honest list, also here: widget add-tutorial · loading/failed states (in
 * app.js) · accessibility (labels + reduced motion) · offline merge rule (in
 * rooms.js) · her-time from real timezones · low-power mode · the review ask.
 */
(() => {
'use strict';
const R = window.TRACE_ROOMS;
if (!R) return;
const { el, esc, save, ui } = R;
const db = R.db;
const toast = ui.toast, buzz = ui.buzz;
const $ = (s2, r) => (r || document).querySelector(s2);
const $$ = (s2, r) => [...(r || document).querySelectorAll(s2)];

R.defaults({
  perm: 'unasked',          /* notification permission: unasked|later|granted|denied */
  /* Goodnight is off by default — README Interruptions #4, and p50 draws its
     switch off. `agreed` is the only other thing allowed to ring, and only
     because both people said yes to it. */
  loud: { flare: 'ring', leave: 'banner', goodnight: 'off', agreed: 'banner',
    trace: 'widget', notice: 'widget', list: 'widget' },
  widgetTut: false,
  sealed: null,             /* {when, marks} — the last chapter */
  reviewAsked: false,
});

/* The value slot is 14px, which is below the size at which AA lets a colour
   through on 3:1 — and the flat brand red on a white card measures 4.39:1. The
   token table already names the answer: red-deep is "red text on paper,
   contrast-safe". Callers pass the brand red because that is what they mean;
   this is where "red, as text" gets resolved to the token that can be read. */
const redText = (tint) => (tint === 'var(--red)' ? 'var(--red-text)' : (tint || 'var(--ink)'));

const kv = (k, v, tint) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:12px 14px;
  border-radius:14px;background:var(--surface);border:1px solid var(--surface)">
  <span style="font-size:13px;color:var(--ink-3)">${esc(k)}</span>
  <span style="font-size:14px;font-weight:600;color:${redText(tint)}">${esc(v)}</span></div>`;
const note = (t) => el(`<div class="p-note">${t}</div>`);

/* ================= 1 · permission priming — first received value ========= */

/* Both sheets below used to paint their panel `rgba(10,12,26,.97)` — a
   near-black blue left over from the pre-paper design — while filling it with
   --ink tokens. On paper that is dark text on a dark panel, i.e. unreadable,
   and it is off-palette on both grounds. It survived every audit because
   neither sheet is a screen: they are appended to #screen on a trigger (first
   received ink, then the one after), so a walk of the 72 screens never sees
   them. --surface is the token that means "the panel a sheet is drawn on". */
let primerUp = false;
function showPrimer() {
  if (primerUp || db.perm !== 'unasked') return;
  primerUp = true;
  const ov = el(`<div style="position:absolute;inset:0;z-index:60;background:var(--scrim);display:flex;align-items:flex-end">
    <div style="width:100%;border-radius:26px 26px 0 0;background:var(--surface);border:1px solid var(--hairline);
      border-bottom:none;padding:22px 22px 30px;display:flex;flex-direction:column;gap:12px;text-align:center">
      <div style="width:44px;height:44px;border-radius:14px;margin:0 auto;background:linear-gradient(160deg,var(--ground-alt),var(--surface));
        border:1px solid var(--hairline);display:flex;align-items:center;justify-content:center">
        <svg viewBox="0 0 30 30" style="width:24px;height:24px"><path d="M5 20 C11 8,15 24,25 10"
          stroke="var(--amber)" stroke-width="3" fill="none" stroke-linecap="round"/></svg></div>
      <div style="font-size:20px;font-weight:600">She just left you something</div>
      <div style="font-size:14px;line-height:1.5;color:var(--ink-2)">Moments like this can land quietly —
        the widget changes, nothing buzzes. The only loud thing, ever, is the flare.</div>
      <button class="p-cta" data-allow>Let them land</button>
      <button class="ob-skip" data-later style="margin:0">not now — the widget still works</button>
    </div></div>`);
  $('#screen').appendChild(ov);
  ov.querySelector('[data-allow]').addEventListener('click', async () => {
    db.perm = 'granted';
    try { if ('Notification' in window) db.perm = (await Notification.requestPermission()) === 'granted' ? 'granted' : 'denied'; } catch (e) {}
    save(); ov.remove(); primerUp = false; buzz(10);
    if (db.perm === 'granted') subscribePush();
    toast(db.perm === 'granted' ? 'set — only what you chose in How loud' : 'kept quiet — the widget carries everything');
  });
  ov.querySelector('[data-later]').addEventListener('click', () => {
    db.perm = 'later'; save(); ov.remove(); primerUp = false;
  });
}

/* real web push: the device subscribes under the pairing token, and the
   flare rings the partner through the push edge function. Silent no-op
   wherever the platform can't (that honesty is in the tutorial copy). */
const VAPID_PUB = 'BKTgp0RYCDJmgT8i9mQ-sl3EU_YTuvjxCYqhFfCJyPXWznKpjyuWXPqC9idiqri5mnKTyd0mcTOhM-VELJY1uzo';
const PUSH_URL = 'https://doadibyqqdimzzywcglv.supabase.co/functions/v1/push';
const PUSH_KEY = 'sb_publishable_W1K6K6qLY2ftOWNBbdm4hA__B7DpmtJ';
function b64uToBytes(str) {
  const pad = '='.repeat((4 - str.length % 4) % 4);
  const raw = atob((str + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
async function subscribePush() {
  try {
    const token = window.TRACE_NET && TRACE_NET.token;
    if (!token || !('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(VAPID_PUB) });
    db.pushEndpoint = sub.endpoint; save();
    await fetch(PUSH_URL, { method: 'POST',
      headers: { 'content-type': 'application/json', apikey: PUSH_KEY },
      body: JSON.stringify({ op: 'sub', token, sub: sub.toJSON() }) });
  } catch (e) { /* platform said no — the widget still carries everything */ }
}
window.TRACE_PUSH = {
  subscribe: subscribePush,
  ring(kind, body2) {
    const token = window.TRACE_NET && TRACE_NET.token;
    if (!token) return;
    /* "Quiet hours — nothing buzzes 10pm–7am" was a switch that remembered its
       own position and gated nothing. It is an interruption promise in an app
       whose whole argument is about interruption, so it is the one of the six
       that had to be wired first.
       The flare is exempt by design: it is the single thing p50 says always
       breaks through, three times a year. */
    const h = new Date().getHours();
    if (kind !== 'flare' && (db.sw || {}).quiet && (h >= 22 || h < 7)) return;
    fetch(PUSH_URL, { method: 'POST',
      headers: { 'content-type': 'application/json', apikey: PUSH_KEY },
      body: JSON.stringify({ op: 'ring', token, kind, body: body2, self: db.pushEndpoint }) }).catch(() => {});
  },
};
/* already granted on a previous visit → re-arm silently */
if (db.perm === 'granted') setTimeout(subscribePush, 3000);

/* ============ honest list · widget add-tutorial — the Locket moment ====== */

function showWidgetTut() {
  if (db.widgetTut || primerUp) return;
  db.widgetTut = 'shown';
  const step = (n, t) => `<div style="display:flex;gap:12px;align-items:center;text-align:left">
    <span style="width:26px;height:26px;border-radius:50%;background:var(--hairline);flex:none;
      display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600">${n}</span>
    <span style="font-size:14px;color:var(--ink-2)">${t}</span></div>`;
  const ov = el(`<div style="position:absolute;inset:0;z-index:60;background:var(--scrim);display:flex;align-items:flex-end">
    <div style="width:100%;border-radius:26px 26px 0 0;background:var(--surface);border:1px solid var(--hairline);
      border-bottom:none;padding:22px 22px 30px;display:flex;flex-direction:column;gap:14px">
      <div style="font-size:20px;font-weight:600;text-align:center">Put her on your home screen</div>
      <div style="font-size:13px;color:var(--ink-3);text-align:center">Installed, trace runs full-screen and her things can reach you.</div>
      ${/iphone|ipad|ipod/i.test(navigator.userAgent)
        ? step(1, 'Open trace in <b>Safari</b>') + step(2, 'Tap <b>Share</b> → <b>Add to Home Screen</b>')
          + step(3, 'Open it from the icon — that’s the one that can ring')
        : step(1, 'Tap the browser menu <b>⋮</b>') + step(2, 'Choose <b>Install app</b> (or Add to Home screen)')
          + step(3, 'Open it from the icon — that’s the one that can ring')}
      <button class="p-cta" data-done>Done — it’s there</button>
      <button class="ob-skip" data-skip style="margin:0">I’ll do it later</button>
    </div></div>`);
  $('#screen').appendChild(ov);
  ov.querySelector('[data-done]').addEventListener('click', () => {
    db.widgetTut = true; save(); ov.remove(); buzz(14);
    toast('that’s the whole setup — it just changes now');
  });
  ov.querySelector('[data-skip]').addEventListener('click', () => {
    db.widgetTut = 'later'; save(); ov.remove();   /* asks once more, then never */
  });
}

/* first received ink triggers the primer; the next one, the tutorial */
let lastPartnerN = 0;
setInterval(() => {
  const APP = window.TRACE_APP; if (!APP || !APP.strokeCount) return;
  const total = APP.strokeCount();
  const partnerish = total - lastPartnerN;
  if (APP.handCount() >= 2 && total > lastPartnerN) {
    lastPartnerN = total;
    if (db.perm === 'unasked') showPrimer();
    else if (!db.widgetTut || db.widgetTut === 'later') showWidgetTut();
  }
}, 2500);

/* ==================== 2 · the notification taxonomy ====================== */

/* This panel is the same four permissions p50 states, plus the things that can
   only ever sit on the widget. It used to offer a banner for drawings and a
   ring for notices, which invariant 2 forbids outright — "never notifies:
   drawings, streaks, missions, journal, mood weather, or any room talking
   about itself". Offering a level the product may not honour is worse than
   hiding the row: it is a setting that lies. */
const LOUD_KINDS = [
  { id: 'flare', n: 'The flare', s: 'Three a year · full screen', locked: 'ring' },
  { id: 'leave', n: '“Leaving now”', s: 'Only when someone starts moving home' },
  { id: 'agreed', n: 'A reminder you both agreed to', s: 'Never one person’s idea alone' },
  { id: 'goodnight', n: 'Goodnight', s: 'One nudge at your hour · off by default' },
  { id: 'trace', n: 'Drawing traces', s: 'One-time ink', locked: 'widget' },
  { id: 'notice', n: 'Notices', s: 'Deadlines, letters, doses', locked: 'widget' },
  { id: 'list', n: 'List ticks', s: 'Ticks as they happen', locked: 'widget' },
];
const LEVELS = ['ring', 'banner', 'off'];
const LEVEL_LABEL = { ring: 'Rings', banner: 'Banner', off: 'Widget only' };

R.addSub('loud', 'how loud', (body) => {
  const draw = () => {
    body.innerHTML = '';
    body.appendChild(note('One rule above all of it: the widget changing is never a notification. These are the exceptions you allow.'));
    LOUD_KINDS.forEach((k) => {
      const cur = k.locked || db.loud[k.id] || 'widget';
      const row = el(`<div class="row" style="flex-direction:column;align-items:stretch;gap:10px">
        <div><span class="n">${esc(k.n)}</span><span class="s">${esc(k.s)}${
          k.locked === 'ring' ? ' · can’t be turned down' :
          k.locked === 'widget' ? ' · waits on the widget, always' : ''}</span></div>
        <div style="display:flex;gap:6px">${LEVELS.map((lv) => {
          const dis = (k.locked && lv !== k.locked) || (k.lockedMax === 'banner' && lv === 'ring');
          const on = cur === lv;
          return `<button data-lv="${lv}" ${dis ? 'disabled' : ''} style="flex:1;min-height:44px;border-radius:12px;
            font-size:12.5px;font-weight:600;opacity:${dis ? .3 : 1};
            background:${on ? 'var(--ink)' : 'var(--pane-2)'};color:${on ? 'var(--ground)' : 'var(--ink)'}">${LEVEL_LABEL[lv]}</button>`;
        }).join('')}</div></div>`);
      row.querySelectorAll('[data-lv]').forEach((b) => b.addEventListener('click', () => {
        if (k.locked) return;
        db.loud[k.id] = b.dataset.lv; save(); buzz(6); draw();
      }));
      body.appendChild(row);
    });
    body.appendChild(note('Quiet hours mute banners and rings — everything but the flare. The flare is the one promise: it always gets through.'));
  };
  draw();
});

/* ======================== 3 · your key — restore ========================= */

/* storage can be denied outright; a key that cannot be built is better than a
   screen that throws */
const ls = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
function makeKey() {
  let code = ls('trace:pairCode') ||
    (JSON.parse(ls('trace:store') || '{}').pairCode) || 'xxxxx';
  code = String(code).replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'xxxxx';
  const name = ls('trace:myname') || 'me';
  return 'trace-' + code + '-' + btoa(unescape(encodeURIComponent(name))).replace(/=+$/, '').toLowerCase();
}
R.addSub('key', 'your key', (body) => {
  const key = makeKey();
  body.appendChild(note('A new phone starts from this. It re-arms the pairing and pulls your board back — <b>drawings stay on the phones that drew them</b>, as promised.'));
  body.appendChild(el(`<div style="padding:16px;border-radius:16px;background:var(--emph);
    color:var(--emph-ink);text-align:center">
    <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--emph-red)">Your key</div>
    <div style="font:700 17px ui-monospace,Menlo,monospace;letter-spacing:.06em;margin-top:8px;word-break:break-all">${esc(key)}</div></div>`));
  const copy = el(`<button class="p-cta">Copy it somewhere safe</button>`);
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(key); toast('copied — a notes app or a password manager'); }
    catch (e) { toast(key); }
  });
  body.appendChild(copy);
  body.appendChild(el(`<div class="eyebrow" style="padding:12px 0 2px">On the new phone</div>`));
  const field = el(`<input placeholder="paste a key" style="padding:14px;border-radius:14px;text-align:center;
    border:1px solid var(--hairline);background:var(--surface);color:var(--ink);
    font:600 13px ui-monospace,Menlo,monospace">`);
  const go = el(`<button class="p-ghost">Restore from it</button>`);
  go.addEventListener('click', () => {
    const m = /^trace-([a-z0-9]{5})-([a-z0-9+/]+)$/i.exec(field.value.trim());
    if (!m) { field.style.borderColor = 'var(--red)'; toast('that’s not a trace key'); return; }
    localStorage.setItem('trace:pairCode', m[1]);
    try { localStorage.setItem('trace:myname', decodeURIComponent(escape(atob(m[2])))); } catch (e) {}
    if (window.TRACE_NET) TRACE_NET.join(m[1], 'supabase', () => {});
    buzz(14); toast('restored — the pairing is reaching for her now');
  });
  body.append(field, go);
  body.appendChild(note('In production this key lives in the iCloud / Google keychain and restore is invisible. The manual key is the fallback that always works.'));
});

/* ====================== 4 · unpair — the last chapter ==================== */

R.addSub('unpair', 'unpair', (body) => {
  if (db.sealed) {
    body.appendChild(el(`<div class="p-stat" style="font-size:22px">The canvas is sealed</div>`));
    body.appendChild(note(`Since ${esc(db.sealed.when)}. ${db.sealed.marks} marks stay readable, here, forever. Nothing was deleted on her side either.`));
    const re = el(`<button class="p-ghost">Start again — a new canvas, chapter 1</button>`);
    re.addEventListener('click', () => {
      db.sealed = null; window.TRACE_SEALED = false; save();
      buzz(14); toast('a new canvas. it remembers nothing, on purpose.');
      const x = $('#panel-close'); x && x.click();
      R.show('canvas');
    });
    body.appendChild(re);
    return;
  }
  body.appendChild(note('No consent theatre — either of you can do this alone, instantly. Here is exactly what happens:'));
  body.appendChild(el(kv('The canvas', 'seals — read-only, both phones', 'var(--red-text)')));
  body.appendChild(el(kv('Your history', 'stays on your phone', 'var(--ink)')));
  body.appendChild(el(kv('Her history', 'stays on hers — you delete only yours', 'var(--ink)')));
  body.appendChild(el(kv('The pocket', 'burns, unread, both sides', 'var(--red)')));
  body.appendChild(el(kv('The widget', 'goes quiet. No last message.', 'var(--ink)')));
  const hold = el(`<button class="p-cta" style="background:var(--pane-2);color:var(--red-text);box-shadow:inset 0 0 0 1px var(--red-line);min-height:60px;font-weight:700">Hold three seconds to unpair</button>`);
  let t = null;
  const start = () => { t = setTimeout(() => {
    const APP = window.TRACE_APP;
    db.sealed = { when: new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric' }),
      marks: APP && APP.strokeCount ? APP.strokeCount() : 0 };
    db.pocket = { what: '—', when: '', steps: [], reveal: 'burned, unread' };
    window.TRACE_SEALED = true;
    if (window.TRACE_NET && TRACE_NET.leave) TRACE_NET.leave();
    save(); buzz(30);
    R.resetDeck(); R.paint && R.paint();
    toast('sealed. take care of yourself.');
    const x = $('#panel-close'); x && x.click();
    R.show('canvas');
  }, 3000); };
  const stop = () => clearTimeout(t);
  hold.addEventListener('pointerdown', start);
  hold.addEventListener('pointerup', stop);
  hold.addEventListener('pointerleave', stop);
  body.appendChild(hold);
  body.appendChild(note('Re-pairing later — with anyone — starts at chapter 1. Nothing follows you in.'));
});

/* the sealed canvas states itself on the widget too */
R.addCard((d) => d.sealed ? {
  pri: 11, kind: 'sealed', tint: 'var(--ink-2)', head: 'sealed', foot: 'the last chapter',
  render(b) {
    b.innerHTML = `<div class="w-mid" style="opacity:.7"><b>The canvas is sealed</b>
      <i>${d.sealed.marks} marks, kept. Chapter closed ${esc(d.sealed.when)}.</i></div>`;
    return {};
  } } : null);
window.TRACE_SEALED = !!db.sealed;

/* ============== honest list · a11y, her time, low power, review ========= */

/* labels: every icon-only button speaks its title */
$$('button[title]:not([aria-label])').forEach((b) => b.setAttribute('aria-label', b.title));

/* her local time, from the tz the hi-handshake carries — shown where you
   already go to reach her (the presence panel) */
R.addPresence((body) => {
  const tz = window.TRACE_NET && TRACE_NET.partnerTz;
  if (!tz) return;
  let hers;
  try { hers = new Intl.DateTimeFormat(undefined, { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(new Date()); }
  catch (e) { return; }
  body.prepend(el(`<div class="p-hint" style="margin:-2px 0 2px">Where she is, it’s <b>${esc(hers)}</b></div>`));
});

/* low power: honor the battery — the deck holds still, and says so once */
if (navigator.getBattery) navigator.getBattery().then((b) => {
  const check = () => {
    const low = b.level <= .2 && !b.charging;
    if (low && !window.TRACE_LOWPOWER) toast('battery saver — the widget holds still, ink still flows');
    window.TRACE_LOWPOWER = low;
  };
  b.addEventListener('levelchange', check); b.addEventListener('chargingchange', check); check();
}).catch(() => {});

/* the review ask: only ever on a day both of you drew, once, quietly */
setInterval(() => {
  if (db.reviewAsked || db.sealed) return;
  const APP = window.TRACE_APP; if (!APP || !APP.strokeCount) return;
  if (APP.handCount() >= 2 && APP.strokeCount() >= 6) {
    db.reviewAsked = true; save();
    toast('a good day on this canvas. if trace is working for you two, a rating helps it reach more people — Quiet & private has the link.', 5200);
  }
}, 45000);

})();
