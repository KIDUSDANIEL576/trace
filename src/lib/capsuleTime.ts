// Pure capsule time logic — no supabase/react-native imports, so unit tests
// can load it under Node directly.
import type { CapsuleMeta } from '@/types';

export function isOpen(c: CapsuleMeta, now = new Date()): boolean {
  return new Date(c.opensAt).getTime() <= now.getTime();
}

/** "in 3 days" / "in 2 months" — coarse on purpose; precision kills romance. */
export function opensInLabel(c: CapsuleMeta, now = new Date()): string {
  const ms = new Date(c.opensAt).getTime() - now.getTime();
  if (ms <= 0) return 'ready to open';
  const days = Math.ceil(ms / 86_400_000);
  if (days === 1) return 'opens tomorrow';
  if (days < 31) return `opens in ${days} days`;
  const months = Math.round(days / 30);
  if (months < 12) return `opens in ${months} month${months === 1 ? '' : 's'}`;
  const years = Math.round(days / 365);
  return `opens in ${years} year${years === 1 ? '' : 's'}`;
}
