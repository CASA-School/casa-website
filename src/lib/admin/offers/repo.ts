import 'server-only';

import type { PoolClient } from 'pg';

import type { StaffUser } from '../auth';
import { query, queryFirst, withTransaction } from '../db';
import { todayInputValue, toDateInputValue } from '@/lib/dates';

import { hasProblems, offerChecks } from './checks';
import { DEFAULT_TEXT, type OfferLetter } from './document';
import { buildLines, computeTotals, measure, EMPTY_RATE_CARD, type GroupRateCard, type Rate } from './engine';
import { choicesFromBrief, participantsFromBrief } from './from-enquiry';
import { normaliseStay } from './schema';
import { addDays } from './stay';
import {
  DEFAULT_STAY,
  formatOfferNumber,
  type OfferCheck,
  type OfferDraft,
  type OfferKind,
  type OfferLanguage,
  type OfferLine,
  type OfferStatus,
  type OfferTotals,
  type OrganisationKind,
  type Salutation,
  type StayState,
} from './types';

/**
 * Offers in the database. docs/OFFERS.md has the model.
 *
 * Every save recomputes the lines on the server from the draft and the rates
 * valid on the arrival date, and replaces the stored lines in the same
 * transaction; the client never sends an amount it computed itself, only the
 * prices typed over the computed ones.
 */

// ------------------------------------------------------------------ reads

type OfferRow = {
  id: string;
  year: number;
  seq: number;
  kind: OfferKind;
  status: OfferStatus;
  language: OfferLanguage;
  presentation: 'itemised' | 'package';
  title: string;
  group_name: string | null;
  organisation_id: string | null;
  person_id: string | null;
  enquiry_id: string | null;
  recipient_name: string;
  contact_salutation: Salutation;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_email: string | null;
  address: string | null;
  country_code: string | null;
  arrival: Date | null;
  departure: Date | null;
  participants: number | null;
  escorts: number;
  stay: unknown;
  intro: string | null;
  closing: string | null;
  note: string | null;
  valid_until: Date | null;
  owner_id: string | null;
  revision: number;
  version: number;
  sent_at: Date | null;
  decided_at: Date | null;
  decision_note: string | null;
  copied_from: string | null;
  created_at: Date;
  updated_at: Date;
  owner_name: string | null;
  created_by_name: string | null;
  sent_by_name: string | null;
  decided_by_name: string | null;
};

const dateOrNull = (d: Date | null) => (d ? toDateInputValue(d) : null);

function draftFromRow(r: OfferRow): OfferDraft {
  return {
    kind: r.kind,
    language: r.language,
    presentation: r.presentation,
    title: r.title,
    groupName: r.group_name ?? '',
    organisationId: r.organisation_id,
    recipientName: r.recipient_name,
    contactSalutation: r.contact_salutation,
    contactFirstName: r.contact_first_name ?? '',
    contactLastName: r.contact_last_name ?? '',
    contactEmail: r.contact_email ?? '',
    address: r.address ?? '',
    countryCode: r.country_code ? r.country_code.trim() : null,
    arrival: dateOrNull(r.arrival),
    departure: dateOrNull(r.departure),
    participants: r.participants,
    escorts: r.escorts,
    stay: normaliseStay(r.stay),
    intro: r.intro,
    closing: r.closing,
    note: r.note,
    validUntil: dateOrNull(r.valid_until),
    ownerId: r.owner_id,
  };
}

const OFFER_SELECT = `
  SELECT o.*, ow.name AS owner_name, cb.name AS created_by_name,
         sb.name AS sent_by_name, db.name AS decided_by_name
    FROM offers o
    LEFT JOIN staff_users ow ON ow.id = o.owner_id
    LEFT JOIN staff_users cb ON cb.id = o.created_by
    LEFT JOIN staff_users sb ON sb.id = o.sent_by
    LEFT JOIN staff_users db ON db.id = o.decided_by`;

/** Today, unless an offer that has gone out keeps the day it went. */
const today = () => todayInputValue();

export type OfferListFilter = 'open' | 'draft' | 'sent' | 'accepted' | 'declined' | 'all';
export const OFFER_FILTERS: readonly OfferListFilter[] = ['open', 'draft', 'sent', 'accepted', 'declined', 'all'];

export type OfferListItem = {
  id: string;
  number: string;
  kind: OfferKind;
  status: OfferStatus;
  title: string;
  groupName: string | null;
  recipientName: string;
  arrival: string | null;
  departure: string | null;
  participants: number | null;
  escorts: number;
  perParticipant: number | null;
  groupTotal: number | null;
  ownerName: string | null;
  validUntil: string | null;
  sentAt: Date | null;
  updatedAt: Date;
  /** Sent, no answer, and either past its validity or quiet for ten days. */
  followUp: 'expired' | 'chase' | null;
};

const FILTER_SQL: Record<OfferListFilter, string> = {
  open: `o.status IN ('draft', 'sent')`,
  draft: `o.status = 'draft'`,
  sent: `o.status = 'sent'`,
  accepted: `o.status = 'accepted'`,
  declined: `o.status IN ('declined', 'withdrawn')`,
  all: 'true',
};

/** Days without an answer after which a sent offer is worth a follow-up. */
export const FOLLOW_UP_AFTER_DAYS = 10;

