# Two-phone QA script

Everything below needs real devices — it's the part no CI can cover. Run top to
bottom with two phones (A and B) and two email addresses. Prereqs: the Magic
Link email template contains `{{ .Token }}`, and remember the built-in email
service allows ~2 OTP emails/hour until custom SMTP is set.

## 1 · Pairing (Expo Go is fine)

- [ ] A: sign in with a 6-digit code → lands on pairing screen
- [ ] A: enter name → *Create our canvas* → 6-char code appears; share sheet works
- [ ] B: sign in → *Join your person* with the code → lands on the canvas
- [ ] A: header flips from "code · tap to share" to "with <B>" when B arrives
- [ ] Wrong code and already-paired errors show friendly alerts, no crash
- [ ] Deep link: with the app installed + signed in but unpaired, tapping a
      shared `trace://pair?code=ABC123` link opens pairing with the code
      pre-filled (dev build; in Expo Go use the `exp://…/--/pair?code=ABC123` form)

## 2 · The magic (Phase 1 bar: <300ms)

- [ ] **Immersive layout**: the sky fills the whole screen (dimmed) with the
      board floating centered; NOTHING scrolls vertically — top row, tabs,
      board, and the bottom dock all fit on one screen
- [ ] The bottom dock holds brushes + inks + ❤ + ↺ + ⋯; the ⋯ sheet opens
      with Sky & strength / Photo / Replay / Capsule / Share / Clear
- [ ] ❤ in the dock sends a heartbeat (bloom on both phones, mutual-press
      eruption still works)
- [ ] Strokes are smooth and continuous on touch — no broken/choppy segments
      (in a mobile browser too, though judge feel only in Expo Go)
- [ ] A draws → **B sees the stroke appear live, in visibly under a beat**
- [ ] **A lifts their finger → the finished stroke STAYS on B's screen** (it must
      not flash in and vanish on stroke-end — the receive-path promotion bug)
- [ ] The drawer sees their own ink *while* dragging (regression check — this
      was the critical review find)
- [ ] "…is drawing" pill shows on the idle phone while the other draws
- [ ] All 4 free interactions: marker + chalk draw; glow/neon show 🔒 and open
      the paywall
- [ ] ↺ in the dock removes only your own last stroke, on both screens
- [ ] ⋯ → Clear (with confirm) empties both screens
- [ ] Kill and reopen the app → canvas rehydrates fully
- [ ] Airplane mode 30s while B draws → back online → banner clears and the
      missed strokes appear after reconnect

## 2b · Appearance / themes

- [ ] Long-press the **trace** wordmark → Settings sheet slides up
- [ ] Under Appearance, tap **Dusk / Candlelight / Daylight** → the whole app
      (including the open sheet) recolours instantly; the canvas gradient changes
- [ ] Daylight flips to a light theme with a dark status bar; text stays legible
- [ ] **Daylight accent-text legibility** (WCAG audit — now fixed, confirm it
      reads well on real pixels): all daylight text clears AA. `muted` → #6f625c
      (5.4:1); accent *text* uses dedicated darker tokens — `linkText` #c2185b
      (pink links), `goldText` #8f5e00 (🔥 streak, "START HERE"), `inkText`
      #d81b60 (heart-button label) — all ≥4.5:1. Bright fills (paywall badge,
      presence dots) still use the vivid `gold`/`glow`/`ink`. Dusk/Candlelight
      are unchanged (those tokens equal the bright originals there).
- [ ] Close and reopen the app → your chosen theme is remembered
- [ ] **Reduce Motion**: turn on iOS Settings → Accessibility → Motion → Reduce
      Motion (Android: Remove animations) → the heart bloom fades in place (no
      swell/flight), the loading heart holds still, buttons press without bounce,
      sign-in fades without sliding. Turn it off → the motion returns.
- [ ] Sign out and Delete account both work from the sheet (no Android 3-button
      Alert truncation)

