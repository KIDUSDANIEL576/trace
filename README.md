# trace

**"Leave me a trace."** A couples app where whatever one partner draws appears on the
other's phone in real time. Two people, one canvas, forever.

This is the **Phase 1 + Phase 2** build from [CLAUDE.md](./CLAUDE.md): live shared canvas,
stroke streaming over Supabase Realtime Broadcast, presence, persistence, throttled partner
push — plus draw-on-photos (private Storage bucket), Relationship Replay (scrub through
your history stroke by stroke), and the Daily Love Streak.

## Stack

- **Expo SDK 52** (React Native, TypeScript, expo-router)
- **@shopify/react-native-skia** — 60fps stroke rendering
- **Supabase** — email-OTP auth, Postgres + RLS, Realtime Broadcast + Presence
- **expo-notifications** + a `notify-partner` edge function

## Setup

### 1. Supabase — ALREADY DEPLOYED ✅

The backend is **live** in the DigiRaftHub Supabase project
(`hnjjxvhutpgcdwyzmito`, eu-central-1), co-tenanting with AICOS because the
free tier caps active projects at two. Everything is namespaced and additive:

- Tables: `trace_couples`, `trace_members`, `trace_canvases`, `trace_strokes`,
  `trace_daily_marks`, `trace_push_tokens`, `trace_push_log` — all RLS-locked
  to couple membership
- RPCs: `trace_create_couple`, `trace_join_couple`
- Edge function: `trace-notify-partner` (throttled partner push; `kind: 'photo'` varies the copy)
- Private realtime channels on topics `trace:couple:{id}`
- Storage: private `trace-photos` bucket (10MB/object, couple-scoped RLS via
  `{couple_id}/…` paths, signed URLs) — dedicated-project version is `photos` in
  `supabase/migrations/20260718000001_phase2_photos.sql`
- Widget snapshot pipeline (Phase 3 backbone): `trace-render-snapshot` edge
  function re-renders the couple's latest-drawn canvas server-side (same
  midpoint smoothing + brush styles) to `trace-widgets/{couple_id}/snapshot.png`
  on every stroke end / undo / clear. Bucket is private; members read via
  signed URLs. Dedicated versions: `render-snapshot` fn + `widgets` bucket
  (`supabase/migrations/20260718000002_phase3_widget_snapshots.sql`).
  **E2E verified 2026-07-18** in-infra via pg_net: render 200 in 2.4s cold,
  116KB valid PNG, anon caller rejected 401. The `trace-e2e-render-test`
  function is a retired stub — safe to delete.

`.env` in this repo already points at it — the app works out of the box.
The names live in one file: `src/lib/backend.ts`.

**To move to a dedicated project later** (recommended once a free slot or Pro
plan exists): create the project, run
`supabase/migrations/20260716000001_init.sql` there (it's the un-prefixed
dedicated-project version), strip the prefixes in `src/lib/backend.ts`
(+ `notify-partner` function name), and point `.env` at the new project.

**One manual dashboard step for sign-in codes:** the app asks users for a
6-digit code, so the email must contain one. In the dashboard →
Authentication → Email Templates → **Magic Link**, make the body include
`{{ .Token }}` (e.g. `<h2>Your trace code: {{ .Token }}</h2>`). Takes one
minute; without it users receive a link instead of a code.

Heads-up: Supabase's built-in email service is rate-limited (~2 OTP emails per
hour). Fine for the first two-phone test; configure custom SMTP in the
dashboard before inviting more testers.

**E2E verified 2026-07-16** from inside Supabase infra (two live clients on
the private channel): stroke:start 153ms, stroke:points 152ms (5/5 points),
stroke:end 15ms — all under the 300ms bar. RLS verified: an outsider account
sees zero rows and gets "Unauthorized" joining the couple channel. The
temporary `trace-e2e-test` edge function is a retired stub — safe to delete.

### 2. App

```bash
npm install
cp .env.example .env   # pre-filled with the live backend values
npx expo start
```

Icons regenerate deterministically if ever needed: `pip install pillow && python3 tools/make_icons.py`.

Skia works in Expo Go for quick canvas iteration. **Remote push needs a dev build**
(`npx expo run:ios` / `run:android`, or EAS) — drawing works fine without it.

### 3. The Phase 1 success criterion

