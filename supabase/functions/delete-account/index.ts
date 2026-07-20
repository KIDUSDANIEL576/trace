// delete-account — App Store 5.1.1(v) compliance: full in-app account deletion.
// Removes the caller's membership, their couple (with all canvases/strokes/
// marks via FK cascade + storage objects) when they are the last member,
// and finally the auth user itself.
// Deploy with: supabase functions deploy delete-account

import { createClient } from 'npm:@supabase/supabase-js@2';

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

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: member } = await admin
      .from('members')
      .select('couple_id')
      .eq('user_id', user.id)
      .maybeSingle();

    await admin.from('push_tokens').delete().eq('user_id', user.id);

    if (member) {
      await admin.from('members').delete().eq('couple_id', member.couple_id).eq('user_id', user.id);

      const { data: remaining } = await admin
        .from('members')
        .select('user_id')
        .eq('couple_id', member.couple_id)
        .limit(1);

      if (!remaining?.length) {
        // last one out: remove the couple's storage, then the couple
        // (canvases/strokes/daily_marks/push_log cascade via FK)
        for (const bucket of ['photos', 'widgets']) {
          const { data: objects } = await admin.storage
            .from(bucket)
            .list(member.couple_id, { limit: 1000 });
          if (objects?.length) {
            await admin.storage
              .from(bucket)
              .remove(objects.map((o) => `${member.couple_id}/${o.name}`));
          }
        }
        await admin.from('couples').delete().eq('id', member.couple_id);
      }
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ deleted: true });
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
