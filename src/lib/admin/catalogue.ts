import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query, queryFirst, withTransaction } from './db';
import type { Bilingual } from './i18n';

/**
 * The course and exam catalogue, read with the numbers staff actually need:
 * how many people have registered against each dated option, and how that sits
 * against its capacity.
 *
 * Read-only in this first pass, deliberately. Editing a course price or a
 * cohort date changes what the public site publishes, and
 * docs/COURSE_FACTS_SOURCE_OF_TRUTH.md is the current authority on those
 * numbers — an edit form here before that is reconciled would let the workspace
 * quietly contradict the verified facts. What the workspace adds today is the
 * one thing the source of truth cannot hold: live demand.
 */

/**
 * Course types that are no course of their own (Rahman, 2026-10-17): Bildungszeit is booked into the
 * normal intensive courses, a morning and an afternoon one (`bildungszeit.ts`). Its row stays for the
 * website's page, its price and the booking that names it; it has no starts and no courses here.
 */
export const BOOKED_INTO_OTHER_COURSES: readonly string[] = ['bildungszeit'];

export type CourseTypeSummary = {
  id: string;
  slug: string;
  name: string;
  /** German name (`name_de`), else the English one. */
  nameDe: string;
  format: string | null;
  levelRange: string | null;
  lessonsPerWeek: number;
  defaultPrice: number;
  currency: string;
  isActive: boolean;
  instanceCount: number;
  upcomingCount: number;
  registrationCount: number;
};

export type CourseInstanceSummary = {
  id: string;
  courseTypeName: string;
  /** The type's German name (`name_de`), for the workspace in German; the English one when it has none. */
  courseTypeNameDe: string;
  courseTypeSlug: string;
  startDate: Date;
  endDate: Date;
  capacity: number;
  location: string | null;
  status: string;
  registrationCount: number;
  room: { id: string; name: string; nickname: string | null; capacity: number | null } | null;
  levelCode: string | null;
  session: 'morning' | 'afternoon' | 'evening' | null;
  title: string | null;
  bookingCount: number;
};

export async function listCourseTypes(): Promise<CourseTypeSummary[]> {
  const rows = await query<{
    id: string;
    slug: string;
    name: string;
    name_de: string | null;
    format: string | null;
    level_min: string | null;
    level_max: string | null;
    lessons_per_week: number;
    default_price: string;
    currency: string;
    is_active: boolean;
    instance_count: string;
    upcoming_count: string;
    registration_count: string;
  }>(
    `SELECT t.id,
            t.slug,
            t.name, t.name_de,
            t.format,
            t.level_min,
            t.level_max,
            t.lessons_per_week,
            t.default_price,
            t.currency,
            t.is_active,
            (SELECT count(*) FROM course_instances i WHERE i.course_type_id = t.id)
              AS instance_count,
            (SELECT count(*) FROM course_instances i
              WHERE i.course_type_id = t.id AND i.start_date >= current_date)
              AS upcoming_count,
            (SELECT count(*) FROM course_registrations r
              WHERE r.course_type_id = t.id AND r.status <> 'spam')
              AS registration_count
       FROM course_types t
      ORDER BY t.is_active DESC, t.position, t.name ASC`
  );

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameDe: row.name_de ?? row.name,
    format: row.format,
    levelRange:
      row.level_min && row.level_max
        ? row.level_min === row.level_max
          ? row.level_min
          : `${row.level_min}–${row.level_max}`
        : (row.level_min ?? row.level_max),
    lessonsPerWeek: row.lessons_per_week,
    defaultPrice: Number(row.default_price),
    currency: row.currency,
    isActive: row.is_active,
    instanceCount: Number(row.instance_count),
    upcomingCount: Number(row.upcoming_count),
    registrationCount: Number(row.registration_count),
  }));
}

