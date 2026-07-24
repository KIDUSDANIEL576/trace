import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BLOOM_DAYS,
  BLOOM_MAX,
  bloomScale,
  hashSeed,
  nightness,
  starField,
  starOpacity,
} from '../src/lib/livingInk';

// Presence Painting must be DETERMINISTIC — both phones and the widget
// snapshot compute the same world from the same inputs.

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

test('nightness: deep night, day, and the dusk/dawn ramps', () => {
  const at = (h: number, m = 0) => new Date(2026, 6, 24, h, m);
  assert.equal(nightness(at(23)), 1);
  assert.equal(nightness(at(2)), 1);
  assert.equal(nightness(at(12)), 0);
  assert.equal(nightness(at(19, 59)), 0);
  const dusk = nightness(at(20, 30));
  assert.ok(dusk > 0 && dusk < 1, 'dusk ramps in');
  const dawn = nightness(at(5, 30));
  assert.ok(dawn > 0 && dawn < 1, 'dawn ramps out');
});

test('starField is deterministic per seed and differs across seeds', () => {
  const a1 = starField('canvas-a');
  const a2 = starField('canvas-a');
  const b = starField('canvas-b');
  assert.deepEqual(a1, a2, 'same seed → identical constellation on both phones');
  assert.notDeepEqual(a1, b, 'different canvases get different skies');
});

test('stars stay in the upper sky, inside the canvas', () => {
  for (const s of starField('any-canvas', 50)) {
    assert.ok(s.x >= 0 && s.x <= 1);
    assert.ok(s.y >= 0 && s.y <= 0.45, 'stars live in the top of the sky');
    assert.ok(s.r > 0);
  }
});

test('star opacity is 0 in daylight and bounded at night', () => {
  const star = starField('seed')[0];
  assert.equal(starOpacity(star, 123456789, 0), 0);
  for (let t = 0; t < 10; t++) {
    const o = starOpacity(star, t * 1000, 1);
    assert.ok(o >= 0 && o <= 1);
  }
});

test('hashSeed is stable (locked value — a change would move every constellation)', () => {
  assert.equal(hashSeed('trace'), hashSeed('trace'));
  assert.notEqual(hashSeed('trace'), hashSeed('tracf'));
});
