import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BACKGROUNDS,
  backgroundByKey,
  clampBgOpacity,
  DEFAULT_BACKGROUND_KEY,
  FAMILY_LABELS,
  FAMILY_ORDER,
  FREE_SKY_KEYS,
  isSkyFree,
} from '../src/theme/backgrounds';
import { bokehCircles } from '../src/lib/film';

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

test('the free tier feels open: every family has free skies', () => {
  // If a whole tab were locked, the picker would read as a shop, not a
  // library — the fastest way to make a free user feel cheated.
  for (const f of FAMILY_ORDER) {
    const free = BACKGROUNDS.filter((b) => b.family === f && isSkyFree(b.key));
    assert.ok(free.length > 0, `the ${f} tab has no free skies`);
  }
});

test('free skies are a real spread, not a token sample', () => {
  const free = BACKGROUNDS.filter((b) => isSkyFree(b.key));
  assert.ok(free.length >= 12, `only ${free.length} free skies — too stingy`);
  assert.ok(
    free.length <= BACKGROUNDS.length * 0.4,
    `${free.length} free of ${BACKGROUNDS.length} leaves too little to unlock`
  );
  assert.ok(free.some((b) => b.light), 'free tier needs light skies');
  assert.ok(free.some((b) => !b.light), 'free tier needs dark skies');
});

test('the default sky is always free', () => {
  // otherwise a brand-new couple opens the app already locked out of their
  // own canvas background
  assert.ok(isSkyFree(DEFAULT_BACKGROUND_KEY), 'the default sky must be free');
});

test('every free sky key names a real preset', () => {
  const keys = new Set(BACKGROUNDS.map((b) => b.key));
  for (const k of FREE_SKY_KEYS) {
    assert.ok(keys.has(k), `FREE_SKY_KEYS lists '${k}', which is not a preset`);
  }
});

test('the library is a real choice (20+ skies, mixed light and dark)', () => {
  assert.ok(BACKGROUNDS.length >= 20, `expected a rich library, got ${BACKGROUNDS.length}`);
  assert.ok(BACKGROUNDS.some((b) => b.light), 'needs light skies');
  assert.ok(BACKGROUNDS.some((b) => !b.light), 'needs dark skies');
});
