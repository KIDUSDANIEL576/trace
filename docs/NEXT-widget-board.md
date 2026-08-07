# The board → widget system — delivered

Captured from the product owner ahead of the Trace Clean drop, built when the
design landed. Kept here as the record of what was asked for versus what the
design drew and the code does.

## The brief, as stated

- Each partner has a **board** they update: drawings, todo lists, calendar
  dates, notices, must-do items, "thinking of you" states.
- Everything on my board appears on **her widget**, and vice versa.
- The widget is a **sliding deck** — one-time traces, todo lists, notices,
  presence states, calendar items.

## What the design drew

Turn 21, three frames — and it matches the brief line for line:

- **21a** your board, six publish switches, "You never see your own widget."
- **21b** her home screen, the deck cycling live trace → must-dos → the week
  → thinking of you.
- **21c** every state, plus the priority rule when they compete.

## What was built

See `docs/CLEAN.md`. In short: `deck()` in `src/rooms.js` builds the cards in
21c's order, `paintWidget()` renders one, board changes ride the ink channel
as a `board` event, and one-time things burn after they show. Verified across
two paired windows.

## Still open

Nothing in the phone build. 25a–25j are in the rooms; see the table in
`docs/CLEAN.md`. What remains is platform work: watches, lock screens,
Android home, the tablet board, and picking one of the five logo directions.
