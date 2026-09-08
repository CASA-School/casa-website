import { query } from './db';

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
              AS registration_count
       FROM course_instances i
       JOIN course_types t ON t.id = i.course_type_id
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
  }));
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
