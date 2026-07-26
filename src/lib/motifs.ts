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

/** A seeded stream of pseudo-randoms — every scatter below shares this so two
 * phones always draw the same sky. */
function seededRand(seed: string, salt: number): () => number {
  let h = hashSeed(seed) ^ salt;
  return () => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return h / 4294967296;
  };
}

export interface MotifHeart {
  x: number;
  y: number;
  size: number; // fraction of canvas width
  tilt: number; // radians
}

/** A soft scatter of little love signs (Peach, Velvet). */
export function scatteredHearts(seed: string, count = 7): MotifHeart[] {
  const rand = seededRand(seed, 0x1eaf);
  return Array.from({ length: count }, () => ({
    x: 0.1 + rand() * 0.8,
    y: 0.08 + rand() * 0.78,
    size: 0.05 + rand() * 0.06,
    tilt: (rand() - 0.5) * 0.7,
  }));
}

export interface MotifStreak {
  x: number;
  y: number;
  len: number; // fraction of canvas height
  lean: number; // horizontal drift over the streak
}

/** Gentle rain streaks (Rainy day). */
export function rainStreaks(seed: string, count = 34): MotifStreak[] {
  const rand = seededRand(seed, 0x7a11);
  return Array.from({ length: count }, () => ({
    x: rand(),
    y: rand() * 0.92,
    len: 0.05 + rand() * 0.07,
    lean: 0.012 + rand() * 0.014,
  }));
}

export interface MotifDrift {
  x: number;
  y: number;
  r: number;
  tilt: number;
}

/** Drifting blossom petals (Cherry blossom). */
export function driftingPetals(seed: string, count = 14): MotifDrift[] {
  const rand = seededRand(seed, 0xb105);
  return Array.from({ length: count }, () => ({
    x: 0.05 + rand() * 0.9,
    y: 0.05 + rand() * 0.85,
    r: 0.012 + rand() * 0.016,
    tilt: rand() * Math.PI,
  }));
}

/** Slow snowflakes (Snowfall). */
export function snowFlakes(seed: string, count = 30): MotifStar[] {
  const rand = seededRand(seed, 0x5f0c);
  return Array.from({ length: count }, () => ({
    x: rand(),
    y: rand() * 0.95,
    r: 0.003 + rand() * 0.006,
  }));
}
