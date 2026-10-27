import 'server-only';

import { query, queryFirst } from './db';
import { foldSearch } from './search-query';

/**
 * The Prüfungen list (2026-10-27, Rahman: „it doesn't look so advanced … proper filters that we have applied
 * in other parts of our system"): its views, each one question, and the filters at the side, as on Buchungen.
 *
 * The views: what is coming and offered on the website (`upcoming`), what is prepared and not yet offered
 * (`drafts`), the sittings whose results are still to be entered (`results`, sat in the last four months,
 * a candidate without a whole result), everything sat (`past`), the called-off (`cancelled`), `all`. The
 * filters cut across them: the exam, the month, the places (free, full, someone waiting), who examines
 * (or nobody yet), and whether every candidate is reported to telc. Everything is worked out on each
 * read, on Bremen's calendar.
 */

export const EXAM_VIEWS = ['upcoming', 'drafts', 'results', 'past', 'cancelled', 'all'] as const;
export type ExamView = (typeof EXAM_VIEWS)[number];
export const isExamView = (value: unknown): value is ExamView => (EXAM_VIEWS as readonly unknown[]).includes(value);

export type ExamListFilters = {
  examTypeId?: string;
  /** `YYYY-MM`. */
  month?: string;
  places?: 'free' | 'full' | 'waiting';
  /** A colleague's staff id, or `none`: no examiner yet. */
  examiner?: string;
  /** `open`: someone booked is not reported to telc yet. */
  filed?: 'open';
  search?: string;
};

export type ExamListItem = {
  id: string;
  examTypeId: string;
  examName: string;
  level: string | null;
  startsAt: Date;
  endsAt: Date;
  registrationDeadline: Date | null;
  capacity: number;
  status: string;
  booked: number;
  filed: number;
  offered: number;
  waiting: number;
  openRegistrations: number;
  /** Booked candidates whose every part sat has a result. */
  withResult: number;
  examiners: { id: string; name: string }[];
  /** Exam preparation courses leading to it (0093). */
  preparations: number;
};

/** One row per sitting with its figures, and its day on Bremen's calendar. */
const FACTS = `
  WITH today AS (SELECT (now() AT TIME ZONE 'Europe/Berlin')::date AS d),
  f AS (
    SELECT s.id, s.exam_type_id, e.name AS exam_name, e.level, s.starts_at, s.ends_at, s.registration_deadline, s.capacity, s.status,
           (s.starts_at AT TIME ZONE 'Europe/Berlin')::date AS day,
           (SELECT count(*) FROM bookings b WHERE b.exam_session_id = s.id AND b.deleted_at IS NULL AND b.status <> 'cancelled')::int AS booked,
           (SELECT count(*) FROM bookings b WHERE b.exam_session_id = s.id AND b.deleted_at IS NULL AND b.status <> 'cancelled'
               AND b.exam_filed_at IS NOT NULL)::int AS filed,
           (SELECT count(*) FROM waitlist_entries w WHERE w.exam_session_id = s.id AND w.status = 'offered')::int AS offered,
           (SELECT count(*) FROM waitlist_entries w WHERE w.exam_session_id = s.id AND w.status = 'waiting')::int AS waiting,
           (SELECT count(*) FROM exam_registrations r
             WHERE r.exam_session_id = s.id AND r.status IN ('new', 'in_progress', 'waiting')
               AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.source_exam_registration_id = r.id AND b.deleted_at IS NULL))::int AS open_registrations,
           (SELECT count(*) FROM bookings b JOIN exam_results r ON r.booking_id = b.id
             WHERE b.exam_session_id = s.id AND b.deleted_at IS NULL AND b.status <> 'cancelled'
               AND (b.exam_parts = 'oral' OR r.written IS NOT NULL) AND (b.exam_parts = 'written' OR r.oral IS NOT NULL))::int AS with_result,
           coalesce((SELECT json_agg(json_build_object('id', m.id, 'name', concat_ws(' ', p.first_name, p.last_name)) ORDER BY p.last_name, p.first_name)
                       FROM exam_session_examiners x JOIN staff_members m ON m.id = x.staff_member_id JOIN people p ON p.id = m.person_id
                      WHERE x.exam_session_id = s.id), '[]'::json) AS examiners,
           (SELECT count(*) FROM courses c WHERE c.exam_session_id = s.id AND c.status <> 'cancelled')::int AS preparations
      FROM exam_sessions s JOIN exam_types e ON e.id = s.exam_type_id
  )`;

