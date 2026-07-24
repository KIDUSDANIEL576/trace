# Runbook — get Trace onto your phones

Two tasks. Do #2 first (works today in Expo Go). Do #4 when you want push /
camera / widgets. The JS app is **Metro-bundle-verified** (1,709 modules,
every `@/` import resolves), so `expo start` will load — no cryptic first-run
crash to fight.

---

## Task 2 · First stroke (Expo Go — no build, ~15 min)

Prereq: the Magic Link email template has `{{ .Token }}` (else the code never
arrives). Full click-by-click steps — template + Resend SMTP — are in
[EMAIL_SETUP.md](EMAIL_SETUP.md). Do Part 1 before this; Part 2 before you demo
to anyone.

Get the code onto your computer (either way):
- **No terminal:** github.com/KIDUSDANIEL576/trace → green **Code** button →
  **Download ZIP** → unzip it (e.g. onto your Desktop).
- **Terminal:** `git clone https://github.com/KIDUSDANIEL576/trace`

**Easiest launch — double-click (no typing):**
- **Windows:** open the `trace` folder → double-click **`start-windows.bat`**.
  (Phones on different Wi-Fi and the QR won't connect? Use
  **`start-windows-tunnel.bat`** instead.)
- **Mac:** right-click **`start-mac.command`** → **Open** (first time only, to
  clear the security prompt).

The launcher runs from the right folder, installs everything on first run,
creates `.env` for you, and shows the QR code. That's the whole setup.

**Or by hand in a terminal:**
```bash
cd trace
npm install
cp .env.example .env          # already filled with the live backend
npx expo start                # a QR code appears
```

On BOTH phones: install **Expo Go** (App Store / Play), open it, scan the QR
(iOS: Camera app; Android: scan inside Expo Go).

1. Phone A: sign in (check email for the 6-digit code) → *Create our canvas* →
   share the code.
2. Phone B: sign in → *Join your person* → paste the code.
3. Draw on one. It appears on the other in well under a second.

Then run **TESTING.md §1–3** and send me anything that misbehaves, with the
step number.

**If `expo start` errors:** almost always a stale cache — `npx expo start -c`.
Different Wi-Fi on the two phones? add `--tunnel`.

Works in Expo Go: drawing, realtime, themes, heartbeat, photos (library),
replay, share, prompts, streak. **Needs a dev build (Task 4):** push
notifications, camera capture, the home-screen widgets.

---

## Task 4 · Dev builds (push + camera + widgets)

One-time account: `npm i -g eas-cli` then `eas login` (free Expo account).

### 4a. `eas init` — do this first (fixes silent push)

```bash
eas init          # links the project, writes expo.extra.eas.projectId to app.json
```

Without this, push-token registration **no-ops** — the app now logs
`[trace] push disabled: no EAS projectId…` so you'll see it, but `eas init` is
the fix. Commit the app.json change it makes.

### 4b. Android dev build (free, no Mac)

```bash
eas build --profile development --platform android   # ~10-15 min in the cloud
```

Install the resulting APK on your Android phone, then `npx expo start` and open
it from the dev build (not Expo Go). Push + camera + widget now work.

### 4c. iOS dev build (needs an Apple Developer account)

1. Add your Team ID to `app.json` → `"ios": { "appleTeamId": "XXXXXXXXXX" }`
   (developer.apple.com → Membership).
2. `eas build --profile development --platform ios` (or `npx expo run:ios` on a
   Mac with Xcode).

### 4d. See the widget

After a dev build, long-press the home screen → add the **Trace** widget.
Draw → your widget updates within ~10s; your partner's on their next
app-open/poll.

### 4e. `eas update:configure` — turn on OTA (ship JS fixes without a store review)

`expo-updates` is already installed and app.json/eas.json are wired for it, but
the update URL still has a placeholder (`REPLACE_WITH_EAS_PROJECT_ID`) until you
run `eas init` (4a). After that:

```bash
eas update:configure   # swaps the placeholder for your real project id
```

From then on, to ship a JS-only fix (no native code change) to everyone on a
build without waiting on App Store/Play review:

```bash
eas update --branch production --message "fix: whatever you fixed"
```

Users get it the next time they fully close and reopen the app (checks on
launch, `fallbackToCacheTimeout: 0` — never blocks the launch waiting on it).
Use `--branch development` / `--branch preview` to push to just those builds
first. Anything that touches native code (new native module, Info.plist/
AndroidManifest change) still needs a real `eas build`, not an OTA update.

---

## What unlocks what

| Capability | Expo Go | Android dev build | iOS dev build |
|---|---|---|---|
| Draw / realtime / themes / heartbeat / share | ✅ | ✅ | ✅ |
| Photo from **library** | ✅ | ✅ | ✅ |
| Push notifications | ❌ | ✅ (after `eas init`) | ✅ |
| **Camera** capture | ❌ | ✅ | ✅ |
| **Home-screen widget** | ❌ | ✅ | ✅ |

Everything on this list has been verified to bundle; the ❌ items simply can't
run in Expo Go's sandbox — nothing is broken, they just need the dev build.
