# Trace — The "Make It Real" Roadmap

## Context (the honest diagnosis first)

Trace has 20+ commits, four spec phases, five hardening rounds, three themes, and a
stack of crafted moments — and **zero sign-ins. Nobody, including you, has ever drawn
a stroke.** That's the classic vibe-coder trap, and it isn't a talent problem: building
feels like progress and is fully in your control; testing risks disappointment and
requires leaving the editor. So building quietly becomes procrastination.
Every item below exists to break that pattern. The repo is not the product.
**A drawing appearing on your person's phone is the product.**

Order matters — do tiers in sequence. Items marked 🔴 block everything after them.

---

## Tier 0 · The One Thing (today, 15 minutes)

- [ ] 🔴 **Magic Link template**: Supabase dashboard → project `digirafthub-aicos`
      (hnjjxvhutpgcdwyzmito) → Authentication → Email Templates → Magic Link tab →
      paste `<h2>Your Trace code: {{ .Token }}</h2>` into the body → Save.
      *`{{ .Token }}` is a placeholder you type, not a thing you fetch. Free plan is fine.*
- [ ] 🔴 **First stroke**: `git clone` → `npm install` → `cp .env.example .env` →
      `npx expo start` → Expo Go on TWO phones → sign in, pair, draw.
      *Everything else on this list is meaningless until this line is checked.*

## Tier 1 · Prove the magic (this week)

- [ ] **Run TESTING.md top to bottom** (sections 1–3 work in Expo Go). File every
      failure back to me with the step number — that's my work queue.
- [ ] **Watch your partner use it cold.** Say nothing. Write down every hesitation.
      That list outranks any feature idea either of us has.
- [ ] **Custom SMTP** (Resend free tier, ~15 min in Supabase dashboard).
      🔴 before any third person: built-in email caps at **~2 sign-in emails/hour** —
      it WILL eat your first demo to friends.
- [ ] **Fix what device-reality reveals**: font sizes on real pixels, keyboard overlap,
      animation feel (spring/bloom timing), gesture conflicts. These are invisible from
      a container — this is the tuning pass that makes it feel "senior designer".

## Tier 2 · Survive real hands (before inviting anyone)

- [ ] 🔴 **`eas init`** — without it `extra.eas.projectId` is missing from app.json, so
      push-token registration **silently no-ops** even in dev builds. One command; then
      notifications actually work. (Known gap in the current code — by design it fails
      quiet rather than crashing.)
- [ ] **Dev builds on both phones** (`npx expo run:android` free; iOS needs
      `ios.appleTeamId` in app.json + a Mac or EAS). Unlocks: push notifications,
      camera capture, **widgets** — the moat is untestable in Expo Go.
- [ ] **Crash reporting (Sentry via `sentry-expo`)** — currently if it breaks on her
      phone, *nobody ever knows*. This is the #1 thing separating hobby apps from real
      ones. ~30 min, I can wire it when you say go.
- [x] **"Leave couple" flow** — DONE: `trace-leave-couple` edge function (last member
      out takes the couple's data + storage with them) + "Leave this couple…" in the
      settings sheet. Verify on device (TESTING.md §7).
- [x] **Invite-code hardening** — DONE: join attempts throttled to 10/hour/user,
      E2E-verified (10 wrong codes count, the 11th is blocked, valid joins fine).
      Wrong/full codes return null so failed tries always count (a RAISE would have
      rolled the attempt back — caught by the E2E, fixed).

## Tier 3 · Store-ready (when Tier 1–2 feel good)

- [ ] **Apple Developer ($99/yr) + Google Play ($25)** accounts.
- [x] 🔴 **The reviewer-login problem** — DONE: the email `review@trace.demo` takes a
      hidden password path (no OTP). Live demo couple "REVIEW" is premium (so paid
      features are reviewable) with a partner "Sam" and seeded strokes; credentials
      verified end-to-end against live auth. **App Review notes**: sign in with
      `review@trace.demo` / `trace-review-2026!`.
- [ ] **App Store privacy "nutrition labels"** — declare email, photos, purchase state
      (PRIVACY.md already maps 1:1 to the answers).
- [x] **Host the privacy policy at a URL** — DONE: `docs/` is a styled static site
      (landing + privacy policy in Trace's own dusk palette). **To publish:** repo
      Settings → Pages → Source: "Deploy from a branch" → Branch: `main` `/docs` →
      Save. Live in ~1 min at `https://kidusdaniel576.github.io/trace/` (privacy at
      `/trace/privacy.html`). That's your App Store privacy + support URL.
- [x] **Terms of Service** — DONE: `docs/terms.html`, plain-language and matched to
      how the app actually works (one-time purchase, your-content-is-yours, deletion,
      as-is). Linked from the landing footer + privacy page. It's a solid template —
      have a lawyer glance at §5/§7 before you take real money, but it's launch-ready.
- [ ] **Name check**: search both stores for "Trace" collisions *before* you love the
      name more than you already do; grab a domain (gettrace.app style) for the
      support/privacy URLs.
- [ ] **`expo-updates` (OTA)** — after store launch, waiting 24–48h on review for every
      bug fix is deadly; OTA lets JS fixes ship in minutes. Add before submission.
- [ ] **RevenueCat**: products in both stores → `trace_forever` entitlement → SDK keys
      in eas.json → webhook secret in Supabase (fails closed 503 until set — verified).
- [ ] **Store assets**: screenshots (the preview artifact is your template), a 30s
      screen-recording of Replay autoplay — that's the ad.

## Tier 4 · Make it live (post-launch spine)

- [ ] **Dedicated Supabase project** (Pro $25/mo or a freed slot): run the un-prefixed
      migrations in `supabase/migrations/`, strip prefixes in `src/lib/backend.ts`,
      repoint env. Escapes the co-tenant free tier before real users arrive.
- [ ] **Retention truth**: streak + daily prompts + heartbeat pushes are the loop —
      they only function with dev builds + `eas init` done (Tier 2).
- [ ] **Instant partner-widget refresh** (silent push → widget reload) — the one Phase 3
      refinement deliberately deferred; do it when widgets prove they're loved.
- [ ] **Beta circle**: 5–10 couples via TestFlight/Play Internal, one shared group chat
      for feedback, weekly OTA fixes. Ship-watch-cut-sharpen, repeat.

---

## What I can do vs. what only you can do

| Only you (dashboards/devices/money) | Me, on your word |
|---|---|
| Email template, SMTP, `eas init`, builds, store accounts, watching your partner use it | Sentry wiring, leave-couple flow, join throttle, reviewer login mode, Sign in with Apple, expo-updates, any fix TESTING.md surfaces |

## Verification

Tier 0 verifies itself: a stroke you drew appears on the other phone in under a
second. Every later tier's verification is written in TESTING.md §1–6. My work
items get verified the way everything in this repo has been: typecheck + in-infra
E2E against the live backend + your device confirmation.