export async function listOffers({ filter, q }: { filter: OfferListFilter; q?: string }): Promise<OfferListItem[]> {
  const params: unknown[] = [];
  let search = '';
  if (q && q.trim()) {
    params.push(`%${q.trim().toLowerCase()}%`);
    search = `AND (lower(o.title) LIKE $1 OR lower(coalesce(o.group_name, '')) LIKE $1
                   OR lower(o.recipient_name) LIKE $1 OR (o.year || '-' || lpad(o.seq::text, 3, '0')) LIKE $1
                   OR lower(coalesce(o.contact_last_name, '')) LIKE $1)`;
  }
  const rows = await query<
    OfferRow & { p_sum: string | null; e_sum: string | null }
  >(
    `${OFFER_SELECT.replace('SELECT o.*,', `SELECT o.*,
       (SELECT sum(amount) FROM offer_lines l WHERE l.offer_id = o.id AND l.audience = 'participant') AS p_sum,
       (SELECT sum(amount) FROM offer_lines l WHERE l.offer_id = o.id AND l.audience = 'escort') AS e_sum,`)}
     WHERE o.deleted_at IS NULL AND ${FILTER_SQL[filter]} ${search}
     ORDER BY CASE o.status WHEN 'sent' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
              o.updated_at DESC
     LIMIT 200`,
    params
  );
  const now = today();
  return rows.map((r) => {
    const stay = normaliseStay(r.stay);
    const p = r.p_sum == null ? null : Number(r.p_sum);
    const e = r.e_sum == null ? null : Number(r.e_sum);
    const paidEscorts = r.kind === 'group' && stay.choices.escortPricing === 'paid' && r.escorts > 0 && e != null;
    const groupTotal =
      r.kind === 'individual' ? p : r.participants && p != null ? r.participants * p + (paidEscorts ? r.escorts * e! : 0) : null;
    const validUntil = dateOrNull(r.valid_until);
    const sentDay = r.sent_at ? toDateInputValue(r.sent_at) : null;
    const followUp =
      r.status !== 'sent'
        ? null
        : validUntil && validUntil < now
          ? 'expired'
          : sentDay && addDays(sentDay, FOLLOW_UP_AFTER_DAYS) <= now
            ? 'chase'
            : null;
    return {
      id: r.id,
      number: formatOfferNumber(r.year, r.seq),
      kind: r.kind,
      status: r.status,
      title: r.title,
      groupName: r.group_name,
      recipientName: r.recipient_name,
      arrival: dateOrNull(r.arrival),
      departure: dateOrNull(r.departure),
      participants: r.participants,
      escorts: r.escorts,
      perParticipant: p,
      groupTotal,
      ownerName: r.owner_name,
      validUntil,
      sentAt: r.sent_at,
      updatedAt: r.updated_at,
      followUp,
    };
  });
}

export async function offerCounts(): Promise<Record<OfferListFilter, number>> {
  const [r] = await query<Record<OfferListFilter, string>>(
    `SELECT count(*) FILTER (WHERE ${FILTER_SQL.open}) AS open,
            count(*) FILTER (WHERE ${FILTER_SQL.draft}) AS draft,
            count(*) FILTER (WHERE ${FILTER_SQL.sent}) AS sent,
            count(*) FILTER (WHERE ${FILTER_SQL.accepted}) AS accepted,
            count(*) FILTER (WHERE ${FILTER_SQL.declined}) AS declined,
            count(*) AS all
       FROM offers o WHERE o.deleted_at IS NULL`
  );
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v)])) as Record<OfferListFilter, number>;
}

// ------------------------------------------------------------ rate card

type RateJson = { id: string; amount: string | number; unit: Rate['unit'] } | null;
const asRate = (r: RateJson): Rate | null => (r ? { id: r.id, amount: Number(r.amount), unit: r.unit } : null);

/**
 * The group rates one stay needs, resolved by `applicable_rate()` for its
 * arrival date (today while it has none). Variant rates only: none of these
 * is ever an individual learner's price (db/seeds/0007).
 */
export async function loadGroupRateCard(draft: OfferDraft, db: Pick<PoolClient, 'query'> | null = null): Promise<GroupRateCard> {
  if (draft.kind !== 'group') return EMPTY_RATE_CARD;
  const { weeks } = measure(draft);
  const c = draft.stay.choices;
  const r = (args: string) => `(SELECT json_build_object('id', id, 'amount', amount, 'unit', unit) FROM rates WHERE id = applicable_rate(${args}))`;
  const sql = `SELECT
      ${r(`'course_type', $1::date, p_course_type_id => (SELECT id FROM course_types WHERE slug = 'german-for-groups')`)} AS tuition,
      ${r(`'charge_type', $1::date, p_charge_type_code => 'teaching_material', p_variant => 'group'`)} AS materials,
      ${r(`'charge_type', $1::date, p_charge_type_code => 'administrative_charge', p_variant => 'group'`)} AS handling,
      ${r(`'charge_type', $1::date, p_charge_type_code => 'catering', p_variant => 'canteen'`)} AS canteen,
      ${r(`'charge_type', $1::date, p_charge_type_code => 'culture_programme', p_variant => $5`)} AS culture,
      ${r(`'accommodation', $1::date, p_accommodation_type_code => 'with_germans', p_catering_code => 'half_board', p_room_type_code => $3, p_quantity => $2, p_variant => 'group'`)} AS room,
      ${r(`'accommodation', $1::date, p_accommodation_type_code => 'with_germans', p_catering_code => 'half_board', p_room_type_code => $4, p_quantity => $2, p_variant => 'group'`)} AS escort_room,
      ${r(`'charge_type', $1::date, p_charge_type_code => 'travel_ticket', p_variant => 'student-week'`)} AS sw,
      ${r(`'charge_type', $1::date, p_charge_type_code => 'travel_ticket', p_variant => 'student-month'`)} AS sm,
      ${r(`'charge_type', $1::date, p_charge_type_code => 'travel_ticket', p_variant => 'adult-week'`)} AS aw,
      ${r(`'charge_type', $1::date, p_charge_type_code => 'travel_ticket', p_variant => 'adult-month'`)} AS am`;
  const params = [draft.arrival ?? today(), weeks, c.room, c.escortRoom, c.culture === 'none' ? null : c.culture];
  type Row = Record<'tuition' | 'materials' | 'handling' | 'canteen' | 'culture' | 'room' | 'escort_room' | 'sw' | 'sm' | 'aw' | 'am', RateJson>;
  const row = db ? (await db.query<Row>(sql, params)).rows[0] : await queryFirst<Row>(sql, params);
  if (!row) return EMPTY_RATE_CARD;
  return {
    tuition: asRate(row.tuition),
    materials: asRate(row.materials),
    handling: asRate(row.handling),
    canteen: asRate(row.canteen),
    culture: asRate(row.culture),
    room: asRate(row.room),
    escortRoom: asRate(row.escort_room),
    tickets: {
      'student-week': asRate(row.sw),
      'student-month': asRate(row.sm),
      'adult-week': asRate(row.aw),
      'adult-month': asRate(row.am),
    },
  };
}

