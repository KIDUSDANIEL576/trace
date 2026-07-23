import assert from 'node:assert/strict';
import test from 'node:test';
import { dailyPrompt } from '../src/lib/prompts';

// Prompts must be deterministic by UTC date so both partners see the same one.

test('same UTC day yields the same prompt', () => {
  const a = dailyPrompt(new Date('2026-07-23T00:00:00Z'));
  const b = dailyPrompt(new Date('2026-07-23T23:59:59Z'));
  assert.equal(a, b);
});

test('always returns a non-empty string', () => {
  for (let i = 0; i < 400; i++) {
    const d = new Date('2026-01-01T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + i);
    assert.equal(typeof dailyPrompt(d), 'string');
    assert.ok(dailyPrompt(d).length > 0);
  }
});

test('prompt advances across consecutive days (not stuck)', () => {
  const d1 = dailyPrompt(new Date('2026-07-23T12:00:00Z'));
  const d2 = dailyPrompt(new Date('2026-07-24T12:00:00Z'));
  assert.notEqual(d1, d2);
});

test('cycles with a 14-day period', () => {
  const base = new Date('2026-03-10T12:00:00Z');
  const later = new Date('2026-03-10T12:00:00Z');
  later.setUTCDate(later.getUTCDate() + 14);
  assert.equal(dailyPrompt(base), dailyPrompt(later));
});
