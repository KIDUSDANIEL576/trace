# SUPABASE_MIGRATION.md — moving to your own Supabase project

## Why this matters more than it looks

Trace currently **co-tenants** someone else's Supabase project
(`hnjjxvhutpgcdwyzmito`, shared with AICOS because the free tier caps you at two
active projects). To avoid collisions, every live object is `trace_`-prefixed:
`trace_couples`, `trace_strokes`, `trace-photos`, `trace-notify-partner`.

Here's the part worth knowing before real users arrive: **the live backend has
no source of truth in git.** Every file in `supabase/migrations/` and
`supabase/functions/` is written against *clean, un-prefixed* names
(`couples`, `photos`, `notify-partner`). The prefixed versions running in
production exist only inside the Supabase dashboard — they were hand-edited
copies. If that project vanished tomorrow, you could rebuild the schema from
this repo, but not the exact live objects.

Moving to a dedicated project doesn't just get you off a shared free tier — it
makes the code in this repo *become* the backend again.

**Time:** about an hour, most of it waiting. **Cost:** free tier works to start;
Pro is $25/mo when you outgrow it.

---

## 1 · Create the project

supabase.com → New project.
- **Region: eu-central-1** (same as today — keeps latency identical for you).
- Save the database password in your password manager; you cannot re-read it.
- Wait for it to finish provisioning (~2 min).

## 2 · Run all 13 migrations, in filename order

**Do not run only `init.sql`.** The README used to say that, and it would
silently leave you without capsules, backgrounds, personal pages, and every
free-tier limit. Dashboard → SQL Editor → paste each file's contents → Run,
in this order:

| # | File | What it adds |
|---|---|---|
| 1 | `20260716000001_init.sql` | The core: couples, members, canvases, strokes, daily_marks, push_tokens, push_log; RLS on all of them; `is_couple_member()`; realtime broadcast policies; `create_couple` / `join_couple` |
| 2 | `20260718000001_phase2_photos.sql` | Private `photos` bucket + per-couple storage policies |
| 3 | `20260718000002_phase3_widget_snapshots.sql` | Private `widgets` bucket (the home-screen snapshot PNG) |
| 4 | `20260718000003_phase4_premium.sql` | `couples.premium`, the `invisible` brush, 1-photo-a-day free limit |
| 5 | `20260718000004_phase4_premium_brush.sql` | Server-side block on glow/neon/invisible for free couples |
| 6 | `20260719000001_revoke_trigger_fn_exec.sql` | Locks the trigger functions away from clients |
| 7 | `20260719000002_perf_rls_initplan.sql` | RLS performance (initplan form) + canvases index |
| 8 | `20260720000001_join_throttle.sql` | 10 join attempts/hour, so invite codes can't be brute-forced |
| 9 | `20260724000001_phase5_capsules.sql` | Time capsules, sealed server-side so even the author can't peek |
| 10 | `20260724000002_canvas_backgrounds.sql` | The sky: `bg_key`, `bg_photo_url`, `bg_opacity` |
| 11 | `20260724000003_capsule_free_tier.sql` | Free tier: 1 open capsule, ≤400-day horizon |
| 12 | `20260724000004_photo_storage_cap.sql` | Per-couple storage ceiling (5,000 files / 10 GiB) |
| 13 | `20260725000001_personal_pages.sql` | my page / their page + the owner-only drawing gate |

You'll know it worked when the Table Editor lists `couples`, `members`,
`canvases`, `strokes`, `capsules`, and friends — with **no `trace_` prefix**.

> On realtime: migration 1 grants broadcast on topics matching `couple:%`.
> That matches the un-prefixed topic the app will use after step 7. If you ever
> keep the `trace:` prefix instead, that policy needs
> `split_part(topic, ':', 3)` rather than `2` — it's the one thing that doesn't
> announce itself when wrong (strokes just stop arriving).

## 3 · Deploy the five edge functions

