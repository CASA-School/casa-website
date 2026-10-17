import type { PoolClient } from 'pg';

import { logActivity } from './activity';
import { resolveCourse } from './courses';
import type { StaffUser } from './auth';
import { query, queryFirst, withTransaction } from './db';
import { ratedParts, type ExamOutcome, type ExamParts } from './exam-parts';
import { closeOnExamBooking, sittingHasPlace, sittingWords } from './exams';
import { raiseFlag } from './flags';
import { closeOnBooking, logClosedByBooking, type WaitlistEntryCore } from './waitlist';
import { bookedLevelLabel, PAYMENT_SUBJECTS } from './booking-levels';
import { pick, type Bilingual, type WsLang } from './i18n';

/**
 * Bookings — a person's confirmed place on a course, with dates, cost lines
 * and payments.
 *
 * Modelled on what the team does on FileMaker's Booking screen (2026-09-09):
 * choose the person and the course, set the dates and weeks, add the cost
 * lines (enrolment fee, course price, books, a cancellation as a negative
 * line), record payments one by one with a subject and a method. What changed
 * is what docs/FILEMAKER_LESSONS.md §11.6 lists — one thing per row, dates as
 * rows, no unknown state, money voided rather than deleted.
 */

export type BookingStatus = 'reserved' | 'confirmed' | 'completed' | 'cancelled';
export type Payer = 'self' | 'agency' | 'company' | 'other';
export type ChargeKind =
  | 'enrolment_fee'
  | 'tuition'
  | 'books'
  | 'exam_fee'
  | 'accommodation'
  | 'deposit'
  | 'cancellation'
  | 'discount'
  | 'other';
export type PaymentMethod = 'card' | 'cash' | 'transfer' | 'carryover' | 'agency' | 'offset';

export const BOOKING_STATUSES: readonly BookingStatus[] = [
  'reserved',
  'confirmed',
  'completed',
  'cancelled',
];
/** The labels below are read with `pick(lang, …)` (docs/ADMIN_I18N.md). */
export const BOOKING_STATUS_LABELS: Record<BookingStatus, Bilingual> = {
  reserved: { de: 'Reserviert', en: 'Reserved' },
  confirmed: { de: 'Bestätigt', en: 'Confirmed' },
  completed: { de: 'Abgeschlossen', en: 'Completed' },
  cancelled: { de: 'Storniert', en: 'Cancelled' },
};
export const BOOKING_STATUS_TONES: Record<
  BookingStatus,
  'accent' | 'neutral' | 'positive' | 'quiet' | 'warning'
> = {
  reserved: 'accent',
  confirmed: 'positive',
  completed: 'neutral',
  cancelled: 'quiet',
};
export const PAYER_LABELS: Record<Payer, Bilingual> = {
  self: { de: 'Lernende(r)', en: 'Learner' },
  agency: { de: 'Agentur', en: 'Agency' },
  company: { de: 'Firma', en: 'Company' },
  other: { de: 'Sonstige', en: 'Other' },
};
export const CHARGE_KIND_LABELS: Record<ChargeKind, Bilingual> = {
  enrolment_fee: { de: 'Einschreibegebühr', en: 'Enrolment fee' },
  tuition: { de: 'Kurspreis', en: 'Course price' },
  books: { de: 'Bücher', en: 'Books' },
  exam_fee: { de: 'Prüfungsgebühr', en: 'Exam fee' },
  accommodation: { de: 'Unterkunft', en: 'Accommodation' },
  deposit: { de: 'Kaution', en: 'Deposit' },
  cancellation: { de: 'Stornierung', en: 'Cancellation' },
  discount: { de: 'Rabatt', en: 'Discount' },
  other: { de: 'Sonstiges', en: 'Other' },
};
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, Bilingual> = {
  card: { de: 'Karte', en: 'Card' },
  cash: { de: 'Bar', en: 'Cash' },
  transfer: { de: 'Überweisung', en: 'Bank transfer' },
  carryover: { de: 'Übertragen', en: 'Carried over' },
  agency: { de: 'Über die Agentur', en: 'Via agency' },
  offset: { de: 'Verrechnet', en: 'Offset' },
};

/**
 * Why a booking is under observation — the team's yellow (u.B., *unter Beobachtung*). The other
 * three colours are not typed: red is the cancellation, grey and green follow from the money.
 */
export type ObservationReason = 'level' | 'visa' | 'attendance' | 'documents' | 'other';
export const OBSERVATION_REASONS: readonly ObservationReason[] = ['level', 'visa', 'attendance', 'documents', 'other'];
export const OBSERVATION_REASON_LABELS: Record<ObservationReason, Bilingual> = {
  level: { de: 'Niveau', en: 'Level' },
  visa: { de: 'Visum', en: 'Visa' },
  attendance: { de: 'Anwesenheit', en: 'Attendance' },
  documents: { de: 'Unterlagen fehlen', en: 'Documents missing' },
  other: { de: 'Sonstiges', en: 'Other' },
};

/**
 * The booking's colour, as the team reads it in SchoolMan (docs/schoolman/bookings.md):
 * red when it is cancelled, yellow while a colleague has it under observation, grey — SchoolMan’s „unklar", „Offen" here —
 * until the charges are paid in full, green when all is well. Worked out, never stored, so it
 * cannot go stale the way SchoolMan's `???` does.
 */
export type BookingLight = 'ok' | 'watch' | 'unclear' | 'no';
export const BOOKING_LIGHT_LABELS: Record<BookingLight, Bilingual> = {
  ok: { de: 'In Ordnung', en: 'All good' },
  watch: { de: 'Unter Beobachtung', en: 'Under observation' },
  unclear: { de: 'Offen', en: 'Unpaid' },
  no: { de: 'Storniert', en: 'Cancelled' },
};

/**
 * The colour's word, saying what the grey is (2026-10-17: „Unklar" said nothing): „Offen" while nothing
 * has come in, „Anzahlung erhalten" once part of it has, „Ohne Kosten" while nothing is charged.
 */
export function bookingLightLabel(b: Parameters<typeof bookingLight>[0] & { imported?: boolean }): Bilingual {
  const light = bookingLight(b);
  if (light !== 'unclear') return BOOKING_LIGHT_LABELS[light];
  // A booking brought across from SchoolMan keeps its charges and payments there (0052).
  if (b.charged <= 0.005 && b.imported) return { de: 'Kosten in SchoolMan', en: 'Charges in SchoolMan' };
  if (b.charged <= 0.005) return { de: 'Ohne Kosten', en: 'No charges' };
  if (b.paid > 0.005) return { de: 'Anzahlung erhalten', en: 'Part paid' };
  return BOOKING_LIGHT_LABELS.unclear;
}

/** Paid in full means something was charged and nothing of it is open. */
export const paidInFull = (charged: number, paid: number) => charged > 0.005 && paid >= charged - 0.005;

export function bookingLight(b: {
  status: BookingStatus;
  observationReason: ObservationReason | null;
  charged: number;
  paid: number;
}): BookingLight {
  if (b.status === 'cancelled') return 'no';
  if (b.observationReason) return 'watch';
  return paidInFull(b.charged, b.paid) ? 'ok' : 'unclear';
}

