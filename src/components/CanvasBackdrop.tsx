import {
  Circle,
  Group,
  Image as SkiaImage,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Skia,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { starOpacity, type Star } from '@/lib/livingInk';
import {
  driftingPetals,
  heartPoints,
  motifStars,
  rainStreaks,
  scatteredHearts,
  snowFlakes,
  sparklePositions,
} from '@/lib/motifs';
import { backgroundByKey, clampBgOpacity, type BackgroundPreset } from '@/theme/backgrounds';
import type { BoardPalette } from '@/theme/tokens';

interface Props {
  w: number;
  h: number;
  board: BoardPalette;
  photoUrl?: string | null; // the drawn-on photo (kind: 'photo' canvases)
  /** Chosen background preset key (src/theme/backgrounds.ts). */
  bgKey?: string;
  /** Signed URL of the couple's own background photo, if they set one. */
  bgPhotoUrl?: string | null;
  /** 0.15..1 — how strongly the background shows over the theme ground. */
  bgOpacity?: number;
  /** Seeds the motif scatter so both phones match. */
  seedId?: string;
  /** Presence Painting: the couple's constellation, visible only at night. */
  stars?: Star[];
  night?: number; // 0 = day, 1 = deep night
  nowMs?: number;
}

/** Same rgba colour with its alpha forced to 0 (for a gradient's outer stop). */
function fade(rgba: string): string {
  return rgba.replace(/[\d.]+\)$/, '0)');
}

/** The faint motif (love sign, sun, moon, stars) behind the ink. */
function Motif({ preset, w, h, seed }: { preset: BackgroundPreset; w: number; h: number; seed: string }) {
  const heart = useMemo(() => {
    if (preset.motif !== 'heart') return null;
    const p = Skia.Path.Make();
    const pts = heartPoints();
    const size = Math.min(w, h) * 0.52;
    const cx = w / 2;
    const cy = h * 0.46;
    pts.forEach(([nx, ny], i) => {
      const x = cx + (nx - 0.5) * size;
      const y = cy + (ny - 0.5) * size;
      if (i === 0) p.moveTo(x, y);
      else p.lineTo(x, y);
    });
    p.close();
    return p;
  }, [preset.motif, w, h]);

  switch (preset.motif) {
    case 'heart':
      return heart ? (
        <Path path={heart} style="stroke" strokeWidth={Math.max(2, w * 0.012)} color={preset.motifColor} />
      ) : null;
    case 'sun':
      return (
        <Circle
          cx={w * (preset.glow?.x ?? 0.5)}
          cy={h * (preset.glow?.y ?? 0.25)}
          r={w * 0.11}
          color={preset.motifColor}
        />
      );
    case 'moon':
      // crescent: a bright disc with the ground-coloured disc offset over it
      return (
        <Group>
          <Circle cx={w * 0.24} cy={h * 0.2} r={w * 0.09} color={preset.motifColor} />
          <Circle cx={w * 0.29} cy={h * 0.175} r={w * 0.082} color={preset.colors[0]} />
        </Group>
      );
    case 'stars':
      return (
        <Group>
          {motifStars(seed).map((s, i) => (
            <Circle key={i} cx={s.x * w} cy={s.y * h} r={Math.max(0.8, s.r * w)} color={preset.motifColor} />
          ))}
        </Group>
      );
    case 'hearts':
      // a soft scatter of little love signs
      return (
        <Group>
          {scatteredHearts(seed).map((s, i) => {
            const p = Skia.Path.Make();
            const size = s.size * w;
            const cx = s.x * w;
            const cy = s.y * h;
            const cos = Math.cos(s.tilt);
            const sin = Math.sin(s.tilt);
            heartPoints(40).forEach(([nx, ny], j) => {
              const dx = (nx - 0.5) * size;
              const dy = (ny - 0.5) * size;
              const x = cx + dx * cos - dy * sin;
              const y = cy + dx * sin + dy * cos;
              if (j === 0) p.moveTo(x, y);
              else p.lineTo(x, y);
            });
            p.close();
            return <Path key={i} path={p} color={preset.motifColor} />;
          })}
        </Group>
      );
    case 'rain':
      return (
        <Group>
          {rainStreaks(seed).map((s, i) => {
            const p = Skia.Path.Make();
            const x = s.x * w;
            const y = s.y * h;
            p.moveTo(x, y);
            p.lineTo(x + s.lean * w, y + s.len * h);
            return (
              <Path
                key={i}
                path={p}
                style="stroke"
                strokeWidth={Math.max(1, w * 0.0035)}
                strokeCap="round"
                color={preset.motifColor}
              />
            );
          })}
        </Group>
      );
    case 'petals':
      return (
        <Group>
          {driftingPetals(seed).map((s, i) => {
            // a simple leaf/petal: two arcs meeting at the tips
            const p = Skia.Path.Make();
            const r = s.r * w;
            const cx = s.x * w;
            const cy = s.y * h;
            const cos = Math.cos(s.tilt);
            const sin = Math.sin(s.tilt);
            const pt = (dx: number, dy: number): [number, number] => [
              cx + dx * cos - dy * sin,
              cy + dx * sin + dy * cos,
            ];
            const [ax, ay] = pt(-r, 0);
            const [bx, by] = pt(r, 0);
            const [c1x, c1y] = pt(0, -r * 0.8);
            const [c2x, c2y] = pt(0, r * 0.8);
            p.moveTo(ax, ay);
            p.quadTo(c1x, c1y, bx, by);
            p.quadTo(c2x, c2y, ax, ay);
            p.close();
            return <Path key={i} path={p} color={preset.motifColor} />;
          })}
        </Group>
      );
    case 'snow':
      return (
        <Group>
          {snowFlakes(seed).map((s, i) => (
            <Circle
              key={i}
              cx={s.x * w}
              cy={s.y * h}
              r={Math.max(1, s.r * w)}
              color={preset.motifColor}
            />
          ))}
        </Group>
      );
    case 'sparkle':
      return (
        <Group>
          {sparklePositions(seed).map((s, i) => {
            const r = s.r * w;
            const p = Skia.Path.Make();
            const cx = s.x * w;
            const cy = s.y * h;
            p.moveTo(cx, cy - r);
            p.quadTo(cx, cy, cx + r, cy);
            p.quadTo(cx, cy, cx, cy + r);
            p.quadTo(cx, cy, cx - r, cy);
            p.quadTo(cx, cy, cx, cy - r);
            p.close();
            return <Path key={i} path={p} color={preset.motifColor} />;
          })}
        </Group>
      );
    default:
      return null;
  }
}

