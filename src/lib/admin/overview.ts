import { query, queryFirst } from './db';

/**
 * The one query behind the overview screen.
 *
 * Deliberately one round trip. The overview shows eight numbers from six
 * tables, and eight sequential `count(*)` queries is eight network waits on the
 * first screen anybody sees after signing in — the screen whose speed decides
 * whether the workspace feels like a tool or a website.
 *
 * WHAT IS ON THIS SCREEN, AND WHY ONLY THIS
 *
 * Not "every metric we can compute". An overview earns its place by answering
 * one question — *is anything waiting on me?* — so it carries the open counts,
 * the week's inbound volume for context, and the two things with a deadline
 * attached: a cohort about to start and an exam about to close for entries.
 * Aggregate marketing numbers (learners supported, countries represented) are
 * public-site claims governed by CLAUDE.md rule 1 and have no business here.
 */

export type OverviewCounts = {
  enquiriesOpen: number;
  enquiriesNew: number;
  courseRegistrationsOpen: number;
  examRegistrationsOpen: number;
  applicationsOpen: number;
  placementAwaitingReview: number;
  placementInProgress: number;
  inboundThisWeek: number;
  inboundPreviousWeek: number;
};

export async function getOverviewCounts(): Promise<OverviewCounts> {
  const row = await queryFirst<Record<keyof OverviewCounts, string>>(`
    SELECT
      (SELECT count(*) FROM enquiries
        WHERE status IN ('new', 'in_progress', 'waiting'))          AS "enquiriesOpen",
      (SELECT count(*) FROM enquiries
        WHERE status = 'new')                                        AS "enquiriesNew",
      (SELECT count(*) FROM course_registrations
        WHERE status IN ('new', 'in_progress', 'waiting'))          AS "courseRegistrationsOpen",
      (SELECT count(*) FROM exam_registrations
        WHERE status IN ('new', 'in_progress', 'waiting'))          AS "examRegistrationsOpen",
      (SELECT count(*) FROM career_applications
        WHERE status IN ('submitted', 'new', 'in_progress', 'waiting', 'interview'))
                                                                     AS "applicationsOpen",
      (SELECT count(*) FROM placement_attempts a
        LEFT JOIN placement_reviews r ON r.attempt_id = a.id
        WHERE a.decision IS NOT NULL AND r.attempt_id IS NULL)      AS "placementAwaitingReview",
      (SELECT count(*) FROM placement_attempts
        WHERE decision IS NULL
          AND created_at > now() - interval '7 days')                AS "placementInProgress",
      -- Inbound volume, this week against the one before it. Two numbers rather
      -- than one, because "9 enquiries" says nothing without "and 4 last week".
      (
        (SELECT count(*) FROM enquiries WHERE submitted_at > now() - interval '7 days') +
        (SELECT count(*) FROM course_registrations WHERE submitted_at > now() - interval '7 days') +
        (SELECT count(*) FROM exam_registrations WHERE submitted_at > now() - interval '7 days') +
        (SELECT count(*) FROM career_applications WHERE created_at > now() - interval '7 days')
      )                                                              AS "inboundThisWeek",
      (
        (SELECT count(*) FROM enquiries
          WHERE submitted_at > now() - interval '14 days'
            AND submitted_at <= now() - interval '7 days') +
        (SELECT count(*) FROM course_registrations
          WHERE submitted_at > now() - interval '14 days'
            AND submitted_at <= now() - interval '7 days') +
        (SELECT count(*) FROM exam_registrations
          WHERE submitted_at > now() - interval '14 days'
            AND submitted_at <= now() - interval '7 days') +
        (SELECT count(*) FROM career_applications
          WHERE created_at > now() - interval '14 days'
            AND created_at <= now() - interval '7 days')
      )                                                              AS "inboundPreviousWeek"
  `);

  const read = (key: keyof OverviewCounts) => Number(row?.[key] ?? 0);

  return {
    enquiriesOpen: read('enquiriesOpen'),
    enquiriesNew: read('enquiriesNew'),
    courseRegistrationsOpen: read('courseRegistrationsOpen'),
    examRegistrationsOpen: read('examRegistrationsOpen'),
    applicationsOpen: read('applicationsOpen'),
    placementAwaitingReview: read('placementAwaitingReview'),
    placementInProgress: read('placementInProgress'),
    inboundThisWeek: read('inboundThisWeek'),
    inboundPreviousWeek: read('inboundPreviousWeek'),
  };
}

export type InboundDay = { day: Date; count: number };

/**
 * Inbound per day for the last fortnight, zero-filled.
 *
 * The zero-fill is `generate_series`, not a loop in TypeScript: a chart built
 * from only the days that had traffic silently compresses the quiet ones and
 * makes a flat fortnight look busy.
 */
export async function getInboundByDay(days = 14): Promise<InboundDay[]> {
  const rows = await query<{ day: Date; n: string }>(
    `WITH span AS (
       SELECT generate_series(
         (current_date - ($1::int - 1) * interval '1 day')::date,
         current_date,
         interval '1 day'
       )::date AS day
     ),
     inbound AS (
       SELECT submitted_at::date AS day FROM enquiries
       UNION ALL
       SELECT submitted_at::date FROM course_registrations
       UNION ALL
       SELECT submitted_at::date FROM exam_registrations
       UNION ALL
       SELECT created_at::date FROM career_applications
     )
     SELECT span.day, count(inbound.day) AS n
       FROM span
       LEFT JOIN inbound ON inbound.day = span.day
      GROUP BY span.day
      ORDER BY span.day ASC`,
    [days]
  );

  return rows.map((row) => ({ day: row.day, count: Number(row.n) }));
}

