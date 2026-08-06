/**
 * icons.mjs — monoline icon system replacing every emoji in the frames.
 *
 * 24×24 viewBox, stroke 2, round caps/joins, currentColor — the same icon
 * language (SF Symbols / Lucide) that Noteit, Widgetable and Paired actually
 * ship, and the loudest "mockup tell" emoji had. Hand-traced here so the
 * kit stays dependency-free; keep strokes slightly imperfect on organic
 * shapes (heart, flame, ghost) to sit with Trace's hand-drawn identity.
 */

const S = (id, inner, fill = false) =>
  `<symbol id="i-${id}" viewBox="0 0 24 24">` +
  `<g fill="${fill ? 'currentColor' : 'none'}" stroke="${fill ? 'none' : 'currentColor'}"` +
  ` stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</g></symbol>`;

export const SPRITE =
  '<svg id="ts-icons" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">' +
  S('pencil', '<path d="M17 3.4a2.3 2.3 0 0 1 3.3 3.2L7.6 19.3 3.5 20.5l1.2-4.1z"/><path d="M14.8 5.7l3.4 3.4"/>') +
  S('marker', '<path d="M11 4.6 19.4 13l-4.2 4.2L6.8 8.8z"/><path d="M6.8 8.8 4.6 15l-1 5.4L9 19.4l6.2-2.2"/>') +
  S('sparkles', '<path d="M12 4.5c.7 3.2 2 4.5 5.2 5.2-3.2.7-4.5 2-5.2 5.2-.7-3.2-2-4.5-5.2-5.2 3.2-.7 4.5-2 5.2-5.2z"/><path d="M18.5 15.5c.35 1.6 1 2.25 2.6 2.6-1.6.35-2.25 1-2.6 2.6-.35-1.6-1-2.25-2.6-2.6 1.6-.35 2.25-1 2.6-2.6z"/>') +
  S('zap', '<path d="M13.2 2.8 5.4 13.4h5l-1.6 7.8 7.8-10.6h-5z"/>') +
  S('ghost', '<path d="M12 3.5c-3.9 0-6.5 2.9-6.5 6.7v9.6l2.4-1.9 2 1.9 2.1-1.9 2.1 1.9 2-1.9 2.4 1.9v-9.6c0-3.8-2.6-6.7-6.5-6.7z"/><path d="M9.6 10.4h.01M14.4 10.4h.01"/>') +
  S('flame', '<path d="M12 21c-3.7 0-6.2-2.4-6.2-5.8 0-2.7 1.7-4.6 3.1-6.4C10.1 7.3 11 6 11.2 4c2.6 1.4 3 3.7 2.7 5.6 1-.4 1.7-1.1 2-2.2 1.5 1.7 2.3 3.8 2.3 5.8 0 3.4-2.5 5.8-6.2 5.8z"/>') +
  S('undo', '<path d="M8.5 6.5 4.8 10l3.7 3.5"/><path d="M4.8 10h8.7a5 5 0 0 1 0 10h-3"/>') +
  S('redo', '<path d="M15.5 6.5 19.2 10l-3.7 3.5"/><path d="M19.2 10h-8.7a5 5 0 0 0 0 10h3"/>') +
  S('music', '<path d="M9.5 18.2V6.4l9-2v11.4"/><circle cx="7" cy="18.2" r="2.5"/><circle cx="16" cy="15.8" r="2.5"/>') +
  S('mirror', '<path d="M12 3v18"/><path d="M8.5 7.5 4 12l4.5 4.5"/><path d="M15.5 7.5 20 12l-4.5 4.5"/>') +
  S('eye', '<path d="M2.8 12S6.2 5.8 12 5.8 21.2 12 21.2 12 17.8 18.2 12 18.2 2.8 12 2.8 12z"/><circle cx="12" cy="12" r="2.8"/>') +
  S('pen-line', '<path d="M14.5 5.2a2.1 2.1 0 0 1 3 3L9.4 16.3l-3.9 1 1-3.9z"/><path d="M4.5 20.5h15"/>') +
  S('mail-heart', '<path d="M3.5 6.5h17v11h-17z"/><path d="m3.5 7.5 8.5 6 8.5-6"/>') +
  S('heart-fill', '<path d="M12 20.6c-.4 0-4.9-3-7-6-1.6-2.3-1.8-5.2 0-6.9 1.8-1.7 4.6-1.4 6 .5l1 1.4 1-1.4c1.4-1.9 4.2-2.2 6-.5 1.8 1.7 1.6 4.6 0 6.9-2.1 3-6.6 6-7 6z"/>', true) +
  S('heart', '<path d="M12 20.2c-.4 0-4.7-2.9-6.7-5.8-1.5-2.2-1.7-5 0-6.6 1.7-1.6 4.4-1.3 5.7.5l1 1.3 1-1.3c1.3-1.8 4-2.1 5.7-.5 1.7 1.6 1.5 4.4 0 6.6-2 2.9-6.3 5.8-6.7 5.8z"/>') +
  S('message', '<path d="M20.5 11.6c0 4.2-3.8 7.4-8.5 7.4-1 0-2-.15-2.9-.42L4.2 20l1.3-3.6c-1.25-1.3-2-2.95-2-4.8C3.5 7.4 7.3 4.2 12 4.2s8.5 3.2 8.5 7.4z"/>') +
  S('bookmark', '<path d="M6.5 3.5h11v17L12 16.6l-5.5 3.9z"/>') +
  S('coin', '<circle cx="12" cy="12" r="8.2"/><path d="M12 8v8M9.4 9.8c0-2.3 5.2-2.3 5.2 0 0 2.4-5.2 2-5.2 4.4 0 2.3 5.2 2.3 5.2 0"/>') +
  S('arrows-h', '<path d="M7 8.5 3.5 12 7 15.5"/><path d="M17 8.5 20.5 12 17 15.5"/><path d="M3.5 12h17"/>') +
  S('repeat', '<path d="M17.5 3.5 21 7l-3.5 3.5"/><path d="M3.5 12V9.8A2.8 2.8 0 0 1 6.3 7H21"/><path d="M6.5 20.5 3 17l3.5-3.5"/><path d="M20.5 12v2.2a2.8 2.8 0 0 1-2.8 2.8H3"/>') +
  S('sunrise', '<path d="M12 3.5v3M5 7.6l1.8 1.8M19 7.6l-1.8 1.8"/><path d="M6.8 16a5.2 5.2 0 0 1 10.4 0"/><path d="M3 16h18M6.5 20h11"/>') +
  S('camera', '<path d="M3.5 8.2A1.7 1.7 0 0 1 5.2 6.5h2.3L9 4.3h6l1.5 2.2h2.3a1.7 1.7 0 0 1 1.7 1.7v9.6a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7z"/><circle cx="12" cy="12.7" r="3.4"/>') +
  S('hourglass', '<path d="M6.5 3.5h11M6.5 20.5h11"/><path d="M8 3.5v3.2c0 2.6 4 3.7 4 5.3s-4 2.7-4 5.3v3.2M16 3.5v3.2c0 2.6-4 3.7-4 5.3s4 2.7 4 5.3v3.2"/>') +
  S('share', '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>') +
  S('play', '<path d="M8 5.5c0-.8.9-1.3 1.6-.9l9 5.6c.7.4.7 1.4 0 1.8l-9 5.6c-.7.4-1.6-.1-1.6-.9z"/>') +
  S('trash', '<path d="M4.5 6.8h15M9.7 6.8V4.9c0-.5.4-.9.9-.9h2.8c.5 0 .9.4.9.9v1.9M6.3 6.8l.9 12.4c0 .7.6 1.3 1.3 1.3h7c.7 0 1.3-.6 1.3-1.3l.9-12.4"/><path d="M10 10.8v5.4M14 10.8v5.4"/>') +
  S('gift', '<path d="M4.5 11.5h15v9h-15zM3.5 7.5h17v4h-17zM12 7.5v13"/><path d="M12 7.5c-1.6 0-4.4-.4-4.4-2.4C7.6 3 10.8 3 12 7.5zm0 0c1.6 0 4.4-.4 4.4-2.4C16.4 3 13.2 3 12 7.5z"/>') +
  S('smile', '<circle cx="12" cy="12" r="8.2"/><path d="M8.8 14.2c.9 1.2 2 1.8 3.2 1.8s2.3-.6 3.2-1.8"/><path d="M9.3 9.6h.01M14.7 9.6h.01"/>') +
  S('eraser', '<path d="M5 16.2 13.4 7.8a2.1 2.1 0 0 1 3 0l3 3a2.1 2.1 0 0 1 0 3L14 19.2a2.1 2.1 0 0 1-3 0l-6-6z" transform="translate(-1.2 .4)"/><path d="M9.2 11.4l5.6 5.6M4.5 20.5h15"/>') +
  S('highlighter', '<path d="M10.5 15.5 5 21H3v-2l5.5-5.5"/><path d="M9 12.5 15.5 6a2 2 0 0 1 2.9 0l1.6 1.6a2 2 0 0 1 0 2.9L13.5 17z"/>') +
  S('heart-burst', '<path d="M12 19.4c-.3 0-3.8-2.3-5.4-4.7-1.2-1.8-1.4-4 0-5.3 1.4-1.3 3.5-1 4.6.4l.8 1 .8-1c1.1-1.4 3.2-1.7 4.6-.4 1.4 1.3 1.2 3.5 0 5.3-1.6 2.4-5.1 4.7-5.4 4.7z"/><path d="M4 5.5 5.8 7.3M20 5.5 18.2 7.3M12 2.6v2.2"/>') +
  '</svg>';

