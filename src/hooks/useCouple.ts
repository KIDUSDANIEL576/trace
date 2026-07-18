import { useCallback, useEffect, useState } from 'react';
import { RPCS, TABLES } from '@/lib/backend';
import { supabase } from '@/lib/supabase';
import type { CanvasInfo, Membership } from '@/types';

/**
 * Loads the caller's couple membership + the couple's shared canvas.
 * Returns membership=null (loading=false) when the user hasn't paired yet.
 */
export function useCouple(userId: string | undefined) {
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setMembership(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: member, error } = await supabase
        .from(TABLES.members)
        .select(`couple_id, display_name, couples:${TABLES.couples}(invite_code)`)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      if (!member) {
        setMembership(null);
        return;
      }

      const [{ data: canvasRows }, { data: partner }] = await Promise.all([
        supabase
          .from(TABLES.canvases)
          .select('id, kind, photo_url, created_at')
          .eq('couple_id', member.couple_id)
          .order('created_at', { ascending: true }),
        supabase
          .from(TABLES.members)
          .select('display_name')
          .eq('couple_id', member.couple_id)
          .neq('user_id', userId)
          .maybeSingle(),
      ]);

      const canvases: CanvasInfo[] = (canvasRows ?? []).map((c) => ({
        id: c.id,
        kind: c.kind as 'shared' | 'photo',
        photoPath: c.photo_url ?? null,
        createdAt: c.created_at,
      }));
      const couple = Array.isArray(member.couples) ? member.couples[0] : member.couples;
      setMembership({
        coupleId: member.couple_id,
        inviteCode: couple?.invite_code ?? '',
        displayName: member.display_name ?? '',
        canvasId: canvases.find((c) => c.kind === 'shared')?.id ?? '',
        canvases,
        partnerName: partner?.display_name ?? null,
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  return { membership, loading, refresh };
}

export async function createCouple(displayName: string) {
  const { data, error } = await supabase.rpc(RPCS.createCouple, { p_display_name: displayName });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row as { couple_id: string; invite_code: string };
}

export async function joinCouple(code: string, displayName: string) {
  const { data, error } = await supabase.rpc(RPCS.joinCouple, {
    p_code: code.trim().toUpperCase(),
    p_display_name: displayName,
  });
  if (error) throw error;
  return data as string; // couple_id
}
