# Next build: the board → widget system (awaiting design)

Captured from the product owner, August 2026, ahead of the next Claude Design drop.
**Do not invent UI for this — build it exactly as the incoming design draws it.**

## The model
- Each partner has a **board** they update in their app: drawings, todo lists,
  calendar dates, notices, must-do items, "thinking of you" states.
- Everything updated on my board appears on **her widget**, and vice versa.
  The widget is the other person's window into your board.
- The widget is a **sliding deck**, not a single card: it rotates through
  one-time traces of drawings, todo lists, notices, presence states
  ("she's drawing", "she's thinking of you"), calendar items — whatever the
  design says is displayable.
- Everything already built (live ink, heartbeat, presence, pairing, capsules,
  calendar, all 59 features) remains; this layers on top.

## Ready-made plumbing (no design dependency)
- Sync bus: add event types over the existing channel — `board` with
  `{kind: 'todo'|'notice'|'thinking'|'calendar'|'trace-once'|…, payload, ts}`.
  Same 80ms/9s/broadcast semantics as the proven protocol.
- Widget engine: `paintWidget` generalizes to a card renderer +
  rotation timer; per-kind renderers get skinned from the design frames.
- One-time cards ("one time traces"): render-once flag, cleared after first
  display on the partner's side, synced as consumed.

## Intake, when the design is ready
Same path as last time: upload the `.dc.html` (or the bundled standalone
`.html`) into the chat → it lands in `/mnt/attach` or the uploads dir →
drop over `project/Trace Social.dc.html` (or alongside as a new file) →
`node build.mjs` absorbs new turns automatically → chrome/features get
rebuilt to the frames, property-for-property, like the 3a/1a/1o pass.
