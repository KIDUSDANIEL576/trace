#!/usr/bin/env python3
"""Generates store-ready marketing screenshots for Trace.

Outputs (store/out/):
  ios-01..06.png   1290x2796 — Apple 6.7" (also valid for Google Play phones)
  feature.png      1024x500  — Google Play feature graphic (required by Play)

Each frame = dusk gradient + wordmark + Caveat headline + a device slot.
Drop real captures into store/raw/ as screen-1.png .. screen-6.png and rerun:
they get rounded-corner pasted into the slots. Without them you get a styled
placeholder so you can see the layout today.

Run from the repo root:  python3 tools/make_store_frames.py
(Windows: py tools\\make_store_frames.py)
"""

from __future__ import annotations

import os
import sys

import math

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "store", "raw")
OUT = os.path.join(ROOT, "store", "out")

W, H = 1290, 2796  # Apple 6.7" portrait

NIGHT = (12, 11, 16)
NIGHT_TOP = (24, 21, 34)
PANEL = (22, 21, 28)
LINE = (255, 255, 255, 20)
TEXT = (243, 240, 244)
MUTED = (154, 147, 165)
INK = (226, 51, 67)
GLOW = (255, 122, 156)

BOARD = [(0.00, (51, 68, 95)), (0.45, (92, 95, 120)), (0.70, (138, 107, 115)), (1.00, (46, 39, 51))]

FRAMES = [
    ("Leave me\na trace.", "Whatever one of you draws appears on the\nother's phone — stroke by stroke, live."),
    ("Draw here.\nIt lands there.", "Under a second, phone to phone.\nIt feels like the same page."),
    ("Send a\nheartbeat.", "One tap and a heart blooms on both\nscreens. Tap together — it erupts."),
    ("Draw on\nyour photos.", "Circle the thing you mean. Doodle the\nmoustache. It streams live too."),
    ("Replay\nyour story.", "Every stroke you've ever left each other,\nplayed back in order."),
    ("It lives on your\nhome screen.", "The widget shows your latest canvas.\nTheir last trace, right where you look."),
]


def caveat(size: int) -> ImageFont.FreeTypeFont:
    path = os.path.join(ROOT, "node_modules", "@expo-google-fonts", "caveat", "Caveat_700Bold.ttf")
    return ImageFont.truetype(path, size)


def ui_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = (
        ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf",
         "/System/Library/Fonts/Helvetica.ttc",
         "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
        if bold
        else ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf",
              "/System/Library/Fonts/Helvetica.ttc",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
    )
    for p in candidates:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default(size)  # type: ignore[return-value]


def vertical_gradient(size: tuple[int, int], top: tuple, bottom: tuple) -> Image.Image:
    w, h = size
    img = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / max(h - 1, 1)
        img.putpixel((0, y), tuple(int(a + (b - a) * t) for a, b in zip(top, bottom)))
    return img.resize((w, h))


def board_gradient(size: tuple[int, int]) -> Image.Image:
    w, h = size
    img = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / max(h - 1, 1)
        for (t0, c0), (t1, c1) in zip(BOARD, BOARD[1:]):
            if t0 <= t <= t1:
                k = (t - t0) / (t1 - t0) if t1 > t0 else 0
                img.putpixel((0, y), tuple(int(a + (b - a) * k) for a, b in zip(c0, c1)))
                break
    return img.resize((w, h))


def rounded(img: Image.Image, radius: int) -> Image.Image:
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.width - 1, img.height - 1], radius, fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def glow_spot(size: tuple[int, int], center: tuple[int, int], radius: int, color: tuple, alpha: int) -> Image.Image:
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse(
        [center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius],
        fill=color + (alpha,),
    )
    return layer.filter(ImageFilter.GaussianBlur(radius // 2))


def cover_fit(img: Image.Image, size: tuple[int, int]) -> Image.Image:
    w, h = size
    scale = max(w / img.width, h / img.height)
    scaled = img.resize((int(img.width * scale + 0.5), int(img.height * scale + 0.5)))
    x = (scaled.width - w) // 2
    y = (scaled.height - h) // 2
    return scaled.crop((x, y, x + w, y + h))


def heart_points(cx: int, cy: int, scale: float, steps: int = 60) -> list[tuple[float, float]]:
    pts = []
    for i in range(steps + 1):
        t = math.pi * 2 * i / steps
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * scale, cy - y * scale))
    return pts


