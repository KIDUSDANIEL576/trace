// render-snapshot — renders the couple's latest-drawn canvas to a PNG in the
// widgets bucket. Called fire-and-forget by the app after stroke changes; the
// home-screen widgets (Phase 3) display that PNG.
// Deploy with: supabase functions deploy render-snapshot

import { createClient } from 'npm:@supabase/supabase-js@2';
import { createCanvas, loadImage } from 'https://deno.land/x/canvas@v1.4.2/mod.ts';

// Presence Painting parity (src/lib/livingInk.ts): ink blooms +8% over its
// first week, easeOutQuad. Deterministic, so widget and app widths agree.
const BLOOM_DAYS = 7;
const BLOOM_MAX = 0.08;
function bloomScale(createdAtMs: number, nowMs: number): number {
  const age = nowMs - createdAtMs;
  if (age <= 0) return 1;
  const t = Math.min(age / (BLOOM_DAYS * 86_400_000), 1);
  return 1 + BLOOM_MAX * (1 - (1 - t) * (1 - t));
}

const W = 640;
const H = 704; // matches the app board's 1/1.1 aspect

type Pt = [number, number];
interface StrokeRow {
  brush: string;
  color: string;
  width: number;
  points: Pt[];
  created_at?: string;
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { coupleId } = await req.json().catch(() => ({}));
    if (!coupleId) return json({ error: 'coupleId required' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: membership } = await admin
      .from('members')
      .select('user_id')
      .eq('couple_id', coupleId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!membership) return json({ error: 'not a member' }, 403);

    // the widget shows whatever was drawn on last; fall back to the shared canvas
    const { data: canvases } = await admin
      .from('canvases')
      .select('id, kind, photo_url, bg_key, bg_opacity')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: true });
    if (!canvases?.length) return json({ error: 'no canvases' }, 404);

    const { data: latestStroke } = await admin
      .from('strokes')
      .select('canvas_id')
      .in(
        'canvas_id',
        canvases.map((c) => c.id)
      )
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    const target =
      canvases.find((c) => c.id === latestStroke?.canvas_id) ??
      canvases.find((c) => c.kind === 'shared') ??
      canvases[0];

    const { data: strokes } = await admin
      .from('strokes')
      .select('brush, color, width, points, created_at')
      .eq('canvas_id', target.id)
      .order('id', { ascending: true });

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    let photoPainted = false;
    if (target.kind === 'photo' && target.photo_url) {
      const { data: blob } = await admin.storage.from('photos').download(target.photo_url);
      if (blob) {
        const img = await loadImage(new Uint8Array(await blob.arrayBuffer()));
        const s = Math.max(W / img.width(), H / img.height());
        const dw = img.width() * s;
        const dh = img.height() * s;
        ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
        photoPainted = true;
      }
    }
    if (!photoPainted) paintSky(ctx, target.bg_key ?? null, Number(target.bg_opacity ?? 1));

    const now = Date.now();
    for (const s of (strokes ?? []) as StrokeRow[]) drawStroke(ctx, s, now);

    const png = canvas.toBuffer('image/png');
    const { error: upErr } = await admin.storage
      .from('widgets')
      .upload(`${coupleId}/snapshot.png`, png, { contentType: 'image/png', upsert: true });
    if (upErr) return json({ error: 'upload failed' }, 502);

    return json({ rendered: true, canvasId: target.id, strokes: strokes?.length ?? 0 });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});

/** Same midpoint-quadratic smoothing as the app's src/lib/geometry.ts. */
function tracePath(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  const px = (i: number) => pts[i][0] * W;
  const py = (i: number) => pts[i][1] * H;
  ctx.beginPath();
  ctx.moveTo(px(0), py(0));
  if (pts.length < 3) {
    for (let i = 1; i < pts.length; i++) ctx.lineTo(px(i), py(i));
    return;
  }
  for (let i = 1; i < pts.length - 1; i++) {
    ctx.quadraticCurveTo(px(i), py(i), (px(i) + px(i + 1)) / 2, (py(i) + py(i + 1)) / 2);
  }
  ctx.lineTo(px(pts.length - 1), py(pts.length - 1));
}

