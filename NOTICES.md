# Third-party notices

Trace bundles the software and fonts below. This file exists so the notices
travel with the app, which some of these licences require.

## Fonts

**Caveat** — the handwriting face used for headlines and the wordmark.
Copyright 2014 The Caveat Project Authors
(https://github.com/googlefonts/caveat), licensed under the **SIL Open Font
License 1.1**. Full text: [`licenses/Caveat-OFL.txt`](licenses/Caveat-OFL.txt).

The OFL permits bundling the font inside an application, including a
commercial one, **provided the copyright notice and licence travel with it** —
which is what this file and `licenses/` are for. The font is not sold on its
own, and it is not renamed.

The rest of the UI uses each platform's system font, which needs no notice.

## Software

Every runtime dependency is under a permissive licence — MIT, ISC, BSD-2/3,
Apache-2.0 or 0BSD. Audited with `npx license-checker --production`:

| Licence | Packages |
|---|---|
| MIT | ~797 |
| ISC | ~61 |
| BSD-3-Clause | ~26 |
| Apache-2.0 | ~16 |
| BSD-2-Clause | ~11 |
| Other permissive (BlueOak, 0BSD, Unlicense, CC0) | ~18 |

Three packages carry **MPL-2.0** (`lightningcss` and its platform binaries),
one is **CC-BY-4.0** (`caniuse-lite`) and one **Python-2.0** (`argparse`).
All three are *build-time tooling* — they run on your machine to produce the
bundle and are never shipped inside the app. MPL-2.0 is file-level copyleft in
any case: it would only oblige you to publish changes to *those files*, and we
haven't changed them.

Notable named components: React Native, Expo, `@shopify/react-native-skia`,
`@supabase/supabase-js`, `react-native-purchases`, `@sentry/react-native`.

To regenerate the audit:

```bash
npx license-checker --production --summary
```

## Emoji

Emoji in the UI (❤️ 🌅 ⏳ …) render with whatever font the reader's OS
provides — Apple, Google or Microsoft ship their own. Trace bundles no emoji
artwork, so there is nothing to license. **Don't** put Apple's emoji glyphs in
store screenshots taken on a Mac, marketing images, or the app icon: those
glyphs are Apple's and are not licensed for that use.

## Trace itself

The app's own source, artwork and copy are © the Trace authors, all rights
reserved. `package.json` is marked `UNLICENSED` deliberately — it means "not
open source", not "no licence exists".
