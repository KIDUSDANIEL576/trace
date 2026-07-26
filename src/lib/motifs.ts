// Motif geometry for canvas backgrounds — the faint "love sign", sun, moon or
// stars sitting behind your drawing. Pure math (no assets), normalized 0..1 so
// it scales to any canvas and matches on both phones.
import { hashSeed } from '@/lib/livingInk';

/** Classic heart curve, sampled as normalized points. */
export function heartPoints(steps = 72): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (Math.PI * 2 * i) / steps;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    // normalize from the curve's ~[-17,17] range into 0..1 around the centre
    pts.push([0.5 + x / 42, 0.5 - y / 42]);
  }
  return pts;
}

export interface MotifStar {
  x: number;
  y: number;
  r: number; // fraction of canvas width
}

/** A scattered starfield for the motif layer (distinct from Presence Painting's
 * night constellation, which is seeded per-canvas and only appears at night). */
export function motifStars(seed: string, count = 26): MotifStar[] {
  let h = hashSeed(seed);
  const rand = () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    x: rand(),
    y: rand() * 0.8,
    r: 0.002 + rand() * 0.004,
  }));
}

/** Four-point sparkles for the softer romantic presets. */
export function sparklePositions(seed: string, count = 9): MotifStar[] {
  let h = hashSeed(seed) ^ 0x9e3779b9;
  const rand = () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    x: 0.08 + rand() * 0.84,
    y: 0.06 + rand() * 0.8,
    r: 0.012 + rand() * 0.022,
  }));
}
