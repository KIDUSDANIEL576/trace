# Store assets — screenshots + feature graphic

`out/` is store-ready today (with styled placeholders); it gets better the
moment you drop real captures into `raw/` and rerun the generator.

## What's here

| File | Size | Where it goes |
|---|---|---|
| `out/ios-01..06.png` | 1290×2796 | App Store Connect → 6.7" screenshots · also valid for Google Play phone screenshots |
| `out/feature.png` | 1024×500 | Google Play → Store listing → Feature graphic (required) |

## The six frames (capture these moments)

1. **Leave me a trace.** — the shared canvas with a drawing on it (the hero)
2. **Draw here. It lands there.** — mid-draw, partner pill visible ("… is drawing")
3. **Send a heartbeat.** — the heart bloom moment (tap ❤ and screenshot fast)
4. **Draw on your photos.** — a photo canvas with ink on it
5. **Replay your story.** — the replay screen mid-scrub
6. **It lives on your home screen.** — your actual home screen with the Trace widget

## How to make them real

1. On a phone running Trace, take a screenshot of each moment above
   (any modern phone is fine — the generator crops to fit).
2. Put them in `raw/` named `screen-1.png` … `screen-6.png` (numbers match
   the list above; PNG or convert from whatever your phone saves).
3. From the repo root run:
   ```bash
   python3 tools/make_store_frames.py      # Windows: py tools\make_store_frames.py
   ```
   (needs `pip install pillow` once; run `npm install` first so the Caveat
   font exists in node_modules)
4. Fresh framed PNGs land in `out/` — upload straight to both stores.

## Notes

- Apple requires the 6.7" set; it auto-scales them for smaller devices. If
  App Store Connect ever asks for 6.9" (1320×2868), tell me and I'll add that
  size to the generator — one-line change.
- Google Play also wants the feature graphic (`out/feature.png`) and at least
  2 phone screenshots — the ios-*.png files satisfy that.
- The 30-second preview video (your best ad: a screen-recording of Replay
  autoplay) is separate — record it on-device when the time comes.
