import assert from 'node:assert/strict';
import test from 'node:test';
import { BRUSHES, BRUSH_ORDER, PREMIUM_BRUSHES } from '../src/lib/brushes';
import type { Brush } from '../src/types';

// Free tier is exactly marker + chalk (spec §Phase 4). The paywall gate reads
// PREMIUM_BRUSHES directly, so drift here either gives away paid brushes or locks
// free ones.

const ALL_BRUSHES: Brush[] = ['marker', 'glow', 'neon', 'chalk', 'invisible'];

test('BRUSH_ORDER lists every brush exactly once', () => {
  assert.equal(BRUSH_ORDER.length, ALL_BRUSHES.length);
  assert.deepEqual([...BRUSH_ORDER].sort(), [...ALL_BRUSHES].sort());
});

test('every brush in BRUSH_ORDER has a BRUSHES definition', () => {
  for (const brush of BRUSH_ORDER) {
    assert.ok(BRUSHES[brush], `${brush} missing from BRUSHES`);
    assert.ok(BRUSHES[brush].label.length > 0, `${brush} needs a label`);
    assert.ok(BRUSHES[brush].width > 0, `${brush} needs a positive width`);
  }
});

test('premium brushes are exactly glow, neon, invisible', () => {
  assert.deepEqual([...PREMIUM_BRUSHES].sort(), ['glow', 'invisible', 'neon']);
});

test('free tier is exactly marker + chalk', () => {
  const free = BRUSH_ORDER.filter((b) => !PREMIUM_BRUSHES.has(b));
  assert.deepEqual(free.sort(), ['chalk', 'marker']);
});

test('every premium brush is a real, known brush', () => {
  for (const brush of PREMIUM_BRUSHES) {
    assert.ok(BRUSH_ORDER.includes(brush), `${brush} is premium but not a known brush`);
  }
});
