import type { WorkspaceModule } from './access';
import { query, queryFirst } from './db';
import { FOLLOW_UP_AFTER_DAYS } from './offers/repo';

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
  kind: 'cohort' | 'exam-deadline';
  title: string;
  detail: string;
  /** The day it happens: the cohort's first day, the sitting's entry deadline. */
  on: Date;
  href: string;
};

/**
 * What is coming, with a day on it: a cohort that starts and an exam whose
 * entries close — both irreversible once the day passes. Soonest first. An
 * enquiry nobody has answered is not here but at the top of Today, in
 * "Waiting for an answer" (`getWaiting`).
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
      detail: `${days === 0 ? 'Starts today' : days === 1 ? 'Starts tomorrow' : 'Starts'} · ${cohort.registrations} of ${cohort.capacity} seats`,
      on: cohort.start_date,
      href: '/admin/catalogue',
    });
  }

  const deadlines = await query<{
    id: string;
    name: string;
    registration_deadline: Date;
    registrations: string;
    capacity: number;
  }>(
    `SELECT s.id,
            e.name,
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
      title: session.name,
      detail: `Entries close${days === 0 ? ' today' : days === 1 ? ' tomorrow' : ''} · ${session.registrations} of ${session.capacity} registered`,
      on: session.registration_deadline,
      href: '/admin/catalogue/exams',
    });
  }

  return items.sort((a, b) => a.on.getTime() - b.on.getTime());
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

/**
 * The latest arrivals across all four queues, newest first.
 *
 * Job applications only when asked for: the list carries each applicant's
 * name and the link to their record, which is Applications-module data, and
 * the Activity screen that shows it is open to colleagues who do not hold that
 * module. The caller passes `canAccess(user, 'applications')`.
 */
export async function getRecentInbound(
  limit = 8,
  { includeApplications = false }: { includeApplications?: boolean } = {}
): Promise<RecentInbound[]> {
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
        WHERE $2::boolean
     ) inbound
     ORDER BY at DESC
     LIMIT $1`,
    [limit, includeApplications]
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

export type WaitingItem = {
  key: string;
  name: string;
  /** What it is and what about: "Enquiry · Intensive course starting in October". */
  about: string;
  /** Since when they have been waiting. */
  since: Date;
  owner: string | null;
  href: string;
};

/**
 * Who is waiting for CASA to answer — the first thing on Today. A new
 * enquiry, registration or job application nobody has opened, and a sent offer
 * gone quiet (no answer for ten days, or past its validity) — oldest first,
 * since the longest wait is the one closest to writing to another school.
 * Only the modules the colleague holds are read.
 */
export async function getWaiting(
  holds: (module: WorkspaceModule) => boolean,
  limit = 6
): Promise<{ items: WaitingItem[]; total: number }> {
  const parts: string[] = [];
  if (holds('enquiries')) {
    parts.push(`SELECT 'enquiry:' || e.id AS key, concat_ws(' ', e.first_name, e.last_name) AS name,
                       concat_ws(' · ', 'Enquiry', nullif(e.topic, '')) AS about, e.submitted_at AS since,
                       u.name AS owner, '/admin/enquiries/' || e.id AS href
                  FROM enquiries e LEFT JOIN staff_users u ON u.id = e.assigned_to
                 WHERE e.status = 'new'`);
  }
  if (holds('registrations')) {
    parts.push(`SELECT 'course:' || r.id, concat_ws(' ', r.first_name, r.last_name),
                       concat_ws(' · ', 'Course registration', nullif(r.course_type_label, '')), r.submitted_at,
                       u.name, '/admin/registrations/course/' || r.id
                  FROM course_registrations r LEFT JOIN staff_users u ON u.id = r.assigned_to
                 WHERE r.status = 'new'`);
    parts.push(`SELECT 'exam:' || r.id, concat_ws(' ', r.first_name, r.last_name),
                       concat_ws(' · ', 'Exam registration', nullif(r.exam_type_label, '')), r.submitted_at,
                       u.name, '/admin/registrations/exam/' || r.id
                  FROM exam_registrations r LEFT JOIN staff_users u ON u.id = r.assigned_to
                 WHERE r.status = 'new'`);
  }
  if (holds('applications')) {
    parts.push(`SELECT 'application:' || a.id, concat_ws(' ', a.first_name, a.last_name),
                       concat_ws(' · ', 'Job application', nullif(a.position_title, '')), a.created_at,
                       u.name, '/admin/applications/' || a.id
                  FROM career_applications a LEFT JOIN staff_users u ON u.id = a.assigned_to
                 WHERE a.status IN ('submitted', 'new')`);
  }
  if (holds('offers')) {
    parts.push(`SELECT 'offer:' || o.id, coalesce(nullif(o.group_name, ''), o.recipient_name),
                       'Offer ' || o.year || '-' || lpad(o.seq::text, 3, '0') || ' · '
                         || CASE WHEN o.valid_until < current_date THEN 'expired' ELSE 'no answer yet' END,
                       o.sent_at, u.name, '/admin/offers/' || o.id
                  FROM offers o LEFT JOIN staff_users u ON u.id = o.owner_id
                 WHERE o.deleted_at IS NULL AND o.status = 'sent'
                   AND (o.valid_until < current_date OR o.sent_at::date <= current_date - ${FOLLOW_UP_AFTER_DAYS})`);
  }
  if (parts.length === 0) return { items: [], total: 0 };

  const rows = await query<{ key: string; name: string; about: string; since: Date; owner: string | null; href: string; total: string }>(
    `SELECT w.*, count(*) OVER () AS total
       FROM (${parts.join('\n UNION ALL\n')}) AS w (key, name, about, since, owner, href)
      ORDER BY w.since ASC
      LIMIT $1`,
    [limit]
  );
  return {
    items: rows.map((r) => ({ key: r.key, name: r.name, about: r.about, since: r.since, owner: r.owner, href: r.href })),
    total: Number(rows[0]?.total ?? 0),
  };
}