// ------------------------------------------------------------ one offer

export type OfferMeta = {
  id: string;
  number: string;
  status: OfferStatus;
  revision: number;
  version: number;
  personId: string | null;
  enquiryId: string | null;
  copiedFrom: string | null;
  createdAt: Date;
  createdByName: string | null;
  ownerName: string | null;
  sentAt: Date | null;
  sentByName: string | null;
  decidedAt: Date | null;
  decidedByName: string | null;
  decisionNote: string | null;
};

export type OfferVersionItem = { version: number; sentAt: Date; sentByName: string | null };
export type RelatedOffer = { id: string; number: string; title: string; status: OfferStatus; createdAt: Date; perParticipant: number | null };

export type OfferRecord = {
  meta: OfferMeta;
  draft: OfferDraft;
  lines: OfferLine[];
  totals: OfferTotals;
  checks: OfferCheck[];
  versions: OfferVersionItem[];
  related: RelatedOffer[];
  enquiryBrief: { preferredDates: string | null; message: string | null } | null;
};

function metaFromRow(r: OfferRow): OfferMeta {
  return {
    id: r.id,
    number: formatOfferNumber(r.year, r.seq),
    status: r.status,
    revision: r.revision,
    version: r.version,
    personId: r.person_id,
    enquiryId: r.enquiry_id,
    copiedFrom: r.copied_from,
    createdAt: r.created_at,
    createdByName: r.created_by_name,
    ownerName: r.owner_name,
    sentAt: r.sent_at,
    sentByName: r.sent_by_name,
    decidedAt: r.decided_at,
    decidedByName: r.decided_by_name,
    decisionNote: r.decision_note,
  };
}

/** Lines, totals and checks for a draft, priced now. */
export async function priceDraft(draft: OfferDraft, db: Pick<PoolClient, 'query'> | null = null) {
  const card = await loadGroupRateCard(draft, db);
  const lines = buildLines(draft, card);
  const totals = computeTotals(draft, lines);
  const checks = offerChecks(draft, lines, today());
  return { lines, totals, checks };
}

export async function getOffer(id: string): Promise<OfferRecord | null> {
  const row = await queryFirst<OfferRow>(`${OFFER_SELECT} WHERE o.id = $1 AND o.deleted_at IS NULL`, [id]);
  if (!row) return null;
  const draft = draftFromRow(row);

  // A draft is priced live, so a price list change shows at once. An offer
  // that has gone out shows the lines it went out with.
  let lines: OfferLine[];
  let totals: OfferTotals;
  let checks: OfferCheck[];
  if (row.status === 'draft') {
    ({ lines, totals, checks } = await priceDraft(draft));
  } else {
    lines = await storedLines(id);
    totals = computeTotals(draft, lines);
    checks = [];
  }

  const [versions, related, enquiry] = await Promise.all([
    query<{ version: number; sent_at: Date; sent_by_name: string | null }>(
      `SELECT v.version, v.sent_at, s.name AS sent_by_name
         FROM offer_versions v LEFT JOIN staff_users s ON s.id = v.sent_by
        WHERE v.offer_id = $1 ORDER BY v.version DESC`,
      [id]
    ),
    row.organisation_id
      ? query<{ id: string; year: number; seq: number; title: string; status: OfferStatus; created_at: Date; p_sum: string | null }>(
          `SELECT o.id, o.year, o.seq, o.title, o.status, o.created_at,
                  (SELECT sum(amount) FROM offer_lines l WHERE l.offer_id = o.id AND l.audience = 'participant') AS p_sum
             FROM offers o
            WHERE o.organisation_id = $1 AND o.id <> $2 AND o.deleted_at IS NULL
            ORDER BY o.created_at DESC LIMIT 8`,
          [row.organisation_id, id]
        )
      : Promise.resolve([]),
    row.enquiry_id
      ? queryFirst<{ organiser_brief: Record<string, unknown> | null; message: string | null }>(
          `SELECT organiser_brief, message FROM enquiries WHERE id = $1`,
          [row.enquiry_id]
        )
      : Promise.resolve(undefined),
  ]);

  return {
    meta: metaFromRow(row),
    draft,
    lines,
    totals,
    checks,
    versions: versions.map((v) => ({ version: v.version, sentAt: v.sent_at, sentByName: v.sent_by_name })),
    related: related.map((o) => ({
      id: o.id,
      number: formatOfferNumber(o.year, o.seq),
      title: o.title,
      status: o.status,
      createdAt: o.created_at,
      perParticipant: o.p_sum == null ? null : Number(o.p_sum),
    })),
    enquiryBrief: enquiry
      ? {
          preferredDates: typeof enquiry.organiser_brief?.preferredDates === 'string' ? (enquiry.organiser_brief.preferredDates as string) : null,
          message: enquiry.message,
        }
      : null,
  };
}

