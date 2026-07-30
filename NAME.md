# NAME.md — changing the name, if you decide to

[LEGAL.md §1](LEGAL.md) found the one verified legal conflict in this project:
the App Store already has **Trace | Leave A Trace**, whose subtitle is
essentially your tagline, plus several other Trace apps including one in the
drawing space.

This file exists so the decision is cheap. **Renaming before launch is about
20 minutes of find-and-replace. Renaming after launch costs your reviews, your
ranking, your URL and your word of mouth.** That asymmetry is the whole reason
to decide now rather than later.

Nothing here says you *must* rename. It says: check properly, then choose on
purpose.

---

## 1 · What makes a name defensible

Counter-intuitive but true: **a weirder name is easier to protect.** Trademark
strength runs roughly:

1. **Invented** (Spotify, Kodak) — strongest
2. **Arbitrary** — a real word unrelated to the product (Apple, for computers)
3. **Suggestive** — hints at what it does (Netflix)
4. **Descriptive** ("Couples Drawing Widget") — very weak, often unregistrable
5. **Generic** — impossible

"Trace" sits between arbitrary and descriptive *for a drawing app* — tracing is
literally a drawing activity, which is exactly why Morpholio Trace exists. That
makes it both harder to own and easier to collide with.

Other things that matter more than they sound:

- **Two syllables or fewer**, spellable after hearing it once. Her friends will
  type it from memory.
- **The .com or a clean .app is gettable** — if every domain is squatted, that's
  a signal the name is crowded.
- **It survives being said out loud.** "Send me a ___" should sound natural,
  because that's the sentence that spreads the app.

## 2 · The check — four free searches, ~20 minutes

Do all four for any candidate. A name that passes three and fails one is a
name you'll regret.

1. **App Store**: search the exact word. Look for anything in Social,
   Lifestyle, Photo & Video, or drawing. Category proximity matters more than
   exact-name matching.
2. **Google Play**: same search.
3. **USPTO**: [tmsearch.uspto.gov](https://tmsearch.uspto.gov) — the word in
   **class 9** (software) and **class 42** (SaaS). A live registration in your
   class by someone else is a hard stop.
4. **Domain**: is `<name>.com` or `<name>.app` free, or squatted-and-parked?

Worked examples, so you can see the process rather than just the advice — I ran
step 1–2 on a couple of obvious ink-themed candidates:

| Candidate | Result |
|---|---|
| **Inkling** | ❌ Taken — a business/publishing platform on Play, plus a drawing game |
| **Skrawl** | ❌ Taken — a drawing-and-guessing game on Play |

Two out of two obvious ones were gone, which is the normal result and the
reason to check before falling in love.

## 3 · Directions worth exploring

Not prescriptions — the name is yours. But the strongest options for *this*
product tend to be:

- **Compound the intimacy, not the mechanic.** The app isn't about tracing;
  it's about someone being there. Names about *two-ness* or *presence* age
  better than names about drawing, and collide less.
- **Invent a spelling.** A coined word is the only reliably ownable class, and
  it makes the domain and the handles available in one shot.
- **Keep the tagline even if the name changes.** "Leave me a trace" is lovely,
  and as a *slogan* it's lower risk than as a name — though if you keep it
  verbatim next to a competitor literally called "Leave A Trace", get a
  lawyer's read on that specific pairing.

If you want, tell me the direction you like and I'll generate and pre-screen a
shortlist against steps 1–2.

## 4 · The rename, mechanically

**What actually has to change** — every user-visible string. Counted by
occurrence, so you know the size of the job:

| File | Hits | What it is |
|---|---|---|
| `docs/terms.html` | 13 | legal page |
| `app/canvas.tsx` | 13 | mostly `trace.seen.*` storage keys + copy |
| `docs/privacy.html` | 8 | legal page |
| `docs/index.html` | 8 | landing page |
| `app.json` | 8 | app name, slug, scheme |
| `store/metadata/*.txt` | 16 | listing copy + review notes |
| `supabase/templates/magic-link.html` | 4 | the sign-in email |
| `app/pair.tsx`, `app/paywall.tsx` | 7 | in-app copy |
| `tools/make_store_frames.py` | 4 | screenshot captions |
| `src/components/ui.tsx` | 1 | **the wordmark** — split as `tra` + `ce`, so a new name needs its own split |

Order of operations:

1. `app.json` — `name`, `slug`, and **`scheme`** (the `trace://` deep link).
   Changing the scheme means the widget deep links and `trace://pair?code=`
   change too: update `targets/widget/index.swift`,
   `TraceWidgetProvider.kt`, and `useNotificationRouting.ts` to match.
2. `src/components/ui.tsx` — the wordmark's two-tone split.
3. In-app copy, the magic-link email, then `docs/` and `store/metadata/`.
4. Regenerate store frames (`python3 tools/make_store_frames.py`).
5. Regenerate icons if the mark changes (`python3 tools/make_icons.py`).

**What NOT to change** — invisible to users, expensive to move:

- **`com.digirafthub.trace`** (iOS bundle id / Android package). Users never
  see it; changing it after publishing means a *new app* with zero reviews.
  Leave it alone even if the name changes.
- **`group.com.digirafthub.trace`** (the widget App Group) — same reasoning,
  and it's hardcoded in four places.
- **`trace_` database prefixes** and the `trace:couple:` realtime topic — these
  are backend namespacing, not branding. `src/lib/backend.ts` is the only file
  that knows them.
- **The GitHub repo name.** Cosmetic; rename it whenever, or never.

So: user-facing rename, backend identity untouched. That's the design that
makes this cheap, and it's why doing it now costs an afternoon at most.
