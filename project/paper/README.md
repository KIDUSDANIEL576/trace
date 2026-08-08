> **For the developer, in one paragraph.** This is a couples' app called **Trace**. It has one home screen — a shared drawing canvas — and everything else lives in rooms behind it. Whatever either partner publishes reaches the other's **home-screen widget**, so most days nobody opens the app. There are exactly **61 screens**, `p1`–`p61`, all specified in **`SCREENS.md`** with a screenshot and a build plan each. Build them in the order given at the bottom of that file. The three rules in *Three invariants* below are not preferences — if a decision conflicts with one, the rule wins.

# Handoff: Trace — a shared canvas for two

## Overview

**Trace** is a couples' app built on one idea: two people, one live surface, no audience. Home is always a shared drawing canvas. Everything else — the household layer, the calendar, memory, wellbeing — lives in rooms behind it. Whatever either partner publishes to their board arrives on the other's **home-screen widget**, so most days you never open the app.

Slogan: **"Leave me a trace."**

This bundle contains **61 mobile frames + logo/brand sheets**, covering the full product: onboarding, canvas, household, calendar & scheduling, together/goals, memory, wellbeing, the widget system, watch/tablet/car surfaces, and the hard parts (repair, illness, grief, money shock, the end).

Ships on **iOS and Android**. Mixed households (one iPhone, one Android) pair to the same canvas — that's a requirement, not a nice-to-have.

---

## About the Design Files

The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, **not production code to copy directly**.

The task is to **recreate these designs in the target codebase's existing environment** (React Native, Flutter, SwiftUI + Jetpack Compose, etc.) using its established patterns, component library, and navigation. If no environment exists yet, choose the framework best suited to a two-platform mobile app with home-screen widgets on both — note that widgets are the product's spine, so a stack with first-class WidgetKit (iOS) and Glance/AppWidget (Android) access matters more than code sharing.

The HTML uses inline styles throughout and a small amount of React-ish state for interactive demos. Neither is prescriptive. What *is* prescriptive: exact colors, type sizes, spacing, copy, and the behavioral rules described below.

---

## Fidelity

**High-fidelity.** These are pixel-level mockups with final colors, typography, spacing, copy, and interaction states, drawn at 390×844 (iPhone 14/15 logical size) inside a device bezel. Recreate the UI faithfully, substituting the codebase's own primitives where they exist.

Two exceptions to treat as lo-fi guidance:
- **Hand-drawn strokes** are represented as SVG paths. In production they are real ink from a pressure-sensitive canvas.
- **The tablet frame (p-tablet)** shows intent for a wall-mounted board; exact breakpoints are open.

---

## Three invariants

These are product law. If an implementation decision conflicts with one of these, the invariant wins.

1. **Home is always the canvas.** Not a feed, not a dashboard, not a task list. The app opens on the shared drawing surface every time.
2. **No room notifies about itself.** Only four things can ever push (see *Interruptions*). Everything else waits on the widget until someone looks.
3. **Nothing that reads a drawing leaves the device.** All interpretation — handwriting rendering, voice-to-ink, the "tiny AI" summary, day maps — runs on-device. Drawings sync as encrypted strokes; they are never processed server-side.

---

## Design Tokens

### Color — paper theme (primary)

The app is a **bright paper** aesthetic: warm off-white grounds, near-black ink, one red accent. Dark surfaces are used as *inversions* for emphasis, not as a dark mode.

| Token | Hex | Use |
|---|---|---|
| `paper` | `#FBF4EA` | Default screen background |
| `paper-alt` | `#F2EADC` | Secondary/quiet screens (repair, grief, the end) |
| `paper-deep` | `#EFE6D6` | Grief screen only |
| `card` | `#FFFFFF` | Cards, rows, list items on paper |
| `ink` | `#1A1A1A` | Primary text, inverted card backgrounds |
| `ink-70` | `rgba(26,26,26,.7)` | Secondary text on paper |
| `ink-55` | `rgba(26,26,26,.55)` | Body/supporting text |
| `ink-45` | `rgba(26,26,26,.45)` | Captions, footnotes |
| `ink-40` | `rgba(26,26,26,.4)` | Meta labels, timestamps |
| `hairline` | `rgba(26,26,26,.1)` | Card borders |
| `divider` | `rgba(26,26,26,.08)` | Row dividers inside cards |
| `dashed` | `rgba(26,26,26,.2)` | Dashed "note" borders |
| `red` | `#E23343` | **The one accent.** Brand, primary CTA, live/urgent |
| `red-deep` | `#B3202E` | Red text on paper (contrast-safe) |
| `red-light` | `#E9808A` | Red text on ink backgrounds |
| `red-wash` | `rgba(226,51,67,.07–.12)` | Tinted card backgrounds |
| `cream` | `#FBF4EA` | Text on ink backgrounds |
| `cream-75` | `rgba(251,244,234,.75)` | Body text on ink |
| `cream-60` | `rgba(251,244,234,.6)` | Supporting text on ink |
| `amber` | `#E9A13B` | Rare third accent (avatar chips, warm markers) |