/**
 * Words the workspace writes into a booking by itself (a default reason, an
 * extension's line) are stored in English whoever saves them, so the data reads
 * one way; a screen shows them in its reader's language.
 */
const STORED_WORDS: Record<string, Bilingual> = {
  Extension: { de: 'Verlängerung', en: 'Extension' },
  Voided: { de: 'Storniert', en: 'Voided' },
  'Voided by staff': { de: 'Vom Team storniert', en: 'Voided by staff' },
  Cancelled: { de: 'Storniert', en: 'Cancelled' },
  'Credit carried over': { de: 'Guthaben übertragen', en: 'Credit carried over' },
  ...Object.fromEntries(PAYMENT_SUBJECTS.flatMap((s) => [[s.de, s], [s.en, s]])),
};

export const storedWords = (value: string, lang: WsLang): string => {
  const known = STORED_WORDS[value];
  return known ? pick(lang, known) : value;
};

export type BookingListItem = {
  id: string;
  /** "B-2026-0042": the year it was booked and a running number (0033). */
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
  createdAt: Date;
  observationReason: ObservationReason | null;
  observationNote: string | null;
  /** An exam booking (0036): the sitting and the parts sat; its name and day are the sitting's. */
  examSessionId: string | null;
  examParts: ExamParts | null;
  /** Brought across from SchoolMan (0052): its money is SchoolMan's while bookings are made there. */
  imported: boolean;
  /** The stay booked (0013), as codes: a list names them from `stayVocabulary()`. */
  stay: { typeCode: string; roomTypeCode: string | null; cateringCode: string | null; from: Date | null; to: Date | null } | null;
};

/** A vocabulary's name in both languages: the German where it has one. */
const both = (en: string | null, de: string | null): Bilingual | null => (en ? { de: de?.trim() || en, en } : null);

export type BookingPeriod = {
  id: string;
  courseInstanceId: string | null;
  cohortLabel: string | null;
  startDate: Date;
  endDate: Date;
  kind: 'initial' | 'extension';
  /** The level taught in this period: what a start's places are counted by (0031). */
  levelCode: string | null;
};

export type BookingCharge = {
  id: string;
  kind: ChargeKind;
  description: string;
  amount: number;
  createdAt: Date;
};

export type Payment = {
  id: string;
  amount: number;
  method: PaymentMethod;
  receivedAt: Date;
  subject: string;
  reference: string | null;
  recordedByName: string | null;
  voidedAt: Date | null;
  voidReason: string | null;
  /** A carry-over's other side: the booking the credit went to (amount below zero) or came from. */
  counterpart: { id: string; courseTypeName: string | null; startDate: Date | null } | null;
};

export type BookingExam = {
  sessionId: string;
  examTypeId: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  deadline: Date | null;
  parts: ExamParts;
  filedAt: Date | null;
  filedByName: string | null;
  sourceRegistrationId: string | null;
  /** telc's outcome per part sat, once entered (0038), and its handover. */
  result: { written: ExamOutcome | null; oral: ExamOutcome | null; collectedAt: Date | null; collectedNote: string | null } | null;
};

export type BookingDetail = BookingListItem & {
  courseTypeId: string | null;
  payer: Payer;
  payerName: string | null;
  visaRequired: boolean;
  notes: string | null;
  sourceRegistrationId: string | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  observedAt: Date | null;
  observedByName: string | null;
  /** What was booked (0013), whether or not a rate has priced it; each name in both languages. */
  accommodation: {
    typeCode: string;
    roomTypeCode: string | null;
    cateringCode: string | null;
    typeName: Bilingual;
    roomTypeName: Bilingual | null;
    cateringName: Bilingual | null;
    from: Date | null;
    to: Date | null;
  } | null;
  periods: BookingPeriod[];
  /** How much of a level the booking teaches: „A2.1", or „A2.1–A2.2" for a whole level (`bookedLevelLabel`). */
  levelRange: string | null;
  /** What an exam booking is for (0036): the sitting, its day and deadline, the parts, the report to telc. */
  exam: BookingExam | null;
  charges: BookingCharge[];
  payments: Payment[];
  balance: number;
};

const LIST = `
  SELECT b.id, b.number, b.person_id, trim(p.first_name || ' ' || coalesce(p.last_name, '')) AS person_name,
         coalesce(nullif(trim(t.name_de), ''), t.name, et.name) AS course_type_name, b.status::text AS status, b.currency, b.created_at,
         b.observation_reason, b.observation_note, b.exam_session_id, b.exam_parts, b.filemaker_booking_id IS NOT NULL AS imported,
         b.accommodation_type_code, b.accommodation_room_type_code, b.accommodation_catering_code, b.accommodation_from, b.accommodation_to,
         (SELECT min(start_date) FROM booking_days bd WHERE bd.booking_id = b.id) AS start_date,
         (SELECT max(end_date) FROM booking_days bd WHERE bd.booking_id = b.id) AS end_date,
         coalesce((SELECT sum(amount) FROM booking_charges c WHERE c.booking_id = b.id), 0) AS charged,
         coalesce((SELECT sum(amount) FROM payments pm WHERE pm.booking_id = b.id AND pm.voided_at IS NULL), 0) AS paid
    FROM bookings b
    JOIN people p ON p.id = b.person_id
    LEFT JOIN course_types t ON t.id = b.course_type_id
    LEFT JOIN exam_sessions es ON es.id = b.exam_session_id
    LEFT JOIN exam_types et ON et.id = es.exam_type_id
`;

type ListRow = {
  id: string;
  number: string;
  person_id: string;
  person_name: string;
  course_type_name: string | null;
  status: BookingStatus;
  currency: string;
  created_at: Date;
  start_date: Date | null;
  end_date: Date | null;
  charged: string;
  paid: string;
  observation_reason: ObservationReason | null;
  observation_note: string | null;
  exam_session_id: string | null;
  exam_parts: ExamParts | null;
  imported: boolean;
  accommodation_type_code: string | null;
  accommodation_room_type_code: string | null;
  accommodation_catering_code: string | null;
  accommodation_from: Date | null;
  accommodation_to: Date | null;
};

const toItem = (r: ListRow): BookingListItem => ({
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
  createdAt: r.created_at,
  observationReason: r.observation_reason,
  observationNote: r.observation_note,
  examSessionId: r.exam_session_id,
  examParts: r.exam_parts,
  imported: r.imported,
  stay: r.accommodation_type_code
    ? {
        typeCode: r.accommodation_type_code,
        roomTypeCode: r.accommodation_room_type_code,
        cateringCode: r.accommodation_catering_code,
        from: r.accommodation_from,
        to: r.accommodation_to,
      }
    : null,
});

export type BookingFilter = 'current' | 'upcoming' | 'unclear' | 'watch' | 'accommodation' | 'reserved' | 'past' | 'cancelled' | 'all';

const CHARGED = `coalesce((SELECT sum(amount) FROM booking_charges c WHERE c.booking_id = b.id), 0)`;
const PAID = `coalesce((SELECT sum(amount) FROM payments pm WHERE pm.booking_id = b.id AND pm.voided_at IS NULL), 0)`;

