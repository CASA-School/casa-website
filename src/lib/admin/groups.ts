import 'server-only';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import type { BookingStatus, ObservationReason } from './bookings';
import { query, queryFirst, withTransaction } from './db';
import type { GroupLevel, GroupStatus, GroupView } from './group-labels';
import type { Bilingual } from './i18n';
import { formatOfferNumber, type OfferStatus } from './offers/types';
import type { OrganisationKind } from './organisation-labels';

/**
 * Group visits (2026-10-18, migration 0058; docs/ADMIN_WORKSPACE.md §Groups): a school class, a
 * company's team or an agency's group that comes to CASA together. A visit has its school or company and
 * the agency that booked it, how many learners and escorts and how old, the band and course type it is
 * taught at, where it comes from, the stay and the lessons in it, how it arrives, and whether it is on.
 * Its participants are learners with their own bookings (`bookings.group_visit_id`); a group with its
 * own class has its own courses (`courses.group_visit_id`). Those from SchoolMan keep its number
 * (`filemaker_group_id`), which no screen shows.
 *
 * Rights: module `groups` — `view` reads, `edit` creates and changes, `full` deletes.
 */

type Result = { ok: true; id?: string } | { ok: false; reason: Bilingual };
const refuse = (de: string, en: string): Result => ({ ok: false, reason: { de, en } });
const GONE = refuse('Diese Gruppe gibt es nicht mehr.', 'This group no longer exists.');

/** The visit's first and last day: the stay, else the lessons. */
const STARTS = `coalesce(v.arrival, v.course_from)`;
const ENDS = `coalesce(v.departure, v.course_to, v.arrival, v.course_from)`;

const VIEWS: Record<GroupView, string> = {
  upcoming: `v.status = 'confirmed' AND (${ENDS} IS NULL OR ${ENDS} >= current_date)`,
  open: `v.status = 'open'`,
  past: `v.status = 'confirmed' AND ${ENDS} < current_date`,
  cancelled: `v.status = 'cancelled'`,
  all: 'true',
};

/** The soonest first where what matters is what comes next; the latest first where it is history. */
const ORDER: Record<GroupView, string> = {
  upcoming: `${STARTS} NULLS LAST, lower(v.name), v.id`,
  open: `${STARTS} NULLS LAST, v.created_at DESC, v.id`,
  past: `${STARTS} DESC NULLS LAST, v.id`,
  cancelled: `${STARTS} DESC NULLS LAST, v.created_at DESC, v.id`,
  all: `${STARTS} DESC NULLS FIRST, v.created_at DESC, v.id`,
};

/** A participant's booking that counts: not cancelled or deleted, the learner not deleted. */
const TAKES_PART = (b: string) => `${b}.deleted_at IS NULL AND ${b}.status <> 'cancelled'
  AND EXISTS (SELECT 1 FROM people bp WHERE bp.id = ${b}.person_id AND bp.deleted_at IS NULL)`;

const both = (de: string | null, en: string | null): Bilingual | null => (de || en ? { de: de || en || '', en: en || de || '' } : null);

// ------------------------------------------------------------------- the list

export type GroupListItem = {
  id: string;
  name: string;
  status: GroupStatus;
  /** The school or company, else the agency. */
  organisationName: string | null;
  agencyName: string | null;
  country: Bilingual | null;
  participants: number | null;
  escorts: number | null;
  /** Participants with a booking here. */
  booked: number;
  startDate: Date | null;
  endDate: Date | null;
  isOver: boolean;
};

const SEARCH = `(v.name ILIKE $1 OR o.name ILIKE $1 OR a.name ILIKE $1)`;

