import type { PoolClient } from 'pg';
import { query, queryFirst, withTransaction } from './db';
import type { StaffUser } from './auth';
import { logActivity } from './activity';
import { countryCodeFromName, normalizeEmail, normalizePhone, parseIsoDate } from './normalize';
import { displayName } from './normalize';
import type { Bilingual, WsLang } from './i18n';
import { isUuid } from './ids';
import { courseSessionSql } from './course-session';
import { isSession, type Session } from './day-plan-labels';
import { OPEN_FROM, owesSql } from './open-money';

/**
 * People — one row per human, from first contact.
 *
 * The rule this module enforces, and the one FileMaker never had
 * (docs/FILEMAKER_LESSONS.md §1): identity is decided once, by a person, and
 * recorded. Intake creates a row for every submission and RAISES a flag when
 * it looks like someone we already have; a staff member then LINKS the new row
 * to the existing one. Nothing is merged by a script, nothing is deleted, and
 * every row keeps the history it arrived with — `canonical_person_id()` does
 * the following-through at read time.
 */

export type PersonSummary = {
  id: string;
  /** The surviving row after following `merged_into`. Equals `id` unless linked. */
  canonicalId: string;
  salutation: string | null;
  firstName: string;
  lastName: string | null;
  displayName: string;
  birthDate: Date | null;
  nationalityCode: string | null;
  nationalityName: string | null;
  nationalityRaw: string | null;
  mergedInto: string | null;
  createdBy: string;
  /** `createdBy` as a person or a place, never `staff:<uuid>`; read with `pick(lang, …)`. */
  createdByLabel: Bilingual;
  createdAt: Date;
  /** On the register, Teilnehmende (0076): false for a website contact no colleague has acted on yet. */
  listed: boolean;
};

/** Everything else SchoolMan knows about a learner (migration 0029); some of it telc asks for. */
export type PersonFacts = {
  secondLastName: string | null;
  nickname: string | null;
  birthYear: number | null;
  birthPlace: string | null;
  birthCountryCode: string | null;
  birthCountryName: string | null;
  motherTongue: string | null;
  occupation: string | null;
  passportNumber: string | null;
  /** SchoolMan's customer number (0061), read only. */
  customerNumber: string | null;
};

/** Where a person lives: at home, and in Bremen while here. */
export type AddressKind = 'home' | 'local';
export type Address = {
  kind: AddressKind;
  street: string | null;
  postcode: string | null;
  city: string | null;
  countryCode: string | null;
  countryName: string | null;
};

export type PersonDetail = PersonSummary & {
  facts: PersonFacts;
  addresses: Address[];
  /** With SchoolMan's note on an address (0092). */
  emails: { address: string; isPrimary: boolean; note: string | null }[];
  phones: { number: string; isPrimary: boolean }[];
  /** Rows linked INTO this one (duplicates that were resolved to it). */
  linkedDuplicates: PersonSummary[];
};

type Row = {
  id: string;
  canonical_id: string;
  salutation: string | null;
  first_name: string;
  last_name: string | null;
  birth_date: Date | null;
  nationality_code: string | null;
  nationality_name: string | null;
  nationality_raw: string | null;
  merged_into: string | null;
  created_by: string;
  created_by_name: string | null;
  created_at: Date;
  listed?: boolean | null;
};

const SELECT = `
  SELECT p.id,
         canonical_person_id(p.id) AS canonical_id,
         p.salutation::text AS salutation,
         p.first_name, p.last_name, p.birth_date,
         p.nationality_code, coalesce(c.name_de, c.name_en) AS nationality_name, p.nationality_raw,
         p.merged_into, p.created_by, p.created_at,
         (SELECT c2.listed FROM people c2 WHERE c2.id = canonical_person_id(p.id)) AS listed,
         cu.name AS created_by_name
    FROM people p
    LEFT JOIN countries c ON c.code = p.nationality_code
    LEFT JOIN staff_users cu
      ON left(p.created_by, 6) = 'staff:'
     AND cu.id::text = substr(p.created_by, 7)
`;

const toSummary = (r: Row): PersonSummary => ({
  id: r.id,
  canonicalId: r.canonical_id,
  salutation: r.salutation,
  firstName: r.first_name,
  lastName: r.last_name,
  displayName: displayName(r.first_name, r.last_name),
  birthDate: r.birth_date,
  nationalityCode: r.nationality_code,
  nationalityName: r.nationality_name,
  nationalityRaw: r.nationality_raw,
  mergedInto: r.merged_into,
  createdBy: r.created_by,
  createdByLabel: r.created_by_name
    ? { de: r.created_by_name, en: r.created_by_name }
    : describeOrigin(r.created_by),
  createdAt: r.created_at,
  listed: r.listed !== false,
});

/**
 * Where a record came from, in words. `created_by` is a text column because
 * the origin is not always a person: the public site, a demo seed and a
 * migration all create people.
 */
function describeOrigin(createdBy: string): Bilingual {
  if (createdBy === 'public-site') return { de: 'Die Website', en: 'The website' };
  if (createdBy === 'demo-seed') return { de: 'Demodaten', en: 'Demo data' };
  if (createdBy.startsWith('migration-')) return { de: 'Importiert', en: 'Imported' };
  if (createdBy.startsWith('staff:')) return { de: 'jemandem aus dem Team', en: 'A colleague' };
  return { de: createdBy, en: createdBy };
}

export async function getPersonSummary(id: string): Promise<PersonSummary | null> {
  const row = await queryFirst<Row>(`${SELECT} WHERE p.id = $1 AND p.deleted_at IS NULL`, [id]);
  return row ? toSummary(row) : null;
}

