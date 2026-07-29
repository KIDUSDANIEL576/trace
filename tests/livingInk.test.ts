import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BLOOM_DAYS,
  BLOOM_MAX,
  bloomScale,
  hashSeed,
} from '../src/lib/livingInk';

// Ink bloom must be DETERMINISTIC — both phones and the widget snapshot
// compute the same stroke widths from the same inputs.

const DAY = 86_400_000;

test('fresh ink has no bloom', () => {
  const now = 1_700_000_000_000;
  assert.equal(bloomScale(now, now), 1);
});

test('bloom grows with age and caps at BLOOM_MAX', () => {
  const t0 = 1_700_000_000_000;
  const day1 = bloomScale(t0, t0 + 1 * DAY);
  const day3 = bloomScale(t0, t0 + 3 * DAY);
  const full = bloomScale(t0, t0 + BLOOM_DAYS * DAY);
  const beyond = bloomScale(t0, t0 + 100 * DAY);
  assert.ok(day1 > 1 && day1 < day3, 'bloom is monotonic early');
  assert.ok(day3 < full, 'still growing before the cap');
  assert.ok(Math.abs(full - (1 + BLOOM_MAX)) < 1e-9, 'caps exactly at BLOOM_MAX');
  assert.equal(beyond, full, 'never grows past the cap');
});

test('bloom easing is front-loaded (most bloom in the first days)', () => {
  const t0 = 0;
  const firstHalf = bloomScale(t0, (BLOOM_DAYS / 2) * DAY) - 1;
  const total = bloomScale(t0, BLOOM_DAYS * DAY) - 1;
  assert.ok(firstHalf > total / 2, 'over half the bloom happens in the first half');
});

test('clock skew (createdAt in the future) never shrinks ink', () => {
  const now = 1_700_000_000_000;
  assert.equal(bloomScale(now + 60_000, now), 1);
});

test('hashSeed is pinned (changing the hash would move every couple’s constellation)', () => {
  assert.equal(hashSeed('trace'), 2168288686);
  assert.notEqual(hashSeed('trace'), hashSeed('tracf'));
});

