# Trace — Product Requirements: the real-time app

**Version 1.0 · August 2026 · Status: build-ready**
Source of truth for the production build. Derived from the 10-turn design (98 frames), the working 57-feature web prototype, and the proven sync protocol in `src/app-sync.js`. The prototype at `site/app.html` is the behavioral reference: where this document and the prototype disagree, the prototype's *feel* wins and this document gets fixed.

---

## 1. What Trace is

One canvas shared by exactly two people. Whatever one of you draws appears on the other's phone — stroke by stroke, live, in under 300 ms. It is not a messaging app (messaging is information arriving; this is a person being there), not a social network (maximum audience: one), and not a memory box (those are for after; this is for during).

**North-star moment:** you are watching the line appear while their finger is still moving. Every architectural decision below serves that moment.

**Non-goals for v1:** group canvases, public profiles, feeds, AI-generated content of any kind, Android widgets (v1.1), stylus pressure (v1.1).

## 2. Users & the one metric

- **Primary:** couples, together or long-distance, 16–35, iOS-first. One partner installs first in ~90% of cases (category data: Noteit, Widgetable) — the pairing flow is really an *invitation* flow.
- **Metric that matters:** weeks in which **both** partners made ≥1 mark ("both-hands weeks"). Not DAU, not session length. Guardrail metrics may never be traded against it (§9).

## 3. Platform architecture

| Layer | Choice | Why |
|---|---|---|
| Client | React Native (existing `trace` repo) + **@shopify/react-native-skia** for the canvas | 120 fps ink, path effects for brushes, runs the same stroke model as the prototype |
| Realtime | **Supabase Realtime broadcast channels** (project `doadibyqqdimzzywcglv`, eu-central-1) | Proven in prototype; phoenix protocol, no custom server for v1 |
| Persistence | Supabase Postgres + RLS by `couple_id` | strokes, capsules, days, dictionary |
| Auth | Supabase anonymous auth upgraded to Apple/email at pairing | zero-friction first draw |
| Push | APNs via edge function | governed by §9 — a push is only ever a person |
| Widget | iOS WidgetKit + App Group; snapshot PNG written by the app, timeline reload on push | "its widget is its display" (frame 1o) |

### 3.1 Data model (Postgres)

```
couples(id, created_at, sky, sky_strength, thread_started_at, closed_at)
members(couple_id, user_id, name, color, tz, joined_at)          -- max 2, enforced
strokes(id, couple_id, page us|mine|hers, author, brush, color,
        width, alpha, taper, pts jsonb /*normalized [x,y,dt]*/, created_at)
capsules(id, couple_id, sealed_by, opens_at, strokes jsonb, opened_at)
days(couple_id, date, label, banner_strokes jsonb, settings jsonb)
dictionary(id, couple_id, strokes jsonb, meaning, use_count)
line_strokes(id, couple_id unique_per_day, pts jsonb, created_at)  -- The Line, 6d
donated_signs(id, shape_hash, count)                                -- counts only, never ink (6a)
```
RLS: every table row is readable/writable only by the two `members` of its `couple_id`. `donated_signs` stores aggregates only — **a stroke never leaves its couple** except through the explicit donation flow.

### 3.2 Wire protocol (proven, ship as-is)

Channel `trace:<couple_id>`, broadcast, `self: false`. Events exactly as the prototype ships them:

| event | payload | timing |
|---|---|---|
| `hi` | `{name, reply?}` | on join + every 4 s; partner considered live within a 9 s window |
| `sb` | `{id, c, w, alpha, taper, brush, mirror}` | stroke begin, on touch-down |
| `sp` | `{id, pts:[[x,y]…]}` normalized 0–1 | batched every **80 ms** while drawing |
| `se` | `{id}` | touch-up; receiver commits stroke to DB shadow |
| `heart` | `{}` | eruption when both sides fire within **3 s** |
| `clear` `sky` `tug` `note` | as prototype | |

Latency budget for the north-star moment: touch→broadcast ≤ 20 ms, transit p50 ≤ 120 ms (eu-central relay), receive→pixel ≤ 30 ms. **p50 ≤ 170 ms, p95 ≤ 300 ms.** Offline: strokes queue locally, flush on reconnect with original timestamps; replay order is by client timestamp with server tiebreak.

## 4. The ink (v1 must feel finished, not immature)