def placeholder_screen(size: tuple[int, int], n: int) -> Image.Image:
    img = board_gradient(size).convert("RGBA")
    img.alpha_composite(glow_spot(size, (size[0] // 2, int(size[1] * 0.30)), size[0] // 3, (247, 217, 176), 120))
    d = ImageDraw.Draw(img)
    f = caveat(64)
    msg = f"your screenshot here\nstore/raw/screen-{n}.png"
    d.multiline_text((size[0] // 2, int(size[1] * 0.52)), msg, font=f, fill=TEXT + (200,), anchor="mm", align="center", spacing=14)
    # a hand-drawn heart so the placeholder still reads as Trace
    d.line(
        heart_points(size[0] // 2, int(size[1] * 0.76), size[0] / 160),
        fill=INK + (220,), width=14, joint="curve",
    )
    return img


def wordmark(d: ImageDraw.ImageDraw, xy: tuple[int, int], size: int) -> None:
    f = caveat(size)
    x, y = xy
    d.text((x, y), "tra", font=f, fill=TEXT)
    w = d.textlength("tra", font=f)
    d.text((x + w, y), "ce", font=f, fill=INK)


def make_frame(n: int, headline: str, sub: str) -> Image.Image:
    img = vertical_gradient((W, H), NIGHT_TOP, NIGHT).convert("RGBA")
    img.alpha_composite(glow_spot((W, H), (W // 2, 340), 620, GLOW, 26))

    d = ImageDraw.Draw(img)
    wordmark(d, (96, 96), 92)

    d.multiline_text((96, 300), headline, font=caveat(168), fill=TEXT, spacing=4)
    d.multiline_text((100, 740), sub, font=ui_font(46), fill=MUTED, spacing=16)

    # device slot
    slot_w = 990
    slot_h = 1650
    sx = (W - slot_w) // 2
    sy = 960
    # soft shadow
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([sx - 8, sy + 24, sx + slot_w + 8, sy + slot_h + 40], 96, fill=(0, 0, 0, 140))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(36)))

    raw_path = os.path.join(RAW, f"screen-{n}.png")
    if os.path.exists(raw_path):
        screen = cover_fit(Image.open(raw_path).convert("RGB"), (slot_w, slot_h)).convert("RGBA")
    else:
        screen = placeholder_screen((slot_w, slot_h), n)
    img.alpha_composite(rounded(screen, 88), (sx, sy))

    # bezel ring
    d.rounded_rectangle([sx, sy, sx + slot_w, sy + slot_h], 88, outline=(255, 255, 255, 46), width=5)

    d.text((W // 2, H - 96), "made for two.", font=caveat(64), fill=MUTED, anchor="mm")
    return img.convert("RGB")


def make_feature_graphic() -> Image.Image:
    w, h = 1024, 500
    img = vertical_gradient((w, h), NIGHT_TOP, NIGHT).convert("RGBA")
    img.alpha_composite(glow_spot((w, h), (w // 4, h // 2), 320, GLOW, 34))

    d = ImageDraw.Draw(img)
    wordmark(d, (72, 96), 120)
    d.text((76, 250), "Leave me a trace.", font=caveat(84), fill=TEXT)
    d.text((78, 370), "A live shared canvas for two.", font=ui_font(30), fill=MUTED)

    # heart stroke on the right
    d.line(heart_points(800, 250, 7.5), fill=INK + (235,), width=16, joint="curve")
    return img.convert("RGB")


def main() -> None:
    os.makedirs(RAW, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    for i, (headline, sub) in enumerate(FRAMES, start=1):
        frame = make_frame(i, headline, sub)
        path = os.path.join(OUT, f"ios-{i:02d}.png")
        frame.save(path)
        print(f"wrote {os.path.relpath(path, ROOT)}  {frame.size[0]}x{frame.size[1]}")
    fg = make_feature_graphic()
    fg_path = os.path.join(OUT, "feature.png")
    fg.save(fg_path)
    print(f"wrote {os.path.relpath(fg_path, ROOT)}  {fg.size[0]}x{fg.size[1]}")
    have = [f for f in os.listdir(RAW) if f.startswith("screen-")] if os.path.isdir(RAW) else []
    if not have:
        print("\nplaceholders used — drop real captures into store/raw/ as screen-1.png..screen-6.png and rerun")


if __name__ == "__main__":
    sys.exit(main())
