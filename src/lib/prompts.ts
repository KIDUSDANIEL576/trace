// Daily drawing prompts — content design for the empty canvas. An empty
// canvas should never feel blank; it whispers one tiny idea per day.
// Deterministic by UTC date so both partners always see the same prompt.

const PROMPTS = [
  'draw the weather where you are',
  'draw what you had for breakfast',
  'draw us as two little animals',
  'draw the first thing you see',
  'draw how today feels',
  'draw a tiny sun for them',
  'draw your coffee or tea',
  'draw where you wish you were',
  'draw a heart, but weird',
  'draw them a flower',
  'draw your day in one line',
  'draw something only they would get',
  'draw a star to wish on',
  'draw what song is in your head',
] as const;

export function dailyPrompt(date = new Date()): string {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86_400_000);
  return PROMPTS[day % PROMPTS.length];
}
