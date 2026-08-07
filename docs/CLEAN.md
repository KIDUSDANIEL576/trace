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

## Turns 23–25, in `src/rooms2.js`

Registered through `TRACE_ROOMS` — `addSub` for a surface, `addRow` to hang it
in a room, `addCard` to give it a widget state, `addPresence` to sit it beside
the tap. The five rooms, the board and the deck pick them up without knowing
they exist.

| Frame | Surface | Room |
|---|---|---|
| 25a | Decision debt — open decisions, ageing | Household |
| 25b | Mental load — who is *remembering*, weighted so it opens at 71% | Household |
| 25c | Waiting room — what's blocked on whom | Household |
| 25d | Money truth — one number, not a budget | Together |
| 25e | Two-minute pile | Household |
| 25f | The brief — the whole handover in one card | Household |
| 25g | Energy match — when each of you is sharp | Wellbeing |
| 25h | Renewal radar — the quiet money leak | Household |
| 25i | Yes / no board | Household |
| 25j | Where is it | Household |
| 23a | Guest mode — ends itself at midnight | Board |
| 23b | Doctor's note — questions, never records | Wellbeing |
| 23c | Recurring + ask nicely | Household |
| 23d | The tiny one — counts only, on device | Wellbeing |
| 23f | Morning handoff — what she left overnight | Wellbeing |
| 23g | Rituals — noticed, never enforced | Wellbeing |
| 24b | The flare — hold three seconds, three a year | beside the tap |
| 24c | Her state — asleep / awake | Board |
| 24d | Widget stack order | Board |
| 24f | Memory movie — scrub it | Memory |
| 24h | Car mode — ETA writes itself to her widget | Board |
| 22d | Weekly ten minutes | Together |
| 20g | Map of your day | Memory |
| 20h | The wall — what survived midnight | Memory |
| 20i | The week — typed, shown in your hand | Household |
| 20m | Kid's corner + wrong-answer bin | Household |
| 20n | Photo of the letter → a task and a notice | Household |
| 20r | The pocket — does not exist on her device | Together |
| 20s | Chapters | Memory |
| 20t | Journal — counts, never meaning | Memory |
| 20u | The year, as a book | Memory |

Five of these reach her widget as new states, slotted into 21c's order by
priority number: **the flare (0)** — the only thing that outranks "leaving
now"; car-mode ETA (1, as a leaving card); the morning handoff (3.5); "N
waiting" (6); the guests dot (9); asleep (10). An arrival resets the deck to
the front and gets a full dwell before the rotation resumes.

## Known gaps

- Turns 22–27 include surfaces the phone build does not host: watches (24a),
  lock screens (22b), Android home (22c), tablet board (24i), and the five
  logo directions (27a–f). They render in `clean.html`; they are platform
  work, not app work.
- The directory adds a "Beyond the rooms" group (board, widget states,
  rules) that the 19c frame does not draw. Five rooms stay the primary model;
  this is the one addition, and it is labelled.