/** Brush characters approximating the app's StrokeRenderer (blur → shadowBlur). */
function drawStroke(ctx: CanvasRenderingContext2D, s: StrokeRow, nowMs: number) {
  if (s.brush === 'invisible') return; // secrets never land on home screens
  const pts = s.points;
  if (!Array.isArray(pts) || pts.length < 2) return;
  const bloom = s.created_at ? bloomScale(Date.parse(s.created_at), nowMs) : 1;
  const w = s.width * W * bloom;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  tracePath(ctx, pts);
  switch (s.brush) {
    case 'marker':
      ctx.globalAlpha = 0.78;
      ctx.globalCompositeOperation = 'multiply';
      ctx.strokeStyle = s.color;
      ctx.lineWidth = w;
      ctx.stroke();
      break;
    case 'glow':
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = w * 2.4;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.lineWidth = w;
      ctx.stroke();
      break;
    case 'neon':
      ctx.strokeStyle = s.color;
      ctx.lineWidth = w * 3.2;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = w;
      ctx.stroke();
      break;
    default: // chalk
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = w;
      ctx.stroke();
  }
  ctx.restore();
}

// Every sky the app can draw, generated from src/theme/backgrounds.ts.
// tests/snapshotSkies.test.ts fails if this drifts from the app — a widget
// showing a different sky than the phone is the one bug nobody would report,
// they'd just quietly think the widget looked wrong.
const SKIES: Record<
  string,
  { c: string[]; p: number[]; g: [number, number, number, string] | null }
