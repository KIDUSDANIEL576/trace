// Canvas backgrounds — the "sky" you draw on. Each preset is a vertical
// gradient plus an optional glow and a faint motif (a love sign, a sun, a
// moon…), rendered in Skia so it stays crisp at any size, costs nothing to
// download, and looks identical on both phones.
//
// A couple picks one for a canvas; it syncs live and persists. Photos are
// handled separately (kind: 'photo' below) since they come from the user.

export type MotifKind =
  | 'none'
  | 'heart'
  | 'sun'
  | 'moon'
  | 'stars'
  | 'sparkle'
  | 'hearts' // a soft scatter of little love signs
  | 'rain' // gentle streaks
  | 'petals' // drifting blossom
  | 'snow' // slow flakes
  | 'waves' // rolling surf lines
  | 'trees' // a soft pine treeline
  | 'galaxy' // a dense star field with a bright band
  | 'flame' // a candle flame with its halo
  | 'peaks' // a mountain ridgeline with snow caps
  | 'rainbow' // an arc of soft colour bands
  | 'fireworks' // bursts of radiating sparks
  | 'leaves'; // drifting autumn leaves

/**
 * Photographic finish — what turns a flat vector gradient into something that
 * feels like a film photograph. All procedural (no image assets), so it stays
 * weightless and renders identically on both phones.
 */
export interface FilmFinish {
  /** Film grain strength, 0..1 (0.05–0.12 reads as real grain, not noise). */
  grain: number;
  /** Soft out-of-focus light circles — count and tint. */
  bokeh: { count: number; color: string; size: number } | null;
  /** Warm diffuse haze washing across the frame, like light through a lens. */
  haze: { color: string; x: number; y: number; r: number } | null;
  /** Darkened corners, 0..1 — the single biggest "shot on film" cue. */
  vignette: number;
}

export interface BackgroundPreset {
  key: string;
  label: string;
  /** Vertical gradient stops, top → bottom. */
  colors: string[];
  positions: number[];
  /** Soft radial light — the sun/moon glow. Null for flat skies. */
  glow: { color: string; x: number; y: number; r: number } | null;
  motif: MotifKind;
  /** Motif tint; drawn very faintly over the gradient. */
  motifColor: string;
  /** True when the ground is light enough that dark ink reads well on it. */
  light: boolean;
  /** Optional photographic treatment (the "aesthetic" presets use this). */
  film?: FilmFinish;
}

/** A gentle default finish — used when a preset asks for film without detail. */
export const SOFT_FILM: FilmFinish = {
  grain: 0.07,
  bokeh: null,
  haze: null,
  vignette: 0.22,
};

