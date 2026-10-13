import 'server-only';

import type { PoolClient } from 'pg';

import type { StaffUser } from '../auth';
import { query, queryFirst, withTransaction } from '../db';
import { issueLetter, lettersForOffer, saveStandardText, standardTexts, type LetterListItem } from '../letters/repo';
import { todayInputValue, toDateInputValue } from '@/lib/dates';

import { hasProblems, offerChecks } from './checks';
import { OFFER_TEXT_DEFAULTS, offerLetter, type OfferTexts } from './document';
import { newManualKey } from './draft-ops';
import { buildLines, computeTotals } from './engine';
import { resolveRecipient, upsertContact } from './recipients';
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
  type Salutation,
  type StayState,
} from './types';
import { DEFAULT_TITLE, VALID_FOR_DAYS, type NewOfferInput } from './wizard';

/**
 * Offers in the database. docs/OFFERS.md has the model.
 *
 * Every save recomputes the lines on the server from the draft with the same
 * pure engine the page uses, and replaces the stored lines in the same
 * transaction; the client never sends an amount it computed itself, only the
 * prices typed over the computed ones. Sending writes the letter to `letters`
 * (docs/LETTERS.md) in the transaction that marks the offer as sent.
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

export type RelatedOffer = { id: string; number: string; title: string; status: OfferStatus; createdAt: Date; perParticipant: number | null };

export type OfferRecord = {
  meta: OfferMeta;
  draft: OfferDraft;
  lines: OfferLine[];
  totals: OfferTotals;
  checks: OfferCheck[];
  /** The letters sent, the latest first. */
  letters: LetterListItem[];
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

/**
 * Lines, totals and checks for a draft. Group prices come from the packages of
 * the groups page (src/config/gruppen/packages.ts), so pricing needs no query;
 * an individual offer's lines were priced from `rates` when they were added.
 */
export function priceDraft(draft: OfferDraft) {
  const lines = buildLines(draft);
  const totals = computeTotals(draft, lines);
  const checks = offerChecks(draft, lines, today());
  return { lines, totals, checks };
}

export async function getOffer(id: string): Promise<OfferRecord | null> {
  const row = await queryFirst<OfferRow>(`${OFFER_SELECT} WHERE o.id = $1 AND o.deleted_at IS NULL`, [id]);
  if (!row) return null;
  const draft = draftFromRow(row);

  // A draft is priced live, so a price change shows at once. An offer that
  // has gone out shows the lines it went out with.
  let lines: OfferLine[];
  let totals: OfferTotals;
  let checks: OfferCheck[];
  if (row.status === 'draft') {
    ({ lines, totals, checks } = priceDraft(draft));
  } else {
    lines = await storedLines(id);
    totals = computeTotals(draft, lines);
    checks = [];
  }

  const [letters, related, enquiry] = await Promise.all([
    lettersForOffer(id),
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
    letters,
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
    included: boolean;
  }>(
    `SELECT key, audience, charge_type_code, description, quantity, unit, unit_amount, amount, list_unit_amount, rate_id, included
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
    included: r.included,
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
                                unit_amount, amount, list_unit_amount, rate_id, included)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [offerId, position, l.audience, l.key, l.chargeType, l.description, l.quantity, l.unit, l.unitAmount, l.amount, l.listUnitAmount, l.rateId, l.included]
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
    const priced = priceDraft(draft);
    await client.query(
      `UPDATE offers SET ${DRAFT_COLUMNS}, revision = revision + 1, updated_by = $25 WHERE id = $1`,
      [id, ...draftParams(draft), actor.id]
    );
    await writeLines(client, id, priced.lines);
    return { ok: true, revision: baseRevision + 1, ...priced };
  });
}

/**
 * A new offer from the wizard: its recipient found or created, filled from the
 * enquiry it answers and from the earlier offer it repeats, numbered, priced
 * and stored — one transaction, so a failed step leaves nothing behind.
 */
export async function createOffer(input: NewOfferInput, actor: StaffUser): Promise<string> {
  return withTransaction(async (client) => {
    const to = await resolveRecipient(client, input.recipient, input.language, actor);

    let stay: StayState = { choices: { ...DEFAULT_STAY }, overrides: {}, manual: [] };
    let presentation: OfferDraft['presentation'] = 'itemised';
    let participants: number | null = null;
    let escorts = 0;
    let basedOn: string | null = null;
    if (input.basedOn) {
      const { rows } = await client.query<{ id: string; stay: unknown; presentation: OfferDraft['presentation']; participants: number | null; escorts: number }>(
        `SELECT id, stay, presentation, participants, escorts FROM offers WHERE id = $1 AND deleted_at IS NULL`,
        [input.basedOn]
      );
      if (rows[0]) {
        basedOn = rows[0].id;
        stay = normaliseStay(rows[0].stay);
        presentation = rows[0].presentation;
        participants = rows[0].participants;
        escorts = rows[0].escorts;
      }
    }
    if (input.kind === 'group' && input.group) {
      stay = { ...stay, choices: { ...stay.choices, package: input.group.package, weeks: input.group.weeks } };
      participants = input.group.participants ?? participants;
      escorts = input.group.escorts;
    }
    if (input.lines.length) {
      stay = {
        ...stay,
        manual: [
          ...stay.manual,
          ...input.lines.map((l) => ({
            key: newManualKey(),
            audience: 'participant' as const,
            chargeType: l.chargeType,
            description: input.language === 'de' ? l.de : l.en,
            quantity: 1,
            unitAmount: l.unitAmount,
          })),
        ],
      };
    }

    const draft: OfferDraft = {
      kind: input.kind,
      language: input.language,
      presentation,
      title: input.title || DEFAULT_TITLE[input.kind][input.language],
      groupName: input.groupName,
      organisationId: to.organisationId,
      recipientName: to.name,
      contactSalutation: to.salutation,
      contactFirstName: to.firstName,
      contactLastName: to.lastName,
      contactEmail: to.email,
      address: to.address,
      countryCode: to.countryCode,
      arrival: input.group?.arrival ?? null,
      departure: input.group?.departure ?? null,
      participants: input.kind === 'group' ? participants : null,
      escorts: input.kind === 'group' ? escorts : 0,
      stay,
      intro: null,
      closing: null,
      note: null,
      validUntil: input.validUntil ?? addDays(today(), VALID_FOR_DAYS),
      ownerId: input.ownerId ?? actor.id,
    };

    const { year, seq } = await nextNumber(client);
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO offers (year, seq, person_id, enquiry_id, copied_from, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING id`,
      [year, seq, to.personId, input.enquiryId, basedOn, actor.id]
    );
    const id = rows[0].id;
    const priced = priceDraft(draft);
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
    const priced = priceDraft(draft);
    await client.query(`UPDATE offers SET ${DRAFT_COLUMNS} WHERE id = $1`, [newId, ...draftParams(draft)]);
    await writeLines(client, newId, priced.lines);
    return newId;
  });
}

