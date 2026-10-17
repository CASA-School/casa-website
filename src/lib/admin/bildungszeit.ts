import 'server-only';

import { addDays, classesFor, type BildungszeitOffer, type BzClassPlaces, type BzShift, type BzStart, type BzWeek } from './bildungszeit-rules';
import { query, queryFirst } from './db';
import { isoWeek, weekStartOf } from './kursplanung/weeks';
import { levelGroups, sessionOf } from './waitlist';
import { isSchoolClosed } from '@/config/school-closures';

/**
 * The weeks a Bildungszeit learner can be booked into, with the two intensive classes they would sit
 * in and how full each is that week (`bildungszeit-rules.ts`). A class is the newest start's level at
 * its first half, or the previous start's at its second; its learners that week are the bookings
 * whose period covers it — the regular learners, a `.2` joiner, and other Bildungszeit learners, whose
 * periods sit on the course of the class (`B1.2` on the previous start).
 */

const DEFAULT_PLACES = 14;

type PeriodRow = { course_instance_id: string; level_code: string; start_date: string; end_date: string; booking_id: string };

async function intensiveStarts(): Promise<BzStart[]> {
  const rows = await query<{ id: string; start_date: string; end_date: string; session: string | null; schedule: { time?: string } | null }>(
    `SELECT i.id, to_char(i.start_date, 'YYYY-MM-DD') AS start_date, to_char(i.end_date, 'YYYY-MM-DD') AS end_date, i.session, i.schedule
       FROM course_instances i JOIN course_types t ON t.id = i.course_type_id
      WHERE t.format = 'intensive' AND i.status <> 'cancelled' AND i.end_date >= current_date - 7
      ORDER BY i.start_date`
  );
  return rows.map((r) => {
    const session = sessionOf(r.session, r.schedule);
    return { id: r.id, startDate: r.start_date, endDate: r.end_date, shift: session === 'morning' || session === 'afternoon' ? (session as BzShift) : null };
  });
}

/** The Bildungszeit course type, and the weeks ahead it can be booked in. Null without the type. */
export async function bildungszeitOffer(horizonWeeks = 26): Promise<BildungszeitOffer | null> {
  const type = await queryFirst<{ id: string; name: string }>(`SELECT id, name FROM course_types WHERE slug = 'bildungszeit' AND is_active`);
  if (!type) return null;
  const starts = await intensiveStarts();

  const today = new Date().toISOString().slice(0, 10);
  const firstMonday = weekStartOf(today) < today ? addDays(weekStartOf(today), 7) : today;
  const frames: Omit<BzWeek, 'first' | 'second'>[] = [];
  for (let i = 0; i < horizonWeeks; i++) {
    const monday = addDays(firstMonday, 7 * i);
    if (isSchoolClosed(monday)) continue;
    const classes = classesFor(starts, monday);
    if (classes) frames.push({ monday, friday: addDays(monday, 4), kw: isoWeek(monday), ...classes });
  }
  if (!frames.length) return { courseTypeId: type.id, name: type.name, weeks: [] };

  const ids = [...new Set(frames.flatMap((f) => [f.start.id, f.previous.id]))];
  const [codes, groups, periods] = await Promise.all([
    query<{ code: string }>(`SELECT code FROM levels WHERE code ~ '\\.[12]$' ORDER BY sort_order`),
    levelGroups(ids),
    query<PeriodRow>(
      `SELECT bp.course_instance_id, bp.level_code, to_char(bp.start_date, 'YYYY-MM-DD') AS start_date,
              to_char(bp.end_date, 'YYYY-MM-DD') AS end_date, bp.booking_id
         FROM booking_periods bp JOIN bookings b ON b.id = bp.booking_id
        WHERE bp.course_instance_id = ANY($1::uuid[]) AND bp.level_code IS NOT NULL
          AND b.deleted_at IS NULL AND b.status <> 'cancelled'`,
      [ids]
    ),
  ]);
  const group = (instance: string, code: string) => groups.find((g) => g.courseInstanceId === instance && g.levelCode === code);
  // The distinct bookings sitting in these (start, level) places during the week.
  const learners = (week: { monday: string; friday: string }, places: [string, string][]) =>
    new Set(
      periods
        .filter((p) => p.start_date <= week.friday && p.end_date >= week.monday && places.some(([i, c]) => p.course_instance_id === i && p.level_code === c))
        .map((p) => p.booking_id)
    ).size;

  const weeks = frames.map((f): BzWeek => {
    const first: Record<string, BzClassPlaces> = {};
    const second: Record<string, BzClassPlaces> = {};
    for (const { code } of codes) {
      if (code.endsWith('.1')) {
        const g = group(f.start.id, code);
        first[code] = { places: g?.places ?? DEFAULT_PLACES, booked: learners(f, [[f.start.id, code]]), offered: g?.offered ?? 0 };
      } else {
        // The previous start's class at its second half: its own learners, those booked into its second
        // half (Bildungszeit), and those who joined at `.2` when the newest course started.
        const own = `${code.slice(0, -2)}.1`;
        const g = group(f.previous.id, own);
        const visiting = group(f.previous.id, code);
        const joined = group(f.start.id, code);
        second[code] = {
          places: g?.places ?? DEFAULT_PLACES,
          booked: learners(f, [
            [f.previous.id, own],
            [f.previous.id, code],
            [f.start.id, code],
          ]),
          offered: (g?.offered ?? 0) + (visiting?.offered ?? 0) + (joined?.offered ?? 0),
        };
      }
    }
    return { ...f, first, second };
  });
  return { courseTypeId: type.id, name: type.name, weeks };
}

/**
 * For the booking itself: the classes of each week of a run, worked out again on the server rather
 * than taken from the form. Null when a week has no two classes or the school is closed.
 */
export async function bildungszeitClasses(monday: string, count: number): Promise<{ monday: string; friday: string; start: BzStart; previous: BzStart }[] | null> {
  const starts = await intensiveStarts();
  const weeks: { monday: string; friday: string; start: BzStart; previous: BzStart }[] = [];
  for (let i = 0; i < count; i++) {
    const day = addDays(monday, 7 * i);
    if (isSchoolClosed(day)) return null;
    const classes = classesFor(starts, day);
    if (!classes) return null;
    weeks.push({ monday: day, friday: addDays(day, 4), ...classes });
  }
  return weeks;
}

/** The Bildungszeit course type's id: what a Bildungszeit booking is of, for its letters and its price. */
export async function bildungszeitTypeId(): Promise<string | null> {
  return (await queryFirst<{ id: string }>(`SELECT id FROM course_types WHERE slug = 'bildungszeit'`))?.id ?? null;
}