export type AttentionItem = {
  kind: 'cohort' | 'exam-deadline' | 'stale-enquiry';
  title: string;
  detail: string;
  href: string;
};

/**
 * The short list of things with a clock on them.
 *
 * Three sources, each chosen because it becomes irreversible: a cohort that
 * starts, an exam entry deadline that closes, and an enquiry that has gone
 * unanswered long enough that the person has probably written to someone else.
 */
export async function getAttentionItems(): Promise<AttentionItem[]> {
  const items: AttentionItem[] = [];

  const cohorts = await query<{
    id: string;
    name: string;
    start_date: Date;
    capacity: number;
    registrations: string;
  }>(
    `SELECT i.id,
            t.name,
            i.start_date,
            i.capacity,
            (SELECT count(*) FROM course_registrations r
              WHERE r.course_instance_id = i.id AND r.status <> 'spam') AS registrations
       FROM course_instances i
       JOIN course_types t ON t.id = i.course_type_id
      WHERE i.start_date BETWEEN current_date AND current_date + interval '21 days'
        AND i.status = 'scheduled'
      ORDER BY i.start_date ASC
      LIMIT 4`
  );

  for (const cohort of cohorts) {
    const days = Math.round(
      (new Date(cohort.start_date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) /
        86_400_000
    );

    items.push({
      kind: 'cohort',
      title: cohort.name,
      detail: `${days === 0 ? 'Starts today' : days === 1 ? 'Starts tomorrow' : `Starts in ${days} days`} · ${cohort.registrations} of ${cohort.capacity} seats`,
      href: '/admin/catalogue',
    });
  }

  const deadlines = await query<{
    id: string;
    code: string;
    registration_deadline: Date;
    registrations: string;
    capacity: number;
  }>(
    `SELECT s.id,
            e.code,
            s.registration_deadline,
            s.capacity,
            (SELECT count(*) FROM exam_registrations r
              WHERE r.exam_session_id = s.id AND r.status <> 'spam') AS registrations
       FROM exam_sessions s
       JOIN exam_types e ON e.id = s.exam_type_id
      WHERE s.registration_deadline BETWEEN current_date AND current_date + interval '14 days'
      ORDER BY s.registration_deadline ASC
      LIMIT 4`
  );

  for (const session of deadlines) {
    const days = Math.round(
      (new Date(session.registration_deadline).setHours(0, 0, 0, 0) -
        new Date().setHours(0, 0, 0, 0)) /
        86_400_000
    );

    items.push({
      kind: 'exam-deadline',
      title: `${session.code} entries close`,
      detail: `${days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`} · ${session.registrations} of ${session.capacity} registered`,
      href: '/admin/catalogue/exams',
    });
  }

  const stale = await query<{ id: string; first_name: string; last_name: string | null; age: string }>(
    `SELECT id,
            first_name,
            last_name,
            extract(day from now() - submitted_at)::int::text AS age
       FROM enquiries
      WHERE status = 'new'
        AND submitted_at < now() - interval '3 days'
      ORDER BY submitted_at ASC
      LIMIT 4`
  );

  for (const enquiry of stale) {
    items.push({
      kind: 'stale-enquiry',
      title: [enquiry.first_name, enquiry.last_name].filter(Boolean).join(' '),
      detail: `Unanswered for ${enquiry.age} days`,
      href: `/admin/enquiries/${enquiry.id}`,
    });
  }

  return items;
}

export type RecentInbound = {
  id: string;
  kind: 'enquiry' | 'course' | 'exam' | 'application';
  name: string;
  summary: string;
  status: string;
  at: Date;
  href: string;
};

/** The latest arrivals across all four queues, newest first. */
export async function getRecentInbound(limit = 8): Promise<RecentInbound[]> {
  const rows = await query<{
    id: string;
    kind: RecentInbound['kind'];
    name: string;
    summary: string;
    status: string;
    at: Date;
  }>(
    `SELECT id, kind, name, summary, status, at FROM (
       SELECT e.id,
              'enquiry'::text AS kind,
              trim(concat(e.first_name, ' ', coalesce(e.last_name, ''))) AS name,
              e.topic AS summary,
              e.status::text AS status,
              e.submitted_at AS at
         FROM enquiries e
       UNION ALL
       SELECT r.id,
              'course',
              trim(concat(r.first_name, ' ', r.last_name)),
              coalesce(r.course_type_label, 'Course registration'),
              r.status::text,
              r.submitted_at
         FROM course_registrations r
       UNION ALL
       SELECT r.id,
              'exam',
              trim(concat(r.first_name, ' ', r.last_name)),
              coalesce(r.exam_type_label, 'Exam registration'),
              r.status::text,
              r.submitted_at
         FROM exam_registrations r
       UNION ALL
       SELECT a.id,
              'application',
              trim(concat(a.first_name, ' ', a.last_name)),
              a.position_title,
              a.status,
              a.created_at
         FROM career_applications a
     ) inbound
     ORDER BY at DESC
     LIMIT $1`,
    [limit]
  );

  const hrefFor: Record<RecentInbound['kind'], string> = {
    enquiry: '/admin/enquiries',
    course: '/admin/registrations/course',
    exam: '/admin/registrations/exam',
    application: '/admin/applications',
  };

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    name: row.name,
    summary: row.summary,
    status: row.status,
    at: row.at,
    href: `${hrefFor[row.kind]}/${row.id}`,
  }));
}
