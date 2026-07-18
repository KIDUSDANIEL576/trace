import { Skia, type SkPath } from '@shopify/react-native-skia';
import type { Point } from '@/types';

/**
 * Builds a smoothed path through normalized points: quadratic curves through
 * segment midpoints. This is what makes strokes feel like ink instead of a
 * connect-the-dots polyline — identical input renders identically on both
 * phones since smoothing is deterministic.
 */
export function buildSmoothPath(points: Point[], w: number, h: number): SkPath {
  const p = Skia.Path.Make();
  if (points.length === 0 || !w || !h) return p;

  const px = (i: number) => points[i][0] * w;
  const py = (i: number) => points[i][1] * h;

  p.moveTo(px(0), py(0));
  if (points.length < 3) {
    for (let i = 1; i < points.length; i++) p.lineTo(px(i), py(i));
    return p;
  }

  for (let i = 1; i < points.length - 1; i++) {
    const midX = (px(i) + px(i + 1)) / 2;
    const midY = (py(i) + py(i + 1)) / 2;
    p.quadTo(px(i), py(i), midX, midY);
  }
  p.lineTo(px(points.length - 1), py(points.length - 1));
  return p;
}
