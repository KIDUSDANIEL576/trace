# STORE.md — putting Trace in front of humans

Everything you paste into App Store Connect and Play Console, plus what has to
be true before you press Submit. The actual text lives in `store/metadata/` so
you can copy it straight across.

| File | What it's for |
|---|---|
| `store/metadata/app-store.txt` | Name, subtitle, promo text, description, keywords, URLs, what's-new |
| `store/metadata/google-play.txt` | Name, short + full description, category, tags |
| `store/metadata/review-notes.txt` | Reviewer login and instructions — **paste this or you will be rejected** |
| `store/metadata/privacy-labels.txt` | The exact privacy-label / data-safety answers |

---

## 1 · Publish the docs site (5 minutes, do it first)

Apple and Google both require a **privacy policy URL** that loads publicly, and
Apple wants a **support URL** too. You already have a styled site in `docs/`:

GitHub → repo **Settings → Pages** → Source: *Deploy from a branch* →
Branch: `main`, folder `/docs` → Save.

About a minute later:
- Landing / support: `https://kidusdaniel576.github.io/trace/`
- Privacy: `https://kidusdaniel576.github.io/trace/privacy.html`
- Terms: `https://kidusdaniel576.github.io/trace/terms.html`

Two things to check: the repo must be **public** for these to load for a
reviewer, and the footer "Support" link currently points at the GitHub repo —
fine, as long as that's public too. A custom domain is optional; you can add a
`CNAME` later without breaking the store listing.

## 2 · Screenshots — the one thing that isn't ready

`store/out/` already holds six correctly-sized frames (1290×2796) and the Play
feature graphic (1024×500) — but they are **styled placeholders**, not real
captures. `store/raw/` is empty.

Shipping placeholder screenshots is a genuine risk: Apple rejects listings
whose screenshots don't depict the actual app, and even if they pass, they're
the first thing a buyer sees.

The fix is already scripted — capture six real moments on a phone, drop them in
`store/raw/` as `screen-1.png` … `screen-6.png`, and run the generator. The
six moments and the exact command are in **[store/README.md](store/README.md)**.

The one that sells the app is #6: **your real home screen with the Trace widget
on it**, a drawing from your partner sitting there among your apps. Take that
one carefully.

Optional but worth it: a 30-second screen recording of the Replay screen makes
an excellent App Preview video.

## 3 · Fill in the listings

Create the app in each console (bundle id / package `com.digirafthub.trace`),
then paste from `store/metadata/`. Notes:

- **Category**: Lifestyle. (Social Networking is defensible, but Trace has no
  network — it's two people.)
- **Age rating**: 4+ / Everyone. No public user content, no chat with
  strangers, no ads.
- **Price**: Free, with one non-consumable in-app purchase (see
  `REVENUECAT.md`). Apple requires the IAP to be submitted *with* the build.

## 4 · Privacy labels

Copy `store/metadata/privacy-labels.txt` field by field. The short version:
you collect an email (to sign in), the photos and drawings people make, and
purchase state; you track nobody, you show no ads, and you share with nobody
beyond your own service providers. Add crash data only if you've enabled
Sentry.

If you ever change what the app collects, update `PRIVACY.md`,
`docs/privacy.html`, **and** the labels together — mismatches between them are
a rejection reason.

## 5 · Review notes — the highest-leverage paragraph you'll write

Paste `store/metadata/review-notes.txt` verbatim. It gives the reviewer:

1. The password login (`review@trace.demo` / `trace-review-2026!`) — because
   normal sign-in emails a code they can never receive. **Without this, they
   cannot open your app and it is an automatic rejection.**
2. That **no second device is needed** — the demo account is already paired
   with a partner and has drawings, so a reviewer with one phone can see
   everything. Reviewers reject "requires a second user" apps all the time
   when they can't test them.
3. That the account is premium, so paid features are reviewable without a
   purchase.
4. Where account deletion is, for guideline 5.1.1(v).

Before submitting, sign in as the reviewer yourself and confirm it still works.
If you've moved to a new Supabase project, that account must be re-seeded —
`SUPABASE_MIGRATION.md` §6 has the SQL.

## 6 · Account deletion (guideline 5.1.1(v)) — already done

Apple requires in-app account deletion for any app with accounts. Trace has it
in two places: Settings (long-press the wordmark) and the pairing screen, so
someone who never paired can still delete. It removes the account server-side
along with drawings and uploaded photos; if you were the last member of a
couple, the couple's whole history goes too. Nothing to build — just tell the
reviewer where it is (the notes do).

## 7 · Submit checklist

- [ ] `docs/` published; privacy + support URLs load in a private window
- [ ] Six **real** screenshots in `store/out/` (+ feature graphic for Play)
- [ ] Listings pasted from `store/metadata/`
- [ ] Privacy labels filled to match `PRIVACY.md`
- [ ] Review notes pasted; reviewer login verified working *today*
- [ ] `trace_forever` IAP created, active, and attached to the submission
- [ ] Production build uploaded (`eas build --profile production --platform all`)
- [ ] `app.json` version is `1.0.0`
- [ ] TestFlight / Internal testing run on a real device before public release

## Known gap, for the record

There's no "download my data" export. GDPR Article 20 covers portability, and
deletion is implemented but export isn't. It is **not** an App Store blocker
and not urgent for a two-person drawing app, but if you ever market into the
EU seriously, that's the thing to build.