> = {"dusk":{"c":["#33445f","#5c5f78","#8a6b73","#2e2733"],"p":[0,0.45,0.7,1],"g":[0.7,0.18,0.62,"rgba(247,217,176,0.85)"]},"sunset":{"c":["#ff9a5a","#ff6f7d","#c14a86","#5b2a6b"],"p":[0,0.38,0.68,1],"g":[0.5,0.62,0.5,"rgba(255,236,180,0.9)"]},"evening":{"c":["#20304f","#3d4a72","#6b5b8a","#241f38"],"p":[0,0.4,0.72,1],"g":[0.22,0.24,0.45,"rgba(255,214,170,0.5)"]},"starry":{"c":["#0f1836","#1c2a52","#2f2a55","#120f26"],"p":[0,0.4,0.75,1],"g":[0.6,0.2,0.55,"rgba(150,180,255,0.35)"]},"rose":{"c":["#ffd9e2","#ffb3c6","#f38fa8","#c96a86"],"p":[0,0.4,0.72,1],"g":[0.5,0.2,0.55,"rgba(255,255,255,0.75)"]},"blush":{"c":["#fff1e6","#ffe0e9","#ffd0dd","#f7bcd0"],"p":[0,0.4,0.72,1],"g":[0.35,0.25,0.6,"rgba(255,255,255,0.85)"]},"lavender":{"c":["#e7dcff","#c9b6f2","#a48fd8","#6f5aa6"],"p":[0,0.4,0.72,1],"g":[0.6,0.22,0.55,"rgba(255,240,255,0.7)"]},"ocean":{"c":["#bfe6ff","#7fc4e8","#3f86b5","#1d3f63"],"p":[0,0.38,0.7,1],"g":[0.72,0.18,0.5,"rgba(255,247,214,0.6)"]},"ember":{"c":["#2b1216","#6d2530","#c04a3d","#f2894f"],"p":[0,0.42,0.78,1],"g":[0.5,0.85,0.55,"rgba(255,190,120,0.55)"]},"meadow":{"c":["#e9f6d8","#c3e3a6","#8fc47c","#4d7d55"],"p":[0,0.4,0.72,1],"g":[0.28,0.2,0.5,"rgba(255,252,214,0.75)"]},"midnight":{"c":["#05070f","#111a2e","#1b2340","#05060d"],"p":[0,0.4,0.75,1],"g":[0.5,0.3,0.6,"rgba(180,200,255,0.22)"]},"honey":{"c":["#fff4d6","#ffe1a8","#f3bd74","#c9884a"],"p":[0,0.4,0.72,1],"g":[0.5,0.22,0.55,"rgba(255,255,240,0.8)"]},"aurora":{"c":["#04121f","#0d3b45","#2c7a6b","#123a52","#050b1a"],"p":[0,0.3,0.52,0.76,1],"g":[0.4,0.4,0.6,"rgba(120,255,214,0.35)"]},"cherry":{"c":["#fff5f7","#ffdfe7","#f9c2d2","#e79ab3"],"p":[0,0.38,0.7,1],"g":[0.6,0.2,0.55,"rgba(255,255,255,0.85)"]},"rainy":{"c":["#3c4a5a","#55677a","#7e8fa0","#2c3742"],"p":[0,0.42,0.74,1],"g":[0.5,0.3,0.6,"rgba(226,240,255,0.35)"]},"snowfall":{"c":["#dfeaf6","#c3d6ea","#9db6d2","#63789a"],"p":[0,0.38,0.7,1],"g":[0.5,0.18,0.6,"rgba(255,255,255,0.8)"]},"citylights":{"c":["#0a0a18","#1d1633","#4a2350","#8a3b52","#241226"],"p":[0,0.3,0.58,0.82,1],"g":[0.5,0.78,0.55,"rgba(255,180,120,0.45)"]},"dawn":{"c":["#2a3a63","#7a6a95","#e8998d","#ffd9a0"],"p":[0,0.36,0.7,1],"g":[0.5,0.88,0.5,"rgba(255,236,196,0.75)"]},"peach":{"c":["#fff0e4","#ffd9c2","#ffbfa3","#f09a86"],"p":[0,0.4,0.72,1],"g":[0.4,0.22,0.55,"rgba(255,255,250,0.85)"]},"velvet":{"c":["#1b0b18","#3f1130","#6b1b44","#2a0d22"],"p":[0,0.4,0.72,1],"g":[0.55,0.3,0.55,"rgba(255,140,190,0.32)"]},"mint":{"c":["#effcf5","#c9f0e0","#9adcc6","#5fae99"],"p":[0,0.4,0.72,1],"g":[0.6,0.2,0.55,"rgba(255,255,255,0.8)"]},"desert":{"c":["#ffe9c4","#f6c58a","#d68f68","#8a4f4a"],"p":[0,0.4,0.72,1],"g":[0.7,0.24,0.55,"rgba(255,240,200,0.7)"]},"moonlit":{"c":["#0b1226","#1a2545","#33406b","#0a0f1f"],"p":[0,0.38,0.72,1],"g":[0.72,0.18,0.5,"rgba(210,225,255,0.45)"]},"wine":{"c":["#2a0f1c","#5a1a2e","#8f2b3d","#c25a52"],"p":[0,0.4,0.74,1],"g":[0.5,0.85,0.55,"rgba(255,170,140,0.4)"]},"beach":{"c":["#9fdcf5","#ffe6c2","#5fb6c9","#2b7f9b","#e6cfa6"],"p":[0,0.36,0.5,0.76,1],"g":[0.68,0.24,0.5,"rgba(255,244,206,0.8)"]},"forest":{"c":["#cfe8d6","#7fb894","#2f6b52","#123a2e"],"p":[0,0.34,0.68,1],"g":[0.3,0.16,0.45,"rgba(255,247,205,0.55)"]},"galaxy":{"c":["#05030f","#1b0f3a","#43206b","#7a2f6a","#0a0518"],"p":[0,0.28,0.52,0.74,1],"g":[0.42,0.44,0.62,"rgba(190,150,255,0.4)"]},"candlelit":{"c":["#150a08","#3a1a10","#7a3d1c","#c9762f","#2a1109"],"p":[0,0.3,0.58,0.78,1],"g":[0.5,0.58,0.5,"rgba(255,196,110,0.55)"]},"mountains":{"c":["#8fc4e8","#c9dcef","#f0d6c2","#a98f9b","#4a4560"],"p":[0,0.3,0.5,0.74,1],"g":[0.32,0.2,0.48,"rgba(255,238,204,0.7)"]},"rainbow":{"c":["#dff1fb","#cfe6f5","#bcd8ec","#9dbfd8"],"p":[0,0.4,0.72,1],"g":[0.5,0.22,0.6,"rgba(255,255,255,0.85)"]},"fireworks":{"c":["#050a1c","#0e1b3f","#25275c","#12132e"],"p":[0,0.38,0.72,1],"g":[0.5,0.35,0.6,"rgba(120,150,255,0.28)"]},"autumn":{"c":["#fceccd","#f6c98a","#dd8f4f","#a8532e","#5e2b1c"],"p":[0,0.3,0.56,0.8,1],"g":[0.66,0.2,0.5,"rgba(255,232,180,0.7)"]},"goldenhour":{"c":["#f6d9b0","#eeb98b","#d98f74","#9c6154","#4e3038"],"p":[0,0.3,0.55,0.8,1],"g":[0.72,0.3,0.6,"rgba(255,226,168,0.85)"]},"linen":{"c":["#f3ece2","#e8ddcf","#d9cab8","#bda893"],"p":[0,0.38,0.72,1],"g":[0.4,0.24,0.6,"rgba(255,250,240,0.7)"]},"dustyrose":{"c":["#f0dcd8","#dfbcb8","#c3969a","#8f6a72","#4c3740"],"p":[0,0.32,0.58,0.82,1],"g":[0.5,0.24,0.62,"rgba(255,232,226,0.6)"]},"sage":{"c":["#e6ece0","#cbd6c2","#a8b8a0","#7b8c78","#414b42"],"p":[0,0.32,0.58,0.82,1],"g":[0.35,0.2,0.6,"rgba(250,255,240,0.55)"]},"filmnight":{"c":["#101420","#1d2536","#33344a","#191a26"],"p":[0,0.36,0.7,1],"g":[0.68,0.34,0.55,"rgba(255,196,150,0.28)"]},"lightleak":{"c":["#2a1c24","#5a3038","#a2564a","#e8a06a","#2b1a1e"],"p":[0,0.26,0.5,0.72,1],"g":[0.5,0.5,0.7,"rgba(255,190,120,0.5)"]},"quiet":{"c":["#eef0f2","#dfe3e6","#c8cfd4","#a3adb5"],"p":[0,0.38,0.72,1],"g":[0.5,0.22,0.65,"rgba(255,255,255,0.75)"]},"amber":{"c":["#2a1508","#5c2f11","#a8641f","#e2a44c","#22120a"],"p":[0,0.28,0.54,0.78,1],"g":[0.5,0.55,0.6,"rgba(255,206,130,0.5)"]},"oat":{"c":["#f7f2e8","#ece3d4","#dccfbb","#c2b19a"],"p":[0,0.36,0.7,1],"g":[0.44,0.22,0.62,"rgba(255,252,244,0.7)"]},"clay":{"c":["#f0dfd2","#dcbca8","#c0947f","#8e6857","#4a3730"],"p":[0,0.3,0.56,0.8,1],"g":[0.55,0.24,0.6,"rgba(255,236,218,0.6)"]},"fog":{"c":["#e9eaea","#d5d8d9","#b9c0c2","#8e989c","#5b6367"],"p":[0,0.3,0.56,0.8,1],"g":[0.48,0.26,0.7,"rgba(252,253,254,0.65)"]},"mauve":{"c":["#efe6ec","#d9c7d5","#b8a1b6","#8a7488","#4b3f4c"],"p":[0,0.3,0.56,0.8,1],"g":[0.46,0.22,0.62,"rgba(250,240,250,0.6)"]},"terracotta":{"c":["#f3e2d3","#e0b193","#c07f5e","#8d5540","#3f2a24"],"p":[0,0.28,0.54,0.78,1],"g":[0.62,0.26,0.58,"rgba(255,232,206,0.58)"]},"olive":{"c":["#eceadc","#d2cfb4","#adaa85","#7e7c5c","#403f2f"],"p":[0,0.3,0.56,0.8,1],"g":[0.38,0.22,0.6,"rgba(252,250,232,0.55)"]},"slate":{"c":["#1c2026","#2c333c","#434c58","#20252b"],"p":[0,0.36,0.7,1],"g":[0.56,0.3,0.6,"rgba(200,214,230,0.24)"]},"espresso":{"c":["#150f0c","#2c1f18","#4b352a","#6d4c39","#1a1310"],"p":[0,0.28,0.54,0.78,1],"g":[0.6,0.36,0.58,"rgba(240,196,148,0.28)"]},"pearl":{"c":["#faf7f4","#f0e9e6","#e2d8d6","#cbbfc0"],"p":[0,0.36,0.7,1],"g":[0.5,0.2,0.66,"rgba(255,253,252,0.8)"]},"duoplum":{"c":["#1c0f2e","#3a1d52","#6b3a7a","#e8a0b8"],"p":[0,0.36,0.68,1],"g":[0.6,0.72,0.6,"rgba(255,170,200,0.32)"]},"duoteal":{"c":["#06202b","#0e3a48","#2f7d84","#f0d9a8"],"p":[0,0.36,0.7,1],"g":[0.62,0.78,0.58,"rgba(240,217,168,0.3)"]},"duoblush":{"c":["#3a1b28","#7a3648","#c9707c","#ffe3d0"],"p":[0,0.34,0.68,1],"g":[0.5,0.8,0.6,"rgba(255,227,208,0.35)"]},"duoindigo":{"c":["#0b1030","#1e2a5e","#4a5aa0","#ffd9a0"],"p":[0,0.36,0.7,1],"g":[0.68,0.76,0.55,"rgba(255,217,160,0.28)"]},"duosage":{"c":["#16211a","#2c4034","#5b7a63","#f2e6c8"],"p":[0,0.36,0.7,1],"g":[0.4,0.78,0.58,"rgba(242,230,200,0.28)"]},"duorust":{"c":["#25120c","#4f2317","#a04a2c","#f6ddb4"],"p":[0,0.34,0.68,1],"g":[0.55,0.78,0.58,"rgba(246,221,180,0.3)"]},"fadedrose":{"c":["#e9d8d4","#dcc0bd","#c9a5a6","#ab8b90"],"p":[0,0.36,0.7,1],"g":[0.45,0.24,0.68,"rgba(255,240,236,0.5)"]},"fadedmint":{"c":["#dfe8e0","#c8d8ca","#adc2b1","#8ea593"],"p":[0,0.36,0.7,1],"g":[0.5,0.22,0.68,"rgba(244,252,246,0.5)"]},"fadedsun":{"c":["#f0e2c8","#e6cfa8","#d4b489","#b4926c"],"p":[0,0.36,0.7,1],"g":[0.62,0.24,0.66,"rgba(255,246,220,0.55)"]},"fadednight":{"c":["#3a4050","#4a5164","#5d6478","#464c5c"],"p":[0,0.36,0.7,1],"g":[0.55,0.3,0.65,"rgba(200,212,232,0.22)"]},"sepia":{"c":["#e8dcc4","#d3c0a0","#b79f7c","#8f7a5c"],"p":[0,0.36,0.7,1],"g":[0.48,0.24,0.68,"rgba(255,246,222,0.5)"]},"washedblue":{"c":["#dde5ea","#c3d2dc","#a6bac9","#8398aa"],"p":[0,0.36,0.7,1],"g":[0.5,0.22,0.7,"rgba(246,251,255,0.5)"]}};