## 2c · Heartbeat + daily prompt

- [ ] Empty canvas shows "draw here ✏️" plus today's prompt (same prompt on
      both phones; changes tomorrow)
- [ ] Tap **❤ in the dock** → heart blooms on BOTH phones; the receiving
      phone does a two-beat buzz and shows "… is thinking of you ❤️"
- [ ] **Mutual Heartbeat**: both tap within ~2s of each other → three hearts
      erupt on both screens, double lub-dub, "You pressed at the same time 💥❤️"
- [ ] Partner away from the app → they get the "is thinking of you ❤️" push
      (max 1 per 10 min)
- [ ] Tapping any Trace push (app backgrounded OR fully closed) opens straight
      to the canvas, not a dead/blank screen (dev build only)

## 3 · Photos + replay + streak (Phase 2)

- [ ] A: ⋯ → Draw on a photo → library pick → photo canvas appears active; chip strip shows
      "our canvas" + dated chip on BOTH phones (B via broadcast)
- [ ] B gets the "shared a photo to draw on 📸" push (dev build only, ≤1/10min)
- [ ] Drawing on the photo canvas streams live; strokes on the shared canvas do
      NOT bleed onto the photo canvas and vice versa (canvas-switch checks)
- [ ] Switching chips rehydrates each canvas correctly, no ghost strokes
- [ ] Free tier: second photo same day → paywall (server rejects it too)
- [ ] Free tier skies: 15 of 61 are open (every tab has some); locked ones show
      🔒 over a dimmed-but-visible preview → tapping opens the paywall
- [ ] Free tier: "🔒 Use my photo" background → paywall
- [ ] Free tier capsules: one seal works; a second says "you already have a
      capsule waiting" then opens the paywall; "In 5 years" shows 🔒
      (server-enforced — verified live, not just hidden in the UI)
- [ ] After unlocking: every sky, custom photo backgrounds, and unlimited
      capsules with long horizons all work for BOTH partners
- [ ] ⋯ → Replay: scrubber replays strokes in order on both canvas types;
      free tier caps at last 20 with the unlock chip
- [ ] Both partners draw today → 🔥 1 appears after your stroke ends
- [ ] Camera capture path works on a real device; permission-denied → no crash

## 4 · Widgets (needs `expo run:ios` / `run:android`; set ios.appleTeamId first)

- [ ] Add the Trace widget (small/medium/large) → shows the latest canvas PNG
- [ ] Draw → your own widget updates within ~10s (app-triggered reload)
- [ ] Partner's widget updates on their next app-open or poll (15–30 min)
- [ ] iOS lock-screen rectangular widget renders
- [ ] **Tapping the widget** (home-screen, either OS) opens the app directly
      on your partner's page (`trace://canvas?open=partner`), not just the
      last screen
- [ ] Invisible-ink strokes NEVER appear on any widget

## 5 · Trace Forever (needs store sandbox + RevenueCat keys + webhook secret)

- [ ] Paywall shows the localized store price
- [ ] Sandbox purchase on A → "unlocked for you both ❤️" within seconds
- [ ] B relaunches/refocuses → glow/neon/invisible unlocked with NO purchase
- [ ] Invisible ink: visible while drawing, vanishes on finger-lift on both
      phones, "👁 hold to reveal" shows it again
- [ ] Unlimited photos + full replay after unlock
- [ ] Restore purchase works after reinstall

## 6 · Account deletion (App Store compliance)

- [ ] Long-press the wordmark → Delete account → double confirm → lands on
      sign-in; the same email can sign up fresh afterwards
- [ ] If the partner remains, their canvas survives; if you were the last one,
      everything is gone

## 7 · Leave couple

- [ ] Settings sheet → "Leave this couple…" → confirm → lands on the pairing
      screen; the same account can create/join a new couple immediately
