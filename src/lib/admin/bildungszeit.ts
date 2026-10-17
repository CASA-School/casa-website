import 'server-only';

import { addDays, classesFor, type BildungszeitOffer, type BzClassPlaces, type BzShift, type BzStart, type BzWeek } from './bildungszeit-rules';
import { query, queryFirst } from './db';
import { isoWeek, weekStartOf } from './kursplanung/weeks';
import { levelGroups, sessionOf } from './waitlist';
import { isSchoolClosed } from '@/config/school-closures';

/**
 * The weeks a Bildungszeit learner can be booked into, with the two intensive classes they would sit
 * in and how full each is that week (`bildungszeit-rules.ts`). A class is a course (0041): the newest
 * start's at its first half, or the previous start's at its second; its learners that week are the
 * bookings with a period on that course covering it — regular learners, joiners and other Bildungszeit
 * learners alike.
 */

const DEFAULT_PLACES = 14;

type PeriodRow = { course_id: string; start_date: string; end_date: string; booking_id: string };

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
  const [codes, groups, periods, schoolman] = await Promise.all([
    query<{ code: string }>(`SELECT code FROM levels WHERE code ~ '\\.[12]$' ORDER BY sort_order`),
    levelGroups(ids),
    query<PeriodRow>(
      `SELECT bp.course_id, to_char(bp.start_date, 'YYYY-MM-DD') AS start_date, to_char(bp.end_date, 'YYYY-MM-DD') AS end_date, bp.booking_id
         FROM booking_periods bp JOIN bookings b ON b.id = bp.booking_id
        WHERE bp.course_id IN (SELECT id FROM courses WHERE course_instance_id = ANY($1::uuid[]))
          AND b.deleted_at IS NULL AND b.status <> 'cancelled'`,
      [ids]
    ),
    // SchoolMan's learners in those courses each week (0050), while bookings are made there.
    query<{ course_id: string; monday: string; learners: number }>(
      `SELECT course_id, to_char(monday, 'YYYY-MM-DD') AS monday, sum(learners)::int AS learners FROM course_week_learners
        WHERE course_id IN (SELECT id FROM courses WHERE course_instance_id = ANY($1::uuid[]))
        GROUP BY course_id, monday`,
      [ids]
    ),
  ]);
  const elsewhere = new Map(schoolman.map((r) => [`${r.course_id}|${r.monday}`, r.learners]));
  const course = (instance: string, code: string) => groups.find((g) => g.courseInstanceId === instance && g.levelCode === code && !g.cancelled);
  // The distinct bookings sitting in a course during the week.
  const learners = (week: { monday: string; friday: string }, courseId: string | undefined) =>
    courseId
      ? new Set(periods.filter((p) => p.course_id === courseId && p.start_date <= week.friday && p.end_date >= week.monday).map((p) => p.booking_id)).size +
        (elsewhere.get(`${courseId}|${week.monday}`) ?? 0)
      : 0;

  const weeks = frames.map((f): BzWeek => {
    const first: Record<string, BzClassPlaces> = {};
    const second: Record<string, BzClassPlaces> = {};
    for (const { code } of codes) {
      // The newest start's course at its first half; at a second half, the previous start's course of
      // that level, running — the course a learner at that step sits in (`resolveCourse`).
      const c = code.endsWith('.1') ? course(f.start.id, code) : course(f.previous.id, `${code.slice(0, -2)}.1`);
      (code.endsWith('.1') ? first : second)[code] = { places: c?.places ?? DEFAULT_PLACES, booked: learners(f, c?.courseId), offered: c?.offered ?? 0, closed: c ? !c.bookable : false };
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