/** The canonical person for an id, with channels and anything linked into it. */
export async function getPerson(id: string, client?: PoolClient): Promise<PersonDetail | null> {
  if (!isUuid(id)) return null;
  const row = await queryFirst<Row>(
    `${SELECT} WHERE p.id = canonical_person_id($1) AND p.deleted_at IS NULL`,
    [id], client
  );
  if (!row) return null;

  // Channels come from the whole cluster: a duplicate that was linked may have
  // arrived with a second address, and that address is still this person's.
  const [facts, addresses, emails, phones, dups] = await Promise.all([
    queryFirst<{
      second_last_name: string | null;
      nickname: string | null;
      birth_year: number | null;
      birth_place: string | null;
      birth_country_code: string | null;
      birth_country_name: string | null;
      mother_tongue: string | null;
      occupation: string | null;
      passport_number: string | null;
      customer_number: string | null;
    }>(
      `SELECT p.second_last_name, p.nickname, p.birth_year, p.birth_place, p.birth_country_code,
              coalesce(c.name_de, c.name_en) AS birth_country_name, p.mother_tongue, p.occupation, p.passport_number, p.customer_number
         FROM people p LEFT JOIN countries c ON c.code = p.birth_country_code WHERE p.id = $1`,
      [row.id], client
    ),
    query<{ kind: AddressKind; street: string | null; postcode: string | null; city: string | null; country_code: string | null; country_name: string | null }>(
      `SELECT a.kind, a.street, a.postcode, a.city, a.country_code, coalesce(c.name_de, c.name_en) AS country_name
         FROM addresses a LEFT JOIN countries c ON c.code = a.country_code
        WHERE a.person_id = $1 ORDER BY a.kind = 'local' DESC`,
      [row.id], client
    ),
    query<{ address: string; is_primary: boolean; note: string | null }>(
      `SELECT DISTINCT ON (e.normalized) e.address, e.is_primary, e.note
         FROM emails e
        WHERE e.person_id = ANY(person_family($1))
        ORDER BY e.normalized, e.is_primary DESC, e.created_at`,
      [row.id], client
    ),
    query<{ number: string; is_primary: boolean }>(
      `SELECT DISTINCT ON (ph.normalized) ph.number, ph.is_primary
         FROM phones ph
        WHERE ph.person_id = ANY(person_family($1))
        ORDER BY ph.normalized, ph.is_primary DESC, ph.created_at`,
      [row.id], client
    ),
    query<Row>(
      `${SELECT} WHERE p.id <> $1 AND p.id = ANY(person_family($1)) ORDER BY p.created_at`,
      [row.id], client
    ),
  ]);

  return {
    ...toSummary(row),
    facts: {
      secondLastName: facts?.second_last_name ?? null,
      nickname: facts?.nickname ?? null,
      birthYear: facts?.birth_year ?? null,
      birthPlace: facts?.birth_place ?? null,
      birthCountryCode: facts?.birth_country_code ?? null,
      birthCountryName: facts?.birth_country_name ?? null,
      motherTongue: facts?.mother_tongue ?? null,
      occupation: facts?.occupation ?? null,
      passportNumber: facts?.passport_number ?? null,
      customerNumber: facts?.customer_number ?? null,
    },
    addresses: addresses.map((a) => ({
      kind: a.kind,
      street: a.street,
      postcode: a.postcode,
      city: a.city,
      countryCode: a.country_code,
      countryName: a.country_name,
    })),
    emails: emails.map((e) => ({
      address: e.address,
      isPrimary: e.is_primary,
      note: e.note,
    })),
    phones: phones.map((p) => ({ number: p.number, isPrimary: p.is_primary })),
    linkedDuplicates: dups.map(toSummary),
  };
}

/**
 * Where a learner stands, worked out from their booked periods — FileMaker's Rookie, Runner,
 * LastDance and Unicorn, which a colleague typed (docs/schoolman/bookings.md):
 * new (in their first course, started in the last four weeks), in a course, in their last course
 * (nothing booked after it — the one to ask about extending), coming (booked, not started) and
 * finished (all over, nothing to come). Someone who has only enquired has no stage.
 */
export type LearnerStage = 'new' | 'in_course' | 'last' | 'coming' | 'finished';
export const LEARNER_STAGE_LABELS: Record<LearnerStage, Bilingual> = {
  new: { de: 'Neu', en: 'New' },
  in_course: { de: 'Im Kurs', en: 'In a course' },
  last: { de: 'Ohne Folgekurs', en: 'No next course' },
  coming: { de: 'Kommend', en: 'Coming' },
  finished: { de: 'Abgeschlossen', en: 'Finished' },
};
/** How long a learner counts as new after their first course starts. */
const NEW_FOR_DAYS = 28;

/**
 * The register's views (2026-10-18), each one question the office asks: who is coming, who is here (everyone in
 * a course today, new or not), who is here with nothing booked after — to ask whether they go on —, who still
 * owes money, who has finished. „Neu" is a word on the row, not a view. What is open under a person is a
 * column: the inboxes are where it is worked.
 */
export type PeopleView = 'all' | 'coming' | 'in_course' | 'last' | 'owing' | 'finished';

/**
 * A person's family — themselves and every row merged into them (`person_family`, 0052): the fragments
 * below match a booking, a case or a payment on `x.person_id = ANY(FAMILY)`, which uses the index on
 * `person_id`. Nearly nobody has a row merged into them, so an index lookup answers first and the
 * function runs only for those who do (a third of the time of calling it for everyone).
 */
const FAMILY = `(CASE WHEN EXISTS (SELECT 1 FROM people m WHERE m.merged_into = p.id) THEN person_family(p.id) ELSE ARRAY[p.id] END)`;

/** Open cases under a person (theirs and the rows linked into them): enquiries, registrations, offers in play. */
const OPEN_CASES = `(
  (SELECT count(*) FROM enquiries e WHERE e.person_id IS NOT NULL AND e.person_id = ANY(${FAMILY}) AND e.deleted_at IS NULL AND e.status IN ('new', 'in_progress', 'waiting'))
  + (SELECT count(*) FROM registrations g WHERE g.person_id IS NOT NULL AND g.person_id = ANY(${FAMILY}) AND g.status IN ('new', 'in_progress', 'waiting'))
  + (SELECT count(*) FROM offers o WHERE o.deleted_at IS NULL AND o.person_id IS NOT NULL AND o.person_id = ANY(${FAMILY}) AND o.status IN ('draft', 'sent'))
)`;

/**
 * What their bookings still owe, read once per person (2026-10-21, the register at ~3,000 people): each
 * booking's balance, summed where it owes by the rule (under 5 € is paid, `open-money.ts`). Joined as
 * `ow`; `ow.owed` is the figure.
 */
