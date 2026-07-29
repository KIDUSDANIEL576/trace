import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { BACKGROUNDS } from '../src/theme/backgrounds';

// The widget's server-side renderer carries its own copy of the sky table
// (it's Deno, it can't import the app's TypeScript). A drifted copy means the
// widget quietly shows a different sky than the phone — nobody reports that,
// they just decide the widget looks wrong. So the copy is checked, not trusted.

const src = readFileSync('supabase/functions/render-snapshot/index.ts', 'utf8');

function embeddedSkies(): Record<string, { c: string[]; p: number[]; g: unknown }> {
  const m = src.match(/> = (\{.*?\});\n/s);
  assert.ok(m, 'could not find the SKIES table in render-snapshot');
  return JSON.parse(m![1]);
}

test('the widget renders every sky the app offers, with identical gradients', () => {
  const table = embeddedSkies();
  assert.equal(
    Object.keys(table).length,
    BACKGROUNDS.length,
    `widget knows ${Object.keys(table).length} skies, app has ${BACKGROUNDS.length}`
  );
  for (const b of BACKGROUNDS) {
    const got = table[b.key];
    assert.ok(got, `widget is missing the "${b.key}" sky`);
    assert.deepEqual(got.c, b.colors, `${b.key}: colours differ from the app`);
    assert.deepEqual(got.p, b.positions, `${b.key}: gradient stops differ from the app`);
    const glow = b.glow ? [b.glow.x, b.glow.y, b.glow.r, b.glow.color] : null;
    assert.deepEqual(got.g, glow, `${b.key}: glow differs from the app`);
  }
});

test('the sky glow is data-driven, not hardcoded to dusk', () => {
  // Each preset carries its own glow and the app renders it (CanvasBackdrop).
  // The old renderer hardcoded DUSK's glow onto all 61 skies, so a Sunset
  // canvas got a dusk highlight on the widget. The glow must come from the
  // preset row, and nothing may be drawn on the sky beyond it — the canvas is
  // flat, so no motifs and no star field.
  assert.ok(!/paintDusk/.test(src), 'paintDusk is gone; paintSky replaced it');
  assert.match(src, /const \[x, y, r, color\] = sky\.g;/);
  // look for drawing code, not the word — the doc comment says "no motif"
  for (const banned of ['Motif(', 'starField(', 'heartPoints(']) {
    assert.ok(!src.includes(banned), `the widget must not draw ${banned}`);
  }
});

test('the widget clamps background opacity the way the app does', () => {
  // src/theme/backgrounds.ts clampBgOpacity: 0.15..1
  assert.match(src, /Math\.min\(1, Math\.max\(0\.15, bgOpacity/);
});
