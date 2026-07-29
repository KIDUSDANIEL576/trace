// Design tokens. Three selectable themes (Dusk is the default); the app reads
// the active palette through ThemeProvider/useTheme, so switching is instant.
// Structural tokens (radius, fonts) and the drawing swatches are shared.

export type ThemeName = 'dusk' | 'candlelight' | 'daylight';

export interface BoardPalette {
  colors: string[]; // dusk-style vertical gradient stops for the canvas ground
  positions: number[]; // same length as colors, 0..1
  highlight: string; // radial "sun" highlight over the gradient
}

export interface Palette {
  night: string; // app background
  panel: string;
  panel2: string;
  line: string;
  text: string;
  muted: string;
  ink: string; // signature marker (bright — for fills, borders, large display)
  /** Ink darkened just enough that WHITE TEXT on it clears WCAG AA. Use for
   * any filled button; `ink` itself is the stroke colour and fails as a
   * text ground (4.39 / 3.33 / 3.21 across the themes). */
  inkDeep: string;
  inkSoft: string;
  glow: string; // bright pink — for dots/blooms/fills
  gold: string; // bright gold — for fills (paywall badge) + dark-on-gold
  // Legible-as-small-text variants. Identical to the bright tokens on the dark
  // themes; darkened on Daylight so accent TEXT clears WCAG AA on cream (the
  // bright tokens fail as text but must stay bright as fills — dual-use split).
  inkText: string;
  goldText: string;
  /** Text drawn ON a solid gold fill — gold is a fill colour, never a text
   * colour over glass, where it never cleared AA on a bright sky. */
  onGold: string;
  /** Destructive labels ("Clear the canvas", "Delete account"). `ink` is the
   * stroke red and only manages 2.7–3.7:1 on a sheet; this is the same
   * warning red, lightened on dark themes and deepened on the light one. */
  dangerText: string;
  linkText: string;
  overlay: string; // translucent chip/pill over the canvas
  onOverlay: string; // text on that overlay
  ring: string; // selected colour-swatch ring
  barStyle: 'light' | 'dark'; // status bar contrast
  board: BoardPalette;
  glass: GlassPalette;
}

/**
 * Glassmorphism, the honest kind: real backdrop blur (expo-blur) plus a thin
 * tint, a lit top edge, and a hairline border. The lit edge is what sells it —
 * glass reads as glass because light catches its rim, not because it's blurry.
 */
export interface GlassPalette {
  blurTint: 'light' | 'dark' | 'default'; // which way expo-blur leans
  blurIntensity: number; // 0..100
  // Every alpha here is solved, not eyeballed: tests/contrast.test.ts
  // composites each tint over all 61 skies (dimmed the way the canvas screen
  // dims them) and requires WCAG AA for the text that sits on top.
  tint: string; // thin wash over the blur, so text always has a ground
  tintStrong: string; // for sheets, which sit over more varied content
  // Android renders no real blur by default (see Glass.tsx), so its wash has
  // to carry the legibility on its own — these are deliberately heavier.
  tintAndroid: string;
  tintStrongAndroid: string;
  border: string; // hairline rim
  edge: string; // the lit top edge — brighter than the rim
  glowInk: string; // love: a soft ink-tinted bloom under active surfaces
  shadow: string; // the drop shadow that lifts glass off the canvas
  wellIdle: string; // an unselected control sunk into the glass
}

