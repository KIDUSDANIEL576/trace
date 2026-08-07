# Trace Clean — what shipped, frame by frame

The redesign (Claude Design turns 19–27, 82 frames) is in the build twice:

- **`site/clean.html`** — the design document itself, rendered live. It is not
  flattened: `clean.mjs` ships the template, the `DCLogic` component and a
  ~120-line expander for `{{ expr }}` / `<sc-for>` / `<sc-if>`, so every frame
  still responds to taps, exactly as the header promises.
- **`site/app.html`** — the working app, rebuilt on that system.

`node build.mjs` produces both, plus the older Trace Social kit
(`site/index.html`, now 18 turns / 175 frames).

## The system (turn 19)

| Frame | Where it lives |
|---|---|
| 19a Open | `firstRun()` in `src/app.js` — pairing is the front door |
| 19b Home — always the canvas | `#sc-canvas` |
| 19c Directory — tap a room | `#sc-rooms` + `renderRooms()` |
| 19d Household | `ROOM_VIEWS.Household` |
| 19e Presence — two clocks | presence pill + `sara.presence()` |
| 19f Lists | `openSub('list')` |
| 19g Together | `ROOM_VIEWS.Together` |
| 19h Memory | `ROOM_VIEWS.Memory` |
| 19i Wellbeing | `ROOM_VIEWS.Wellbeing` |
| 19j Rules | `renderRules()` |

Design values are frame-verbatim: phone 390×844 r46 with an 8px `#08080B`
bezel, surface `#0A0A0C`, ink `#EDEFF7`, accents `#FFB020` / `#FF7BC5` /
`#6EA8FF` / `#4ADE80`, brand red `#E23343`, cards `rgba(255,255,255,.055)`
with a `.07` hairline at r18, the 54px control bar, the 134×5 home indicator.

## The board → widget (turn 21)

This is the model the product owner described, and the design drew it:

- **21a — your board.** Six publish switches (`db.pub`): drawing traces
  (one-time, burns after she sees it), today's list, this week, mood weather,
  "leaving now", notices. *You never see your own widget.*
- **21b — her home screen.** `paintWidget()` renders one card from `deck()`;
  tapping cycles, except on the live-trace card, which opens the app because
  the card says "tap to join".
- **21c — priority.** Encoded in `deck()`, in order:
  `leaving now → live drawing → must-dos → notices → week → quiet`.
  One-time things show once, then burn (`db.traceSeen`). Anything that
  arrives jumps to the front — that is the arrival moment — and nothing
  repeats.

Board changes ride the existing sync channel as a `board` event with
`{kind, payload}`, same 80ms/9s/broadcast semantics as ink. Proven across two
paired windows: ticking a task on A moves the count *and* the widget card on
B; "leaving now" from A outranks B's must-dos, as 21c requires.

## Turns 20 and 22–25, in the rooms

Everything turns 1–18 shipped is still there — the ink engine, the seven
brushes, pairing, and all 57 features — reachable two ways: from the room
they belong to, and from the directory's search, which covers every feature
and groups hits by room.

New surfaces built from the frames' own data models: groceries (19f),
meal wheel (20j), fair split (20o), handover baton (20p), doses (20w),
two-minute pile (25e), savings deposits (24g), dream board and co-signed
promise (19g), bucket list (22e), missions (20q), the year heatmap (19h),
gratitude jar (22d), mood weather (22f), habits (19i), couple focus (20v),
meeting armour (20l), the tap (23e) and "leaving now" + say-it (20k).

## Known gaps

- Turns 22–27 include surfaces the phone build does not host: watches (24a),
  lock screens (22b), Android home (22c), tablet board (24i), and the five
  logo directions (27a–f). They render in `clean.html`; they are platform
  work, not app work.
- 25a–25j (decision debt, mental load, waiting room, money truth, energy
  match, renewal radar, yes/no board, where-is-it) are designed and rendered
  but not yet built into the rooms.
- The directory adds a "Beyond the rooms" group (board, widget states,
  rules) that the 19c frame does not draw. Five rooms stay the primary model;
  this is the one addition, and it is labelled.