export const BACKGROUNDS: BackgroundPreset[] = [
  {
    key: 'dusk',
    label: 'Dusk',
    colors: ['#33445f', '#5c5f78', '#8a6b73', '#2e2733'],
    positions: [0, 0.45, 0.7, 1],
    glow: { color: 'rgba(247,217,176,0.85)', x: 0.7, y: 0.18, r: 0.62 },
    motif: 'none',
    motifColor: 'rgba(255,255,255,0.10)',
    light: false,
  },
  {
    key: 'sunset',
    label: 'Sunset',
    colors: ['#ff9a5a', '#ff6f7d', '#c14a86', '#5b2a6b'],
    positions: [0, 0.38, 0.68, 1],
    glow: { color: 'rgba(255,236,180,0.9)', x: 0.5, y: 0.62, r: 0.5 },
    motif: 'sun',
    motifColor: 'rgba(255,244,214,0.5)',
    light: false,
    film: { grain: 0.08, bokeh: null, haze: null, vignette: 0.26 },
  },
  {
    key: 'evening',
    label: 'Evening',
    colors: ['#20304f', '#3d4a72', '#6b5b8a', '#241f38'],
    positions: [0, 0.4, 0.72, 1],
    glow: { color: 'rgba(255,214,170,0.5)', x: 0.22, y: 0.24, r: 0.45 },
    motif: 'moon',
    motifColor: 'rgba(255,246,222,0.65)',
    light: false,
    film: { grain: 0.09, bokeh: null, haze: null, vignette: 0.3 },
  },
  {
    key: 'starry',
    label: 'Starry',
    colors: ['#0f1836', '#1c2a52', '#2f2a55', '#120f26'],
    positions: [0, 0.4, 0.75, 1],
    glow: { color: 'rgba(150,180,255,0.35)', x: 0.6, y: 0.2, r: 0.55 },
    motif: 'stars',
    motifColor: 'rgba(255,250,235,0.85)',
    light: false,
  },
  {
    key: 'rose',
    label: 'Rose',
    colors: ['#ffd9e2', '#ffb3c6', '#f38fa8', '#c96a86'],
    positions: [0, 0.4, 0.72, 1],
    glow: { color: 'rgba(255,255,255,0.75)', x: 0.5, y: 0.2, r: 0.55 },
    motif: 'heart',
    motifColor: 'rgba(255,255,255,0.35)',
    light: true,
    film: { grain: 0.07, bokeh: null, haze: null, vignette: 0.22 },
  },
  {
    key: 'blush',
    label: 'Blush',
    colors: ['#fff1e6', '#ffe0e9', '#ffd0dd', '#f7bcd0'],
    positions: [0, 0.4, 0.72, 1],
    glow: { color: 'rgba(255,255,255,0.85)', x: 0.35, y: 0.25, r: 0.6 },
    motif: 'sparkle',
    motifColor: 'rgba(255,255,255,0.5)',
    light: true,
    film: { grain: 0.07, bokeh: null, haze: null, vignette: 0.2 },
  },
  {
    key: 'lavender',
    label: 'Lavender',
    colors: ['#e7dcff', '#c9b6f2', '#a48fd8', '#6f5aa6'],
    positions: [0, 0.4, 0.72, 1],
    glow: { color: 'rgba(255,240,255,0.7)', x: 0.6, y: 0.22, r: 0.55 },
    motif: 'sparkle',
    motifColor: 'rgba(255,255,255,0.42)',
    light: true,
  },
  {
    key: 'ocean',
    label: 'Ocean',
    colors: ['#bfe6ff', '#7fc4e8', '#3f86b5', '#1d3f63'],
    positions: [0, 0.38, 0.7, 1],
    glow: { color: 'rgba(255,247,214,0.6)', x: 0.72, y: 0.18, r: 0.5 },
    motif: 'sun',
    motifColor: 'rgba(255,250,225,0.42)',
    light: false,
  },
  {
    key: 'ember',
    label: 'Ember',
    colors: ['#2b1216', '#6d2530', '#c04a3d', '#f2894f'],
    positions: [0, 0.42, 0.78, 1],
    glow: { color: 'rgba(255,190,120,0.55)', x: 0.5, y: 0.85, r: 0.55 },
    motif: 'heart',
    motifColor: 'rgba(255,205,160,0.28)',
    light: false,
    film: { grain: 0.09, bokeh: null, haze: null, vignette: 0.3 },
  },
  {
    key: 'meadow',
    label: 'Meadow',
    colors: ['#e9f6d8', '#c3e3a6', '#8fc47c', '#4d7d55'],
    positions: [0, 0.4, 0.72, 1],
    glow: { color: 'rgba(255,252,214,0.75)', x: 0.28, y: 0.2, r: 0.5 },
    motif: 'sun',
    motifColor: 'rgba(255,250,210,0.5)',
    light: true,
  },
  {
    key: 'midnight',
    label: 'Midnight',
    colors: ['#05070f', '#111a2e', '#1b2340', '#05060d'],
    positions: [0, 0.4, 0.75, 1],
    glow: { color: 'rgba(180,200,255,0.22)', x: 0.5, y: 0.3, r: 0.6 },
    motif: 'stars',
    motifColor: 'rgba(255,252,240,0.9)',
    light: false,
  },
  {
    key: 'honey',
    label: 'Honey',
    colors: ['#fff4d6', '#ffe1a8', '#f3bd74', '#c9884a'],
    positions: [0, 0.4, 0.72, 1],
    glow: { color: 'rgba(255,255,240,0.8)', x: 0.5, y: 0.22, r: 0.55 },
    motif: 'heart',
    motifColor: 'rgba(255,255,255,0.4)',
    light: true,
    film: { grain: 0.07, bokeh: null, haze: null, vignette: 0.22 },
  },
  // ── second wave ──────────────────────────────────────────────────────────
  {
    key: 'aurora',
    label: 'Aurora',
    colors: ['#04121f', '#0d3b45', '#2c7a6b', '#123a52', '#050b1a'],
    positions: [0, 0.3, 0.52, 0.76, 1],
    glow: { color: 'rgba(120,255,214,0.35)', x: 0.4, y: 0.4, r: 0.6 },
    motif: 'stars',
    motifColor: 'rgba(228,255,246,0.8)',
    light: false,
  },
  {
    key: 'cherry',
    label: 'Cherry blossom',
    colors: ['#fff5f7', '#ffdfe7', '#f9c2d2', '#e79ab3'],
    positions: [0, 0.38, 0.7, 1],
    glow: { color: 'rgba(255,255,255,0.85)', x: 0.6, y: 0.2, r: 0.55 },
    motif: 'petals',
    motifColor: 'rgba(255,255,255,0.75)',
    light: true,
    film: { grain: 0.07, bokeh: null, haze: null, vignette: 0.22 },
  },
  {
    key: 'rainy',
    label: 'Rainy day',
    colors: ['#3c4a5a', '#55677a', '#7e8fa0', '#2c3742'],
    positions: [0, 0.42, 0.74, 1],
    glow: { color: 'rgba(226,240,255,0.35)', x: 0.5, y: 0.3, r: 0.6 },
    motif: 'rain',
    motifColor: 'rgba(230,244,255,0.42)',
    light: false,
  },
  {
    key: 'snowfall',
    label: 'Snowfall',
    colors: ['#dfeaf6', '#c3d6ea', '#9db6d2', '#63789a'],
    positions: [0, 0.38, 0.7, 1],
    glow: { color: 'rgba(255,255,255,0.8)', x: 0.5, y: 0.18, r: 0.6 },
    motif: 'snow',
    motifColor: 'rgba(255,255,255,0.9)',
    light: true,
  },
  {
    key: 'citylights',
    label: 'City lights',
    colors: ['#0a0a18', '#1d1633', '#4a2350', '#8a3b52', '#241226'],
    positions: [0, 0.3, 0.58, 0.82, 1],
    glow: { color: 'rgba(255,180,120,0.45)', x: 0.5, y: 0.78, r: 0.55 },
    motif: 'sparkle',
    motifColor: 'rgba(255,226,170,0.6)',
    light: false,
    film: { grain: 0.1, bokeh: null, haze: null, vignette: 0.34 },
  },
  {
    key: 'dawn',
    label: 'Dawn',
    colors: ['#2a3a63', '#7a6a95', '#e8998d', '#ffd9a0'],
    positions: [0, 0.36, 0.7, 1],
    glow: { color: 'rgba(255,236,196,0.75)', x: 0.5, y: 0.88, r: 0.5 },
    motif: 'sun',
    motifColor: 'rgba(255,245,220,0.45)',
    light: false,
    film: { grain: 0.08, bokeh: null, haze: null, vignette: 0.26 },
  },
  {
    key: 'peach',
    label: 'Peach',
    colors: ['#fff0e4', '#ffd9c2', '#ffbfa3', '#f09a86'],
    positions: [0, 0.4, 0.72, 1],
    glow: { color: 'rgba(255,255,250,0.85)', x: 0.4, y: 0.22, r: 0.55 },
    motif: 'hearts',
    motifColor: 'rgba(255,255,255,0.5)',
    light: true,
    film: { grain: 0.07, bokeh: null, haze: null, vignette: 0.22 },
  },
  {
    key: 'velvet',
    label: 'Velvet',
    colors: ['#1b0b18', '#3f1130', '#6b1b44', '#2a0d22'],
    positions: [0, 0.4, 0.72, 1],
    glow: { color: 'rgba(255,140,190,0.32)', x: 0.55, y: 0.3, r: 0.55 },
    motif: 'hearts',
    motifColor: 'rgba(255,190,220,0.3)',
    light: false,
    film: { grain: 0.09, bokeh: null, haze: null, vignette: 0.32 },
  },
  {
    key: 'mint',
    label: 'Mint',
    colors: ['#effcf5', '#c9f0e0', '#9adcc6', '#5fae99'],
    positions: [0, 0.4, 0.72, 1],
    glow: { color: 'rgba(255,255,255,0.8)', x: 0.6, y: 0.2, r: 0.55 },
    motif: 'sparkle',
    motifColor: 'rgba(255,255,255,0.55)',
    light: true,
  },
  {
    key: 'desert',
    label: 'Desert',
    colors: ['#ffe9c4', '#f6c58a', '#d68f68', '#8a4f4a'],
    positions: [0, 0.4, 0.72, 1],
    glow: { color: 'rgba(255,240,200,0.7)', x: 0.7, y: 0.24, r: 0.55 },
    motif: 'sun',
    motifColor: 'rgba(255,246,214,0.5)',
    light: true,
    film: { grain: 0.08, bokeh: null, haze: null, vignette: 0.24 },
  },
  {
    key: 'moonlit',
    label: 'Moonlit',
    colors: ['#0b1226', '#1a2545', '#33406b', '#0a0f1f'],
    positions: [0, 0.38, 0.72, 1],
    glow: { color: 'rgba(210,225,255,0.45)', x: 0.72, y: 0.18, r: 0.5 },
    motif: 'moon',
    motifColor: 'rgba(245,250,255,0.8)',
    light: false,
    film: { grain: 0.09, bokeh: null, haze: null, vignette: 0.32 },
  },
  {
    key: 'wine',
    label: 'Wine',
    colors: ['#2a0f1c', '#5a1a2e', '#8f2b3d', '#c25a52'],
    positions: [0, 0.4, 0.74, 1],
    glow: { color: 'rgba(255,170,140,0.4)', x: 0.5, y: 0.85, r: 0.55 },
    motif: 'heart',
    motifColor: 'rgba(255,200,190,0.3)',
    light: false,
    film: { grain: 0.09, bokeh: null, haze: null, vignette: 0.32 },
  },
  // ── third wave ───────────────────────────────────────────────────────────
  {
    key: 'beach',
    label: 'Beach',
    // sky → horizon haze → sea → wet sand
    colors: ['#9fdcf5', '#ffe6c2', '#5fb6c9', '#2b7f9b', '#e6cfa6'],
    positions: [0, 0.36, 0.5, 0.76, 1],
    glow: { color: 'rgba(255,244,206,0.8)', x: 0.68, y: 0.24, r: 0.5 },
    motif: 'waves',
    motifColor: 'rgba(255,255,255,0.5)',
    light: true,
    film: { grain: 0.07, bokeh: null, haze: null, vignette: 0.22 },
  },
  {
    key: 'forest',
    label: 'Forest',
    colors: ['#cfe8d6', '#7fb894', '#2f6b52', '#123a2e'],
    positions: [0, 0.34, 0.68, 1],
    glow: { color: 'rgba(255,247,205,0.55)', x: 0.3, y: 0.16, r: 0.45 },
    motif: 'trees',
    motifColor: 'rgba(14,42,33,0.45)',
    light: true,
    film: { grain: 0.08, bokeh: null, haze: null, vignette: 0.26 },
  },
  {
    key: 'galaxy',
    label: 'Galaxy',
    colors: ['#05030f', '#1b0f3a', '#43206b', '#7a2f6a', '#0a0518'],
    positions: [0, 0.28, 0.52, 0.74, 1],
    glow: { color: 'rgba(190,150,255,0.4)', x: 0.42, y: 0.44, r: 0.62 },
    motif: 'galaxy',
    motifColor: 'rgba(255,250,240,0.9)',
    light: false,
    film: { grain: 0.09, bokeh: null, haze: null, vignette: 0.34 },
  },
  {
    key: 'candlelit',
    label: 'Candlelit',
    colors: ['#150a08', '#3a1a10', '#7a3d1c', '#c9762f', '#2a1109'],
    positions: [0, 0.3, 0.58, 0.78, 1],
    glow: { color: 'rgba(255,196,110,0.55)', x: 0.5, y: 0.58, r: 0.5 },
    motif: 'flame',
    motifColor: 'rgba(255,226,160,0.85)',
    light: false,
    film: { grain: 0.11, bokeh: null, haze: null, vignette: 0.38 },
  },
  // ── fourth wave ──────────────────────────────────────────────────────────
  {
    key: 'mountains',
    label: 'Mountains',
    // alpine dawn: cold sky warming toward the ridge
    colors: ['#8fc4e8', '#c9dcef', '#f0d6c2', '#a98f9b', '#4a4560'],
    positions: [0, 0.3, 0.5, 0.74, 1],
    glow: { color: 'rgba(255,238,204,0.7)', x: 0.32, y: 0.2, r: 0.48 },
    motif: 'peaks',
    motifColor: 'rgba(58,62,88,0.55)',
    light: true,
    film: { grain: 0.07, bokeh: null, haze: null, vignette: 0.24 },
  },
  {
    key: 'rainbow',
    label: 'Rainbow',
    // after the rain: washed sky, the arc supplies the colour
    colors: ['#dff1fb', '#cfe6f5', '#bcd8ec', '#9dbfd8'],
    positions: [0, 0.4, 0.72, 1],
    glow: { color: 'rgba(255,255,255,0.85)', x: 0.5, y: 0.22, r: 0.6 },
    motif: 'rainbow',
    motifColor: 'rgba(255,255,255,0.5)',
    light: true,
  },
  {
    key: 'fireworks',
    label: 'Fireworks',
    colors: ['#050a1c', '#0e1b3f', '#25275c', '#12132e'],
    positions: [0, 0.38, 0.72, 1],
    glow: { color: 'rgba(120,150,255,0.28)', x: 0.5, y: 0.35, r: 0.6 },
    motif: 'fireworks',
    motifColor: 'rgba(255,228,170,0.85)',
    light: false,
  },
  {
    key: 'autumn',
    label: 'Autumn',
    colors: ['#fceccd', '#f6c98a', '#dd8f4f', '#a8532e', '#5e2b1c'],
    positions: [0, 0.3, 0.56, 0.8, 1],
    glow: { color: 'rgba(255,232,180,0.7)', x: 0.66, y: 0.2, r: 0.5 },
    motif: 'leaves',
    motifColor: 'rgba(150,60,28,0.42)',
    light: true,
    film: { grain: 0.08, bokeh: null, haze: null, vignette: 0.26 },
  },

  // ── Calm love · the film-photograph set ──────────────────────────────────
  // Muted, hazy, grainy. These are built to feel like a saved photo rather
  // than a rendered gradient: desaturated palettes, warm light leaks, soft
  // bokeh and real film grain.
  {
    key: 'goldenhour',
    label: 'Golden hour',
    colors: ['#f6d9b0', '#eeb98b', '#d98f74', '#9c6154', '#4e3038'],
    positions: [0, 0.3, 0.55, 0.8, 1],
    glow: { color: 'rgba(255,226,168,0.85)', x: 0.72, y: 0.3, r: 0.6 },
    motif: 'none',
    motifColor: 'rgba(255,255,255,0.1)',
    light: true,
    film: {
      grain: 0.1,
      bokeh: { count: 9, color: 'rgba(255,226,170,0.5)', size: 0.1 },
      haze: { color: 'rgba(255,206,150,0.4)', x: 0.78, y: 0.26, r: 0.75 },
      vignette: 0.3,
    },
  },
  {
    key: 'linen',
    label: 'Linen',
    colors: ['#f3ece2', '#e8ddcf', '#d9cab8', '#bda893'],
    positions: [0, 0.38, 0.72, 1],
    glow: { color: 'rgba(255,250,240,0.7)', x: 0.4, y: 0.24, r: 0.6 },
    motif: 'none',
    motifColor: 'rgba(255,255,255,0.1)',
    light: true,
    film: {
      grain: 0.11,
      bokeh: null,
      haze: { color: 'rgba(255,240,220,0.32)', x: 0.3, y: 0.2, r: 0.7 },
      vignette: 0.26,
    },
  },
  {
    key: 'dustyrose',
    label: 'Dusty rose',
    colors: ['#f0dcd8', '#dfbcb8', '#c3969a', '#8f6a72', '#4c3740'],
    positions: [0, 0.32, 0.58, 0.82, 1],
    glow: { color: 'rgba(255,232,226,0.6)', x: 0.5, y: 0.24, r: 0.62 },
    motif: 'none',
    motifColor: 'rgba(255,255,255,0.1)',
    light: true,
    film: {
      grain: 0.09,
      bokeh: { count: 7, color: 'rgba(255,220,215,0.42)', size: 0.09 },
      haze: { color: 'rgba(255,214,206,0.3)', x: 0.62, y: 0.7, r: 0.65 },
      vignette: 0.28,
    },
  },
  {
    key: 'sage',
    label: 'Sage',
    colors: ['#e6ece0', '#cbd6c2', '#a8b8a0', '#7b8c78', '#414b42'],
    positions: [0, 0.32, 0.58, 0.82, 1],
    glow: { color: 'rgba(250,255,240,0.55)', x: 0.35, y: 0.2, r: 0.6 },
    motif: 'none',
    motifColor: 'rgba(255,255,255,0.1)',
    light: true,
    film: {
      grain: 0.1,
      bokeh: null,
      haze: { color: 'rgba(240,250,225,0.28)', x: 0.28, y: 0.18, r: 0.68 },
      vignette: 0.27,
    },
  },
  {
    key: 'filmnight',
    label: 'Film night',
    colors: ['#101420', '#1d2536', '#33344a', '#191a26'],
    positions: [0, 0.36, 0.7, 1],
    glow: { color: 'rgba(255,196,150,0.28)', x: 0.68, y: 0.34, r: 0.55 },
    motif: 'none',
    motifColor: 'rgba(255,255,255,0.1)',
    light: false,
    film: {
      grain: 0.12,
      bokeh: { count: 12, color: 'rgba(255,206,150,0.42)', size: 0.085 },
      haze: { color: 'rgba(255,180,130,0.22)', x: 0.72, y: 0.4, r: 0.7 },
      vignette: 0.4,
    },
  },
  {
    key: 'lightleak',
    label: 'Light leak',
    colors: ['#2a1c24', '#5a3038', '#a2564a', '#e8a06a', '#2b1a1e'],
    positions: [0, 0.26, 0.5, 0.72, 1],
    glow: { color: 'rgba(255,190,120,0.5)', x: 0.5, y: 0.5, r: 0.7 },
    motif: 'none',
    motifColor: 'rgba(255,255,255,0.1)',
    light: false,
    film: {
      grain: 0.12,
      bokeh: { count: 6, color: 'rgba(255,214,160,0.4)', size: 0.12 },
      haze: { color: 'rgba(255,168,110,0.45)', x: 0.15, y: 0.55, r: 0.8 },
      vignette: 0.36,
    },
  },
  {
    key: 'quiet',
    label: 'Quiet',
    colors: ['#eef0f2', '#dfe3e6', '#c8cfd4', '#a3adb5'],
    positions: [0, 0.38, 0.72, 1],
    glow: { color: 'rgba(255,255,255,0.75)', x: 0.5, y: 0.22, r: 0.65 },
    motif: 'none',
    motifColor: 'rgba(255,255,255,0.1)',
    light: true,
    film: {
      grain: 0.1,
      bokeh: null,
      haze: { color: 'rgba(238,244,250,0.3)', x: 0.5, y: 0.25, r: 0.7 },
      vignette: 0.24,
    },
  },
  {
    key: 'amber',
    label: 'Amber',
    colors: ['#2a1508', '#5c2f11', '#a8641f', '#e2a44c', '#22120a'],
    positions: [0, 0.28, 0.54, 0.78, 1],
    glow: { color: 'rgba(255,206,130,0.5)', x: 0.5, y: 0.55, r: 0.6 },
    motif: 'none',
    motifColor: 'rgba(255,255,255,0.1)',
    light: false,
    film: {
      grain: 0.11,
      bokeh: { count: 10, color: 'rgba(255,214,150,0.45)', size: 0.09 },
      haze: { color: 'rgba(255,180,110,0.35)', x: 0.5, y: 0.62, r: 0.7 },
      vignette: 0.38,
    },
  },
  {
    key: 'oat',
    label: 'Oat',
    colors: ['#f7f2e8', '#ece3d4', '#dccfbb', '#c2b19a'],
    positions: [0, 0.36, 0.7, 1],
    glow: { color: 'rgba(255,252,244,0.7)', x: 0.44, y: 0.22, r: 0.62 },
    motif: 'none',
    motifColor: 'rgba(255,255,255,0.1)',
    light: true,
    film: {
      grain: 0.11,
      bokeh: null,
      haze: { color: 'rgba(255,246,228,0.3)', x: 0.34, y: 0.2, r: 0.72 },
      vignette: 0.24,
    },
  },
  {
    key: 'clay',
    label: 'Clay',
    colors: ['#f0dfd2', '#dcbca8', '#c0947f', '#8e6857', '#4a3730'],
    positions: [0, 0.3, 0.56, 0.8, 1],
    glow: { color: 'rgba(255,236,218,0.6)', x: 0.55, y: 0.24, r: 0.6 },
    motif: 'none',
    motifColor: 'rgba(255,255,255,0.1)',
    light: true,
    film: {
      grain: 0.1,
      bokeh: { count: 6, color: 'rgba(255,226,200,0.38)', size: 0.095 },
      haze: { color: 'rgba(250,214,186,0.3)', x: 0.6, y: 0.66, r: 0.68 },
      vignette: 0.29,
    },
  },
  {
    key: 'fog',
    label: 'Fog',
    colors: ['#e9eaea', '#d5d8d9', '#b9c0c2', '#8e989c', '#5b6367'],
    positions: [0, 0.3, 0.56, 0.8, 1],
    glow: { color: 'rgba(252,253,254,0.65)', x: 0.48, y: 0.26, r: 0.7 },
    motif: 'none',
    motifColor: 'rgba(255,255,255,0.1)',
    light: true,
    film: {
      grain: 0.12,
      bokeh: null,
      haze: { color: 'rgba(244,248,250,0.34)', x: 0.5, y: 0.34, r: 0.78 },
      vignette: 0.26,
    },
  },
  {
    key: 'mauve',
    label: 'Mauve',
    colors: ['#efe6ec', '#d9c7d5', '#b8a1b6', '#8a7488', '#4b3f4c'],
    positions: [0, 0.3, 0.56, 0.8, 1],
    glow: { color: 'rgba(250,240,250,0.6)', x: 0.46, y: 0.22, r: 0.62 },
    motif: 'none',
    motifColor: 'rgba(255,255,255,0.1)',
    light: true,
    film: {
      grain: 0.1,
      bokeh: { count: 7, color: 'rgba(240,220,240,0.36)', size: 0.09 },
      haze: { color: 'rgba(236,216,236,0.3)', x: 0.4, y: 0.7, r: 0.68 },
      vignette: 0.28,
    },
  },
  {
    key: 'terracotta',
    label: 'Terracotta',
    colors: ['#f3e2d3', '#e0b193', '#c07f5e', '#8d5540', '#3f2a24'],
    positions: [0, 0.28, 0.54, 0.78, 1],
    glow: { color: 'rgba(255,232,206,0.58)', x: 0.62, y: 0.26, r: 0.58 },
    motif: 'none',
    motifColor: 'rgba(255,255,255,0.1)',
    light: true,
    film: {
      grain: 0.11,
      bokeh: null,
      haze: { color: 'rgba(252,206,172,0.32)', x: 0.7, y: 0.28, r: 0.7 },
      vignette: 0.3,
    },
  },
  {
    key: 'olive',
    label: 'Olive',
    colors: ['#eceadc', '#d2cfb4', '#adaa85', '#7e7c5c', '#403f2f'],
    positions: [0, 0.3, 0.56, 0.8, 1],
    glow: { color: 'rgba(252,250,232,0.55)', x: 0.38, y: 0.22, r: 0.6 },
    motif: 'none',
    motifColor: 'rgba(255,255,255,0.1)',
    light: true,
    film: {
      grain: 0.11,
      bokeh: null,
      haze: { color: 'rgba(248,246,214,0.28)', x: 0.32, y: 0.2, r: 0.7 },
      vignette: 0.28,
    },
  },
  {
    key: 'slate',
    label: 'Slate',
    colors: ['#1c2026', '#2c333c', '#434c58', '#20252b'],
    positions: [0, 0.36, 0.7, 1],
    glow: { color: 'rgba(200,214,230,0.24)', x: 0.56, y: 0.3, r: 0.6 },
    motif: 'none',
    motifColor: 'rgba(255,255,255,0.1)',
    light: false,
    film: {
      grain: 0.12,
      bokeh: { count: 8, color: 'rgba(210,224,240,0.3)', size: 0.085 },
      haze: { color: 'rgba(190,208,228,0.2)', x: 0.6, y: 0.36, r: 0.72 },
      vignette: 0.36,
    },
  },
  {
    key: 'espresso',
    label: 'Espresso',
    colors: ['#150f0c', '#2c1f18', '#4b352a', '#6d4c39', '#1a1310'],
    positions: [0, 0.28, 0.54, 0.78, 1],
    glow: { color: 'rgba(240,196,148,0.28)', x: 0.6, y: 0.36, r: 0.58 },
    motif: 'none',
    motifColor: 'rgba(255,255,255,0.1)',
    light: false,
    film: {
      grain: 0.12,
      bokeh: { count: 9, color: 'rgba(248,206,156,0.34)', size: 0.09 },
      haze: { color: 'rgba(236,180,130,0.24)', x: 0.66, y: 0.44, r: 0.7 },
      vignette: 0.4,
    },
  },
  {
    key: 'pearl',
    label: 'Pearl',
    colors: ['#faf7f4', '#f0e9e6', '#e2d8d6', '#cbbfc0'],
    positions: [0, 0.36, 0.7, 1],
    glow: { color: 'rgba(255,253,252,0.8)', x: 0.5, y: 0.2, r: 0.66 },
    motif: 'none',
    motifColor: 'rgba(255,255,255,0.1)',
    light: true,
    film: {
      grain: 0.1,
      bokeh: { count: 5, color: 'rgba(255,246,244,0.35)', size: 0.1 },
      haze: { color: 'rgba(255,248,246,0.28)', x: 0.44, y: 0.24, r: 0.74 },
      vignette: 0.22,
    },
  },
];

export const DEFAULT_BACKGROUND_KEY = 'dusk';

export function backgroundByKey(key: string | null | undefined): BackgroundPreset {
  return (
    BACKGROUNDS.find((b) => b.key === key) ??
    BACKGROUNDS.find((b) => b.key === DEFAULT_BACKGROUND_KEY)!
  );
}

/** Clamps a stored opacity to something always drawable (never fully invisible). */
export function clampBgOpacity(v: number | null | undefined): number {
  if (typeof v !== 'number' || Number.isNaN(v)) return 1;
  return Math.min(1, Math.max(0.15, v));
}
