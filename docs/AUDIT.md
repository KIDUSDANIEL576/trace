# Trace — pattern audit & product recommendations

**August 2026.** Benchmarked against the category leaders' shipped flows (Noteit, Locket, Widgetable, Paired, Pookie) and the current build (`site/app.html`, 59 features). Mobbin's screen library was requested but its MCP is plan-gated on this account; sources are the apps' own documented flows and store listings instead.

Grading the build by the six things that decide whether this category of app lives or dies:

---

## 1. Pairing is the product's front door — ours is feature #28 · **P0**

**Pattern:** Noteit's entire onboarding *is* the link code. Account → "share your link code" → "already have your partner's code?" → linked. Nothing else happens until pairing is settled, because an unpaired couples app is an empty room. Locket does the same with invites before anything else.

**Our build:** pairing works beautifully — but it lives inside the ⋯ sheet as "Pair — the real thing," item 28 of 59. A new user draws with simulated Sara for days before discovering the actual product.

**Fix (implemented):** first-launch onboarding: name → your code with a share button + "have theirs?" field → connect, or explicitly "try it alone first" (Sara stands in, labeled as such). Pairing state shows on the canvas header from then on.

## 2. One sheet with 59 items is a filing cabinet, not an app · **P0**

**Pattern:** every leader ships 4–6 primary surfaces and buries the rest. Discovery is contextual: the right feature appears at the right moment (Locket surfaces the widget prompt right after your first photo, not in a menu).

**Our build:** everything is equally findable, which means nothing is. Search helps power users; day-two users see a wall.

**Fix (implemented):** a "**right now**" group at the top of the sheet — three time-and-state-aware suggestions (morning → While You Slept; evening → Both Here / today's prompt; unpaired → Pair; after her drawing arrives → reply ideas). The full list stays underneath.
**Fix (recommended, v1):** promote four features out of the sheet entirely — long-press canvas = quick marks; swipe up on canvas = composer; the calendar gets a header slot on marked days.

## 3. The arrival moment is under-celebrated · **P1**

**Pattern:** Locket's whole retention engine is the *arrival* — the widget changes and that's a dopamine event. Noteit's notes "land" on the home screen. The moment content arrives from your person is the product's heartbeat, and leaders spend real design budget on it.

**Our build:** her stroke draws in live (excellent, better than the category) — but arrivals while you're away are silent: you open the app and the ink is just… there. No "what changed since you left."

**Fix (recommended):** an arrival state on open — the canvas replays what landed while you were gone (we already have While You Slept; generalize it to "since you left" for gaps > 1h), and the widget caption should say "Sara, 4 min ago", not just "trace".
**Fix (recommended):** tap-and-hold her stroke → a small reaction bloom at that exact spot, synced. Cheaper than a message, warmer than a like.

## 4. The streak pill fights our own guardrails · **P1**

**Pattern:** the category is drowning in flame-streaks; Paired's own reviews complain about streak anxiety. Our 9f guardrail — "the thread goes thin, never breaks" — is the differentiator, and the PRD codifies it.

**Our build:** the header still wears a gold `128` flame pill (faithful to frame 1a, but 1a predates turn 9's thinking).

**Fix (implemented, gently):** the pill now opens The Thread, and its count is *days of you two, total* — not a breakable run. Copy inside says so.
**Decision for you:** whether to remove the flame glyph entirely in v1. Design says yes (9d has "NO FLAME"); the mockup 1a says no. I lean 9d.

## 5. Widget activation needs its Locket moment · **P1 (production)**

**Pattern:** Locket prompts "put us on your home screen" with a jiggle-mode tutorial immediately after first content, because a widget app without the widget installed is dead. Their onboarding is famously pushy about it — because it works.

**Our build:** the sim opens *on* the widget (right instinct — "its widget is its display"). In production this becomes: after the first received drawing, a one-time WidgetKit add-tutorial sheet. Never again after success (avoid Locket's "pushy" reviews).

## 6. Monetization surfaces don't exist in-app yet · **P2**

**Pattern:** Noteit charges ~$6/yr almost invisibly; Widgetable gates cosmetic depth; Paired paywalls content hard (and reads as needy). The genre-correct move is ours by design: gate *depth* (all skies, all brushes, full history), never the person.

**Our build:** plan.html exists; the app never mentions it.

**Fix (recommended, v1):** two quiet surfaces only — a lock chip on premium skies/brushes opening the couple-paywall ("one sub covers both of you"), and history beyond 7 days. No launch-blocking modal, no countdown timers, ever (9f).

---

## Scorecard

| Dimension | Category best | Us, before | Us, after this pass |
|---|---|---|---|
| Pairing prominence | Noteit: is the onboarding | buried at #28 | first-launch flow ✓ |
| IA / discovery | 4–6 surfaces, contextual | 59-item sheet | "right now" contextual row ✓ |
| Arrival moment | Locket: the whole product | live-draw ✓, silent backlog | backlog replay recommended |
| Streak ethics | nobody (open lane) | flame pill | thread-linked pill ✓, flame decision open |
| Widget activation | Locket: aggressive tutorial | sim-native | PRD'd for production |
| Paywall placement | Noteit: invisible | absent | spec'd, quiet surfaces |
| Live ink quality | none have it | tapered, smoothed, synced | — our moat, protect it |

**The one-sentence verdict:** the product's engine (live ink between two phones) is ahead of the category; the *packaging* (front door, discovery, arrival ritual) was behind it — this pass closes the two P0s, and the P1s are specced above.

## Sources
- [Noteit partner-code flow](https://mrhack.io/how-to-add-partner-in-noteit-widget-app/) · [Noteit on the App Store](https://apps.apple.com/us/app/noteit-bff-widget/id1570369625) · [What is Noteit](https://screenrant.com/what-is-noteit-app-how-use-explained/)
- [Locket widget add-tutorial](https://help.locketcamera.com/en/articles/7914857-how-do-i-add-the-widget) · [Locket on the App Store](https://apps.apple.com/us/app/locket-widget/id1600525061) · [The Widget Effect](https://neoads.substack.com/p/the-widget-effect) · [Locket honest review (onboarding "pushy")](https://www.lemon8-app.com/@ecochamberxyz/7442040397092192823?region=us)
- [Couple widget category overview](https://www.iscreenapp.com/blog/couple-widget-app-iphone) · [couple-joy widget setup flow](https://www.lazyweb.com/canvas/flows/couple-joy/set-up-widgets)
