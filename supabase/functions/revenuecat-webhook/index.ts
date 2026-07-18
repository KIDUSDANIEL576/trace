// revenuecat-webhook — grants/revokes Trace Forever for the buyer's couple.
// One partner buys → the whole couple unlocks (spec §Phase 4).
//
// RevenueCat dashboard setup:
//   1. Project → Integrations → Webhooks → add this function's URL
//   2. Set the webhook Authorization header to "Bearer <secret>" and store the
//      same secret as the REVENUECAT_WEBHOOK_SECRET function secret
//   3. App user id must be the Supabase auth user id (Purchases.configure
//      is called with appUserID = user.id in src/lib/purchases.ts)

import { createClient } from 'npm:@supabase/supabase-js@2';

const GRANT_EVENTS = ['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE', 'UNCANCELLATION'];
const REVOKE_EVENTS = ['REFUND'];

Deno.serve(async (req) => {
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!secret) return json({ error: 'webhook not configured' }, 503);
  if (req.headers.get('Authorization') !== `Bearer ${secret}`) {
    return json({ error: 'unauthorized' }, 401);
  }

  const { event } = await req.json().catch(() => ({}));
  if (!event?.type || !event?.app_user_id) return json({ error: 'bad payload' }, 400);

  const grant = GRANT_EVENTS.includes(event.type);
  const revoke = REVOKE_EVENTS.includes(event.type);
  if (!grant && !revoke) return json({ ignored: event.type });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: member } = await admin
    .from('members')
    .select('couple_id')
    .eq('user_id', event.app_user_id)
    .maybeSingle();
  if (!member) return json({ error: 'no couple for user' }, 404);

  const { error } = await admin
    .from('couples')
    .update(grant ? { premium: true, premium_at: new Date().toISOString() } : { premium: false })
    .eq('id', member.couple_id);
  if (error) return json({ error: error.message }, 500);

  return json({ [grant ? 'granted' : 'revoked']: member.couple_id });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
