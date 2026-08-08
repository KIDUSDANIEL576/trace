# Trace — Screen-by-screen plan

Every frame in `Trace Paper.dc.html`, with what it is, **why it's useful**, and how to build it.

Each entry follows the same shape:

- **What it is** — the screen in one line
- **Useful for** — the real problem it solves
- **On screen** — the elements, in order
- **Build plan** — data, logic, and rules to implement

Read `README.md` first for tokens, brand, and the three invariants. Ids (`p1`…`p61`) match the badges in the HTML.

---

# 1 · Opening

## p1 — Launch

![p1](screens/p01-launch.png)

**What it is.** The first screen anyone sees: the animated mark, the `trace` wordmark, "Leave me a trace.", and one button.

**Useful for.** Setting the promise before a single feature appears. Everything else in the app is a to-do list or a calendar; this screen is the reason someone downloads it instead.

**On screen.** Animated stroke mark (red draws with white tip → white draws with red tip, 4.4s loop) · wordmark in Caveat 700 with `ce` in red · slogan · `Start a canvas` (red pill) · `I have a code` (text button).

**Build plan.**
- The loading animation and the launch mark are the same asset. Build one `TraceMark` component with a `mode` of `static | drawing`, and use `drawing` for every loading state in the app.
- No account required to see this screen. Auth comes after the first stroke, not before.
- Do not add a carousel, a value-prop, or permission prompts here. The next tap must be a canvas.

---

## p2 — Canvas home

![p2](screens/p02-canvas-home.png)

**What it is.** The permanent home screen. Today's shared canvas, live.

**Useful for.** This is invariant #1 — the app opens here, always. Every competitor opens on a list; opening on a shared drawing is the entire positioning.

**On screen.** Presence chip ("Maya is here" + pulsing dot) · share icon · "Today's canvas · 4 marks, 2 hands" · the canvas itself with both people's strokes · live status ("Maya is drawing…") · two stat cards (goodnight countdown, streak) · bottom bar: pen · Canvas · settings.

**Build plan.**
- Canvas is a real-time CRDT or op-log of strokes; each stroke carries `authorId`, color, pressure array, timestamp.
- Presence is a boolean + timestamp, never coordinates. "Maya is here" means app-foregrounded within 60s.
- The two stat cards are the *only* summary allowed on this screen. Resist adding task counts here — that's what the rooms are for.
- Tapping the canvas enters draw mode with zero chrome.

---

## p3 — Goodnight

![p3](screens/p03-goodnight.png)

**What it is.** The day's canvas sealing at a chosen hour, with a countdown and one button.

**Useful for.** Giving the day an ending. Without a seal, a shared canvas becomes an infinite scroll of guilt; with one, it becomes a diary. It's also the single highest-retention ritual in the product.

**On screen.** Time · "Tonight's canvas seals in" · `27:14` in red at 52px · the day's canvas thumbnail with mark count · "Maya already said hers" · `Say goodnight` red pill → sealed state showing streak increment.

**Build plan.**
- Seal time is per-couple, set once, changeable. Default 23:30.
- On seal: canvas becomes read-only, moves to Memory, streak increments if either person sealed.
- **Streak rule:** a missed night does not reset to zero — it pauses. See p7 ("Nothing today"). Never show a broken-streak alert.
- The nudge at seal time is one of only four permitted notifications, and is **off by default**.

---

## p4 — Prompt deck

![p4](screens/p04-prompt-deck.png)

**What it is.** A card deck of 52 drawing prompts, one shuffled at a time.

**Useful for.** The blank-canvas problem. Most nights nobody knows what to draw; a prompt converts intent into a stroke in under three seconds.

**On screen.** Stacked card with a slight rotation behind · eyebrow "Tonight, together" · prompt in 29px/600 · "n of 52 · answers live on the canvas, not in a feed" · `Shuffle` and `Draw this`.

**Build plan.**
- 52 prompts shipped locally; no server call, no personalization.
- Shuffle is client-side and non-repeating within a cycle.
- `Draw this` opens the canvas with the prompt pinned as a caption for that day only.
- Prompts never notify. They're available, not pushed.

---

## p5 — Two clocks

![p5](screens/p05-two-clocks.png)

**What it is.** Timezone presence — her time, your time, and the overlap.

**Useful for.** Long-distance couples, and any pair with opposite shifts. "Is it a bad time to call?" is the most-asked question in those relationships and nothing answers it well.

**On screen.** Arc diagram with two dots (you / Maya) on a day curve · city labels with local times · overlap card: overlap today, her morning, your goodnight, next call.

**Build plan.**
- Derive from each device's timezone; no manual entry.
- "Overlap" = hours both are typically awake, learned from app activity, not from calendars.
- Show this room only when timezones differ or wake windows diverge by 3h+. For co-located couples it's noise.

---

## p6 — Rooms

![p6](screens/p06-rooms.png)

**What it is.** The directory — five rooms plus search across every feature.

**Useful for.** Trace has ~60 features. Without one flat directory, they become undiscoverable. This screen is the antidote to a hamburger menu with 40 items.

**On screen.** Search field ("Search 60 features") · five room rows (Canvas, Household, Together, Memory, Wellbeing) each with icon, subtitle, and a count or "live" · bottom bar.

