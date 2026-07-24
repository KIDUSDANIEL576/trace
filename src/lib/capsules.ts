import { RPCS, TABLES } from '@/lib/backend';
import { supabase } from '@/lib/supabase';
import type { CapsuleMeta, CapsuleStroke, Stroke } from '@/types';

/**
 * Time Capsules — seal a drawing until a date. Metadata is always visible to
 * both partners (anticipation is the feature); the strokes themselves are
 * unreadable until opens_at — enforced by RLS, so not even the author can peek.
 */

export { isOpen, opensInLabel } from '@/lib/capsuleTime';

export async function sealCapsule(
  coupleId: string,
  strokes: Stroke[],
  opensAt: Date,
  note?: string
): Promise<void> {
  const content: CapsuleStroke[] = strokes.map((s) => ({
    brush: s.brush,
    color: s.color,
    width: s.width,
    points: s.points,
  }));
  // one atomic SECURITY DEFINER transaction — clients have no direct INSERT,
  // so a half-written "hollow" capsule can't exist (review finding #2)
  const { error } = await supabase.rpc(RPCS.sealCapsule, {
    p_couple_id: coupleId,
    p_opens_at: opensAt.toISOString(),
    p_strokes: content,
    p_note: note?.trim() || null,
  });
  if (error) throw error;
}

export async function listCapsules(coupleId: string): Promise<CapsuleMeta[]> {
  const { data, error } = await supabase
    .from(TABLES.capsules)
    .select('id, author_id, note, opens_at, opened_at, created_at')
    .eq('couple_id', coupleId)
    .order('opens_at', { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    authorId: r.author_id,
    note: r.note,
    opensAt: r.opens_at,
    openedAt: r.opened_at,
    createdAt: r.created_at,
  }));
}

/** Strokes come back null while sealed (RLS filters the row). */
export async function openCapsule(capsule: CapsuleMeta): Promise<CapsuleStroke[] | null> {
  const { data, error } = await supabase
    .from(TABLES.capsuleContents)
    .select('strokes')
    .eq('capsule_id', capsule.id)
    .maybeSingle();
  if (error || !data) return null;
  if (!capsule.openedAt) {
    // awaited so a following listCapsules can't race it and re-show the pill
    try {
      await supabase
        .from(TABLES.capsules)
        .update({ opened_at: new Date().toISOString() })
        .eq('id', capsule.id);
    } catch {
      // offline: the reveal replays next launch — acceptable
    }
  }
  return data.strokes as CapsuleStroke[];
}