const OWED_JOIN = `LEFT JOIN LATERAL (
  SELECT coalesce(sum(o.balance) FILTER (WHERE ${owesSql('o.balance')}), 0) AS owed FROM (
    SELECT coalesce((SELECT sum(c.amount) FROM booking_charges c WHERE c.booking_id = b.id), 0)
         - coalesce((SELECT sum(pm.amount) FROM payments pm WHERE pm.booking_id = b.id AND pm.voided_at IS NULL), 0) AS balance
      FROM bookings b
     WHERE b.deleted_at IS NULL AND b.status <> 'cancelled' AND b.person_id = ANY(${FAMILY})
  ) o
) ow ON true`;

/**
 * Where a person stands, from their bookings read once (2026-10-21; it was six sub-queries a person, and the
 * register's counts took a second once 2024 and 2025 came across). Joined as `cf`:
 * - `in_course`: a booking that is not cancelled with a period running now;
 * - `later`: a period of an open booking that starts after today — something still to come;
 * - `first_start`: the first day of their first course that was not cancelled;
 * - `had_course`: a period that has ended, of a booking that was not cancelled.
 */
const COURSE_FLAGS = `LEFT JOIN LATERAL (
  SELECT bool_or(b.status IN ('reserved', 'confirmed') AND bp.start_date <= current_date AND bp.end_date >= current_date) AS in_course,
         bool_or(b.status IN ('reserved', 'confirmed') AND bp.start_date > current_date) AS later,
         min(bp.start_date) FILTER (WHERE b.status <> 'cancelled') AS first_start,
         bool_or(b.status <> 'cancelled' AND bp.end_date < current_date) AS had_course
    FROM bookings b JOIN booking_periods bp ON bp.booking_id = b.id
   WHERE b.deleted_at IS NULL AND b.person_id = ANY(${FAMILY})
) cf ON true`;

const IN_COURSE = `coalesce(cf.in_course, false)`;
const LATER = `coalesce(cf.later, false)`;

const STAGE = `(CASE
  WHEN ${IN_COURSE} AND cf.first_start >= current_date - ${NEW_FOR_DAYS} THEN 'new'
  WHEN ${IN_COURSE} AND NOT ${LATER} THEN 'last'
  WHEN ${IN_COURSE} THEN 'in_course'
  WHEN ${LATER} THEN 'coming'
  WHEN coalesce(cf.had_course, false) THEN 'finished'
END)`;

/** Where one person stands, for the head of their page. */
export async function learnerStage(personId: string): Promise<LearnerStage | null> {
  const row = await queryFirst<{ stage: LearnerStage | null }>(`SELECT ${STAGE} AS stage FROM people p ${COURSE_FLAGS} WHERE p.id = $1`, [personId]);
  return row?.stage ?? null;
}

/** Colleagues are on the staff register (0039), not among the learners. */
const NOT_STAFF = `NOT EXISTS (SELECT 1 FROM staff_members sm WHERE sm.person_id = p.id)`;

const VIEW_CONDITION: Record<PeopleView, string | null> = {
  all: null,
  // Everyone in a course today, new or not; and of them, who has nothing booked after it.
  in_course: IN_COURSE,
  last: `${IN_COURSE} AND NOT ${LATER}`,
  coming: `${STAGE} = 'coming'`,
  finished: `${STAGE} = 'finished'`,
  owing: `ow.owed > 0`,
};

/** What a view's condition reads: the stage's bookings, the money, or nothing. */
const VIEW_JOINS: Record<PeopleView, string> = {
  all: '',
  in_course: COURSE_FLAGS,
  last: COURSE_FLAGS,
  coming: COURSE_FLAGS,
  finished: COURSE_FLAGS,
  owing: OWED_JOIN,
};

/** Each view in the order its question asks: who arrives first, who leaves first, who owes most; else the newest. */
const VIEW_ORDER: Record<PeopleView, string> = {
  all: 'p.created_at DESC, p.id',
  coming: 'course_start NULLS LAST, p.id',
  in_course: 'p.created_at DESC, p.id',
  last: 'course_end NULLS LAST, p.id',
  owing: 'owed DESC, p.id',
  finished: 'p.created_at DESC, p.id',
};

/** How many people each view holds, for the counts beside its tabs. */
export async function peopleCounts(): Promise<Record<PeopleView, number>> {
  const row = await queryFirst<Record<PeopleView, string>>(
    `SELECT count(*) AS all,
            count(*) FILTER (WHERE stage IN ('new', 'in_course', 'last')) AS in_course,
            count(*) FILTER (WHERE stage IN ('new', 'in_course', 'last') AND NOT later) AS last,
            count(*) FILTER (WHERE stage = 'coming') AS coming,
            count(*) FILTER (WHERE stage = 'finished') AS finished,
            count(*) FILTER (WHERE owed > 0) AS owing
       -- OFFSET 0: the stage and the money once per person, not again in each count below.
       FROM (SELECT ${STAGE} AS stage, ${LATER} AS later, ow.owed FROM people p ${COURSE_FLAGS} ${OWED_JOIN}
              WHERE p.merged_into IS NULL AND p.deleted_at IS NULL AND p.listed AND ${NOT_STAFF} OFFSET 0) p`
  );
  const n = (key: PeopleView) => Number(row?.[key] ?? 0);
  return {
    all: n('all'),
    in_course: n('in_course'),
    last: n('last'),
    coming: n('coming'),
    finished: n('finished'),
    owing: n('owing'),
  };
}