**Build plan.**
- Rooms are navigation, not state. Every feature belongs to exactly one.
- Counts are *open items*, not unread badges — no red dots.
- Search covers feature names, list items, and calendar entries. **Never drawings.**
- Invariant #2 lives here: a room may show a count, but it may never notify about itself.

---

# 2 · Household

## p7 — Tasks

![p7](screens/p07-tasks.png)

**What it is.** Today's open items with a claim/complete tap and a who's-carrying bar.

**Useful for.** The daily "who's doing what" negotiation, without a project-management tool's overhead.

**On screen.** "Left to do · N things" · "You're carrying X% of today" · split bar · task rows with a circle checkbox, title, meta line, and an owner chip (You / Maya / Free / Both).

**Build plan.**
- Three ownership states: assigned, claimed, free. Tapping a free task claims it; tapping a claimed one completes it.
- The split bar counts *today only*. The month view is p20-equivalent (fair split).
- Never sort by priority — sort by time of day, then unclaimed first.
- A completed task pushes a tick to the partner's widget instantly, silently.

---

## p8 — Groceries

![p8](screens/p08-groceries.png)

**What it is.** A shared list with tickable items and a "usuals" row.

**Useful for.** The most-used shared-list use case in every couples app. Trace's difference: items are in the handwriting of whoever added them, and there's a live "he's at the shop" state.

**On screen.** "Add in your handwriting" field · "n of 7 in the basket" · item rows with square checkbox, name, and author · Usuals chips (Eggs, Butter, Yoghurt, Bananas) · `Shopping now` / `Ask nicely`.

**Build plan.**
- Items store `authorId` → rendered in Caveat.
- `Shopping now` broadcasts a live state to the partner's widget with a decrementing count.
- Usuals are computed from the last 90 days' most-repeated items. One tap adds.
- `Ask nicely` composes a decline-able request (see p31).

---

## p9 — The week

![p9](screens/p09-week.png)

**What it is.** Seven day-rows, each holding entries in the handwriting of whoever wrote them, with a typed input sheet at the bottom.

**Useful for.** Shared calendars fail because they look like work. A week that looks like a note left on a fridge gets used.

**On screen.** Mon–Sun rows with entries in Caveat, colored by author · today highlighted · bottom sheet: typed field → live handwriting preview → `Add as ink`.

**Build plan.**
- This is the **typed → handwritten loop** in its primary home. Type on a system keyboard, see it render in Caveat, commit.
- Entries sync to both devices and to the partner's widget slot for "This week."
- Empty days show a dash, not "No events." Emptiness is normal.

---

## p10 — Meal wheel

![p10](screens/p10-meal-wheel.png)

**What it is.** A spinnable wheel of dinner options with a one-veto rule.

**Useful for.** "What do you want to eat?" "I don't mind." The most reliably annoying conversation in cohabitation, solved by removing the decision from both people.

**On screen.** Conic-gradient wheel with pointer · center hub showing tonight's result · "Maya can veto once. Then it's law." · `Spin` and `Veto`.

**Build plan.**
- Options are couple-editable; ship with 6 defaults.
- One veto per person per spin session, then the result locks.
- The result posts to the week and the widget. It does not notify.
- Spin animation: 420°+ random, `cubic-bezier(.15,.85,.25,1)`, 1.4s.

---

## p11 — Leaving now

![p11](screens/p11-leaving-now.png)

**What it is.** Auto-detected departure with an ETA, plus three one-tap phrases that land as ink on the partner's lock screen.

**Useful for.** Killing the "where are you / on my way" text exchange entirely — and it's the only routine notification allowed, because it's the one that's genuinely time-critical.

**On screen.** Live chip · card: "Maya left work · 32 min · walking, the long way" with a dotted route sketch · "Say it" chips: *Buy nothing, I cooked* / *Walk slow, it's nice out* / *Call me when close* · confirmation "✓ Sent in your handwriting".

**Build plan.**
- Trigger on geofence exit from a known place (home/work), not on continuous location.
- **Transmit ETA only — never coordinates.** The route sketch is decorative.
- This is permitted notification #2 and it **breaks through meeting armour** (p13).
- Chips are couple-editable; three max, so it stays a gesture not a chat.

---

## p12 — Handover

![p12](screens/p12-handover.png)

**What it is.** Passing a task to the other person with context attached, and confetti when it's taken.

**Useful for.** Reassignment normally feels like dumping. Wrapping it in a note and a celebration makes taking work off someone a warm act instead of a grudging one.

**On screen.** Card: "Passed from Maya" · task title · her handwritten note ("he only answers before noon — sorry") · "Carried by Maya for 2 days" · `Take it` / `Not yet` → taken state with confetti and "Replay her confetti".

**Build plan.**
- A handover carries: task, note (Caveat), how long the sender carried it.
- Accepting triggers confetti on **both** devices; the sender's replay is stored for 7 days.
- Declining is silent and free — no counter, no record.

---

## p13 — Meeting armour

![p13](screens/p13-meeting-armour.png)

**What it is.** A switch that holds everything until a meeting ends, then delivers one summary.

**Useful for.** The person who can't have their phone light up in a board review. Do-not-disturb is all-or-nothing; this is couple-aware.

