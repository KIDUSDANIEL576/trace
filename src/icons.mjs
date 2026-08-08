/**
 * icons.mjs — the icons, drawn with the pen the brand already owns.
 *
 * WHAT WAS WRONG
 *
 * The set used to be monoline geometry — stroke-width 2 everywhere, true
 * circles, exactly parallel ribs, corners closing to the pixel. That is
 * Lucide, Feather, SF Symbols and Material; it is the house style of every
 * app shipped since 2019, and next to a wordmark in Caveat it reads as
 * borrowed. The first attempt at fixing it nudged each coordinate a third of
 * a unit, which produced machine geometry rendered slightly badly. Position
 * noise is not what separates a drawn line from a plotted one.
 *
 * WHAT ACTUALLY SEPARATES THEM
 *
 * Weight. A pen presses into the middle of a stroke and lifts off the ends,
 * so the line breathes along its length and swells into a round terminal. A
 * `stroke-width` attribute is a single number and physically cannot do that,
 * however much you jitter the path underneath it.
 *
 * So nothing here is stroked. Every path is sampled into points, given a
 * half-width that varies along the arc, and emitted as a filled ribbon with
 * arc caps — the shape a felt tip actually leaves. The brand's own mark
 *
 *     M18 82 C42 26,66 96,102 34   ·   stroke-width 13 on a 120 box
 *
 * is 10.8% of its box, so these sit around 2.4 on a 24 box: heavier and
 * looser than a UI icon, which is the point.
 *
 * FOUR THINGS, ALL DERIVED FROM THE ICON'S NAME
 *
 *   1. Weight breathes along each stroke, and each stroke has its own base.
 *   2. Lines bow. The displacement is smooth low-frequency noise along the
 *      arc, so a straight line sags like a drawn one instead of kinking like
 *      a damaged one. This is the difference the first attempt missed.
 *   3. Strokes overshoot. A hand carries past the corner it is turning, so
 *      junctions cross instead of mitring.
 *   4. Nothing is level, and no circle is a circle — they are one sweep with
 *      a gap where the pen lifted.
 *
 * All of it hashes from the icon's id, so the pencil is the same pencil in
 * every build and a diff of this file shows real changes rather than noise.
 * Random jitter would redraw the set on every reload, which is not handmade,
 * it is restless.
 *
 * Every symbol keeps its id and viewBox, so existing `<use href="#i-…">`
 * needs no changes; `currentColor` still tints them, now as fill.
 */

/* ── the hand ─────────────────────────────────────────────────────────── */

/* A small integer hash. Same string in, same number out, forever. */
function seed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* A signed unit value for a given (name, index) — the hand's bias at that
   point on that stroke. Deterministic, evenly spread over -1..1. */
function tremor(id, i) {
  const h = seed(id + ':' + i);
  return ((h % 2000) / 1000) - 1;
}

/* Smooth noise along a stroke. Sampling `tremor` per coordinate gives white
   noise, which looks like a shaky hand rather than a steady one; interpolating
   between a few samples with a smoothstep gives a line that bows and recovers,
   which is what a hand does over 20mm of travel. */
function bow(id, t, freq) {
  const k = t * freq;
  const i = Math.floor(k);
  const f = k - i;
  const a = tremor(id, 400 + i);
  const b = tremor(id, 400 + i + 1);
  return a + (b - a) * f * f * (3 - 2 * f);
}

/* ── path → points ────────────────────────────────────────────────────── */

const TOKEN = /[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g;
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/* Beziers, sampled proportionally to the length of their control polygon so a
   tight curve gets more points than a lazy one. */
function cubic(p0, p1, p2, p3, out) {
  const n = Math.max(6, Math.ceil((dist(p0, p1) + dist(p1, p2) + dist(p2, p3)) / 0.6));
  for (let i = 1; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
}

/* Endpoint-parameterised elliptical arc, per the SVG spec's own appendix. */
function arc(p0, rx, ry, rot, laf, sf, x2, y2, out) {
  const [x1, y1] = p0;
  if (!rx || !ry) { out.push([x2, y2]); return; }
  const phi = (rot * Math.PI) / 180, cp = Math.cos(phi), sp = Math.sin(phi);
  const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
  const x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
  rx = Math.abs(rx); ry = Math.abs(ry);
  const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lam > 1) { const s = Math.sqrt(lam); rx *= s; ry *= s; }
  const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
  const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  let co = Math.sqrt(Math.max(0, num / den));
  if (laf === sf) co = -co;
  const cxp = (co * rx * y1p) / ry, cyp = (-co * ry * x1p) / rx;
  const cx = cp * cxp - sp * cyp + (x1 + x2) / 2;
  const cy = sp * cxp + cp * cyp + (y1 + y2) / 2;
  const ang = (ux, uy, vx, vy) => {
    const d = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy)) || 1;
    const a = Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / d)));
    return ux * vy - uy * vx < 0 ? -a : a;
  };
  const ux = (x1p - cxp) / rx, uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx, vy = (-y1p - cyp) / ry;
  const t1 = ang(1, 0, ux, uy);
  let dt = ang(ux, uy, vx, vy);
  if (!sf && dt > 0) dt -= 2 * Math.PI;
  if (sf && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(6, Math.ceil((Math.abs(dt) * Math.max(rx, ry)) / 0.6));
  for (let i = 1; i <= n; i++) {
    const t = t1 + (dt * i) / n;
    const px = rx * Math.cos(t), py = ry * Math.sin(t);
    out.push([cp * px - sp * py + cx, sp * px + cp * py + cy]);
  }
}