const FILTERS: Record<BookingFilter, string> = {
  // The grey and the yellow of `bookingLight`, as lists: not cancelled, and either not paid in
  // full (and not under observation, which shows yellow), or under observation.
  unclear: `b.status <> 'cancelled' AND b.observation_reason IS NULL AND NOT (${CHARGED} > 0.005 AND ${PAID} >= ${CHARGED} - 0.005)`,
  watch: `b.status <> 'cancelled' AND b.observation_reason IS NOT NULL`,
  // Who needs a room, by arrival: every stay not cancelled that has not ended yet.
  accommodation: `b.status <> 'cancelled' AND b.accommodation_type_code IS NOT NULL AND coalesce(b.accommodation_to, b.accommodation_from, current_date) >= current_date`,
  current: `b.status IN ('reserved','confirmed') AND EXISTS (SELECT 1 FROM booking_days bd WHERE bd.booking_id = b.id AND bd.start_date <= current_date AND bd.end_date >= current_date)`,
  upcoming: `b.status IN ('reserved','confirmed') AND (SELECT min(start_date) FROM booking_days bd WHERE bd.booking_id = b.id) > current_date`,
  reserved: `b.status = 'reserved'`,
  past: `b.status = 'completed' OR ((SELECT max(end_date) FROM booking_days bd WHERE bd.booking_id = b.id) < current_date AND b.status <> 'cancelled')`,
  cancelled: `b.status = 'cancelled'`,
  all: 'true',
};