**On screen.** Status chip ("Armoured until 3:30") · next calendar event · toggle card · held/breaks-through table (canvas marks: held · lists: held · "Leaving now": **breaks through**) · "At 3:30 everything arrives at once, gently — one summary, not eleven buzzes."

**Build plan.**
- Auto-suggest from calendar events marked busy; always manually overridable.
- On release, coalesce into a **single** summary. Never replay held notifications individually.
- Only "Leaving now" and the flare pierce armour.

---

## p14 — Type it

![p14](screens/p14-type-it.png)

**What it is.** The typed → handwritten composer, with a real keyboard and a live Caveat preview.

**Useful for.** This is the product's signature interaction. Drawing every message is romantic but impractical; typing is practical but cold. This gets both — the speed of a keyboard, the warmth of a hand.

**On screen.** Typed field with red caret · live preview card: "RENDERED IN YOUR HAND" + text in Caveat 30px · context chips (today / before 7 / for Maya) · system keyboard with a red `send` key.

**Build plan.**
- Render the preview on every keystroke, debounced ~80ms.
- Ship with the Caveat webfont bundled. **Later upgrade:** a per-user handwriting model trained on their canvas strokes, generated on-device — same interface, better output.
- Context chips set due-time and recipient without a form.
- Send routes to: partner's notification (p15), the shared list, and the widget.

---

## p15 — The notification

![p15](screens/p15-notification.png)

**What it is.** How a typed reminder actually arrives — handwritten, on both iOS and Android lock screens.

**Useful for.** The moment that sells the app. A reminder from your partner in *their* handwriting reads as care; the same words in system font read as nagging.

**On screen.** Split frame: iOS lock screen (time, notification card with Trace icon, message in Caveat 31px, `Got it` / `Can't`) above Android (Material-styled card, same content, text-button actions).

**Build plan.**
- Handwritten text is rendered to an **image attachment** — notification bodies can't carry custom fonts on either platform.
- iOS: `UNNotificationAttachment` + Notification Content Extension. Android: `NotificationCompat.BigPictureStyle` or a custom `RemoteViews` layout.
- Two actions only: **Got it** / **Can't**. Never "Reply" — this isn't a messenger.
- `Can't` is a first-class answer that closes the loop with no follow-up.

---

## p16 — The widget on her home screen

![p16](screens/p16-widget-home.png)

**What it is.** A real home screen with the Trace widget cycling through states.

**Useful for.** The distribution strategy of the whole product: most days neither person opens the app, and it still works. The widget *is* Trace for those days.

**On screen.** Springboard with app grid and dock · Trace widget showing (cycling): live trace with "Maya is drawing — live" · must-dos with syncing ticks · the week in his handwriting · "he's thinking of you" · page dots.

**Build plan.**
- iOS WidgetKit + Live Activity for the drawing state; Android Glance/AppWidget with periodic update + FCM push for live states.
- Widget renders **published** data only (see p18).
- A one-time trace shows once, then burns — never re-shown after view.
- Tapping deep-links into the relevant room.

---

## p17 — Widget states

![p17](screens/p17-widget-states.png)

**What it is.** Every state the widget can be in, with the priority rule.

**Useful for.** The spec a developer needs to build the widget correctly. Without an explicit priority order, the widget becomes a random-content lottery.

**On screen.** Six state cards (goodnight countdown, groceries live, leaving now, notice, thinking-of-you, quiet day), each with its trigger condition on the right · the priority rule in a dashed note.

**Build plan.**
- **Priority when states compete:** leaving now → live drawing → must-dos → notices → week → quiet day.
- Each state declares a validity window; expired states drop out automatically.
- The quiet-day state is a real state, not a fallback: "Nothing today. 41 days still yours."
- One-time items show once, then burn. Nothing repeats, nothing nags.

---

## p18 — Your board

![p18](screens/p18-your-board.png)

**What it is.** The publish controls — exactly what of yours reaches the partner's widget.

**Useful for.** Consent. A widget that mirrors your life without your say-so is surveillance; one you curate is a gift. This screen is what makes the whole widget system acceptable.

**On screen.** "Next up on her widget" preview strip · six toggles: drawing traces, today's list, this week, mood weather, "leaving now", notices · "She curates hers the same way. You never see your own widget."

**Build plan.**
- Six independent per-user publish flags.
- Mood off = **no gap shown**. Turning something off must be invisible to the partner, or the toggle isn't real.
- "Leaving now" is auto and marked as breaking through — it's opt-out, not opt-in.
- Never surface a "your partner turned something off" event. Ever.

---

# 3 · Together

## p19 — The pocket

![p19](screens/p19-the-pocket.png)

**What it is.** Private planning space that **does not exist on the partner's device**.

**Useful for.** Surprises. Every shared app breaks birthday planning, because a shared list is a spoiler. The pocket is the only way a couples app can hold a secret.

**On screen.** Amber warning bar: "The pocket — does not exist on Maya's device" · "Her birthday · 13 days out" · checklist (table booked ✓, sitter ✓, pick up the card) · reveal card: "Reveals itself Aug 20, 7 PM — slides onto the shared canvas as one drawing" · "Not even in her search. Not in the shared backup. Nowhere."

