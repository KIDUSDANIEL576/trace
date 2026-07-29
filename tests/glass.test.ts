import assert from 'node:assert/strict';
import test from 'node:test';
import { PALETTES, THEME_ORDER } from '../src/theme/tokens';

/** Alpha channel of an `rgba(r,g,b,a)` string. */
function alpha(rgba: string): number {
  const m = rgba.match(/rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/);
  assert.ok(m, `${rgba} must be an rgba() colour`);
  return Number(m![1]);
}

test('every theme defines a complete glass palette', () => {
  for (const name of THEME_ORDER) {
    const g = PALETTES[name].glass;
    for (const key of [
      'tint',
      'tintStrong',
      'tintAndroid',
      'tintStrongAndroid',
      'border',
      'edge',
      'glowInk',
      'shadow',
      'wellIdle',
    ] as const) {
      assert.ok(g[key]?.length > 0, `${name} glass is missing ${key}`);
    }
    assert.ok(
      g.blurIntensity > 0 && g.blurIntensity <= 100,
      `${name} blurIntensity out of range`
    );
    assert.ok(['light', 'dark', 'default'].includes(g.blurTint), `${name} blurTint invalid`);
  }
});

test('Android tints are heavier than the blurred ones (they carry legibility alone)', () => {
  // Android renders no real blur by default (Glass.tsx), so its wash is the
  // ONLY thing keeping dock icons and sheet text readable over a bright sky.
  // If these ever drop to the iOS values, Android text goes soupy.
  for (const name of THEME_ORDER) {
    const g = PALETTES[name].glass;
    assert.ok(
      alpha(g.tintAndroid) > alpha(g.tint),
      `${name}: tintAndroid must be more opaque than tint`
    );
    assert.ok(
      alpha(g.tintStrongAndroid) > alpha(g.tintStrong),
      `${name}: tintStrongAndroid must be more opaque than tintStrong`
    );
    // a sheet always sits on more varied content than a floating pill
    assert.ok(alpha(g.tintStrong) > alpha(g.tint), `${name}: sheets need the heavier tint`);
    // ...but never fully opaque, or it stops being glass and becomes a panel
    assert.ok(alpha(g.tintStrongAndroid) < 1, `${name}: glass must never be fully opaque`);
  }
});

test('the lit edge is brighter than the rim (what makes glass read as glass)', () => {
  for (const name of THEME_ORDER) {
    const g = PALETTES[name].glass;
    assert.ok(
      alpha(g.edge) > alpha(g.border),
      `${name}: the top edge must catch more light than the border`
    );
  }
});
