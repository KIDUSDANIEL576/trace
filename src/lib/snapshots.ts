import { EDGE_FUNCTIONS } from '@/lib/backend';
import { supabase } from '@/lib/supabase';

/**
 * Fire-and-forget: asks the edge function to re-render the couple's latest
 * canvas to the widgets bucket PNG (what the home-screen widgets display).
 */
export function requestSnapshot(coupleId: string): void {
  supabase.functions.invoke(EDGE_FUNCTIONS.renderSnapshot, { body: { coupleId } }).catch(() => {});
}
