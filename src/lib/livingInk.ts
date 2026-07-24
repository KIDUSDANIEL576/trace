// Presence Painting — the canvas is alive. All evolution is DETERMINISTIC:
// pure functions of (what was drawn, when it was drawn, what time it is now).
// Both phones — and the server-rendered widget snapshot — compute the same
// world from the same inputs. No server ticks, no stored animation state.

/** Ink "blooms" as it ages: width grows a hair over a week, like ink settling
 * into paper. Subtle by design — an old canvas feels inhabited, not inflated. */
export const BLOOM_DAYS = 7;
export const BLOOM_MAX = 0.08; // +8% width at full bloom

export function bloomScale(createdAtMs: number, nowMs: number): number {
  const age = nowMs - createdAtMs;
  if (age <= 0) return 1;
  const t = Math.min(age / (BLOOM_DAYS * 86_400_000), 1);
  // easeOutQuad — most of the bloom happens in the first days
  return 1 + BLOOM_MAX * (1 - (1 - t) * (1 - t));
}

/** Night falls on the canvas: stars fade in from 20:00, out by 06:00 (local
 * device time — night is when it's night where you are). 0 = day, 1 = deep night. */
export function nightness(date: Date): number {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 21 || h < 5) return 1;
  if (h >= 20) return h - 20; // dusk fade-in 20:00→21:00
  if (h < 6) return 6 - h; // dawn fade-out 05:00→06:00
  return 0;
}

/** Deterministic PRNG (mulberry32) so both phones scatter identical stars. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface Star {
  x: number; // normalized 0..1
  y: number; // normalized 0..1 (kept to the upper sky)
  r: number; // radius as a fraction of canvas width
  twinkle: number; // 0..1 phase offset
}

/** The couple's own constellation — seeded by canvas id, identical everywhere. */
export function starField(seed: string, count = 18): Star[] {
  const rand = mulberry32(hashSeed(seed));
  return Array.from({ length: count }, () => ({
    x: rand(),
    y: rand() * 0.45, // stars live in the top of the sky
    r: 0.0016 + rand() * 0.0028,
    twinkle: rand(),
  }));
}

/** Slow twinkle, deterministic from wall-clock time — no animation state. */
export function starOpacity(star: Star, nowMs: number, night: number): number {
  const phase = (nowMs / 4000 + star.twinkle * Math.PI * 2) % (Math.PI * 2);
  const tw = 0.55 + 0.45 * Math.sin(phase);
  return night * tw * 0.85;
}
