import 'server-only';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import type { BookingStatus, ObservationReason } from './bookings';
import { query, queryFirst, withTransaction } from './db';
import type { Bilingual } from './i18n';
import type { LetterKind } from './letters/types';
import { formatOfferNumber, type OfferStatus } from './offers/types';
import type { ContactSalutation, OrganisationKind, OrganisationView } from './organisation-labels';

/**
 * Organisations (2026-10-18, migration 0057; docs/ADMIN_WORKSPACE.md §Organisations): the agencies,
 * companies, schools and offices CASA works with. An organisation has its own address, e-mail and
 * phone, the language CASA writes to it in, whether CASA still works with it, an agency's agreement and
 * a note; the people who work there (`organisation_contacts`); an agency's commission, a share of a
 * kind of charge (`agency_commissions`). What points at it: the bookings it pays
 * (`bookings.payer_organisation_id`), a company's own courses, the offers made to it and the letters
 * sent to it. Those imported from SchoolMan are linked in `filemaker_links`, which no screen shows.
 *
 * Rights: module `organisations` — `view` reads, `edit` creates and changes, `full` deletes.
 */

type Result = { ok: true; id?: string } | { ok: false; reason: Bilingual };
const refuse = (de: string, en: string): Result => ({ ok: false, reason: { de, en } });
const GONE = refuse('Diese Organisation gibt es nicht mehr.', 'This organisation no longer exists.');

/**
 * A booking the organisation pays that runs today or is still to come: not cancelled or deleted, its
 * learner not deleted, and a day of it ending today or later.
 */
const PAYS_NOW = (b: string) => `${b}.deleted_at IS NULL AND ${b}.status <> 'cancelled'
  AND EXISTS (SELECT 1 FROM people bp WHERE bp.id = ${b}.person_id AND bp.deleted_at IS NULL)
  AND EXISTS (SELECT 1 FROM booking_days bd WHERE bd.booking_id = ${b}.id AND bd.end_date >= current_date)`;

const VIEWS: Record<OrganisationView, string> = {
  all: 'true',
  agency: `o.kind = 'agency'`,
  company: `o.kind = 'company'`,
  school: `o.kind IN ('school', 'public_body')`,
  other: `o.kind = 'other'`,
  inactive: 'NOT o.is_active',
};

const both = (de: string | null, en: string | null): Bilingual | null => (de || en ? { de: de || en || '', en: en || de || '' } : null);
const fullName = (first: string | null, last: string | null) => [first, last].filter(Boolean).join(' ').trim();

// ------------------------------------------------------------------- the list

export type OrganisationListItem = {
  id: string;
  name: string;
  kind: OrganisationKind;
  isActive: boolean;
  country: Bilingual | null;
  contacts: number;
  /** Bookings it pays that run today or are still to come. */
  bookings: number;
  /** The contact written to last: who a colleague thinks of first. */
  contactName: string | null;
};

type ListRow = {
  id: string;
  name: string;
  kind: OrganisationKind;
  is_active: boolean;
  country_de: string | null;
  country_en: string | null;
  contacts: string;
  bookings: string;
  contact_name: string | null;
};

const SEARCH = `(o.name ILIKE $1 OR o.email ILIKE $1 OR EXISTS (
  SELECT 1 FROM organisation_contacts sc WHERE sc.organisation_id = o.id
     AND (concat_ws(' ', sc.first_name, sc.last_name) ILIKE $1 OR concat_ws(' ', sc.last_name, sc.first_name) ILIKE $1 OR sc.email ILIKE $1)))`;

