import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  BACKGROUNDS,
  backgroundByKey,
  clampBgOpacity,
  DEFAULT_BACKGROUND_KEY,
  FAMILY_LABELS,
  FAMILY_ORDER,
} from '../src/theme/backgrounds';
import {
  bokehCircles,
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

test('film finishes stay in believable photographic ranges', () => {
  for (const b of BACKGROUNDS) {
    if (!b.film) continue;
    // grain above ~0.2 stops reading as film and starts reading as static
    assert.ok(b.film.grain >= 0 && b.film.grain <= 0.2, `${b.key} grain out of range`);
    assert.ok(b.film.vignette >= 0 && b.film.vignette <= 0.5, `${b.key} vignette too heavy`);
    if (b.film.bokeh) {
      assert.ok(b.film.bokeh.count > 0 && b.film.bokeh.count <= 20, `${b.key} bokeh count`);
      assert.ok(b.film.bokeh.size > 0 && b.film.bokeh.size < 0.3, `${b.key} bokeh size`);
      assert.match(b.film.bokeh.color, /^rgba\(/, `${b.key} bokeh must be translucent`);
    }
    if (b.film.haze) {
      assert.match(b.film.haze.color, /^rgba\(/, `${b.key} haze must be translucent`);
      assert.ok(b.film.haze.r > 0, `${b.key} haze radius`);
    }
    if (b.film.fade) {
      // a lifted-black wash: enough to read as faded, never enough to erase
      // the sky (which would leave a flat rectangle behind the ink)
      assert.ok(
        b.film.fade.amount > 0 && b.film.fade.amount <= 0.3,
        `${b.key} fade amount ${b.film.fade.amount} would wash the sky out`
      );
      assert.match(b.film.fade.color, /^rgba\(/, `${b.key} fade colour`);
    }
  }
});

test('the faded family actually lifts its blacks', () => {
  const faded = BACKGROUNDS.filter((b) => b.film?.fade);
  assert.ok(faded.length >= 5, `expected a faded family, found ${faded.length}`);
  for (const b of faded) {
    // faded film reads soft: high grain, gentle vignette (a heavy vignette
    // would fight the washed look)
    assert.ok(b.film!.grain >= 0.1, `${b.key} faded looks need visible grain`);
    assert.ok(b.film!.vignette <= 0.3, `${b.key} vignette too heavy for a faded look`);
  }
});

test('most of the library has a photographic finish', () => {
  const withFilm = BACKGROUNDS.filter((b) => b.film).length;
  assert.ok(
    withFilm >= BACKGROUNDS.length * 0.7,
    `only ${withFilm}/${BACKGROUNDS.length} skies have a film finish`
  );
});

test('bokeh is deterministic and sized from the preset', () => {
  assert.deepEqual(bokehCircles('a', 8, 0.1), bokehCircles('a', 8, 0.1));
  assert.notDeepEqual(bokehCircles('a', 8, 0.1), bokehCircles('b', 8, 0.1));
  const circles = bokehCircles('seed', 8, 0.1);
  assert.equal(circles.length, 8);
  for (const c of circles) {
    assert.ok(c.x >= 0 && c.x <= 1 && c.y >= 0 && c.y <= 1);
    assert.ok(c.r > 0 && c.alpha > 0 && c.alpha <= 1);
  }
});

test('every sky is reachable from a picker tab', () => {
  // A preset whose family isn't a tab would be invisible in the app — the
  // library would silently shrink.
  for (const b of BACKGROUNDS) {
    assert.ok(
      FAMILY_ORDER.includes(b.family),
      `${b.key} has family '${b.family}', which is not a picker tab`
    );
  }
  // and no tab is empty
  for (const f of FAMILY_ORDER) {
    const n = BACKGROUNDS.filter((b) => b.family === f).length;
    assert.ok(n > 0, `the ${f} tab has no skies`);
    assert.ok(FAMILY_LABELS[f]?.length > 0, `${f} needs a label`);
  }
});

test('the library is a real choice (20+ skies, mixed light and dark)', () => {
  assert.ok(BACKGROUNDS.length >= 20, `expected a rich library, got ${BACKGROUNDS.length}`);
  assert.ok(BACKGROUNDS.some((b) => b.light), 'needs light skies');
  assert.ok(BACKGROUNDS.some((b) => !b.light), 'needs dark skies');
});
