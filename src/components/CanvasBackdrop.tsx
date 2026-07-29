import {
  Blur,
  Circle,
  Group,
  Image as SkiaImage,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Skia,
  Turbulence,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import React, { useMemo } from 'react';
import { hashSeed } from '@/lib/livingInk';
import { bokehCircles } from '@/lib/film';
import {
  backgroundByKey,
  clampBgOpacity,
  SOFT_FILM,
  type BackgroundPreset,
  type FilmFinish,
} from '@/theme/backgrounds';
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
  /** Seeds the film grain/bokeh scatter so both phones match. */
  seedId?: string;
}

/** Same rgba colour with its alpha forced to 0 (for a gradient's outer stop). */
function fade(rgba: string): string {
  return rgba.replace(/[\d.]+\)$/, '0)');
}

/**
 * The photographic finish: bokeh → haze → vignette → grain. This is what makes
 * a gradient stop looking like a vector and start looking like a saved photo.
 * Everything is procedural, so it costs no download and matches on both phones.
 */
function FilmLayer({
  film,
  w,
  h,
  seed,
}: {
  film: FilmFinish;
  w: number;
  h: number;
  seed: string;
}) {
  return (
    <>
      {/* soft out-of-focus lights */}
      {film.bokeh && (
        <Group layer={<Blur blur={Math.max(6, w * 0.03)} />}>
          {bokehCircles(seed, film.bokeh.count, film.bokeh.size).map((b, i) => (
            <Circle
              key={i}
              cx={b.x * w}
              cy={b.y * h}
              r={b.r * w}
              color={film.bokeh!.color}
              opacity={b.alpha}
            />
          ))}
        </Group>
      )}

      {/* a warm light leak washing across the frame */}
      {film.haze && (
        <Rect x={0} y={0} width={w} height={h}>
          <RadialGradient
            c={vec(w * film.haze.x, h * film.haze.y)}
            r={w * film.haze.r}
            colors={[film.haze.color, fade(film.haze.color)]}
          />
        </Rect>
      )}

      {/* vignette — darkened corners, the strongest "shot on film" cue */}
      {film.vignette > 0 && (
        <Rect x={0} y={0} width={w} height={h}>
          <RadialGradient
            c={vec(w * 0.5, h * 0.5)}
            r={Math.max(w, h) * 0.75}
            colors={['rgba(0,0,0,0)', `rgba(0,0,0,${film.vignette})`]}
            positions={[0.55, 1]}
          />
        </Rect>
      )}

      {/* film grain — real noise, not a texture file */}
      {film.grain > 0 && (
        <Group opacity={film.grain} blendMode="softLight">
          <Rect x={0} y={0} width={w} height={h}>
            <Turbulence freqX={0.9} freqY={0.9} octaves={3} seed={hashSeed(seed) % 1000} />
          </Rect>
        </Group>
      )}

      {/* lifted blacks — last, so it washes the grain and vignette too and
          nothing in the frame reaches true black (the faded-print look) */}
      {film.fade && film.fade.amount > 0 && (
        <Rect
          x={0}
          y={0}
          width={w}
          height={h}
          color={film.fade.color}
          opacity={film.fade.amount}
        />
      )}
    </>
  );
}

/**
 * Canvas ground. Layers, bottom to top:
 *   1. the theme's own board gradient (always there, so nothing is ever blank)
 *   2. the chosen background — a preset sky or the couple's photo — drawn at
 *      bg_opacity, so they can dial it back until it's a whisper behind the ink
 *   3. the photographic finish (grain, bokeh, haze, vignette)
 * Nothing is ever DRAWN on the background — no shapes, no symbols, no stars.
 * The canvas stays flat so the only thing on it is what you two draw.
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
          <>
            <SkiaImage image={bgImage} fit="cover" x={0} y={0} width={w} height={h} />
            {/* your own photo gets the same film finish, so it belongs here */}
            <FilmLayer film={SOFT_FILM} w={w} h={h} seed={seedId} />
          </>
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
            {/* 3 · photographic finish (the "calm love aesthetic" presets) */}
            {preset.film && <FilmLayer film={preset.film} w={w} h={h} seed={seedId} />}
          </>
        )}
      </Group>
    </>
  );
}
