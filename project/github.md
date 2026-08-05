repo: KIDUSDANIEL576/trace
branch: claude/trace-app-supabase-setup-nopbin

## Last sync
date: 2026-08-04T12:56:03Z

### Updated in this project
- Recreated the canvas screen chrome (wordmark, presence pill, tab strip, glass dock, ⋯ sheet) from source
- Added two NEW in-app screens: "Make a post" composer and "Post the replay"
- 16 social post designs across 1:1, 9:16, 16:9 and App Store frame sizes
- 3 wordmark lockup variants for social use

## Screen map
| Project screen | Built from |
|---|---|
| Trace Social.dc.html · 1a (⋯ sheet) | src/components/MoreSheet.tsx, app/canvas.tsx, src/components/Glass.tsx, src/theme/tokens.ts |
| Trace Social.dc.html · 1b (post composer, new) | app/canvas.tsx, src/lib/shareTrace.ts, src/theme/backgrounds.ts, src/theme/tokens.ts |
| Trace Social.dc.html · 1c (replay post, new) | app/replay.tsx (referenced), src/components/PresencePill.tsx, src/theme/backgrounds.ts |
| Posts 1d–1s | src/theme/tokens.ts (palettes), src/theme/backgrounds.ts (sky presets), src/components/CanvasDock.tsx, src/lib/prompts.ts, src/lib/streak.ts, README.md (copy) |
| Wordmark lockups 1t–1v | src/components/ui.tsx (Wordmark), src/theme/tokens.ts (fonts) |