/** Each view's question, on a row of `f` with `today`. */
const VIEW_WHERE: Record<ExamView, string> = {
  upcoming: `f.day >= (SELECT d FROM today) AND f.status = 'scheduled'`,
  drafts: `f.day >= (SELECT d FROM today) AND f.status = 'draft'`,
  results: `f.day < (SELECT d FROM today) AND f.day >= (SELECT d FROM today) - 120 AND f.status <> 'cancelled' AND f.booked > f.with_result`,
  past: `f.day < (SELECT d FROM today) AND f.status <> 'cancelled'`,
  cancelled: `f.status = 'cancelled'`,
  all: 'true',
};

/** What is coming first; the past newest first; results the longest waiting first. */
const VIEW_ORDER: Record<ExamView, string> = {
  upcoming: 'f.starts_at',
  drafts: 'f.starts_at',
  results: 'f.starts_at',
  past: 'f.starts_at DESC',
  cancelled: 'f.starts_at DESC',
  all: 'f.starts_at DESC',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The filters as SQL on `f`, with their parameters numbered from `start`. */
function filterSql(filters: ExamListFilters, start = 1): { where: string[]; params: unknown[] } {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (value: unknown) => {
    params.push(value);
    return `$${start + params.length - 1}`;
  };
  if (filters.examTypeId && UUID.test(filters.examTypeId)) where.push(`f.exam_type_id = ${add(filters.examTypeId)}`);
  if (filters.month && /^\d{4}-\d{2}$/.test(filters.month)) where.push(`to_char(f.day, 'YYYY-MM') = ${add(filters.month)}`);
  if (filters.places === 'free') where.push('f.capacity - f.booked - f.offered > 0');
  if (filters.places === 'full') where.push('f.capacity - f.booked - f.offered <= 0');
  if (filters.places === 'waiting') where.push('f.waiting + f.offered > 0');
  if (filters.examiner === 'none') where.push('NOT EXISTS (SELECT 1 FROM exam_session_examiners x WHERE x.exam_session_id = f.id)');
  else if (filters.examiner && UUID.test(filters.examiner))
    where.push(`EXISTS (SELECT 1 FROM exam_session_examiners x WHERE x.exam_session_id = f.id AND x.staff_member_id = ${add(filters.examiner)})`);
  if (filters.filed === 'open') where.push('f.booked > f.filed');
  // A word finds the exam („c1", „hochschule"), the day („13.11.", „2026") or a candidate by name.
  const words = foldSearch(filters.search ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 6);
  if (words.length) {
    const own = words.map((w) => {
      const p = add(`%${w.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
      return `(ws_fold(f.exam_name) LIKE ${p} OR to_char(f.day, 'DD.MM.YYYY') LIKE ${p} OR to_char(f.day, 'FMDD.FMMM.YYYY') LIKE ${p})`;
    });
    const person = words.map((w) => `p.search_name LIKE ${add(`%${w.replace(/[\\%_]/g, (c) => `\\${c}`)}%`)}`);
    where.push(
      `((${own.join(' AND ')}) OR EXISTS (SELECT 1 FROM bookings b JOIN people p ON p.id = canonical_person_id(b.person_id)
          WHERE b.exam_session_id = f.id AND b.deleted_at IS NULL AND ${person.join(' AND ')}))`
    );
  }
  return { where, params };
}

type Row = {
  id: string;
  exam_type_id: string;
  exam_name: string;
  level: string | null;
  starts_at: Date;
  ends_at: Date;
  registration_deadline: Date | null;
  capacity: number;
  status: string;
  booked: number;
  filed: number;
  offered: number;
  waiting: number;
  open_registrations: number;
  with_result: number;
  examiners: { id: string; name: string }[];
  preparations: number;
};

export async function listExamSittings(view: ExamView, filters: ExamListFilters, limit = 200): Promise<ExamListItem[]> {
  const { where, params } = filterSql(filters);
  const rows = await query<Row>(
    `${FACTS} SELECT f.* FROM f WHERE ${[VIEW_WHERE[view], ...where].join(' AND ')} ORDER BY ${VIEW_ORDER[view]} LIMIT ${Math.max(1, Math.min(limit, 500))}`,
    params
  );
  return rows.map((r) => ({
    id: r.id,
    examTypeId: r.exam_type_id,
    examName: r.exam_name,
    level: r.level,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    registrationDeadline: r.registration_deadline,
    capacity: r.capacity,
    status: r.status,
    booked: r.booked,
    filed: r.filed,
    offered: r.offered,
    waiting: r.waiting,
    openRegistrations: r.open_registrations,
    withResult: r.with_result,
    examiners: r.examiners,
    preparations: r.preparations,
  }));
}

/** How many sittings each view holds under the same filters: the tabs' counts. */
export async function examViewCounts(filters: ExamListFilters): Promise<Record<ExamView, number>> {
  const { where, params } = filterSql(filters);
  const row = await queryFirst<Record<ExamView, number>>(
    `${FACTS} SELECT ${EXAM_VIEWS.map((v) => `count(*) FILTER (WHERE ${VIEW_WHERE[v]})::int AS ${v}`).join(', ')}
       FROM f ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`,
    params
  );
  return row ?? { upcoming: 0, drafts: 0, results: 0, past: 0, cancelled: 0, all: 0 };
}

/**
 * The line above the list, what its tabs do not say: how many are booked into the sittings ahead, and the
 * next deadline still to come (a telc entry cannot be filed after it). Drafts and cancelled left out.
 */
export async function examAhead(): Promise<{ booked: number; nextDeadline: string | null }> {
  const row = await queryFirst<{ booked: number; next_deadline: string | null }>(
    `${FACTS}
     SELECT coalesce(sum(f.booked), 0)::int AS booked,
            to_char(min(f.registration_deadline) FILTER (WHERE f.registration_deadline >= (SELECT d FROM today)), 'YYYY-MM-DD') AS next_deadline
       FROM f WHERE ${VIEW_WHERE.upcoming}`
  );
  return { booked: row?.booked ?? 0, nextDeadline: row?.next_deadline ?? null };
}

/** What the filters offer: the exams, the months with a sitting, who examines any sitting. */
export async function examFilterChoices(): Promise<{
  exams: { id: string; name: string }[];
  months: string[];
  examiners: { id: string; name: string }[];
}> {
  const [exams, months, examiners] = await Promise.all([
    query<{ id: string; name: string }>(
      `SELECT e.id, e.name FROM exam_types e WHERE EXISTS (SELECT 1 FROM exam_sessions s WHERE s.exam_type_id = e.id) ORDER BY e.name`
    ),
    query<{ month: string }>(`SELECT DISTINCT to_char(starts_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM') AS month FROM exam_sessions ORDER BY 1 DESC`),
    query<{ id: string; name: string }>(
      `SELECT DISTINCT m.id, concat_ws(' ', p.first_name, p.last_name) AS name, p.last_name, p.first_name
         FROM exam_session_examiners x JOIN staff_members m ON m.id = x.staff_member_id JOIN people p ON p.id = m.person_id
        ORDER BY p.last_name, p.first_name`
    ),
  ]);
  return { exams, months: months.map((m) => m.month), examiners: examiners.map((x) => ({ id: x.id, name: x.name })) };
}