export async function listBookings({
  filter = 'current',
  search,
  limit = 40,
  offset = 0,
}: {
  filter?: BookingFilter;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: BookingListItem[]; total: number }> {
  const params: unknown[] = [];
  let where = `WHERE b.deleted_at IS NULL AND p.deleted_at IS NULL AND (${FILTERS[filter]})`;
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (concat_ws(' ', p.first_name, p.last_name) ILIKE $1 OR concat_ws(' ', p.last_name, p.first_name) ILIKE $1 OR t.name ILIKE $1 OR t.name_de ILIKE $1 OR et.name ILIKE $1 OR b.number ILIKE $1)`;
  }
  const total = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM bookings b JOIN people p ON p.id = b.person_id LEFT JOIN course_types t ON t.id = b.course_type_id
       LEFT JOIN exam_sessions es ON es.id = b.exam_session_id LEFT JOIN exam_types et ON et.id = es.exam_type_id ${where}`,
    params
  );
  const rows = await query<ListRow>(
    `${LIST} ${where} ORDER BY ${filter === 'accommodation' ? 'b.accommodation_from ASC NULLS LAST, ' : ''}start_date ${filter === 'upcoming' ? 'ASC' : 'DESC'} NULLS LAST, b.created_at DESC, b.id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return { items: rows.map(toItem), total: Number(total?.n ?? 0) };
}

export async function bookingCounts(): Promise<Record<BookingFilter, number>> {
  const out = {} as Record<BookingFilter, number>;
  for (const key of Object.keys(FILTERS) as BookingFilter[]) {
    const row = await queryFirst<{ n: string }>(
      `SELECT count(*) AS n FROM bookings b JOIN people p ON p.id = b.person_id WHERE b.deleted_at IS NULL AND p.deleted_at IS NULL AND (${FILTERS[key]})`
    );
    out[key] = Number(row?.n ?? 0);
  }
  return out;
}

/** What is still owed across every booking that is not cancelled: the figure finance looks at first. */
export async function bookingsOwed(): Promise<{ amount: number; bookings: number }> {
  const row = await queryFirst<{ amount: string | null; bookings: string }>(
    `SELECT sum(owed) AS amount, count(*) AS bookings FROM (
       SELECT coalesce((SELECT sum(amount) FROM booking_charges c WHERE c.booking_id = b.id), 0)
            - coalesce((SELECT sum(amount) FROM payments pm WHERE pm.booking_id = b.id AND pm.voided_at IS NULL), 0) AS owed
         FROM bookings b JOIN people p ON p.id = b.person_id
        WHERE b.deleted_at IS NULL AND p.deleted_at IS NULL AND b.status <> 'cancelled'
     ) balances WHERE owed > 0.005`
  );
  return { amount: Number(row?.amount ?? 0), bookings: Number(row?.bookings ?? 0) };
}

export async function personBookings(canonicalPersonId: string): Promise<BookingListItem[]> {
  const rows = await query<ListRow>(
    `${LIST} WHERE b.deleted_at IS NULL AND b.person_id = ANY(person_family($1)) ORDER BY start_date DESC NULLS LAST`,
    [canonicalPersonId]
  );
  return rows.map(toItem);
}

/** Where a booking's credit can go: the same learner's other bookings that are not cancelled, linked records included. */
export async function carryOverTargets(bookingId: string): Promise<BookingListItem[]> {
  const rows = await query<ListRow>(
    `${LIST} WHERE b.deleted_at IS NULL AND b.status <> 'cancelled' AND b.id <> $1
        AND b.person_id = ANY(person_family((SELECT canonical_person_id(person_id) FROM bookings WHERE id = $1)))
      ORDER BY start_date DESC NULLS LAST`,
    [bookingId]
  );
  return rows.map(toItem);
}

export async function getBooking(id: string): Promise<BookingDetail | null> {
  const row = await queryFirst<
    ListRow & {
      course_type_id: string | null;
      payer: Payer;
      payer_name: string | null;
      visa_required: boolean;
      notes: string | null;
      source_registration_id: string | null;
      cancelled_at: Date | null;
      cancel_reason: string | null;
      observed_at: Date | null;
      observed_by_name: string | null;
      accommodation_type_en: string | null;
      accommodation_type_de: string | null;
      accommodation_room_en: string | null;
      accommodation_room_de: string | null;
      accommodation_catering_en: string | null;
      accommodation_catering_de: string | null;
      exam_type_id: string | null;
      exam_starts_at: Date | null;
      exam_ends_at: Date | null;
      exam_deadline: Date | null;
      exam_filed_at: Date | null;
      exam_filed_by_name: string | null;
      source_exam_registration_id: string | null;
      result_written: ExamOutcome | null;
      result_oral: ExamOutcome | null;
      has_result: boolean;
      collected_at: Date | null;
      collected_note: string | null;
    }
  >(
    `${LIST.replace(
      'FROM bookings b',
      `, b.course_type_id, b.payer, b.payer_name, b.visa_required, b.notes, b.source_registration_id,
         b.cancelled_at, b.cancel_reason, b.observed_at,
         (SELECT name FROM staff_users WHERE id = b.observed_by) AS observed_by_name,
         at.name_en AS accommodation_type_en, at.name_de AS accommodation_type_de,
         art.name_en AS accommodation_room_en, art.name_de AS accommodation_room_de,
         co.name_en AS accommodation_catering_en, co.name_de AS accommodation_catering_de,
         es.exam_type_id, es.starts_at AS exam_starts_at, es.ends_at AS exam_ends_at, es.registration_deadline AS exam_deadline,
         b.exam_filed_at, (SELECT name FROM staff_users WHERE id = b.exam_filed_by) AS exam_filed_by_name,
         b.source_exam_registration_id,
         er.written AS result_written, er.oral AS result_oral, er.booking_id IS NOT NULL AS has_result, er.collected_at, er.collected_note
    FROM bookings b
    LEFT JOIN exam_results er ON er.booking_id = b.id
    LEFT JOIN accommodation_types at ON at.code = b.accommodation_type_code
    LEFT JOIN accommodation_room_types art ON art.code = b.accommodation_room_type_code
    LEFT JOIN catering_options co ON co.code = b.accommodation_catering_code`
    )} WHERE b.id = $1 AND b.deleted_at IS NULL`,
    [id]
  );
  if (!row) return null;

  const [periods, charges, payments] = await Promise.all([
    query<{
      id: string;
      course_instance_id: string | null;
      cohort_label: string | null;
      start_date: Date;
      end_date: Date;
      kind: 'initial' | 'extension';
      level_code: string | null;
      format: string | null;
      start_iso: string;
      end_iso: string;
    }>(
      `SELECT bp.id, bp.course_instance_id, bp.start_date, bp.end_date, bp.kind, bp.level_code, t.format,
              to_char(bp.start_date, 'YYYY-MM-DD') AS start_iso, to_char(bp.end_date, 'YYYY-MM-DD') AS end_iso,
              CASE WHEN i.id IS NULL THEN NULL
                   ELSE coalesce(i.title, t.name || ' · ' || to_char(i.start_date, 'DD.MM.YY') || ' – ' || to_char(i.end_date, 'DD.MM.YY'))
              END AS cohort_label
         FROM booking_periods bp
         LEFT JOIN course_instances i ON i.id = bp.course_instance_id
         LEFT JOIN course_types t ON t.id = i.course_type_id
        WHERE bp.booking_id = $1
        ORDER BY bp.start_date`,
      [id]
    ),
    query<{ id: string; kind: ChargeKind; description: string; amount: string; created_at: Date }>(
      `SELECT id, kind, description, amount, created_at FROM booking_charges WHERE booking_id = $1 ORDER BY created_at`,
      [id]
    ),
    query<{
      id: string;
      amount: string;
      method: PaymentMethod;
      received_at: Date;
      subject: string;
      reference: string | null;
      recorded_by_name: string | null;
      voided_at: Date | null;
      void_reason: string | null;
      counterpart_id: string | null;
      counterpart_course: string | null;
      counterpart_start: Date | null;
    }>(
      `SELECT pm.id, pm.amount, pm.method, pm.received_at, pm.subject, pm.reference,
              u.name AS recorded_by_name, pm.voided_at, pm.void_reason,
              cb.id AS counterpart_id, coalesce(ct.name, cet.name) AS counterpart_course,
              (SELECT min(start_date) FROM booking_days bd WHERE bd.booking_id = cb.id) AS counterpart_start
         FROM payments pm
         LEFT JOIN staff_users u ON u.id = pm.recorded_by
         LEFT JOIN bookings cb ON cb.id = pm.counterpart_booking_id
         LEFT JOIN course_types ct ON ct.id = cb.course_type_id
         LEFT JOIN exam_sessions ces ON ces.id = cb.exam_session_id
         LEFT JOIN exam_types cet ON cet.id = ces.exam_type_id
        WHERE pm.booking_id = $1 ORDER BY pm.received_at, pm.created_at`,
      [id]
    ),
  ]);

  const item = toItem(row);
  return {
    ...item,
    courseTypeId: row.course_type_id,
    payer: row.payer,
    payerName: row.payer_name,
    visaRequired: row.visa_required,
    notes: row.notes,
    sourceRegistrationId: row.source_registration_id,
    cancelledAt: row.cancelled_at,
    cancelReason: row.cancel_reason,
    observedAt: row.observed_at,
    observedByName: row.observed_by_name,
    accommodation:
      row.accommodation_type_code && row.accommodation_type_en
        ? {
            typeCode: row.accommodation_type_code,
            roomTypeCode: row.accommodation_room_type_code,
            cateringCode: row.accommodation_catering_code,
            typeName: both(row.accommodation_type_en, row.accommodation_type_de)!,
            roomTypeName: both(row.accommodation_room_en, row.accommodation_room_de),
            cateringName: both(row.accommodation_catering_en, row.accommodation_catering_de),
            from: row.accommodation_from,
            to: row.accommodation_to,
          }
        : null,
    levelRange: bookedLevelLabel(periods.map((p) => ({ format: p.format, levelCode: p.level_code, startDate: p.start_iso, endDate: p.end_iso }))),
    exam:
      row.exam_session_id && row.exam_parts && row.exam_type_id && row.exam_starts_at && row.exam_ends_at
        ? {
            sessionId: row.exam_session_id,
            examTypeId: row.exam_type_id,
            name: row.course_type_name ?? '',
            startsAt: row.exam_starts_at,
            endsAt: row.exam_ends_at,
            deadline: row.exam_deadline,
            parts: row.exam_parts,
            filedAt: row.exam_filed_at,
            filedByName: row.exam_filed_by_name,
            sourceRegistrationId: row.source_exam_registration_id,
            result: row.has_result ? { written: row.result_written, oral: row.result_oral, collectedAt: row.collected_at, collectedNote: row.collected_note } : null,
          }
        : null,
    periods: periods.map((p) => ({
      id: p.id,
      courseInstanceId: p.course_instance_id,
      cohortLabel: p.cohort_label,
      startDate: p.start_date,
      endDate: p.end_date,
      kind: p.kind,
      levelCode: p.level_code,
    })),
    charges: charges.map((c) => ({
      id: c.id,
      kind: c.kind,
      description: c.description,
      amount: Number(c.amount),
      createdAt: c.created_at,
    })),
    payments: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      receivedAt: p.received_at,
      subject: p.subject,
      reference: p.reference,
      recordedByName: p.recorded_by_name,
      voidedAt: p.voided_at,
      voidReason: p.void_reason,
      counterpart: p.counterpart_id
        ? { id: p.counterpart_id, courseTypeName: p.counterpart_course, startDate: p.counterpart_start }
        : null,
    })),
    balance: item.charged - item.paid,
  };
}

// -------------------------------------------------------------- mutations

export type NewBooking = {
  personId: string;
  courseTypeId: string | null;
  courseInstanceId: string | null;
  /** The level the learner starts at; the start's places for that level count it. */
  levelCode?: string | null;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  payer: Payer;
  payerName: string | null;
  visaRequired: boolean;
  notes: string | null;
  /** What was booked, whether or not a rate covers it yet (0013). */
  accommodationTypeCode?: string | null;
  accommodationRoomTypeCode?: string | null;
  accommodationCateringCode?: string | null;
  accommodationFrom?: string | null;
  accommodationTo?: string | null;
  /**
   * Opening cost lines. `rateId` records which published rate produced the
   * amount, where one did — that provenance is what stops a rate being
   * deleted after it has priced a booking.
   */
  charges: {
    kind: ChargeKind;
    description: string;
    amount: number;
    chargeTypeCode?: string | null;
    rateId?: string | null;
  }[];
  sourceRegistrationId?: string | null;
  /**
   * An exam booking (0036): the sitting and the parts, instead of a course and its dates. Booked
   * only while a place is free for this person — checked with the sitting locked.
   */
  exam?: { sessionId: string; parts: ExamParts; sourceRegistrationId?: string | null } | null;
  /**
   * Several courses at once, instead of `courseInstanceId` and the dates: Bildungszeit (2026-10-17) is
   * a morning and an afternoon intensive class for the same week or two, one period each.
   */
  periods?: { courseInstanceId: string; levelCode: string; startDate: string; endDate: string }[] | null;
};

/** A booking the rules do not allow — a full sitting — with the reason in both languages. */
export class BookingRefused extends Error {
  constructor(readonly reason: Bilingual) {
    super(reason.en);
  }
}

async function addPeriodOn(
  client: PoolClient,
  bookingId: string,
  input: {
    courseInstanceId: string | null;
    startDate: string;
    endDate: string;
    kind: 'initial' | 'extension';
    levelCode?: string | null;
  },
  actor: StaffUser
): Promise<string> {
  // The course the learner sits in (0041): a joiner at a second half on the running course, to its end.
  const course = input.courseInstanceId
    ? await resolveCourse(input.courseInstanceId, input.levelCode ?? null, { startDate: input.startDate, endDate: input.endDate }, { client, actor })
    : null;
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO booking_periods (booking_id, course_instance_id, start_date, end_date, kind, level_code, course_id, created_by)
     VALUES ($1, $2, $3::date, $4::date, $5, $6, $7, $8) RETURNING id`,
    [
      bookingId,
      course?.courseInstanceId ?? input.courseInstanceId,
      input.startDate,
      course?.endDate ?? input.endDate,
      input.kind,
      input.levelCode ?? null,
      course?.courseId ?? null,
      actor.id,
    ]
  );
  if (!input.courseInstanceId) {
    await raiseFlag(
      {
        entity: 'booking',
        entityId: bookingId,
        code: 'period_without_cohort',
        detail: { period: rows[0].id },
      },
      (sql, params) => client.query(sql, params)
    );
  }
  return rows[0].id;
}