**Palette discipline:** red is the *only* accent. Resist adding greens for success or blues for info — the design deliberately uses ink/red/paper alone so red always means "this matters."

### Ink colors on canvas (drawing only)

Strokes on the shared canvas may use a small pen palette. In the paper build these read as: `#E23343` (red), `#1A1A1A` (ink), `#E9A13B` (amber), `#7A6BB5` (violet). Two-person attribution is by **stroke color choice**, not a fixed per-person color.

### Typography

Two families, no more.

| Role | Family | Notes |
|---|---|---|
| UI | System sans (`-apple-system` / `SF Pro Display` on iOS, `Roboto` on Android) | All chrome, labels, numbers, body |
| Handwriting | **Caveat** (Google Fonts), weights 500/600/700 | Any content authored by a person |

**The handwriting rule is the product.** Anything a partner *wrote* — a list item, a calendar entry, a note, a reminder, a slogan — renders in Caveat. Anything the *app* says renders in the system font. This is how a typed reminder arrives "in your handwriting."

Scale (px, at 390pt width):

| Token | Size / weight | Use |
|---|---|---|
| `display` | 30–32 / 700, `letter-spacing:-.02em` | Screen titles |
| `hero-number` | 40–56 / 700, `-.03em` | The one big number on a screen |
| `title` | 24 / 700 | Section headers |
| `body-lg` | 16–17 / 600 | Row titles |
| `body` | 15 / 400–600 | Default |
| `meta` | 12–13 / 400 | Captions, timestamps |
| `label` | 11–12 / 700, `letter-spacing:.14em`, uppercase | Eyebrow labels |
| `hand-lg` | Caveat 26–32 / 700 | Handwritten content |
| `hand` | Caveat 23–26 / 700 | Handwritten list items |

Minimum body size 15px; never below 12px for meta. Touch targets ≥44px.

### Spacing, radius, shadow

- **Screen padding:** 20px horizontal for card rails, 24px for text blocks
- **Card gap:** 8–10px in lists, 16px between sections
- **Radius:** 16px small rows · 18–20px cards · 22–26px feature cards · 999px pills/buttons · 46px device corner
- **Card border:** 1px `hairline`; emphasized cards use 2px `#E23343`
- **Shadow:** only on the device frame (`0 24px 50px rgba(26,26,26,.22)`). Cards are flat — separation comes from the white-on-paper value step and hairlines.
- **Buttons:** 52–58px tall, radius 999px. Primary = `#E23343` bg + white text, or `#1A1A1A` bg + `#FBF4EA` text. Secondary = white bg + 1px hairline.
- **Toggles:** 46×28 track, radius 99px, 22px white knob, 3px inset. Off = `rgba(26,26,26,.18)`, on = `#E23343`.

### Motion

- Toggles/selection: 180ms ease
- Progress bars, scrubbers: 300ms ease
- Presence dot: 2.4s pulse loop (`opacity .35→1`, `scale 1→1.25`)
- Drift (floating elements): 7–8s ease-in-out loop, ±6px Y
- **Logo/loading animation:** see *Brand*

---

## Brand

### The mark

A single hand-drawn stroke with a **filled dot at the tip** — the ink still wet, the other person's cursor mid-stroke. The dot doubles as the live-presence indicator used throughout the app.

Path (viewBox `0 0 120 120`): `M18 82 C42 26,66 96,102 34`, `stroke-width:13`, `stroke-linecap:round`. Dot at `cx=102 cy=34 r=8`.

Two colorways:
- **Red stroke, white dot** — on dark/ink grounds
- **White stroke, ink dot** — on red grounds

**App icon:** red `#E23343` field, white stroke, ink dot. Radius 15px at 64px.

### The loading animation

The logo *is* the spinner. The red stroke draws itself (dasharray 320 → offset 0) with its white tip appearing at completion, holds, fades; then the white stroke draws with a red tip. Red, white, red, white — two hands taking turns. 4.4s per full cycle, 2.2s offset between the two strokes, `linear infinite`.