export async function listUpcomingCourseInstances(limit = 25): Promise<CourseInstanceSummary[]> {
  const rows = await query<{
    id: string;
    course_type_name: string;
    course_type_name_de: string;
    course_type_slug: string;
    start_date: Date;
    end_date: Date;
    capacity: number;
    location: string | null;
    status: string;
    registration_count: string;
    room_id: string | null;
    room_name: string | null;
    room_nickname: string | null;
    room_capacity: number | null;
    level_code: string | null;
    session: 'morning' | 'afternoon' | 'evening' | null;
    title: string | null;
    booking_count: string;
  }>(
    `SELECT i.id,
            t.name AS course_type_name,
            coalesce(t.name_de, t.name) AS course_type_name_de,
            t.slug AS course_type_slug,
            i.start_date,
            i.end_date,
            i.capacity,
            i.location,
            i.status,
            (SELECT count(*) FROM course_registrations r
              WHERE r.course_instance_id = i.id AND r.status <> 'spam')
              AS registration_count,
            rm.id AS room_id, rm.name AS room_name, rm.nickname AS room_nickname,
            rm.capacity AS room_capacity,
            i.level_code, i.session, i.title,
            (SELECT count(DISTINCT bp.booking_id) FROM booking_periods bp
               JOIN bookings b ON b.id = bp.booking_id
              WHERE bp.course_instance_id = i.id AND b.deleted_at IS NULL AND b.status <> 'cancelled')
              AS booking_count
       FROM course_instances i
       JOIN course_types t ON t.id = i.course_type_id
       LEFT JOIN rooms rm ON rm.id = i.room_id
      WHERE i.start_date >= current_date - interval '14 days' AND NOT (t.slug = ANY($2::text[]))
      ORDER BY i.start_date ASC, t.position
      LIMIT $1`,
    [limit, BOOKED_INTO_OTHER_COURSES]
  );

  return rows.map((row) => ({
    id: row.id,
    courseTypeName: row.course_type_name,
    courseTypeNameDe: row.course_type_name_de,
    courseTypeSlug: row.course_type_slug,
    startDate: row.start_date,
    endDate: row.end_date,
    capacity: row.capacity,
    location: row.location,
    status: row.status,
    registrationCount: Number(row.registration_count),
    room: row.room_id
      ? {
          id: row.room_id,
          name: row.room_name ?? '',
          nickname: row.room_nickname,
          capacity: row.room_capacity,
        }
      : null,
    levelCode: row.level_code,
    session: row.session,
    title: row.title,
    bookingCount: Number(row.booking_count),
  }));
}

type Refusal = { ok: false; reason: Bilingual };
type Result = { ok: true } | Refusal;
const refuse = (de: string, en: string): Refusal => ({ ok: false, reason: { de, en } });

/** Read with `pick(lang, SESSION_LABELS[session])` (docs/ADMIN_I18N.md). */
export const SESSION_LABELS: Record<'morning' | 'afternoon' | 'evening', Bilingual> = {
  morning: { de: 'Vormittag', en: 'Morning' },
  afternoon: { de: 'Nachmittag', en: 'Afternoon' },
  evening: { de: 'Abend', en: 'Evening' },
};

/**
 * Schedules a course start — what FileMaker's Course screen creates. The schedule JSON keeps the shape
 * the public site already renders (`days`, `time`); the time arrives normalised (`course-starts.ts`).
 * A start is on the website only when it is ticked so (`on_website`, 0043): planning a start is not
 * publishing it.
 */