async function storedLines(offerId: string): Promise<OfferLine[]> {
  const rows = await query<{
    key: string;
    audience: 'participant' | 'escort';
    charge_type_code: string;
    description: string;
    quantity: string;
    unit: string;
    unit_amount: string | null;
    amount: string | null;
    list_unit_amount: string | null;
    rate_id: string | null;
  }>(
    `SELECT key, audience, charge_type_code, description, quantity, unit, unit_amount, amount, list_unit_amount, rate_id
       FROM offer_lines WHERE offer_id = $1 ORDER BY position`,
    [offerId]
  );
  const n = (v: string | null) => (v == null ? null : Number(v));
  return rows.map((r) => ({
    key: r.key,
    audience: r.audience,
    chargeType: r.charge_type_code,
    description: r.description,
    quantity: Number(r.quantity),
    unit: r.unit,
    unitAmount: n(r.unit_amount),
    amount: n(r.amount),
    listUnitAmount: n(r.list_unit_amount),
    rateId: r.rate_id,
    manual: r.key.startsWith('manual:'),
    customText: false,
  }));
}

// ------------------------------------------------------------ writes

async function nextNumber(client: PoolClient): Promise<{ year: number; seq: number }> {
  const year = Number(today().slice(0, 4));
  await client.query(`SELECT pg_advisory_xact_lock(hashtext('offers.number'), $1)`, [year]);
  const { rows } = await client.query<{ seq: number }>(
    `SELECT coalesce(max(seq), 0) + 1 AS seq FROM offers WHERE year = $1`,
    [year]
  );
  return { year, seq: rows[0].seq };
}

async function writeLines(client: PoolClient, offerId: string, lines: OfferLine[]) {
  await client.query(`DELETE FROM offer_lines WHERE offer_id = $1`, [offerId]);
  let position = 0;
  for (const l of lines) {
    position += 1;
    await client.query(
      `INSERT INTO offer_lines (offer_id, position, audience, key, charge_type_code, description, quantity, unit,
                                unit_amount, amount, list_unit_amount, rate_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [offerId, position, l.audience, l.key, l.chargeType, l.description, l.quantity, l.unit, l.unitAmount, l.amount, l.listUnitAmount, l.rateId]
    );
  }
}

const DRAFT_COLUMNS = `kind = $2, language = $3, presentation = $4, title = $5, group_name = $6, organisation_id = $7,
  recipient_name = $8, contact_salutation = $9, contact_first_name = $10, contact_last_name = $11, contact_email = $12,
  address = $13, country_code = $14, arrival = $15, departure = $16, participants = $17, escorts = $18, stay = $19,
  intro = $20, closing = $21, note = $22, valid_until = $23, owner_id = $24`;

function draftParams(d: OfferDraft) {
  return [
    d.kind,
    d.language,
    d.presentation,
    d.title,
    d.groupName || null,
    d.organisationId,
    d.recipientName,
    d.contactSalutation,
    d.contactFirstName || null,
    d.contactLastName || null,
    d.contactEmail || null,
    d.address || null,
    d.countryCode,
    d.arrival,
    d.departure,
    d.participants,
    d.escorts,
    JSON.stringify(d.stay),
    d.intro,
    d.closing,
    d.note,
    d.validUntil,
    d.ownerId,
  ];
}

export type SaveResult =
  | { ok: true; revision: number; lines: OfferLine[]; totals: OfferTotals; checks: OfferCheck[] }
  | { ok: false; error: string; stale?: boolean };

/**
 * One save of the editor: the whole draft, conditional on the revision the
 * editor started from. A colleague's save in between makes it stale, and the
 * editor offers a reload instead of overwriting their change.
 */
export async function saveOffer(id: string, draft: OfferDraft, baseRevision: number, actor: StaffUser): Promise<SaveResult> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ revision: number; status: OfferStatus }>(
      `SELECT revision, status FROM offers WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [id]
    );
    const current = rows[0];
    if (!current) return { ok: false, error: 'This offer no longer exists.' };
    if (current.status !== 'draft') return { ok: false, error: 'Only a draft can be changed. Revise the offer first.' };
    if (current.revision !== baseRevision) {
      return { ok: false, stale: true, error: 'A colleague has changed this offer in the meantime.' };
    }
    const priced = await priceDraft(draft, client);
    await client.query(
      `UPDATE offers SET ${DRAFT_COLUMNS}, revision = revision + 1, updated_by = $25 WHERE id = $1`,
      [id, ...draftParams(draft), actor.id]
    );
    await writeLines(client, id, priced.lines);
    return { ok: true, revision: baseRevision + 1, ...priced };
  });
}

export type NewOffer = {
  kind: OfferKind;
  language: OfferLanguage;
  recipientName: string;
  organisationId: string | null;
  organisationKind: OrganisationKind | null;
  enquiryId: string | null;
  personId: string | null;
};

const DEFAULT_TITLE = {
  group: { de: 'Deutschkurs in Bremen', en: 'German course in Bremen' },
  individual: { de: 'Deutschkurs', en: 'German course' },
} as const;

/** How long a new offer is valid. */
export const VALID_FOR_DAYS = 28;