/* Returns [{ pts, closed }] — one entry per subpath, already flattened.
 *
 * Every command in the SVG grammar is handled, and an unknown one throws. An
 * earlier version skipped what it did not recognise, which meant `S` — the
 * smooth cubic, used by both hearts, the eye and the hourglass — silently ate
 * its coordinates one at a time and those four icons shipped as blobs. A
 * drawing that cannot be parsed should stop the build, not render wrong. */
function trace(d) {
  const t = d.match(TOKEN) || [];
  const subs = [];
  let cur = null, cmd = '', i = 0;
  let x = 0, y = 0, sx = 0, sy = 0;
  let lastC = null, lastQ = null;   /* previous control point, for S and T */
  const num = () => parseFloat(t[i++]);
  const open = () => { cur = { pts: [[x, y]], closed: false }; subs.push(cur); };
  const bez = (p1, p2, p3) => { cubic([x, y], p1, p2, p3, cur.pts); x = p3[0]; y = p3[1]; };
  /* a quadratic raised to a cubic, rather than writing a second sampler */
  const quad = (q, p3) => bez([x + (2 / 3) * (q[0] - x), y + (2 / 3) * (q[1] - y)],
    [p3[0] + (2 / 3) * (q[0] - p3[0]), p3[1] + (2 / 3) * (q[1] - p3[1])], p3);

  while (i < t.length) {
    if (/[a-zA-Z]/.test(t[i])) cmd = t[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const bx = rel ? x : 0, by = rel ? y : 0;
    const pt = () => [num() + bx, num() + by];

    if (C === 'Z') { if (cur) cur.closed = true; x = sx; y = sy; cur = null; lastC = lastQ = null; continue; }
    if (C === 'M') {
      [x, y] = pt(); sx = x; sy = y; open();
      cmd = rel ? 'l' : 'L';                       /* an M's extra pairs are lines */
      lastC = lastQ = null;
      continue;
    }
    if (!cur) open();

    if (C === 'L') { [x, y] = pt(); cur.pts.push([x, y]); lastC = lastQ = null; }
    else if (C === 'H') { x = num() + bx; cur.pts.push([x, y]); lastC = lastQ = null; }
    else if (C === 'V') { y = num() + by; cur.pts.push([x, y]); lastC = lastQ = null; }
    else if (C === 'C') { const p1 = pt(), p2 = pt(); bez(p1, p2, pt()); lastC = p2; lastQ = null; }
    else if (C === 'S') {
      /* the first control point is the previous one reflected through here */
      const p1 = lastC ? [2 * x - lastC[0], 2 * y - lastC[1]] : [x, y];
      const p2 = pt(); bez(p1, p2, pt()); lastC = p2; lastQ = null;
    }
    else if (C === 'Q') { const q = pt(); quad(q, pt()); lastQ = q; lastC = null; }
    else if (C === 'T') {
      const q = lastQ ? [2 * x - lastQ[0], 2 * y - lastQ[1]] : [x, y];
      quad(q, pt()); lastQ = q; lastC = null;
    }
    else if (C === 'A') {
      const rx = num(), ry = num(), rot = num(), laf = num(), sf = num();
      const [nx, ny] = pt();
      arc([x, y], rx, ry, rot, laf, sf, nx, ny, cur.pts); x = nx; y = ny;
      lastC = lastQ = null;
    }
    else throw new Error(`icons.mjs: unhandled path command "${cmd}" in ${d}`);
  }
  return subs;
}

/* ── points → ribbon ──────────────────────────────────────────────────── */

/* Even arc-length spacing, so the width profile advances at a constant rate
   instead of bunching wherever the sampler happened to be dense. */
function resample(pts, step) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = dist(pts[i - 1], pts[i]);
    if (seg < 1e-9) continue;
    let t = 0;
    while (carry + (seg - t) >= step) {
      t += step - carry; carry = 0;
      const k = t / seg;
      out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k,
        pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]);
    }
    carry += seg - t;
  }
  const last = pts[pts.length - 1];
  if (out.length < 2 || dist(out[out.length - 1], last) > step * 0.35) out.push(last);
  return out;
}

