// Design tokens from the approved prototype. Dark only.
export const colors = {
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
} as const;

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

// The five swatches from the prototype toolbar.
export const swatches = ['#e23343', '#ff7a9c', '#ffffff', '#f4c66b', '#7ec8ff'] as const;
