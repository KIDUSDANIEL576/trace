import assert from 'node:assert/strict';
import test from 'node:test';
import { BACKGROUNDS } from '../src/theme/backgrounds';
import { PALETTES, THEME_ORDER, type ThemeName } from '../src/theme/tokens';

// Glass is the one place in the app where a text colour meets an UNKNOWN
// background: the couple picks any of 61 skies, and the pill floats over it.
// "It looked fine on my sky" is not evidence, so this computes the worst case
// instead — every sky, composited exactly the way the app stacks it.

type RGB = [number, number, number];

function parse(color: string): { rgb: RGB; a: number } {
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], a: 1 };
  }
  const rgba = color.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/
  );
  assert.ok(rgba, `cannot parse colour ${color}`);
  return {
    rgb: [Number(rgba![1]), Number(rgba![2]), Number(rgba![3])],
    a: rgba![4] === undefined ? 1 : Number(rgba![4]),
  };
}

/** Source-over: draw `over` (with its alpha) on top of opaque `under`. */
function composite(under: RGB, over: string): RGB {
  const { rgb, a } = parse(over);
  return [0, 1, 2].map((i) => under[i] * (1 - a) + rgb[i] * a) as RGB;
}

function luminance([r, g, b]: RGB): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(fg: string, bg: RGB): number {
  const l1 = luminance(parse(fg).rgb);
  const l2 = luminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Every colour a sky can put behind a floating pill, per theme. */
function skyGrounds(theme: ThemeName): RGB[] {
  const grounds: RGB[] = [];
  const stops = [
    ...BACKGROUNDS.flatMap((b) => b.colors),
    ...PALETTES[theme].board.colors,
  ];
  for (const stop of stops) {
    // the canvas screen dims the full-screen sky before any chrome sits on it
    grounds.push(composite(parse(stop).rgb, 'rgba(0,0,0,0.35)'));
  }
  return grounds;
}

const AA = 4.5; // WCAG AA for normal-size text

for (const theme of THEME_ORDER) {
  test(`${theme}: pill text clears AA over every sky (iOS glass)`, () => {
    const p = PALETTES[theme];
    let worst = { ratio: Infinity, ground: [0, 0, 0] as RGB };
    for (const ground of skyGrounds(theme)) {
      const glass = composite(ground, p.glass.tint);
      const ratio = contrast(p.onOverlay, glass);
      if (ratio < worst.ratio) worst = { ratio, ground: glass };
    }
    assert.ok(
      worst.ratio >= AA,
      `${theme}: onOverlay ${p.onOverlay} on glass rgb(${worst.ground
        .map(Math.round)
        .join(',')}) is only ${worst.ratio.toFixed(2)}:1`
    );
  });

  test(`${theme}: pill text clears AA over every sky (Android, no blur)`, () => {
    const p = PALETTES[theme];
    let worst = Infinity;
    for (const ground of skyGrounds(theme)) {
      worst = Math.min(worst, contrast(p.onOverlay, composite(ground, p.glass.tintAndroid)));
    }
    assert.ok(worst >= AA, `${theme}: Android glass text is only ${worst.toFixed(2)}:1`);
  });

  test(`${theme}: accent text on glass clears AA`, () => {
    // The selected tab and the heart button stack ink over glass, and the
    // capsule pill uses gold. These are the colours a hardcoded pink used to
    // break on Daylight (light pink on light frost), so they get pinned.
    const p = PALETTES[theme];
    let worst = { ratio: Infinity, what: '' };
    for (const ground of skyGrounds(theme)) {
      for (const tint of [p.glass.tint, p.glass.tintAndroid]) {
        const glass = composite(ground, tint);
        const onInk = composite(glass, p.inkSoft); // the selected tab's fill
        const checks: [string, string, RGB][] = [
          // the selected tab keeps full-strength text on its ink wash: colour
          // alone must never be what tells you which tab is selected
          ['selected tab text', p.onOverlay, onInk],
          ['onOverlay', p.onOverlay, glass],
        ];
        for (const [what, fg, bg] of checks) {
          const r = contrast(fg, bg);
          if (r < worst.ratio) worst = { ratio: r, what };
        }
      }
    }
    assert.ok(
      worst.ratio >= AA,
      `${theme}: ${worst.what} is only ${worst.ratio.toFixed(2)}:1 on glass`
    );
  });

  test(`${theme}: sheet text clears AA on the strong tint`, () => {
    const p = PALETTES[theme];
    let worst = Infinity;
    for (const ground of skyGrounds(theme)) {
      for (const tint of [p.glass.tintStrong, p.glass.tintStrongAndroid]) {
        // sheets carry body text (`text`) and secondary text (`muted`)
        const glass = composite(ground, tint);
        worst = Math.min(worst, contrast(p.text, glass), contrast(p.muted, glass));
      }
    }
    assert.ok(worst >= AA, `${theme}: sheet text is only ${worst.toFixed(2)}:1`);
  });
}

test('gold badges are filled, and their text clears AA on the fill', () => {
  // The streak badge and the "capsule is ready" pill are solid gold with dark
  // text. Gold AS TEXT over glass bottomed out at 1.86:1 on Daylight.
  for (const theme of THEME_ORDER) {
    const p = PALETTES[theme];
    const r = contrast(p.onGold, parse(p.gold).rgb);
    assert.ok(r >= AA, `${theme}: onGold on gold is only ${r.toFixed(2)}:1`);
  }
});

test('the heart button clears non-text contrast (WCAG 1.4.11)', () => {
  // A white heart on solid ink, rather than an ink glyph on an ink wash —
  // the wash version sat near 1.3:1 over a bright sky.
  for (const theme of THEME_ORDER) {
    const ink = PALETTES[theme].ink;
    const r = contrast('#ffffff', parse(ink).rgb);
    assert.ok(r >= 3, `${theme}: white on ${ink} is only ${r.toFixed(2)}:1`);
  }
});
