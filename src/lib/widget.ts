import { setWidgetSnapshot } from '../../modules/widget-bridge';
import { BUCKETS } from '@/lib/backend';
import { supabase } from '@/lib/supabase';

const SIGNED_URL_TTL_S = 604800; // 7 days; refreshed on every app open

/**
 * Signs a fresh URL for the couple's snapshot PNG and hands it to the native
 * widgets (which reload immediately). No-op where the bridge is absent
 * (Expo Go) or the snapshot doesn't exist yet.
 */
export async function refreshWidget(coupleId: string): Promise<void> {
  try {
    const { data } = await supabase.storage
      .from(BUCKETS.widgets)
      .createSignedUrl(`${coupleId}/snapshot.png`, SIGNED_URL_TTL_S);
    if (data?.signedUrl) setWidgetSnapshot(data.signedUrl);
  } catch {
    // widgets are best-effort — drawing must never depend on them
  }
}
