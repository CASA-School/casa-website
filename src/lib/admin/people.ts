import { query, queryFirst, withTransaction } from './db';
import type { StaffUser } from './auth';
import { logActivity } from './activity';
import { countryCodeFromName, normalizeEmail, normalizePhone, parseIsoDate } from './normalize';
import { displayName } from './normalize';
import type { Bilingual, WsLang } from './i18n';

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
  emails: { address: string; isPrimary: boolean }[];
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
};

const SELECT = `
  SELECT p.id,
         canonical_person_id(p.id) AS canonical_id,
         p.salutation::text AS salutation,
         p.first_name, p.last_name, p.birth_date,
         p.nationality_code, c.name_en AS nationality_name, p.nationality_raw,
         p.merged_into, p.created_by, p.created_at,
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
export async function getPerson(id: string): Promise<PersonDetail | null> {
  const row = await queryFirst<Row>(
    `${SELECT} WHERE p.id = canonical_person_id($1) AND p.deleted_at IS NULL`,
    [id]
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
    }>(
      `SELECT p.second_last_name, p.nickname, p.birth_year, p.birth_place, p.birth_country_code,
              c.name_en AS birth_country_name, p.mother_tongue, p.occupation, p.passport_number
         FROM people p LEFT JOIN countries c ON c.code = p.birth_country_code WHERE p.id = $1`,
      [row.id]
    ),
    query<{ kind: AddressKind; street: string | null; postcode: string | null; city: string | null; country_code: string | null; country_name: string | null }>(
      `SELECT a.kind, a.street, a.postcode, a.city, a.country_code, c.name_en AS country_name
         FROM addresses a LEFT JOIN countries c ON c.code = a.country_code
        WHERE a.person_id = $1 ORDER BY a.kind = 'local' DESC`,
      [row.id]
    ),
    query<{ address: string; is_primary: boolean }>(
      `SELECT DISTINCT ON (e.normalized) e.address, e.is_primary
         FROM emails e
        WHERE canonical_person_id(e.person_id) = $1
        ORDER BY e.normalized, e.is_primary DESC, e.created_at`,
      [row.id]
    ),
    query<{ number: string; is_primary: boolean }>(
      `SELECT DISTINCT ON (ph.normalized) ph.number, ph.is_primary
         FROM phones ph
        WHERE canonical_person_id(ph.person_id) = $1
        ORDER BY ph.normalized, ph.is_primary DESC, ph.created_at`,
      [row.id]
    ),
    query<Row>(
      `${SELECT} WHERE p.id <> $1 AND canonical_person_id(p.id) = $1 ORDER BY p.created_at`,
      [row.id]
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
  last: { de: 'Letzter Kurs', en: 'Last course' },
  coming: { de: 'Kommend', en: 'Coming' },
  finished: { de: 'Abgeschlossen', en: 'Finished' },
};
/** How long a learner counts as new after their first course starts. */
const NEW_FOR_DAYS = 28;

/** The register's views: everyone, the learner stages, who has something open, who still owes money. */
export type PeopleView = 'all' | 'in_course' | 'new' | 'last' | 'coming' | 'finished' | 'open' | 'owing';

/** Open cases under a person (theirs and the rows linked into them): enquiries, registrations, offers in play. */
const OPEN_CASES = `(
  (SELECT count(*) FROM enquiries e WHERE e.person_id IS NOT NULL AND canonical_person_id(e.person_id) = p.id AND e.status IN ('new', 'in_progress', 'waiting'))
  + (SELECT count(*) FROM course_registrations r WHERE r.person_id IS NOT NULL AND canonical_person_id(r.person_id) = p.id AND r.status IN ('new', 'in_progress', 'waiting'))
  + (SELECT count(*) FROM exam_registrations r WHERE r.person_id IS NOT NULL AND canonical_person_id(r.person_id) = p.id AND r.status IN ('new', 'in_progress', 'waiting'))
  + (SELECT count(*) FROM offers o WHERE o.deleted_at IS NULL AND o.person_id IS NOT NULL AND canonical_person_id(o.person_id) = p.id AND o.status IN ('draft', 'sent'))
)`;

/** What a person still owes across their bookings that are not cancelled. */
const OWED = `(
  SELECT coalesce(sum(greatest(0,
           coalesce((SELECT sum(c.amount) FROM booking_charges c WHERE c.booking_id = b.id), 0)
         - coalesce((SELECT sum(pm.amount) FROM payments pm WHERE pm.booking_id = b.id AND pm.voided_at IS NULL), 0))), 0)
    FROM bookings b
   WHERE b.deleted_at IS NULL AND b.status <> 'cancelled' AND canonical_person_id(b.person_id) = p.id
)`;

/** In a course today: a booking that is not cancelled with a period running now. */
const IN_COURSE = `EXISTS (
  SELECT 1 FROM bookings b JOIN booking_periods bp ON bp.booking_id = b.id
   WHERE b.deleted_at IS NULL AND b.status IN ('reserved', 'confirmed') AND canonical_person_id(b.person_id) = p.id
     AND bp.start_date <= current_date AND bp.end_date >= current_date
)`;

/** A period of an open booking that starts after today — something still to come. */
const LATER = `EXISTS (
  SELECT 1 FROM bookings b JOIN booking_periods bp ON bp.booking_id = b.id
   WHERE b.deleted_at IS NULL AND b.status IN ('reserved', 'confirmed') AND canonical_person_id(b.person_id) = p.id
     AND bp.start_date > current_date
)`;

/** The first day of their first course that was not cancelled. */
const FIRST_START = `(
  SELECT min(bp.start_date) FROM bookings b JOIN booking_periods bp ON bp.booking_id = b.id
   WHERE b.deleted_at IS NULL AND b.status <> 'cancelled' AND canonical_person_id(b.person_id) = p.id
)`;

/** A period that has ended, of a booking that was not cancelled. */
const HAD_COURSE = `EXISTS (
  SELECT 1 FROM bookings b JOIN booking_periods bp ON bp.booking_id = b.id
   WHERE b.deleted_at IS NULL AND b.status <> 'cancelled' AND canonical_person_id(b.person_id) = p.id
     AND bp.end_date < current_date
)`;

const STAGE = `(CASE
  WHEN ${IN_COURSE} AND ${FIRST_START} >= current_date - ${NEW_FOR_DAYS} THEN 'new'
  WHEN ${IN_COURSE} AND NOT ${LATER} THEN 'last'
  WHEN ${IN_COURSE} THEN 'in_course'
  WHEN ${LATER} THEN 'coming'
  WHEN ${HAD_COURSE} THEN 'finished'
END)`;

/** Where one person stands, for the head of their page. */
export async function learnerStage(personId: string): Promise<LearnerStage | null> {
  const row = await queryFirst<{ stage: LearnerStage | null }>(`SELECT ${STAGE} AS stage FROM people p WHERE p.id = $1`, [personId]);
  return row?.stage ?? null;
}

/** Colleagues are on the staff register (0039), not among the learners. */
const NOT_STAFF = `NOT EXISTS (SELECT 1 FROM staff_members sm WHERE sm.person_id = p.id)`;

const VIEW_CONDITION: Record<PeopleView, string | null> = {
  all: null,
  // „Im Kurs" is everyone in a course today — the new and the last-course ones too.
  in_course: IN_COURSE,
  new: `${STAGE} = 'new'`,
  last: `${STAGE} = 'last'`,
  coming: `${STAGE} = 'coming'`,
  finished: `${STAGE} = 'finished'`,
  open: `${OPEN_CASES} > 0`,
  owing: `${OWED} > 0.005`,
};

/** How many people each view holds, for the counts beside its tabs. */
export async function peopleCounts(): Promise<Record<PeopleView, number>> {
  const row = await queryFirst<Record<PeopleView, string>>(
    `SELECT count(*) AS all,
            count(*) FILTER (WHERE ${IN_COURSE}) AS in_course,
            count(*) FILTER (WHERE stage = 'new') AS new,
            count(*) FILTER (WHERE stage = 'last') AS last,
            count(*) FILTER (WHERE stage = 'coming') AS coming,
            count(*) FILTER (WHERE stage = 'finished') AS finished,
            count(*) FILTER (WHERE ${OPEN_CASES} > 0) AS open,
            count(*) FILTER (WHERE ${OWED} > 0.005) AS owing
       FROM (SELECT p.*, ${STAGE} AS stage FROM people p WHERE p.merged_into IS NULL AND p.deleted_at IS NULL AND ${NOT_STAFF}) p`
  );
  const n = (key: PeopleView) => Number(row?.[key] ?? 0);
  return {
    all: n('all'),
    in_course: n('in_course'),
    new: n('new'),
    last: n('last'),
    coming: n('coming'),
    finished: n('finished'),
    open: n('open'),
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
    course: { name: string | null; start: Date; end: Date; current: boolean } | null;
    /** The level a teacher confirmed last. */
    level: string | null;
    /** Enquiries, registrations and offers still in play. */
    openCases: number;
    /** Still owed across their bookings. */
    owed: number;
    /** Where they stand as a learner; null for someone who has only enquired. */
    stage: LearnerStage | null;
  })[];
  total: number;
}> {
  const params: unknown[] = [];
  let where = `WHERE p.merged_into IS NULL AND p.deleted_at IS NULL AND ${NOT_STAFF}`;
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (p.first_name ILIKE $1 OR p.last_name ILIKE $1 OR EXISTS (
      SELECT 1 FROM emails e WHERE e.person_id = p.id AND e.address ILIKE $1))`;
  }
  const condition = VIEW_CONDITION[view];
  if (condition) where += ` AND ${condition}`;
  const total = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM people p ${where}`,
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
      level: string | null;
      open_cases: string;
      owed: string;
      stage: LearnerStage | null;
    }
  >(
    `${SELECT.replace(
      'FROM people p',
      `, (SELECT e.address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at LIMIT 1) AS primary_email,
         nb.course_name, nb.course_start, nb.course_end,
         (SELECT coalesce(rv.confirmed_level_code, rv.confirmed_level) FROM placement_reviews rv
           WHERE rv.person_id IS NOT NULL AND canonical_person_id(rv.person_id) = p.id ORDER BY rv.decided_at DESC LIMIT 1) AS level,
         ${OPEN_CASES} AS open_cases,
         ${OWED} AS owed,
         ${STAGE} AS stage
    FROM people p
    LEFT JOIN LATERAL (
      SELECT t.name AS course_name, min(bp.start_date) AS course_start, max(bp.end_date) AS course_end
        FROM bookings b
        JOIN booking_periods bp ON bp.booking_id = b.id
        LEFT JOIN course_types t ON t.id = b.course_type_id
       WHERE canonical_person_id(b.person_id) = p.id
         AND b.deleted_at IS NULL
         AND b.status IN ('reserved', 'confirmed')
       GROUP BY b.id, t.name
      HAVING max(bp.end_date) >= current_date
       ORDER BY min(bp.start_date)
       LIMIT 1
    ) nb ON true`
    )}
     ${where}
     ORDER BY p.created_at DESC
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
      stage: r.stage,
      course:
        r.course_start && r.course_end
          ? {
              name: r.course_name,
              start: r.course_start,
              end: r.course_end,
              current: new Date(r.course_start).setHours(0, 0, 0, 0) <= new Date().setHours(0, 0, 0, 0),
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
  }>(
    `SELECT kind, id, title, detail, status, at FROM (
       SELECT 'enquiry'::text AS kind, e.id, e.topic AS title,
              left(e.message, 140) AS detail, e.status::text, e.submitted_at AS at
         FROM enquiries e WHERE canonical_person_id(e.person_id) = $1
       UNION ALL
       SELECT 'course', r.id, r.course_type_label,
              r.course_instance_label, r.status::text, r.submitted_at
         FROM course_registrations r WHERE canonical_person_id(r.person_id) = $1
       UNION ALL
       SELECT 'exam', r.id, r.exam_type_label,
              r.exam_session_label, r.status::text, r.submitted_at
         FROM exam_registrations r WHERE canonical_person_id(r.person_id) = $1
       UNION ALL
       SELECT 'review', rv.attempt_id, rv.confirmed_level,
              rv.note, NULL, rv.decided_at
         FROM placement_reviews rv WHERE canonical_person_id(rv.person_id) = $1
     ) t ORDER BY at DESC`,
    [canonicalId]
  );
  const href: Record<TimelineItem['kind'], string> = {
    enquiry: '/admin/enquiries',
    course: '/admin/registrations/course',
    exam: '/admin/registrations/exam',
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
  return rows.map((r) => ({ ...r, title: title(r), href: `${href[r.kind]}/${r.id}` }));
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
      `EXISTS (SELECT 1 FROM emails e WHERE canonical_person_id(e.person_id) = p.id AND e.normalized = $${params.length})`
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
      `, ${email ? `EXISTS (SELECT 1 FROM emails e WHERE canonical_person_id(e.person_id) = p.id AND e.normalized = $1)` : 'false'} AS by_email FROM people p`
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

    // The flags that asked the question are answered by this action.
    await client.query(
      `UPDATE record_flags f SET resolved_at = now(), resolved_by = $3
        WHERE f.code = 'duplicate_candidate' AND f.resolved_at IS NULL
          AND ((f.entity = 'person' AND f.entity_id = $1)
            OR (f.entity = 'enquiry' AND f.entity_id IN (SELECT id FROM enquiries WHERE person_id = $1))
            OR (f.entity = 'course_registration' AND f.entity_id IN (SELECT id FROM course_registrations WHERE person_id = $1))
            OR (f.entity = 'exam_registration' AND f.entity_id IN (SELECT id FROM exam_registrations WHERE person_id = $1)))`,
      [duplicateId, canonical, actor.id]
    );
    await client.query(
      `INSERT INTO staff_activity (staff_user_id, staff_name, entity, entity_id, action, detail)
       VALUES ($1, $2, 'person', $3, 'person_linked', $4)`,
      [actor.id, actor.name, duplicateId, JSON.stringify({ survivor: canonical })]
    );
    return { ok: true };
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
      WHERE canonical_person_id(rv.person_id) = $1
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

export type Country = { code: string; nameEn: string };

export async function listCountries(): Promise<Country[]> {
  const rows = await query<{ code: string; name_en: string }>(
    `SELECT code, name_en FROM countries ORDER BY name_en`
  );
  return rows.map((r) => ({ code: r.code, nameEn: r.name_en }));
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
  actor: StaffUser
): Promise<void> {
  await withTransaction(async (client) => {
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
  });
  await logActivity({ actor, entity: 'person', entityId: id, action: 'person_updated' });
}

/** A person's home or local address; an empty one is removed. */
export async function saveAddress(personId: string, kind: AddressKind, input: AddressInput, actor: StaffUser): Promise<void> {
  const empty = !input.street && !input.postcode && !input.city && !input.country;
  if (empty) {
    await query(`DELETE FROM addresses WHERE person_id = $1 AND kind = $2`, [personId, kind]);
  } else {
    await query(
      `INSERT INTO addresses (person_id, kind, street, postcode, city, country_code) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (person_id, kind) DO UPDATE
         SET street = EXCLUDED.street, postcode = EXCLUDED.postcode, city = EXCLUDED.city, country_code = EXCLUDED.country_code`,
      [personId, kind, input.street, input.postcode, input.city, countryCodeFromName(input.country)]
    );
  }
  await logActivity({ actor, entity: 'person', entityId: personId, action: 'person_address_updated', detail: { kind } });
}

// ------------------------------------------------------------ bank details

/**
 * A person's bank accounts (migration 0029) — a learner's, for a refund. Read and written with the
 * module `private_data`, which the team holds; the callers check it. The history says that an
 * account was added, changed or removed, never the number.
 *
 * The same migration's `person_private` (tax, pension and health-insurance numbers) is staff data
 * from SchoolMan's employee records, not a learner's: it is shown on the staff pages when they are
 * built, under a right of its own.
 */
export type BankAccount = { id: string; holder: string | null; iban: string; bic: string | null; bankName: string | null; note: string | null };

export type BankAccountInput = { holder: string | null; iban: string; bic: string | null; bankName: string | null; note: string | null };

export async function listBankAccounts(personId: string): Promise<BankAccount[]> {
  const rows = await query<{ id: string; holder: string | null; iban: string; bic: string | null; bank_name: string | null; note: string | null }>(
    `SELECT id, holder, iban, bic, bank_name, note FROM bank_accounts WHERE person_id = $1 ORDER BY created_at`,
    [personId]
  );
  return rows.map((b) => ({ id: b.id, holder: b.holder, iban: b.iban, bic: b.bic, bankName: b.bank_name, note: b.note }));
}

/** The IBAN without spaces, upper case — how banks and DATEV read it. */
export const normalizeIban = (value: string) => value.replace(/\s+/g, '').toUpperCase();

export async function addBankAccount(personId: string, input: BankAccountInput, actor: StaffUser): Promise<void> {
  await query(
    `INSERT INTO bank_accounts (person_id, holder, iban, bic, bank_name, note, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [personId, input.holder, normalizeIban(input.iban), input.bic, input.bankName, input.note, actor.id]
  );
  await logActivity({ actor, entity: 'person', entityId: personId, action: 'bank_account_added' });
}

/** A wrong digit is corrected in place; the history says the account changed, not to what. */
export async function updateBankAccount(personId: string, accountId: string, input: BankAccountInput, actor: StaffUser): Promise<void> {
  await query(
    `UPDATE bank_accounts SET holder = $3, iban = $4, bic = $5, bank_name = $6, note = $7 WHERE id = $1 AND person_id = $2`,
    [accountId, personId, input.holder, normalizeIban(input.iban), input.bic, input.bankName, input.note]
  );
  await logActivity({ actor, entity: 'person', entityId: personId, action: 'bank_account_updated' });
}

export async function removeBankAccount(personId: string, accountId: string, actor: StaffUser): Promise<void> {
  await query(`DELETE FROM bank_accounts WHERE id = $1 AND person_id = $2`, [accountId, personId]);
  await logActivity({ actor, entity: 'person', entityId: personId, action: 'bank_account_removed' });
}

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
            (SELECT e.address FROM emails e WHERE e.person_id = p.id ORDER BY e.is_primary DESC, e.created_at LIMIT 1) AS primary_email
       FROM people p LEFT JOIN staff_users u ON u.id = p.deleted_by
      ${where}
      ORDER BY p.deleted_at DESC
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