**Build plan.**
- Store pocket items **only** in the owner's local encrypted store. They must not appear in: the partner's sync payload, shared backups, search indexes, or any server-side record joined to the couple.
- Scheduled reveal moves the item to the shared canvas at a set time.
- If the relationship ends (p51), the pocket is **deleted unread**.
- This is the single highest-risk feature to get wrong. Treat "absent, not hidden" as the acceptance criterion.

---

## p20 — Missions & savings

![p20](screens/p20-missions-savings.png)

**What it is.** The week's shared mission plus the joint savings goal and dream board.

**Useful for.** Giving a couple something to do together that isn't a chore, and one shared number that isn't a bill.

**On screen.** Mission card ("Cook something neither of you can pronounce") with both avatars and accept state · savings progress (€3,180 of €5,000) · dream board tiles · co-signed promise.

**Build plan.**
- Missions: 52/year, both must accept, no skipping ahead. Failing is not tracked.
- Savings shows contributions but **never a ratio or a debt** — "split by what each can give."
- A co-signed promise requires both signatures and can't be edited unilaterally.

---

# 4 · Memory & wellbeing

## p21 — Memory

![p21](screens/p21-memory.png)

**What it is.** The year as a heatmap, plus memory movies, the gratitude jar, and permanent-ink count.

**Useful for.** The reason to stay subscribed in year two. A task app you can leave; an archive of two years of drawings you can't.

**On screen.** "The year, one square a day · 218 marks" · 14-column heatmap · memory movie card · gratitude jar quote sealed until December · permanent ink count.

**Build plan.**
- Heatmap intensity = marks that day. Empty days are pale, never red.
- Memory movies render **on-device** from stored strokes; export as a file the user owns.
- Jar entries are write-only until the seal date.

---

## p22 — Wellbeing

![p22](screens/p22-wellbeing.png)

**What it is.** Mood weather for both people plus side-by-side habits.

**Useful for.** "How are you actually?" answered in one tap, without turning feelings into a chart someone has to defend.

**On screen.** "Weather between us · Bright, a little windy" · two mood orbs (You: steady / Maya: stretched) · habit cards with 7-day dot rows.

**Build plan.**
- Five mood states, one tap, shared as a **tint on your edge of the canvas** — not a number, not a graph.
- Habits are shared but individually tracked; no competition, no leaderboard.
- Never trend mood over time in the UI. Never correlate mood with anything.

---

## p23 — Decision debt & the waiting room

![p23](screens/p23-decision-debt.png)

**What it is.** A count of every deferred decision, and a list of what's blocked on whom.

**Useful for.** The invisible drag in every relationship. "We'll talk about it later" has no cost until something counts the laters — and "I'm waiting on you" is usually invisible until it's an argument.

**On screen.** "N decisions owed" · debt cards showing deferral count and age ("deferred 14× · first raised 6 weeks ago") with a `Decide in 2 min` button · waiting-room rows split by who's blocking, with day counts.

**Build plan.**
- A decision gains debt each time it's postponed. Two-minute timer; **the result is final** — reopening costs a new debt.
- The waiting room surfaces one number on the partner's widget ("3 waiting"). It never nags.
- Never assign blame language. "Waiting on Maya" is a fact; "Maya is late" is not.

---

## p24 — Mental load & money truth

![p24](screens/p24-mental-load.png)

**What it is.** Who is *remembering* (not doing), and one honest number for what's actually spendable.

**Useful for.** Two of the biggest silent fights. Mental load is invisible labour — knowing the bins day, the shoe size, what's running out. Money truth replaces a budgeting app nobody maintains with a single number.

**On screen.** "Maya holds 71%" with a split bar · knowledge rows tagged by holder · "Take one over permanently — not the task, the knowing" · money: "Free to spend €412" with in / committed / agreed-savings breakdown.

**Build plan.**
- Mental load counts *ownership of knowing*, tracked by who repeatedly initiates a recurring item.
- Handover here transfers the knowledge permanently — Trace stops telling the old owner about it.
- Money: read-only bank connection, one number, updated nightly. **No categories, no budgets to break, no advice.**

---

## p25 — The flare & the tap

![p25](screens/p25-flare-tap.png)

**What it is.** Two gestures at opposite ends of urgency: "thinking of you" (three a day) and "I need you" (three a year).

**Useful for.** The tap gives affection a channel that costs nothing and expects no reply. The flare gives emergency a channel that doesn't require explaining the emergency.

**On screen.** Tap: warm pulsing orb, "Max three a day. Scarcity is what makes it mean something." · Flare: red orb, "Breaks armour, quiet hours, guest mode — everything. Three a year."

**Build plan.**
- Tap: no message, no reply UI. Lands as one warm pulse on the widget.
- Flare: hold 3s to send. **Full-screen on the recipient, whatever they're doing.** Rings even on silent.
- Flare quota is 3/year, resets in January. This is permitted notification #1 and the only true interrupt in the product.
- Neither gesture is ever logged, scored, or summarized.

---

## p26 — The daily loop & the rules

![p26](screens/p26-daily-loop.png)

**What it is.** The four moments that make up a day in Trace, and the three invariants stated plainly.

**Useful for.** Onboarding, the app-store page, and the team's own north star. If a proposed feature doesn't fit one of the four moments, it probably shouldn't ship.

