import { query, queryFirst } from './db';
import { inboxCounts, openCount } from './inbox';
import { FOLLOW_UP_AFTER_DAYS } from './offers/repo';
import { waitlistCounts } from './waitlist';

/**
 * The workspace's counts, each in one round trip: the queues' totals and the
 * inbound volume (Activity), the newest arrivals (Activity), and the figures
 * on the overview's cards (`getOverviewFacts`).
 *
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
        WHERE status IN ('new', 'in_progress', 'waiting') AND deleted_at IS NULL) AS "enquiriesOpen",
      (SELECT count(*) FROM enquiries
        WHERE status = 'new' AND deleted_at IS NULL)                 AS "enquiriesNew",
      -- One Anmeldung is one registration, however many lines it holds (0097): by what it holds.
      (SELECT count(*) FROM registrations g
        WHERE status IN ('new', 'in_progress', 'waiting')
          AND EXISTS (SELECT 1 FROM course_registrations c WHERE c.registration_id = g.id)) AS "courseRegistrationsOpen",
      (SELECT count(*) FROM registrations g
        WHERE status IN ('new', 'in_progress', 'waiting')
          AND NOT EXISTS (SELECT 1 FROM course_registrations c WHERE c.registration_id = g.id)) AS "examRegistrationsOpen",
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
        (SELECT count(*) FROM enquiries WHERE submitted_at > now() - interval '7 days' AND deleted_at IS NULL) +
        (SELECT count(*) FROM registrations WHERE submitted_at > now() - interval '7 days') +
        (SELECT count(*) FROM career_applications WHERE created_at > now() - interval '7 days')
      )                                                              AS "inboundThisWeek",
      (
        (SELECT count(*) FROM enquiries
          WHERE deleted_at IS NULL AND submitted_at > now() - interval '14 days'
            AND submitted_at <= now() - interval '7 days') +
        (SELECT count(*) FROM registrations
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
       SELECT submitted_at::date AS day FROM enquiries WHERE deleted_at IS NULL
       UNION ALL
       SELECT submitted_at::date FROM registrations
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
         FROM enquiries e WHERE e.deleted_at IS NULL
       UNION ALL
       -- An Anmeldung (0097), named by its first line: a course before the exam.
       SELECT g.id,
              CASE WHEN l.rank = 0 THEN 'course' ELSE 'exam' END,
              trim(concat(l.first_name, ' ', l.last_name)),
              l.label,
              g.status::text,
              g.submitted_at
         FROM registrations g
         CROSS JOIN LATERAL (
           SELECT first_name, last_name, coalesce(course_type_label, 'Course registration') AS label, 0 AS rank FROM course_registrations WHERE registration_id = g.id
           UNION ALL
           SELECT first_name, last_name, coalesce(exam_type_label, 'Exam registration'), 1 FROM exam_registrations WHERE registration_id = g.id
           ORDER BY rank LIMIT 1
         ) l
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
    course: '/admin/registrations',
    exam: '/admin/registrations',
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

/**
 * The figures on the overview's cards, in one round trip — each counted the way
 * its own screen counts it (open = new, in progress or waiting; current
 * bookings = a period running today; offers to follow up = sent, ten days
 * without an answer or past their validity), so a card and the list it opens
 * never disagree.
 */
export type OverviewFacts = {
  enquiriesOpen: number;
  enquiriesNew: number;
  registrationsOpen: number;
  registrationsNew: number;
  students: number;
  placementToReview: number;
  bookingsCurrent: number;
  offersOpen: number;
  offersToFollowUp: number;
  cohortsUpcoming: number;
  nextExam: Date | null;
  applicationsOpen: number;
  colleagues: number;
  changesToday: number;
  /** Website releases waiting for approval, and texts drafted but not released. */
  websitePending: number;
  websiteDrafts: number;
  /** Visits to the public site in the last seven days (site_page_views, 0106). */
  websiteVisitsWeek: number;
  /** The first day of the price list in force, and the last month the teaching plan covers. */
  pricesSince: Date | null;
  plannedTo: Date | null;
  /** Learners in a waiting list, and the lists where a place is free for the next one (counted as the screen counts them). */
  waitlistWaiting: number;
  waitlistFree: number;
};