export async function createOffer(input: NewOffer, actor: StaffUser): Promise<string> {
  return withTransaction(async (client) => {
    const draft: OfferDraft = {
      kind: input.kind,
      language: input.language,
      presentation: 'itemised',
      title: DEFAULT_TITLE[input.kind][input.language],
      groupName: '',
      organisationId: null,
      recipientName: input.recipientName.trim(),
      contactSalutation: 'none',
      contactFirstName: '',
      contactLastName: '',
      contactEmail: '',
      address: '',
      countryCode: null,
      arrival: null,
      departure: null,
      participants: null,
      escorts: 0,
      stay: { choices: { ...DEFAULT_STAY }, overrides: {}, manual: [] },
      intro: null,
      closing: null,
      note: null,
      validUntil: addDays(today(), VALID_FOR_DAYS),
      ownerId: actor.id,
    };

    // From an enquiry: the organiser, their brief, their language.
    if (input.enquiryId) {
      const { rows } = await client.query<{
        first_name: string;
        last_name: string | null;
        email: string;
        locale: string;
        organiser_brief: Record<string, unknown> | null;
      }>(`SELECT first_name, last_name, email, locale, organiser_brief FROM enquiries WHERE id = $1`, [input.enquiryId]);
      const e = rows[0];
      if (e) {
        draft.contactFirstName = e.first_name;
        draft.contactLastName = e.last_name ?? '';
        draft.contactEmail = e.email;
        const org = typeof e.organiser_brief?.organisationName === 'string' ? (e.organiser_brief.organisationName as string) : '';
        if (!draft.recipientName) draft.recipientName = org || [e.first_name, e.last_name].filter(Boolean).join(' ');
        if (input.kind === 'group') {
          draft.stay.choices = choicesFromBrief(e.organiser_brief);
          draft.participants = participantsFromBrief(e.organiser_brief);
        }
      }
    }

    // For a learner: their name and their address.
    if (input.personId) {
      const { rows } = await client.query<{ salutation: string | null; first_name: string; last_name: string | null; email: string | null }>(
        `SELECT p.salutation, p.first_name, p.last_name,
                (SELECT address FROM emails WHERE person_id = p.id ORDER BY created_at DESC LIMIT 1) AS email
           FROM people p WHERE p.id = canonical_person_id($1)`,
        [input.personId]
      );
      const p = rows[0];
      if (p) {
        draft.contactSalutation = p.salutation === 'ms' || p.salutation === 'mr' ? p.salutation : 'none';
        draft.contactFirstName = p.first_name;
        draft.contactLastName = p.last_name ?? '';
        draft.contactEmail = p.email ?? '';
        if (!draft.recipientName) draft.recipientName = [p.first_name, p.last_name].filter(Boolean).join(' ');
      }
    }

    // An organisation picked from the list lends its contact and address; a
    // new name becomes an organisation, so its next offer finds this one.
    if (input.organisationId) {
      const { rows } = await client.query<{
        name: string;
        address: string | null;
        country_code: string | null;
        contact_salutation: Salutation;
        contact_first_name: string | null;
        contact_last_name: string | null;
        contact_email: string | null;
        language: OfferLanguage;
      }>(`SELECT * FROM organisations WHERE id = $1`, [input.organisationId]);
      const o = rows[0];
      if (o) {
        draft.organisationId = input.organisationId;
        draft.recipientName = o.name;
        draft.address = o.address ?? '';
        draft.countryCode = o.country_code?.trim() ?? null;
        if (!draft.contactEmail) {
          draft.contactSalutation = o.contact_salutation;
          draft.contactFirstName = o.contact_first_name ?? '';
          draft.contactLastName = o.contact_last_name ?? '';
          draft.contactEmail = o.contact_email ?? '';
        }
      }
    } else if (input.kind === 'group' && draft.recipientName) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO organisations (name, kind, language, contact_first_name, contact_last_name, contact_email, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          draft.recipientName,
          input.organisationKind ?? 'other',
          draft.language,
          draft.contactFirstName || null,
          draft.contactLastName || null,
          draft.contactEmail || null,
          actor.id,
        ]
      );
      draft.organisationId = rows[0].id;
    }

    const { year, seq } = await nextNumber(client);
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO offers (year, seq, person_id, enquiry_id, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $5) RETURNING id`,
      [year, seq, input.personId, input.enquiryId, actor.id]
    );
    const id = rows[0].id;
    const priced = await priceDraft(draft, client);
    await client.query(`UPDATE offers SET ${DRAFT_COLUMNS} WHERE id = $1`, [id, ...draftParams(draft)]);
    await writeLines(client, id, priced.lines);
    return id;
  });
}

/** A new draft with everything but the history: a variant, or next year's offer. */
export async function duplicateOffer(id: string, actor: StaffUser): Promise<string | null> {
  const row = await queryFirst<OfferRow>(`${OFFER_SELECT} WHERE o.id = $1 AND o.deleted_at IS NULL`, [id]);
  if (!row) return null;
  const draft = { ...draftFromRow(row), validUntil: addDays(today(), VALID_FOR_DAYS), ownerId: actor.id };
  return withTransaction(async (client) => {
    const { year, seq } = await nextNumber(client);
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO offers (year, seq, person_id, enquiry_id, copied_from, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING id`,
      [year, seq, row.person_id, row.enquiry_id, id, actor.id]
    );
    const newId = rows[0].id;
    const priced = await priceDraft(draft, client);
    await client.query(`UPDATE offers SET ${DRAFT_COLUMNS} WHERE id = $1`, [newId, ...draftParams(draft)]);
    await writeLines(client, newId, priced.lines);
    return newId;
  });
}

export type SendResult = { ok: true; letter: OfferLetter } | { ok: false; error: string };

/**
 * The offer goes out: its letter is frozen as a version, the status moves to
 * sent, and the organisation learns the address and contact it was sent to.
 * Refused while a check reports a problem — that is what kept FileMaker's
 * empty offer 37622 from being stopped.
 */
