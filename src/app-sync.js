/* trace — real pairing. One sync engine, two transports:
   · supabase  — Supabase Realtime broadcast (project: trace), for two phones
   · local     — BroadcastChannel, for two windows on one device
   The app talks to TRACE_NET; TRACE_NET talks to whichever transport is up.
   When a real partner is present, simulated Sara stands down. */
(() => {
'use strict';

const SUPA_URL = 'wss://doadibyqqdimzzywcglv.supabase.co/realtime/v1/websocket' +
  '?apikey=sb_publishable_W1K6K6qLY2ftOWNBbdm4hA__B7DpmtJ&vsn=1.0.0';

/* ------------------------------------------------------------ transports */

function supaTransport(code, onMsg, onStatus) {
  const topic = 'realtime:trace:' + code;
  let ws, ref = 0, hb, alive = false, closed = false;
  const raw = (o) => { try { ws.readyState === 1 && ws.send(JSON.stringify(o)); } catch {} };
  const connect = () => {
    if (closed) return;
    try { ws = new WebSocket(SUPA_URL); } catch (e) { onStatus('error', 'no websocket'); return; }
    ws.onopen = () => {
      raw({ topic, event: 'phx_join', ref: '1', join_ref: '1',
        payload: { config: { broadcast: { self: false } } } });
      clearInterval(hb);
      hb = setInterval(() => raw({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++ref + 1000) }), 25000);
    };
    ws.onmessage = (m) => {
      let d; try { d = JSON.parse(m.data); } catch { return; }
      if (d.event === 'phx_reply' && d.ref === '1') {
        if (d.payload?.status === 'ok') { alive = true; onStatus('open'); }
        else onStatus('error', 'join refused');
      }
      if (d.event === 'broadcast' && d.payload?.payload) onMsg(d.payload.event, d.payload.payload);
    };
    ws.onclose = () => { alive = false; clearInterval(hb); if (!closed) { onStatus('closed'); setTimeout(connect, 1800); } };
    ws.onerror = () => { if (!alive) onStatus('error', 'unreachable'); };
  };
  connect();
  return {
    kind: 'supabase',
    send: (event, payload) => raw({ topic, event: 'broadcast', ref: String(++ref),
      join_ref: '1', payload: { type: 'broadcast', event, payload } }),
    close: () => { closed = true; clearInterval(hb); try { ws.close(); } catch {} },
  };
}

function localTransport(code, onMsg, onStatus) {
  let bc = null;
  try { bc = new BroadcastChannel('trace:' + code); } catch {}
  const key = 'trace:bus:' + code;
  if (bc) {
    bc.onmessage = (e) => onMsg(e.data.event, e.data.payload);
  } else {
    addEventListener('storage', (e) => {
      if (e.key !== key || !e.newValue) return;
      try { const d = JSON.parse(e.newValue); onMsg(d.event, d.payload); } catch {}
    });
  }
  setTimeout(() => onStatus('open'), 30);
  return {
    kind: 'local',
    send: (event, payload) => {
      if (bc) bc.postMessage({ event, payload });
      else { try { localStorage.setItem(key, JSON.stringify({ event, payload, n: Math.random() })); } catch {} }
    },
    close: () => { bc && bc.close(); },
  };
}

/* ---------------------------------------------------------------- engine */

const me = Math.random().toString(36).slice(2, 8);
let t = null;                 // active transport
let partnerSeen = 0;          // last hello from the other side
let partnerName = 'them';
let hello = null, ptsBuf = [], ptsFlush = null;

const NET = window.TRACE_NET = {
  live: () => !!t && (performance.now() - partnerSeen) < 9000,
  kind: () => (t ? t.kind : null),

  emit(event, payload) {
    if (!t) return;
    if (event === 'sp') {                       // batch stroke points ~12/s
      ptsBuf.push(payload);
      if (!ptsFlush) ptsFlush = setTimeout(() => {
        t.send('sp', { id: ptsBuf[0].id, pts: ptsBuf.map(p => p.pt), from: me });
        ptsBuf = []; ptsFlush = null;
      }, 80);
      return;
    }
    t.send(event, { ...payload, from: me });
  },

  /* the security gate: a 5-char code is never a channel name. It exchanges
     (once, cached) for an unguessable token via the pair edge function, and
     the channel is named by the token. */
  async resolveToken(code) {
    const k = 'trace:token:' + code;
    const hit = localStorage.getItem(k);
    if (hit) return hit;
    const r = await fetch('https://doadibyqqdimzzywcglv.supabase.co/functions/v1/pair', {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: 'sb_publishable_W1K6K6qLY2ftOWNBbdm4hA__B7DpmtJ' },
      body: JSON.stringify({ code }),
    });
    if (!r.ok) throw new Error('pair ' + r.status);
    const { token } = await r.json();
    localStorage.setItem(k, token);
    return token;
  },

  join(code, mode, ui) {
    NET.leave();
    const app = window.TRACE_APP;
    const onMsg = (event, p) => {
      if (!p || p.from === me) return;
      partnerSeen = performance.now();
      if (event === 'hi') {
        partnerName = p.name || 'them';
        if (p.tz) NET.partnerTz = p.tz;
        app.partner(true, partnerName);
        if (p.reply) return;
        NET.emit('hi', { name: NET.name, reply: true, tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
      }
      else if (event === 'sb') app.remoteBegin(p);
      else if (event === 'sp') app.remotePts(p);
      else if (event === 'se') app.remoteEnd(p);
      else if (event === 'heart') app.remoteHeart();
      else if (event === 'clear') app.remoteClear();
      else if (event === 'sky') app.remoteSky(p);
      else if (event === 'tug') app.remoteTug();
      else if (event === 'note') app.remoteNote(p.text);
      else if (event === 'board') app.remoteBoard(p);
    };
    const onStatus = (s, why) => ui && ui(s, why);
    if (mode !== 'local') {
      NET.resolveToken(code).then((token) => {
        NET.token = token;
        if (NET.code !== code) return;          /* user moved on meanwhile */
        t = supaTransport(token, onMsg, (s, why) => {
          if (s === 'open') {
            NET.emit('hi', { name: NET.name, tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
            clearInterval(hello);
            hello = setInterval(() => NET.emit('hi', { name: NET.name, reply: true, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }), 4000);
          }
          onStatus(s, why);
        });
      }).catch(() => onStatus('error', 'code exchange failed — check the connection'));
      NET.code = code; NET.mode = mode;
      return;
    }
    t = localTransport(code, onMsg, (s, why) => {
      if (s === 'open') {
        NET.emit('hi', { name: NET.name, tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
        clearInterval(hello);
        hello = setInterval(() => NET.emit('hi', { name: NET.name, reply: true, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }), 4000);
      }
      onStatus(s, why);
    });
    NET.code = code; NET.mode = mode;
  },

  leave() {
    if (t) t.close();
    t = null; clearInterval(hello);
    window.TRACE_APP && window.TRACE_APP.partner(false);
  },

  name: localStorage.getItem('trace:myname') || 'me',
};

/* ------------------------------------------------------------ pair UI */

const prev = window.TRACE_EXTRA;
window.TRACE_EXTRA = (api) => {
  const base = prev ? prev(api) : [];
  const { openPanel, toast, log, store, buzz } = api;
  const el = (h) => { const d = document.createElement('div'); d.innerHTML = h.trim(); return d.firstChild; };

  function pairPanel() {
    openPanel('pair our phones', (body) => {
      body.appendChild(el('<div class="p-note">This is the real thing — no simulated Sara. Same code on two phones (over the internet) or two windows on one device, and every stroke, heartbeat and tug crosses for real.</div>'));

      const nameRow = el('<input placeholder="your name" style="width:100%;padding:12px 14px;border-radius:14px;border:1px solid var(--hairline);background:var(--surface);color:var(--ink);font:14px system-ui">');
      nameRow.value = NET.name === 'me' ? '' : NET.name;
      nameRow.addEventListener('input', () => { NET.name = nameRow.value.trim() || 'me'; localStorage.setItem('trace:myname', NET.name); });
      body.appendChild(nameRow);

      const code = store.get('pairCode', null) || Math.random().toString(36).replace(/[^a-z0-9]/g, '').slice(0, 5);
      store.set('pairCode', code);
      body.appendChild(el(`<div style="text-align:center;padding:6px 0 0">
        <div style="font:700 10px ui-monospace,monospace;letter-spacing:.16em;color:var(--ink-3)">YOUR CODE</div>
        <div style="font:700 44px ui-monospace,monospace;letter-spacing:.3em;color:var(--amber);padding-left:.3em">${code}</div></div>`));

      const codeIn = el('<input placeholder="or type their code" maxlength="5" style="width:100%;padding:12px 14px;border-radius:14px;border:1px solid var(--hairline);background:var(--surface);color:var(--ink);font:700 16px ui-monospace,monospace;letter-spacing:.2em;text-align:center;text-transform:lowercase">');
      body.appendChild(codeIn);

      const status = el('<div class="p-hint">not connected</div>');
      const join = (mode) => {
        const c = (codeIn.value.trim() || code).toLowerCase();
        status.textContent = 'connecting…';
        NET.join(c, mode, (s, why) => {
          if (s === 'open') { status.textContent = (mode === 'local' ? 'two windows, one device' : 'live over the internet') + ' · code ' + c; toast('paired channel open — waiting for them'); log('NET open (' + mode + ') ' + c); buzz(12); }
          if (s === 'error') {
            status.textContent = mode === 'supabase'
              ? 'internet path unreachable here — try “two windows” or open this file on your phones'
              : 'could not open a local channel';
            log('NET error: ' + (why || s));
          }
        });
      };
      const b1 = el('<button class="p-cta">connect over the internet</button>');
      b1.addEventListener('click', () => join('supabase'));
      const b2 = el('<button class="p-ghost">two windows on this device</button>');
      b2.addEventListener('click', () => join('local'));
      const b3 = el('<button class="p-ghost">disconnect</button>');
      b3.addEventListener('click', () => { NET.leave(); status.textContent = 'not connected'; toast('back to the simulation'); });
      body.appendChild(b1); body.appendChild(b2); body.appendChild(b3);
      body.appendChild(status);
      body.appendChild(el('<div class="p-note">While paired, the simulated Sara stands down — everything that arrives is a person.</div>'));
    });
  }

  return [{ g: 'for real' },
    { id: 'pair', n: 'Pair — the real thing', d: 'two phones, or two windows. no simulation.', i: 'repeat', run: pairPanel },
  ].concat(base);
};
})();