// ------------------------------------------------------------- sending

export type SendResult = { ok: true } | { ok: false; error: string };

async function nameOf(client: PoolClient, sql: string, value: string): Promise<string | null> {
  const { rows } = await client.query<{ name: string }>(sql, [value]);
  return rows[0]?.name ?? null;
}

/**
 * The offer goes out: its letter is kept in `letters` as it is now, the status
 * moves to sent, and the organisation learns the address and the contact it
 * was sent to. Refused while a check reports a problem — that is what kept
 * FileMaker's empty offer 37622 from being stopped.
 */
export async function markSent(id: string, actor: StaffUser): Promise<SendResult> {
  const texts = await offerTexts();
  return withTransaction(async (client) => {
    const { rows } = await client.query<OfferRow>(`${OFFER_SELECT} WHERE o.id = $1 AND o.deleted_at IS NULL FOR UPDATE OF o`, [id]);
    const row = rows[0];
    if (!row) return { ok: false, error: 'This offer no longer exists.' };
    if (row.status !== 'draft') return { ok: false, error: 'This offer has already been sent.' };
    const draft = draftFromRow(row);
    const priced = priceDraft(draft);
    if (hasProblems(priced.checks)) {
      return { ok: false, error: priced.checks.filter((c) => c.level === 'problem').map((c) => c.message).join(' · ') };
    }
    const version = row.version + 1;
    const countryName = draft.countryCode
      ? await nameOf(client, `SELECT ${draft.language === 'de' ? 'name_de' : 'name_en'} AS name FROM countries WHERE code = $1`, draft.countryCode)
      : null;
    const signatureName = draft.ownerId ? ((await nameOf(client, `SELECT name FROM staff_users WHERE id = $1`, draft.ownerId)) ?? actor.name) : actor.name;
    const letter = offerLetter(draft, priced.lines, priced.totals, {
      number: formatOfferNumber(row.year, row.seq),
      version,
      date: today(),
      countryName,
      signatureName,
      standard: texts[draft.language],
    });

    await writeLines(client, id, priced.lines);
    await issueLetter(
      client,
      {
        letter,
        about: { offerId: id },
        version,
        organisationId: draft.organisationId,
        personId: row.person_id,
        recipientName: draft.recipientName,
        email: draft.contactEmail,
        source: { draft, lines: priced.lines, totals: priced.totals },
      },
      actor
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
        `UPDATE organisations SET name = $2, address = $3, country_code = $4, language = $5 WHERE id = $1`,
        [draft.organisationId, draft.recipientName, draft.address || null, draft.countryCode, draft.language]
      );
      if (draft.contactFirstName || draft.contactLastName || draft.contactEmail) {
        await upsertContact(
          client,
          draft.organisationId,
          { salutation: draft.contactSalutation, firstName: draft.contactFirstName, lastName: draft.contactLastName, email: draft.contactEmail },
          actor
        );
      }
    }
    return { ok: true };
  });
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

// ------------------------------------------------------- standard texts

export type StandardTexts = Record<OfferLanguage, OfferTexts>;

/** The offer letter's opening and closing per language: CASA's own, else the written defaults. */
export async function offerTexts(): Promise<StandardTexts> {
  const t = await standardTexts('offer', OFFER_TEXT_DEFAULTS);
  return {
    de: { intro: t.de.intro, closing: t.de.closing },
    en: { intro: t.en.intro, closing: t.en.closing },
  };
}

export async function saveOfferText(language: OfferLanguage, part: keyof OfferTexts, body: string, actor: StaffUser) {
  await saveStandardText('offer', language, part, body, actor);
}

// ------------------------------------------------------------ options

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