export async function markSent(id: string, actor: StaffUser, letterFor: (draft: OfferDraft, lines: OfferLine[], totals: OfferTotals, number: string, version: number, countryName: string | null, signatureName: string | null) => OfferLetter): Promise<SendResult> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<OfferRow>(
      `${OFFER_SELECT} WHERE o.id = $1 AND o.deleted_at IS NULL FOR UPDATE OF o`,
      [id]
    );
    const row = rows[0];
    if (!row) return { ok: false, error: 'This offer no longer exists.' };
    if (row.status !== 'draft') return { ok: false, error: 'This offer has already been sent.' };
    const draft = draftFromRow(row);
    const priced = await priceDraft(draft, client);
    if (hasProblems(priced.checks)) {
      return { ok: false, error: priced.checks.filter((c) => c.level === 'problem').map((c) => c.message).join(' · ') };
    }
    const version = row.version + 1;
    const country = draft.countryCode
      ? (await client.query<{ name: string }>(
          `SELECT ${draft.language === 'de' ? 'name_de' : 'name_en'} AS name FROM countries WHERE code = $1`,
          [draft.countryCode]
        )).rows[0]?.name ?? null
      : null;
    const signer = draft.ownerId
      ? (await client.query<{ name: string }>(`SELECT name FROM staff_users WHERE id = $1`, [draft.ownerId])).rows[0]?.name ?? actor.name
      : actor.name;
    const letter = letterFor(draft, priced.lines, priced.totals, formatOfferNumber(row.year, row.seq), version, country, signer);

    await writeLines(client, id, priced.lines);
    await client.query(
      `INSERT INTO offer_versions (offer_id, version, document, sent_by) VALUES ($1, $2, $3, $4)`,
      [id, version, JSON.stringify({ letter, lines: priced.lines, totals: priced.totals, draft }), actor.id]
    );
    await client.query(
      `UPDATE offers SET status = 'sent', version = $2, sent_at = now(), sent_by = $3,
                         decided_at = NULL, decided_by = NULL, decision_note = NULL,
                         revision = revision + 1, updated_by = $3
        WHERE id = $1`,
      [id, version, actor.id]
    );
    if (draft.organisationId) {
      await client.query(
        `UPDATE organisations
            SET name = $2, address = $3, country_code = $4, contact_salutation = $5,
                contact_first_name = $6, contact_last_name = $7, contact_email = $8, language = $9
          WHERE id = $1`,
        [
          draft.organisationId,
          draft.recipientName,
          draft.address || null,
          draft.countryCode,
          draft.contactSalutation,
          draft.contactFirstName || null,
          draft.contactLastName || null,
          draft.contactEmail || null,
          draft.language,
        ]
      );
    }
    return { ok: true, letter };
  });
}

export async function getSentLetter(id: string, version: number): Promise<OfferLetter | null> {
  const row = await queryFirst<{ document: { letter: OfferLetter } }>(
    `SELECT document FROM offer_versions WHERE offer_id = $1 AND version = $2`,
    [id, version]
  );
  return row?.document.letter ?? null;
}

export type Decision = 'accepted' | 'declined' | 'withdrawn';

export async function decideOffer(id: string, decision: Decision, note: string | null, actor: StaffUser): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `UPDATE offers SET status = $2, decided_at = now(), decided_by = $3, decision_note = $4,
                       revision = revision + 1, updated_by = $3
      WHERE id = $1 AND deleted_at IS NULL
        AND status = ANY(CASE WHEN $2 = 'withdrawn' THEN ARRAY['draft', 'sent'] ELSE ARRAY['sent'] END)
      RETURNING id`,
    [id, decision, actor.id, note]
  );
  return rows.length > 0;
}

/** Back to a draft. The versions sent so far stay as they were sent. */
export async function reviseOffer(id: string, actor: StaffUser): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `UPDATE offers SET status = 'draft', decided_at = NULL, decided_by = NULL, decision_note = NULL,
                       valid_until = CASE WHEN valid_until < current_date THEN current_date + $3::int ELSE valid_until END,
                       revision = revision + 1, updated_by = $2
      WHERE id = $1 AND deleted_at IS NULL AND status <> 'draft' RETURNING id`,
    [id, actor.id, VALID_FOR_DAYS]
  );
  return rows.length > 0;
}

