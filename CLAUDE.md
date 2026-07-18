# TRACE — Claude Code Build Spec
**"Leave me a trace."** A couples app where whatever one partner draws appears on the other's phone in real time. The home-screen widget IS the product.

---

## How to use this file
1. `mkdir trace && cd trace`
2. Drop this file in as `CLAUDE.md`
3. Run `claude` and say: *"Read CLAUDE.md and build Phase 1 exactly as specified. Follow the CODEGUIDE rules."*

---

## CODEGUIDE (behavioral rules — apply to every task)
1. Think before coding: surface assumptions first, ask if unclear.
2. Simplicity: minimum viable code, no speculative abstractions.
3. Surgical changes: touch only what the task requires.
4. Define verifiable success criteria BEFORE executing; verify before claiming done.
5. DOE: code does math, model does judgment. No LLM calls where logic suffices.

---

## Stack (decided — do not relitigate)
- **Expo SDK 52+ (React Native, TypeScript)** — one codebase, iOS + Android, EAS builds.
- **@shopify/react-native-skia** — canvas rendering (60fps stroke drawing).
- **Supabase** — auth, Postgres, Storage, **Realtime Broadcast** for live stroke streaming.
- **expo-notifications** — push when partner leaves a drawing.
- Widget (Phase 3): iOS WidgetKit via `expo-apple-targets` config plugin; Android Glance widget.

## Design tokens (from approved prototype)
- Background `#0c0b10` · panel `#16151c` · line `rgba(255,255,255,.08)`
- Ink red `#e23343` (signature marker, drawn at 0.74 opacity, multiply blend)
- Glow pink `#ff7a9c` · gold `#f4c66b` · text `#f3f0f4` · muted `#9a93a5`
- Type: UI = Instrument Sans (or system), handwriting moments = Caveat
- Radius 28px on cards/canvas. Dark only. The vibe: an iPhone home screen at dusk.

---

## Data model (Supabase)
```sql
-- couples: exactly two people
create table couples (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,      -- 6-char code partner enters
  created_at timestamptz default now()
);
create table members (
  couple_id uuid references couples(id),
  user_id uuid references auth.users(id),
  display_name text,
  primary key (couple_id, user_id)
);
-- canvases: one active shared canvas per couple + photo canvases
create table canvases (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) not null,
  kind text check (kind in ('shared','photo')) default 'shared',
  photo_url text,                        -- storage path when kind='photo'
  created_at timestamptz default now()
);
-- strokes: append-only history (this IS Relationship Replay)
create table strokes (
  id bigint generated always as identity primary key,
  canvas_id uuid references canvases(id) not null,
  author_id uuid not null,
  brush text not null,                   -- marker|glow|neon|chalk
  color text not null,
  width real not null,
  points jsonb not null,                 -- [[x,y],[x,y],...] normalized 0..1
  created_at timestamptz default now()
);
-- streaks
create table daily_marks (
  couple_id uuid references couples(id),
  day date not null,
  user_id uuid not null,
  primary key (couple_id, day, user_id)
);
```
RLS: every table locked to rows where `couple_id` matches the caller's membership. Write the policies; verify with a second test user.

## Realtime protocol
- Channel per couple: `couple:{couple_id}`
- **Broadcast** (not postgres_changes) for in-flight strokes — lower latency:
  - `stroke:start {strokeId, brush, color, width}`
  - `stroke:points {strokeId, pts:[[x,y]...]}` batched every ~50ms
  - `stroke:end {strokeId}` → then persist full stroke row to `strokes`
- **Presence** on same channel → renders "Kidus is drawing…" pill.
- Points normalized 0..1 so canvases render identically across screen sizes.

---

## Phase 1 — the magic (build this first, nothing else)
Success criteria: two phones, same couple, one draws → other sees strokes appear live in <300ms on the shared canvas.
1. Expo app scaffold, dark theme, tokens above.
2. Auth: Supabase email OTP (magic link). Onboarding: create couple → get invite code → partner joins with code.
3. Shared canvas screen (Skia): 4 brushes (marker/glow/neon/chalk), 5 swatches, clear, undo-own-stroke.
4. Realtime streaming per protocol above + presence pill.
5. Stroke persistence + full canvas rehydration on open.
6. Push notification to partner on `stroke:end` (throttled: max 1 per 10 min).

## Phase 2 — draw on photos + replay
1. Pick/take photo → upload to Storage → new `photo` canvas → partner notified.
2. Relationship Replay: scrub slider that re-renders strokes in order (all data already in `strokes`).
3. Daily Love Streak from `daily_marks`.

## Phase 3 — the living widget (the moat)
1. iOS WidgetKit target: renders latest canvas snapshot PNG (server-side render via edge function on `stroke:end`, saved to Storage; widget refreshes via push).
2. Android Glance widget, same snapshot.
3. Lock screen widget (iOS).

## Phase 4 — monetization
- RevenueCat: **Trace Forever, $29.99 one-time, unlocks for both partners.**
- Free tier: shared canvas + 1 photo/day + widget. Paid: all brushes, unlimited photos, full replay, invisible ink.

---

## Non-goals (do NOT build)
No AI features, no couple pet, no AR, no love weather, no chat, no feed. Five things, polished. Ponytail discipline applies.