export async function createBooking(input: NewBooking, actor: StaffUser): Promise<string> {
  let closed: WaitlistEntryCore[] = [];
  let closedExamEntries: string[] = [];
  const exam = input.exam ?? null;
  const bookingId = await withTransaction(async (client) => {
    if (exam) {
      const { rows: sitting } = await client.query<{ open: boolean; twice: boolean }>(
        `SELECT s.status = 'scheduled' AND s.starts_at >= current_date AS open,
                EXISTS (SELECT 1 FROM bookings b WHERE b.exam_session_id = s.id AND b.deleted_at IS NULL AND b.status <> 'cancelled'
                           AND b.person_id = ANY(person_family(canonical_person_id($2)))) AS twice
           FROM exam_sessions s WHERE s.id = $1`,
        [exam.sessionId, input.personId]
      );
      if (!sitting[0]?.open) throw new BookingRefused({ de: 'Dieser Prüfungstermin kann nicht mehr gebucht werden.', en: 'This sitting can no longer be booked.' });
      if (sitting[0].twice) throw new BookingRefused({ de: 'Diese Person ist für diesen Termin schon gebucht.', en: 'This person is already booked for this sitting.' });
    }
    // The sitting is locked while its places are counted, so two colleagues cannot book its last place twice.
    if (exam && !(await sittingHasPlace(client, exam.sessionId, input.personId))) {
      throw new BookingRefused({
        de: 'Für diesen Prüfungstermin ist kein Platz mehr frei. Die Person kann auf die Warteliste.',
        en: 'No place is free in this sitting any more. The person can go on the waiting list.',
      });
    }
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO bookings
         (person_id, course_type_id, status, payer, payer_name, visa_required, notes,
          source_registration_id, accommodation_type_code, accommodation_room_type_code,
          accommodation_catering_code, accommodation_from, accommodation_to, created_by,
          exam_session_id, exam_parts, source_exam_registration_id)
       VALUES ($1, $2, $3::booking_status, $4, $5, $6, $7, $8, $9, $10, $11, $12::date, $13::date, $14, $15, $16, $17)
       RETURNING id`,
      [
        input.personId,
        exam ? null : input.courseTypeId,
        input.status,
        input.payer,
        input.payerName,
        input.visaRequired,
        input.notes,
        input.sourceRegistrationId ?? null,
        input.accommodationTypeCode ?? null,
        input.accommodationRoomTypeCode ?? null,
        input.accommodationCateringCode ?? null,
        input.accommodationFrom ?? null,
        input.accommodationTo ?? null,
        actor.id,
        exam?.sessionId ?? null,
        exam?.parts ?? null,
        exam?.sourceRegistrationId ?? null,
      ]
    );
    const id = rows[0].id;
    // An exam's day is its sitting's: no period of its own. A course's dates are its period.
    if (exam) closedExamEntries = await closeOnExamBooking(client, input.personId, exam.sessionId, id, actor);
    else if (input.periods?.length) {
      for (const p of input.periods) await addPeriodOn(client, id, { ...p, kind: 'initial' }, actor);
    } else await addPeriodOn(
      client,
      id,
      {
        courseInstanceId: input.courseInstanceId,
        startDate: input.startDate,
        endDate: input.endDate,
        kind: 'initial',
        levelCode: input.levelCode ?? null,
      },
      actor
    );
    // Booked into the course they were waiting for: their place in its queue closes with it.
    if (!exam && input.courseInstanceId) closed = await closeOnBooking(client, input.personId, input.courseInstanceId, id, actor);
    for (const c of input.charges) {
      await client.query(
        `INSERT INTO booking_charges
           (booking_id, kind, description, amount, charge_type_code, rate_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, c.kind, c.description, c.amount, c.chargeTypeCode ?? null, c.rateId ?? null, actor.id]
      );
    }
    if (input.sourceRegistrationId && !exam) {
      await client.query(
        `UPDATE course_registrations SET status = 'done' WHERE id = $1 AND status <> 'done'`,
        [input.sourceRegistrationId]
      );
    }
    if (exam?.sourceRegistrationId) {
      await client.query(`UPDATE exam_registrations SET status = 'done' WHERE id = $1 AND status <> 'done'`, [exam.sourceRegistrationId]);
    }
    await client.query(
      `INSERT INTO staff_activity (staff_user_id, staff_name, entity, entity_id, action, detail)
       VALUES ($1, $2, 'booking', $3, 'booking_created', $4)`,
      [
        actor.id,
        actor.name,
        id,
        JSON.stringify({ person: input.personId, from: input.sourceRegistrationId ?? exam?.sourceRegistrationId ?? null, exam: exam?.sessionId ?? null }),
      ]
    );
    return id;
  });
  await logClosedByBooking(closed, bookingId, actor);
  if (exam && closedExamEntries.length) {
    const words = await sittingWords(exam.sessionId);
    for (const entry of closedExamEntries) {
      await logActivity({ actor, entity: 'person', entityId: input.personId, action: 'waitlist_booked', detail: { entry, booking: bookingId, ...words } });
    }
  }
  return bookingId;
}

