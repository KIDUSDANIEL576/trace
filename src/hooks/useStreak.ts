import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { TABLES } from '@/lib/backend';
import { computeStreak } from '@/lib/streak';
import { supabase } from '@/lib/supabase';

/** Fetches the couple's daily marks and computes the streak (see lib/streak). */
export function useStreak(coupleId: string) {
  const [streak, setStreak] = useState(0);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from(TABLES.dailyMarks)
      .select('day, user_id')
      .eq('couple_id', coupleId);
    if (data) setStreak(computeStreak(data));
  }, [coupleId]);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { streak, refresh };
}
