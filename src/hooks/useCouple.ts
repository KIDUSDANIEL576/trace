import { useCallback, useEffect, useRef, useState } from 'react';
import { RPCS, TABLES } from '@/lib/backend';
import { supabase } from '@/lib/supabase';
import type { CanvasInfo, Membership } from '@/types';

/**
 * Loads the caller's couple membership + the couple's shared canvas.
 * Returns membership=null (loading=false) only when the user genuinely hasn't
 * paired yet. Transient fetch failures never null out a loaded membership, and
 * before the first successful load they keep `loading` true and retry — a
 * network blip must not dump a paired user onto the pairing screen.
 */
export function useCouple(userId: string | undefined) {
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const membershipRef = useRef<Membership | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      membershipRef.current = null;
      setMembership(null);
      setLoading(false);
      return;
    }
    try {
      const { data: member, error } = await supabase
        .from(TABLES.members)
        .select(`couple_id, display_name, couples:${TABLES.couples}(invite_code, premium)`)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      if (!member) {
        membershipRef.current = null;
        setMembership(null);
        setLoading(false);
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
      const next: Membership = {
        coupleId: member.couple_id,
        inviteCode: couple?.invite_code ?? '',
        displayName: member.display_name ?? '',
        canvasId: canvases.find((c) => c.kind === 'shared')?.id ?? '',
        canvases,
        partnerName: partner?.display_name ?? null,
        premium: couple?.premium ?? false,
      };
      membershipRef.current = next;
      setMembership(next);
      setLoading(false);
    } catch {
      if (membershipRef.current) {
        // background refresh failed — keep what we have
        setLoading(false);
      } else {
        // nothing loaded yet: stay in loading and try again shortly
        if (retryRef.current) clearTimeout(retryRef.current);
        retryRef.current = setTimeout(() => {
          refresh();
        }, 3000);
      }
    }
  }, [userId]);

  useEffect(() => {
    refresh();
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
    };
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
  // null = wrong code or full couple (the RPC returns null instead of raising
  // so the join attempt still counts against the brute-force throttle)
  if (data == null) {
    throw new Error('That code didn’t work — double-check it with your person.');
  }
  return data as string; // couple_id
}
