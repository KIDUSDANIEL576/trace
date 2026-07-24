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
      .select('id, kind, photo_url')
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
    if (!photoPainted) paintDusk(ctx);

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

/** The app's dusk gradient backdrop (CanvasBackdrop.tsx). */
function paintDusk(ctx: CanvasRenderingContext2D) {
  const lg = ctx.createLinearGradient(0, 0, 0, H);
  lg.addColorStop(0, '#33445f');
  lg.addColorStop(0.45, '#5c5f78');
  lg.addColorStop(0.7, '#8a6b73');
  lg.addColorStop(1, '#2e2733');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);
  const rg = ctx.createRadialGradient(W * 0.7, H * 0.18, 0, W * 0.7, H * 0.18, W * 0.62);
  rg.addColorStop(0, 'rgba(247,217,176,0.85)');
  rg.addColorStop(1, 'rgba(247,217,176,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
