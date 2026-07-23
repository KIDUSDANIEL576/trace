# Email setup — sign-in codes that actually arrive

Two things, in order:

1. **Magic Link template** (5 min) — makes the 6-digit code show up in the email.
   🔴 Until this is done, sign-in codes are blank and **nobody can log in**.
2. **Custom SMTP via Resend** (~15 min) — replaces Supabase's built-in email,
   which caps at **~2 emails/hour** and will strangle your first demo.

Everything here happens against the live project **`hnjjxvhutpgcdwyzmito`**
(the dashboard calls it by its name). The repo already contains the branded
template (`supabase/templates/magic-link.html`) and the documented settings
(`supabase/config.toml`) — the dashboard steps below just apply them.

---

## Part 1 · Magic Link template (do this first — it's free and instant)

Trace signs you in with a **6-digit code**, not a tappable link. The email that
carries that code is Supabase's "Magic Link" template, and it must contain the
`{{ .Token }}` placeholder — that's what Supabase swaps for the real code.

1. Open the **Supabase dashboard** → your project.
2. Left sidebar: **Authentication** → **Emails** (older UIs: **Email Templates**).
3. Select the **Magic Link** tab.
4. **Optional but nicer:** set the **Subject** to `Your Trace sign-in code`.
5. Delete whatever HTML is in the body and paste the **entire contents of**
   [`supabase/templates/magic-link.html`](supabase/templates/magic-link.html).
   - The one line that MUST survive is `{{ .Token }}`. Everything else is styling.
   - `{{ .Token }}` is a literal placeholder you type — you don't fetch it from
     anywhere.
6. Click **Save**.

**Verify:** open the app → enter your email → **Send me a code** → the email
should arrive within a minute showing a big 6-digit code. Type it in → you're in.

> Quick minimal fallback: if you don't want the styled version yet, the body can
> literally just be `<h2>Your Trace code: {{ .Token }}</h2>`. The styled template
> is strictly nicer; either works.

---

## Part 2 · Custom SMTP with Resend (before you demo to anyone)

Why: Supabase's built-in email is rate-limited to roughly **2 sign-in emails per
hour** for the whole project. The first time you show Trace to two or three
friends, that limit is gone and their codes silently never arrive. Resend's free
tier (3,000 emails/month, 100/day) removes that ceiling.

### 2a · Create a Resend account + API key

1. Go to **https://resend.com** → sign up (free, no card).
2. In the Resend dashboard, left sidebar → **API Keys** → **Create API Key**.
   - Name: `trace-supabase`. Permission: **Sending access**.
   - Copy the key (`re_...`) somewhere safe — you only see it once.

### 2b · Verify a sending domain (this is the part people skip and then wonder why email fails)

You can't send "from" an address unless Resend has verified you own the domain.

1. Resend dashboard → **Domains** → **Add Domain**.
2. Enter a domain you control, e.g. `gettrace.app` (or a subdomain like
   `mail.gettrace.app`). *No domain yet? See "No domain?" below.*
3. Resend shows a set of **DNS records** — typically:
   - a **TXT** record for SPF (something like `v=spf1 include:...`),
   - up to three **DKIM** records (CNAME or TXT), and
   - optionally a **MX** record for the tracking subdomain.
4. Go to wherever your domain's DNS lives (Namecheap, Cloudflare, GoDaddy, Google
   Domains…) → add each record **exactly** as Resend lists it (name/host, type,
   value). Leave TTL default.
5. Back in Resend → **Verify**. DNS can take a few minutes to a couple of hours to
   propagate; the domain flips to **Verified** when it's ready.

Once verified, you can send from any address at that domain, e.g.
`trace@gettrace.app`.

**No domain?** Two options:
- Buy one (~$10/yr) — you'll want it anyway for the privacy/support URLs.
- For *testing only*, Resend lets you send from its shared `onboarding@resend.dev`
  sender to **your own** address without a domain — fine to prove the pipe works,
  but you cannot ship a real app on it. Get a domain before inviting anyone.

### 2c · Point Supabase at Resend

1. Supabase dashboard → **Project Settings** (gear) → **Authentication** →
   scroll to **SMTP Settings** (some UIs: Authentication → **Emails** →
   **SMTP Settings** → **Enable Custom SMTP**).
2. Toggle **Enable Custom SMTP** on and fill in — these match
   `supabase/config.toml` exactly:

   | Field | Value |
   |---|---|
   | **Host** | `smtp.resend.com` |
   | **Port** | `465` |
   | **Username** | `resend` |
   | **Password** | your Resend API key (`re_...`) |
   | **Sender email** | `trace@yourdomain.com` (a verified-domain address) |
   | **Sender name** | `Trace` |

3. **Save**.

### 2d · Raise the rate limit

Custom SMTP doesn't auto-raise Supabase's internal send rate.

1. Supabase → **Authentication** → **Rate Limits**.
2. Bump **"Rate limit for sending emails"** from the tiny default (e.g. 2/hour) to
   something sane for demos (e.g. 30–100/hour). Resend's free tier is 100/day.
3. **Save**.

**Verify the whole chain:** sign in with a **different** email than before → the
code email should arrive **from your `trace@yourdomain.com` sender** (check the
"from" line), fast, with no hourly cap. Send yourself several in a row to confirm
the limit is gone.

---

## Troubleshooting

- **Code area is blank in the email** → the template is missing `{{ .Token }}`
  (Part 1, step 5). It's the one line that can't be removed.
- **No email at all** → check Resend → **Logs** (shows accepted/bounced/delivered).
  A bounce usually means the sender address isn't on a verified domain (2b), or the
  API key was pasted with a trailing space (2c).
- **"You can only request this after Xs" / codes stop mid-demo** → you're still on
  the built-in limit; finish 2c + 2d.
- **Domain won't verify** → the DNS record's *host/name* is wrong. Some registrars
  auto-append your domain, so entering `mail.gettrace.app` becomes
  `mail.gettrace.app.gettrace.app`. Enter just the subpart Resend shows (often
  `resend._domainkey` or `send`), not the full domain.

Once both parts are green, run **TESTING.md §1** (pairing) end to end.
