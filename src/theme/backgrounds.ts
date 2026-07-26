// Canvas backgrounds — the "sky" you draw on. Each preset is a vertical
// gradient plus an optional glow and a faint motif (a love sign, a sun, a
// moon…), rendered in Skia so it stays crisp at any size, costs nothing to
// download, and looks identical on both phones.
//
// A couple picks one for a canvas; it syncs live and persists. Photos are
// handled separately (kind: 'photo' below) since they come from the user.

export type MotifKind = 'none' | 'heart' | 'sun' | 'moon' | 'stars' | 'sparkle';

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
}

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
