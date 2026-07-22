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

## 2 · The magic (Phase 1 bar: <300ms)

- [ ] A draws → **B sees the stroke appear live, in visibly under a beat**
- [ ] The drawer sees their own ink *while* dragging (regression check — this
      was the critical review find)
- [ ] "…is drawing" pill shows on the idle phone while the other draws
- [ ] All 4 free interactions: marker + chalk draw; glow/neon show 🔒 and open
      the paywall
- [ ] Undo removes only your own last stroke, on both screens
- [ ] Clear (with confirm) empties both screens
- [ ] Kill and reopen the app → canvas rehydrates fully
- [ ] Airplane mode 30s while B draws → back online → banner clears and the
      missed strokes appear after reconnect

## 2b · Appearance / themes

- [ ] Long-press the **trace** wordmark → Settings sheet slides up
- [ ] Under Appearance, tap **Dusk / Candlelight / Daylight** → the whole app
      (including the open sheet) recolours instantly; the canvas gradient changes
- [ ] Daylight flips to a light theme with a dark status bar; text stays legible
- [ ] Close and reopen the app → your chosen theme is remembered
- [ ] Sign out and Delete account both work from the sheet (no Android 3-button
      Alert truncation)

## 2c · Heartbeat + daily prompt

- [ ] Empty canvas shows "draw here ✏️" plus today's prompt (same prompt on
      both phones; changes tomorrow)
- [ ] Tap **❤ Send a heartbeat** → heart blooms on BOTH phones; the receiving
      phone does a two-beat buzz and shows "… is thinking of you ❤️"
- [ ] **Mutual Heartbeat**: both tap within ~2s of each other → three hearts
      erupt on both screens, double lub-dub, "You pressed at the same time 💥❤️"
- [ ] Partner away from the app → they get the "is thinking of you ❤️" push
      (max 1 per 10 min)

## 3 · Photos + replay + streak (Phase 2)

- [ ] A: ＋ Photo → library pick → photo canvas appears active; chip strip shows
      "our canvas" + dated chip on BOTH phones (B via broadcast)
- [ ] B gets the "shared a photo to draw on 📸" push (dev build only, ≤1/10min)
- [ ] Drawing on the photo canvas streams live; strokes on the shared canvas do
      NOT bleed onto the photo canvas and vice versa (canvas-switch checks)
- [ ] Switching chips rehydrates each canvas correctly, no ghost strokes
- [ ] Free tier: second photo same day → paywall (server rejects it too)
- [ ] ▶ Replay: scrubber replays strokes in order on both canvas types;
      free tier caps at last 20 with the unlock chip
- [ ] Both partners draw today → 🔥 1 appears after your stroke ends
- [ ] Camera capture path works on a real device; permission-denied → no crash

## 4 · Widgets (needs `expo run:ios` / `run:android`; set ios.appleTeamId first)

- [ ] Add the Trace widget (small/medium/large) → shows the latest canvas PNG
- [ ] Draw → your own widget updates within ~10s (app-triggered reload)
- [ ] Partner's widget updates on their next app-open or poll (15–30 min)
- [ ] iOS lock-screen rectangular widget renders
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

- [ ] Canvas with ink shows the ↗ share chip (bottom-left) → share sheet opens
      with a PNG of the canvas; post it somewhere and check it looks right
- [ ] Settings sheet shows "Drawing together since <month year> · N traces"
- [ ] Sign in as `review@trace.demo` (password path, no email needed) → lands
      on the premium REVIEW couple's canvas with seeded strokes

## When something fails

Grab the red-box/console error (`npx expo start` terminal) or, for backend
issues, the Supabase dashboard → Logs (edge functions / realtime / postgres),
and file it with the step number above.