export async function listPeople({
  search,
  view = 'all',
  limit = 40,
  offset = 0,
}: {
  search?: string;
  view?: PeopleView;
  limit?: number;
  offset?: number;
}): Promise<{
  items: (PersonSummary & {
    primaryEmail: string | null;
    /** The booking running now or starting next, for the register's line under a name and its dates. */
    course: { name: string | null; start: Date; end: Date; current: boolean; session: Session | null } | null;
    /** The level a teacher confirmed last. */
    level: string | null;
    /** Enquiries, registrations and offers still in play. */
    openCases: number;
    /** Still owed across their bookings. */
    owed: number;
    /** The booking that owes the most, where a reminder is written from the list (2026-10-21). */
    owedBookingId: string | null;
    /** Where they stand as a learner; null for someone who has only enquired. */
    stage: LearnerStage | null;
  })[];
  total: number;
}> {
  const params: unknown[] = [];
  // Only those a colleague has acted on: a website contact is off the register until then (0076).
  let where = `WHERE p.merged_into IS NULL AND p.deleted_at IS NULL AND p.listed AND ${NOT_STAFF}`;
  if (search) {
    // A whole name either way round („Vorname Nachname"), or an address of theirs or of a record linked into them.
    params.push(`%${search.trim().slice(0, 80).replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    where += ` AND (concat_ws(' ', p.first_name, p.last_name) ILIKE $1 OR concat_ws(' ', p.last_name, p.first_name) ILIKE $1 OR EXISTS (
      SELECT 1 FROM emails e WHERE e.person_id = ANY(${FAMILY}) AND e.address ILIKE $1))`;
  }
  const condition = VIEW_CONDITION[view];
  if (condition) where += ` AND ${condition}`;
  const total = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM people p ${VIEW_JOINS[view]} ${where}`,
    params
  );
  // The course under a name: the earliest open booking that has not ended, so
  // a learner here now shows that course, and one who is coming shows the next.
  const rows = await query<
    Row & {
      primary_email: string | null;
      course_name: string | null;
      course_start: Date | null;
      course_end: Date | null;
      course_session: string | null;
      level: string | null;
      open_cases: string;
      owed: string;
      owed_booking_id: string | null;
      stage: LearnerStage | null;
    }
  >(
    `${SELECT.replace(
      'FROM people p',
      `, person_email(p.id) AS primary_email,
         nb.course_name, nb.course_start, nb.course_end, nb.course_session,
         -- The level a teacher confirmed last, else the one of the course they sit in (or start next).
         coalesce((SELECT coalesce(rv.confirmed_level_code, rv.confirmed_level) FROM placement_reviews rv
                    WHERE rv.person_id IS NOT NULL AND rv.person_id = ANY(${FAMILY}) ORDER BY rv.decided_at DESC LIMIT 1),
                  nb.course_level) AS level,
         ${OPEN_CASES} AS open_cases,
         ow.owed AS owed,
         (SELECT b.id FROM bookings b
           WHERE b.person_id = ANY(${FAMILY}) AND b.deleted_at IS NULL AND b.status <> 'cancelled'
             AND coalesce((SELECT sum(c.amount) FROM booking_charges c WHERE c.booking_id = b.id), 0)
               - coalesce((SELECT sum(pm.amount) FROM payments pm WHERE pm.booking_id = b.id AND pm.voided_at IS NULL), 0) >= ${OPEN_FROM}
           ORDER BY coalesce((SELECT sum(c.amount) FROM booking_charges c WHERE c.booking_id = b.id), 0)
                  - coalesce((SELECT sum(pm.amount) FROM payments pm WHERE pm.booking_id = b.id AND pm.voided_at IS NULL), 0) DESC
           LIMIT 1) AS owed_booking_id,
         ${STAGE} AS stage
    FROM people p
    LEFT JOIN LATERAL (
      SELECT coalesce(nullif(trim(t.name_de), ''), t.name) AS course_name, min(bp.start_date) AS course_start, max(bp.end_date) AS course_end,
             -- The step of the period running now, else of the first one ahead.
             coalesce((array_agg(bp.level_code ORDER BY bp.start_date DESC) FILTER (WHERE bp.level_code IS NOT NULL AND bp.start_date <= current_date))[1],
                      (array_agg(bp.level_code ORDER BY bp.start_date) FILTER (WHERE bp.level_code IS NOT NULL))[1]) AS course_level,
             -- The part of the day of the period running now, else of the first one ahead (2026-10-21).
             coalesce((array_agg(${courseSessionSql('bp.course_id', 'bp.course_instance_id', 'b.course_type_id')} ORDER BY bp.start_date DESC) FILTER (WHERE bp.start_date <= current_date))[1],
                      (array_agg(${courseSessionSql('bp.course_id', 'bp.course_instance_id', 'b.course_type_id')} ORDER BY bp.start_date))[1]) AS course_session
        FROM bookings b
        JOIN booking_periods bp ON bp.booking_id = b.id
        LEFT JOIN course_types t ON t.id = b.course_type_id
       WHERE b.person_id = ANY(${FAMILY})
         AND b.deleted_at IS NULL
         AND b.status IN ('reserved', 'confirmed')
       GROUP BY b.id, t.name, t.name_de
      HAVING max(bp.end_date) >= current_date
       ORDER BY min(bp.start_date)
       LIMIT 1
    ) nb ON true
    ${COURSE_FLAGS}
    ${OWED_JOIN}`
    )}
     ${where}
     ORDER BY ${VIEW_ORDER[view]}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return {
    total: Number(total?.n ?? 0),
    items: rows.map((r) => ({
      ...toSummary(r),
      primaryEmail: r.primary_email,
      level: r.level,
      openCases: Number(r.open_cases ?? 0),
      owed: Number(r.owed ?? 0),
      owedBookingId: r.owed_booking_id,
      stage: r.stage,
      course:
        r.course_start && r.course_end
          ? {
              name: r.course_name,
              start: r.course_start,
              end: r.course_end,
              current: new Date(r.course_start).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0),
              session: isSession(r.course_session) ? r.course_session : null,
            }
          : null,
    })),
  };
}

export type TimelineItem = {
  kind: 'enquiry' | 'course' | 'exam' | 'review';
  id: string;
  title: string;
  detail: string | null;
  status: string | null;
  at: Date;
  href: string;
};

/** Everything that ever came in under this person or a row linked to them, titled in `lang`. */
export async function personTimeline(canonicalId: string, lang: WsLang): Promise<TimelineItem[]> {
  const rows = await query<{
    kind: TimelineItem['kind'];
    id: string;
    title: string | null;
    detail: string | null;
    status: string | null;
    at: Date;
    lines: number | null;
  }>(
    `SELECT kind, id, title, detail, status, at, lines FROM (
       SELECT 'enquiry'::text AS kind, e.id, e.topic AS title,
              left(e.message, 140) AS detail, e.status::text, e.submitted_at AS at, NULL::int AS lines
         FROM enquiries e WHERE e.person_id = ANY(person_family($1)) AND e.deleted_at IS NULL
       UNION ALL
       -- An Anmeldung (0097) once, named by its first line, with how many lines it holds.
       SELECT CASE WHEN l.rank = 0 THEN 'course' ELSE 'exam' END, g.id, l.label, l.option, g.status::text, g.submitted_at,
              ((SELECT count(*) FROM course_registrations WHERE registration_id = g.id)
               + (SELECT count(*) FROM exam_registrations WHERE registration_id = g.id))::int
         FROM registrations g
         CROSS JOIN LATERAL (
           SELECT course_type_label AS label, course_instance_label AS option, 0 AS rank FROM course_registrations WHERE registration_id = g.id
           UNION ALL
           SELECT exam_type_label, exam_session_label, 1 FROM exam_registrations WHERE registration_id = g.id
           ORDER BY rank LIMIT 1
         ) l
        WHERE g.person_id = ANY(person_family($1))
       UNION ALL
       SELECT 'review', rv.attempt_id, rv.confirmed_level,
              rv.note, NULL, rv.decided_at, NULL
         FROM placement_reviews rv WHERE rv.person_id = ANY(person_family($1))
     ) t ORDER BY at DESC`,
    [canonicalId]
  );
  const href: Record<TimelineItem['kind'], string> = {
    enquiry: '/admin/enquiries',
    course: '/admin/registrations',
    exam: '/admin/registrations',
    review: '/admin/placement',
  };
  const en = lang === 'en';
  // The words around a stored value, in the reader's language; the value itself as stored.
  const title = (r: (typeof rows)[number]): string => {
    if (r.kind === 'course') return r.title ?? (en ? 'Course registration' : 'Kursanmeldung');
    if (r.kind === 'exam') return r.title ?? (en ? 'Exam registration' : 'Prüfungsanmeldung');
    if (r.kind === 'review') return `${en ? 'Placement confirmed' : 'Einstufung bestätigt:'} ${r.title ?? ''}`.trim();
    return r.title ?? '';
  };
  // An Anmeldung of several lines says so where a single one names its dates.
  const detail = (r: (typeof rows)[number]): string | null =>
    r.lines && r.lines > 1 ? (en ? `${r.lines} lines in one registration` : `${r.lines} Positionen in einer Anmeldung`) : r.detail;
  return rows.map(({ lines: _lines, ...r }) => ({ ...r, title: title({ ...r, lines: _lines }), detail: detail({ ...r, lines: _lines }), href: `${href[r.kind]}/${r.id}` }));
}

/**
 * Other canonical people who share an address, or a surname and date of birth,
 * with the given facts. What intake uses to decide whether to raise
 * `duplicate_candidate`, and what the record rail shows a staff member.
 */
export async function findDuplicateCandidates({
  email,
  lastName,
  birthDate,
  excludePersonId,
}: {
  email?: string | null;
  lastName?: string | null;
  birthDate?: string | null;
  excludePersonId?: string | null;
}): Promise<(PersonSummary & { reason: 'email' | 'name_and_birth_date' })[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (email) {
    params.push(email.trim().toLowerCase());
    conditions.push(
      `EXISTS (SELECT 1 FROM emails e WHERE e.person_id = ANY(person_family(p.id)) AND e.normalized = $${params.length})`
    );
  }
  if (lastName && birthDate) {
    params.push(lastName.trim().toLowerCase(), birthDate);
    conditions.push(
      `(lower(p.last_name) = $${params.length - 1} AND p.birth_date = $${params.length}::date)`
    );
  }
  if (conditions.length === 0) return [];

  params.push(excludePersonId ?? '00000000-0000-0000-0000-000000000000');
  const rows = await query<Row & { by_email: boolean }>(
    `${SELECT.replace(
      'FROM people p',
      `, ${email ? `EXISTS (SELECT 1 FROM emails e WHERE e.person_id = ANY(person_family(p.id)) AND e.normalized = $1)` : 'false'} AS by_email FROM people p`
    )}
     WHERE p.merged_into IS NULL AND p.deleted_at IS NULL
       AND p.id <> canonical_person_id($${params.length}::uuid)
       AND (${conditions.join(' OR ')})
     ORDER BY p.created_at
     LIMIT 10`,
    params
  );
  return rows.map((r) => ({
    ...toSummary(r),
    reason: r.by_email ? ('email' as const) : ('name_and_birth_date' as const),
  }));
}

/**
 * Records that `duplicate` is the same human as `survivor`.
 *
 * Sets `merged_into` and nothing else: no row is rewritten, no history is
 * moved. The one check that must never be skipped is the cycle — a survivor
 * whose own chain leads back to the duplicate would make both rows vanish from
 * every canonical read.
 */
export async function linkPerson({
  duplicateId,
  survivorId,
  actor,
}: {
  duplicateId: string;
  survivorId: string;
  actor: StaffUser;
}): Promise<{ ok: true } | { ok: false; reason: Bilingual }> {
  if (duplicateId === survivorId)
    return { ok: false, reason: { de: 'Das ist derselbe Datensatz.', en: 'That is the same record.' } };

  return withTransaction(async (client) => {
    const { rows } = await client.query<{
      canonical: string;
      already: string | null;
    }>(
      `SELECT canonical_person_id($2) AS canonical, (SELECT merged_into FROM people WHERE id = $1) AS already`,
      [duplicateId, survivorId]
    );
    const canonical = rows[0]?.canonical;
    if (!canonical)
      return {
        ok: false,
        reason: { de: 'Den verbleibenden Datensatz gibt es nicht mehr.', en: 'The surviving record no longer exists.' },
      };
    if (canonical === duplicateId) {
      return {
        ok: false,
        reason: {
          de: 'Diese beiden Datensätze verweisen schon aufeinander.',
          en: 'Those two records already point at each other.',
        },
      };
    }
    if (rows[0].already)
      return { ok: false, reason: { de: 'Dieser Datensatz ist schon verknüpft.', en: 'This record is already linked.' } };

    await client.query(`UPDATE people SET merged_into = $2 WHERE id = $1`, [
      duplicateId,
      canonical,
    ]);
    // One of the two on the register puts the one that remains there (0076).
    await client.query(`UPDATE people SET listed = true WHERE id = $2 AND NOT listed AND (SELECT listed FROM people WHERE id = $1)`, [
      duplicateId,
      canonical,
    ]);

    // The flags that asked the question are answered by this action.
    await client.query(
      `UPDATE record_flags f SET resolved_at = now(), resolved_by = $2
        WHERE f.code = 'duplicate_candidate' AND f.resolved_at IS NULL
          AND ((f.entity = 'person' AND f.entity_id = $1)
            OR (f.entity = 'enquiry' AND f.entity_id IN (SELECT id FROM enquiries WHERE person_id = $1))
            OR (f.entity = 'course_registration' AND f.entity_id IN (SELECT id FROM course_registrations WHERE person_id = $1))
            OR (f.entity = 'exam_registration' AND f.entity_id IN (SELECT id FROM exam_registrations WHERE person_id = $1)))`,
      // Only what the statement reads: an unused parameter is one Postgres cannot type, and refuses.
      [duplicateId, actor.id]
    );
    await client.query(
      `INSERT INTO staff_activity (staff_user_id, staff_name, entity, entity_id, action, detail)
       VALUES ($1, $2, 'person', $3, 'person_linked', $4)`,
      [actor.id, actor.name, duplicateId, JSON.stringify({ survivor: canonical })]
    );
    return { ok: true };
  });
}

/**
 * Puts a person on the register, Teilnehmende (0076): „Als Teilnehmende/n anlegen" on an enquiry or a
 * registration, for a future learner who is not yet booked.
 */
export async function listPerson({ personId, actor }: { personId: string; actor: StaffUser }): Promise<void> {
  await withTransaction(async (client) => {
    const { rowCount } = await client.query(`UPDATE people SET listed = true WHERE id = canonical_person_id($1) AND NOT listed`, [personId]);
    if (rowCount) {
      await client.query(
        `INSERT INTO staff_activity (staff_user_id, staff_name, entity, entity_id, action, detail) VALUES ($1, $2, 'person', $3, 'person_listed', '{}')`,
        [actor.id, actor.name, personId]
      );
    }
  });
}

/** Reverses a link. The rows were never merged, so there is nothing to split. */
export async function unlinkPerson({
  personId,
  actor,
}: {
  personId: string;
  actor: StaffUser;
}): Promise<void> {
  await query(`UPDATE people SET merged_into = NULL WHERE id = $1`, [personId]);
  await query(
    `INSERT INTO staff_activity (staff_user_id, staff_name, entity, entity_id, action)
     VALUES ($1, $2, 'person', $3, 'person_unlinked')`,
    [actor.id, actor.name, personId]
  );
}

/** Confirmed level from the newest placement review attached to this person. */
export async function latestConfirmedLevel(canonicalId: string): Promise<{
  level: string;
  decidedAt: Date;
  reviewerName: string | null;
} | null> {
  const row = await queryFirst<{
    level: string;
    decided_at: Date;
    reviewer: string | null;
  }>(
    `SELECT coalesce(rv.confirmed_level_code, rv.confirmed_level) AS level, rv.decided_at,
            u.name AS reviewer
       FROM placement_reviews rv
       LEFT JOIN staff_users u ON u.id = rv.reviewed_by
      WHERE rv.person_id = ANY(person_family($1))
      ORDER BY rv.decided_at DESC LIMIT 1`,
    [canonicalId]
  );
  return row
    ? {
        level: row.level,
        decidedAt: row.decided_at,
        reviewerName: row.reviewer,
      }
    : null;
}

// ------------------------------------------------------------------- CRUD

export type PersonInput = {
  salutation: string | null;
  firstName: string;
  lastName: string | null;
  birthDate: string | null;
  nationality: string | null;
  email: string | null;
  phone: string | null;
  /** On edit only; a new person is created with the essentials. */
  facts?: {
    secondLastName: string | null;
    nickname: string | null;
    birthYear: number | null;
    birthPlace: string | null;
    birthCountry: string | null;
    motherTongue: string | null;
    occupation: string | null;
    passportNumber: string | null;
  };
};

export type AddressInput = { street: string | null; postcode: string | null; city: string | null; country: string | null };

/** A country as the workspace names it: German, the team's language, like the other vocabularies. */
export type Country = { code: string; name: string };

export async function listCountries(): Promise<Country[]> {
  const rows = await query<{ code: string; name: string }>(
    `SELECT code, coalesce(name_de, name_en) AS name FROM countries ORDER BY 2`
  );
  return rows.map((r) => ({ code: r.code, name: r.name }));
}

/**
 * A person created by a staff member. Typed values are resolved exactly as
 * intake resolves them; a nationality that does not match stays as written.
 */
export async function createPersonByStaff(input: PersonInput, actor: StaffUser): Promise<string> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO people (salutation, first_name, last_name, birth_date, nationality_code, nationality_raw, created_by)
       VALUES ($1::salutation, $2, $3, $4::date, $5, $6, $7)
       RETURNING id`,
      [
        input.salutation || null,
        input.firstName.trim(),
        input.lastName?.trim() || null,
        parseIsoDate(input.birthDate),
        countryCodeFromName(input.nationality),
        input.nationality?.trim() || null,
        `staff:${actor.id}`,
      ]
    );
    const id = rows[0].id;
    if (input.email?.trim()) {
      await client.query(
        `INSERT INTO emails (person_id, address, normalized) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [id, input.email.trim(), normalizeEmail(input.email)]
      );
    }
    if (input.phone?.trim()) {
      await client.query(
        `INSERT INTO phones (person_id, number, normalized) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [id, input.phone.trim(), normalizePhone(input.phone)]
      );
    }
    await client.query(
      `INSERT INTO staff_activity (staff_user_id, staff_name, entity, entity_id, action)
       VALUES ($1, $2, 'person', $3, 'person_created')`,
      [actor.id, actor.name, id]
    );
    return id;
  });
}

