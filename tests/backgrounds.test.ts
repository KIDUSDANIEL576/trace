import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  BACKGROUNDS,
  backgroundByKey,
  clampBgOpacity,
  DEFAULT_BACKGROUND_KEY,
} from '../src/theme/backgrounds';
import {
  driftingPetals,
  fallingLeaves,
  fireworkBursts,
  galaxyStars,
  heartPoints,
  motifStars,
  RAINBOW_BANDS,
  rainStreaks,
  ridgeLine,
  scatteredHearts,
  snowFlakes,
  sparklePositions,
  surfLines,
  treeLine,
} from '../src/lib/motifs';

test('every preset is well formed (stops match positions, sorted 0..1)', () => {
  for (const b of BACKGROUNDS) {
    assert.ok(b.label.length > 0, `${b.key} needs a label`);
    assert.equal(b.colors.length, b.positions.length, `${b.key} stops/positions mismatch`);
    assert.ok(b.colors.length >= 2, `${b.key} needs a gradient`);
    assert.equal(b.positions[0], 0, `${b.key} must start at 0`);
    assert.equal(b.positions[b.positions.length - 1], 1, `${b.key} must end at 1`);
    for (let i = 1; i < b.positions.length; i++) {
      assert.ok(b.positions[i] > b.positions[i - 1], `${b.key} positions must ascend`);
    }
    if (b.glow) {
      assert.ok(b.glow.x >= 0 && b.glow.x <= 1, `${b.key} glow x in range`);
      assert.ok(b.glow.y >= 0 && b.glow.y <= 1, `${b.key} glow y in range`);
      assert.ok(b.glow.r > 0, `${b.key} glow radius positive`);
    }
  }
});

test('preset keys are unique and the default exists', () => {
  const keys = BACKGROUNDS.map((b) => b.key);
  assert.equal(new Set(keys).size, keys.length, 'keys must be unique');
  assert.ok(keys.includes(DEFAULT_BACKGROUND_KEY), 'default must be a real preset');
});

test('backgroundByKey falls back to the default for junk input', () => {
  assert.equal(backgroundByKey('sunset').key, 'sunset');
  assert.equal(backgroundByKey('does-not-exist').key, DEFAULT_BACKGROUND_KEY);
  assert.equal(backgroundByKey(null).key, DEFAULT_BACKGROUND_KEY);
  assert.equal(backgroundByKey(undefined).key, DEFAULT_BACKGROUND_KEY);
});

test('opacity clamps to a always-drawable range (never fully invisible)', () => {
  assert.equal(clampBgOpacity(1), 1);
  assert.equal(clampBgOpacity(0.5), 0.5);
  assert.equal(clampBgOpacity(0), 0.15, 'floor keeps the sky faintly present');
  assert.equal(clampBgOpacity(-3), 0.15);
  assert.equal(clampBgOpacity(9), 1, 'ceiling');
  assert.equal(clampBgOpacity(null), 1, 'missing → full strength');
  assert.equal(clampBgOpacity(NaN), 1);
});

test('heart motif is closed and stays inside the canvas', () => {
  const pts = heartPoints();
  for (const [x, y] of pts) {
    assert.ok(x >= 0 && x <= 1, 'x normalized');
    assert.ok(y >= 0 && y <= 1, 'y normalized');
  }
  assert.deepEqual(pts[0], pts[pts.length - 1], 'curve closes on itself');
});

test('motif scatter is deterministic per seed (both phones match)', () => {
  assert.deepEqual(motifStars('canvas-a'), motifStars('canvas-a'));
  assert.notDeepEqual(motifStars('canvas-a'), motifStars('canvas-b'));
  assert.deepEqual(sparklePositions('x'), sparklePositions('x'));
  for (const s of motifStars('seed', 40)) {
    assert.ok(s.x >= 0 && s.x <= 1 && s.y >= 0 && s.y <= 1);
  }
});

test('second-wave motifs are deterministic and stay on canvas', () => {
  for (const fn of [scatteredHearts, rainStreaks, driftingPetals, snowFlakes]) {
    assert.deepEqual(fn('canvas-a'), fn('canvas-a'), `${fn.name} must be deterministic`);
    assert.notDeepEqual(fn('canvas-a'), fn('canvas-b'), `${fn.name} must vary by seed`);
    for (const item of fn('seed') as { x: number; y: number }[]) {
      assert.ok(item.x >= 0 && item.x <= 1, `${fn.name} x in range`);
      assert.ok(item.y >= 0 && item.y <= 1, `${fn.name} y in range`);
    }
  }
});

