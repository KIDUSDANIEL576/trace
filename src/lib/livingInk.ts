// Living ink — the ONE way a canvas evolves on its own, and it happens to the
// strokes, never to the background. Deterministic: a pure function of when a
// stroke was drawn and what time it is now, so both phones and the
// server-rendered widget snapshot agree without syncing anything.

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

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
