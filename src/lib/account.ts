import { EDGE_FUNCTIONS } from '@/lib/backend';
import { supabase } from '@/lib/supabase';

/**
 * Permanently deletes the caller's account server-side (App Store 5.1.1(v)).
 * If they are the couple's last member, the couple and all its canvases,
 * strokes, and photos go with it; otherwise the shared canvas stays with the
 * remaining partner. Resolves true on success (caller then signs out locally).
 */
export async function deleteAccount(): Promise<boolean> {
  const { error } = await supabase.functions.invoke(EDGE_FUNCTIONS.deleteAccount, { body: {} });
  if (error) return false;
  await supabase.auth.signOut().catch(() => {});
  return true;
}
