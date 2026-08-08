# Launch week — the audit

Full categorized audit (done / never-done / my end / your end / the seven
days) lives at the war-room page, published Aug 8 2026. Repo-side summary:

**Four gates before a stranger's couple can install this:**
1. Domain + static hosting + HTTPS (yours) — `site/` deploys anywhere.
2. Channel security (mine) — pair code must exchange for an unguessable
   channel token via a Supabase edge function; rate-limit joins.
3. Two real phones (yours) — the QA script, one evening, with your person.
4. Legal hosted + support email (yours) — drafts in docs/, counsel pass.

**Launch shape:** installable PWA (manifest + sw + icons shipped, verified).
Native v1.0 (WidgetKit, watch, APNs, IAP, launch animation) is the release
after; start Apple/Play accounts now because the lead time is theirs.

See: docs/STORE.md · docs/PRIVACY.md · docs/TERMS.md · PRD §10 (the cut).