**On screen.** Four timed cards: 6:04 morning handoff · 13:00 two-minute pile · 18:30 leaving now · 23:30 goodnight · "Four touches a day, under ninety seconds total." · the three rules.

**Build plan.**
- Ninety seconds is a design constraint, not a slogan. Time the flows.
- Morning handoff appears **once at wake time** and is never a notification.
- The rules: home is always the canvas · no room notifies about itself · nothing that reads a drawing leaves the device.

---

# 5 · Calendar & scheduling

## p27 — The month

![p27](screens/p27-month.png)

**What it is.** A month grid with both people's commitments and shared days marked.

**Useful for.** Zooming out. The week (p9) is for doing; the month is for noticing that you have no free weekend until October.

**Build plan.** Two-color dots per day (you / partner), a third state for shared. Tap a day → p40. Never show a third-party calendar's full detail — titles only, and only for events the owner published.

---

## p28 — Find us a time

![p28](screens/p28-find-a-time.png)

**What it is.** Proposes windows where both are free *and* have energy.

**Useful for.** "When are you free?" is answerable by any calendar app. "When are we both actually up for this?" is not — and that's the question that decides whether the evening happens.

**Build plan.** Intersect free time with each person's energy bands (p30). Rank by overlap quality, not earliest. Output is a handwritten ask (p29), never an auto-booked event.

---

## p29 — The ask

![p29](screens/p29-the-ask.png)

**What it is.** A proposed time, sent in handwriting, answerable in one tap.

**Useful for.** Making scheduling feel like being invited by a person rather than summoned by software.

**Build plan.** Three responses: yes / not that day / not this week. A no requires no reason and produces no follow-up. On yes, it writes to the week in both hands.

---

## p30 — Energy match

![p30](screens/p30-energy-match.png)

**What it is.** Three bands of the day showing each person's usable energy, with guidance for what to put there.

**Useful for.** Free time ≠ good time. Putting a hard conversation in her worst hour is how a fine week turns into a fight.

**Build plan.** Learned from when each person actually *completes* things in the app — never from their calendar, never from a self-report survey. Feeds p28.

---

## p31 — Recurring & ask nicely

![p31](screens/p31-recurring.png)

**What it is.** Chores that alternate automatically, and requests that can be declined for free.

**Useful for.** Recurring chores are where "you always make me do it" comes from. Alternation removes the negotiation. "Ask nicely" makes a request refusable, which is the only way requests stay pleasant.

**Build plan.** Recurrence carries an owner rotation. Asks have three outcomes (yes / not now / nothing at all) and **never** generate a reminder the recipient didn't choose.

---

## p32 — Renewal radar

![p32](screens/p32-renewal-radar.png)

**What it is.** Everything with an expiry: insurance auto-renewing at +18%, a passport expiring before the trip, subscriptions nobody opens.

**Useful for.** Found money and avoided disasters. This is the feature that pays for the subscription in month one.

**Build plan.** Read from the shared account and from documents photographed via p19-style capture. Trace **flags; the couple decides**. Never auto-cancel.

---

## p33 — Kid's corner

![p33](screens/p33-kids-corner.png)

**What it is.** A child's own drawing space inside the shared canvas, plus the wrong-answer bin.

**Useful for.** Families. The kid gets a real place in the app rather than being a task category, and the bin turns "we were confidently wrong" into a running joke instead of a grudge.

**Build plan.** Child strokes are attributed but unmoderated. The bin stores struck-through claims with a restore action.

---

## p34 — Doctor's note

![p34](screens/p34-doctors-note.png)

**What it is.** The questions you'd forget in the chair, written together the night before.

**Useful for.** Medical appointments where the person going forgets half of what they meant to ask, and the person not going has no idea what happened.

**Build plan.** Questions in each author's handwriting. **Health is the one room Trace never summarizes, never trends, never guesses.** After the appointment, one line goes to the partner's widget; details stay the patient's to share.

---

## p35 — Guest mode

![p35](screens/p35-guest-mode.png)

**What it is.** A switch that hides the private layer so the phone can sit face-up on the table.

**Useful for.** Parents visiting, colleagues over, a kid holding your phone. Without it, people stop using the intimate features at all.

**Build plan.** Hides canvas, traces, mood; the pocket "never existed." Lists and calendar stay visible. **Auto-ends at midnight.** The partner's widget shows a small "guests" dot, nothing more.

---

## p36 — Canvas extras

![p36](screens/p36-canvas-extras.png)

**What it is.** Voice ink, someone else's sky, the map of your day, and the wall of permanent ink.

**Useful for.** Depth for people already hooked. None of these is a reason to download; together they're a reason not to churn.

**Build plan.** All four are **on-device only**: voice → cadence line with audio deleted; sky from sunrise/sunset math; day map from step data shared as a shape, never coordinates; the wall holds marks both people chose to keep past midnight.

---

## p37 — Watch & car

![p37](screens/p37-watch-car.png)

**What it is.** Apple Watch and Wear OS faces, plus car mode for CarPlay and Android Auto.

**Useful for.** The two contexts where you can't hold a phone but most want to say "leaving now."

**Build plan.** Watch: complication + last mark; raise-to-wrist shows it, long press taps back. Car: detected movement → **one card, voice ink only, nothing to read.** Same single card on both platforms.

---

## p38 — Day one

![p38](screens/p38-day-one.png)

