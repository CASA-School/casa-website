/**
 * Bildungszeit, as CASA teaches it (Rahman, 2026-10-17; docs/CATALOGUE_AND_PRICING.md §Types): not a
 * course of its own but two intensive courses at once, a morning and an afternoon one, for a week or
 * two. SchoolMan books it the same way — 138 of its 164 Superintensiv bookings are a morning and an
 * afternoon intensive course on one start date.
 *
 * In any week two intensive classes run: the newest start's, at its first half (`B1.1`), in its shift,
 * and the previous start's, now at its second half (`B1.2`), in the other. A Bildungszeit learner sits
 * in one of each. Client-safe and pure; the server side is `bildungszeit.ts`.
 */

export type BzShift = 'morning' | 'afternoon';
export type BzStart = { id: string; startDate: string; endDate: string; shift: BzShift | null };
export type BzClassPlaces = { places: number; booked: number; offered: number };

export type BzWeek = {
  /** Monday and Friday, `yyyy-mm-dd`. */
  monday: string;
  friday: string;
  kw: number;
  /** The newest start: its classes teach the first half this week. */
  start: BzStart;
  /** The start before it: its classes teach the second half this week. */
  previous: BzStart;
  /** Per level code (`B1.1` …): the newest start's class this week. */
  first: Record<string, BzClassPlaces>;
  /** Per level code (`B1.2` …): the previous start's class this week. */
  second: Record<string, BzClassPlaces>;
};

export type BildungszeitOffer = { courseTypeId: string; name: string; weeks: BzWeek[] };

/** One to two weeks: the Bildungszeit a Bremen employee takes is ten days in two years. */
export const BZ_WEEKS = [1, 2] as const;

const DAY = 86_400_000;
export const addDays = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

/** The two classes running in a week: the newest start and the one before, in different shifts. */
export function classesFor(starts: readonly BzStart[], monday: string): { start: BzStart; previous: BzStart } | null {
  const friday = addDays(monday, 4);
  const sorted = [...starts].sort((a, b) => a.startDate.localeCompare(b.startDate));
  let at = -1;
  sorted.forEach((s, i) => {
    if (s.startDate <= monday) at = i;
  });
  if (at < 1) return null;
  const start = sorted[at];
  const previous = sorted[at - 1];
  if (start.endDate < friday || previous.endDate < friday) return null;
  if (start.shift && previous.shift && start.shift === previous.shift) return null;
  return { start, previous };
}

/**
 * The weeks a booking from `monday` for `count` weeks would sit in: consecutive Mondays. Null when a
 * week is missing (a closure). A new course may start in between: from then on its first half and the
 * course before it are the two classes (`bzSegments`).
 */
export function bzRun(weeks: readonly BzWeek[], monday: string, count: number): BzWeek[] | null {
  const run: BzWeek[] = [];
  for (let i = 0; i < count; i++) {
    const week = weeks.find((w) => w.monday === addDays(monday, 7 * i));
    if (!week) return null;
    run.push(week);
  }
  return run.length ? run : null;
}

/** A run cut where a new course starts: each part one period in each of its two classes. */
export function bzSegments<W extends Pick<BzWeek, 'monday' | 'friday' | 'start' | 'previous'>>(run: readonly W[]): { from: string; to: string; start: BzStart; previous: BzStart }[] {
  const out: { from: string; to: string; start: BzStart; previous: BzStart }[] = [];
  for (const w of run) {
    const last = out[out.length - 1];
    if (last && last.start.id === w.start.id) last.to = w.friday;
    else out.push({ from: w.monday, to: w.friday, start: w.start, previous: w.previous });
  }
  return out;
}

/** Free places in a class over every week of the run: the tightest week decides, never below zero. */
export function bzFree(run: readonly BzWeek[], half: 'first' | 'second', code: string): number {
  return Math.max(0, Math.min(...run.map((w) => {
    const c = w[half][code];
    return c ? c.places - c.booked - c.offered : 14;
  })));
}

/** The class with the most learners in the run, for "14 von 14". */
export function bzPeak(run: readonly BzWeek[], half: 'first' | 'second', code: string): { booked: number; places: number } {
  const classes = run.map((w) => w[half][code] ?? { places: 14, booked: 0, offered: 0 });
  return { booked: Math.max(...classes.map((c) => c.booked + c.offered)), places: Math.min(...classes.map((c) => c.places)) };
}
