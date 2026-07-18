"""Generate Trace app icons: hand-drawn marker heart on home-screen black.

Usage: python3 tools/make_icons.py   (from the repo root; needs `pip install pillow`)
Deterministic (seeded), so regenerated icons are byte-stable per Pillow version.
"""
import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter

NIGHT = (12, 11, 16, 255)
INK = (226, 51, 67)
GLOW = (255, 122, 156)

random.seed(7)


def heart_points(cx, cy, scale, n=400, wobble=0.0):
    pts = []
    for i in range(n + 1):
        t = math.pi * 2 * i / n
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        w = 1 + wobble * math.sin(t * 9 + 1.7) * 0.02 + wobble * random.uniform(-0.004, 0.004)
        pts.append((cx + x * scale * w, cy - y * scale * w))
    return pts


def draw_stroke(draw, pts, width, color):
    draw.line(pts, fill=color, width=width, joint="curve")
    r = width // 2
    for p in (pts[0], pts[-1]):
        draw.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=color)


def make_icon(size=1024, transparent=False, scale_mult=1.0):
    bg = (0, 0, 0, 0) if transparent else NIGHT
    img = Image.new("RGBA", (size, size), bg)

    s = size / 1024.0
    cx, cy = size / 2, size / 2 - 8 * s
    scale = 17.5 * s * scale_mult

    # soft pink glow under the ink
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    draw_stroke(gd, heart_points(cx, cy, scale, wobble=1), int(64 * s * scale_mult), GLOW + (110,))
    glow = glow.filter(ImageFilter.GaussianBlur(int(46 * s)))
    img.alpha_composite(glow)

    # two marker passes at partial opacity = layered translucent ink
    ink_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(ink_layer)
    draw_stroke(d, heart_points(cx, cy, scale * 1.012, wobble=1.4), int(46 * s * scale_mult), INK + (150,))
    draw_stroke(d, heart_points(cx, cy, scale * 0.995, wobble=0.8), int(40 * s * scale_mult), INK + (190,))
    img.alpha_composite(ink_layer)

    if transparent:
        return img
    return img.convert("RGB").convert("RGBA")


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "..", "assets")
    os.makedirs(out, exist_ok=True)
    make_icon(1024).save(f"{out}/icon.png")
    make_icon(1024, transparent=True, scale_mult=0.62).save(f"{out}/adaptive-icon.png")
    make_icon(1024, transparent=True, scale_mult=0.5).save(f"{out}/splash-icon.png")
    make_icon(96, transparent=True, scale_mult=0.9).save(f"{out}/notification-icon.png")
    print("icons written to", os.path.abspath(out))