/* Douglas–Peucker. The ribbon is generated densely so the width profile stays
   smooth; this drops the points that carry no shape, which is the difference
   between a 30KB sprite and a 100KB one. */
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    let best = -1, bd = eps;
    for (let i = a + 1; i < b; i++) {
      const dd = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L;
      if (dd > bd) { bd = dd; best = i; }
    }
    if (best > 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

const f = (n) => (Math.round(n * 10) / 10).toString();
const poly = (pts) => pts.map((p) => f(p[0]) + ' ' + f(p[1])).join('L');

/* A hand draws a box as four strokes that cross at the corners, not as one
 * mitred outline, so every sharp turn becomes a lift and a fresh stroke.
 *
 * That is also the only way to keep the ribbon honest. Offsetting a path
 * outwards is fine; offsetting it inwards fails wherever the turn is tighter
 * than the pen is wide, because the inner edge crosses its own path and the
 * enclosed sliver fills solid. At 2.4 units wide every right angle in the set
 * did exactly that — the bin lid came out as a black slab.
 *
 * Splitting also means the pieces are separate `<path>` elements, so they
 * simply overlap on the corner instead of interacting through a fill rule.
 */
function shatter(sub, thresh = 0.9) {
  let p = sub.pts.slice();
  if (sub.closed && dist(p[0], p[p.length - 1]) > 1e-6) p.push(p[0]);
  if (p.length < 3) return [{ pts: p, closed: false, soft: [false, false] }];

  /* the turn at vertex i, in radians */
  const bend = (arr, i) => {
    const d = (j) => {
      const dx = arr[j + 1][0] - arr[j][0], dy = arr[j + 1][1] - arr[j][1];
      const L = Math.hypot(dx, dy) || 1;
      return [dx / L, dy / L];
    };
    const a = d(i - 1), b = d(i);
    return Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1])));
  };

  if (sub.closed) {
    const n = p.length;
    /* the seam is a corner like any other — a drawn ring rarely closes on a
       straight, and rotating the list to start there is what lets the whole
       shape be treated as one open stroke */
    let cut = bend([p[n - 2], p[0], p[1]], 1) > thresh ? 0 : -1;
    if (cut < 0) for (let i = 1; i < n - 1; i++) if (bend(p, i) > thresh) { cut = i; break; }
    if (cut < 0) return [{ pts: p, closed: true, soft: [false, false] }];
    if (cut > 0) p = p.slice(cut).concat(p.slice(1, cut + 1));
  }

  const out = [];
  let start = 0;
  for (let i = 1; i < p.length - 1; i++) {
    if (bend(p, i) <= thresh) continue;
    out.push({ pts: p.slice(start, i + 1), closed: false, soft: [start > 0 || sub.closed, true] });
    start = i;
  }
  out.push({ pts: p.slice(start), closed: false, soft: [start > 0 || sub.closed, sub.closed] });
  return out.filter((s) => s.pts.length > 1);
}

/* The pen's pressure at t along a stroke: a slow swell through the middle, and
   a lift into each terminal so the arc cap reads as the pen leaving the paper
   rather than a rounded-off rectangle. A terminal that is only a corner the
   stroke was split at lifts far less — the pen slowed there, it did not go. */
function widthAt(id, k, t, sub, base) {
  const swell = 1 + Math.sin(t * Math.PI * (1.1 + Math.abs(tremor(id, 700 + k)) * 0.9)
    + tremor(id, 720 + k) * 3.14) * 0.11;
  if (sub.closed) return base * swell;
  const soft = sub.soft || [false, false];
  const in0 = soft[0] ? 0.9 : 0.7, in1 = soft[1] ? 0.9 : 0.7;
  const lift = Math.min(in0 + (1 - in0) * Math.min(1, t / 0.13),
    in1 + (1 - in1) * Math.min(1, (1 - t) / 0.13));
  return base * swell * lift;
}

