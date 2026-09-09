import { query, queryFirst } from './db';

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

export type CourseTypeSummary = {
  id: string;
  slug: string;
  name: string;
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

export type ExamSessionSummary = {
  id: string;
  examCode: string;
  examName: string;
  level: string | null;
  startsAt: Date;
  registrationDeadline: Date | null;
  capacity: number;
  status: string;
  registrationCount: number;
};

export async function listCourseTypes(): Promise<CourseTypeSummary[]> {
  const rows = await query<{
    id: string;
    slug: string;
    name: string;
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
            t.name,
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
      ORDER BY t.is_active DESC, t.name ASC`
  );

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
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
      WHERE i.start_date >= current_date - interval '14 days'
      ORDER BY i.start_date ASC
      LIMIT $1`,
    [limit]
  );

  return rows.map((row) => ({
    id: row.id,
    courseTypeName: row.course_type_name,
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

export const SESSION_LABELS = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
} as const;

/**
 * Schedules a cohort — what FileMaker's Course screen creates. The schedule
 * JSON keeps the shape the public site already renders (`days`, `time`).
 */
export async function createCourseInstance(
  input: {
    courseTypeId: string;
    startDate: string;
    endDate: string;
    capacity: number;
    levelCode: string | null;
    session: 'morning' | 'afternoon' | 'evening' | null;
    days: string[];
    time: string | null;
    roomId: string | null;
    title: string | null;
  },
  actor: { id: string; name: string }
): Promise<string> {
  const row = await queryFirst<{ id: string }>(
    `INSERT INTO course_instances
       (course_type_id, start_date, end_date, capacity, schedule, status, level_code, session, room_id, title)
     VALUES ($1, $2::date, $3::date, $4, $5::jsonb, 'scheduled', $6, $7, $8, $9)
     RETURNING id`,
    [
      input.courseTypeId,
      input.startDate,
      input.endDate,
      input.capacity,
      JSON.stringify({ days: input.days, time: input.time ?? '' }),
      input.levelCode,
      input.session,
      input.roomId,
      input.title,
    ]
  );
  if (!row) throw new Error('Cohort was not created');
  await query(
    `INSERT INTO staff_activity (staff_user_id, staff_name, entity, entity_id, action, detail)
     VALUES ($1, $2, 'course_instance', $3, 'cohort_created', $4)`,
    [
      actor.id,
      actor.name,
      row.id,
      JSON.stringify({ courseType: input.courseTypeId, start: input.startDate }),
    ]
  );
  return row.id;
}

export async function listUpcomingExamSessions(limit = 25): Promise<ExamSessionSummary[]> {
  const rows = await query<{
    id: string;
    exam_code: string;
    exam_name: string;
    level: string | null;
    starts_at: Date;
    registration_deadline: Date | null;
    capacity: number;
    status: string;
    registration_count: string;
  }>(
    `SELECT s.id,
            e.code AS exam_code,
            e.name AS exam_name,
            e.level,
            s.starts_at,
            s.registration_deadline,
            s.capacity,
            s.status,
            (SELECT count(*) FROM exam_registrations r
              WHERE r.exam_session_id = s.id AND r.status <> 'spam')
              AS registration_count
       FROM exam_sessions s
       JOIN exam_types e ON e.id = s.exam_type_id
      WHERE s.starts_at >= now() - interval '14 days'
      ORDER BY s.starts_at ASC
      LIMIT $1`,
    [limit]
  );

  return rows.map((row) => ({
    id: row.id,
    examCode: row.exam_code,
    examName: row.exam_name,
    level: row.level,
    startsAt: row.starts_at,
    registrationDeadline: row.registration_deadline,
    capacity: row.capacity,
    status: row.status,
    registrationCount: Number(row.registration_count),
  }));
}