test('every motif kind used by a preset is rendered by CanvasBackdrop', () => {
  // Read the renderer's switch directly rather than hand-listing kinds here —
  // a new motif that nobody drew would otherwise ship as an invisible no-op.
  // resolved from the repo root, which is where `npm test` runs
  const backdrop = readFileSync('src/components/CanvasBackdrop.tsx', 'utf8');
  const rendered = new Set(
    [...backdrop.matchAll(/case '([a-z]+)':/g)].map((m) => m[1])
  );
  rendered.add('none'); // the default branch
  for (const b of BACKGROUNDS) {
    assert.ok(
      rendered.has(b.motif),
      `${b.key} uses motif '${b.motif}' but CanvasBackdrop never draws it`
    );
  }
});

test('scene motifs (waves, treeline, galaxy) are deterministic and placed sensibly', () => {
  assert.deepEqual(surfLines('a'), surfLines('a'));
  assert.notDeepEqual(surfLines('a'), surfLines('b'));
  for (const wv of surfLines('seed')) {
    assert.ok(wv.y > 0.5 && wv.y < 1, 'surf sits in the lower sea band');
    assert.ok(wv.amp > 0 && wv.width > 0);
  }

  assert.deepEqual(treeLine('a'), treeLine('a'));
  const trees = treeLine('seed');
  for (const t of trees) {
    assert.ok(t.x >= 0 && t.x <= 1, 'tree on canvas');
    assert.ok(t.base > 0.85, 'trees stand on the ground line');
    assert.ok(t.h > 0 && t.w > 0);
  }
  // spread across the width rather than bunched
  assert.ok(Math.max(...trees.map((t) => t.x)) - Math.min(...trees.map((t) => t.x)) > 0.6);

  assert.deepEqual(galaxyStars('a'), galaxyStars('a'));
  const gs = galaxyStars('seed');
  assert.ok(gs.length > 50, 'galaxy is dense');
  for (const s of gs) {
    assert.ok(s.x >= 0 && s.x <= 1 && s.y >= 0 && s.y <= 1, 'star stays on canvas');
    assert.ok(s.r > 0);
  }
});

test('scene motifs (peaks, bursts, leaves) are deterministic and placed sensibly', () => {
  assert.deepEqual(ridgeLine('a'), ridgeLine('a'));
  assert.notDeepEqual(ridgeLine('a'), ridgeLine('b'));
  const peaks = ridgeLine('seed');
  for (const p of peaks) {
    assert.ok(p.x >= 0 && p.x <= 1, 'summit on canvas');
    assert.ok(p.top > 0.3 && p.top < 0.7, 'summits sit in the middle band');
    assert.ok(p.halfWidth > 0 && p.snow > 0 && p.snow < 1, 'snow cap is a fraction of the peak');
  }
  assert.ok(
    Math.max(...peaks.map((p) => p.x)) - Math.min(...peaks.map((p) => p.x)) > 0.5,
    'ridge spans the width'
  );

  assert.deepEqual(fireworkBursts('a'), fireworkBursts('a'));
  for (const b of fireworkBursts('seed')) {
    assert.ok(b.x >= 0 && b.x <= 1 && b.y >= 0 && b.y <= 1, 'burst on canvas');
    assert.ok(b.y < 0.7, 'bursts stay in the sky');
    assert.ok(b.spokes >= 8, 'enough spokes to read as a firework');
  }

  assert.deepEqual(fallingLeaves('a'), fallingLeaves('a'));
  for (const l of fallingLeaves('seed')) {
    assert.ok(l.x >= 0 && l.x <= 1 && l.y >= 0 && l.y <= 1, 'leaf on canvas');
    assert.ok(l.r > 0);
  }
});

test('rainbow bands are ordered and translucent', () => {
  assert.equal(RAINBOW_BANDS.length, 7, 'seven bands');
  for (const c of RAINBOW_BANDS) {
    assert.match(c, /^rgba\(/, 'bands must be translucent so ink stays readable');
  }
});

test('the library is a real choice (20+ skies, mixed light and dark)', () => {
  assert.ok(BACKGROUNDS.length >= 20, `expected a rich library, got ${BACKGROUNDS.length}`);
  assert.ok(BACKGROUNDS.some((b) => b.light), 'needs light skies');
  assert.ok(BACKGROUNDS.some((b) => !b.light), 'needs dark skies');
});