/* One stroke, as a filled outline. */
function ribbon(id, k, sub, base) {
  let pts = resample(sub.pts, 0.55);
  if (sub.closed && dist(pts[0], pts[pts.length - 1]) > 1e-6) pts = pts.concat([pts[0]]);
  const n = pts.length;

  let len = 0;
  for (let i = 1; i < n; i++) len += dist(pts[i - 1], pts[i]);
  /* a dot — an eye, a full stop. Ribboning a 0.01-long stroke gives nothing,
     so it becomes the blob the pen would leave. */
  if (len < 0.6 || n < 3) {
    const r = base * 1.05, [cx, cy] = pts[0];
    return `<path d="M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(r * 2)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-r * 2)} 0"/>`;
  }

  /* tangents smoothed over a small window, so the normals do not flip on a
     corner and pinch the ribbon shut */
  const tan = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 2)], b = pts[Math.min(n - 1, i + 2)];
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    tan.push([dx / L, dy / L]);
  }

  /* the line bows — amplitude scales with the stroke, because a 3mm tick does
     not wander the way a 20mm sweep does */
  const amp = Math.min(0.3, len * 0.028);
  const freq = 1.1 + Math.abs(tremor(id, 800 + k)) * 1.6;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const nx = -tan[i][1], ny = tan[i][0];
    const off = bow(id + ':' + k, t, freq) * amp * (sub.closed ? 0.7 : 1);
    const px = pts[i][0] + nx * off, py = pts[i][1] + ny * off;
    const w = widthAt(id, k, t, sub, base);
    L.push([px + nx * w, py + ny * w]);
    R.push([px - nx * w, py - ny * w]);
  }

  if (sub.closed) {
    /* A ring: outer boundary, then the inner one traversed backwards so the
       two wind against each other and nonzero punches the middle out. Not
       even-odd — at a sharp corner the inner offset folds back through itself,
       and even-odd fills that fold as a spur where nonzero leaves it hollow. */
    return `<path d="M${poly(simplify(L, 0.035))}ZM${poly(simplify(R.reverse(), 0.035))}Z"/>`;
  }
  /* an open stroke: down one side, round the end, back up the other.
     A half-circle between two points exactly 2r apart is either a cap or a
     notch; sweep 0 is the one that bulges past the end. */
  const wEnd = widthAt(id, k, 1, sub, base), wStart = widthAt(id, k, 0, sub, base);
  const er = R[n - 1], s = L[0];
  return `<path d="M${poly(simplify(L, 0.035))}` +
    `A${f(wEnd)} ${f(wEnd)} 0 0 0 ${f(er[0])} ${f(er[1])}` +
    `L${poly(simplify(R.reverse(), 0.035))}` +
    `A${f(wStart)} ${f(wStart)} 0 0 0 ${f(s[0])} ${f(s[1])}Z"/>`;
}

/* ── the symbol ───────────────────────────────────────────────────────── */

/* Ranges are narrow on purpose: wide enough that no two icons are twins,
   tight enough that they still read as one set at 18px in a toolbar. */
const handOf = (id) => ({
  base: 1.19 + tremor(id, 901) * 0.13,
  tilt: (tremor(id, 902) * 1.5).toFixed(2),
});

/* A hand carries past the corner it is turning. Extending each open stroke
   along its own tangent is what makes the junctions cross. */
function overshoot(sub, id, k) {
  if (sub.closed || sub.pts.length < 3) return sub;
  const p = sub.pts, n = p.length;
  let len = 0;
  for (let i = 1; i < n; i++) len += dist(p[i - 1], p[i]);
  if (len < 1.2) return sub;
  const ext = (a, b, d) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    return L < 1e-6 ? b : [b[0] + (dx / L) * d, b[1] + (dy / L) * d];
  };
  const a = 0.1 + Math.abs(tremor(id, 950 + k)) * 0.28;
  const b = 0.1 + Math.abs(tremor(id, 960 + k)) * 0.28;
  return {
    closed: false,
    soft: sub.soft,
    pts: [ext(p[1], p[0], a)].concat(p.slice(1, n - 1), [ext(p[n - 2], p[n - 1], b)]),
  };
}

const S = (id, inner, solid = false) => {
  const { base, tilt } = handOf(id);
  let k = 0;
  const drawn = inner
    /* a true circle is the loudest tell in the set, so it is drawn as one
       sweep with a gap where the pen lifted */
    .replace(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"\/>/g, (_, cx, cy, r) => {
      const x = +cx, y = +cy, rr = +r;
      const g = 0.3 + Math.abs(tremor(id + cx + cy, 7)) * 0.45;
      const a0 = tremor(id + cx, 8) * Math.PI;
      const a1 = a0 + Math.PI * 2 - g;
      const p = (a) => `${(x + Math.cos(a) * rr).toFixed(2)} ${(y + Math.sin(a) * rr).toFixed(2)}`;
      return `<path d="M${p(a0)}A${rr} ${rr} 0 1 1 ${p(a1)}"/>`;
    })
    .replace(/<path d="([^"]+)"\/>/g, (_, d) => {
      const subs = trace(d).filter((s) => s.pts.length > 1);
      if (solid) {
        /* a filled silhouette is hand-cut rather than hand-drawn: the edge
           still wanders, but there is no ribbon to build */
        return subs.map((s, j) => {
          const pts = resample(s.pts, 0.55);
          const freq = 1.3 + Math.abs(tremor(id, 800 + j)) * 1.4;
          const w = pts.map((pt, i) => {
            const t = i / (pts.length - 1);
            const a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 2)];
            const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
            const off = bow(id + ':' + j, t, freq) * 0.16;
            return [pt[0] - (dy / L) * off, pt[1] + (dx / L) * off];
          });
          return `<path d="M${poly(simplify(w, 0.03))}Z"/>`;
        }).join('');
      }
      return subs
        .flatMap((s) => shatter(s))
        .map((pc) => ribbon(id, k++, overshoot(pc, id, k), base))
        .join('');
    });
  return `<symbol id="i-${id}" viewBox="0 0 24 24">` +
    `<g transform="rotate(${tilt} 12 12)" fill="currentColor" stroke="none">${drawn}</g></symbol>`;
};

