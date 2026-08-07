repo: KIDUSDANIEL576/trace
branch: claude/trace-app-supabase-setup-nopbin

## Last sync
date: 2026-08-05T11:44:00Z

### Updated in this project
- Read app/pair.tsx, app/paywall.tsx, src/lib/purchases.ts, src/lib/widget.ts, CodeInput.tsx, SettingsSheet.tsx
- Recreated the shipped pair "code ready" screen (11g) from source — card, cell geometry, glow, copy
- Corrected the paywall redesign (11d) to the real price ($29.99 via foreverPrice(), FALLBACK_PRICE) and added the Restore affordance
- Relabelled 11a/11b/11e/11f to state what ships today vs what is proposed (pair flow, single-snapshot widget, SettingsSheet leave/delete + its Alert copy)

## Screen map
| Project screen | Built from |
|---|---|
| Trace Social.dc.html · 1a (⋯ sheet) | src/components/MoreSheet.tsx, app/canvas.tsx, src/components/Glass.tsx, src/theme/tokens.ts |
| Trace Social.dc.html · 1b (post composer, new) | app/canvas.tsx, src/lib/shareTrace.ts, src/theme/backgrounds.ts, src/theme/tokens.ts |
| Trace Social.dc.html · 1c (replay post, new) | app/replay.tsx (referenced), src/components/PresencePill.tsx, src/theme/backgrounds.ts |
| Posts 1d–1s | src/theme/tokens.ts (palettes), src/theme/backgrounds.ts (sky presets), src/components/CanvasDock.tsx, src/lib/prompts.ts, src/lib/streak.ts, README.md (copy) |
| Wordmark lockups 1t–1v | src/components/ui.tsx (Wordmark), src/theme/tokens.ts (fonts) |
| Interaction frames 2g, 3a–3e | src/components/CanvasDock.tsx, src/components/Glass.tsx, src/theme/tokens.ts |
| 11g (shipped pair screen, recreation) | app/pair.tsx, src/components/CodeInput.tsx, src/components/ui.tsx (Button), src/theme/tokens.ts |
| 11a, 11b (pair redesigns) | app/pair.tsx, src/components/CodeInput.tsx, app/sign-in.tsx + app/verify.tsx (auth gate) |
| 11d (paywall redesign) | app/paywall.tsx, src/lib/purchases.ts |
| 11e (widget set) | src/lib/widget.ts (tile 1 ships; tiles 2–4 proposed) |
| 11f (ending flow) | src/components/SettingsSheet.tsx, src/lib/account.ts, app/pair.tsx (delete Alert copy) |
| 11c (her window) | src/theme/backgrounds.ts (sky presets) — otherwise unbuilt |
| Turns 4–10 (all frames) | not recreations — original proposals using the token palette only |

## Sync history
### 2026-08-05T10:41:39Z
- Re-read CanvasDock.tsx, Glass.tsx, tokens.ts; reverted an ungrounded restyle back to shipped values (emoji brush glyphs, hairline*1.5 rim, muted #9a93a5, radius scale)
- Added iOS status bars to interaction frames 3a–3e, 2g

### 2026-08-04T12:56:03Z
- Recreated the canvas screen chrome (wordmark, presence pill, tab strip, glass dock, ⋯ sheet) from source
- Added two NEW in-app screens: "Make a post" composer and "Post the replay"
- 16 social post designs across 1:1, 9:16, 16:9 and App Store frame sizes
- 3 wordmark lockup variants for social use
