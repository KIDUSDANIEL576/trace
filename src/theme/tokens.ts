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
  ink: string; // signature marker
  inkSoft: string;
  glow: string;
  gold: string;
  overlay: string; // translucent chip/pill over the canvas
  onOverlay: string; // text on that overlay
  ring: string; // selected colour-swatch ring
  barStyle: 'light' | 'dark'; // status bar contrast
  board: BoardPalette;
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
    inkSoft: 'rgba(226,51,67,0.16)',
    glow: '#ff7a9c',
    gold: '#f4c66b',
    overlay: 'rgba(10,9,13,0.62)',
    onOverlay: '#ffffff',
    ring: '#ffffff',
    barStyle: 'light',
    board: {
      colors: ['#33445f', '#5c5f78', '#8a6b73', '#2e2733'],
      positions: [0, 0.45, 0.7, 1],
      highlight: 'rgba(247,217,176,0.85)',
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
    inkSoft: 'rgba(239,90,99,0.18)',
    glow: '#ff9ea9',
    gold: '#f3c98a',
    overlay: 'rgba(24,14,18,0.58)',
    onOverlay: '#ffffff',
    ring: '#ffffff',
    barStyle: 'light',
    board: {
      colors: ['#4a3b4f', '#7a5560', '#b07a63', '#3a2630'],
      positions: [0, 0.45, 0.72, 1],
      highlight: 'rgba(255,216,164,0.92)',
    },
  },
  // C — Daylight: bright, cheerful, light. Warm cream, rosy ink.
  daylight: {
    night: '#fbf4ea',
    panel: '#ffffff',
    panel2: '#fdf5eb',
    line: 'rgba(43,32,41,0.10)',
    text: '#2b2029',
    muted: '#8a7c77',
    ink: '#ff4d6d',
    inkSoft: 'rgba(255,77,109,0.12)',
    glow: '#ff8fab',
    gold: '#f5a524',
    overlay: 'rgba(255,255,255,0.80)',
    onOverlay: '#2b2029',
    ring: '#2b2029',
    barStyle: 'dark',
    board: {
      colors: ['#bfe3ff', '#ffd7e6', '#ffe9c7'],
      positions: [0, 0.52, 1],
      highlight: 'rgba(255,255,255,0.9)',
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