/* ── the pen, lent out ────────────────────────────────────────────────────
 *
 * A button's outline is the largest drawn line on the screen and it was a
 * 1px hairline, which is the one line width a pen cannot make. This returns a
 * hand-drawn rounded rectangle as a standalone SVG, sized for use as a
 * 9-slice `border-image`: the corners land inside the corner slices and carry
 * the character, the middles stretch to whatever width the button happens to
 * be. A stretched slice keeps its thickness — the horizontal edges are only
 * scaled along their length — so one image fits every button.
 *
 * The colour is baked, because a data URI cannot see `currentColor`. That is
 * why build.mjs emits one per ink value rather than one in total.
 */
export function drawnEdge(id, { size = 64, inset = 3, radius = 18, width = 0.8,
  colour = '#1A1A1A', dash = 0 } = {}) {
  const s = size, i = inset, r = radius, far = s - i;
  const d = `M${i + r} ${i}H${far - r}A${r} ${r} 0 0 1 ${far} ${i + r}` +
    `V${far - r}A${r} ${r} 0 0 1 ${far - r} ${far}` +
    `H${i + r}A${r} ${r} 0 0 1 ${i} ${far - r}` +
    `V${i + r}A${r} ${r} 0 0 1 ${i + r} ${i}Z`;
  let pieces = trace(d).flatMap((sub) => shatter(sub));
  if (dash) pieces = pieces.flatMap((pc) => chop(pc, dash, dash * 0.75));
  const parts = pieces
    .map((pc, k) => ribbon(id, k, dash ? pc : overshoot(pc, id, k), width))
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}">` +
    `<g fill="${colour}">${parts}</g></svg>`;
}

/* Cut a stroke into dashes by arc length.
 *
 * The dashed border on a note is a real distinction in the design — a note is
 * not a card — and `stroke-dasharray` cannot be used here because nothing is
 * stroked. Cutting the path into separate short strokes is closer to the truth
 * anyway: a dashed line drawn by hand is a row of individual marks, each with
 * its own taper, not one line with holes punched in it. */
function chop(sub, on, off) {
  const p = sub.pts;
  const out = [];
  let run = [p[0]], acc = 0, drawing = true;
  for (let i = 1; i < p.length; i++) {
    let seg = dist(p[i - 1], p[i]);
    let from = p[i - 1];
    while (seg > 1e-9) {
      const need = (drawing ? on : off) - acc;
      if (seg < need) { acc += seg; if (drawing) run.push(p[i]); break; }
      const k = need / seg;
      const cut = [from[0] + (p[i][0] - from[0]) * k, from[1] + (p[i][1] - from[1]) * k];
      if (drawing) { run.push(cut); if (run.length > 1) out.push({ pts: run, closed: false, soft: [false, false] }); }
      run = [cut];
      drawing = !drawing;
      seg -= need; acc = 0; from = cut;
    }
  }
  if (drawing && run.length > 1) out.push({ pts: run, closed: false, soft: [false, false] });
  return out;
}

/* A circular button cannot use the edge above: `border-image` paints the
 * border *box*, and knows nothing about `border-radius`, so a 9-slice on a
 * disc draws a square. Discs are a fixed size, so they take a whole drawn
 * circle as a background instead — one sweep with a gap where the pen lifted,
 * the same way the icons' circles are drawn. */
export function drawnDisc(id, { size = 64, inset = 3, width = 0.8, colour = '#1A1A1A' } = {}) {
  const c = size / 2, r = c - inset;
  const g = 0.34 + Math.abs(tremor(id, 11)) * 0.4;      /* where the pen lifted */
  const a0 = tremor(id, 12) * Math.PI;
  const p = (a) => `${(c + Math.cos(a) * r).toFixed(2)} ${(c + Math.sin(a) * r).toFixed(2)}`;
  const d = `M${p(a0)}A${r} ${r} 0 1 1 ${p(a0 + Math.PI * 2 - g)}`;
  const parts = trace(d).flatMap((sub) => shatter(sub))
    .map((pc, k) => ribbon(id, k, overshoot(pc, id, k), width))
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    `<g fill="${colour}">${parts}</g></svg>`;
}

/* The mark itself, shortened to sign a button. This is the logo's own curve —
 * `M18 82 C42 26,66 96,102 34` flattened to a wider, shallower box so it reads
 * as an underline rather than a squiggle, and without the ink dot, because the
 * dot means presence and a button is not a person. */
export function drawnMark(colour = '#E23343') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 26" width="120" height="26">` +
    `<path d="M6 18 C26 4,44 24,66 10 S104 6,114 16" fill="none" stroke="${colour}" ` +
    `stroke-width="6" stroke-linecap="round"/></svg>`;
}