- [ ] Partner's app stops showing your name after their next refresh
- [ ] Wrong code at join now says "That code didn't work…" (and >10 wrong tries
      in an hour says "Too many attempts")

## 8 · Share, together-since, reviewer login

- [ ] Canvas with ink: ⋯ → Share as image → share sheet opens with a PNG of
      the canvas; post it somewhere and check it looks right
- [ ] Settings sheet shows "Drawing together since <month year> · N traces"
- [ ] Sign in as `review@trace.demo` (password path, no email needed) → lands
      on the premium REVIEW couple's canvas (one small seeded heart in the
      corner — the canvas is otherwise clean to draw on)

## 8a · Personal pages ("my page / their page")

- [ ] The strip above the canvas shows **us · ✍️ my page · 💌 <partner>** (+ photo chips)
- [ ] Draw on **my page** → it streams live on THEIR "💌 your-name" tab
- [ ] Open **💌 their page** → read-only: your finger draws nothing, no toolbar,
      no Clear/Undo — just "their page — it appears here as they draw it"
- [ ] While you're on "us", partner draws on their page → a small red dot
      appears on their chip; opening the tab clears it
- [ ] Kill the app while partner draws on their page → reopen → the dot shows
      (cold-start unseen check), and clears when viewed
- [ ] "Us" still works exactly as before — both draw together
- [ ] Notification "left you a trace ❤️": Android shows THE DRAWING as a
      big-picture image in the shade (dev build); tapping it opens the app
      directly on their page
- [ ] iOS note: image preview needs a future notification-service extension;
      title/body + tap-to-their-page still work

## 8b · Canvas backgrounds ("your canvas sky")

- [ ] ⋯ → **Sky & strength** → sheet slides up with the background grid,
      strength slider, and "Use my photo"; the full-screen sky behind the
      board recolors too
- [ ] Pick **Sunset** → the canvas recolors instantly under the sheet, and
      **the partner's canvas changes live** without them touching anything
- [ ] **Every sky is flat**: a smooth gradient with a soft film grain, and
      NOTHING drawn on it — no sun, heart, moon, or stars, on any preset, at
      any hour. Your ink is the only mark on the canvas.
- [ ] Drag the **strength** slider → the sky fades toward the theme ground in
      real time; at minimum it stays a whisper (never fully vanishes)
- [ ] **Use my photo** → library pick → your photo becomes the sky at the
      chosen strength; partner sees it too; **Remove** returns to the preset
- [ ] Kill and reopen the app → the chosen sky + strength are remembered
- [ ] Photo canvases (drawn-on photos) have no Sky entry in ⋯ — the photo is
      the canvas
- [ ] Strokes still stream live over the new skies

## 9 · Phase 5 — Time Capsules + living ink

- [ ] Draw something → ⋯ → Seal a time capsule → sheet opens
- [ ] Pick "In a week", add a note, **Seal it 🎁** → toast shows the open date
- [ ] The ⏳ pill appears above the canvas ("your capsule · opens in 7 days")
- [ ] Partner's phone shows the same pill on next app open ("<name>'s capsule…")
- [ ] Neither phone can see the sealed drawing anywhere (not even the author)
- [ ] When due (test: seal "In a week", then adjust `opens_at` in the DB to the
      past): pill turns gold "🎁 a time capsule is ready — tap to open" → the
      full-screen reveal shows the drawing + note; haptic heartbeat plays
- [ ] After opening once, the gold pill goes away (opened_at set)
- [ ] **No stars, ever**: open the app after 21:00 on an empty canvas — the sky
      stays flat (the night constellation was removed on purpose)
- [ ] Week-old strokes look imperceptibly fuller than fresh ones (ink bloom,
      max +8% — verify no layout/drawing weirdness rather than the effect itself)

## When something fails

Grab the red-box/console error (`npx expo start` terminal) or, for backend
issues, the Supabase dashboard → Logs (edge functions / realtime / postgres),
and file it with the step number above.
