# trace — design builds

Two deliverables from the Claude Design handoffs in `project/`, both built by
`node build.mjs` into `site/`:

| build | what it is |
|---|---|
| **`site/app.html`** | **the app** — all 61 screens of the Trace Paper design, running |
| `site/clean.html` | the design gallery — 82 frames from the earlier Social/Clean turns, with PNG export |

Everything is inlined (CSS, JS, the Caveat subsets), no network, works from
`file://`. `node build.mjs` produces both.

> **This repo is not the shipping app.** The product ships from
> `KIDUSDANIEL576/trace`, a React Native codebase — see *Where this goes*.

---

## The app — `site/app.html`

The current design bundle is `project/paper/`, and it is the source of truth:

| file | contents |
|---|---|
| `project/paper/SCREENS.md` | **start here** — all 61 screens, what each is for, its elements, its build plan |
| `project/paper/README.md` | tokens, the three invariants, typography, spacing, brand |
| `project/paper/Trace Paper.dc.html` | the live design file, 61 frames `p1`–`p61` |
| `project/paper/Trace Logo.dc.html` | the mark, colourways, app icon, loading animation |

**Read one frame** — the fastest way to compare built against designed:

```
node frame.mjs p46          # prints frame p46's structure, colours, sizes, copy
node coverage.mjs           # which frames have a surface, by copy overlap
node coverage.mjs p46       # what copy p46 is still missing
```

### Three invariants

Product law. If an implementation decision conflicts with one, the invariant
wins.

1. **Home is always the canvas.** Not a feed, not a dashboard.
2. **No room notifies about itself.** Only four things may ever push: the flare,
   "leaving now", a reminder *both* people agreed to, and goodnight (off by
   default).
3. **Nothing that reads a drawing leaves the device.**

### The theme layer

Paper is the design. Dark is a preference, and deliberately *not* an inversion
of paper — it is the same structure with its own warm near-black values, so the
ink card stays an emphasis step instead of dissolving into the ground.

- `src/app.css` holds both token blocks. Paper is bare `:root`; dark is
  `:root[data-theme="dark"]`, repeated under `prefers-color-scheme` for the
  "match phone" case.
- An explicit choice wins in both directions. It is stamped before first paint
  by an inline script in `src/app.html`, because setting it afterwards is a
  flash.
- Red `#E23343` is the **only** accent. No greens for success, no blues for
  info — red has to keep meaning "this matters".

Two consequences worth knowing before editing:

- **Canvas 2D has no cascade**, so `var()` never resolves against a context.
  `TOK('--ink')` reads the value off the document and drops its cache on theme
  change.
- **A stroke's colour is a palette slot, not a value** (`'red'`, `'ink'`,
  `'amber'`, `'violet'`). Strokes sync, so a resolved colour would send the
  author's theme with them — ink drawn in the dark would arrive on a paper
  phone as cream on white. Custom colours from the cascade stay literal hex and
  pass straight through.

### Source layout

| path | role |
|---|---|
| `src/app.html` | the shell, the canvas screen, the theme boot script |
| `src/app.css` | the token layer and every shared block primitive |
| `src/app.js` | the canvas engine — strokes, brushes, pressure, the widget |
| `src/rooms.js`, `src/rooms2.js` | the five rooms, the board, the widget deck |
| `src/rituals.js` | goodnight (p3), the prompt deck (p4) |
| `src/hard.js` | repair, cover me, interruptions, the end — and the quiet switch |
| `src/calendar.js` | find a time, new event, the clash, trips, dates, two clocks |
| `src/life.js` | the unsaid, newborn, grief, moving, money shock |
| `src/longrun.js` | drift, the friend, solo nights, parents, the visitor |
| `src/more.js` | meal wheel, memory, the loop, kid's corner, people, settle up |
| `src/write.js` | the typed → handwritten composer (p14) |
| `src/flows.js`, `src/surfaces.js` | the daily loop, and watch/lock/tablet/car |

Adding a screen means: create the section, `R.addScreen(name, render)`, and
register it with `R.addRow(room, ...)` for a room or `R.addBeyond(...)` for the
directory tail. A room row's `sub` is a **thunk**, so its subtitle can track
live data.

`R.quiet()` is the single "quiet the machinery" predicate. Repair, cover,
newborn and grief all want the same silence, so anything that counts,
congratulates, nags or scores asks it once rather than carrying a flag each.

### QA

```
node qa/drive.mjs list                          every reachable screen, grouped
node qa/drive.mjs probe "Repair"                text, tappables + sizes, colours, overflow, type sizes
node qa/drive.mjs probe "Repair" dark           the same, in dark
node qa/drive.mjs shot "Repair" out.png         screenshot it
node qa/drive.mjs click "Repair" "[data-toggle]"  click, and report what changed
```

Screens are named the way a person reaches them — a directory row, or
`room:row` — so a repro reads as the path the user took. `probe` returns enough
to check touch targets, palette discipline and the type floor mechanically
rather than by eye.