/**
 * Edits the person's own facts. Email and phone given here become the primary
 * channel; earlier ones are kept, since a registration may still carry them.
 */
export async function updatePerson(
  id: string,
  input: PersonInput,
  actor: StaffUser,
  client?: PoolClient
): Promise<void> {
  const work = async (client: PoolClient) => {
    await client.query(
      `UPDATE people
          SET salutation = $2::salutation, first_name = $3, last_name = $4, birth_date = $5::date,
              nationality_code = $6, nationality_raw = $7
        WHERE id = $1 AND deleted_at IS NULL`,
      [
        id,
        input.salutation || null,
        input.firstName.trim(),
        input.lastName?.trim() || null,
        parseIsoDate(input.birthDate),
        countryCodeFromName(input.nationality),
        input.nationality?.trim() || null,
      ]
    );
    if (input.facts) {
      const f = input.facts;
      await client.query(
        `UPDATE people
            SET second_last_name = $2, nickname = $3, birth_year = $4, birth_place = $5,
                birth_country_code = $6, mother_tongue = $7, occupation = $8, passport_number = $9
          WHERE id = $1`,
        [id, f.secondLastName, f.nickname, f.birthYear, f.birthPlace, countryCodeFromName(f.birthCountry), f.motherTongue, f.occupation, f.passportNumber]
      );
    }
    if (input.email?.trim()) {
      const normalized = normalizeEmail(input.email);
      await client.query(`UPDATE emails SET is_primary = false WHERE person_id = $1`, [id]);
      await client.query(
        `INSERT INTO emails (person_id, address, normalized, is_primary) VALUES ($1, $2, $3, true)
         ON CONFLICT (person_id, normalized) DO UPDATE SET address = EXCLUDED.address, is_primary = true`,
        [id, input.email.trim(), normalized]
      );
    }
    if (input.phone?.trim()) {
      const normalized = normalizePhone(input.phone);
      await client.query(`UPDATE phones SET is_primary = false WHERE person_id = $1`, [id]);
      await client.query(
        `INSERT INTO phones (person_id, number, normalized, is_primary) VALUES ($1, $2, $3, true)
         ON CONFLICT (person_id, normalized) DO UPDATE SET number = EXCLUDED.number, is_primary = true`,
        [id, input.phone.trim(), normalized]
      );
    }
  };
  if (client) await work(client);
  else await withTransaction(work);
  await logActivity({ actor, entity: 'person', entityId: id, action: 'person_updated' }, client);
}