**What it is.** Onboarding: draw one thing, together. No profile, no tour.

**Useful for.** Time-to-value. The competitor asks for twelve screens of setup; Trace asks for one stroke, and the partner's first mark lands in the same session.

**Build plan.** Three steps shown as a progress hint (draw → widget → goodnight), but only step one is required. Defer permissions until the feature needs them.

---

## p39 — Tablet board

![p39](screens/p39-tablet.png)

**What it is.** iPad / Android tablet layout — a wall-mountable kitchen board.

**Useful for.** The shared surface a household actually gathers around. It's also the highest-visibility ambient placement the product can get.

**Build plan.** Persistent sidebar of rooms, canvas center, right rail of live cards. Always-on display mode with dimming. No modal navigation — everything is visible at once.

---

## p40 — Today

![p40](screens/p40-today-timeline.png)

**What it is.** A single timeline of today with both people's commitments interleaved.

**Useful for.** The morning question: "what does today look like for us?" — one screen, no toggling between two calendars.

**Build plan.** Merge both feeds, color by owner, mark handovers and shared blocks. Now-line pinned. Read-only; editing happens in p41.

---

## p41 — New event

![p41](screens/p41-new-event.png)

**What it is.** Adding to the calendar with the handwriting composer and who-it's-for chips.

**Build plan.** Same typed → Caveat loop as p14. Chips set owner (you / them / both) and whether it publishes to the widget. Conflicts route to p42 before saving.

---

## p42 — Conflict

![p42](screens/p42-conflict.png)

**What it is.** Two things booked over each other, shown side by side with a resolution.

**Useful for.** Double-booking is the #1 shared-calendar failure. Catching it at write time — not the morning of — is the whole value.

**Build plan.** Detect on save. Offer: move mine / move theirs / both go / ask them (p29). **Never auto-resolve.**

---

## p43 — Trips

![p43](screens/p43-trips.png)

**What it is.** A trip as a container: dates, countdown, packing, bookings, who's arranging what.

**Build plan.** One shared entity with an owner per line item. Feeds the savings goal (p20) and the renewal radar (p32) — passport expiry is checked against the trip dates automatically.

---

## p44 — Anniversaries

![p44](screens/p44-anniversaries.png)

**What it is.** The dates that matter, with lead time, and who usually handles each.

**Useful for.** Remembering is one thing; remembering *early enough to do something* is the actual job.

**Build plan.** Lead time is per-date and configurable (a birthday needs 2 weeks; an anniversary needs 6). Planning happens in **the pocket** (p19), so the reminder never spoils the surprise.

---

## p45 — Tonight

![p45](screens/p45-tonight.png)

**What it is.** What to do with unexpectedly found time.

**Useful for.** The evening that clears at 6pm and gets wasted on separate screens because neither person raises an idea.

**Build plan.** Draws from the bucket list, the mission, and things previously enjoyed. Two or three options maximum. Suggestions never notify — this screen is found, not pushed.

---

# 6 · The hard parts

## p46 — Repair

![p46](screens/p46-repair.png)

**What it is.** A "we're not okay right now" state that mutes the app's cheerful machinery.

**Useful for.** Every couples app pretends friction doesn't exist, so after a bad night the app becomes actively insulting — streaks and prompts and missions chirping through an argument. This is the single most important screen in the product.

**On screen.** "We're not okay right now" · "Trace has gone quiet. No streaks, no missions, no prompts, no cheerful anything." · two marks not touching · three ways back: leave a line (no discussion) / sleep on it, ask me tomorrow at 9 / I'm ready to talk · "Trace never asks what happened, never scores it, never remembers it in the journal."

**Build plan.**
- Either person can enter it; either can end it. No mutual confirmation.
- Entering suppresses: streaks, missions, prompts, split counting, journal entries, mood prompts, the coach.
- "I'm ready to talk" is visible only when the other opens the app. **Never a push.**
- Store *that* it happened for state purposes; never surface it in any history, summary, or export.

---

## p47 — Cover me

![p47](screens/p47-cover-me.png)

**What it is.** One tap that moves everything of yours onto your partner, briefs attached.

**Useful for.** Illness, a brutal work day, a crisis. Handing off one task at a time when you're ill is exactly when you can't. This is the most useful single button in a household.

**On screen.** "Cover me today" · six items moving with their briefs ("gate code, green bag") · work stays ("Trace can't cancel work") · "Also switched off: streaks paused · missions skipped · fair split not counted today."

**Build plan.**
- Bulk-reassign today's items with their p-brief context attached.
- Work/calendar events are explicitly **not** moved — that would be a lie.
- Enters the same "quiet the machinery" mode as repair.
- Framed as available for a bad day, not only illness.

---

## p48 — The people layer

![p48](screens/p48-people.png)

**What it is.** Shared contacts with context: who they are, who arranges them, what you need to know.

**Useful for.** "What's the sitter's number?" "What time does the plumber answer?" Half of household admin is retrieving a fact one of you has and the other doesn't.

**On screen.** Search · contact rows with avatar, role, and context ("Only answers before noon", "Gate code 4471", "Has the drill · birthday Sat 21") · emergency card: reachable from a locked phone.

**Build plan.**
- Contacts carry a context field and an "who usually arranges" owner.
- Emergency subset accessible from the lock screen without unlocking.
- Feeds the brief (p47) and the visitor (p61).

