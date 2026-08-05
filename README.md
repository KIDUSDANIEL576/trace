# trace — social kit

Implementation of the **Trace Social** designs from the Claude Design handoff in
`project/` — the in-app screens, the full marketing post set, wordmark lockups
and reel storyboards, rebuilt as a single self-contained page with real PNG
export at platform sizes.

## Run it

Open **`site/index.html`** in a browser. That's it — everything (CSS, JS, the
Caveat font) is inlined, no network, works from `file://`.

## What it does

- **All 58 frames** from the five design turns, pixel-matched to the prototype:
  in-app screens (⋯ sheet, post composer, replay post, gesture card, six
  interactions), 24 posts across 1:1 / 9:16 / 16:9 / App Store, three wordmark
  lockups, and the three reel storyboards + production sheet.
- **PNG export** on every frame (hover → `PNG`), at true platform resolution:
  1:1 → 1080×1080, 9:16 → 1080×1920, 16:9 → 1920×1080, App Store → 1290×2792,
  storyboard beats → 1080×1918, phones → 990×2142, lockups → 1040×600.
  Frames are live DOM (gradients + inline SVG), so exports are crisp at any
  scale. `export turn` / `export all` bundle PNGs into a ZIP — no dependencies,
  the ZIP writer is ~40 lines of vanilla JS.
- **Photo slots** — the frames that call for real footage (2b, 2c, 5a, 5c) take
  a click or drag-and-drop photo, persisted in `localStorage`, and the app layer
  composites on top exactly as designed. Filled photos are included in exports.
- **Filters + search** across formats and frame copy; per-turn export buttons.
- **Finish restored** — the chat log's last open item: the perf passes had
  stripped 23 film-grain layers and 34 glass blurs and made animation
  hover-only (a misdiagnosis — the design tool's preview harness was at fault,
  not the file). This build restores grain as one shared static texture,
  backdrop blur on the 35 glass surfaces, and always-on stroke animation. The
  `motion` toggle brings back hover-gated animation, and
  `prefers-reduced-motion` is honoured automatically. Also fixed: 1h's
  invisible-ink hover reveal (the prototype used a non-standard `style-hover`
  attribute that never worked).

## Rebuild

```
node build.mjs
```

Reads the prototype (`project/Trace Social.dc.html`) plus `src/` and emits
`site/index.html`. The prototype is treated as the source of truth for frame
markup — edit frames there (or port them into `src/` if the prototype is
retired), and gallery chrome / behaviour in `src/`.

| path | role |
|---|---|
| `src/shell.html` | gallery chrome (header, filters, footer) |
| `src/trace.css` | prototype CSS (verbatim) + restored finish + gallery styles |
| `src/trace.js` | filters, photo slots, PNG/ZIP export pipeline |
| `src/fonts/` | Caveat woff2 subsets, extracted from the handoff's standalone export |
| `build.mjs` | transforms prototype → site (slots, glass, export wrappers) |
| `site/index.html` | **the deliverable** — single file, fully self-contained |

Export detail worth knowing: rasterisation goes DOM clone → SVG
`foreignObject` → canvas → PNG. The clone gets an `.ts-export` class that kills
animations so `tdraw` strokes render fully drawn instead of invisible, and the
SVG is loaded via `data:` URI — a `blob:` URL taints the canvas.

## Design source

`project/` is the untouched Claude Design handoff bundle (prototypes, chat
transcripts in `chats/`, App Store placeholder shots in `project/store/`).
`project/github.md` maps each screen back to the Trace app sources
(`KIDUSDANIEL576/trace`) it was recreated from. The in-app screens here are
mockups of that app's chrome; wiring them into the React Native codebase is a
separate task against that repo.