/**
 * A booking's own fields. Its course type stays what it is once a period is on a course of a start:
 * the start is of a type, and a booking of another type on it would be counted in neither.
 */
export async function updateBooking(
  id: string,
  patch: {
    courseTypeId: string | null;
    status: BookingStatus;
    payer: Payer;
    payerName: string | null;
    visaRequired: boolean;
    notes: string | null;
  },
  actor: StaffUser
): Promise<void> {
  await query(
    `UPDATE bookings SET course_type_id = CASE WHEN EXISTS (SELECT 1 FROM booking_periods bp WHERE bp.booking_id = bookings.id AND bp.course_instance_id IS NOT NULL)
                                            THEN course_type_id ELSE $2 END,
            status = $3::booking_status, payer = $4, payer_name = $5,
            visa_required = $6, notes = $7,
            cancelled_at = CASE WHEN $3 = 'cancelled' THEN coalesce(cancelled_at, now()) ELSE NULL END
      WHERE id = $1 AND deleted_at IS NULL`,
    [
      id,
      patch.courseTypeId,
      patch.status,
      patch.payer,
      patch.payerName,
      patch.visaRequired,
      patch.notes,
    ]
  );
  await logActivity({
    actor,
    entity: 'booking',
    entityId: id,
    action: 'booking_updated',
    detail: { status: patch.status },
  });
}

export type StayInput = { typeCode: string; roomTypeCode: string | null; cateringCode: string | null; from: string | null; to: string | null };

/**
 * The stay changed on the booking (2026-10-17): its type, room, meals and dates, and the rent with it —
 * the line the workspace priced (`accommodation_rent`) is replaced by `rent`, priced from the new stay
 * by the caller; a line a colleague added by hand stays. No stay: the stay and its rent are gone.
 * Returns whether anything changed. A cancelled booking keeps what it had.
 */
