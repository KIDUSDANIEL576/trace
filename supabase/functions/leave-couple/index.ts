// leave-couple — unpair without deleting your account (wrong code, breakup).
// Removes the caller's membership; if they were the last member, the couple
// and all its canvases/strokes/marks (FK cascade) plus storage objects go too.
// Deploy with: supabase functions deploy leave-couple

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
    if (!member) return json({ error: 'not in a couple' }, 404);

    await admin.from('members').delete().eq('couple_id', member.couple_id).eq('user_id', user.id);

    const { data: remaining } = await admin
      .from('members')
      .select('user_id')
      .eq('couple_id', member.couple_id)
      .limit(1);

    if (!remaining?.length) {
      for (const bucket of ['photos', 'widgets']) {
        await purgeFolder(admin, bucket, member.couple_id);
      }
      await admin.from('couples').delete().eq('id', member.couple_id);
    }

    return json({ left: true, coupleDeleted: !remaining?.length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown' }, 500);
  }
});

// Deletes every object under `${folder}/` in a bucket, paging past the 1000-row
// list cap — a premium couple can have >1000 photos, and orphaned objects in a
// private bucket are unreachable forever once the couple row is gone.
async function purgeFolder(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  folder: string
): Promise<void> {
  const PAGE = 1000;
  for (;;) {
    const { data: objects } = await admin.storage
      .from(bucket)
      .list(folder, { limit: PAGE });
    if (!objects?.length) break;
    await admin.storage.from(bucket).remove(objects.map((o) => `${folder}/${o.name}`));
    if (objects.length < PAGE) break;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