With the [Supabase CLI](https://supabase.com/docs/guides/local-development):

```bash
supabase link --project-ref <your-new-ref>
supabase functions deploy notify-partner
supabase functions deploy render-snapshot
supabase functions deploy delete-account
supabase functions deploy leave-couple
supabase functions deploy revenuecat-webhook
```

These deploy **exactly as they are in git** — no hand-editing, because the code
already uses un-prefixed names. That's the whole point of the move.

## 4 · Set the secrets

Dashboard → Edge Functions → Secrets (or `supabase secrets set`):

| Secret | Needed for | Notes |
|---|---|---|
| `REVENUECAT_WEBHOOK_SECRET` | purchases | Any long random string; the same value goes in RevenueCat (see `REVENUECAT.md`). The webhook returns 503 until this exists — on purpose. |
| `RESEND_API_KEY` | sign-in emails | Only if you're using custom SMTP (`EMAIL_SETUP.md` Part 2) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
injected automatically — don't set them by hand.

## 5 · Auth: email template + SMTP

Authentication → Emails → **Magic Link** → paste
`supabase/templates/magic-link.html`. It **must** keep `{{ .Token }}` or the
6-digit code never reaches anyone. Then set up Resend SMTP —
[EMAIL_SETUP.md](EMAIL_SETUP.md) Part 2. Without it you get ~2 sign-in emails
per hour, which will ruin the first demo you give to friends.

## 6 · Re-seed the App Review demo account

Apple reviewers can't receive your OTP emails, so the app has a hidden
password path for one address. **Without this, App Review fails and you wait
another week.** SQL Editor:

```sql
-- 1) the reviewer's auth user (password path, no email needed)
select auth.uid();  -- sanity check the editor works

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
  'authenticated', 'review@trace.demo',
  crypt('trace-review-2026!', gen_salt('bf')),
  now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'
) returning id;  -- keep this id

-- 2) a premium couple with a partner, so paid features are reviewable
with c as (
  insert into couples (invite_code, premium, premium_at)
  values ('REVIEW', true, now()) returning id
)
insert into members (couple_id, user_id, display_name)
select c.id, '<the id from step 1>', 'Alex' from c;
```

Then add a partner member (any second auth user, display name `Sam`), a shared
canvas, and one or two strokes so the canvas isn't empty. Verify by signing in
to the app as `review@trace.demo` / `trace-review-2026!`.

## 7 · Flip the app over

One file does the whole mapping — **`src/lib/backend.ts`**. Every hook and
screen already reads through it, so this is the only code that changes:

```ts
export const TABLES = {
  couples: 'couples',
  members: 'members',
  canvases: 'canvases',
  strokes: 'strokes',
  dailyMarks: 'daily_marks',
  pushTokens: 'push_tokens',
  capsules: 'capsules',
  capsuleContents: 'capsule_contents',
} as const;

export const RPCS = {
  createCouple: 'create_couple',
  joinCouple: 'join_couple',
  sealCapsule: 'seal_capsule',
  ensureMyPage: 'ensure_my_page',
} as const;

export const EDGE_FUNCTIONS = {
  notifyPartner: 'notify-partner',
  renderSnapshot: 'render-snapshot',
  deleteAccount: 'delete-account',
  leaveCouple: 'leave-couple',
} as const;

export const BUCKETS = { photos: 'photos', widgets: 'widgets' } as const;

export const coupleChannel = (coupleId: string) => `couple:${coupleId}`;
```

Then repoint the keys in **three** places (missing one is the classic mistake):
1. `.env` — `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`
2. `eas.json` → every build profile's `env` block (cloud builds don't read
   `.env`)
3. RevenueCat's webhook URL, if you've done `REVENUECAT.md` already

## 8 · Verify before you trust it

Run these on two phones, in this order — each one exercises a different layer:

- [ ] Sign in on both (auth + SMTP)
- [ ] Pair with an invite code (RPCs + throttle)
- [ ] Draw → strokes appear live on the other phone (**realtime policies** —
      this is the step that catches a wrong topic prefix)
- [ ] Kill and reopen → the canvas rehydrates (RLS reads)
- [ ] Add a photo canvas (storage + policies + the daily limit)
- [ ] Seal a time capsule (SECURITY DEFINER RPC)
- [ ] Open the app and check a widget snapshot appears (`render-snapshot` +
      the widgets bucket)
- [ ] Delete a throwaway account (service-role purge path)

## 9 · Only then, decommission the old project

Leave the `trace_` objects alone for a week after cutover. If something was
missed, the old project is your rollback: revert `backend.ts` and `.env` and
you're back in business in two minutes. After a week of clean use, drop the
`trace_*` tables and `trace-*` functions/buckets from the shared project.