---

## p49 — Settle up

![p49](screens/p49-settle-up.png)

**What it is.** Who's ahead this month, and a real "leave it" button.

**Useful for.** Splitwise turns a relationship into a ledger. This gives the same clarity without the accumulating debt — because the number resetting is the point.

**On screen.** "€64 · She's ahead. That's all it says." · four itemized lines · `Even it up` / `Leave it` · "No running total across months. It resets on the 1st whether you settle or not."

**Build plan.**
- **Never carry a balance across months.** This is the feature.
- Any line can be hidden by the person who paid.
- "Leave it" is equally weighted with settling — same size, no guilt copy.

---

## p50 — Every interruption

![p50](screens/p50-interruptions.png)

**What it is.** The honest, exhaustive list of what can ping you — and the kill switch.

**Useful for.** Trust. Every app claims to respect your attention; this one shows the whole list on one screen and lets you turn almost all of it off. It's also the spec that keeps the team honest.

**On screen.** Four permitted interrupts (the flare — always · leaving now · a reminder you both agreed to · goodnight, off by default) · "Never notifies, ever": drawings, streaks, missions, journal, mood, anything a room wants to say about itself · `Silence everything but the flare`.

**Build plan.**
- Implement this list as a **hard allow-list in code**, not a settings screen over a general notification system. Nothing outside these four may construct a notification.
- Goodnight ships off.
- Adding a fifth interrupt should require changing this screen — that friction is intentional.

---

## p51 — The end

![p51](screens/p51-the-end.png)

**What it is.** What happens when the relationship pauses, ends, or someone dies.

**Useful for.** The trust moat. No competitor will build this screen, and it's the reason someone will trust two years of intimate drawings to a startup.

**On screen.** "Everything is yours to take · We wrote this screen on day one, before we had users." · disposition table (canvases: both keep · chapters and the book: both keep · the gratitude jar: **opens early** · your pocket: **deleted, unread**) · three closures: Pause / Close the book / If one of you dies · "No hostage-taking, no export fee, no 'are you sure' three times."

**Build plan.**
- Full-quality export, free, both parties, no negotiation.
- Death: the survivor keeps everything forever at no cost; a named person can be designated in advance.
- Pause freezes without deleting.
- Build the export pipeline **early**. Retrofitting it is expensive and shipping without it makes this screen a lie.

---

# 7 · Life happens

## p52 — The unsaid

![p52](screens/p52-the-unsaid.png)

**What it is.** A private place to write the thing you keep meaning to say — badly, at midnight — and send it when it's ready, or never.

**Useful for.** The gap between feeling something and being able to say it well. Sending in the moment causes fights; holding it forever causes resentment. This is the drafting table.

**On screen.** "Only you can see this" · held notes in Caveat with age ("held 11 days · edited 4 times") and a `send it` action · a released one greyed out · "Anything untouched for 90 days offers to be deleted. Resentment that survives three months usually needs a person, not an app."

**Build plan.**
- **Never syncs, never counts, never appears in any summary.** The partner cannot know this screen has content.
- 90-day prompt to delete, never automatic.
- Sending routes through the normal handwriting composer.

---

## p53 — Newborn mode

![p53](screens/p53-newborn.png)

**What it is.** A mode where the only thing counted is who slept.

**Useful for.** The three months when every other feature is noise and one metric decides whether the couple survives the week intact.

**On screen.** "You're on until 6" · she slept 5h10 / you slept 2h40 · "Tomorrow night is hers. Trace will hold you to it — that's the only thing it will nag about." · night log · her note ("bottle's already made. you're doing fine.") · everything else off.

**Build plan.**
- Suppresses streaks, missions, split, journal, prompts.
- Sleep totals are the only counter, and the only thing permitted to nag.
- **Ends when the couple says so, not on a date.**

---

## p54 — Grief

![p54](screens/p54-grief.png)

**What it is.** Hard anniversaries — handled by telling the *other* person.

**Useful for.** The date you don't need reminding of, but your partner might. Getting this wrong (a cheerful notification on the anniversary of a death) would be unforgivable; getting it right is quietly extraordinary.

**On screen.** "Three years since your dad." · "Maya knows. Trace told her quietly this morning, the way you asked it to. She hasn't been asked to do anything about it." · three options: show me that week's canvas / keep the day empty / nothing, thanks · "No streak breaks today. Nothing does."

**Build plan.**
- The person who registered the date is **never** notified of it. Only the partner is, quietly, in-app.
- "Keep the day empty" blocks the calendar with no visible reason.
- "Nothing, thanks" suppresses it for a full year.

---

## p55 — Moving

![p55](screens/p55-moving.png)

**What it is.** A big project as four phases, not ninety checkboxes.

**Useful for.** Moves, weddings, renovations — the projects that break couples. A flat 90-item list is paralysing; four phases with a current one is doable.

**On screen.** Progress split by person · four phase cards with the current one outlined in red · "Trace is watching for: the two of you both thinking the other booked the van."

**Build plan.**
- Phases unlock sequentially; only the current phase is expanded.
- **Assumption detection:** flag items neither person has claimed as the phase deadline nears.
- Same container reused for wedding and renovation.

---