export async function getOverviewFacts(): Promise<OverviewFacts> {
  type Dates = 'nextExam' | 'pricesSince' | 'plannedTo';
  type Inbox = 'enquiriesOpen' | 'enquiriesNew' | 'registrationsOpen' | 'registrationsNew' | 'applicationsOpen' | 'waitlistWaiting' | 'waitlistFree';
  // The inboxes are counted as their own screens count them (src/lib/admin/inbox.ts), so a card and its list never disagree.
  const [enquiries, registrations, applications, waitlist] = await Promise.all([
    inboxCounts('enquiry'),
    inboxCounts('registration'),
    inboxCounts('career_application'),
    waitlistCounts(),
  ]);
  const row = await queryFirst<Record<Exclude<keyof OverviewFacts, Dates | Inbox>, string> & Record<Dates, Date | null>>(
    `SELECT
       (SELECT count(*) FROM people WHERE deleted_at IS NULL AND merged_into IS NULL) AS students,
       (SELECT count(*) FROM placement_attempts a LEFT JOIN placement_reviews r ON r.attempt_id = a.id
         WHERE a.decision IS NOT NULL AND r.attempt_id IS NULL) AS "placementToReview",
       (SELECT count(*) FROM bookings b
         WHERE b.deleted_at IS NULL AND b.status IN ('reserved', 'confirmed')
           AND EXISTS (SELECT 1 FROM booking_periods bp WHERE bp.booking_id = b.id
                        AND bp.start_date <= current_date AND bp.end_date >= current_date)) AS "bookingsCurrent",
       (SELECT count(*) FROM offers WHERE deleted_at IS NULL AND status IN ('draft', 'sent')) AS "offersOpen",
       (SELECT count(*) FROM offers o WHERE o.deleted_at IS NULL AND o.status = 'sent'
         AND (o.valid_until < current_date OR o.sent_at::date <= current_date - ${FOLLOW_UP_AFTER_DAYS})) AS "offersToFollowUp",
       (SELECT count(*) FROM course_instances WHERE start_date >= current_date AND status <> 'cancelled') AS "cohortsUpcoming",
       (SELECT min(starts_at) FROM exam_sessions WHERE starts_at >= current_date AND status <> 'cancelled') AS "nextExam",
       (SELECT count(*) FROM staff_users WHERE is_active) AS colleagues,
       (SELECT count(*) FROM staff_activity WHERE created_at >= current_date) AS "changesToday",
       (SELECT count(*) FROM website_releases WHERE state = 'pending') AS "websitePending",
       (SELECT count(*) FROM website_drafts) AS "websiteDrafts",
       (SELECT count(*) FROM site_page_views WHERE entry AND viewed_at >= now() - interval '7 days') AS "websiteVisitsWeek",
       (SELECT max(valid_from) FROM rates WHERE valid_from <= current_date) AS "pricesSince",
       (SELECT max(month) FROM course_groups) AS "plannedTo"`
  );
  const n = (v: string | undefined) => Number(v ?? 0);
  return {
    enquiriesOpen: openCount(enquiries),
    enquiriesNew: enquiries.new,
    registrationsOpen: openCount(registrations),
    registrationsNew: registrations.new,
    students: n(row?.students),
    placementToReview: n(row?.placementToReview),
    bookingsCurrent: n(row?.bookingsCurrent),
    offersOpen: n(row?.offersOpen),
    offersToFollowUp: n(row?.offersToFollowUp),
    cohortsUpcoming: n(row?.cohortsUpcoming),
    nextExam: row?.nextExam ?? null,
    applicationsOpen: openCount(applications),
    colleagues: n(row?.colleagues),
    changesToday: n(row?.changesToday),
    websitePending: n(row?.websitePending),
    websiteDrafts: n(row?.websiteDrafts),
    websiteVisitsWeek: n(row?.websiteVisitsWeek),
    pricesSince: row?.pricesSince ?? null,
    plannedTo: row?.plannedTo ?? null,
    waitlistWaiting: waitlist.waiting,
    waitlistFree: waitlist.free,
  };
}
