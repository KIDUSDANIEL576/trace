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

## P0 — blocks the App Store build

1. **Permission priming.** The design has zero frames for the notification
   permission ask. iOS gives you *one* system prompt; every leader primes it
   ("her drawings will land here — allow?") at the first moment of received
   value, never at launch. Same for photo library (draw-on-photo) and — if day
   map ships — motion. *Needs 3 primer frames.*
2. **Notification taxonomy.** "No notification, it's just there" is the widget
   law (1o) — but the flare **must** ring, "leaving now" **should** banner, and
   goodnight is a choice. Missing: the matrix of which events notify, banner,
   or stay widget-only, and its settings surface. 21c's priority order is the
   right skeleton; it needs a "how loud" column.
3. **Account & restore.** Pairing is the front door, but there is no identity
   behind it: new phone = everything gone, including the pairing itself.
   Minimum viable: iCloud/Google keychain restore of the pair token + board.
   The guardrail ("drawings never sync raw") shapes *what* restores, not
   whether restore exists.

## P1 — blocks feeling real

4. **The unpair flow.** The hardest screen in a couples app and no one draws
   it. What happens to shared history on breakup? Recommendation, consistent
   with the guardrails: either side can unpair instantly (no consent
   theatre), the canvas freezes into a read-only final chapter on *both*
   devices, the pocket self-destructs, and re-pairing with someone new starts
   at chapter 1. Needs design; the wrong version of this screen is a
   one-star review generator.
5. **Widget add-tutorial.** Still the Locket lesson (first audit, unresolved):
   after the first *received* drawing, a one-time jiggle-mode walkthrough.
   Never repeats after success.
6. **Loading & failure states.** Join-channel spinner, partner-code-not-found
   (vs. malformed, now handled), "she hasn't opened it yet" empty state on
   the directory counts, image-slot upload failure. Each is one frame.
7. **Accessibility.** Icon-only buttons need labels (VoiceOver/TalkBack);
   Dynamic Type will break the 390-fixed layout; `prefers-reduced-motion`
   should quiet the pulses and the widget rotation. The ink itself is fine —
   it's the chrome that's silent.
8. **Conflict rule.** Offline outbox is in; the missing half is the merge
   law when both sides act on the same thing offline. Ticks: last-write-wins
   is fine. The pocket reveal date and unpair: server-timestamp-wins. One
   paragraph in the PRD, then tests.

## P2 — blocks scale

9. **Time zones.** The two-clocks frame (19e) hardcodes Berlin; pairing
   should exchange TZ and drive "her morning", goodnight windows, While You
   Slept from it.
10. **Localization.** The copy *is* the product ("she can say no with one
    tap"). Ship English first, but keep every string in one table now —
    retrofitting tone is harder than retrofitting strings.
11. **Low-power mode.** Live ink at 20 Hz is a battery cost; under iOS
    Low Power / Android Battery Saver, degrade to stroke-end delivery and
    pause the widget rotation.
12. **Review ask & share.** After a genuinely good moment (first Both Here,
    a sealed capsule opening) — never after an argument-adjacent one (a
    declined ask). One rule: only ever ask on a day both partners drew.

## The one-sentence verdict

The product's emotional surface is now ahead of the category **and** the
status bar finally stopped lying — what's left between this build and a real
launch is permission priming, the notification matrix, restore, and the
unpair flow: four designs, not forty.