## p56 — Money shock

![p56](screens/p56-money-shock.png)

**What it is.** What the money screens do when income drops.

**Useful for.** A job loss is when a finance feature either becomes a source of shame or a source of calm. Most apps pick shame by default.

**On screen.** "One income, for now · Trace recalculated everything the day it noticed. No alert, no red warnings, no advice." · free to spend €118 · Kyoto paused · runway 7 months · "Quietly stopped: the savings nudge, the gym renewal, 'you're 60% to Kyoto', anything that would feel like a jab this month." · three cancellable things, €94/mo.

**Build plan.**
- Detect a sustained income drop; recalculate silently. **Never send an alert about it.**
- Suppress all aspirational and comparative messaging.
- Offer found money once, don't repeat. "Nobody's fault is a category in this app."

---

# 8 · The long run

## p57 — The drift

![p57](screens/p57-the-drift.png)

**What it is.** Hours awake together per week, falling for six weeks.

**Useful for.** The thing you can't see from inside the week. Couples don't drift by deciding to; they drift by six consecutive normal weeks.

**On screen.** Six bars declining, the last three in red · "This isn't a judgement and it isn't a score. It's the one number neither of you can see from inside the week." · three responses: reset week / just one evening / it's a busy season, that's fine.

**Build plan.**
- Shown at most **4× per year**, to both people simultaneously.
- "Reset week" protects three evenings and declines invitations for both.
- "Busy season" hides it until the trend changes again.
- Never shown to one person alone — that turns a shared observation into an accusation.

---

## p58 — The friend of the relationship

![p58](screens/p58-the-friend.png)

**What it is.** Read-only, self-expiring access for one trusted outsider — a counsellor, a sister.

**Useful for.** Couples therapy runs on self-report, which is where the truth goes to die. Giving a counsellor the *shape* of your week is genuinely new, and it's the strongest B2B2C wedge in the product.

**On screen.** Invited person card with expiry ("expires in 21 days", "read only") · access table: hours together **yes** · who's carrying **yes** · your drawings **never** · the unsaid, the pocket **never** · anything from a quiet day **never** · "Either of you can revoke it instantly, without telling the other why."

**Build plan.**
- Requires **both** partners to agree; **either** can revoke alone, silently.
- Hard expiry, never auto-renews.
- Shares aggregates only. Content is categorically excluded — enforce server-side, not in the UI.

---

## p59 — Solo nights

![p59](screens/p59-solo-nights.png)

**What it is.** Protected time apart, once a week each.

**Useful for.** An app for two that insists on one. Togetherness products quietly pathologize separateness; this one schedules it.

**On screen.** Your night Wednesdays / hers Mondays · "Protected like an appointment. Trace declines invitations on both, and won't show either of you the other's whereabouts." · on a solo night: presence dot **off** · leaving now **off** · goodnight still yours · the flare **always** · her note ("have a good one. don't wait up.").

**Build plan.**
- Blocks the calendar and auto-declines via p29.
- Presence and departure broadcasts suspend; the flare still works.
- Goodnight still happens — the ritual survives the night apart.

---

## p60 — Ageing parents

![p60](screens/p60-parents.png)

**What it is.** The care load for a parent, counted and split.

**Useful for.** Eldercare is the next decade's version of childcare, and it's invisible until it's a crisis. 82/18 is a fact neither person can see without something counting it.

**On screen.** "Your mum · 78 · The care you carry" · 82% / 18% bar · items (weekly pharmacy run — *always you* · cardiology appointment · the deferred conversation about the stairs, 7× · her brother, not on Trace) · "Care work is invisible until someone counts it. Trace counts it and says nothing else."

**Build plan.**
- Same primitives as household tasks with a `careRecipient` tag.
- Feeds decision debt (the deferred hard conversation).
- Accommodate people outside Trace (the brother) as context, not accounts.
- Reused for a sick sibling or a dependent friend.

---

## p61 — The visitor

![p61](screens/p61-the-visitor.png)

**What it is.** A house guest with an end date agreed *before* the door opens.

**Useful for.** "Three nights, not four" is easy to say in advance and impossible to say on night three. Co-signing it beforehand is the entire feature.

**On screen.** "Day 2 of 3" · co-signed agreement in Caveat: *"Three nights, not four. We say it on day one, not day three."* · while he's here: guest mode on · +2 tasks/day · hosting split 70/30 · solo night still yours · "rescue me in ten minutes" sent from the kitchen.

**Build plan.**
- Requires both signatures at creation, with an explicit end date.
- Auto-enables guest mode (p35) for the duration.
- Adds hosting load to the split, and **protects the solo night** anyway.
- "Rescue me" is a private, silent ping — not the flare, not a notification to anyone else.

---

# Build order

1. **p2, p3, p4** — canvas, goodnight, prompts. If this isn't good, nothing else matters.
2. **p16, p17, p18** — the widget. Distribution for everything after.
3. **p14, p15, p9** — the typed → handwritten loop. The signature interaction.
4. **p7, p8, p11, p27–p31** — household and calendar. The daily utility that earns the habit.
5. **p46, p47, p50, p51** — repair, cover me, interruptions, the end. Cheap now, expensive to retrofit, and the reason people trust the app with the rest.
6. Everything else, in whatever order the roadmap wants.