export async function createCourseInstance(
  input: {
    courseTypeId: string;
    startDate: string;
    endDate: string;
    /** Places per group of each course it makes (14 unless set). */
    capacity: number;
    levelCode: string | null;
    session: 'morning' | 'afternoon' | 'evening' | null;
    days: string[];
    time: string;
    roomId: string | null;
    title: string | null;
    onWebsite: boolean;
  },
  actor: { id: string; name: string }
): Promise<{ ok: true; id: string } | Refusal> {
  const kind = await queryFirst<{ slug: string }>(`SELECT slug FROM course_types WHERE id = $1`, [input.courseTypeId]);
  if (!kind) return refuse('Diesen Kurs gibt es nicht.', 'That course does not exist.');
  // Bildungszeit is booked into the intensive courses: it has no starts of its own.
  if (BOOKED_INTO_OTHER_COURSES.includes(kind.slug)) return refuse('Für diesen Kurs gibt es keine eigenen Termine.', 'This course has no starts of its own.');
  const places = input.capacity >= 1 && input.capacity <= 40 ? input.capacity : 14;
  const id = await withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO course_instances
         (course_type_id, start_date, end_date, capacity, schedule, status, level_code, session, room_id, title, on_website, created_by)
       VALUES ($1, $2::date, $3::date, $4, $5::jsonb, 'scheduled', $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        input.courseTypeId,
        input.startDate,
        input.endDate,
        places,
        JSON.stringify({ days: input.days, time: input.time }),
        input.levelCode,
        input.session,
        input.roomId,
        input.title,
        input.onWebsite,
        actor.id,
      ]
    );
    const row = rows[0];
    if (!row) throw new Error('Cohort was not created');
    // Its courses (0041), as SchoolMan plans them: an intensive start one per level, A1 to C1, unless one
    // level is given; an evening start its level; any other kind one course, named after the start.
    const {
      rows: [type],
    } = await client.query<{ slug: string; name: string }>(`SELECT slug, coalesce(name_de, name) AS name FROM course_types WHERE id = $1`, [input.courseTypeId]);
    if (type?.slug === 'intensive-german' && !input.levelCode) {
      await client.query(
        `INSERT INTO courses (course_instance_id, level_code, places_per_group, created_by)
         SELECT $1, code, $3, $2 FROM levels WHERE code IN ('A1.1', 'A2.1', 'B1.1', 'B1+.1', 'B2.1', 'C1.1')
         ON CONFLICT DO NOTHING`,
        [row.id, actor.id, places]
      );
    } else if (type?.slug === 'intensive-german' || type?.slug === 'evening-german') {
      if (input.levelCode) {
        await client.query(
          `INSERT INTO courses (course_instance_id, level_code, room_id, places_per_group, created_by) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
          [row.id, input.levelCode, input.roomId, places, actor.id]
        );
      }
    } else {
      await client.query(
        `INSERT INTO courses (course_instance_id, level_code, title, room_id, places_per_group, created_by) VALUES ($1, $2, $3, $4, $5, $6)`,
        [row.id, input.levelCode, input.title ?? type?.name ?? null, input.roomId, places, actor.id]
      );
    }
    return row.id;
  });
  await query(
    `INSERT INTO staff_activity (staff_user_id, staff_name, entity, entity_id, action, detail)
     VALUES ($1, $2, 'course_instance', $3, 'cohort_created', $4)`,
    [actor.id, actor.name, id, JSON.stringify({ courseType: input.courseTypeId, start: input.startDate, onWebsite: input.onWebsite })]
  );
  return { ok: true, id };
}

/** Which kinds of start make a course per level and which one named course (`createCourseInstance`). */
export const PER_LEVEL_TYPES: readonly string[] = ['intensive-german', 'evening-german'];

// ------------------------------------------------------------------ a start, edited


/**
 * A start as its „Bearbeiten" form needs it, with what may still change. Its dates move only while
 * nothing hangs on them — made here (the seeds and SchoolMan's import would put the old dates back),
 * nobody booked, no lesson days; its time of day, days and hours only while it has no lesson days
 * (they are made from them, and the board's groups run in its shift). Title, room and the website
 * always.
 */
export type StartForEdit = {
  id: string;
  courseTypeSlug: string;
  startDate: string;
  endDate: string;
  session: 'morning' | 'afternoon' | 'evening' | null;
  days: string[];
  time: string;
  title: string | null;
  roomId: string | null;
  onWebsite: boolean;
  status: string;
  createdHere: boolean;
  /** Bookings that stand on the start or its courses. */
  booked: number;
  /** Open waiting-list entries for it. */
  waiting: number;
  hasDays: boolean;
  /** Anybody ever booked, waiting or registered for it. */
  used: boolean;
  datesFixed: boolean;
  scheduleFixed: boolean;
};

export async function startForEdit(id: string): Promise<StartForEdit | null> {
  const r = await queryFirst<{
    id: string;
    slug: string;
    start_date: string;
    end_date: string;
    session: string | null;
    schedule: { days?: string[]; time?: string } | null;
    title: string | null;
    room_id: string | null;
    on_website: boolean;
    status: string;
    created_here: boolean;
    booked: number;
    waiting: number;
    has_days: boolean;
    used: boolean;
  }>(
    `SELECT i.id, t.slug, to_char(i.start_date, 'YYYY-MM-DD') AS start_date, to_char(i.end_date, 'YYYY-MM-DD') AS end_date,
            i.session, i.schedule, i.title, i.room_id, i.on_website, i.status, i.created_by IS NOT NULL AS created_here,
            (SELECT count(DISTINCT b.id) FROM booking_periods bp JOIN bookings b ON b.id = bp.booking_id
              WHERE (bp.course_instance_id = i.id OR bp.course_id IN (SELECT id FROM courses WHERE course_instance_id = i.id))
                AND b.deleted_at IS NULL AND b.status <> 'cancelled')::int AS booked,
            (SELECT count(*) FROM waitlist_entries w
              WHERE (w.course_instance_id = i.id OR w.course_id IN (SELECT id FROM courses WHERE course_instance_id = i.id))
                AND w.status IN ('waiting', 'offered'))::int AS waiting,
            EXISTS (SELECT 1 FROM course_days d JOIN courses c ON c.id = d.course_id WHERE c.course_instance_id = i.id) AS has_days,
            EXISTS (SELECT 1 FROM booking_periods bp WHERE bp.course_instance_id = i.id OR bp.course_id IN (SELECT id FROM courses WHERE course_instance_id = i.id))
              OR EXISTS (SELECT 1 FROM waitlist_entries w WHERE w.course_instance_id = i.id OR w.course_id IN (SELECT id FROM courses WHERE course_instance_id = i.id))
              OR EXISTS (SELECT 1 FROM course_registrations r WHERE r.course_instance_id = i.id) AS used
       FROM course_instances i JOIN course_types t ON t.id = i.course_type_id
      WHERE i.id = $1`,
    [id]
  );
  if (!r) return null;
  const session = r.session === 'morning' || r.session === 'afternoon' || r.session === 'evening' ? r.session : null;
  return {
    id: r.id,
    courseTypeSlug: r.slug,
    startDate: r.start_date,
    endDate: r.end_date,
    session,
    days: Array.isArray(r.schedule?.days) ? r.schedule.days : [],
    time: r.schedule?.time ?? '',
    title: r.title,
    roomId: r.room_id,
    onWebsite: r.on_website,
    status: r.status,
    createdHere: r.created_here,
    booked: r.booked,
    waiting: r.waiting,
    hasDays: r.has_days,
    used: r.used,
    datesFixed: !r.created_here || r.booked > 0 || r.has_days,
    scheduleFixed: r.has_days,
  };
}

export type StartInput = {
  startDate: string;
  endDate: string;
  session: 'morning' | 'afternoon' | 'evening' | null;
  days: string[];
  time: string;
  title: string | null;
  roomId: string | null;
  onWebsite: boolean;
};

export async function updateCourseInstance(id: string, input: StartInput, actor: StaffUser): Promise<Result> {
  const current = await startForEdit(id);
  if (!current) return refuse('Diesen Termin gibt es nicht mehr.', 'That start no longer exists.');
  if (current.datesFixed && (input.startDate !== current.startDate || input.endDate !== current.endDate))
    return refuse('Die Daten dieses Termins stehen fest.', 'This start’s dates are fixed.');
  const sameDays = [...input.days].sort().join() === [...current.days].sort().join();
  if (current.scheduleFixed && (input.session !== current.session || input.time !== current.time || !sameDays))
    return refuse('Tageszeit, Tage und Uhrzeit stehen fest, seit es Kurstage gibt.', 'Time of day, days and hours are fixed once there are lesson days.');
  await query(
    `UPDATE course_instances
        SET start_date = $2::date, end_date = $3::date, session = $4, schedule = $5::jsonb, title = $6, room_id = $7, on_website = $8
      WHERE id = $1`,
    [id, input.startDate, input.endDate, input.session, JSON.stringify({ days: input.days, time: input.time }), input.title, input.roomId, input.onWebsite]
  );
  await logActivity({
    actor,
    entity: 'course_instance',
    entityId: id,
    action: 'cohort_updated',
    detail: { start: input.startDate, end: input.endDate, onWebsite: input.onWebsite, wasOnWebsite: current.onWebsite },
  });
  return { ok: true };
}

/**
 * Called off: off the website, kept on record with its courses. Not while anyone is booked or waits —
 * they are moved or told first, as with an exam sitting.
 */
export async function cancelCourseInstance(id: string, actor: StaffUser): Promise<Result> {
  const current = await startForEdit(id);
  if (!current) return refuse('Diesen Termin gibt es nicht mehr.', 'That start no longer exists.');
  if (current.booked === 1) return refuse('Erst die Buchung in einen anderen Termin verschieben oder stornieren.', 'Move or cancel the booking first.');
  if (current.booked > 1) return refuse(`Erst die ${current.booked} Buchungen in einen anderen Termin verschieben oder stornieren.`, `Move or cancel the ${current.booked} bookings first.`);
  if (current.waiting > 0) return refuse('Erst die Warteliste auflösen.', 'Clear the waiting list first.');
  await withTransaction(async (client) => {
    await client.query(`UPDATE course_instances SET status = 'cancelled' WHERE id = $1`, [id]);
    await client.query(`UPDATE courses SET status = 'cancelled', bookable = false, updated_by = $2, updated_at = timezone('utc', now()) WHERE course_instance_id = $1`, [id, actor.id]);
  });
  await logActivity({ actor, entity: 'course_instance', entityId: id, action: 'cohort_cancelled', detail: {} });
  return { ok: true };
}

/**
 * Gone, for a start planned here by mistake: never one anybody was booked into, waited for or
 * registered for. Its courses, their plans and days go with it; a board group made for them goes when
 * nothing is planned in it.
 */
export async function deleteCourseInstance(id: string, actor: StaffUser): Promise<Result> {
  const current = await startForEdit(id);
  if (!current) return refuse('Diesen Termin gibt es nicht mehr.', 'That start no longer exists.');
  if (!current.createdHere || current.used) return refuse('Dieser Termin wird abgesagt, nicht gelöscht.', 'This start is cancelled, not deleted.');
  await withTransaction(async (client) => {
    const { rows: groups } = await client.query<{ id: string }>(
      `SELECT g.id FROM course_groups g JOIN courses c ON c.id = g.course_id WHERE c.course_instance_id = $1`,
      [id]
    );
    await client.query(`DELETE FROM course_instances WHERE id = $1`, [id]);
    // Its days went with its courses; a group of the board that is now empty, with no pair, goes too.
    await client.query(
      `DELETE FROM course_groups g
        WHERE g.id = ANY($1::uuid[]) AND g.teacher_first IS NULL AND g.teacher_second IS NULL AND g.registrations = 0
          AND NOT EXISTS (SELECT 1 FROM course_days d WHERE d.group_id = g.id)`,
      [groups.map((g) => g.id)]
    );
  });
  await logActivity({ actor, entity: 'course_instance', entityId: id, action: 'cohort_deleted', detail: { start: current.startDate } });
  return { ok: true };
}