/* ── the set ──────────────────────────────────────────────────────────────
 * Geometry is re-authored wherever the silhouette itself was the tell: ribs
 * that were exactly parallel, rays of identical length, a heart with two
 * matching lobes. A hand does not repeat a measurement, so neither do these.
 */

export const SPRITE =
  '<svg id="ts-icons" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">' +
  /* the pen that draws everything else */
  S('pencil', '<path d="M16.9 3.5a2.3 2.3 0 0 1 3.4 3.1L7.5 19.4 3.4 20.6l1.3-4.2z"/><path d="M14.6 5.6l3.6 3.5"/>') +
  S('marker', '<path d="M11 4.4 19.5 13l-4.3 4.3L6.6 8.7z"/><path d="M6.6 8.7 4.4 15.1l-1 5.5 5.5-1.1 6.3-2.2"/>') +
  /* two stars, deliberately not the same star */
  S('sparkles', '<path d="M11.4 4.2c.8 3.4 2.1 4.6 5.4 5.3-3.1.9-4.4 2.2-5 5.4-.9-3.1-2.2-4.3-5.4-4.9 3.1-1 4.3-2.4 5-5.8z"/><path d="M18.2 15.2c.3 1.7 1 2.4 2.8 2.8-1.5.4-2.2 1.1-2.5 2.6-.4-1.5-1.1-2.2-2.7-2.5 1.6-.5 2.2-1.2 2.4-2.9z"/>') +
  S('zap', '<path d="M13.4 2.6 5.2 13.5h5.1l-1.7 8 8-10.8h-5.1z"/>', true) +
  /* uneven scallops — a drawn ghost has no two matching feet */
  S('ghost', '<path d="M12 3.4c-3.9 0-6.6 2.9-6.6 6.8v9.5l2.3-2 2.2 1.9 1.9-2 2.3 2 1.8-1.9 2.5 2v-9.5c0-3.9-2.5-6.8-6.4-6.8z"/><path d="M9.5 10.5h.01"/><path d="M14.5 10.3h.01"/>') +
  S('flame', '<path d="M12 21.1c-3.8 0-6.3-2.4-6.3-5.9 0-2.8 1.8-4.7 3.2-6.5C10.2 7.2 11 5.9 11.3 3.9c2.6 1.5 3 3.8 2.6 5.8 1-.4 1.8-1.2 2.1-2.3 1.5 1.8 2.3 3.9 2.3 5.9 0 3.4-2.6 5.8-6.3 5.8z"/>') +
  S('undo', '<path d="M8.6 6.2 4.5 10l4 3.8"/><path d="M4.5 10h9a5 5 0 0 1 .1 10h-3.3"/>') +
  S('redo', '<path d="M15.4 6.2 19.5 10l-4 3.8"/><path d="M19.5 10h-9a5 5 0 0 0-.1 10h3.3"/>') +
  S('music', '<path d="M9.4 18.3V6.3l9.2-2.1v11.5"/><circle cx="6.9" cy="18.3" r="2.5"/><circle cx="16.1" cy="15.7" r="2.4"/>') +
  S('mirror', '<path d="M12 2.7v18.6"/><path d="M8.6 7.4 4 12l4.6 4.6"/><path d="M15.4 7.6 20 12l-4.6 4.5"/>') +
  S('eye', '<path d="M2.7 12.1S6.1 5.7 12 5.7s9.3 6.4 9.3 6.4-3.4 6.2-9.3 6.2-9.3-6.2-9.3-6.2z"/><circle cx="12" cy="12" r="2.7"/>') +
  S('pen-line', '<path d="M14.4 5.1a2.1 2.1 0 0 1 3.1 3L9.3 16.4l-4 1.1 1.1-4z"/><path d="M4.2 20.6h15.6"/>') +
  S('mail-heart', '<path d="M3.4 6.4h17.2v11.2H3.4z"/><path d="m3.5 7.4 8.5 6.1 8.5-6.1"/>') +
  S('heart-fill', '<path d="M12 20.7S3.5 15.1 3.5 9.3A4.6 4.6 0 0 1 12 6.6a4.5 4.5 0 0 1 8.5 2.9c0 5.7-8.5 11.2-8.5 11.2z"/>', true) +
  /* lobes deliberately unequal — the left one is drawn first and runs bigger */
  S('heart', '<path d="M12 20.7S3.4 15.2 3.4 9.2A4.7 4.7 0 0 1 12 6.5a4.4 4.4 0 0 1 8.3 3c0 5.7-8.3 11.2-8.3 11.2z"/>') +
  S('message', '<path d="M20.6 12.4a7.5 7.5 0 0 1-11 6.8L3.9 20.6l1.5-5.5A7.5 7.5 0 1 1 20.6 12.4z"/>') +
  S('bookmark', '<path d="M6.4 3.5h11.2v17.1L12 16.5l-5.6 4.1z"/>') +
  S('coin', '<circle cx="12" cy="12" r="8.3"/><path d="M12 7.3v9.4"/><path d="M14.7 9.5c-.8-.8-1.8-1.1-2.8-1.1-1.6 0-2.6.8-2.6 1.9 0 2.8 5.5 1.3 5.5 4.1 0 1.2-1.2 2-2.9 2-1.1 0-2.2-.4-2.9-1.2"/>') +
  S('arrows-h', '<path d="M7.5 8.3 3.5 12l4 3.7"/><path d="M16.5 8.5 20.5 12l-4 3.6"/><path d="M3.7 12h16.6"/>') +
  S('repeat', '<path d="M17.3 2.8 20.7 6l-3.3 3.2"/><path d="M3.4 12.5V10a4 4 0 0 1 4-4h13.2"/><path d="M6.7 21.2 3.3 18l3.3-3.2"/><path d="M20.6 11.5V14a4 4 0 0 1-4 4H3.4"/>') +
  /* four rays, four lengths, angles that are not a fan */
  S('sunrise', '<path d="M12 2.5v4.4"/><path d="M4.9 9.9 8 13.3"/><path d="M19.2 10.4 16.2 13.4"/><path d="M2.6 20.5h18.9"/><path d="M7.3 20.4a4.7 4.7 0 0 1 9.4 0"/>') +
  S('camera', '<path d="M3.5 8.5h4.3l1.7-2.7h5.3l1.8 2.7h4v11.1H3.5z"/><circle cx="12" cy="13.7" r="3.3"/>') +
  S('hourglass', '<path d="M6.5 2.8h11"/><path d="M6.6 21.2h10.9"/><path d="M7.5 2.8c0 5.1 4.5 6.4 4.5 9.2s-4.5 4-4.5 9.2"/><path d="M16.5 2.8c0 5.1-4.5 6.4-4.5 9.2s4.5 4 4.5 9.2"/>') +
  S('share', '<path d="M12 15.5V3.1"/><path d="M8.1 6.9 12 3l3.9 3.8"/><path d="M5.3 12.5v8h13.4v-8"/>') +
  S('play', '<path d="M8.3 4.8 19.7 12 8.3 19.2z"/>', true) +
  /* ribs at two different lengths, because you do not measure them */
  S('trash', '<path d="M3.8 6.3h16.4"/><path d="M9.3 6.3V3.7h5.4v2.6"/><path d="M5.8 6.4 6.9 20.3h10.3l1-13.9"/><path d="M10.3 10.2v6.3"/><path d="M13.7 10.6v5.8"/>') +
  /* one continuous bow, drawn without lifting */
  S('gift', '<path d="M3.5 11.3h17v9.3h-17z"/><path d="M2.8 7.3h18.4v4H2.8"/><path d="M12 7.3v13.3"/><path d="M12 7.4C10.5 4.3 8.8 3 7.3 3.5c-1.8.7-1.4 3.4 4.7 3.9 6.1-.5 6.5-3.2 4.7-3.9-1.5-.5-3.2.8-4.7 3.9z"/>') +
  S('smile', '<circle cx="12" cy="12" r="9"/><path d="M8.3 14.3a4.9 4.9 0 0 0 7.3.1"/><path d="M9.1 9.5h.01"/><path d="M14.9 9.3h.01"/>') +
  S('eraser', '<path d="m6.8 14.2 6.3-6.3a2.4 2.4 0 0 1 3.4 0l3.5 3.4a2.4 2.4 0 0 1 0 3.4l-5.4 5.4H8.3l-4-4a1.6 1.6 0 0 1 0-2.3z"/><path d="M12.5 20.1h8.6"/>') +
  S('highlighter', '<path d="M8.3 14.7 14.9 7.9a2.6 2.6 0 0 1 3.8 3.8l-6.7 6.6z"/><path d="m8.3 14.7-2.7 5.5 5.5-2.3"/><path d="M3.8 21.5h6.6"/>') +
  /* three sparks at three lengths */
  S('heart-burst', '<path d="M12 19.5S5.3 15 5.3 10.3A3.8 3.8 0 0 1 12 8.2a3.6 3.6 0 0 1 6.5 2.2c0 4.6-6.5 9.1-6.5 9.1z"/><path d="M12 2.4v2.3"/><path d="M4.7 5 6 6.4"/><path d="M19.4 5.3 17.8 6.8"/>') +

  /* ── the chrome ────────────────────────────────────────────────────────
   * The app's own buttons were still spending system-font glyphs — ⚙ for the
   * rules button, ⌕ for search, ✆ to call, ⌂ ❑ ◔ ◍ for the four rooms. Those
   * render in whatever the operating system happens to have, which is why the
   * nav never matched anything else on the screen. These are the replacements,
   * drawn with the same pen as the rest.
   */
  /* two strokes that cross past each other, as a drawn cross does */
  S('close', '<path d="M6.2 6.1 17.9 17.9"/><path d="M17.9 6.2 6.1 17.8"/>') +
  /* rules: two rails, two knobs, set at different marks */
  S('sliders', '<path d="M3.6 8.3h16.8"/><path d="M15.6 5.6v5.4"/><path d="M3.6 15.9h16.8"/><path d="M8.6 13.2v5.4"/>') +
  S('search', '<circle cx="10.7" cy="10.6" r="6.4"/><path d="M15.5 15.4 20.4 20.5"/>') +
  S('phone', '<path d="M6.6 3.5h3.6l1.8 4.5-2.2 1.4a10.7 10.7 0 0 0 4.9 4.8l1.3-2.2 4.5 1.8v3.6a1.8 1.8 0 0 1-2 1.8C11.5 18.8 5 12.3 4.7 5.4a1.8 1.8 0 0 1 1.9-1.9z"/>') +
  /* Household — a roof and two walls, two strokes */
  S('house', '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.7 9.1v11.4h12.7V9.2"/>') +
  /* Together — two rings that overlap and stay two rings */
  S('rings', '<circle cx="9.2" cy="12" r="5.7"/><circle cx="15" cy="12" r="5.5"/>') +
  /* Memory — the jar */
  S('jar', '<path d="M8.2 3.5h7.7v3.4H8.2z"/><path d="M6.9 6.9h10.3v11.5a2.2 2.2 0 0 1-2.2 2.2H9.1a2.2 2.2 0 0 1-2.2-2.2z"/>') +
  /* Wellbeing — a leaf and its midrib */
  S('leaf', '<path d="M20.4 3.6S8.6 2.7 5.4 8.9c-2.4 4.8.6 9.9 5.3 10.5 5.6.6 9.7-6.6 9.7-15.8z"/><path d="M17.3 6.7C12.5 9.5 8.5 13.5 6.4 19.5"/>') +
  S('download', '<path d="M12 3.4v11.9"/><path d="M7.9 11.4 12 15.6l4.1-4.3"/><path d="M4.8 18.2v2.4h14.4v-2.4"/>') +
  /* the board button — a line that turns the corner and leaves */
  S('turn-out', '<path d="M5.6 20.5v-7a4.7 4.7 0 0 1 4.7-4.7h8.3"/><path d="M14.6 4.6 19 8.7l-4.3 4.2"/>') +
  '</svg>';

