# BUILD.md — from Expo Go to a real app on both phones

Expo Go got you the magic: two phones, one canvas, live strokes. It cannot
give you **push notifications, the home-screen widgets, `trace://` deep links,
the camera, or purchases** — those need a *dev build*, which is your own app
binary with your own native code in it.

This is the whole path, in order. Do §1 and §2 today; they cost nothing and §2
fixes a bug that has been silent since day one. §3 is free. §4 costs $99/yr.

> Every command runs from the `trace` folder (the one with `package.json`).
> On Windows use PowerShell or Command Prompt; on Mac use Terminal.

---

## 1 · One-time: the EAS account

```bash
npm install -g eas-cli
eas login
```

A free Expo account is enough for everything in this file. You'll know it
worked when `eas whoami` prints your username.

---

## 2 · `eas init` — the single highest-value command in this repo

**Push notifications have never worked, on any device, for anyone.** Not a bug
in the notification code — the app has no EAS project id, so
`registerPushToken()` (`src/lib/notifications.ts`) logs
`[trace] push disabled: no EAS projectId` and returns without registering.
Everything downstream — "she left you a trace ❤️", the heartbeat push, the
photo push — has been dead code on real phones.

```bash
eas init
eas update:configure
```

What they change in `app.json`:
- `eas init` writes `extra.eas.projectId` — this is what turns push on.
- `eas update:configure` replaces the `REPLACE_WITH_EAS_PROJECT_ID` placeholder
  in `updates.url`, which turns OTA updates on (§7).

**Commit both changes** — they belong in git:

```bash
git add app.json && git commit -m "chore: eas project id" && git push
```

You'll know it worked when `app.json` contains a real uuid in
`extra.eas.projectId` and no longer says `REPLACE_WITH_EAS_PROJECT_ID`.

---

## 3 · Android dev build (free, no developer account, ~15 min)

Start here even if you're an iPhone household — it's free, it's fast, and it
proves push and widgets work before you spend a dollar on Apple.

```bash
eas build --profile development --platform android
```

The build runs in Expo's cloud (~10–15 min). When it finishes, EAS prints a
URL and a QR code:

1. Open that URL **on the Android phone** → download the `.apk` → install it
   (Android will ask you to allow installs from your browser — that's normal).
2. Back on your computer: `npx expo start`
3. On the phone, open the **Trace** app you just installed (NOT Expo Go) and
   scan the QR / enter the URL.

You'll know it worked when the app opens with your dev-server code AND, unlike
Expo Go, a push notification arrives when your partner draws.

---

## 4 · iOS dev build ($99/yr Apple Developer)

### 4a · Enroll and get your Team ID
developer.apple.com → Account → Membership → copy the 10-character **Team ID**.

### 4b · Put it in `app.json`

```json
"ios": {
  "bundleIdentifier": "com.digirafthub.trace",
  "appleTeamId": "XXXXXXXXXX",
  ...
}
```

Commit this too.

### 4c · The App Group — do not skip this

The widget and the app talk to each other through an **App Group**. The app
writes the snapshot URL into it; the widget reads it out. If the group doesn't
exist in your Apple account, the app still builds and runs — **the widget just
silently shows "leave me a trace" forever.** That's the single most confusing
failure in this whole setup, so:

developer.apple.com → Certificates, Identifiers & Profiles → **Identifiers**

1. **App Groups** → `+` → create `group.com.digirafthub.trace`
   (this exact string — it's hardcoded in four files).
2. **App IDs** → `com.digirafthub.trace` → enable **App Groups** capability →
   tick the group above.
3. Same again for the widget's App ID, `com.digirafthub.trace.TraceWidget`
   (EAS creates it on first build — if it isn't there yet, run the build once,
   then come back and tick the group, then rebuild).

### 4d · Build

```bash
eas build --profile development --platform ios
```

EAS will offer to generate your signing credentials — **say yes to all of it**
(distribution certificate, provisioning profiles, and the **APNs key**; that
last one is what carries your push notifications). Install via the link EAS
prints, then `npx expo start` and open from the Trace app.

On a Mac with Xcode you can instead run `npx expo prebuild --clean` then
`npx expo run:ios`, which is faster to iterate but needs the same Team ID and
App Group.

---

## 5 · Push credentials, in one paragraph

You don't hand-configure these. On the first iOS build EAS creates an **APNs
key** for you; on the first Android build it wires **FCM v1**. Both are stored
in your Expo account and reused. The only way to get this wrong is to decline
the prompt — if push still doesn't arrive on iOS, run
`eas credentials -p ios` and confirm a Push Key is listed.

---

## 5b · Redeploy the snapshot renderer before you judge the widget

The widget shows a PNG rendered server-side by the `render-snapshot` edge
function. The copy currently deployed on the shared project is older than this
repo: it paints Dusk's gradient on **every** canvas, so a couple using Sunset
or Midnight would see the right drawing on the wrong sky.

`supabase/functions/render-snapshot/index.ts` is fixed and tested here — it now
renders the couple's chosen sky at their chosen strength. Deploy it before you
evaluate the widget:

```bash
supabase link --project-ref hnjjxvhutpgcdwyzmito
supabase functions deploy render-snapshot
```

On the shared project the live function is named `trace-render-snapshot` and
uses `trace_`-prefixed tables, so either deploy under that name with the
prefixes applied, or — better — do the move in
[SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md) first, after which this file
deploys as-is with no edits. (I didn't push this from the container on purpose:
the sky table is 11k characters, and a single mistyped colour would be a wrong
sky that no test could see.)

## 6 · What to re-test once you're on a dev build

These are the checks that were impossible in Expo Go — from `TESTING.md`:

- **§2c** — partner gets "is thinking of you ❤️" push; tapping any Trace push
  (backgrounded *or* fully closed) opens the canvas, not a blank screen.
- **§8a** — the "left you a trace ❤️" push shows **the drawing itself** as a
  big picture on Android, and tapping it opens straight to their page.
- **§3** — camera capture for photo canvases.
- **§4** — add the widget, draw, watch your own widget update within ~10s; then
  **tap the widget** and confirm the drawing opens full screen. Check the
  widget's background matches the sky you chose in the app (needs §5b).
- **§5** — purchases (needs `REVENUECAT.md` done first).

---

## 7 · After launch: OTA updates

Once §2 is done you can ship JavaScript fixes in minutes instead of waiting on
App Review:

```bash
eas update --branch production -m "fix: dock spacing on small screens"
```

Users get it on their next app open. **But** anything that touches native code
needs a full rebuild + resubmission: new native packages, app icons, splash,
permissions, the widget, deep-link scheme, or anything in `app.json`'s `ios`/
`android`/`plugins` blocks. JS, styles, copy, and layout are all OTA-able.

---

## Cheat sheet

| I want to… | Command |
|---|---|
| Turn push on (once) | `eas init` |
| Turn OTA on (once) | `eas update:configure` |
| Android test build | `eas build --profile development --platform android` |
| iOS test build | `eas build --profile development --platform ios` |
| Store-ready build | `eas build --profile production --platform all` |
| Ship a JS fix | `eas update --branch production -m "…"` |
| See build status | `eas build:list` |

## When it fails

- **"No development build installed"** — you scanned the QR with Expo Go.
  Open the Trace app instead.
- **Build fails on iOS with a signing error** — `appleTeamId` is missing or
  wrong in `app.json`.
- **Widget shows the empty state forever** — the App Group (§4c), on *both*
  identifiers.
- **Push still silent** — check `app.json` has `extra.eas.projectId`; that's
  §2, and it's the usual culprit.
