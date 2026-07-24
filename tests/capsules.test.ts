import assert from 'node:assert/strict';
import test from 'node:test';
import { isOpen, opensInLabel } from '../src/lib/capsuleTime';
import type { CapsuleMeta } from '../src/types';

const DAY = 86_400_000;
const NOW = new Date('2026-07-24T12:00:00Z');

function capsule(opensAtMs: number): CapsuleMeta {
  return {
    id: 'c1',
    authorId: 'u1',
    note: null,
    opensAt: new Date(opensAtMs).toISOString(),
    openedAt: null,
    createdAt: new Date(NOW.getTime() - DAY).toISOString(),
  };
}

test('a capsule opening in the past is open; future is sealed', () => {
  assert.equal(isOpen(capsule(NOW.getTime() - 1000), NOW), true);
  assert.equal(isOpen(capsule(NOW.getTime() + 1000), NOW), false);
  assert.equal(isOpen(capsule(NOW.getTime()), NOW), true, 'exact boundary counts as open');
});

test('opensInLabel: ready, tomorrow, days, months, years', () => {
  assert.equal(opensInLabel(capsule(NOW.getTime() - 1), NOW), 'ready to open');
  assert.equal(opensInLabel(capsule(NOW.getTime() + DAY), NOW), 'opens tomorrow');
  assert.equal(opensInLabel(capsule(NOW.getTime() + 5 * DAY), NOW), 'opens in 5 days');
  assert.equal(opensInLabel(capsule(NOW.getTime() + 60 * DAY), NOW), 'opens in 2 months');
  assert.equal(opensInLabel(capsule(NOW.getTime() + 400 * DAY), NOW), 'opens in 1 year');
  assert.equal(opensInLabel(capsule(NOW.getTime() + 5 * 365 * DAY), NOW), 'opens in 5 years');
});
