# Trace — flow audit: what real apps have that the design never drew

**August 2026, second audit.** The first audit (AUDIT.md) judged the product
patterns — pairing, discovery, arrival, streaks. This one judges the *plumbing
flows*: the unglamorous screens every shipped app has and every design file
forgets. Benchmarked against what iOS/Android actually require and what
Noteit/Locket/Paired actually ship.

Grade per flow: **built this pass ✓** · **P0** blocks App Store · **P1** blocks
feeling real · **P2** blocks scale.

---

## Built this pass ✓

| Flow | What shipped |
|---|---|
| **Real status bar** | Proper glyphs: 4-bar cellular (4th dimmed), true wifi arcs, battery pill with nub. Battery reads the **Battery API** (level + charging, amber under 20%); wifi slashes on real connectivity loss. |
| **Offline / reconnect** | Losing the network toasts *"offline — your marks will wait, nothing is lost"*, presence dot goes amber, wifi slashes. Reconnect toasts and nudges presence. Transport already self-heals (1.8 s backoff). |
| **Offline outbox** | Board changes made offline **queue in order** (persisted, capped 60) and flush the moment the channel returns — a tick made in airplane mode still lands on her widget. Toast: *"2 changes from while you were away — delivered."* |
| **Wrong-code error state** | Onboarding join field validates (5 chars, a–z 0–9): red border, shake, plain-words toast. No more silent fallback to your own code. |
| **Delete everything** | In Quiet & private next to Export: two-tap in-place confirm (*"Tap again — gone for good, no copy exists anywhere"*), disarms itself after 4 s. GDPR pair to the existing export. |

## P0 — all three designed and built ✓ (`src/flows.js`)

1. **Permission priming ✓.** A primer sheet appears at the first moment of
   received value — her first ink lands, then: *"She just left you something
   / moments like this can land quietly… the only loud thing, ever, is the
   flare"* → **Let them land** (invokes the real Notification API) or *"not
   now — the widget still works."* Asked exactly once; the OS prompt is
   never wasted on launch.
2. **Notification taxonomy ✓.** "How loud" in Quiet & private: six event
   kinds × three levels (Rings / Banner / Widget only). Two locks that ARE
   the product: **the flare can't be turned down** and **list ticks can't be
   turned up**. Traces cap at banner. Quiet hours mute everything but the
   flare — the one promise.
3. **Account & restore ✓.** "Your key": a copyable `trace-xxxxx-…` key that
   re-arms the pairing + board on a new phone (paste → validate → rejoin);
   drawings stay on the phones that drew them, as the guardrail demands.
   Production note in-panel: keychain makes this invisible; the manual key
   is the fallback that always works.

## P1 — four of five built ✓

4. **The unpair flow ✓.** Designed as specced: what-happens table (canvas
   seals read-only · your history stays yours · hers stays hers · **the
   pocket burns, unread, both sides** · widget goes quiet, no last message),
   then a 3-second hold — the same gesture as the flare, because both are
   irreversible. Sealed state: drawing refuses with *"the last chapter keeps
   it"*, the widget shows the sealed card, and *"Start again"* opens chapter
   1 remembering nothing, on purpose.
5. **Widget add-tutorial ✓.** The Locket moment: after the primer is
   settled and the next received ink — three jiggle-mode steps, *"Done —
   it's there"* never asks again; *"later"* re-asks exactly once.
6. **Loading & failure states ✓ (first pass).** Onboarding connect shows
   *"reaching for them…"*, and 8 s of silence gets *"nobody's holding that
   code yet — it waits with you."* Malformed codes shake (previous pass).
   Remaining: image-slot upload failure frame.
7. **Accessibility ✓ (first pass).** Every icon-only button now carries an
   aria-label; `prefers-reduced-motion` quiets every pulse, beat and drift.
   Remaining: Dynamic Type layout audit — real device work.
8. **Conflict rule ✓.** Board events carry timestamps; the receive side is
   last-write-wins per key, so a stale offline echo can no longer undo a
   fresher tick. Pocket/unpair still deserve server-time in production.

## P2 — three of four built ✓

9. **Time zones ✓.** The pairing handshake now carries each side's IANA
   timezone; the presence panel shows *"Where she is, it's 18:22"* from the
   real one. Remaining: drive goodnight windows and While You Slept from it.
10. **Localization — open.** The copy *is* the product; keep every string in
    one table before any second language.
11. **Low-power mode ✓.** Battery ≤20% and not charging: the widget deck
    holds still (says so once, quietly); ink keeps flowing.
12. **Review ask ✓.** Exactly the rule: only ever on a day both partners
    drew (≥2 hands, ≥6 marks), once, as a quiet toast pointing at settings —
    never a modal, never after an argument-adjacent moment, never again.

## The one-sentence verdict

The four designs are designed — in code, testable, in the prototype's own
language. What's left for launch is platform truth (WidgetKit, keychain,
APNs categories mirroring "How loud") and two open items: localization
strings and the Dynamic Type audit. The hardest screen in the category — the
breakup — now exists, and it is kind.
