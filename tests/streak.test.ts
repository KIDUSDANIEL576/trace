import assert from 'node:assert/strict';
import test from 'node:test';
import { computeStreak } from '../src/lib/streak';

// computeStreak is anchored to the real "today" (UTC), so fixtures are built
// relative to today. A day qualifies only when BOTH partners marked it.
const A = 'user-a';
const B = 'user-b';

/** The UTC date string (YYYY-MM-DD) `offset` days before today. */
function utcDay(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

/** Both partners marked the given day-offsets. */
function bothMarked(...offsets: number[]) {
  return offsets.flatMap((o) => [
    { day: utcDay(o), user_id: A },
    { day: utcDay(o), user_id: B },
  ]);
}

test('no marks → streak 0', () => {
  assert.equal(computeStreak([]), 0);
});

test('only one partner marked today → 0 (both required)', () => {
  assert.equal(computeStreak([{ day: utcDay(0), user_id: A }]), 0);
});

test('both marked today → 1', () => {
  assert.equal(computeStreak(bothMarked(0)), 1);
});

test('both marked today and yesterday → 2', () => {
  assert.equal(computeStreak(bothMarked(0, 1)), 2);
});

test('three consecutive both-days → 3', () => {
  assert.equal(computeStreak(bothMarked(0, 1, 2)), 3);
});

test('grace window: nothing today but a run ending yesterday still counts', () => {
  // Before today's marks land, the counter should not drop to 0.
  assert.equal(computeStreak(bothMarked(1, 2)), 2);
});

test('a gap breaks the streak', () => {
  // today + yesterday qualify, but day -2 is missing → streak stops at 2.
  assert.equal(computeStreak(bothMarked(0, 1, 3, 4)), 2);
});

test('duplicate marks from the same user do not fake a qualifying day', () => {
  const marks = [
    { day: utcDay(0), user_id: A },
    { day: utcDay(0), user_id: A },
    { day: utcDay(0), user_id: A },
  ];
  assert.equal(computeStreak(marks), 0);
});

test('old streak with neither today nor yesterday → 0', () => {
  assert.equal(computeStreak(bothMarked(3, 4, 5)), 0);
});