/* The emoji map is unchanged — only the drawing is. It stays an ordered array
   because the multi-character sequences have to be matched before the single
   glyphs they contain. */
export const EMOJI_ICONS = [
  ['💥❤️', 'heart-burst'],
  ['✏️', 'pencil'], ['✎', 'pencil'],
  ['🖍️', 'marker'],
  ['✨', 'sparkles'],
  ['⚡️', 'zap'],
  ['👻', 'ghost'],
  ['🔥', 'flame'],
  ['↺', 'undo'], ['↻', 'redo'],
  ['♫', 'music'],
  ['🪞', 'mirror'],
  ['👁', 'eye'],
  ['✍️', 'pen-line'],
  ['💌', 'mail-heart'],
  ['❤', 'heart-fill'], ['♥', 'heart-fill'],
  ['💬', 'message'],
  ['🔖', 'bookmark'],
  ['🪙', 'coin'],
  ['↔', 'arrows-h'],
  ['🔁', 'repeat'],
  ['🌅', 'sunrise'],
  ['📷', 'camera'],
  ['⏳', 'hourglass'],
  ['↗️', 'share'], ['↗', 'share'],
  ['▶️', 'play'],
  ['🗑️', 'trash'],
  ['🎁', 'gift'],
  ['🙂', 'smile'],
];

