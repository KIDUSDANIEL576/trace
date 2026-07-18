import type { Brush } from '@/types';

// Widths are normalized to canvas width (prototype used px at ~400px wide).
export const BRUSHES: Record<Brush, { label: string; width: number }> = {
  marker: { label: 'Marker', width: 16 / 400 },
  glow: { label: 'Glow pen', width: 9 / 400 },
  neon: { label: 'Neon', width: 4 / 400 },
  chalk: { label: 'Chalk', width: 7 / 400 },
};

export const BRUSH_ORDER: Brush[] = ['marker', 'glow', 'neon', 'chalk'];