const THEME_GROUND = { c: ['#33445f', '#5c5f78', '#8a6b73', '#2e2733'], p: [0, 0.45, 0.7, 1] };

function paintStops(
  ctx: CanvasRenderingContext2D,
  stops: { c: string[]; p: number[] }
) {
  const lg = ctx.createLinearGradient(0, 0, 0, H);
  stops.c.forEach((color, i) => lg.addColorStop(stops.p[i], color));
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);
}

/**
 * The canvas ground, matching CanvasBackdrop.tsx: the theme ground, then the
 * couple's chosen sky at their chosen strength. Deliberately FLAT — no motif,
 * no highlight, nothing drawn on it but their strokes.
 */
function paintSky(ctx: CanvasRenderingContext2D, bgKey: string | null, bgOpacity: number) {
  paintStops(ctx, THEME_GROUND);
  const sky = SKIES[bgKey ?? 'dusk'] ?? SKIES.dusk;
  const alpha = Math.min(1, Math.max(0.15, bgOpacity ?? 1));
  ctx.save();
  ctx.globalAlpha = alpha;
  paintStops(ctx, sky);
  if (sky.g) {
    const [x, y, r, color] = sky.g;
    const rg = ctx.createRadialGradient(W * x, H * y, 0, W * x, H * y, W * r);
    rg.addColorStop(0, color);
    rg.addColorStop(1, color.replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
