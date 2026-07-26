import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BACKGROUNDS,
  backgroundByKey,
  clampBgOpacity,
  DEFAULT_BACKGROUND_KEY,
} from '../src/theme/backgrounds';
import { heartPoints, motifStars, sparklePositions } from '../src/lib/motifs';

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
