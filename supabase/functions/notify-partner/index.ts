// notify-partner — sends a push to the caller's partner when a stroke lands.
// Throttled server-side: max 1 push per recipient per 10 minutes (spec §Phase 1.6).
// Deploy with: supabase functions deploy notify-partner

import { createClient } from 'npm:@supabase/supabase-js@2';

const THROTTLE_MINUTES = 10;

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { coupleId, kind } = await req.json().catch(() => ({}));
    if (!coupleId) return json({ error: 'coupleId required' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // caller must be a member; partner is the other member
    const { data: members } = await admin
      .from('members')
      .select('user_id, display_name')
      .eq('couple_id', coupleId);
    const me = members?.find((m) => m.user_id === user.id);
    const partner = members?.find((m) => m.user_id !== user.id);
    if (!me) return json({ error: 'not a member' }, 403);
    if (!partner) return json({ skipped: 'no partner yet' });

    // throttle
    const since = new Date(Date.now() - THROTTLE_MINUTES * 60_000).toISOString();
    const { data: recent } = await admin
      .from('push_log')
      .select('id')
      .eq('couple_id', coupleId)
      .eq('recipient_id', partner.user_id)
      .gte('sent_at', since)
      .limit(1);
    if (recent && recent.length > 0) return json({ skipped: 'throttled' });

    const { data: tokenRow } = await admin
      .from('push_tokens')
      .select('token')
      .eq('user_id', partner.user_id)
      .maybeSingle();
    if (!tokenRow?.token) return json({ skipped: 'partner has no push token' });

    const verb =
      kind === 'photo'
        ? 'shared a photo to draw on 📸'
        : kind === 'pulse'
          ? 'is thinking of you ❤️'
          : kind === 'capsule'
            ? 'sealed a time capsule for you ⏳'
            : 'left you a trace ❤️';
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: tokenRow.token,
        title: 'trace',
        body: `${me.display_name ?? 'Your person'} ${verb}`,
        sound: 'default',
      }),
    });
    if (!res.ok) return json({ error: 'expo push failed' }, 502);

    // Expo answers 200 with a per-message receipt; a rejected push must not
    // consume the throttle, and a dead token should be pruned.
    const receipt = await res.json().catch(() => null);
    const ticket = Array.isArray(receipt?.data) ? receipt.data[0] : receipt?.data;
    if (ticket?.status === 'error') {
      if (ticket.details?.error === 'DeviceNotRegistered') {
        await admin.from('push_tokens').delete().eq('user_id', partner.user_id);
      }
      return json({ skipped: 'push rejected', detail: ticket.details?.error ?? 'unknown' });
    }

    await admin
      .from('push_log')
      .insert({ couple_id: coupleId, recipient_id: partner.user_id });

    return json({ sent: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