```
node qa/registry.mjs                            duplicate db keys, screens, rows, dead rows
node qa/contrast.mjs [dark]                     text that cannot be read against its ground
node qa/deadends.mjs                            press every control; report what moved nothing
node qa/deadends.mjs "Repair,New event"         a slice, in order, for a repro
```

`deadends` exists because every other check here can pass on a photograph. A
palette audit cannot tell a working switch from a painted one. So it presses
each control and asks whether the screen, an open panel, the text, the DOM, the
store or a toast moved — a switch that only flips a class still counts. State
is snapshotted and restored between screens, because "Delete everything" and
"Hold to unpair" are real buttons and it presses them.

Two things it learned the hard way, both worth keeping in mind for any tool
like it:

- **Address controls by identity, not index.** Re-indexing at press time means
  that the moment a press re-renders a list, the tool presses a stand-in and
  blames the original. It reported two working brushes as dead that way.
- **Account for every control.** Coverage is part of the result: pressed,
  disabled, gone, unreachable. A tightened filter once dropped the count from
  541 to 387 and read as an improvement. When something is unreachable the tool
  names what covered it — "181 unreachable" is not a finding, it is a question,
  and the answer was one line of markup.

### App icon

```
node appicon.mjs      # re-render src/pwa/*.png from the mark, then build.mjs
```

Generated from the README's own path and geometry so it cannot drift from the
brand sheet. The ink dot is not optional — it is the wet tip of the other
person's stroke, and the same shape the app uses as its presence indicator.

### Icons — `src/icons.mjs`

Forty-one symbols, none of them stroked. A `stroke-width` is one number, so a
monoline icon has the same weight everywhere; a pen presses through the middle
of a stroke and lifts off the ends. So each path is sampled, given a half-width
that varies along its arc, and emitted as a filled ribbon with arc caps — the
mark's own pen (`stroke-width 13` on a 120 box, 10.8%) at a 24 box, which is
about 2.4.

Four more things, all hashed from the icon's own name so the set is identical
in every build and a diff shows real changes rather than noise:

- lines **bow** — smooth low-frequency noise along the arc, so a straight line
  sags like a drawn one instead of kinking like a damaged one
- strokes **overshoot** the corner they are turning
- every sharp turn **splits the stroke**, because a hand draws a box as four
  strokes that cross, not one mitred outline
- no circle is a circle — one sweep with a gap where the pen lifted

The build swaps glyphs for symbols in two places: `EMOJI_ICONS` over the design
frames, and `APP_ICONS` over the app itself. The second list exists because the
app used to spend system-font glyphs on icon duty — `⚙` for rules, `⌕` for
search, `⌂ ❑ ◔ ◍` for the four rooms — which meant the nav was drawn by
whatever font the device happened to resolve. `build.mjs` now fails the run
loudly if a pictographic glyph survives. `✓ ✕ ⋯ ▮ ↑ ↓` deliberately stay as
type: they are marks inside sentences, and a sentence with an `<svg>` in the
middle of it is not a sentence.

The same argument runs through `app.css`'s **drawn edge** tokens (`--r18`,
`--rdisc`, `--rpill`). One radius repeated on a hundred corners is a louder
machine tell than any icon, so each token names four corners that disagree by
about a tenth of the radius, and lists alternate variants down their length.

---

## The gallery — `site/clean.html`

The earlier Social/Clean design turns as a browsable gallery with real PNG
export at platform sizes (1:1 → 1080×1080, 9:16 → 1080×1920, App Store →
1290×2792, and so on). Frames are live DOM, so exports stay crisp at any scale;
`export turn` / `export all` bundle them into a ZIP with a ~40-line vanilla
writer.

Taking a design update is one command — drop the new export over
`project/Trace Social.dc.html` and run `node build.mjs`. New turns, frames,
sizes, formats and `@keyframes` are all picked up without edits here, and the
run prints what it had to infer. It fails loudly rather than dropping content.

Rasterisation goes DOM clone → SVG `foreignObject` → canvas → PNG. The clone
gets `.ts-export` to kill animations, so `tdraw` strokes render fully drawn
instead of invisible, and the SVG loads via `data:` URI — a `blob:` URL taints
the canvas.

| path | role |
|---|---|
| `src/shell.html`, `src/trace.css`, `src/trace.js` | gallery chrome, finish, export pipeline |
| `clean.mjs`, `design6.mjs` | parse the untouched design sources |
| `site/manifest.json` | frame inventory, used to diff builds |

`clean.mjs` and `design6.mjs` read `project/*.dc.html` unmodified, which is why
`repaint.mjs` skips them — rewriting their colour literals stops them matching.

---

## Where this goes

`project/` is the untouched handoff bundle: prototypes, the chat transcripts in
`chats/`, store shots in `project/store/`.

`project/github.md` maps each design screen back to the source it was recreated
from in **`KIDUSDANIEL576/trace`** — a React Native app, and the thing that
actually ships. This repo builds the designs so they can be reviewed running;
porting them into that codebase is a separate task against that repo, and the
two histories are unrelated.