/** A person's home or local address; an empty one is removed. */
export async function saveAddress(personId: string, kind: AddressKind, input: AddressInput, actor: StaffUser, client?: PoolClient): Promise<void> {
  const work = async (connection: PoolClient) => {
    await connection.query(`SELECT id FROM people WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`, [personId]);
    const empty = !input.street && !input.postcode && !input.city && !input.country;
    if (empty) {
      await connection.query(`DELETE FROM addresses WHERE person_id = $1 AND kind = $2`, [personId, kind]);
    } else {
      await connection.query(
        `INSERT INTO addresses (person_id, kind, street, postcode, city, country_code) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (person_id, kind) DO UPDATE
           SET street = EXCLUDED.street, postcode = EXCLUDED.postcode, city = EXCLUDED.city, country_code = EXCLUDED.country_code`,
        [personId, kind, input.street, input.postcode, input.city, countryCodeFromName(input.country)]
      );
    }
    await logActivity({ actor, entity: 'person', entityId: personId, action: 'person_address_updated', detail: { kind } }, connection);
  };
  if (client) await work(client);
  else await withTransaction(work);
}

// ------------------------------------------------------------ bank details

/**
 * A person's bank accounts (migration 0029) — a learner's, for a refund — and since 0092 an
 * organisation's own. Read and written with the module `private_data`, which the team holds; the
 * callers check it. The history says that an account was added, changed or removed, never the number.
 *
 * The same migration's `person_private` (tax, pension and health-insurance numbers) is staff data
 * from SchoolMan's employee records, not a learner's: it is shown on the staff pages when they are
 * built, under a right of its own.
 */
