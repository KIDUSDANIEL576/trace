import {
  Circle,
  Image as SkiaImage,
  LinearGradient,
  RadialGradient,
  Rect,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import React from 'react';
import { starOpacity, type Star } from '@/lib/livingInk';
import type { BoardPalette } from '@/theme/tokens';

interface Props {
  w: number;
  h: number;
  board: BoardPalette;
  photoUrl?: string | null;
  /** Presence Painting: the couple's constellation, visible only at night. */
  stars?: Star[];
  night?: number; // 0 = day, 1 = deep night
  nowMs?: number;
}

/** Same rgba colour with its alpha forced to 0 (for the highlight's outer stop). */
function fade(rgba: string): string {
  return rgba.replace(/[\d.]+\)$/, '0)');
}

/**
 * Canvas ground layer. Photo canvases render the photo (cover-fit); otherwise
 * the theme's gradient — multiply-blend marker ink needs a light ground either
 * way. Falls back to the gradient while a photo is still loading.
 */
export function CanvasBackdrop({ w, h, board, photoUrl, stars, night = 0, nowMs = 0 }: Props) {
  const image = useImage(photoUrl ?? null);

  if (photoUrl && image) {
    return <SkiaImage image={image} fit="cover" x={0} y={0} width={w} height={h} />;
  }

  return (
    <>
      <Rect x={0} y={0} width={w} height={h}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, h)}
          colors={board.colors}
          positions={board.positions}
        />
      </Rect>
      <Rect x={0} y={0} width={w} height={h}>
        <RadialGradient
          c={vec(w * 0.7, h * 0.18)}
          r={w * 0.62}
          colors={[board.highlight, fade(board.highlight)]}
        />
      </Rect>
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