/**
 * Canvas ground. Layers, bottom to top:
 *   1. the theme's own board gradient (always there, so nothing is ever blank)
 *   2. the chosen background — a preset sky or the couple's photo — drawn at
 *      bg_opacity, so they can dial it back until it's a whisper behind the ink
 *   3. the preset's faint motif (love sign, sun, moon, stars)
 *   4. Presence Painting's night constellation
 * A drawn-on photo canvas still shows its photo full-strength — that photo IS
 * the subject, not decoration.
 */
export function CanvasBackdrop({
  w,
  h,
  board,
  photoUrl,
  bgKey,
  bgPhotoUrl,
  bgOpacity = 1,
  seedId = 'trace',
  stars,
  night = 0,
  nowMs = 0,
}: Props) {
  const image = useImage(photoUrl ?? null);
  const bgImage = useImage(bgPhotoUrl ?? null);
  const preset = backgroundByKey(bgKey);
  const alpha = clampBgOpacity(bgOpacity);

  // A drawn-on photo canvas: the photo is the canvas.
  if (photoUrl && image) {
    return <SkiaImage image={image} fit="cover" x={0} y={0} width={w} height={h} />;
  }

  return (
    <>
      {/* 1 · theme ground, so there is never a bare canvas */}
      <Rect x={0} y={0} width={w} height={h}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, h)}
          colors={board.colors}
          positions={board.positions}
        />
      </Rect>

      {/* 2 · the chosen background, at the couple's opacity */}
      <Group opacity={alpha}>
        {bgPhotoUrl && bgImage ? (
          <SkiaImage image={bgImage} fit="cover" x={0} y={0} width={w} height={h} />
        ) : (
          <>
            <Rect x={0} y={0} width={w} height={h}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(0, h)}
                colors={preset.colors}
                positions={preset.positions}
              />
            </Rect>
            {preset.glow && (
              <Rect x={0} y={0} width={w} height={h}>
                <RadialGradient
                  c={vec(w * preset.glow.x, h * preset.glow.y)}
                  r={w * preset.glow.r}
                  colors={[preset.glow.color, fade(preset.glow.color)]}
                />
              </Rect>
            )}
            {/* 3 · the faint motif */}
            <Motif preset={preset} w={w} h={h} seed={seedId} />
          </>
        )}
      </Group>

      {/* 4 · Presence Painting's night sky */}
      {night > 0 &&
        stars?.map((s, i) => (
          <Circle
            key={i}
            cx={s.x * w}
            cy={s.y * h}
            r={Math.max(1, s.r * w)}
            color="#fff8ea"
            opacity={starOpacity(s, nowMs, night)}
          />
        ))}
    </>
  );
}