export type BankAccount = {
  id: string;
  holder: string | null;
  iban: string;
  bic: string | null;
  bankName: string | null;
  note: string | null;
  /** The holder's and the bank's address, for a transfer abroad (0092). */
  holderAddress: string | null;
  bankAddress: string | null;
};

export type BankAccountInput = {
  holder: string | null;
  iban: string;
  bic: string | null;
  bankName: string | null;
  note: string | null;
  holderAddress: string | null;
  bankAddress: string | null;
};

/** Whose account: a person's, or since 0092 an organisation's own. */
type Owner = { entity: 'person' | 'organisation'; id: string };
const OWNER_COLUMN = { person: 'person_id', organisation: 'organisation_id' } as const;

async function listAccounts(owner: Owner): Promise<BankAccount[]> {
  const rows = await query<{
    id: string;
    holder: string | null;
    iban: string;
    bic: string | null;
    bank_name: string | null;
    note: string | null;
    holder_address: string | null;
    bank_address: string | null;
  }>(
    `SELECT id, holder, iban, bic, bank_name, note, holder_address, bank_address FROM bank_accounts WHERE ${OWNER_COLUMN[owner.entity]} = $1 ORDER BY created_at`,
    [owner.id]
  );
  return rows.map((b) => ({
    id: b.id,
    holder: b.holder,
    iban: b.iban,
    bic: b.bic,
    bankName: b.bank_name,
    note: b.note,
    holderAddress: b.holder_address,
    bankAddress: b.bank_address,
  }));
}

/** The IBAN without spaces, upper case — how banks and DATEV read it. */
export const normalizeIban = (value: string) => value.replace(/\s+/g, '').toUpperCase();