export const PALETTES: Record<ThemeName, Palette> = {
  // A — Dusk: cool near-black, an iPhone home screen at nightfall.
  dusk: {
    night: '#0c0b10',
    panel: '#16151c',
    panel2: '#1d1b24',
    line: 'rgba(255,255,255,0.08)',
    text: '#f3f0f4',
    muted: '#9a93a5',
    ink: '#e23343',
    inkDeep: '#db3141',
    inkSoft: 'rgba(226,51,67,0.16)',
    glow: '#ff7a9c',
    gold: '#f4c66b',
    inkText: '#e23343',
    goldText: '#f4c66b',
    onGold: '#2b2029',
    dangerText: '#ff8a94',
    linkText: '#ff7a9c',
    overlay: 'rgba(10,9,13,0.62)',
    onOverlay: '#ffffff',
    ring: '#ffffff',
    barStyle: 'light',
    board: {
      colors: ['#33445f', '#5c5f78', '#8a6b73', '#2e2733'],
      positions: [0, 0.45, 0.7, 1],
      highlight: 'rgba(247,217,176,0.85)',
    },
    glass: {
      blurTint: 'dark',
      blurIntensity: 42,
      tint: 'rgba(22,21,28,0.42)',
      tintStrong: 'rgba(18,17,24,0.84)',
      tintAndroid: 'rgba(20,19,26,0.80)',
      tintStrongAndroid: 'rgba(17,16,22,0.94)',
      border: 'rgba(255,255,255,0.14)',
      edge: 'rgba(255,255,255,0.34)',
      glowInk: 'rgba(255,122,156,0.20)',
      shadow: '#000000',
      wellIdle: 'rgba(255,255,255,0.07)',
    },
  },
  // B — Candlelight: the same dark intimacy, warmed. Plum-black, coral ink.
  candlelight: {
    night: '#1a1216',
    panel: '#251a20',
    panel2: '#2e2028',
    line: 'rgba(255,240,235,0.09)',
    text: '#f7efe9',
    muted: '#b6a49d',
    ink: '#ef5a63',
    inkDeep: '#c64b52',
    inkSoft: 'rgba(239,90,99,0.18)',
    glow: '#ff9ea9',
    gold: '#f3c98a',
    inkText: '#ef5a63',
    goldText: '#f3c98a',
    onGold: '#2b2029',
    dangerText: '#ff9aa2',
    linkText: '#ff9ea9',
    overlay: 'rgba(24,14,18,0.58)',
    onOverlay: '#ffffff',
    ring: '#ffffff',
    barStyle: 'light',
    board: {
      colors: ['#4a3b4f', '#7a5560', '#b07a63', '#3a2630'],
      positions: [0, 0.45, 0.72, 1],
      highlight: 'rgba(255,216,164,0.92)',
    },
    glass: {
      blurTint: 'dark',
      blurIntensity: 40,
      tint: 'rgba(37,26,32,0.40)',
      tintStrong: 'rgba(30,21,26,0.78)',
      tintAndroid: 'rgba(35,24,30,0.80)',
      tintStrongAndroid: 'rgba(28,19,24,0.94)',
      border: 'rgba(255,238,232,0.16)',
      edge: 'rgba(255,226,214,0.38)',
      glowInk: 'rgba(255,158,169,0.22)',
      shadow: '#120a0e',
      wellIdle: 'rgba(255,240,235,0.08)',
    },
  },
  // C — Daylight: bright, cheerful, light. Warm cream, rosy ink.
  daylight: {
    night: '#fbf4ea',
    panel: '#ffffff',
    panel2: '#fdf5eb',
    line: 'rgba(43,32,41,0.10)',
    text: '#2b2029',
    // darkened from #8a7c77 (3.68:1, failed WCAG AA) to clear 4.5:1 on every
    // daylight ground — muted is secondary body text, so legibility wins
    muted: '#6f625c',
    ink: '#ff4d6d',
    inkDeep: '#cf3e58',
    inkSoft: 'rgba(255,77,109,0.12)',
    glow: '#ff8fab',
    gold: '#f5a524',
    // darker than the bright fills above so accent TEXT clears AA on cream
    inkText: '#d81b60',
    goldText: '#8f5e00',
    onGold: '#2b2029',
    dangerText: '#b3261e',
    linkText: '#c2185b',
    overlay: 'rgba(255,255,255,0.80)',
    onOverlay: '#2b2029',
    ring: '#2b2029',
    barStyle: 'dark',
    board: {
      colors: ['#bfe3ff', '#ffd7e6', '#ffe9c7'],
      positions: [0, 0.52, 1],
      highlight: 'rgba(255,255,255,0.9)',
    },
    glass: {
      blurTint: 'light',
      blurIntensity: 55,
      tint: 'rgba(255,255,255,0.58)',
      tintStrong: 'rgba(255,255,255,0.92)',
      tintAndroid: 'rgba(255,252,247,0.86)',
      tintStrongAndroid: 'rgba(255,253,250,0.96)',
      border: 'rgba(43,32,41,0.12)',
      edge: 'rgba(255,255,255,0.9)',
      glowInk: 'rgba(255,143,171,0.24)',
      shadow: '#6b4a52',
      wellIdle: 'rgba(43,32,41,0.06)',
    },
  },
};

export const THEME_ORDER: ThemeName[] = ['dusk', 'candlelight', 'daylight'];
export const THEME_LABELS: Record<ThemeName, string> = {
  dusk: 'Dusk',
  candlelight: 'Candlelight',
  daylight: 'Daylight',
};

/** Default palette, also used by any non-component code that needs a colour. */
export const colors: Palette = PALETTES.dusk;

export const radius = {
  card: 28,
  tool: 14,
  button: 16,
  pill: 99,
} as const;

export const fonts = {
  handwriting: 'Caveat_700Bold',
  handwritingMedium: 'Caveat_500Medium',
} as const;

// The five drawing inks — the same on every theme (they're marks on the canvas,
// not app chrome), so a saved stroke always looks like itself.
export const swatches = ['#e23343', '#ff7a9c', '#ffffff', '#f4c66b', '#7ec8ff'] as const;