```
@keyframes traceDraw {
  0%   { stroke-dashoffset:320; opacity:1 }
  42%  { stroke-dashoffset:0;   opacity:1 }
  50%  { stroke-dashoffset:0;   opacity:1 }
  58%  { opacity:0 }
  100% { stroke-dashoffset:320; opacity:0 }
}
@keyframes traceDot {
  0%,38% { opacity:0 } 44%,52% { opacity:1 } 60%,100% { opacity:0 }
}
```

### Wordmark

`trace` in **Caveat 700**, with `tra` in ink/white and `ce` in `#E23343`. Slogan **"Leave me a trace."** in Caveat 600 beneath, at ~⅓ the wordmark size. Sentence case, with the full stop — it's part of the mark.

There is also an animated wordmark treatment where the word writes itself stroke by stroke; see `Trace Logo.dc.html`.

---

## Screens

**61 frames, id'd `p1`–`p61` in `Trace Paper.dc.html`.** Each frame carries a visible badge with its id and a one-line caption.

**→ See `SCREENS.md` for the full screen-by-screen plan** — every frame with its screenshot, what it is, what problem it solves, the elements on it, and its build rules. That document is the primary spec; the table below is the index.

Screenshots of all 61 frames are in `screens/`, named `pNN-slug.png`.

| id | Screen | Room |
|---|---|---|
| p1 | Launch | Opening |
| p2 | Canvas home | Canvas |
| p3 | Goodnight | Canvas |
| p4 | Prompt deck | Canvas |
| p5 | Two clocks | Canvas |
| p6 | Rooms directory | Navigation |
| p7 | Tasks | Household |
| p8 | Groceries | Household |
| p9 | The week | Household |
| p10 | Meal wheel | Household |
| p11 | Leaving now | Household |
| p12 | Handover | Household |
| p13 | Meeting armour | Household |
| p14 | Type it (handwriting composer) | Core interaction |
| p15 | The notification (iOS + Android) | Core interaction |
| p16 | Widget on her home screen | Widget |
| p17 | Widget states + priority | Widget |
| p18 | Your board (publish controls) | Widget |
| p19 | The pocket | Together |
| p20 | Missions & savings | Together |
| p21 | Memory | Memory |
| p22 | Wellbeing | Wellbeing |
| p23 | Decision debt & waiting room | Wellbeing |
| p24 | Mental load & money truth | Wellbeing |
| p25 | The flare & the tap | Wellbeing |
| p26 | The daily loop & the rules | System |
| p27 | The month | Calendar |
| p28 | Find us a time | Calendar |
| p29 | The ask | Calendar |
| p30 | Energy match | Calendar |
| p31 | Recurring & ask nicely | Calendar |
| p32 | Renewal radar | Calendar |
| p33 | Kid's corner | Household |
| p34 | Doctor's note | Household |
| p35 | Guest mode | Household |
| p36 | Canvas extras (voice, sky, day map, wall) | Canvas |
| p37 | Watch & car | Surfaces |
| p38 | Day one | Opening |
| p39 | Tablet board | Surfaces |
| p40 | Today timeline | Calendar |
| p41 | New event | Calendar |
| p42 | Conflict | Calendar |
| p43 | Trips | Calendar |
| p44 | Anniversaries | Calendar |
| p45 | Tonight | Calendar |
| p46 | Repair | Hard parts |
| p47 | Cover me | Hard parts |
| p48 | The people layer | Hard parts |
| p49 | Settle up | Hard parts |
| p50 | Every interruption | Hard parts |
| p51 | The end | Hard parts |
| p52 | The unsaid | Life happens |
| p53 | Newborn mode | Life happens |
| p54 | Grief | Life happens |
| p55 | Moving | Life happens |
| p56 | Money shock | Life happens |
| p57 | The drift | Long run |
| p58 | The friend of the relationship | Long run |
| p59 | Solo nights | Long run |
| p60 | Ageing parents | Long run |
| p61 | The visitor | Long run |

---

## Interactions & Behavior

### The typed → handwritten loop (the signature interaction)

1. User types a reminder on a **normal system keyboard** (no drawing required).
2. As they type, a live preview renders the text in **Caveat 700** — "rendered in your hand."
3. On send, it arrives on the partner's device rendered in that handwriting: in the notification body, on the widget, and in the shared list.
4. Actions on the notification are **Got it / Can't** — never "Reply."

Production note: the mock uses the Caveat webfont as a stand-in. The intended end state is a per-user handwriting model derived from their canvas strokes, generated on-device. Ship with Caveat; treat real handwriting synthesis as a later upgrade behind the same interface.

### The daily loop

Four moments, under 90 seconds total. Everything else waits on the widget.

