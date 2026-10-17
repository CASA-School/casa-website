import 'server-only';

import type { PoolClient } from 'pg';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query, queryFirst } from './db';
import type { Bilingual } from './i18n';

/**
 * Courses (2026-10-17, migration 0041; docs/ADMIN_WORKSPACE.md §Courses): one level of a start — or
 * one module, exam preparation, group's or company's course — as SchoolMan's `Course` is, with its
 * places, room, status and learners. A booked period and a waiting-list place name their course.
 *
 * `resolveCourse` is the one rule for which course a learner's step at a start means: the start's own
 * course at that step; for an intensive start's second half (`B1.2`) the course of the start before,
 * still running — SchoolMan books a learner joining mid-level on the running course, from their first
 * day to its end.
 */

type Run = <R>(sql: string, params: unknown[]) => Promise<R[]>;

const viaClient =
  (client: PoolClient): Run =>
  async <R>(sql: string, params: unknown[]) =>
    (await client.query(sql, params)).rows as R[];
const viaPool: Run = <R>(sql: string, params: unknown[]) => query<R & Record<string, unknown>>(sql, params) as Promise<R[]>;

export type ResolvedCourse = {
  courseId: string;
  /** The start the course belongs to: the learner's own, or the running one they join. */
  courseInstanceId: string;
  /** The period clamped to the course: a learner joining in its second half sits in it to its end. */
  startDate: string | null;
  endDate: string | null;
};

/**
 * The course a learner's step at a start means; made when the start has none at that step yet. A start
 * of named courses (a module, a group's, a company's) books onto its course whatever the level, even none.
 */
export async function resolveCourse(
  courseInstanceId: string,
  levelCode: string | null,
  dates: { startDate: string | null; endDate: string | null } = { startDate: null, endDate: null },
  options: { client?: PoolClient; actor?: StaffUser | null } = {}
): Promise<ResolvedCourse | null> {
  const run = options.client ? viaClient(options.client) : viaPool;
  const [start] = await run<{ id: string; start_date: string; end_date: string; format: string }>(
    `SELECT i.id, to_char(i.start_date, 'YYYY-MM-DD') AS start_date, to_char(i.end_date, 'YYYY-MM-DD') AS end_date, t.format
       FROM course_instances i JOIN course_types t ON t.id = i.course_type_id WHERE i.id = $1`,
    [courseInstanceId]
  );
  if (!start) return null;

  // A named course of the start, and none at this exact level: the learner sits in it.
  const [named] = await run<{ id: string }>(
    `SELECT id FROM courses WHERE course_instance_id = $1 AND level_code IS NULL AND status <> 'cancelled'
        AND NOT EXISTS (SELECT 1 FROM courses o WHERE o.course_instance_id = $1 AND o.level_code = $2)
      ORDER BY created_at LIMIT 1`,
    [start.id, levelCode]
  );
  if (named) return { courseId: named.id, courseInstanceId: start.id, startDate: dates.startDate, endDate: dates.endDate };
  if (!levelCode) return null;

  let instance = start.id;
  let level = levelCode;
  let clampEnd: string | null = null;
  if (start.format === 'intensive' && /\.2$/.test(levelCode)) {
    // The start before, still running on this one's first day: its course of the same level.
    const [running] = await run<{ id: string; end_date: string }>(
      `SELECT i.id, to_char(i.end_date, 'YYYY-MM-DD') AS end_date
         FROM course_instances i JOIN course_types t ON t.id = i.course_type_id
        WHERE t.format = 'intensive' AND i.status <> 'cancelled' AND i.start_date < $1::date AND i.end_date >= $1::date
        ORDER BY i.start_date DESC LIMIT 1`,
      [start.start_date]
    );
    if (running) {
      instance = running.id;
      level = `${levelCode.slice(0, -2)}.1`;
      clampEnd = running.end_date;
    }
  }

  await run(
    `INSERT INTO courses (course_instance_id, level_code, created_by) VALUES ($1, $2, $3)
     ON CONFLICT (course_instance_id, level_code) WHERE level_code IS NOT NULL DO NOTHING`,
    [instance, level, options.actor?.id ?? null]
  );
  const [course] = await run<{ id: string }>(`SELECT id FROM courses WHERE course_instance_id = $1 AND level_code = $2`, [instance, level]);
  if (!course) return null;
  const endDate = clampEnd && dates.endDate && dates.endDate > clampEnd ? clampEnd : dates.endDate;
  return { courseId: course.id, courseInstanceId: instance, startDate: dates.startDate, endDate };
}

/**
 * A course's own price for a start and level — an evening term, a special module, an exam preparation
 * (SchoolMan prices those per course) — or null: the price list decides. Looks, never makes a course.
 */