export async function deleteOffer(id: string, actor: StaffUser): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `UPDATE offers SET deleted_at = now(), updated_by = $2 WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
    [id, actor.id]
  );
  return rows.length > 0;
}

/** The offers made from an enquiry or for a learner, for the record they came from. */
export async function offersFor(where: { enquiryId?: string; personId?: string }): Promise<{ id: string; number: string; status: OfferStatus }[]> {
  const rows = await query<{ id: string; year: number; seq: number; status: OfferStatus }>(
    `SELECT id, year, seq, status FROM offers
      WHERE deleted_at IS NULL AND (enquiry_id = $1 OR person_id = $2)
      ORDER BY created_at DESC LIMIT 5`,
    [where.enquiryId ?? null, where.personId ?? null]
  );
  return rows.map((r) => ({ id: r.id, number: formatOfferNumber(r.year, r.seq), status: r.status }));
}

// ------------------------------------------------------- who it is for

export type RecipientResult =
  | { type: 'organisation'; id: string; name: string; detail: string; language: OfferLanguage }
  | { type: 'student'; id: string; name: string; detail: string }
  | { type: 'enquiry'; id: string; name: string; detail: string; kind: 'group' | 'company' | 'general'; language: OfferLanguage };

const KIND_WORD: Record<string, string> = { school: 'School', agency: 'Agency', company: 'Company', public_body: 'Public body', other: 'Organisation' };

/**
 * The start of a new offer: who it is for. Earlier recipients, students and
 * group enquiries, matched on what is typed; with nothing typed, the group
 * enquiries still waiting for an offer and the latest recipients.
 */
export async function findRecipients(q: string): Promise<RecipientResult[]> {
  const term = q.trim().toLowerCase();
  const like = `%${term}%`;
  const [orgs, students, enquiries] = await Promise.all([
    query<{ id: string; name: string; kind: string; language: OfferLanguage; offers: string; last: Date | null }>(
      `SELECT g.id, g.name, g.kind, g.language,
              (SELECT count(*) FROM offers o WHERE o.organisation_id = g.id AND o.deleted_at IS NULL) AS offers,
              (SELECT max(o.created_at) FROM offers o WHERE o.organisation_id = g.id AND o.deleted_at IS NULL) AS last
         FROM organisations g
        WHERE $1 = '' OR lower(g.name) LIKE $2
        ORDER BY last DESC NULLS LAST, lower(g.name) LIMIT $3`,
      [term, like, term ? 6 : 4]
    ),
    term.length >= 2
      ? query<{ id: string; first_name: string; last_name: string | null; email: string | null }>(
          `SELECT p.id, p.first_name, p.last_name,
                  (SELECT address FROM emails e WHERE e.person_id = p.id ORDER BY created_at DESC LIMIT 1) AS email
             FROM people p
            WHERE p.deleted_at IS NULL AND p.merged_into IS NULL
              AND (lower(p.first_name || ' ' || coalesce(p.last_name, '')) LIKE $1
                   OR EXISTS (SELECT 1 FROM emails e WHERE e.person_id = p.id AND lower(e.address) LIKE $1))
            ORDER BY lower(p.last_name), lower(p.first_name) LIMIT 6`,
          [like]
        )
      : Promise.resolve([]),
    query<{ id: string; kind: 'group' | 'company' | 'general'; locale: string; first_name: string; last_name: string | null; brief: Record<string, unknown> | null; submitted_at: Date }>(
      `SELECT e.id, e.kind, e.locale, e.first_name, e.last_name, e.organiser_brief AS brief, e.submitted_at
         FROM enquiries e
        WHERE e.kind IN ('group', 'company')
          AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.enquiry_id = e.id AND o.deleted_at IS NULL)
          AND ($1 = '' OR lower(coalesce(e.organiser_brief->>'organisationName', '') || ' ' || e.first_name || ' ' || coalesce(e.last_name, '') || ' ' || e.email) LIKE $2)
        ORDER BY e.submitted_at DESC LIMIT 5`,
      [term, like]
    ),
  ]);

  const day = (d: Date) => toDateInputValue(d).split('-').reverse().join('.');
  return [
    ...enquiries.map((e) => {
      const org = typeof e.brief?.organisationName === 'string' ? (e.brief.organisationName as string) : '';
      const size = e.brief?.groupSize ? `${e.brief.groupSize} people` : '';
      const when = typeof e.brief?.preferredDates === 'string' ? (e.brief.preferredDates as string) : '';
      return {
        type: 'enquiry' as const,
        id: e.id,
        name: org || [e.first_name, e.last_name].filter(Boolean).join(' '),
        detail: [e.kind === 'company' ? 'Company enquiry' : 'Group enquiry', day(e.submitted_at), size, when].filter(Boolean).join(' · '),
        kind: e.kind,
        language: (e.locale === 'de' ? 'de' : 'en') as OfferLanguage,
      };
    }),
    ...orgs.map((o) => ({
      type: 'organisation' as const,
      id: o.id,
      name: o.name,
      detail: [KIND_WORD[o.kind] ?? 'Organisation', Number(o.offers) === 1 ? '1 offer' : `${o.offers} offers`, o.last ? `last ${day(o.last)}` : ''].filter(Boolean).join(' · '),
      language: o.language,
    })),
    ...students.map((p) => ({
      type: 'student' as const,
      id: p.id,
      name: [p.first_name, p.last_name].filter(Boolean).join(' '),
      detail: ['Student', p.email].filter(Boolean).join(' · '),
    })),
  ];
}

// ------------------------------------------------------- standard texts

export type StandardTexts = Record<OfferLanguage, { intro: string; closing: string }>;

/** The letter's standard opening and closing, per language: CASA's own, else the written defaults. */
export async function standardTexts(): Promise<StandardTexts> {
  const rows = await query<{ language: OfferLanguage; part: 'intro' | 'closing'; body: string }>(
    `SELECT language, part, body FROM offer_texts`
  );
  const out: StandardTexts = {
    de: { ...DEFAULT_TEXT.de },
    en: { ...DEFAULT_TEXT.en },
  };
  for (const r of rows) out[r.language][r.part] = r.body;
  return out;
}

export async function saveStandardText(language: OfferLanguage, part: 'intro' | 'closing', body: string, actor: StaffUser) {
  await query(
    `INSERT INTO offer_texts (language, part, body, updated_by) VALUES ($1, $2, $3, $4)
     ON CONFLICT (language, part) DO UPDATE SET body = EXCLUDED.body, updated_by = EXCLUDED.updated_by,
                                                updated_at = timezone('utc', now())`,
    [language, part, body, actor.id]
  );
}

// ------------------------------------------------------------ options

export type OrganisationOption = { id: string; name: string; kind: OrganisationKind; offers: number };

export async function listOrganisations(): Promise<OrganisationOption[]> {
  const rows = await query<{ id: string; name: string; kind: OrganisationKind; offers: string }>(
    `SELECT g.id, g.name, g.kind,
            (SELECT count(*) FROM offers o WHERE o.organisation_id = g.id AND o.deleted_at IS NULL) AS offers
       FROM organisations g ORDER BY lower(g.name)`
  );
  return rows.map((r) => ({ id: r.id, name: r.name, kind: r.kind, offers: Number(r.offers) }));
}

export type EditorOptions = {
  staff: { id: string; name: string }[];
  countries: { code: string; de: string; en: string }[];
  chargeTypes: { code: string; de: string; en: string }[];
};

export async function editorOptions(): Promise<EditorOptions> {
  const [staff, countries, chargeTypes] = await Promise.all([
    query<{ id: string; name: string }>(`SELECT id, name FROM staff_users WHERE is_active ORDER BY name`),
    query<{ code: string; name_de: string; name_en: string }>(`SELECT code, name_de, name_en FROM countries ORDER BY name_de`),
    query<{ code: string; name_de: string; name_en: string }>(
      `SELECT code, name_de, name_en FROM charge_types WHERE is_active ORDER BY position`
    ),
  ]);
  return {
    staff,
    countries: countries.map((c) => ({ code: c.code.trim(), de: c.name_de, en: c.name_en })),
    chargeTypes: chargeTypes.map((c) => ({ code: c.code, de: c.name_de, en: c.name_en })),
  };
}

/** One thing from the price list, as a line it would add, in both languages. */
export type PriceListItem = {
  group: string;
  label: string;
  chargeType: string;
  de: string;
  en: string;
  unitAmount: number | null;
};

const ddmmyy = (d: Date) => toDateInputValue(d).split('-').reverse().join('.');

/**
 * What an individual offer is made of: an upcoming course at its price, the
 * enrolment fee, a book, an exam. The same rates the booking wizard prices a
 * booking from, so an offer and the booking that follows it agree.
 */
export async function priceListOptions(): Promise<PriceListItem[]> {
  const [courses, fee, books, exams] = await Promise.all([
    query<{
      name: string;
      name_de: string | null;
      level_code: string | null;
      start_date: Date;
      end_date: Date;
      rate_amount: string | null;
      rate_unit: string | null;
      default_price: string;
    }>(
      `SELECT t.name, t.name_de, i.level_code, i.start_date, i.end_date,
              rt.amount AS rate_amount, rt.unit::text AS rate_unit, t.default_price
         FROM course_instances i
         JOIN course_types t ON t.id = i.course_type_id
         LEFT JOIN rates rt ON rt.id = applicable_rate(
           'course_type'::rate_scope, i.start_date, i.course_type_id, NULL, NULL, NULL, NULL,
           NULL, NULL, i.level_code, i.session, NULL, NULL)
        WHERE i.start_date >= current_date AND i.status <> 'cancelled' AND t.slug <> 'german-for-groups'
        ORDER BY i.start_date, t.name LIMIT 60`
    ),
    queryFirst<{ amount: string }>(
      `SELECT amount FROM rates WHERE id = applicable_rate('charge_type', current_date, p_charge_type_code => 'enrolment_fee')`
    ),
    query<{ title: string; price: string | null }>(
      `SELECT m.title, (SELECT amount FROM rates WHERE id = applicable_rate('material', current_date, p_material_id => m.id)) AS price
         FROM materials m WHERE m.is_active ORDER BY m.level_code NULLS LAST, m.part NULLS LAST, m.title`
    ),
    query<{ name: string; both: string | null; one: string | null }>(
      `SELECT e.name,
              (SELECT amount FROM rates WHERE id = applicable_rate('exam_type', current_date, p_exam_type_id => e.id, p_parts => 2::smallint)) AS both,
              (SELECT amount FROM rates WHERE id = applicable_rate('exam_type', current_date, p_exam_type_id => e.id, p_parts => 1::smallint)) AS one
         FROM exam_types e WHERE e.is_active ORDER BY e.name`
    ),
  ]);

  const items: PriceListItem[] = [];
  for (const c of courses) {
    const weeks = Math.max(1, Math.round((c.end_date.getTime() - c.start_date.getTime()) / 86_400_000 / 7));
    const rate = c.rate_amount == null ? null : Number(c.rate_amount);
    const published = Number(c.default_price);
    const amount = rate != null ? (c.rate_unit === 'week' || c.rate_unit === 'person_week' ? rate * weeks : rate) : published > 0 ? published : null;
    const span = `${ddmmyy(c.start_date)}–${ddmmyy(c.end_date)}`;
    const level = c.level_code ? ` ${c.level_code}` : '';
    items.push({
      group: 'Courses',
      label: `${c.name}${level} · ${span}`,
      chargeType: 'tuition',
      de: `${c.name_de ?? c.name}${level}, ${span} (${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'})`,
      en: `${c.name}${level}, ${span} (${weeks} ${weeks === 1 ? 'week' : 'weeks'})`,
      unitAmount: amount,
    });
  }
  items.push({
    group: 'Fees',
    label: 'Enrolment fee',
    chargeType: 'enrolment_fee',
    de: 'Einschreibegebühr',
    en: 'Enrolment fee',
    unitAmount: fee ? Number(fee.amount) : null,
  });
  for (const b of books) {
    items.push({ group: 'Books', label: b.title, chargeType: 'books', de: b.title, en: b.title, unitAmount: b.price == null ? null : Number(b.price) });
  }
  for (const e of exams) {
    if (e.both != null) items.push({ group: 'Exams', label: `${e.name} · both parts`, chargeType: 'exam_fee', de: `Prüfung ${e.name}`, en: `Exam ${e.name}`, unitAmount: Number(e.both) });
    if (e.one != null) items.push({ group: 'Exams', label: `${e.name} · one part`, chargeType: 'exam_fee', de: `Prüfung ${e.name} (ein Teil)`, en: `Exam ${e.name} (one part)`, unitAmount: Number(e.one) });
  }
  return items;
}

export type { StayState };