export async function listGroups({
  view,
  search,
  limit,
  offset,
}: {
  view: GroupView;
  search?: string;
  limit: number;
  offset: number;
}): Promise<{ items: GroupListItem[]; total: number }> {
  const params: unknown[] = [];
  let where = `WHERE ${VIEWS[view]}`;
  if (search) {
    params.push(`%${search}%`);
    where += ` AND ${SEARCH}`;
  }
  const from = `FROM group_visits v
    LEFT JOIN organisations o ON o.id = v.organisation_id
    LEFT JOIN organisations a ON a.id = v.agency_id
    LEFT JOIN countries c ON c.code = v.country_code`;
  const total = await queryFirst<{ n: string }>(`SELECT count(*) AS n ${from} ${where}`, params);
  const rows = await query<{
    id: string;
    name: string;
    status: GroupStatus;
    organisation_name: string | null;
    agency_name: string | null;
    country_de: string | null;
    country_en: string | null;
    participants: number | null;
    escorts: number | null;
    booked: string;
    start_date: Date | null;
    end_date: Date | null;
    is_over: boolean;
  }>(
    `SELECT v.id, v.name, v.status, o.name AS organisation_name, a.name AS agency_name, c.name_de AS country_de, c.name_en AS country_en,
            v.participants, v.escorts,
            (SELECT count(*) FROM bookings b WHERE b.group_visit_id = v.id AND ${TAKES_PART('b')}) AS booked,
            ${STARTS} AS start_date, ${ENDS} AS end_date, coalesce(${ENDS} < current_date, false) AS is_over
       ${from}
       ${where}
      ORDER BY ${ORDER[view]}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return {
    total: Number(total?.n ?? 0),
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      organisationName: r.organisation_name,
      agencyName: r.agency_name,
      country: both(r.country_de, r.country_en),
      participants: r.participants,
      escorts: r.escorts,
      booked: Number(r.booked),
      startDate: r.start_date,
      endDate: r.end_date,
      isOver: r.is_over,
    })),
  };
}

export async function groupCounts(): Promise<Record<GroupView, number>> {
  const row = await queryFirst<Record<GroupView, string>>(
    // Quoted: `all` is a reserved word.
    `SELECT ${(Object.keys(VIEWS) as GroupView[]).map((v) => `count(*) FILTER (WHERE ${VIEWS[v]}) AS "${v}"`).join(', ')} FROM group_visits v`
  );
  const out = {} as Record<GroupView, number>;
  for (const v of Object.keys(VIEWS) as GroupView[]) out[v] = Number(row?.[v] ?? 0);
  return out;
}

// ----------------------------------------------------------------- one visit

export type GroupDetail = {
  id: string;
  name: string;
  status: GroupStatus;
  organisationId: string | null;
  organisationName: string | null;
  agencyId: string | null;
  agencyName: string | null;
  courseTypeId: string | null;
  courseTypeName: string | null;
  level: GroupLevel | null;
  countryCode: string | null;
  country: Bilingual | null;
  participants: number | null;
  escorts: number | null;
  ageFrom: number | null;
  ageTo: number | null;
  arrival: Date | null;
  departure: Date | null;
  courseFrom: Date | null;
  courseTo: Date | null;
  travelNote: string | null;
  note: string | null;
  isOver: boolean;
  fromSchoolMan: boolean;
  createdAt: Date;
};

export async function getGroup(id: string): Promise<GroupDetail | null> {
  const r = await queryFirst<{
    id: string;
    name: string;
    status: GroupStatus;
    organisation_id: string | null;
    organisation_name: string | null;
    agency_id: string | null;
    agency_name: string | null;
    course_type_id: string | null;
    course_type_name: string | null;
    level: GroupLevel | null;
    country_code: string | null;
    country_de: string | null;
    country_en: string | null;
    participants: number | null;
    escorts: number | null;
    age_from: number | null;
    age_to: number | null;
    arrival: Date | null;
    departure: Date | null;
    course_from: Date | null;
    course_to: Date | null;
    travel_note: string | null;
    note: string | null;
    is_over: boolean;
    from_schoolman: boolean;
    created_at: Date;
  }>(
    `SELECT v.id, v.name, v.status, v.organisation_id, o.name AS organisation_name, v.agency_id, a.name AS agency_name,
            v.course_type_id, coalesce(nullif(btrim(t.name_de), ''), t.name) AS course_type_name, v.level,
            v.country_code, c.name_de AS country_de, c.name_en AS country_en, v.participants, v.escorts, v.age_from, v.age_to,
            v.arrival, v.departure, v.course_from, v.course_to, v.travel_note, v.note,
            coalesce(${ENDS} < current_date, false) AS is_over, v.filemaker_group_id IS NOT NULL AS from_schoolman, v.created_at
       FROM group_visits v
       LEFT JOIN organisations o ON o.id = v.organisation_id
       LEFT JOIN organisations a ON a.id = v.agency_id
       LEFT JOIN course_types t ON t.id = v.course_type_id
       LEFT JOIN countries c ON c.code = v.country_code
      WHERE v.id = $1`,
    [id]
  );
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    status: r.status,
    organisationId: r.organisation_id,
    organisationName: r.organisation_name,
    agencyId: r.agency_id,
    agencyName: r.agency_name,
    courseTypeId: r.course_type_id,
    courseTypeName: r.course_type_name,
    level: r.level,
    countryCode: r.country_code?.trim() ?? null,
    country: both(r.country_de, r.country_en),
    participants: r.participants,
    escorts: r.escorts,
    ageFrom: r.age_from,
    ageTo: r.age_to,
    arrival: r.arrival,
    departure: r.departure,
    courseFrom: r.course_from,
    courseTo: r.course_to,
    travelNote: r.travel_note,
    note: r.note,
    isOver: r.is_over,
    fromSchoolMan: r.from_schoolman,
    createdAt: r.created_at,
  };
}

/** The figures in the head: who is booked, and what their bookings still owe. */
export async function groupFigures(id: string): Promise<{ booked: number; charged: number; paid: number }> {
  const row = await queryFirst<{ booked: string; charged: string; paid: string }>(
    `SELECT count(*) AS booked,
            coalesce(sum((SELECT sum(amount) FROM booking_charges c WHERE c.booking_id = b.id)), 0) AS charged,
            coalesce(sum((SELECT sum(amount) FROM payments pm WHERE pm.booking_id = b.id AND pm.voided_at IS NULL)), 0) AS paid
       FROM bookings b WHERE b.group_visit_id = $1 AND ${TAKES_PART('b')}`,
    [id]
  );
  return { booked: Number(row?.booked ?? 0), charged: Number(row?.charged ?? 0), paid: Number(row?.paid ?? 0) };
}

export type GroupParticipant = {
  bookingId: string;
  number: string;
  personId: string;
  personName: string;
  status: BookingStatus;
  observationReason: ObservationReason | null;
  startDate: Date | null;
  endDate: Date | null;
  /** Where they stay: a CASA flat by name, else the kind of stay. */
  stay: string | null;
  charged: number;
  paid: number;
};

/** The participants: each booking of the visit, by name; cancelled ones last. */
export async function groupParticipants(id: string): Promise<GroupParticipant[]> {
  const rows = await query<{
    id: string;
    number: string;
    person_id: string;
    person_name: string;
    status: BookingStatus;
    observation_reason: ObservationReason | null;
    start_date: Date | null;
    end_date: Date | null;
    stay: string | null;
    charged: string;
    paid: string;
  }>(
    `SELECT b.id, b.number, b.person_id, btrim(p.first_name || ' ' || coalesce(p.last_name, '')) AS person_name, b.status::text AS status, b.observation_reason,
            (SELECT min(start_date) FROM booking_days bd WHERE bd.booking_id = b.id) AS start_date,
            (SELECT max(end_date) FROM booking_days bd WHERE bd.booking_id = b.id) AS end_date,
            (SELECT coalesce(s.place, at.name_de, at.name_en) FROM booking_stays s LEFT JOIN accommodation_types at ON at.code = s.accommodation_type_code
              WHERE s.booking_id = b.id AND NOT s.cancelled ORDER BY s.starts_on LIMIT 1) AS stay,
            coalesce((SELECT sum(amount) FROM booking_charges c WHERE c.booking_id = b.id), 0) AS charged,
            coalesce((SELECT sum(amount) FROM payments pm WHERE pm.booking_id = b.id AND pm.voided_at IS NULL), 0) AS paid
       FROM bookings b JOIN people p ON p.id = b.person_id
      WHERE b.group_visit_id = $1 AND b.deleted_at IS NULL AND p.deleted_at IS NULL
      ORDER BY b.status = 'cancelled', lower(coalesce(p.last_name, p.first_name)), lower(p.first_name), b.id`,
    [id]
  );
  return rows.map((r) => ({
    bookingId: r.id,
    number: r.number,
    personId: r.person_id,
    personName: r.person_name,
    status: r.status,
    observationReason: r.observation_reason,
    startDate: r.start_date,
    endDate: r.end_date,
    stay: r.stay,
    charged: Number(r.charged),
    paid: Number(r.paid),
  }));
}

export type GroupCourse = { id: string; label: string; startDate: Date; endDate: Date; cancelled: boolean };

/** The courses the group has to itself, the earliest first. */
export async function groupCourses(id: string): Promise<GroupCourse[]> {
  const rows = await query<{ id: string; title: string | null; level_code: string | null; type_name: string | null; start_date: Date; end_date: Date; status: string }>(
    `SELECT c.id, c.title, c.level_code, coalesce(nullif(btrim(t.name_de), ''), t.name) AS type_name, i.start_date, i.end_date, c.status
       FROM courses c
       JOIN course_instances i ON i.id = c.course_instance_id
       LEFT JOIN course_types t ON t.id = i.course_type_id
      WHERE c.group_visit_id = $1
      ORDER BY i.start_date, c.id`,
    [id]
  );
  return rows.map((r) => ({
    id: r.id,
    label: r.title?.trim() || [r.type_name, r.level_code].filter(Boolean).join(' ') || '—',
    startDate: r.start_date,
    endDate: r.end_date,
    cancelled: r.status === 'cancelled',
  }));
}

export type GroupOffer = { id: string; number: string; status: OfferStatus; title: string; perPerson: number | null; createdAt: Date };

/** The offers made for the visit (0059), the latest first, with what each asks per person. */
export async function groupOffers(id: string): Promise<GroupOffer[]> {
  const rows = await query<{ id: string; year: number; seq: number; status: OfferStatus; title: string; per_person: string | null; created_at: Date }>(
    `SELECT f.id, f.year, f.seq, f.status, f.title, f.created_at,
            (SELECT sum(amount) FROM offer_lines l WHERE l.offer_id = f.id AND l.audience = 'participant') AS per_person
       FROM offers f WHERE f.group_visit_id = $1 AND f.deleted_at IS NULL
      ORDER BY f.created_at DESC, f.id`,
    [id]
  );
  return rows.map((r) => ({
    id: r.id,
    number: formatOfferNumber(r.year, r.seq),
    status: r.status,
    title: r.title,
    perPerson: r.per_person == null ? null : Number(r.per_person),
    createdAt: r.created_at,
  }));
}

export type OrganisationGroup = { id: string; name: string; status: GroupStatus; startDate: Date | null; endDate: Date | null; isOver: boolean; viaAgency: boolean };

/** The visits an organisation sends, or books as their agency, the latest first. */
export async function organisationGroups(organisationId: string): Promise<OrganisationGroup[]> {
  const rows = await query<{ id: string; name: string; status: GroupStatus; start_date: Date | null; end_date: Date | null; is_over: boolean; via_agency: boolean }>(
    `SELECT v.id, v.name, v.status, ${STARTS} AS start_date, ${ENDS} AS end_date, coalesce(${ENDS} < current_date, false) AS is_over,
            v.organisation_id IS DISTINCT FROM $1 AS via_agency
       FROM group_visits v WHERE v.organisation_id = $1 OR v.agency_id = $1
      ORDER BY ${STARTS} DESC NULLS FIRST, v.created_at DESC, v.id`,
    [organisationId]
  );
  return rows.map((r) => ({ id: r.id, name: r.name, status: r.status, startDate: r.start_date, endDate: r.end_date, isOver: r.is_over, viaAgency: r.via_agency }));
}

// ------------------------------------------------------------- for the forms

export type GroupOptions = {
  organisations: { id: string; name: string; kind: OrganisationKind }[];
  courseTypes: { id: string; name: string }[];
  countries: { code: string; name: Bilingual }[];
};

/** What the forms choose from: the organisations CASA works with, the course types offered, the countries. */
export async function groupOptions(keep: readonly (string | null)[] = []): Promise<GroupOptions> {
  const kept = keep.filter((v): v is string => Boolean(v));
  const [organisations, courseTypes, countries] = await Promise.all([
    query<{ id: string; name: string; kind: OrganisationKind }>(
      `SELECT id, name, kind FROM organisations WHERE is_active OR id = ANY($1::uuid[]) ORDER BY lower(name), id`,
      [kept]
    ),
    query<{ id: string; name: string }>(
      `SELECT id, coalesce(nullif(btrim(name_de), ''), name) AS name FROM course_types WHERE is_active OR id = ANY($1::uuid[]) ORDER BY position, name`,
      [kept]
    ),
    query<{ code: string; name_de: string; name_en: string }>(`SELECT code, name_de, name_en FROM countries ORDER BY name_de`),
  ]);
  return { organisations, courseTypes, countries: countries.map((c) => ({ code: c.code.trim(), name: { de: c.name_de, en: c.name_en } })) };
}

// ------------------------------------------------------------------ mutations

export type GroupInput = {
  name: string;
  organisationId: string | null;
  agencyId: string | null;
  courseTypeId: string | null;
  level: GroupLevel | null;
  countryCode: string | null;
  participants: number | null;
  escorts: number | null;
  ageFrom: number | null;
  ageTo: number | null;
  arrival: string | null;
  departure: string | null;
  courseFrom: string | null;
  courseTo: string | null;
  travelNote: string | null;
  note: string | null;
};

const COLUMNS = `name, organisation_id, agency_id, course_type_id, level, country_code, participants, escorts, age_from, age_to,
  arrival, departure, course_from, course_to, travel_note, note`;
const values = (input: GroupInput) => [
  input.name,
  input.organisationId,
  input.agencyId,
  input.courseTypeId,
  input.level,
  input.countryCode,
  input.participants,
  input.escorts,
  input.ageFrom,
  input.ageTo,
  input.arrival,
  input.departure,
  input.courseFrom,
  input.courseTo,
  input.travelNote,
  input.note,
];

/** An organisation, course type or country that is no longer there is left out rather than refused. */
const CHECKED = `(SELECT id FROM organisations WHERE id = $2::uuid), (SELECT id FROM organisations WHERE id = $3::uuid),
  (SELECT id FROM course_types WHERE id = $4::uuid), $5, (SELECT code FROM countries WHERE code = $6)`;

export async function createGroup(input: GroupInput, actor: StaffUser): Promise<string> {
  const row = await queryFirst<{ id: string }>(
    `INSERT INTO group_visits (${COLUMNS}, created_by)
     VALUES ($1, ${CHECKED}, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING id`,
    [...values(input), actor.id]
  );
  const id = row!.id;
  await logActivity({ actor, entity: 'group_visit', entityId: id, action: 'group_created' });
  return id;
}

export async function updateGroup(id: string, input: GroupInput, actor: StaffUser): Promise<Result> {
  const rows = await query<{ id: string }>(
    `UPDATE group_visits
        SET (${COLUMNS}, updated_at) = ($1, ${CHECKED}, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, timezone('utc', now()))
      WHERE id = $17 RETURNING id`,
    [...values(input), id]
  );
  if (!rows.length) return GONE;
  await logActivity({ actor, entity: 'group_visit', entityId: id, action: 'group_updated' });
  return { ok: true };
}

/** Asked for, confirmed or called off. Nothing else moves: its participants' bookings keep their own state. */
export async function setGroupStatus(id: string, status: GroupStatus, actor: StaffUser): Promise<Result> {
  const before = await queryFirst<{ status: GroupStatus }>(`SELECT status FROM group_visits WHERE id = $1`, [id]);
  if (!before) return GONE;
  if (before.status === status) return { ok: true };
  await query(`UPDATE group_visits SET status = $2, updated_at = timezone('utc', now()) WHERE id = $1`, [id, status]);
  await logActivity({ actor, entity: 'group_visit', entityId: id, action: 'group_status_changed', detail: { from: before.status, to: status } });
  return { ok: true };
}

type Holds = { bookings: number; courses: number; fromSchoolMan: boolean };
const HOLDS = `SELECT (SELECT count(*) FROM bookings b WHERE b.group_visit_id = v.id AND b.deleted_at IS NULL) AS bookings,
                      (SELECT count(*) FROM courses c WHERE c.group_visit_id = v.id) AS courses,
                      v.filemaker_group_id IS NOT NULL AS from_schoolman
                 FROM group_visits v WHERE v.id = $1`;
const toHolds = (r: { bookings: string; courses: string; from_schoolman: boolean }): Holds => ({
  bookings: Number(r.bookings),
  courses: Number(r.courses),
  fromSchoolMan: r.from_schoolman,
});

/** Whether „Löschen" can be offered: no booking or course names it, and it did not come from SchoolMan. */
export async function groupDeletable(id: string): Promise<boolean> {
  const row = await queryFirst<{ bookings: string; courses: string; from_schoolman: boolean }>(HOLDS, [id]);
  if (!row) return false;
  const h = toHolds(row);
  return h.bookings + h.courses === 0 && !h.fromSchoolMan;
}

/**
 * Gone, for a visit entered by mistake: only while no booking or course names it and it did not come
 * from SchoolMan. One that does not take place is called off instead. Its notes go with it.
 */
export async function deleteGroup(id: string, actor: StaffUser): Promise<Result> {
  const outcome = await withTransaction(async (client): Promise<Result & { name?: string }> => {
    const locked = await client.query<{ name: string }>(`SELECT name FROM group_visits WHERE id = $1 FOR UPDATE`, [id]);
    if (!locked.rows[0]) return GONE;
    const h = toHolds((await client.query<{ bookings: string; courses: string; from_schoolman: boolean }>(HOLDS, [id])).rows[0]);
    if (h.bookings + h.courses > 0 || h.fromSchoolMan) {
      return refuse(
        'Diese Gruppe hat Buchungen oder Kurse oder kommt aus SchoolMan — sag sie ab, statt sie zu löschen.',
        'This group has bookings or courses, or comes from SchoolMan — cancel it instead of deleting it.'
      );
    }
    await client.query(`DELETE FROM staff_notes WHERE entity = 'group_visit' AND entity_id = $1`, [id]);
    await client.query(`DELETE FROM group_visits WHERE id = $1`, [id]);
    return { ok: true, name: locked.rows[0].name };
  });
  if (!outcome.ok) return outcome;
  await logActivity({ actor, entity: 'group_visit', entityId: id, action: 'group_deleted', detail: { name: outcome.name } });
  return { ok: true };
}