export async function ownCoursePrice(courseInstanceId: string, levelCode: string | null): Promise<{ amount: number; title: string | null } | null> {
  const row = await queryFirst<{ price: string; title: string | null }>(
    `SELECT price, title FROM courses
      WHERE course_instance_id = $1 AND status <> 'cancelled' AND price IS NOT NULL
        AND (level_code = $2 OR (level_code IS NULL AND NOT EXISTS (SELECT 1 FROM courses o WHERE o.course_instance_id = $1 AND o.level_code = $2)))
      ORDER BY (level_code = $2) DESC NULLS LAST LIMIT 1`,
    [courseInstanceId, levelCode]
  );
  return row ? { amount: Number(row.price), title: row.title } : null;
}

// ------------------------------------------------------------------ edits

type Result = { ok: true; id?: string } | { ok: false; reason: Bilingual };
const refuse = (de: string, en: string): Result => ({ ok: false, reason: { de, en } });

export type CourseInput = {
  roomId: string | null;
  groups: number;
  placesPerGroup: number;
  bookable: boolean;
  title: string | null;
  price: number | null;
  lessons: number | null;
  note: string | null;
};

export type CourseForEdit = CourseInput & { id: string; courseInstanceId: string; levelCode: string | null };

type EditRow = {
  id: string;
  course_instance_id: string;
  level_code: string | null;
  room_id: string | null;
  groups: number;
  places_per_group: number;
  bookable: boolean;
  title: string | null;
  price: string | null;
  lessons: number | null;
  note: string | null;
};
const EDIT = `SELECT id, course_instance_id, level_code, room_id, groups, places_per_group, bookable, title, price, lessons, note FROM courses`;
const toEdit = (row: EditRow): CourseForEdit => ({
  id: row.id,
  courseInstanceId: row.course_instance_id,
  levelCode: row.level_code,
  roomId: row.room_id,
  groups: row.groups,
  placesPerGroup: row.places_per_group,
  bookable: row.bookable,
  title: row.title,
  price: row.price === null ? null : Number(row.price),
  lessons: row.lessons,
  note: row.note,
});

/** A start's courses as their forms need them. */
export async function coursesForEdit(courseInstanceId: string): Promise<CourseForEdit[]> {
  return (await query<EditRow>(`${EDIT} WHERE course_instance_id = $1`, [courseInstanceId])).map(toEdit);
}

export async function courseForEdit(id: string): Promise<CourseForEdit | null> {
  const row = await queryFirst<EditRow>(`${EDIT} WHERE id = $1`, [id]);
  return row ? toEdit(row) : null;
}

/** A new course of a start: a level, or — for a module, a group's or a company's course — a title. */
export async function createCourse(courseInstanceId: string, input: { levelCode: string | null } & CourseInput, actor: StaffUser): Promise<Result> {
  if (!input.levelCode && !input.title) return refuse('Ein Kurs braucht ein Niveau oder einen Namen.', 'A course needs a level or a name.');
  if (input.levelCode) {
    const taken = await queryFirst(`SELECT 1 FROM courses WHERE course_instance_id = $1 AND level_code = $2`, [courseInstanceId, input.levelCode]);
    if (taken) return refuse(`Diesen Termin gibt es schon mit ${input.levelCode}.`, `This start already has ${input.levelCode}.`);
  }
  const row = await queryFirst<{ id: string }>(
    `INSERT INTO courses (course_instance_id, level_code, title, room_id, groups, places_per_group, bookable, price, lessons, note, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11) RETURNING id`,
    [courseInstanceId, input.levelCode, input.title, input.roomId, input.groups, input.placesPerGroup, input.bookable, input.price, input.lessons, input.note, actor.id]
  );
  await logActivity({ actor, entity: 'course_instance', entityId: courseInstanceId, action: 'course_created', detail: { course: row!.id, level: input.levelCode, title: input.title } });
  return { ok: true, id: row!.id };
}

export async function updateCourse(id: string, input: CourseInput, actor: StaffUser): Promise<Result> {
  const row = await queryFirst<{ course_instance_id: string; level_code: string | null }>(
    `UPDATE courses SET room_id = $2, groups = $3, places_per_group = $4, bookable = $5, title = $6, price = $7, lessons = $8, note = $9,
            updated_by = $10, updated_at = timezone('utc', now())
      WHERE id = $1 RETURNING course_instance_id, level_code`,
    [id, input.roomId, input.groups, input.placesPerGroup, input.bookable, input.title, input.price, input.lessons, input.note, actor.id]
  );
  if (!row) return refuse('Diesen Kurs gibt es nicht mehr.', 'That course no longer exists.');
  await logActivity({ actor, entity: 'course_instance', entityId: row.course_instance_id, action: 'course_updated', detail: { course: id, level: row.level_code } });
  return { ok: true };
}