- **Brush engine:** seven brushes (pen, sparkles, zap, marker, highlighter, invisible, eraser), each with user-set **size 3–26** (plus fine/med/bold one-tap presets), **ink opacity 20–100%**, **taper on/off** — the options popover ships exactly as prototyped (tap the active tool again). Settings persist per brush and travel with each stroke so both phones render identically.
- **Color: the universal cascade.** Five anchor swatches (the system accents) plus an any-color picker: hue slider (0–360) → an 8×4 saturation×lightness cascade + an 8-step grey ramp → hex entry for precision. Eight recent colors persist per device and one tap re-arms them. **The rule: color is identity, so it must be unlimited** — her teal is not your teal. Stroke color travels with the stroke; no palette negotiation between devices, ever.
- **Pressure is real.** Apple Pencil / S-Pen pressure (PointerEvents / UIKit force) modulates width **on top of** the velocity taper: `w = base × pressure × velocityTaper × endTaper`, pressure clamped to [.15, 1] and normalized ×1.5 so a light hand still leaves ink. Finger and mouse report 1 — nothing changes for them. Pressure ships per point on the wire (see §3 point format `[x, y, p]`, `p` omitted when 1) so the partner's device renders your hand, not a reconstruction.
- **Taper is the signature:** velocity-thinned width with breathing ends (prototype algorithm). In Skia: `Path` with per-segment stroke width or a filled variable-width outline — must match the prototype's look A/B side-by-side.
- **Invisible ink:** renders then decays over 2.6 s; hold-to-reveal shows it at 95% while pressed. Decay is client-side; stored strokes keep the flag.
- 60 fps minimum while the partner's stroke is animating in; 120 on ProMotion.
- Two-finger swipe back = undo own last stroke (synced as a retraction event, v1).

## 5. Feature scope

**v1 — ships in the first build (all prototyped, acceptance = matches prototype):**
Pairing by 5-char code (+ QR) · live shared canvas with presence pill & ghost finger · heartbeat with 3 s eruption window · brush engine (§4) · skies & strength, synced · draw on a photo · widget (§6) · replay · While You Slept (her speed, pauses kept) · time capsules · The Thread (§9 rules) · the ⋯ sheet with search · us/my page/Sara pages · gesture onboarding · Close the Door.

**v1.1 — fast follows:** mirror, trace-over, pass-the-pen, scratch-off arrival · Touching + Hold + Both Here (needs presence-grade sampling at 20 Hz) · the calendar ("the days", Something to Say with hold-until-her-morning) · dictionary + quick marks + hard-day marks · One Year Ago Tonight · Android + widget.

**v2:** games (eyes shut with haptic playback, hot & cold, the string, blind portrait, palm to palm) · warm spots · The Line & donated signs (aggregate infra) · riso print fulfillment · sticker sheets/iMessage pack.

Each feature's detailed behavior — copy, timings, empty states — **is the prototype implementation**; PMs write deltas against it, not fresh specs.

## 6. The widget is the display

- Opens to the home screen mental model: the drawing lands where they already look. WidgetKit medium (2×1) renders the latest canvas snapshot with "trace · n min ago"; small variant shows the last mark only.
- The app writes a snapshot PNG + timestamp to the App Group on every stroke commit and requests `WidgetCenter.reloadTimelines`; silent push nudges a reload when the partner draws (subject to §9 — the widget updating is *not* a notification).
- Tap → straight into the canvas, no splash.

## 7. Subscription

Per §plan.html (ships as designed): Free = the whole core promise; **Plus $4.99/mo · $29.99/yr per couple** (one sub covers both phones — the app never asks the second phone for money); **Forever $79.99** lifetime, early Forever buyers grandfathered. Paywall placement rules are §9 items, not growth levers: seeing what your person drew is never paywalled, The Thread is not for sale.

## 8. Milestones

| M | Deliverable | Exit test |
|---|---|---|
| **M0** (wk 1–2) | RN shell, Skia canvas, brush engine parity | side-by-side ink A/B vs prototype passes design review |
| **M1** (wk 3–4) | pairing + live sync + presence + heartbeat | two phones, p95 < 300 ms on LTE; eruption works |
| **M2** (wk 5–6) | widget, skies, photo canvas, replay, persistence | kill app, reopen: every stroke back; widget < 60 s stale |
| **M3** (wk 7–8) | While You Slept, capsules, Thread, onboarding, Close the Door | 9f audit: zero guilt surfaces; TestFlight to 20 couples |
| **M4** (wk 9–10) | subscription, App Store assets (from the kit), v1.1 branch | submission |

## 9. Guardrails (product law, from frame 9f)

1. Seeing what your person drew is **never** behind the paywall — not blurred, not delayed.
2. The Thread goes thin, never breaks. No resets, no freezes to buy. Not for sale.
3. No "you haven't drawn in 3 days." We never guilt one person about the other.
4. Presence is now-only: you can see they're here; you can never audit whether they looked.
5. No scores, leagues, or "relationship health." Two people are not a dashboard.
6. Every push notification originates from a partner action. The app never speaks for itself.
7. Close the Door: one tap, archives everything, free export, no confirmation shaming, no win-back.
8. A stroke never leaves its couple except by explicit, reversible donation. Aggregates only.
9. **If a feature works only because leaving hurts, it doesn't ship.**

## 10. Open questions

- Undo semantics when both drew since (v1: retract own stroke only, tombstone in log).
- E2E encryption of stroke payloads (v1.1 target; realtime broadcast supports opaque payloads today).
- Live Activities / Dynamic Island for Both Here (category is moving there in 2026 — spike in v1.1).
