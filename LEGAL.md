# LEGAL.md — what could actually bite you, ranked

**I'm not a lawyer and this isn't legal advice.** It's a risk register: what I
could verify, what I couldn't, and which items are worth paying a professional
for. Where I say "a lawyer should look at this," I mean it.

The short version, because the ranking is the useful part:

| # | Risk | Real? | Cost to fix now |
|---|---|---|---|
| 1 | **The name "Trace"** | **Yes — verified conflict** | Free if you rename before launch |
| 2 | Copying a competitor's *expression* | Low, and in your control | Free — just don't |
| 3 | Privacy law (GDPR/CCPA/COPPA) | Moderate, mostly handled | Small |
| 4 | Personal liability (no company) | Moderate once money moves | ~$100–500 |
| 5 | **Patents** | Low but genuinely unknowable | $2k+ to actually clear |
| 6 | Font/dependency licences | Was a real gap — **fixed today** | Done |

---

## 1 · The name is your biggest real risk

This is the one I'd act on, and it's the cheapest to fix *before* you launch.

Searching the App Store turns up several live apps called Trace, including one
that is uncomfortably close to yours:

- **[Trace | Leave A Trace](https://apps.apple.com/qa/app/trace-leave-a-trace/id6450400543)**
  — a location-based *social* app. Same name, and its subtitle is essentially
  your tagline ("Leave me a trace").
- [Trace App](https://apps.apple.com/us/app/trace-app/id6751985042) (habits),
  [Trace](https://apps.apple.com/us/app/trace/id289446636) (a game),
  [Trace - AI Calendar](https://apps.apple.com/us/app/trace-ai-calendar-planner/id6503812022),
  [Morpholio Trace](https://apps.apple.com/us/app/morpholio-trace-sketch-cad/id547274918)
  (drawing/CAD — same *category of activity* as you, which matters more than
  the others).

Why this matters more than patents: trademark disputes are common, cheap for
the other side to start, and Apple will pull an app on a credible complaint
without waiting for a court. The test is roughly "would a normal person be
confused about who made this" — and a couples app called Trace whose slogan is
"leave me a trace", next to a social app called "Trace | Leave A Trace", is a
harder argument than you'd want to make.

**What to do, in order:**

1. Search [tmsearch.uspto.gov](https://tmsearch.uspto.gov) for "TRACE" in
   class 9 (software) and 42 (SaaS). Free, 20 minutes.
2. Assume the bare word "Trace" is unregistrable for you — it's short, common
   and crowded. A distinctive name is *easier* to protect, not harder.
3. Strongly consider a modified mark: a compound ("Trace Us", "TraceHeart"),
   an invented spelling, or a different word entirely. Renaming pre-launch
   costs you a find-and-replace; renaming post-launch costs your reviews,
   your URL, your store ranking and your word of mouth.
4. Whatever you land on: check the App Store, Play, the USPTO, and domain
   availability *together* before you commit.

The repo makes renaming cheap on purpose — the name lives in `app.json`,
`store/metadata/`, `docs/`, and the wordmark component. The bundle id
(`com.digirafthub.trace`) is invisible to users and can stay.

## 2 · "An app already does this"

You saw one. There are many:
**[noteit](https://apps.apple.com/us/app/noteit-widget-drawing-couples/id1623343303)**
(draw → lands on your partner's home-screen widget — closest to yours),
[Locket](https://apps.apple.com/us/app/locket-widget/id1600525061) (photos to a
widget), Paint Love, Between, Couple. Directories list
[200+ couples-widget apps](https://appshunter.io/ios/topics/couples-widget).

**This is not, by itself, a legal problem.** Copyright protects *expression* —
their code, their artwork, their words, their specific look. It does not
protect the *idea* of "draw something and it appears on your partner's home
screen." Competing with an existing app is ordinary and legal; the entire app
economy is people building better versions of the same idea.

What would turn it into a problem — all of it in your control:

- **Don't copy their code**, including from tutorials or teardowns of it.
- **Don't copy their copy.** Not their App Store description, their onboarding
  wording, or their feature names. Yours is already written from scratch in
  `store/metadata/`.
- **Don't copy their trade dress** — icon, colour scheme, layout — closely
  enough that someone could mistake one for the other.
- **Don't use their name in your marketing**, including "better than noteit"
  or their name in your keyword field. That one gets apps pulled.

Trace is genuinely differentiated anyway: live stroke-by-stroke streaming (not
send-a-finished-note), personal pages, time capsules, 61 skies, one-time
pricing instead of a subscription. Lean on that.

**Keep a record of independent creation.** You already have one and should
preserve it: this repo's full commit history, dated, showing the app built up
from a spec (`CLAUDE.md`) with reasoning in the commit messages. That is
exactly the evidence that answers "did you copy this?" — so **don't
force-push away history or squash the repo flat**, and keep it backed up.

## 3 · Privacy law — mostly already handled, two gaps

You collect email, photos, drawings and purchase state, from couples who may
be anywhere in the world. What you have:

- A privacy policy (`PRIVACY.md` + `docs/privacy.html`) and terms
  (`docs/terms.html`)
- Real account deletion, server-side, reachable in-app (App Store 5.1.1(v))
- Data encrypted in transit; per-couple row-level security verified by tests
- Store privacy labels pre-written in `store/metadata/privacy-labels.txt`

Two genuine gaps:

- **No data export.** GDPR Article 20 (portability) gives EU users the right
  to get their data in a machine-readable form. Deletion is implemented,
  export isn't. Not an App Store blocker; becomes real if you market into the
  EU. A "download my drawings as JSON" endpoint would close it.
- **Age.** COPPA (US) and GDPR-K (EU) impose serious extra duties for under-13
  (or under-16 in parts of the EU) users. Your terms should state the app is
  for adults, your store rating should not target children, and you should not
  market to teenagers. Worth one explicit line in the terms if it isn't there.

Also: your privacy policy, your store privacy labels and what the code
actually does must agree. Mismatches between them are a common enforcement
trigger — and `store/metadata/privacy-labels.txt` was written from the code
specifically so they match.

## 4 · Personal liability — the cheapest real protection

Right now, if something goes wrong, it goes wrong at *you* personally.

Forming a company (LLC in the US, or your local equivalent) puts a wall
between the business and your savings. It typically costs $100–500 and an
afternoon, and it's the single highest-leverage thing on this page after the
name. Do it **before** you take money — the App Store payout account should
belong to the entity from day one, and moving it later is a hassle.

An accountant or a small-business lawyer will do this faster than you will.
Ask them about the tax treatment too; that part is genuinely local.

Your `docs/terms.html` already includes the usual as-is disclaimer and
liability limits. Those clauses are only as strong as the entity behind them.

## 5 · Patents — the thing you asked about, and the honest answer

**I cannot clear you on patents, and neither can any tool you run yourself.**
A real freedom-to-operate opinion means a patent attorney searching claims and
reading them against your implementation. It costs a few thousand dollars.

What I can tell you honestly:

- Software patents on "share a drawing to a second device" or "update a
  home-screen widget" almost certainly exist in some form. Broad ones from the
  2000s get asserted regularly.
- Independent invention is **not** a defence to patent infringement (unlike
  copyright). Your clean-room commit history helps with copying claims, not
  patent claims.
- **But**: patent assertion follows money. Trolls and competitors sue apps with
  meaningful revenue, because the cost of the suit has to be worth it. A
  two-person app with a few thousand dollars of one-time purchases is not a
  target. Every one of the 200+ apps in this category faces the identical
  exposure, and they ship anyway.
- The practical sequence is: ship → form the entity (§4) → if the app makes
  real money, *then* pay for an FTO opinion and consider IP insurance.

Should *you* file a patent? Almost certainly not. It's $10–20k and years, it
publishes your design, and it protects a feature that a competitor can work
around. Your moat is execution and the relationship, not a claim chart.

## 6 · Licences — a real gap, fixed today

**Found:** Trace bundles the Caveat font inside the app binary. Caveat is
under the SIL Open Font License, which allows exactly that — including
commercially — **but requires the copyright notice and licence text to be
distributed with it.** They weren't. That's a genuine (if small and easily
remedied) licence violation, and the kind of thing that is embarrassing rather
than expensive.

**Fixed:** [`licenses/Caveat-OFL.txt`](licenses/Caveat-OFL.txt) now carries the
authoritative text, and [`NOTICES.md`](NOTICES.md) records it alongside the
dependency audit.

**Checked and clean:** every runtime dependency is MIT/ISC/BSD/Apache. The
three copyleft-ish packages (MPL-2.0 `lightningcss`, CC-BY-4.0
`caniuse-lite`, Python-2.0 `argparse`) are build tooling and never ship. No
GPL anywhere in the runtime tree, which is the outcome you want.

**Still yours to watch:** don't put Apple's emoji glyphs in screenshots or
marketing (they're Apple's), and don't use a competitor's screenshots, icon or
name in your store listing.

---

## The list, if you only do four things

1. **Change the name** — or at least run the USPTO search before you commit to
   it. This is the one with a verified conflict.
2. **Form the entity** before you take a single dollar.
3. **Keep the git history intact** as your independent-creation record.
4. **Have a lawyer read `docs/terms.html` and `docs/privacy.html` once** before
   launch. An hour of their time on documents that are already drafted is far
   cheaper than having them draft from nothing — and they'll catch the
   jurisdiction and dispute clauses, which are the parts I'd least trust.

Everything else on this page is either handled, or a "later, if it works"
problem — which is the correct order.