/** Called off: it stays, with its learners, and is no longer offered. Not while anyone is booked or waits. */
export async function cancelCourse(id: string, actor: StaffUser): Promise<Result> {
  const used = await queryFirst<{ booked: boolean; waiting: boolean; course_instance_id: string }>(
    `SELECT c.course_instance_id,
            EXISTS (SELECT 1 FROM booking_periods bp JOIN bookings b ON b.id = bp.booking_id
                     WHERE bp.course_id = c.id AND b.deleted_at IS NULL AND b.status <> 'cancelled') AS booked,
            EXISTS (SELECT 1 FROM waitlist_entries w WHERE w.course_id = c.id AND w.status IN ('waiting', 'offered')) AS waiting
       FROM courses c WHERE c.id = $1`,
    [id]
  );
  if (!used) return refuse('Diesen Kurs gibt es nicht mehr.', 'That course no longer exists.');
  if (used.booked || used.waiting)
    return refuse('Erst die Gebuchten und die Warteliste in einen anderen Kurs bringen.', 'Move the booked learners and the waiting list to another course first.');
  await query(`UPDATE courses SET status = 'cancelled', bookable = false, updated_by = $2, updated_at = timezone('utc', now()) WHERE id = $1`, [id, actor.id]);
  await logActivity({ actor, entity: 'course_instance', entityId: used.course_instance_id, action: 'course_cancelled', detail: { course: id } });
  return { ok: true };
}

/** Gone, for a course made by mistake: never one anybody was booked into or waited for. */
export async function deleteCourse(id: string, actor: StaffUser): Promise<Result> {
  const used = await queryFirst<{ used: boolean; course_instance_id: string; filemaker: string | null }>(
    `SELECT c.course_instance_id, c.filemaker_course_id AS filemaker,
            EXISTS (SELECT 1 FROM booking_periods bp WHERE bp.course_id = c.id) OR EXISTS (SELECT 1 FROM waitlist_entries w WHERE w.course_id = c.id) AS used
       FROM courses c WHERE c.id = $1`,
    [id]
  );
  if (!used) return refuse('Diesen Kurs gibt es nicht mehr.', 'That course no longer exists.');
  if (used.used) return refuse('In diesem Kurs war schon jemand gebucht oder auf der Warteliste: absagen statt löschen.', 'Someone was booked into or waited for this course: cancel it instead.');
  await query(`DELETE FROM courses WHERE id = $1`, [id]);
  await logActivity({ actor, entity: 'course_instance', entityId: used.course_instance_id, action: 'course_deleted', detail: { course: id } });
  return { ok: true };
}

/**
 * A second (third …) group: more places, and the queue moves up. `groups` is the count the course now
 * has — one more than it showed, which may include Kursplanung's groups (`waitlist.ts`, `PLANNED`).
 */
export async function openCourseGroup(id: string, groups: number, actor: StaffUser): Promise<Result> {
  if (groups > 9) return refuse('Mehr Gruppen gehen nicht.', 'No more groups possible.');
  const row = await queryFirst<{ groups: number; course_instance_id: string; level_code: string | null }>(
    `UPDATE courses SET groups = $2, updated_by = $3, updated_at = timezone('utc', now())
      WHERE id = $1 RETURNING groups, course_instance_id, level_code`,
    [id, groups, actor.id]
  );
  if (!row) return refuse('Mehr Gruppen gehen nicht.', 'No more groups possible.');
  await logActivity({ actor, entity: 'course_instance', entityId: row.course_instance_id, action: 'group_opened', detail: { course: id, level: row.level_code, groups: row.groups } });
  return { ok: true };
}

/** The learners booked on a course: their period on it and their step, the bookings that stand. */
export type CourseLearner = { bookingId: string; personId: string; name: string; levelCode: string | null; startDate: string; endDate: string; status: string };

export async function courseLearners(courseId: string): Promise<CourseLearner[]> {
  const rows = await query<{ booking_id: string; person_id: string; name: string; level_code: string | null; start_date: string; end_date: string; status: string }>(
    `SELECT b.id AS booking_id, b.person_id, concat_ws(' ', p.first_name, p.last_name) AS name, bp.level_code,
            to_char(bp.start_date, 'YYYY-MM-DD') AS start_date, to_char(bp.end_date, 'YYYY-MM-DD') AS end_date, b.status::text AS status
       FROM booking_periods bp JOIN bookings b ON b.id = bp.booking_id JOIN people p ON p.id = b.person_id
      WHERE bp.course_id = $1 AND b.deleted_at IS NULL AND b.status <> 'cancelled'
      ORDER BY p.last_name, p.first_name`,
    [courseId]
  );
  return rows.map((r) => ({ bookingId: r.booking_id, personId: r.person_id, name: r.name, levelCode: r.level_code, startDate: r.start_date, endDate: r.end_date, status: r.status }));
}