// Kept deliberately: 🥰 (1q parodies *typed* texting — the emoji is the joke),
// typographic marks → ↑ ↓ ✓ ✕ ⋯ ▮ (label glyphs, not icons).

/* The glyphs the *app* was spending on icon duty. EMOJI_ICONS only ever ran
 * over the design frames, so every one of these shipped as a system-font
 * fallback: the rules button, search, call, and all four room marks were
 * drawn by whatever font the device happened to resolve.
 *
 * This list is deliberately shorter than it could be. ✓ ✕ ⋯ ▮ ↑ ↓ stay as
 * type — they are marks inside sentences ("Movers booked ✓ · council ✓"), and
 * a sentence with an <svg> in the middle of it is not a sentence. The close
 * button's ✕ is an icon rather than a mark, so build.mjs swaps that one by the
 * button it sits in, not by the character.
 */
export const APP_ICONS = [
  ['✎', 'pencil'],
  ['⚙', 'sliders'],
  ['⌕', 'search'],
  ['✆', 'phone'],
  ['⌂', 'house'],
  ['❑', 'rings'],
  ['◔', 'jar'],
  ['◍', 'leaf'],
  ['✒', 'pen-line'],
  ['↺', 'undo'],
  ['▶', 'play'],
  ['⤓', 'download'],
  ['⤴', 'turn-out'],
];