| Time | Moment |
|---|---|
| ~6:04 | **Morning handoff** — what she left overnight, appearing once at your wake time. Never a notification. |
| ~13:00 | **Two-minute pile** — batch of sub-2-minute tasks, cleared together, phones silent until empty. |
| ~18:30 | **Leaving now** — sends itself. Nobody asks "where are you." |
| ~23:30 | **Goodnight** — the canvas seals, the day closes. |

### Interruptions (exhaustive)

Only these four may ever produce a push notification:

1. **The flare** — "I need you." Breaks armour, quiet hours, guest mode, everything. Three per year, resets in January. The only thing in Trace that interrupts.
2. **Leaving now** — only when someone starts moving home.
3. **A reminder both people agreed to** — never one person's idea alone.
4. **Goodnight** — one nudge at your chosen hour, **off by default**.

Never notifies: drawings, streaks, missions, journal, mood weather, or any room talking about itself.

### Presence & sleep

- Presence is a **dot, never a location**.
- Sleep is a state (asleep / awake), not a status with times. While a partner is asleep: marks wait quietly, their widget dims and stops updating, the flare still gets through.

### Widget behavior

- The widget cycles through published states; tapping advances/opens.
- **Priority order:** leaving now → live drawing → must-dos → notices → week → quiet day.
- One-time items (a live trace) **show once, then burn**.
- Ticks sync both ways instantly.
- The user curates their *own* board; they never see their own widget.

### Guest mode

Hides canvas, traces, mood, and the pocket (which "never existed"); leaves lists and calendar visible. Auto-ends at midnight. The partner's widget shows a small "guests" dot and nothing more.

---

## State Management

Per-couple shared state (synced, E2E encrypted):
- `canvas` — today's strokes, presence, seal time, streak
- `permanentInk[]` — kept marks
- `tasks[]`, `lists[]`, `recurring[]` — with `claimedBy`, `brief`
- `week[]` — calendar entries with `authorId` (drives handwriting rendering)
- `board` — per-user publish flags (`trace`, `list`, `cal`, `mood`, `leave`, `notice`)
- `goals`, `savings`, `bucket`, `promises`
- `chapters[]`, `journal[]`, `jar[]` (sealed until a date)
- `modes` — `repair`, `newborn`, `guest`, `cover`, `armour`, `solo`, `visitor`

Per-user private state (**never syncs**):
- `pocket` — secret planning; must be absent from the partner's device entirely, including search indexes and shared backups
- `unsaid` — held messages
- `flaresRemaining`

Derived, computed on-device:
- Fair split, mental load, drift, energy bands, decision debt, waiting room, money truth

Mode transitions are the interesting part: entering `repair`, `newborn`, `cover`, or `grief` **suppresses** streaks, missions, prompts, split counting, and journal entries. Build this as one shared "quiet the machinery" switch rather than per-feature conditionals.

---

## Assets

- `assets/icon.png` — original app icon (stroke heart, red on black). Superseded by the stroke mark, kept for reference.
- `store/out/feature.png` — store feature graphic with the original "Leave me a trace." lockup.
- **Caveat** — Google Fonts, weights 500/600/700. Bundle it; don't load at runtime.
- All other marks are inline SVG paths documented above. No raster assets required.
- No third-party icon set — glyphs in the mocks (`✎ ⌂ ◔ ◍ ✕ ⤴ ›`) are placeholders; substitute the codebase's icon library.

---

## Files

| File | Contents |
|---|---|
| `SCREENS.md` | **START HERE.** All 61 screens: screenshot, what it is, what it's useful for, elements, build plan. |
| `screens/` | PNG of every frame, `p01-launch.png` … `p61-the-visitor.png`. |
| `Trace Paper.dc.html` | The live design file — all 61 frames, several interactive. Open in a browser. |
| `Trace Logo.dc.html` | Brand sheet: the mark, colorways, app icon, loading animation. |
| `support.js` | Runtime for the two HTML files. Not product code — do not port it. |

This bundle is **the current design only**. Earlier explorations have been removed deliberately: nothing here is superseded, so anything you see in these files is intended.

## Where to start

Build in this order — each step is usable on its own:

1. **Canvas + presence + goodnight** (p2, p3, p4). If this isn't good, nothing else matters.
2. **The widget** (p16, p17, p18) — the distribution mechanism for everything after.
3. **The typed → handwritten loop** (p14, p15, p9). The signature interaction.
4. **Household + calendar** (p7–p13, p27–p31). The daily utility that earns the habit.
5. **The hard parts** (p46 repair, p47 cover me, p50 interruptions, p51 the end). Cheap now, expensive to retrofit, and the reason people trust the app with the rest.
6. **Everything else**, in whatever order the roadmap wants.
