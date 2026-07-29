# REVENUECAT.md — selling Trace Forever

**The product:** Trace Forever, **$29.99, one time, no subscription** — and it
unlocks for *both* partners. One person buys; both get every sky, every brush,
unlimited capsules and photos, and full replay.

**How the unlock actually works** (worth understanding before you touch a
dashboard, because it explains every failure mode below):

```
phone → store purchase → RevenueCat → webhook → Supabase edge function
                                                      ↓
                                          couples.premium = true
                                                      ↓
                                    both partners' apps read it and unlock
```

The app never decides who is premium. The **database** does, and only the
service role can write that column — which is why a partner who never paid
still gets everything, and why a hacked client can't unlock itself.

---

## 1 · Create the product in both stores

Use the **same product id in both**: `trace_forever`

**App Store Connect** → your app → Monetization → In-App Purchases → `+`
- Type: **Non-Consumable** (not a subscription — this is a forever purchase)
- Reference name: `Trace Forever` · Product ID: `trace_forever`
- Price: **$29.99** (Tier 30 or whatever ASC maps it to)
- Add a localized display name + description, and a review screenshot (a photo
  of the paywall screen is fine) — ASC won't submit it without them.

**Google Play Console** → your app → Monetize → Products → **One-time products**
- Product ID: `trace_forever` · Name: `Trace Forever` · Price: **$29.99**
- **Activate** it (a saved-but-inactive product silently doesn't exist)

## 2 · Wire up RevenueCat

app.revenuecat.com → new project → add both apps (iOS bundle
`com.digirafthub.trace`, Android package `com.digirafthub.trace`), pasting the
App Store shared secret and the Play service-account JSON when asked.

Then, in order:

1. **Products** → import `trace_forever` from each store.
2. **Entitlements** → create one called **`trace_forever`** → attach both
   store products to it.
3. **Offerings** → create an offering, make it **Default**, and add a package
   whose product is Trace Forever.

> ⚠️ **The one detail that will bite you.** `src/lib/purchases.ts` buys
> `offerings.current.availablePackages[0]` — the *first package of the default
> offering* — and never looks up a package by name. If that first package is
> anything other than Trace Forever, the paywall will cheerfully sell the wrong
> thing at the wrong price. Keep exactly one package in the default offering
> unless you deliberately change the code.

## 3 · Put the SDK keys in the app

RevenueCat → Project settings → API keys → copy the **public** SDK key for each
platform (they start with `appl_` and `goog_`; never use a secret key here).

Two places, both required:

```bash
# .env  — for local dev
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxx
```

```jsonc
// eas.json → build.development.env  — for cloud builds, which never read .env
"EXPO_PUBLIC_REVENUECAT_IOS_KEY": "appl_xxxxxxxxxxxx",
"EXPO_PUBLIC_REVENUECAT_ANDROID_KEY": "goog_xxxxxxxxxxxx"
```

The slots already exist in `eas.json` as empty strings — fill them in. Skipping
this is a silent failure: the build succeeds and the paywall just says
"Purchases need a store build with RevenueCat keys."

## 4 · The webhook — where the unlock actually happens

RevenueCat → Project settings → **Integrations → Webhooks** → Add:

- **URL:** `https://<project-ref>.functions.supabase.co/trace-revenuecat-webhook`
  (drop the `trace-` prefix once you've done `SUPABASE_MIGRATION.md`)
- **Authorization header:** `Bearer <your-secret>` — invent a long random
  string.

Then store that *same* string in Supabase → Edge Functions → Secrets as
**`REVENUECAT_WEBHOOK_SECRET`**.

The function **fails closed**: until the secret exists it answers `503`, and a
wrong header answers `401`. So if RevenueCat's webhook log shows 503, the
secret is missing — not broken code. It grants on `INITIAL_PURCHASE`,
`NON_RENEWING_PURCHASE`, and `UNCANCELLATION`, and revokes on `REFUND`.

## 5 · The join key (why a purchase finds the right couple)

`configurePurchases(userId)` sets RevenueCat's `appUserID` to the **Supabase
auth user id**. The webhook takes that id, finds the member row, and flips
premium on their couple. Two consequences:

- Purchases made before sign-in are anonymous (`$RCAnonymousID:…`) and the
  webhook ignores them by design — the app configures RevenueCat only after
  login, so this shouldn't happen.
- If you ever change what `appUserID` is set to, purchases will land on nobody
  and you'll be issuing refunds. Don't.

## 6 · Test in sandbox before you ship

**iOS:** App Store Connect → Users and Access → Sandbox Testers → create one →
on the phone, Settings → App Store → Sandbox Account → sign in as them.
**Android:** Play Console → License testing → add your Google account; the app
must be on an internal-testing track.

Then walk `TESTING.md` §5. The cases that matter most:

- [ ] The paywall shows the **store's** localized price, not the `$29.99`
      fallback (proves the offering loaded)
- [ ] Sandbox purchase on phone A → "unlocked for you both ❤️" within seconds
- [ ] **Phone B relaunches → everything unlocked, with no purchase.** This is
      the whole promise of the product; if it fails, the webhook is wrong.
- [ ] Glow, neon, and invisible ink all draw on both phones
- [ ] Restore purchase works after reinstalling

## 7 · Go-live checklist

- [ ] `trace_forever` created **and active** in both stores
- [ ] Entitlement `trace_forever` with both products attached
- [ ] Default offering, Trace Forever as the first package
- [ ] Public SDK keys in `.env` **and** `eas.json`
- [ ] Webhook URL + `Bearer` header set in RevenueCat
- [ ] `REVENUECAT_WEBHOOK_SECRET` set in Supabase (no more 503s)
- [ ] Sandbox purchase unlocks **both** phones
- [ ] Apple's IAP is submitted for review *with* the app build

## When it fails

| Symptom | Cause |
|---|---|
| "Purchases need a store build with RevenueCat keys" | SDK key missing, or you're in Expo Go — purchases need a dev/store build |
| Paywall shows `$29.99` but the store says otherwise | Offering didn't load; check the default offering exists and the product is active |
| Purchase succeeds, nothing unlocks | Webhook: 503 = secret unset, 401 = header mismatch, 404 = that user isn't in a couple |
| Partner still locked | They need to reopen/refocus the app; the paywall polls, the canvas refreshes on focus |
| "Payment received — unlocking can take a minute" | The 90s timeout fired: the purchase went through but the webhook hasn't landed. Check RevenueCat's webhook log. |
