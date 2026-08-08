# Two-phone QA — Day 2, ~40 minutes, with your person

Phones A (you) and B (them), both on the deployed HTTPS link. Log every
failure with the step number. Steps marked ⚠ are the ones this box could
not test — they are the point of the evening.

## Install (10 min)
1. ⚠ Open /start.html on both phones — mark renders, install steps match your platform.
2. ⚠ Install to home screen on both (iOS: Safari→Share→Add; Android: ⋮→Install). Icon = red square with the swoosh.
3. Open from the ICON (not the browser). Runs full-screen, no browser chrome. Status bar clock is real.
4. Airplane mode → reopen from icon. App loads (offline shell). Back online after.

## Pairing — the security gate (5 min)
5. ⚠ A: onboarding → note YOUR CODE → Share it. B: type A's code → Start a canvas.
6. ⚠ Within ~10s both presence pills show the partner's name ("X is here").
7. ⚠ SECURITY: on a third device/browser, type a WRONG 5-char code — it must land alone on a fresh canvas, never in your pair. Type garbage ("ZZ") — red shake, refused.

## Ink (10 min)
8. ⚠ A draws on us → appears on B while the finger is still moving (not after lift).
9. B draws back → same, and A's presence pill says "X is drawing".
10. A: pen tool, thickness fine/bold — both render on B at the same widths.
11. A: color cascade → pick any odd color → stroke lands on B in that exact color.
12. A: Aa key → type "good morning", pick a hand → lands on B in that script (NOT a plain serif — if serif, fonts failed).
13. Undo on A removes A's last stroke on both phones.

## Pages + widget (8 min)
14. ⚠ A: mine page → draw → B home screen (in-app widget): trace card "left you a trace". B us canvas unchanged.
15. B: hers page → tries to draw → refused ("it arrives, you watch").
16. A: board → toggle "Today's list" off → B's widget stops showing the list card.
17. A ticks a task → count moves on B's widget within ~2s.

## The loud things (5 min)
18. ⚠ Both: draw until the primer appears → "Let them land" → OS permission → accept.
19. ⚠ A: presence pill → The flare → hold 3s. B's phone (installed icon, app CLOSED): a notification arrives, loud, "I need you". THE test.
20. ⚠ A: presence → Leaving now. B gets a banner "home in 32 min" (if How loud = banner).

## Offline truth (2 min)
21. A: airplane mode → tick 2 tasks → toast "your marks will wait" → back online → B receives both, toast "changes delivered".

## The hard ones (3 min)
22. A: Quiet & private → Your key → copy. Paste into B's Your key restore → it re-arms (same canvas).
23. A: Unpair → hold 3s → both canvases seal; drawing refused; widget shows the sealed card. → Start again.

**Pass = 19+ of 23.** Anything failed goes to me tonight, fixed by Day 3 morning.