export async function changeStay(
  id: string,
  stay: StayInput | null,
  rent: { description: string; amount: number; rateId: string | null } | null,
  actor: StaffUser
): Promise<boolean> {
  const changed = await withTransaction(async (client) => {
    const { rows } = await client.query<{
      status: BookingStatus;
      type: string | null;
      room: string | null;
      catering: string | null;
      from: string | null;
      to: string | null;
    }>(
      `SELECT status::text AS status, accommodation_type_code AS type, accommodation_room_type_code AS room, accommodation_catering_code AS catering,
              to_char(accommodation_from, 'YYYY-MM-DD') AS "from", to_char(accommodation_to, 'YYYY-MM-DD') AS "to"
         FROM bookings WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [id]
    );
    const before = rows[0];
    if (!before || before.status === 'cancelled') return false;
    const same = stay
      ? before.type === stay.typeCode && before.room === stay.roomTypeCode && before.catering === stay.cateringCode && before.from === stay.from && before.to === stay.to
      : before.type === null;
    if (same) return false;
    await client.query(
      `UPDATE bookings SET accommodation_type_code = $2, accommodation_room_type_code = $3, accommodation_catering_code = $4,
              accommodation_from = $5::date, accommodation_to = $6::date
        WHERE id = $1`,
      [id, stay?.typeCode ?? null, stay?.roomTypeCode ?? null, stay?.cateringCode ?? null, stay?.from ?? null, stay?.to ?? null]
    );
    await client.query(`DELETE FROM booking_charges WHERE booking_id = $1 AND charge_type_code = 'accommodation_rent'`, [id]);
    if (stay && rent) {
      await client.query(
        `INSERT INTO booking_charges (booking_id, kind, description, amount, charge_type_code, rate_id, created_by)
         VALUES ($1, 'accommodation', $2, $3, 'accommodation_rent', $4, $5)`,
        [id, rent.description, rent.amount, rent.rateId, actor.id]
      );
    }
    return true;
  });
  if (changed) {
    await logActivity({
      actor,
      entity: 'booking',
      entityId: id,
      // Read as „hat eine Buchung bearbeitet" (activity.ts); the detail says it was the stay.
      action: 'booking_updated',
      detail: { stay: stay?.typeCode ?? null, from: stay?.from ?? null, to: stay?.to ?? null, rent: rent?.amount ?? null },
    });
  }
  return changed;
}

/** An extension: more dates, usually into the next cohort — which closes the learner's place in its queue. */
export async function extendBooking(
  id: string,
  input: { courseInstanceId: string | null; startDate: string; endDate: string; levelCode?: string | null },
  actor: StaffUser
): Promise<void> {
  let closed: WaitlistEntryCore[] = [];
  await withTransaction(async (client) => {
    await addPeriodOn(client, id, { ...input, kind: 'extension' }, actor);
    if (input.courseInstanceId) {
      const owner = await client.query<{ person_id: string }>(`SELECT person_id FROM bookings WHERE id = $1`, [id]);
      if (owner.rows[0]) closed = await closeOnBooking(client, owner.rows[0].person_id, input.courseInstanceId, id, actor);
    }
  });
  await logClosedByBooking(closed, id, actor);
  await logActivity({
    actor,
    entity: 'booking',
    entityId: id,
    action: 'booking_extended',
    detail: input,
  });
}

/** The level a period is taught at — set or corrected on the booking's page; its course follows (0041). */
export async function setPeriodLevel(bookingId: string, periodId: string, levelCode: string | null, actor: StaffUser): Promise<void> {
  // The start the learner began at: the one of the same course type starting on the period's first
  // day — a joiner's period sits on the running course of the start before.
  const period = await queryFirst<{ course_instance_id: string | null; start_date: string; end_date: string }>(
    `SELECT coalesce(
              (SELECT o.id FROM course_instances o WHERE o.course_type_id = i.course_type_id AND o.start_date = bp.start_date AND o.status <> 'cancelled' LIMIT 1),
              bp.course_instance_id) AS course_instance_id,
            to_char(bp.start_date, 'YYYY-MM-DD') AS start_date, to_char(bp.end_date, 'YYYY-MM-DD') AS end_date
       FROM booking_periods bp LEFT JOIN course_instances i ON i.id = bp.course_instance_id
      WHERE bp.id = $1 AND bp.booking_id = $2`,
    [periodId, bookingId]
  );
  // With the period's own dates: a joiner in a course's second half stays on that start's course.
  const course =
    period?.course_instance_id && levelCode
      ? await resolveCourse(period.course_instance_id, levelCode, { startDate: period.start_date, endDate: period.end_date }, { actor })
      : null;
  await query(`UPDATE booking_periods SET level_code = $3, course_id = $4, course_instance_id = coalesce($5, course_instance_id) WHERE id = $1 AND booking_id = $2`, [
    periodId,
    bookingId,
    levelCode,
    course?.courseId ?? null,
    course?.courseInstanceId ?? null,
  ]);
  await logActivity({ actor, entity: 'booking', entityId: bookingId, action: 'booking_level_set', detail: { period: periodId, level: levelCode } });
}

/** Whether a code is one of the levels (a form's value, before it reaches a foreign key). */
export async function isLevelCode(code: string): Promise<boolean> {
  return Boolean(await queryFirst<{ code: string }>(`SELECT code FROM levels WHERE code = $1`, [code]));
}

export async function removePeriod(
  bookingId: string,
  periodId: string,
  actor: StaffUser
): Promise<{ ok: true } | { ok: false; reason: Bilingual }> {
  const count = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM booking_periods WHERE booking_id = $1`,
    [bookingId]
  );
  if (Number(count?.n ?? 0) <= 1)
    return {
      ok: false,
      reason: {
        de: 'Eine Buchung behält mindestens einen Zeitraum. Storniere stattdessen die Buchung.',
        en: 'A booking keeps at least one period. Cancel the booking instead.',
      },
    };
  await query(`DELETE FROM booking_periods WHERE id = $1 AND booking_id = $2`, [
    periodId,
    bookingId,
  ]);
  await logActivity({
    actor,
    entity: 'booking',
    entityId: bookingId,
    action: 'booking_period_removed',
    detail: { period: periodId },
  });
  return { ok: true };
}

export async function addCharge(
  bookingId: string,
  input: { kind: ChargeKind; description: string; amount: number },
  actor: StaffUser
): Promise<void> {
  await query(
    `INSERT INTO booking_charges (booking_id, kind, description, amount, created_by) VALUES ($1, $2, $3, $4, $5)`,
    [bookingId, input.kind, input.description, input.amount, actor.id]
  );
  await logActivity({
    actor,
    entity: 'booking',
    entityId: bookingId,
    action: 'charge_added',
    detail: input,
  });
}

export async function removeCharge(
  bookingId: string,
  chargeId: string,
  actor: StaffUser
): Promise<void> {
  await query(`DELETE FROM booking_charges WHERE id = $1 AND booking_id = $2`, [
    chargeId,
    bookingId,
  ]);
  await logActivity({
    actor,
    entity: 'booking',
    entityId: bookingId,
    action: 'charge_removed',
    detail: { charge: chargeId },
  });
}

export async function recordPayment(
  bookingId: string,
  input: {
    amount: number;
    method: PaymentMethod;
    receivedAt: string;
    subject: string;
    reference: string | null;
  },
  actor: StaffUser
): Promise<void> {
  await query(
    `INSERT INTO payments (booking_id, amount, method, received_at, subject, reference, recorded_by)
     VALUES ($1, $2, $3, $4::date, $5, $6, $7)`,
    [
      bookingId,
      input.amount,
      input.method,
      input.receivedAt,
      input.subject,
      input.reference,
      actor.id,
    ]
  );
  await logActivity({
    actor,
    entity: 'booking',
    entityId: bookingId,
    action: 'payment_recorded',
    detail: { amount: input.amount, method: input.method },
  });
}

/**
 * Money is never deleted: a wrong payment is voided, with a reason. A carry-over is voided on both
 * bookings at once, so the credit is back where it was and never counted twice or lost.
 */
export async function voidPayment(
  bookingId: string,
  paymentId: string,
  reason: string,
  actor: StaffUser
): Promise<void> {
  const voided = await query<{ id: string; booking_id: string }>(
    `UPDATE payments SET voided_at = now(), voided_by = $3, void_reason = $4
      WHERE voided_at IS NULL
        AND ((id = $1 AND booking_id = $2)
          OR transfer_id = (SELECT transfer_id FROM payments WHERE id = $1 AND booking_id = $2))
      RETURNING id, booking_id`,
    [paymentId, bookingId, actor.id, reason]
  );
  for (const row of voided)
    await logActivity({
      actor,
      entity: 'booking',
      entityId: row.booking_id,
      action: 'payment_voided',
      detail: { payment: row.id, reason },
    });
}

/**
 * Carries a credit over (docs/schoolman/money.md): minus on this booking, plus on another booking
 * of the same learner, written together under one `transfer_id`. The amount is at most the credit
 * this booking holds; the target is not cancelled. Both bookings are locked first, so two
 * colleagues cannot spend one credit twice.
 */
export async function carryOverCredit(
  sourceId: string,
  targetId: string,
  amount: number,
  actor: StaffUser
): Promise<{ ok: true } | { ok: false; reason: Bilingual }> {
  const refuse = (de: string, en: string) => ({ ok: false as const, reason: { de, en } });
  if (!(amount > 0)) return refuse('Ein Betrag über null ist nötig.', 'An amount above zero is required.');
  if (sourceId === targetId) return refuse('Wähle eine andere Buchung.', 'Choose another booking.');

  const outcome = await withTransaction(async (client) => {
    await client.query(`SELECT id FROM bookings WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE`, [[sourceId, targetId]]);
    const { rows } = await client.query<{ id: string; person: string; status: BookingStatus; credit: string }>(
      `SELECT b.id, canonical_person_id(b.person_id) AS person, b.status::text AS status, ${PAID} - ${CHARGED} AS credit
         FROM bookings b WHERE b.id = ANY($1::uuid[]) AND b.deleted_at IS NULL`,
      [[sourceId, targetId]]
    );
    const source = rows.find((r) => r.id === sourceId);
    const target = rows.find((r) => r.id === targetId);
    if (!source || !target || source.person !== target.person || target.status === 'cancelled')
      return refuse('Das Guthaben geht nur auf eine andere, nicht stornierte Buchung derselben Person.', 'A credit goes only to another booking of the same person that is not cancelled.');
    if (amount > Number(source.credit) + 0.005)
      return refuse('Der Betrag ist höher als das Guthaben dieser Buchung.', 'The amount is more than this booking’s credit.');
    await client.query(
      `INSERT INTO payments (booking_id, amount, method, subject, recorded_by, transfer_id, counterpart_booking_id)
       SELECT v.booking_id, v.amount, 'carryover', 'Credit carried over', $4, t.id, v.counterpart
         FROM (SELECT gen_random_uuid() AS id) t,
              (VALUES ($1::uuid, -($3::numeric), $2::uuid), ($2::uuid, $3::numeric, $1::uuid)) AS v (booking_id, amount, counterpart)`,
      [sourceId, targetId, amount, actor.id]
    );
    return { ok: true as const };
  });
  if (!outcome.ok) return outcome;
  await logActivity({ actor, entity: 'booking', entityId: sourceId, action: 'credit_carried_over', detail: { amount, to: targetId } });
  await logActivity({ actor, entity: 'booking', entityId: targetId, action: 'credit_received', detail: { amount, from: sourceId } });
  return { ok: true };
}

/** Yellow: a colleague puts the booking under observation, with the reason; the change is a line in its history. */
export async function observeBooking(id: string, reason: ObservationReason, note: string | null, actor: StaffUser): Promise<void> {
  await query(
    `UPDATE bookings SET observation_reason = $2, observation_note = $3, observed_at = now(), observed_by = $4
      WHERE id = $1 AND deleted_at IS NULL AND status <> 'cancelled'`,
    [id, reason, note, actor.id]
  );
  await logActivity({ actor, entity: 'booking', entityId: id, action: 'booking_observed', detail: { reason, note } });
}

/** The observation ends: the booking's colour is the money's again. */
export async function endObservation(id: string, actor: StaffUser): Promise<void> {
  const before = await queryFirst<{ observation_reason: ObservationReason | null }>(
    `SELECT observation_reason FROM bookings WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  if (!before?.observation_reason) return;
  await query(
    `UPDATE bookings SET observation_reason = NULL, observation_note = NULL, observed_at = NULL, observed_by = NULL WHERE id = $1`,
    [id]
  );
  await logActivity({ actor, entity: 'booking', entityId: id, action: 'booking_observation_ended', detail: { reason: before.observation_reason } });
}

export async function cancelBooking(id: string, reason: string, actor: StaffUser): Promise<void> {
  await query(
    `UPDATE bookings SET status = 'cancelled', cancelled_at = now(), cancel_reason = $2 WHERE id = $1 AND deleted_at IS NULL`,
    [id, reason]
  );
  await logActivity({
    actor,
    entity: 'booking',
    entityId: id,
    action: 'booking_cancelled',
    detail: { reason },
  });
}

/**
 * An exam booking's sitting or parts changed (0036): another sitting of the same exam while it has a
 * place for this person, or the whole exam instead of one part. A move to another sitting undoes the
 * report to telc, which was for the old one; new parts re-price the exam fee from its rate.
 */
export async function changeExam(bookingId: string, input: { sessionId: string; parts: ExamParts }, actor: StaffUser): Promise<void> {
  const change = await withTransaction(async (client) => {
    const { rows } = await client.query<{ person_id: string; exam_session_id: string; exam_parts: ExamParts; status: string; exam_type_id: string }>(
      `SELECT b.person_id, b.exam_session_id, b.exam_parts, b.status::text AS status, s.exam_type_id
         FROM bookings b JOIN exam_sessions s ON s.id = b.exam_session_id
        WHERE b.id = $1 AND b.deleted_at IS NULL FOR UPDATE OF b`,
      [bookingId]
    );
    const booking = rows[0];
    if (!booking) throw new BookingRefused({ de: 'Diese Buchung ist keine Prüfungsbuchung.', en: 'This is not an exam booking.' });
    if (booking.status === 'cancelled') throw new BookingRefused({ de: 'Die Buchung ist storniert.', en: 'The booking is cancelled.' });
    const moved = booking.exam_session_id !== input.sessionId;
    if (moved) {
      const { rows: target } = await client.query<{ exam_type_id: string; open: boolean }>(
        `SELECT exam_type_id, status = 'scheduled' AND starts_at >= current_date AS open FROM exam_sessions WHERE id = $1`,
        [input.sessionId]
      );
      if (!target[0]?.open) throw new BookingRefused({ de: 'Dieser Termin kann nicht gebucht werden.', en: 'That sitting cannot be booked.' });
      if (target[0].exam_type_id !== booking.exam_type_id) throw new BookingRefused({ de: 'Nur ein anderer Termin derselben Prüfung.', en: 'Only another sitting of the same exam.' });
      if (!(await sittingHasPlace(client, input.sessionId, booking.person_id, bookingId))) {
        throw new BookingRefused({ de: 'In diesem Termin ist kein Platz frei.', en: 'No place is free in that sitting.' });
      }
    }
    await client.query(
      `UPDATE bookings SET exam_session_id = $2, exam_parts = $3,
              exam_filed_at = CASE WHEN $4 THEN NULL ELSE exam_filed_at END,
              exam_filed_by = CASE WHEN $4 THEN NULL ELSE exam_filed_by END
        WHERE id = $1`,
      [bookingId, input.sessionId, input.parts, moved]
    );
    if (moved) await closeOnExamBooking(client, booking.person_id, input.sessionId, bookingId, actor);
    if (booking.exam_parts !== input.parts) {
      // The fee follows the parts: an exam fee a rate set is set again from the rate for the new parts.
      await client.query(
        `UPDATE booking_charges c SET amount = r.amount, rate_id = r.id
           FROM rates r
          WHERE c.booking_id = $1 AND c.kind = 'exam_fee' AND c.rate_id IS NOT NULL
            AND r.id = applicable_rate('exam_type'::rate_scope,
                         (SELECT (starts_at AT TIME ZONE 'Europe/Berlin')::date FROM exam_sessions WHERE id = $2), NULL, $3,
                         NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, $4::smallint)`,
        [bookingId, input.sessionId, booking.exam_type_id, ratedParts(input.parts)]
      );
    }
    return { moved, from: booking.exam_session_id, fromParts: booking.exam_parts };
  });
  await logActivity({
    actor,
    entity: 'booking',
    entityId: bookingId,
    action: 'exam_changed',
    detail: { from: change.from, to: input.sessionId, fromParts: change.fromParts, parts: input.parts },
  });
}

/** Soft delete. Refused while payments exist: money must stay visible. */
export async function deleteBooking(
  id: string,
  actor: StaffUser
): Promise<{ ok: true } | { ok: false; reason: Bilingual }> {
  const paid = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM payments WHERE booking_id = $1`,
    [id]
  );
  if (Number(paid?.n ?? 0) > 0)
    return {
      ok: false,
      reason: {
        de: 'Diese Buchung hat Zahlungen. Storniere sie, statt sie zu löschen.',
        en: 'This booking has payments. Cancel it instead of deleting it.',
      },
    };
  await query(
    `UPDATE bookings SET deleted_at = now(), deleted_by = $2 WHERE id = $1 AND deleted_at IS NULL`,
    [id, actor.id]
  );
  await logActivity({ actor, entity: 'booking', entityId: id, action: 'booking_deleted' });
  return { ok: true };
}

/** Cohorts a booking period can point at: current and future, not cancelled. */
export type CohortOption = {
  id: string;
  label: string;
  courseTypeId: string;
  startDate: Date;
  endDate: Date;
  defaultPrice: number;
  currency: string;
};

export async function listCohortOptions(): Promise<CohortOption[]> {
  const rows = await query<{
    id: string;
    label: string;
    course_type_id: string;
    start_date: Date;
    end_date: Date;
    default_price: string;
    currency: string;
  }>(
    `SELECT i.id, i.course_type_id, i.start_date, i.end_date, t.default_price, t.currency,
            coalesce(i.title, t.name) || coalesce(' ' || i.level_code, '') || ' · '
              || to_char(i.start_date, 'DD.MM.YY') || ' – ' || to_char(i.end_date, 'DD.MM.YY')
              || coalesce(' · ' || r.nickname, '') AS label
       FROM course_instances i
       JOIN course_types t ON t.id = i.course_type_id
       LEFT JOIN rooms r ON r.id = i.room_id
      WHERE i.end_date >= current_date AND i.status <> 'cancelled'
      ORDER BY i.start_date, t.name`
  );
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    courseTypeId: r.course_type_id,
    startDate: r.start_date,
    endDate: r.end_date,
    defaultPrice: Number(r.default_price),
    currency: r.currency,
  }));
}
