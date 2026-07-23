# Sentry setup — know when it breaks on her phone

Right now, if Trace crashes on a real device, **nobody finds out**. The
ErrorBoundary catches it and shows a calm "try again" screen instead of a blank
one, but that's it — the crash itself vanishes into thin air unless someone
happens to tell you. Sentry closes that gap: every caught render error and
native crash gets reported, with a stack trace, automatically.

The code side is **fully wired already** — installed, configured, and
listening. It does nothing until you add one key. That's the only step left,
and it's on you because it needs your own free account.

---

## What's already done (nothing to build)

- `@sentry/react-native` installed and the Expo config plugin registered in
  `app.json`.
- `src/lib/sentry.ts` — `initSentry()` runs once at app start; every function in
  the file **no-ops silently** if `EXPO_PUBLIC_SENTRY_DSN` is unset, so leaving
  it blank is 100% safe (that's the state the repo is in today).
- `src/components/ErrorBoundary.tsx` — the app-wide crash catcher — reports
  every caught error to Sentry via that same seam.
- `app/_layout.tsx` — the root component is wrapped for native crash context
  (also a no-op without a DSN).

## What you need to do (5 minutes)

1. Go to **https://sentry.io** → sign up (free tier: 5,000 errors/month, no
   card needed).
2. Click **Create Project**.
3. Platform: choose **React Native**. Name it `trace`.
4. Sentry shows you a **DSN** — a URL that looks like
   `https://abc123@o000000.ingest.sentry.io/000000`. Copy it.
5. Open `.env` in the repo (not `.env.example`) and add:
   ```
   EXPO_PUBLIC_SENTRY_DSN=<the DSN you copied>
   ```
6. Restart `npx expo start` (env vars are read at bundle time, so a running
   Metro instance won't pick up the change).

That's it — Sentry is now live. Trigger a test: temporarily add
`throw new Error('sentry test')` inside any screen's render, reload, confirm
the crash shows your recovery card, then check the Sentry dashboard — the
error should appear within seconds. Remove the test line afterward.

## Optional: readable stack traces (source maps)

Without this, Sentry still reports every crash — you just see minified
JS instead of your real file/line numbers. Worth doing once you're building
with EAS:

1. Sentry dashboard → **Settings → Auth Tokens** → create one with
   `project:releases` scope.
2. Find your **org slug** and **project slug** (Settings → General, top of the
   page URL: `sentry.io/organizations/<org-slug>/projects/<project-slug>/`).
3. Set these as **EAS secrets** (never commit them):
   ```bash
   eas secret:create --name SENTRY_ORG --value <org-slug>
   eas secret:create --name SENTRY_PROJECT --value <project-slug>
   eas secret:create --name SENTRY_AUTH_TOKEN --value <token> --type sensitive
   ```
   The config plugin (`app.json`) already looks for these three env vars
   automatically during `eas build` — no other change needed.

## Why this is safe to leave wired, DSN or not

Every exported function in `src/lib/sentry.ts` checks for the DSN first and
returns immediately if it's missing. Nothing in the app behaves differently,
no extra network calls happen, and no native module misbehaves — the SDK is
simply never initialized. You can merge this today and add the DSN whenever
you're ready; there's no rush and no risk either way.
