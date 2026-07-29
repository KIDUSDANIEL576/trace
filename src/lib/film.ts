// The photographic finish. Nothing is ever *drawn* on the canvas background —
// the sky is a smooth gradient, and this only adds the texture that makes a
// gradient read like a saved photo instead of a vector.

import { hashSeed } from './livingInk';

/** A seeded stream of pseudo-randoms, so two phones scatter identically. */
function seededRand(seed: string, salt: number): () => number {
  let h = hashSeed(seed) ^ salt;
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 4294967296;
  };
}

export interface Bokeh {
  x: number;
  y: number;
  r: number; // fraction of canvas width
  alpha: number; // per-circle falloff so they don't all read the same
}

/** Out-of-focus light circles — the soft glowing discs in a shallow-depth
 * photograph. Seeded per canvas so both phones see the same lights. */
export function bokehCircles(seed: string, count: number, size: number): Bokeh[] {
  const rand = seededRand(seed, 0xb04e);
  return Array.from({ length: count }, () => ({
    x: rand(),
    y: rand(),
    r: size * (0.45 + rand() * 0.85),
    alpha: 0.35 + rand() * 0.65,
  }));
}