export async function listOrganisations({
  view,
  search,
  limit,
  offset,
}: {
  view: OrganisationView;
  search?: string;
  limit: number;
  offset: number;
}): Promise<{ items: OrganisationListItem[]; total: number }> {
  const params: unknown[] = [];
  let where = `WHERE ${VIEWS[view]}`;
  if (search) {
    params.push(`%${search}%`);
    where += ` AND ${SEARCH}`;
  }
  const total = await queryFirst<{ n: string }>(`SELECT count(*) AS n FROM organisations o ${where}`, params);
  const rows = await query<ListRow>(
    `SELECT o.id, o.name, o.kind, o.is_active, c.name_de AS country_de, c.name_en AS country_en,
            (SELECT count(*) FROM organisation_contacts oc WHERE oc.organisation_id = o.id) AS contacts,
            (SELECT count(*) FROM bookings b WHERE b.payer_organisation_id = o.id AND ${PAYS_NOW('b')}) AS bookings,
            (SELECT coalesce(nullif(btrim(concat_ws(' ', oc.first_name, oc.last_name)), ''), oc.email)
               FROM organisation_contacts oc WHERE oc.organisation_id = o.id
              ORDER BY oc.last_written_at DESC, oc.id LIMIT 1) AS contact_name
       FROM organisations o
       LEFT JOIN countries c ON c.code = o.country_code
       ${where}
      ORDER BY o.is_active DESC, lower(o.name), o.id
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return {
    total: Number(total?.n ?? 0),
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      isActive: r.is_active,
      country: both(r.country_de, r.country_en),
      contacts: Number(r.contacts),
      bookings: Number(r.bookings),
      contactName: r.contact_name,
    })),
  };
}

export async function organisationCounts(): Promise<Record<OrganisationView, number>> {
  const row = await queryFirst<Record<OrganisationView, string>>(
    // Quoted: `all` is a reserved word.
    `SELECT ${(Object.keys(VIEWS) as OrganisationView[]).map((v) => `count(*) FILTER (WHERE ${VIEWS[v]}) AS "${v}"`).join(', ')} FROM organisations o`
  );
  const out = {} as Record<OrganisationView, number>;
  for (const v of Object.keys(VIEWS) as OrganisationView[]) out[v] = Number(row?.[v] ?? 0);
  return out;
}

// -------------------------------------------------------------- one organisation

export type OrganisationDetail = {
  id: string;
  name: string;
  kind: OrganisationKind;
  isActive: boolean;
  /** Street, then postcode and town, as the letter prints it. */
  address: string | null;
  countryCode: string | null;
  country: Bilingual | null;
  /** The language CASA writes to them in. */
  language: 'de' | 'en';
  email: string | null;
  phone: string | null;
  agreement: string | null;
  note: string | null;
  createdAt: Date;
};

export async function getOrganisation(id: string): Promise<OrganisationDetail | null> {
  const row = await queryFirst<{
    id: string;
    name: string;
    kind: OrganisationKind;
    is_active: boolean;
    address: string | null;
    country_code: string | null;
    country_de: string | null;
    country_en: string | null;
    language: 'de' | 'en';
    email: string | null;
    phone: string | null;
    agreement: string | null;
    note: string | null;
    created_at: Date;
  }>(
    `SELECT o.id, o.name, o.kind, o.is_active, o.address, o.country_code, c.name_de AS country_de, c.name_en AS country_en,
            o.language, o.email, o.phone, o.agreement, o.note, o.created_at
       FROM organisations o LEFT JOIN countries c ON c.code = o.country_code
      WHERE o.id = $1`,
    [id]
  );
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    isActive: row.is_active,
    address: row.address,
    countryCode: row.country_code?.trim() ?? null,
    country: both(row.country_de, row.country_en),
    language: row.language,
    email: row.email,
    phone: row.phone,
    agreement: row.agreement,
    note: row.note,
    createdAt: row.created_at,
  };
}

export type OrganisationContact = {
  id: string;
  salutation: ContactSalutation;
  firstName: string | null;
  lastName: string | null;
  /** The name, or the address when there is no name. */
  name: string;
  email: string | null;
  phone: string | null;
  /** Their job title. */
  role: string | null;
};

export async function organisationContacts(organisationId: string): Promise<OrganisationContact[]> {
  const rows = await query<{
    id: string;
    salutation: ContactSalutation;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    role: string | null;
  }>(
    `SELECT id, salutation, first_name, last_name, email, phone, role FROM organisation_contacts
      WHERE organisation_id = $1
      ORDER BY lower(coalesce(last_name, first_name, email)), lower(coalesce(first_name, '')), id`,
    [organisationId]
  );
  return rows.map((r) => ({
    id: r.id,
    salutation: r.salutation,
    firstName: r.first_name,
    lastName: r.last_name,
    name: fullName(r.first_name, r.last_name) || r.email || '',
    email: r.email,
    phone: r.phone,
    role: r.role,
  }));
}

export type CommissionTerm = {
  id: string;
  chargeTypeCode: string | null;
  /** The kind of charge the share is of: „Kurspreis". */
  chargeType: Bilingual | null;
  percentage: number;
  note: string | null;
};

export async function commissionTerms(organisationId: string): Promise<CommissionTerm[]> {
  const rows = await query<{ id: string; charge_type_code: string | null; name_de: string | null; name_en: string | null; percentage: string; note: string | null }>(
    `SELECT a.id, a.charge_type_code, ct.name_de, ct.name_en, a.percentage, a.note
       FROM agency_commissions a LEFT JOIN charge_types ct ON ct.code = a.charge_type_code
      WHERE a.organisation_id = $1
      ORDER BY ct.position NULLS LAST, a.created_at, a.id`,
    [organisationId]
  );
  return rows.map((r) => ({
    id: r.id,
    chargeTypeCode: r.charge_type_code,
    chargeType: both(r.name_de, r.name_en),
    percentage: Number(r.percentage),
    note: r.note,
  }));
}

/** The figures in the head: the bookings it pays now or ahead, and how many learners they are. */
export async function organisationFigures(organisationId: string): Promise<{ currentBookings: number; learners: number }> {
  const row = await queryFirst<{ bookings: string; learners: string }>(
    `SELECT count(*) AS bookings, count(DISTINCT canonical_person_id(b.person_id)) AS learners
       FROM bookings b WHERE b.payer_organisation_id = $1 AND ${PAYS_NOW('b')}`,
    [organisationId]
  );
  return { currentBookings: Number(row?.bookings ?? 0), learners: Number(row?.learners ?? 0) };
}

export type OrganisationBooking = {
  id: string;
  number: string;
  personId: string;
  personName: string;
  courseTypeName: string | null;
  status: BookingStatus;
  startDate: Date | null;
  endDate: Date | null;
  charged: number;
  paid: number;
  currency: string;
  observationReason: ObservationReason | null;
};

const BOOKINGS = `
  SELECT b.id, b.number, b.person_id, btrim(p.first_name || ' ' || coalesce(p.last_name, '')) AS person_name,
         coalesce(nullif(btrim(t.name_de), ''), t.name, et.name) AS course_type_name, b.status::text AS status, b.currency,
         b.observation_reason,
         (SELECT min(start_date) FROM booking_days bd WHERE bd.booking_id = b.id) AS start_date,
         (SELECT max(end_date) FROM booking_days bd WHERE bd.booking_id = b.id) AS end_date,
         coalesce((SELECT sum(amount) FROM booking_charges c WHERE c.booking_id = b.id), 0) AS charged,
         coalesce((SELECT sum(amount) FROM payments pm WHERE pm.booking_id = b.id AND pm.voided_at IS NULL), 0) AS paid
    FROM bookings b
    JOIN people p ON p.id = b.person_id
    LEFT JOIN course_types t ON t.id = b.course_type_id
    LEFT JOIN exam_sessions es ON es.id = b.exam_session_id
    LEFT JOIN exam_types et ON et.id = es.exam_type_id
   WHERE b.payer_organisation_id = $1 AND b.deleted_at IS NULL AND p.deleted_at IS NULL`;

type BookingRow = {
  id: string;
  number: string;
  person_id: string;
  person_name: string;
  course_type_name: string | null;
  status: BookingStatus;
  currency: string;
  observation_reason: ObservationReason | null;
  start_date: Date | null;
  end_date: Date | null;
  charged: string;
  paid: string;
};

const toBooking = (r: BookingRow): OrganisationBooking => ({
  id: r.id,
  number: r.number,
  personId: r.person_id,
  personName: r.person_name,
  courseTypeName: r.course_type_name,
  status: r.status,
  startDate: r.start_date,
  endDate: r.end_date,
  charged: Number(r.charged),
  paid: Number(r.paid),
  currency: r.currency,
  observationReason: r.observation_reason,
});

/** How many earlier bookings the tab shows before „Alle anzeigen". */
export const EARLIER_SHOWN = 25;

/**
 * The bookings it pays: those running or still to come, by start; then the rest — over, cancelled or
 * without dates — the latest first, the newest {@link EARLIER_SHOWN} unless all are asked for.
 */
export async function organisationBookings(
  organisationId: string,
  { allEarlier = false }: { allEarlier?: boolean } = {}
): Promise<{ current: OrganisationBooking[]; earlier: OrganisationBooking[]; earlierTotal: number }> {
  const [current, earlier, total] = await Promise.all([
    query<BookingRow>(`${BOOKINGS} AND ${PAYS_NOW('b')} ORDER BY start_date NULLS LAST, b.number, b.id`, [organisationId]),
    query<BookingRow>(
      `${BOOKINGS} AND NOT (${PAYS_NOW('b')}) ORDER BY start_date DESC NULLS LAST, b.number DESC, b.id ${allEarlier ? '' : `LIMIT ${EARLIER_SHOWN}`}`,
      [organisationId]
    ),
    queryFirst<{ n: string }>(
      `SELECT count(*) AS n FROM bookings b JOIN people p ON p.id = b.person_id
        WHERE b.payer_organisation_id = $1 AND b.deleted_at IS NULL AND p.deleted_at IS NULL AND NOT (${PAYS_NOW('b')})`,
      [organisationId]
    ),
  ]);
  return { current: current.map(toBooking), earlier: earlier.map(toBooking), earlierTotal: Number(total?.n ?? 0) };
}

export type OrganisationCourse = {
  id: string;
  /** Its own name, or the course type and level. */
  label: string;
  startDate: Date;
  endDate: Date;
  cancelled: boolean;
};

/** A company's or a group's own courses, the latest start first. */
export async function organisationCourses(organisationId: string): Promise<OrganisationCourse[]> {
  const rows = await query<{ id: string; title: string | null; level_code: string | null; type_name: string | null; start_date: Date; end_date: Date; status: string }>(
    `SELECT c.id, c.title, c.level_code, coalesce(nullif(btrim(t.name_de), ''), t.name) AS type_name, i.start_date, i.end_date, c.status
       FROM courses c
       JOIN course_instances i ON i.id = c.course_instance_id
       LEFT JOIN course_types t ON t.id = i.course_type_id
      WHERE c.organisation_id = $1
      ORDER BY i.start_date DESC, c.id`,
    [organisationId]
  );
  return rows.map((r) => ({
    id: r.id,
    label: r.title?.trim() || [r.type_name, r.level_code].filter(Boolean).join(' ') || '—',
    startDate: r.start_date,
    endDate: r.end_date,
    cancelled: r.status === 'cancelled',
  }));
}

export type OrganisationOffer = {
  id: string;
  number: string;
  status: OfferStatus;
  title: string;
  groupName: string | null;
  arrival: Date | null;
  departure: Date | null;
  createdAt: Date;
};

export async function organisationOffers(organisationId: string): Promise<OrganisationOffer[]> {
  const rows = await query<{
    id: string;
    year: number;
    seq: number;
    status: OfferStatus;
    title: string;
    group_name: string | null;
    arrival: Date | null;
    departure: Date | null;
    created_at: Date;
  }>(
    `SELECT id, year, seq, status, title, group_name, arrival, departure, created_at FROM offers
      WHERE organisation_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC, id`,
    [organisationId]
  );
  return rows.map((r) => ({
    id: r.id,
    number: formatOfferNumber(r.year, r.seq),
    status: r.status,
    title: r.title,
    groupName: r.group_name,
    arrival: r.arrival,
    departure: r.departure,
    createdAt: r.created_at,
  }));
}

export type OrganisationLetter = { id: string; kind: LetterKind; subject: string; sentAt: Date; sentByName: string | null };

/** How many letters the tab lists, the latest first. */
export const LETTERS_SHOWN = 50;

/** The letters sent to it, the latest first, with how many there are in all. */
export async function organisationLetters(organisationId: string): Promise<{ items: OrganisationLetter[]; total: number }> {
  const [rows, total] = await Promise.all([
    query<{ id: string; kind: LetterKind; subject: string; sent_at: Date; sent_by_name: string | null }>(
      `SELECT l.id, l.kind, l.subject, l.sent_at, s.name AS sent_by_name
         FROM letters l LEFT JOIN staff_users s ON s.id = l.sent_by
        WHERE l.organisation_id = $1
        ORDER BY l.sent_at DESC, l.id LIMIT ${LETTERS_SHOWN}`,
      [organisationId]
    ),
    queryFirst<{ n: string }>(`SELECT count(*) AS n FROM letters WHERE organisation_id = $1`, [organisationId]),
  ]);
  return {
    items: rows.map((r) => ({ id: r.id, kind: r.kind, subject: r.subject, sentAt: r.sent_at, sentByName: r.sent_by_name })),
    total: Number(total?.n ?? 0),
  };
}

// ------------------------------------------------------------- for the forms

export async function organisationCountries(): Promise<{ code: string; name: Bilingual }[]> {
  const rows = await query<{ code: string; name_de: string; name_en: string }>(`SELECT code, name_de, name_en FROM countries ORDER BY name_de`);
  return rows.map((r) => ({ code: r.code.trim(), name: { de: r.name_de, en: r.name_en } }));
}

/** The kinds of charge a commission can be on: those that carry one first (the course price), then the rest. */
export async function commissionChargeTypes(): Promise<{ code: string; name: Bilingual }[]> {
  const rows = await query<{ code: string; name_de: string | null; name_en: string }>(
    `SELECT code, name_de, name_en FROM charge_types WHERE is_active ORDER BY is_commissionable DESC, position, code`
  );
  return rows.map((r) => ({ code: r.code, name: { de: r.name_de?.trim() || r.name_en, en: r.name_en } }));
}

// ------------------------------------------------------------------ mutations

export type OrganisationInput = {
  name: string;
  kind: OrganisationKind;
  address: string | null;
  countryCode: string | null;
  language: 'de' | 'en';
  email: string | null;
  phone: string | null;
  agreement: string | null;
  note: string | null;
};

export async function createOrganisation(input: OrganisationInput, actor: StaffUser): Promise<string> {
  const row = await queryFirst<{ id: string }>(
    `INSERT INTO organisations (name, kind, address, country_code, language, email, phone, agreement, note, created_by)
     VALUES ($1, $2, $3, (SELECT code FROM countries WHERE code = $4), $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [input.name, input.kind, input.address, input.countryCode, input.language, input.email, input.phone, input.agreement, input.note, actor.id]
  );
  const id = row!.id;
  await logActivity({ actor, entity: 'organisation', entityId: id, action: 'organisation_created', detail: { kind: input.kind } });
  return id;
}

export async function updateOrganisation(id: string, input: OrganisationInput, actor: StaffUser): Promise<Result> {
  const rows = await query<{ id: string }>(
    `UPDATE organisations
        SET name = $2, kind = $3, address = $4, country_code = (SELECT code FROM countries WHERE code = $5), language = $6,
            email = $7, phone = $8, agreement = $9, note = $10
      WHERE id = $1 RETURNING id`,
    [id, input.name, input.kind, input.address, input.countryCode, input.language, input.email, input.phone, input.agreement, input.note]
  );
  if (!rows.length) return GONE;
  await logActivity({ actor, entity: 'organisation', entityId: id, action: 'organisation_updated' });
  return { ok: true };
}

/** No longer worked with, or again: nothing moves, the lists show it muted and under „Inaktiv". */
export async function setOrganisationActive(id: string, active: boolean, actor: StaffUser): Promise<Result> {
  const rows = await query<{ id: string }>(`UPDATE organisations SET is_active = $2 WHERE id = $1 RETURNING id`, [id, active]);
  if (!rows.length) return GONE;
  await logActivity({ actor, entity: 'organisation', entityId: id, action: active ? 'organisation_reactivated' : 'organisation_deactivated' });
  return { ok: true };
}

/** What names an organisation, and so keeps it from being deleted. */
type Holds = { bookings: number; offers: number; groups: number; courses: number; letters: number; fromSchoolMan: boolean };

const HOLDS = `
  SELECT (SELECT count(*) FROM bookings b WHERE b.payer_organisation_id = o.id AND b.deleted_at IS NULL) AS bookings,
         (SELECT count(*) FROM offers f WHERE f.organisation_id = o.id AND f.deleted_at IS NULL) AS offers,
         (SELECT count(*) FROM group_visits v WHERE v.organisation_id = o.id OR v.agency_id = o.id) AS groups,
         (SELECT count(*) FROM courses c WHERE c.organisation_id = o.id) AS courses,
         (SELECT count(*) FROM letters l WHERE l.organisation_id = o.id) AS letters,
         EXISTS (SELECT 1 FROM filemaker_links fl WHERE fl.entity = 'organisation' AND fl.entity_id = o.id) AS from_schoolman
    FROM organisations o WHERE o.id = $1`;

type HoldsRow = { bookings: string; offers: string; groups: string; courses: string; letters: string; from_schoolman: boolean };
const toHolds = (r: HoldsRow): Holds => ({
  bookings: Number(r.bookings),
  offers: Number(r.offers),
  groups: Number(r.groups),
  courses: Number(r.courses),
  letters: Number(r.letters),
  fromSchoolMan: r.from_schoolman,
});
const named = (h: Holds) => h.bookings + h.offers + h.groups + h.courses + h.letters;
const held = (h: Holds) => named(h) > 0 || h.fromSchoolMan;

/** Whether „Löschen" can be offered: nothing names it, and it did not come from SchoolMan. */
export async function organisationDeletable(id: string): Promise<boolean> {
  const row = await queryFirst<HoldsRow>(HOLDS, [id]);
  return Boolean(row) && !held(toHolds(row!));
}

/** „3 Buchungen und 1 Angebot": what names it, in words. */
function holdsWords(h: Holds): Bilingual {
  const parts: { de: string; en: string }[] = [];
  const add = (n: number, de: [string, string], en: [string, string]) => {
    if (n) parts.push({ de: `${n} ${n === 1 ? de[0] : de[1]}`, en: `${n} ${n === 1 ? en[0] : en[1]}` });
  };
  add(h.bookings, ['Buchung', 'Buchungen'], ['booking', 'bookings']);
  add(h.offers, ['Angebot', 'Angebote'], ['offer', 'offers']);
  add(h.groups, ['Gruppe', 'Gruppen'], ['group', 'groups']);
  add(h.courses, ['Kurs', 'Kurse'], ['course', 'courses']);
  add(h.letters, ['Brief', 'Briefe'], ['letter', 'letters']);
  const join = (words: string[], and: string) => (words.length > 1 ? `${words.slice(0, -1).join(', ')} ${and} ${words[words.length - 1]}` : (words[0] ?? ''));
  return { de: join(parts.map((p) => p.de), 'und'), en: join(parts.map((p) => p.en), 'and') };
}

/**
 * Gone, for an organisation entered by mistake: only while no booking, offer, group, course or letter names it
 * and it did not come from SchoolMan. One CASA worked with is set inactive instead. Its contacts and
 * commission terms go with it.
 */
export async function deleteOrganisation(id: string, actor: StaffUser): Promise<Result> {
  const outcome = await withTransaction(async (client): Promise<Result & { name?: string }> => {
    // Locked first: a booking or an offer pointed at it meanwhile waits for this, and is counted.
    const locked = await client.query<{ name: string }>(`SELECT name FROM organisations WHERE id = $1 FOR UPDATE`, [id]);
    if (!locked.rows[0]) return GONE;
    const holds = toHolds((await client.query<HoldsRow>(HOLDS, [id])).rows[0]);
    if (named(holds) > 0) {
      const what = holdsWords(holds);
      const many = named(holds) > 1;
      return refuse(
        `${what.de} ${many ? 'nennen' : 'nennt'} diese Organisation — setz sie auf inaktiv, statt sie zu löschen.`,
        `${what.en} ${many ? 'name' : 'names'} this organisation — set it inactive instead of deleting it.`
      );
    }
    if (holds.fromSchoolMan) {
      return refuse(
        'Diese Organisation kommt aus SchoolMan — setz sie auf inaktiv, statt sie zu löschen.',
        'This organisation comes from SchoolMan — set it inactive instead of deleting it.'
      );
    }
    await client.query(`DELETE FROM organisations WHERE id = $1`, [id]);
    return { ok: true, name: locked.rows[0].name };
  });
  if (!outcome.ok) return outcome;
  await logActivity({ actor, entity: 'organisation', entityId: id, action: 'organisation_deleted', detail: { name: outcome.name } });
  return { ok: true };
}

// ------------------------------------------------------------------ contacts

export type ContactInput = {
  salutation: ContactSalutation;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
};

const organisationExists = async (id: string) => Boolean(await queryFirst<{ id: string }>(`SELECT id FROM organisations WHERE id = $1`, [id]));

/** A contact added, or one corrected. One address belongs to one contact of an organisation. */
export async function saveContact(organisationId: string, contactId: string | null, input: ContactInput, actor: StaffUser): Promise<Result> {
  if (!(await organisationExists(organisationId))) return GONE;
  if (input.email) {
    const taken = await queryFirst<{ id: string }>(
      `SELECT id FROM organisation_contacts WHERE organisation_id = $1 AND lower(email) = lower($2) AND ($3::uuid IS NULL OR id <> $3::uuid)`,
      [organisationId, input.email, contactId]
    );
    if (taken) return refuse('Diese E-Mail-Adresse hat schon ein anderer Kontakt hier.', 'Another contact here already has that email address.');
  }
  const values = [input.salutation, input.firstName, input.lastName, input.email, input.phone, input.role];
  if (contactId) {
    const rows = await query<{ id: string }>(
      `UPDATE organisation_contacts SET salutation = $3, first_name = $4, last_name = $5, email = $6, phone = $7, role = $8
        WHERE id = $1 AND organisation_id = $2 RETURNING id`,
      [contactId, organisationId, ...values]
    );
    if (!rows.length) return refuse('Diesen Kontakt gibt es nicht mehr.', 'This contact no longer exists.');
  } else {
    await query(
      `INSERT INTO organisation_contacts (organisation_id, salutation, first_name, last_name, email, phone, role, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [organisationId, ...values, actor.id]
    );
  }
  // The trail says that a contact changed, never who: the organisation's page has the names.
  await logActivity({ actor, entity: 'organisation', entityId: organisationId, action: contactId ? 'organisation_contact_updated' : 'organisation_contact_added' });
  return { ok: true };
}

export async function removeContact(organisationId: string, contactId: string, actor: StaffUser): Promise<void> {
  const rows = await query<{ id: string }>(`DELETE FROM organisation_contacts WHERE id = $1 AND organisation_id = $2 RETURNING id`, [contactId, organisationId]);
  if (rows.length) await logActivity({ actor, entity: 'organisation', entityId: organisationId, action: 'organisation_contact_removed' });
}

// ---------------------------------------------------------------- commission

export type CommissionInput = { chargeTypeCode: string; percentage: number; note: string | null };

/** An agency's share of a kind of charge, added or corrected. */
export async function saveCommission(organisationId: string, termId: string | null, input: CommissionInput, actor: StaffUser): Promise<Result> {
  if (!(await organisationExists(organisationId))) return GONE;
  const known = await queryFirst<{ code: string }>(`SELECT code FROM charge_types WHERE code = $1`, [input.chargeTypeCode]);
  if (!known) return refuse('Bitte wähle, worauf die Provision gilt.', 'Choose what the commission is on.');
  if (termId) {
    const rows = await query<{ id: string }>(
      `UPDATE agency_commissions SET charge_type_code = $3, percentage = $4, note = $5 WHERE id = $1 AND organisation_id = $2 RETURNING id`,
      [termId, organisationId, input.chargeTypeCode, input.percentage, input.note]
    );
    if (!rows.length) return refuse('Diese Provision gibt es nicht mehr.', 'This commission no longer exists.');
  } else {
    await query(
      `INSERT INTO agency_commissions (organisation_id, charge_type_code, percentage, note, created_by) VALUES ($1, $2, $3, $4, $5)`,
      [organisationId, input.chargeTypeCode, input.percentage, input.note, actor.id]
    );
  }
  await logActivity({
    actor,
    entity: 'organisation',
    entityId: organisationId,
    action: termId ? 'organisation_commission_updated' : 'organisation_commission_added',
    detail: { percentage: input.percentage, chargeType: input.chargeTypeCode },
  });
  return { ok: true };
}

export async function removeCommission(organisationId: string, termId: string, actor: StaffUser): Promise<void> {
  const rows = await query<{ id: string }>(`DELETE FROM agency_commissions WHERE id = $1 AND organisation_id = $2 RETURNING id`, [termId, organisationId]);
  if (rows.length) await logActivity({ actor, entity: 'organisation', entityId: organisationId, action: 'organisation_commission_removed' });
}
