# Built but never designed

Everything in the app that has **no frame in `Trace Clean.dc.html` or `Trace Social.dc.html`**.
I built each of these because the app could not ship without it — but you never drew them,
so the look is mine, not yours. That is the part that needs your eye.

Checked by grepping both design sources for each concept, then confirming the code path exists.

| # | Thing | Where it lives | Why it exists | What I need from you |
|---|---|---|---|---|
| 1 | **Colour cascade** — full-spectrum picker, any colour | canvas control bar → brush pop | You asked for "any color". The frames only ever show 4 fixed accents | Is a free spectrum right, or do you want a curated palette? |
| 2 | **Pen thickness** — 5-step slider | brush pop, under the colours | You asked for "pen thickness". Not in any frame | Sizes and the slider's look |
| 3 | **Pages — `us` / `mine` / `hers` pills** | above the canvas | Your model: mine lands on her widget untouched. The word "pages" in the frames is about *printing*, not this | The pill treatment. This is the app's core idea sitting in UI I invented |
| 4 | **Offline outbox** | `rooms.js` — queues board pushes, drains on reconnect | Ticks made on the tube must not vanish | Does the user ever see it? Right now it is silent |
| 5 | **Real status bar** — carrier, wifi, Battery API | phone chrome, every screen | You asked for "real flow shit". Frames draw a static bar | Nothing — but confirm you want live battery |
| 6 | **"Your key" restore** | Quiet & private → Your key | Lose the phone, lose the canvas, with no account to recover from | Copy. This is the scariest screen in the app |
| 7 | **Unpair** | Quiet & private → Unpair | A breakup needs a door | Copy, and whether her copy survives |
| 8 | **PWA install / front door** (`start.html`) | first open, before the app | Web has no App Store. Someone has to be told to Add to Home Screen | The whole screen — it is the first thing anyone sees |
| 9 | **Low power mode** | flows.js | Continuous ink at 60fps eats a battery | Whether to surface it at all |
| 10 | **Timezone strip** | presence row | Long distance was in your brief, the clock never was | Format — "her 11:40pm" vs a dial |
| 11 | **Permission primer** | before the OS notification prompt | Ask cold and half say no forever | Copy |
| 12 | **"How loud" matrix** | Quiet & private | Which of 13 card types rings vs sits | Layout — it is a matrix, and matrices are hard to draw small |
| 13 | **Export data** *(half-designed)* | Quiet & private | The frames name the button; nothing shows what comes out | Nothing — it is a file download |
| 14 | **Analytics** | spec only, `PRD.md` §15 | Not built. Needs your yes/no first | Yes or no |

## Designed and built — no action needed

These I checked and the frames *do* cover, so I built to them:
pressure ("Draw — pick a color, pressure travels"), the handwriting keyboard
("Tap the keyboard — it types, then renders"), font styles, the widget deck and its
priority order, all five rooms, the board, quiet hours, the watch/lock/Android/tablet surfaces.

## Designed but NOT built

Nothing. Every frame in both sources has a live surface behind it — 143 checks, all green
(`sweep.mjs`: 6 screens, 5 rooms, 86 rows, 4 beyond-the-rooms screens, the deck, the pages, ink).