async function addAccount(owner: Owner, input: BankAccountInput, actor: StaffUser): Promise<void> {
  await query(
    `INSERT INTO bank_accounts (${OWNER_COLUMN[owner.entity]}, holder, iban, bic, bank_name, note, holder_address, bank_address, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [owner.id, input.holder, normalizeIban(input.iban), input.bic, input.bankName, input.note, input.holderAddress, input.bankAddress, actor.id]
  );
  await logActivity({ actor, entity: owner.entity, entityId: owner.id, action: 'bank_account_added' });
}

/** A wrong digit is corrected in place; the history says the account changed, not to what. */
async function updateAccount(owner: Owner, accountId: string, input: BankAccountInput, actor: StaffUser): Promise<void> {
  await query(
    `UPDATE bank_accounts SET holder = $3, iban = $4, bic = $5, bank_name = $6, note = $7, holder_address = $8, bank_address = $9
      WHERE id = $1 AND ${OWNER_COLUMN[owner.entity]} = $2`,
    [accountId, owner.id, input.holder, normalizeIban(input.iban), input.bic, input.bankName, input.note, input.holderAddress, input.bankAddress]
  );
  await logActivity({ actor, entity: owner.entity, entityId: owner.id, action: 'bank_account_updated' });
}

async function removeAccount(owner: Owner, accountId: string, actor: StaffUser): Promise<void> {
  await query(`DELETE FROM bank_accounts WHERE id = $1 AND ${OWNER_COLUMN[owner.entity]} = $2`, [accountId, owner.id]);
  await logActivity({ actor, entity: owner.entity, entityId: owner.id, action: 'bank_account_removed' });
}

export const listBankAccounts = (personId: string) => listAccounts({ entity: 'person', id: personId });
export const addBankAccount = (personId: string, input: BankAccountInput, actor: StaffUser) => addAccount({ entity: 'person', id: personId }, input, actor);
export const updateBankAccount = (personId: string, accountId: string, input: BankAccountInput, actor: StaffUser) =>
  updateAccount({ entity: 'person', id: personId }, accountId, input, actor);
export const removeBankAccount = (personId: string, accountId: string, actor: StaffUser) => removeAccount({ entity: 'person', id: personId }, accountId, actor);

/** An organisation's own accounts (0092): an agency's, for its commission. Same module, `private_data`. */
export const listOrganisationBankAccounts = (organisationId: string) => listAccounts({ entity: 'organisation', id: organisationId });
export const addOrganisationBankAccount = (organisationId: string, input: BankAccountInput, actor: StaffUser) =>
  addAccount({ entity: 'organisation', id: organisationId }, input, actor);
export const updateOrganisationBankAccount = (organisationId: string, accountId: string, input: BankAccountInput, actor: StaffUser) =>
  updateAccount({ entity: 'organisation', id: organisationId }, accountId, input, actor);
export const removeOrganisationBankAccount = (organisationId: string, accountId: string, actor: StaffUser) =>
  removeAccount({ entity: 'organisation', id: organisationId }, accountId, actor);

/**
 * Soft delete: the row stays, marked with who deleted it and when, and every read filters it out;
 * `restorePerson` brings it back. Refused while other rows are linked into this one — unlink them
 * first — and while the person has bookings: the bookings list and what is owed leave out a deleted
 * person's bookings, so deleting a learner would hide their money (2026-10-16). A booking without
 * payments can be deleted on its own page; one with payments keeps its person.
 */
export async function deletePerson(
  id: string,
  actor: StaffUser
): Promise<{ ok: true } | { ok: false; reason: Bilingual }> {
  const linked = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM people WHERE merged_into = $1`,
    [id]
  );
  if (Number(linked?.n ?? 0) > 0) {
    return {
      ok: false,
      reason: {
        de: 'Mit dieser Person sind andere Datensätze verknüpft. Trenne sie zuerst.',
        en: 'Other records are linked to this person. Unlink them first.',
      },
    };
  }
  const booked = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM bookings WHERE person_id = $1 AND deleted_at IS NULL`,
    [id]
  );
  if (Number(booked?.n ?? 0) > 0) {
    return {
      ok: false,
      reason: {
        de: 'Diese Person hat Buchungen und bleibt deshalb in der Kartei. Eine Buchung ohne Zahlung lässt sich auf ihrer Seite löschen.',
        en: 'This person has bookings, so they stay in the register. A booking without payments can be deleted on its own page.',
      },
    };
  }
  await query(
    `UPDATE people SET deleted_at = now(), deleted_by = $2 WHERE id = $1 AND deleted_at IS NULL`,
    [id, actor.id]
  );
  await logActivity({ actor, entity: 'person', entityId: id, action: 'person_deleted' });
  return { ok: true };
}

/** A deleted person back in the register, with everything that pointed at them. */
export async function restorePerson(id: string, actor: StaffUser): Promise<void> {
  const restored = await query<{ id: string }>(
    `UPDATE people SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id`,
    [id]
  );
  if (restored.length) await logActivity({ actor, entity: 'person', entityId: id, action: 'person_restored' });
}

export type DeletedPerson = { id: string; displayName: string; primaryEmail: string | null; deletedAt: Date; deletedByName: string | null };

/** The register's „Gelöscht" view: who was deleted, when and by whom, the latest first. */
export async function listDeletedPeople({ search, limit = 40, offset = 0 }: { search?: string; limit?: number; offset?: number }): Promise<{ items: DeletedPerson[]; total: number }> {
  const params: unknown[] = [];
  let where = `WHERE p.deleted_at IS NOT NULL AND p.merged_into IS NULL`;
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (p.first_name ILIKE $1 OR p.last_name ILIKE $1 OR EXISTS (
      SELECT 1 FROM emails e WHERE e.person_id = p.id AND e.address ILIKE $1))`;
  }
  const total = await queryFirst<{ n: string }>(`SELECT count(*) AS n FROM people p ${where}`, params);
  const rows = await query<{ id: string; first_name: string; last_name: string | null; primary_email: string | null; deleted_at: Date; deleted_by_name: string | null }>(
    `SELECT p.id, p.first_name, p.last_name, p.deleted_at, u.name AS deleted_by_name,
            person_email(p.id) AS primary_email
       FROM people p LEFT JOIN staff_users u ON u.id = p.deleted_by
      ${where}
      ORDER BY p.deleted_at DESC, p.id
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return {
    items: rows.map((r) => ({
      id: r.id,
      displayName: displayName(r.first_name, r.last_name),
      primaryEmail: r.primary_email,
      deletedAt: r.deleted_at,
      deletedByName: r.deleted_by_name,
    })),
    total: Number(total?.n ?? 0),
  };
}

export type PersonTest = { id: string; takenOn: string | null; test: string | null; level: string | null; score: number | null; result: string | null; comment: string | null; authorName: string | null };

/** A learner's tests (0066), the latest first: which, when, the level reached, the score. */
export async function personTests(personId: string): Promise<PersonTest[]> {
  const rows = await query<{ id: string; taken_on: string | null; test: string | null; level: string | null; score: number | null; result: string | null; comment: string | null; author_name: string | null }>(
    `SELECT id, to_char(taken_on, 'YYYY-MM-DD') AS taken_on, test, level, score, result, comment, author_name
       FROM person_tests WHERE person_id = ANY(person_family($1))
      ORDER BY taken_on DESC NULLS LAST, created_at DESC, id`,
    [personId]
  );
  return rows.map((r) => ({ id: r.id, takenOn: r.taken_on, test: r.test, level: r.level, score: r.score, result: r.result, comment: r.comment, authorName: r.author_name }));
}
