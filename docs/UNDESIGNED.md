# Built but never designed

Everything in the app with **no frame in `project/paper/`** — the current design
bundle, 61 screens, `p1`–`p61`.

Each of these exists because the app could not run without it, but you never
drew it, so the look is mine rather than yours. That is the part that needs
your eye.

Re-checked against the Paper bundle (the earlier check was against
`Trace Clean.dc.html` / `Trace Social.dc.html`, which the handoff has since
superseded — "nothing here is superseded, so anything you see in these files is
intended"). Method: grep `README.md`, `SCREENS.md` and `Trace Paper.dc.html` for
each concept, then confirm the code path still exists.

## Still undesigned — the look is mine

| # | Thing | Where it lives | Why it exists | What I need from you |
|---|---|---|---|---|
| 1 | **Colour cascade** — full-spectrum picker | canvas dock → the last swatch | You asked for "any color". Paper specifies exactly four pens (red, ink, amber, violet) and says red is the only accent — a free spectrum is deliberately outside that | Is the cascade right at all, or should the four be the whole palette? |
| 2 | **Pen thickness** — 5-step slider | brush pop, under the colours | You asked for "pen thickness". No frame shows a thickness control | The sizes, and the control's look |
| 3 | **Pages — `us` / `mine` / `hers` pills** | above the canvas | Your model: what I draw on `mine` lands on her widget untouched. Paper never draws this | The pill treatment. This is the app's core idea sitting in UI I invented |
| 4 | **Offline outbox** | `src/rooms.js` — queues board pushes, drains on reconnect | A tick made on the tube must not vanish | Does the user ever see it? Today it is silent except for one toast on drain |
| 5 | **Live status bar** — carrier, wifi, Battery API | phone chrome, every screen | You asked for "real flow shit". Every frame draws a static bar | Nothing — just confirm you want a live battery rather than the drawn one |
| 6 | **"Your key" restore** | Quiet & private → Your key | Lose the phone and you lose the canvas; there is no account to recover from | Copy. This is still the scariest screen in the app |
| 7 | **PWA front door** (`site/start.html`) | first open, before the app | Paper assumes iOS and Android. The web build has no App Store, so somebody has to be told to Add to Home Screen | The whole screen — it is the first thing a web visitor sees |
| 8 | **Low power mode** | `src/flows.js` | Continuous ink at 60fps eats a battery | Whether to surface it at all |
| 9 | **Analytics** | not built | Needs a yes/no before anything is written | Yes or no |

## Answered by the Paper bundle since the last check

These were open questions. The new design settles them, and the build now
follows it.

| Was | Now |
|---|---|
| **Timezone strip** — format open, "her 11:40pm" vs a dial | **p5 Two clocks.** An arc showing the overlap, not two readouts — the point is the hours you share. Built. |
| **"How loud" matrix** — 13 card types, hard to draw small | **p50 Every interruption.** There is no matrix: four things may push, and that is the whole set. The 13-row version was solving a problem the design removed. |
| **Unpair** — copy open, and whether her copy survives | **p51 The end.** Pause / close the book / if one of you dies, with a disposition table: both keep the canvases and the chapters, the jar opens early, the pocket is deleted unread. |
| **Export data** — the frames named the button, nothing showed the output | Still a file download, but p51 now states the promise it has to keep: no hostage-taking, no export fee, no "are you sure" three times. |
| **Permission primer** — copy open | The design rules it out. p1: "Do not add a carousel, a value-prop, or permission prompts here." p38: "Defer permissions until the feature needs them." |

## Designed and built — no action needed

The frames cover these, and the build follows them: the canvas and presence
(p2), the goodnight seal (p3), the prompt deck (p4), the rooms directory (p6),
the typed → handwritten loop (p14/p15), the widget and its priority order
(p16–p18), all five rooms, the board, the hard parts (p46/p47/p50/p51), the
life-happens modes, the long-run screens, and the watch/lock/tablet/car
surfaces.

## Designed but not built

Nothing. All 61 frames have a reachable surface — `node coverage.mjs` lists
them, and `node qa/drive.mjs list` walks them.

Two caveats on that claim, both deliberate:

- `coverage.mjs` scores by **copy overlap**, so screens where the frame showed
  illustrative filler (p5, p21, p57) read low despite being built. Structure,
  palette and the load-bearing lines were matched; every string was not.
- **Hand-drawn strokes and the tablet frame are lo-fi in the handoff's own
  words**, so those are built to intent rather than to the pixel.