// emoji → icon id. Longest sequences first so ZWJ/VS16 pairs win.
export const EMOJI_ICONS = [
  ['💥❤️', 'heart-burst'],
  ['✏️', 'pencil'], ['✎', 'pencil'],
  ['🖍️', 'marker'],
  ['✨', 'sparkles'],
  ['⚡️', 'zap'],
  ['👻', 'ghost'],
  ['🔥', 'flame'],
  ['↺', 'undo'], ['↻', 'redo'],
  ['♫', 'music'],
  ['🪞', 'mirror'],
  ['👁', 'eye'],
  ['✍️', 'pen-line'],
  ['💌', 'mail-heart'],
  ['❤', 'heart-fill'], ['♥', 'heart-fill'],
  ['💬', 'message'],
  ['🔖', 'bookmark'],
  ['🪙', 'coin'],
  ['↔', 'arrows-h'],
  ['🔁', 'repeat'],
  ['🌅', 'sunrise'],
  ['📷', 'camera'],
  ['⏳', 'hourglass'],
  ['↗️', 'share'], ['↗', 'share'],
  ['▶️', 'play'],
  ['🗑️', 'trash'],
  ['🎁', 'gift'],
  ['🙂', 'smile'],
];

// Kept deliberately: 🥰 (1q parodies *typed* texting — the emoji is the joke),
// typographic marks → ↑ ↓ ✓ ✕ ⋯ ▮ (label glyphs, not icons).