Two phones, same couple: one draws → the other sees strokes appear live in **<300ms**.

1. Phone A: sign in → *Create our canvas* → gets a 6-char code.
2. Phone B: sign in → *Join your person* with the code.
3. Draw. Watch the other screen.

## How the realtime protocol works

Channel per couple (`trace:couple:{couple_id}`, private — locked to members via RLS
on `realtime.messages`):

| event | payload | when |
|---|---|---|
| `stroke:start` | `{strokeId, authorId, brush, color, width}` | finger down |
| `stroke:points` | `{strokeId, pts: [[x,y],…]}` | batched every ~50ms while drawing |
| `stroke:end` | `{strokeId, dbId}` | finger up, after the row persists |
| `stroke:undo` / `canvas:clear` | | mirrored edits |

Presence on the same channel drives the *"…is drawing"* pill. Points are normalized
0..1 so both phones render identically. Completed strokes land append-only in
the strokes table — that table **is** Relationship Replay (Phase 2).

## Project layout

```
app/            expo-router screens (sign-in → verify → pair → canvas)
src/hooks/      useAuth, useCouple, useSharedCanvas (the realtime core)
src/components/ CanvasBoard (Skia + gestures), StrokeRenderer, Toolbar, PresencePill
src/lib/        supabase client, backend names, brushes, notifications
src/theme/      design tokens from the approved prototype
supabase/       schema + RLS migration, notify-partner edge function
```

## The widgets (Phase 3)

Both widgets display the server-rendered snapshot PNG and reload the moment the
app hands them a fresh signed URL (on app open and ~5s after every stroke), with
15–30 min polling as a safety net.

- **iOS**: WidgetKit target in `targets/widget/` (via `@bacons/apple-targets`),
  small/medium/large + lock-screen rectangular. Shares data through the
  `group.com.digirafthub.trace` app group.
- **Android**: home-screen widget inside the local `modules/widget-bridge`
  Expo module (classic `AppWidgetProvider` + RemoteViews — chosen over Glance
  for build simplicity; swap later if Glance interactivity is ever needed).
- `modules/widget-bridge` is the tiny native bridge (`setSnapshot(url)`) the
  app calls from `src/lib/widget.ts`. It no-ops in Expo Go.

**Widgets require a native build** (they cannot run in Expo Go):

```bash
# one-time: set your Apple Team ID for the widget extension signing
#   app.json → "ios": { "appleTeamId": "XXXXXXXXXX" }
npx expo prebuild --clean
npx expo run:ios      # or: eas build -p ios
npx expo run:android  # or: eas build -p android
```

Then long-press the home screen → add the **Trace** widget. Caveat: the signed
snapshot URL lives 7 days; opening the app refreshes it, so a widget only goes
stale if the app hasn't been opened in a week.

## Trace Forever (Phase 4)

**$29.99 one-time · one purchase unlocks both partners.** Free tier: shared
canvas, marker + chalk, one photo canvas/day, last-20-strokes replay, widget.
Forever: all brushes (glow, neon, **invisible ink** — vanishes when it lands,
"hold to reveal" to see it), unlimited photos, full replay.

How it works: the app runs the store purchase via `react-native-purchases`
(app user id = Supabase user id); RevenueCat calls the
`trace-revenuecat-webhook` edge function, which flips `premium` on the buyer's
**couple** — so the partner unlocks automatically. The photo/day limit is also
enforced server-side by a DB trigger, and `premium` is only writable by the
webhook (service role).

To go live (all in dashboards, no code):
1. Create the products in App Store Connect / Play Console and a RevenueCat
   project with a `trace_forever` entitlement + default offering.
2. Put the RevenueCat public SDK keys in `.env`
   (`EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `..._ANDROID_KEY`).
3. Add the webhook in RevenueCat → Integrations, pointing at
   `/functions/v1/trace-revenuecat-webhook`, with an Authorization header
   `Bearer <secret>`; store the same secret as the `REVENUECAT_WEBHOOK_SECRET`
   function secret in Supabase. (Until set, the webhook answers 503 —
   verified: it fails closed.)

## What's deliberately not here

Push-triggered instant widget reload on the *partner's* phone (their widget
updates on next poll/app-open; needs a notification service extension) and
everything in the Non-goals list. See CLAUDE.md — Ponytail discipline applies.
