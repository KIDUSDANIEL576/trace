/**
 * Daily Love Streak — pure math over daily_marks rows.
 * A day qualifies when BOTH partners left a mark (2+ distinct user_ids).
 * The streak is the run of consecutive qualifying UTC days ending today —
 * or ending yesterday, so the counter doesn't read 0 before today's marks land.
 * (Days are UTC because marks are written with toISOString().slice(0, 10).)
 */
export function computeStreak(marks: { day: string; user_id: string }[]): number {
  const usersByDay = new Map<string, Set<string>>();
  for (const m of marks) {
    let set = usersByDay.get(m.day);
    if (!set) usersByDay.set(m.day, (set = new Set()));
    set.add(m.user_id);
  }
  const qualifies = (day: string) => (usersByDay.get(day)?.size ?? 0) >= 2;

  const utcDay = (offset: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - offset);
    return d.toISOString().slice(0, 10);
  };

  let offset = qualifies(utcDay(0)) ? 0 : 1;
  let streak = 0;
  while (qualifies(utcDay(offset))) {
    streak += 1;
    offset += 1;
  }
  return streak;
}
