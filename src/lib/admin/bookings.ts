import type { PoolClient } from 'pg';
import type { BookingSort, BookingTypeChoice } from './booking-query';
import type { BookingContext, BookingDemand, BookingFacet } from './booking-context';
import { parseQuery, searchTokens } from './search-query';

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
import { isUuid } from './ids';
import { isSession, sessionAt, type Session } from './day-plan-labels';
import { owesMoney, owesSql } from './open-money';

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
 * The team's yellow (u.B., *unter Beobachtung*), stored as whether a booking is under observation. It is
 * one colour, as in SchoolMan, with no reasons under it (Rahman, 2026-10-18: "keep it simple"): the
 * workspace writes 'other', and the column's finer values (0028) are no longer offered. Green and grey
 * follow from the money; red is the cancellation.
 */
export type ObservationReason = 'level' | 'visa' | 'attendance' | 'documents' | 'other';

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
export function bookingLightLabel(b: Parameters<typeof bookingLight>[0]): Bilingual {
  const light = bookingLight(b);
  if (light !== 'unclear') return BOOKING_LIGHT_LABELS[light];
  if (b.charged <= 0.005) return { de: 'Ohne Kosten', en: 'No charges' };
  if (b.paid > 0.005) return { de: 'Anzahlung erhalten', en: 'Part paid' };
  return BOOKING_LIGHT_LABELS.unclear;
}

/** Paid in full means something was charged and nothing of it is open — under 5 € counts as paid (`owesMoney`). */
export const paidInFull = (charged: number, paid: number) => charged > 0.005 && !owesMoney(charged - paid);

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
  /** Their address, for „E-Mail an …" from the list. */
  personEmail: string | null;
  courseTypeName: string | null;
  courseFormat: string | null;
  /** The part of the day of its course running now or next, for its colour in a list (2026-10-21). */
  session: Session | null;
  /** When the last payment reminder went out, SchoolMan's among them: what a follow-up needs to know. */
  remindedAt: Date | null;
  /** SchoolMan's own number for it (0052), which receipts carry and finance quotes. */
  schoolmanNumber: string | null;
  /** The group visit it belongs to: a group is often paid as a whole, so its members' balances read differently. */
  groupName: string | null;
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
  /** The stay booked (0013), as codes: a list names them from `stayVocabulary()`. */
  stay: {
    typeCode: string;
    roomTypeCode: string | null;
    cateringCode: string | null;
    from: Date | null;
    to: Date | null;
    /** Where it was arranged, now or next (0056): a CASA flat by its name; null for a host family. */
    place: string | null;
  } | null;
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
  /** A book line: whether the books are handed out, when and by whom (0087); null for other lines. */
  books: { handedOut: boolean; at: Date | null; by: string | null } | null;
  /** One of a reversal pair SchoolMan marked: the line reversed, or its „Storno" copy below zero (0094). */
  reversed: boolean;
};

export type Payment = {
  id: string;
  amount: number;
  method: PaymentMethod;
  receivedAt: Date;
  subject: string;
  reference: string | null;
  /** Who booked it: the workspace account, or the colleague SchoolMan names (0094). */
  recordedByName: string | null;
  /** The cost line it settles, in its words (0094). */
  forCharge: string | null;
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
  /** The agency or company that pays it (0057), when it is one CASA keeps. */
  payerOrganisation: { id: string; name: string } | null;
  /** The group visit it belongs to (0058). */
  groupVisit: { id: string; name: string } | null;
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
  /** The teacher's answers from the Klassenbuch, through SchoolMan (0093): the level right, the next level. */
  levelConfirmed: TeacherAnswer | null;
  levelApproved: TeacherAnswer | null;
  /** The course's result (SchoolMan's „mit Erfolg" / „ohne Erfolg", 0093). */
  courseResult: 'passed' | 'not_passed' | null;
  /** The university's programme the booking is in (0093). */
  programme: string | null;
};

export type TeacherAnswer = 'yes' | 'no' | 'unsure';

// Resolve lesson-based sessions once per statement. Correlating the lesson view per historical
// booking scans it thousands of times; the shared set preserves the same first-lesson rule.
const BOOKING_CONTEXT_CTE = `WITH booking_lesson_times AS MATERIALIZED (
  SELECT course_id, group_index, on_date, starts_at FROM course_day_times WHERE starts_at IS NOT NULL
), booking_session_times AS MATERIALIZED (
  SELECT DISTINCT ON (course_id, group_index) course_id, group_index,
    CASE WHEN starts_at < '12:00' THEN 'morning' WHEN starts_at < '17:00' THEN 'afternoon' ELSE 'evening' END AS session
  FROM (SELECT * FROM booking_lesson_times UNION ALL SELECT course_id, NULL::smallint, on_date, starts_at FROM booking_lesson_times) times
  ORDER BY course_id, group_index, on_date, starts_at
)`;

const LIST = `${BOOKING_CONTEXT_CTE}
  SELECT b.id, b.number, b.person_id, trim(p.first_name || ' ' || coalesce(p.last_name, '')) AS person_name,
         person_email(p.id) AS person_email,
         coalesce(nullif(trim(t.name_de), ''), t.name, et.name) AS course_type_name, t.format AS course_format, b.status::text AS status, b.currency, b.created_at,
         b.observation_reason, b.observation_note, b.exam_session_id, b.exam_parts,
         b.accommodation_type_code, b.accommodation_room_type_code, b.accommodation_catering_code, b.accommodation_from, b.accommodation_to,
         (SELECT s.place FROM booking_stays s WHERE s.booking_id = b.id AND NOT s.cancelled AND s.place IS NOT NULL
           ORDER BY (s.ends_on < current_date), s.starts_on LIMIT 1) AS stay_place,
         (SELECT min(start_date) FROM booking_days bd WHERE bd.booking_id = b.id) AS start_date,
         (SELECT max(end_date) FROM booking_days bd WHERE bd.booking_id = b.id) AS end_date,
         coalesce((SELECT sum(amount) FROM booking_charges c WHERE c.booking_id = b.id), 0) AS charged,
         coalesce((SELECT sum(amount) FROM payments pm WHERE pm.booking_id = b.id AND pm.voided_at IS NULL), 0) AS paid,
         (SELECT coalesce(st.session, bc.session, bi.session, bp.day_time_code, CASE WHEN t.format = 'evening' THEN 'evening' END)
           FROM booking_periods bp LEFT JOIN courses bc ON bc.id = bp.course_id
           LEFT JOIN course_instances bi ON bi.id = coalesce(bc.course_instance_id, bp.course_instance_id)
           LEFT JOIN booking_session_times st ON st.course_id = bc.id AND st.group_index IS NOT DISTINCT FROM bp.group_index
           WHERE bp.booking_id = b.id ORDER BY (bp.end_date < current_date), bp.start_date LIMIT 1) AS session,
         (SELECT max(l.sent_at) FROM letters l WHERE l.booking_id = b.id AND l.kind = 'payment_reminder') AS reminded_at,
         b.filemaker_booking_id,
         (SELECT gv.name FROM group_visits gv WHERE gv.id = b.group_visit_id) AS group_name
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
  person_email: string | null;
  course_type_name: string | null;
  course_format: string | null;
  session: string | null;
  reminded_at: Date | null;
  filemaker_booking_id: string | null;
  group_name: string | null;
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
  accommodation_type_code: string | null;
  accommodation_room_type_code: string | null;
  accommodation_catering_code: string | null;
  accommodation_from: Date | null;
  accommodation_to: Date | null;
  stay_place: string | null;
};

const toItem = (r: ListRow): BookingListItem => ({
  id: r.id,
  number: r.number,
  personId: r.person_id,
  personName: r.person_name,
  personEmail: r.person_email,
  courseTypeName: r.course_type_name,
  courseFormat: r.course_format,
  session: isSession(r.session) ? r.session : null,
  remindedAt: r.reminded_at,
  schoolmanNumber: r.filemaker_booking_id,
  groupName: r.group_name,
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
  stay: r.accommodation_type_code
    ? {
        typeCode: r.accommodation_type_code,
        roomTypeCode: r.accommodation_room_type_code,
        cateringCode: r.accommodation_catering_code,
        from: r.accommodation_from,
        to: r.accommodation_to,
        place: r.stay_place,
      }
    : null,
});

/**
 * A booking's stays as arranged (0056, from SchoolMan's `DateAccommodation`): when, what kind, which room
 * type and meals, where — a CASA flat and its room by name, a host family not —, called off, and whether
 * the departure is confirmed. The booking's own accommodation fields are the wish.
 */
export type BookingStay = {
  id: string;
  from: string;
  to: string;
  typeCode: string | null;
  roomTypeCode: string | null;
  cateringCode: string | null;
  place: string | null;
  /** The place in the accommodation module (0060), when the stay is placed. */
  placeId: string | null;
  room: string | null;
  cancelled: boolean;
  departureConfirmed: boolean | null;
};

export async function bookingStays(bookingId: string): Promise<BookingStay[]> {
  const rows = await query<{
    id: string;
    starts_on: string;
    ends_on: string;
    accommodation_type_code: string | null;
    room_type_code: string | null;
    catering_code: string | null;
    place: string | null;
    place_id: string | null;
    room: string | null;
    cancelled: boolean;
    departure_confirmed: boolean | null;
  }>(
    `SELECT s.id, to_char(s.starts_on, 'YYYY-MM-DD') AS starts_on, to_char(s.ends_on, 'YYYY-MM-DD') AS ends_on, s.accommodation_type_code, s.room_type_code,
            s.catering_code, coalesce(a.name, s.place) AS place, a.id AS place_id, coalesce(r.name, s.room) AS room, s.cancelled, s.departure_confirmed
       FROM booking_stays s
       LEFT JOIN accommodations a ON a.id = s.accommodation_id
       LEFT JOIN accommodation_rooms r ON r.id = s.room_id
      WHERE s.booking_id = $1 ORDER BY s.starts_on`,
    [bookingId]
  );
  return rows.map((r) => ({
    id: r.id,
    from: r.starts_on,
    to: r.ends_on,
    typeCode: r.accommodation_type_code,
    roomTypeCode: r.room_type_code,
    cateringCode: r.catering_code,
    place: r.place,
    placeId: r.place_id,
    room: r.room,
    cancelled: r.cancelled,
    departureConfirmed: r.departure_confirmed,
  }));
}

export type BookingFilter = 'current' | 'upcoming' | 'unclear' | 'followup' | 'past' | 'cancelled' | 'reserved' | 'all';

const CHARGED = `coalesce((SELECT sum(amount) FROM booking_charges c WHERE c.booking_id = b.id), 0)`;
const PAID = `coalesce((SELECT sum(amount) FROM payments pm WHERE pm.booking_id = b.id AND pm.voided_at IS NULL), 0)`;
/** A booking's year: the year of its first day — its course or its exam — else the year it was made. */
const BOOKING_YEAR = `extract(year FROM coalesce((SELECT min(start_date) FROM booking_days bd WHERE bd.booking_id = b.id), (b.created_at AT TIME ZONE 'Europe/Berlin')::date))::int`;

const FILTERS: Record<BookingFilter, string> = {
  // „Zahlung offen": something is still owed — the same rule as the learners' view and the figure above the
  // list (2026-10-18). A booking with nothing charged owes nothing; one under observation still owes.
  unclear: `b.status <> 'cancelled' AND ${owesSql(`${CHARGED} - ${PAID}`)}`,
  // A follow-up due today or before that nobody has looked at yet (0062).
  followup: `EXISTS (SELECT 1 FROM booking_follow_ups f WHERE f.booking_id = b.id AND f.done_at IS NULL AND f.due_on <= current_date)`,
  current: `b.status IN ('reserved','confirmed') AND EXISTS (SELECT 1 FROM booking_days bd WHERE bd.booking_id = b.id AND bd.start_date <= current_date AND bd.end_date >= current_date)`,
  upcoming: `b.status IN ('reserved','confirmed') AND (SELECT min(start_date) FROM booking_days bd WHERE bd.booking_id = b.id) > current_date`,
  past: `b.status = 'completed' OR ((SELECT max(end_date) FROM booking_days bd WHERE bd.booking_id = b.id) < current_date AND b.status <> 'cancelled')`,
  cancelled: `b.status = 'cancelled'`,
  reserved: `b.status = 'reserved'`,
  all: 'true',
};

// Each view's order. „Vergangen" puts what is still owed first, so money from the past is followed up
// before it is forgotten, then the rest by when it ended (Rahman, 2026-10-21).
const ORDER: Record<BookingFilter, string> = {
  unclear: `${CHARGED} - ${PAID} DESC, start_date DESC NULLS LAST`,
  followup: 'start_date DESC NULLS LAST',
  current: 'start_date DESC NULLS LAST',
  upcoming: 'start_date ASC NULLS LAST',
  past: `(b.status <> 'cancelled' AND ${owesSql(`${CHARGED} - ${PAID}`)}) DESC, end_date DESC NULLS LAST`,
  cancelled: 'start_date DESC NULLS LAST',
  reserved: 'start_date ASC NULLS LAST',
  all: 'start_date DESC NULLS LAST',
};

export async function listBookings({
  filter = 'current',
  search,
  limit = 40,
  offset = 0,
  sort, direction = 'asc',
  ...narrow
}: {
  filter?: BookingFilter;
  sort?: BookingSort; direction?: 'asc' | 'desc';
  search?: string;
  limit?: number;
  offset?: number;
} & BookingNarrow): Promise<{ items: BookingListItem[]; total: number; months: Record<string, number> }> {
  const params: unknown[] = [];
  const where = bookingWhere({ filter, search, ...narrow }, params);
  const sortColumn = sort === 'name' ? 'person_name' : sort === 'balance' ? `${CHARGED} - ${PAID}` : 'start_date';
  const order = sort ? `${sortColumn} ${direction === 'desc' ? 'DESC' : 'ASC'} NULLS LAST` : ORDER[filter];
  const totals = await query<{ month: string | null; overall: number; n: string }>(
    `${BOOKING_CONTEXT_CTE} SELECT month, grouping(month) AS overall, count(*) AS n FROM (
      SELECT to_char((SELECT min(start_date) FROM booking_days bd WHERE bd.booking_id = b.id), 'YYYY-MM') AS month
      ${BOOKING_FROM} ${where}
    ) matches GROUP BY GROUPING SETS ((month), ())`,
    params
  );
  const rows = await query<ListRow>(
    `${LIST} ${where} ORDER BY ${order}, b.created_at DESC, b.id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  return { items: rows.map(row => toItem(narrow.session ? { ...row, session: narrow.session } : row)), total: Number(totals.find(r => r.overall)?.n ?? 0),
    months: Object.fromEntries(totals.filter(r => !r.overall).map(r => [r.month ?? 'undated', Number(r.n)])) };
}

const BOOKING_FROM = `FROM bookings b JOIN people p ON p.id = b.person_id LEFT JOIN course_types t ON t.id = b.course_type_id
  LEFT JOIN exam_sessions es ON es.id = b.exam_session_id LEFT JOIN exam_types et ON et.id = es.exam_type_id`;

function bookingWhere({ filter = 'all', search, ...narrow }: BookingNarrow & { filter?: BookingFilter; search?: string }, params: unknown[]) {
  let where = `WHERE b.deleted_at IS NULL AND p.deleted_at IS NULL AND (${FILTERS[filter]})${narrowed(narrow, params)}`;
  if (search) {
    const parsed = parseQuery(search);
    if (parsed.booking.exact || parsed.booking.prefix || parsed.number) {
      params.push(parsed.booking.exact ?? parsed.number ?? '');
      params.push(parsed.booking.prefix ? `${parsed.booking.prefix}%` : '');
      where += ` AND (lower(b.number) = $${params.length - 1} OR lower(b.number) LIKE $${params.length} OR b.filemaker_booking_id = $${params.length - 1})`;
    } else {
      const tokens = searchTokens(search);
      if (tokens.length) {
        params.push(tokens);
        const words = `$${params.length}::text[]`;
        // Most searches are names or course words. Resolve the ranked contact only for people whose
        // family has a potentially matching address; the uncorrelated set is hashed once, preserving
        // the primary-contact rule without running person_emails for every historical booking.
        where += ` AND NOT EXISTS (SELECT 1 FROM unnest(${words}) word WHERE CASE
          WHEN strpos(ws_fold(concat_ws(' ', p.first_name, p.last_name, t.name, t.name_de, et.name, b.number)), word) > 0 THEN false
          WHEN canonical_person_id(p.id) IN (SELECT canonical_person_id(se.person_id) FROM emails se
            WHERE EXISTS (SELECT 1 FROM unnest(${words}) email_word WHERE strpos(ws_fold(se.address), email_word) > 0))
            THEN strpos(ws_fold(coalesce(person_email(p.id), '')), word) = 0
          ELSE true END)`;
      }
    }
  }
  return where;
}

/**
 * What the bookings list is narrowed to (2026-10-21, the filter panel): the organisation that pays (from
 * its page), the year (`BOOKING_YEAR`), who pays, and the course type — `exam` for the exam bookings.
 */
export type BookingNarrow = BookingContext & { payerId?: string; year?: number; payer?: Payer; typeId?: string; programme?: string; startFrom?: string; startTo?: string };

// One context per booked period (or exam), so a morning A1 period cannot satisfy an evening B1 filter.
// A late joiner belongs to their own entry month, even when their course started in an earlier month.
const BOOKING_CONTEXT = `
  SELECT CASE coalesce(ct.format, bt.format) WHEN 'intensive' THEN 'intensive' WHEN 'evening' THEN 'evening' ELSE 'other' END AS category,
    b.course_type_id AS type_id, coalesce(st.session, bc.session, bi.session, bp.day_time_code, CASE WHEN bt.format = 'evening' THEN 'evening' END) AS session,
    coalesce(bp.level_code, bc.level_code, bp.level_band) AS level,
    bp.start_date AS start
  FROM (SELECT 1) seed
    LEFT JOIN booking_periods bp ON bp.booking_id = b.id
    LEFT JOIN courses bc ON bc.id = bp.course_id
    LEFT JOIN course_instances bi ON bi.id = coalesce(bc.course_instance_id, bp.course_instance_id)
    LEFT JOIN course_types ct ON ct.id = bi.course_type_id
    LEFT JOIN course_types bt ON bt.id = b.course_type_id
    LEFT JOIN booking_session_times st ON st.course_id = bc.id AND st.group_index IS NOT DISTINCT FROM bp.group_index
  WHERE b.exam_session_id IS NULL
  UNION ALL
  SELECT 'exam', NULL::uuid, NULL::text, et.level, (es.starts_at AT TIME ZONE 'Europe/Berlin')::date
  FROM exam_sessions es JOIN exam_types et ON et.id = es.exam_type_id WHERE es.id = b.exam_session_id
`;

function contextWhere({ category, session, level, month, start, startFrom, startTo }: BookingContext & { startFrom?: string; startTo?: string }, params: unknown[], alias = 'ctx'): string {
  const clauses: string[] = [];
  const eq = (column: string, value: string) => { params.push(value); clauses.push(`${alias}.${column} = $${params.length}`); };
  if (category && category !== 'all') eq('category', category);
  if (session) eq('session', session);
  if (level) {
    params.push(level);
    const at = `$${params.length}`;
    clauses.push(`(${alias}.level = ${at} OR (strpos(${at}, '.') = 0 AND ${alias}.level LIKE ${at} || '.%'))`);
  }
  if (month) { params.push(month); clauses.push(`to_char(${alias}.start, 'YYYY-MM') = $${params.length}`); }
  if (start) { params.push(start); clauses.push(`${alias}.start = $${params.length}::date`); }
  if (startFrom) { params.push(startFrom); clauses.push(`${alias}.start >= $${params.length}::date`); }
  if (startTo) { params.push(startTo); clauses.push(`${alias}.start <= $${params.length}::date`); }
  return clauses.join(' AND ') || 'true';
}

/** The narrowing as SQL on `b`, its values pushed onto `params`. */
function narrowed({ payerId, year, payer, typeId, programme, ...context }: BookingNarrow, params: unknown[]): string {
  let sql = '';
  const contextual = contextWhere(context, params);
  if (contextual !== 'true') sql += ` AND EXISTS (SELECT 1 FROM (${BOOKING_CONTEXT}) ctx WHERE ${contextual})`;
  if (programme) {
    params.push(programme);
    sql += ` AND b.programme_code = $${params.length}`;
  }
  if (payerId) {
    params.push(payerId);
    sql += ` AND b.payer_organisation_id = $${params.length}`;
  }
  if (year) {
    params.push(year);
    sql += ` AND ${BOOKING_YEAR} = $${params.length}`;
  }
  if (payer) {
    params.push(payer);
    sql += ` AND b.payer = $${params.length}`;
  }
  if (typeId === 'exam') sql += ` AND b.exam_session_id IS NOT NULL`;
  else if (typeId) {
    params.push(typeId);
    sql += ` AND b.course_type_id = $${params.length} AND b.exam_session_id IS NULL`;
  }
  return sql;
}

export async function bookingCounts(narrow: BookingNarrow & { search?: string } = {}): Promise<Record<BookingFilter, number>> {
  const params: unknown[] = [];
  const where = bookingWhere(narrow, params);
  const keys = Object.keys(FILTERS) as BookingFilter[];
  const row = await queryFirst<Record<BookingFilter, string>>(`${BOOKING_CONTEXT_CTE} SELECT ${keys.map(key => `count(*) FILTER (WHERE ${FILTERS[key]}) AS "${key}"`).join(', ')} ${BOOKING_FROM} ${where}`, params);
  return Object.fromEntries(keys.map(key => [key, Number(row?.[key] ?? 0)])) as Record<BookingFilter, number>;
}

/** Choices come from actual scheduled courses/exams and booked periods, never an invented cross-product. */
export async function bookingContextFacets(): Promise<BookingFacet[]> {
  return query<BookingFacet>(`${BOOKING_CONTEXT_CTE} SELECT DISTINCT ctx.category, ctx.type_id AS "typeId", ctx.session, ctx.level, ctx.start::text
    ${BOOKING_FROM} CROSS JOIN LATERAL (${BOOKING_CONTEXT}) ctx WHERE b.deleted_at IS NULL AND p.deleted_at IS NULL
    UNION
    SELECT CASE ft.format WHEN 'intensive' THEN 'intensive' WHEN 'evening' THEN 'evening' ELSE 'other' END,
      ft.id, coalesce(st.session, fc.session, fi.session, CASE WHEN ft.format = 'evening' THEN 'evening' END), coalesce(fc.level_code, fi.level_code), fi.start_date::text
    FROM course_instances fi JOIN course_types ft ON ft.id = fi.course_type_id LEFT JOIN courses fc ON fc.course_instance_id = fi.id AND fc.status <> 'cancelled'
    LEFT JOIN booking_session_times st ON st.course_id = fc.id
    WHERE fi.status <> 'cancelled' AND ft.is_active
    UNION
    SELECT 'exam', NULL::uuid, NULL::text, et.level, (es.starts_at AT TIME ZONE 'Europe/Berlin')::date::text
    FROM exam_sessions es JOIN exam_types et ON et.id = es.exam_type_id WHERE es.status <> 'cancelled' AND et.is_active`);
}

export async function bookingCategoryCounts(narrow: BookingNarrow & { search?: string; filter?: BookingFilter } = {}) {
  const params: unknown[] = [];
  const rows = await query<{ category: string | null; n: string }>(`${BOOKING_CONTEXT_CTE} SELECT ctx.category, count(DISTINCT b.id) AS n
    ${BOOKING_FROM} CROSS JOIN LATERAL (${BOOKING_CONTEXT}) ctx ${bookingWhere(narrow, params)}
    GROUP BY GROUPING SETS ((ctx.category), ())`, params);
  return Object.fromEntries(rows.map(row => [row.category ?? 'all', Number(row.n)]));
}

/** Whole-result counts: unique learners (including linked records), bookings, and the reserved subset.
 * Cancelled places never inflate demand. A learner may attend more than one month/session, so totals
 * are calculated with DISTINCT at each scope, never by adding the per-course counts.
 */
export async function bookingDemand(narrow: BookingNarrow & { search?: string; filter?: BookingFilter } = {}): Promise<BookingDemand[]> {
  const params: unknown[] = [];
  const where = bookingWhere(narrow, params);
  const context = contextWhere(narrow, params);
  const rows = await query<Omit<BookingDemand, 'bookings' | 'students' | 'reserved'> & { bookings: string; students: string; reserved: string }>(`${BOOKING_CONTEXT_CTE}
    SELECT CASE WHEN grouping(to_char(ctx.start, 'YYYY-MM')) = 1 THEN 'total' WHEN grouping(ctx.category) = 1 THEN 'month' ELSE 'session' END AS scope,
      to_char(ctx.start, 'YYYY-MM') AS month, ctx.category, ctx.session,
      count(DISTINCT b.id) AS bookings, count(DISTINCT canonical_person_id(b.person_id)) AS students,
      count(DISTINCT canonical_person_id(b.person_id)) FILTER (WHERE b.status = 'reserved') AS reserved
    ${BOOKING_FROM} CROSS JOIN LATERAL (${BOOKING_CONTEXT}) ctx ${where} AND b.status <> 'cancelled' AND ${context}
    GROUP BY GROUPING SETS ((to_char(ctx.start, 'YYYY-MM'), ctx.category, ctx.session), (to_char(ctx.start, 'YYYY-MM')), ())
    ORDER BY month NULLS LAST, scope`, params);
  return rows.map(row => ({ ...row, bookings: Number(row.bookings), students: Number(row.students), reserved: Number(row.reserved) }));
}

/** The years bookings are in, newest first, for the filter's choice — no money. */
export async function bookingYearList(narrow: BookingNarrow = {}): Promise<number[]> {
  const params: unknown[] = [];
  const sql = narrowed({ ...narrow, year: undefined }, params);
  const rows = await query<{ year: number }>(
    `${BOOKING_CONTEXT_CTE} SELECT DISTINCT ${BOOKING_YEAR} AS year FROM bookings b JOIN people p ON p.id = b.person_id
      WHERE b.deleted_at IS NULL AND p.deleted_at IS NULL${sql} ORDER BY 1 DESC`,
    params
  );
  return rows.map((r) => Number(r.year)).filter((y) => Number.isFinite(y));
}

/** The course types a booking can have, for the filter: the workspace's names, in their order. */
export async function bookingTypeChoices(): Promise<BookingTypeChoice[]> {
  return query<BookingTypeChoice>(
    `SELECT id, slug, coalesce(nullif(trim(name_de), ''), name) AS name FROM course_types
      WHERE id IN (SELECT DISTINCT course_type_id FROM bookings WHERE course_type_id IS NOT NULL AND deleted_at IS NULL)
      ORDER BY position NULLS LAST, name`
  );
}

/** The university's programmes bookings are in (0093), for the filter: none, and the filter has no choice. */
export async function bookingProgrammeChoices(): Promise<{ code: string; name: string }[]> {
  return query<{ code: string; name: string }>(
    `SELECT code, name FROM programmes WHERE code IN (SELECT DISTINCT programme_code FROM bookings WHERE programme_code IS NOT NULL AND deleted_at IS NULL)
      ORDER BY position, name`
  );
}

export type BookingYear = { year: number; bookings: number; owing: number; owed: number };

/**
 * What is still owed, year by year, newest first (2026-10-21: „calculated only if requested" — the filter
 * panel's „Berechnen", for finance and management). Under the rest of the narrowing, not its year.
 */
export async function bookingYears(narrow: BookingNarrow & { search?: string; filter?: BookingFilter } = {}): Promise<BookingYear[]> {
  const params: unknown[] = [];
  const sql = bookingWhere({ ...narrow, year: undefined }, params);
  const rows = await query<{ year: number; bookings: string; owing: string; owed: string | null }>(
    `${BOOKING_CONTEXT_CTE} SELECT year, count(*) AS bookings, count(*) FILTER (WHERE owes) AS owing, sum(balance) FILTER (WHERE owes) AS owed FROM (
       SELECT ${BOOKING_YEAR} AS year, ${CHARGED} - ${PAID} AS balance,
              b.status <> 'cancelled' AND ${owesSql(`${CHARGED} - ${PAID}`)} AS owes
         ${BOOKING_FROM} ${sql}
     ) y WHERE year IS NOT NULL GROUP BY year ORDER BY year DESC`,
    params
  );
  return rows.map((r) => ({ year: Number(r.year), bookings: Number(r.bookings), owing: Number(r.owing), owed: Number(r.owed ?? 0) }));
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
  if (!isUuid(id)) return null;
  const row = await queryFirst<
    ListRow & {
      course_type_id: string | null;
      payer: Payer;
      payer_name: string | null;
      payer_organisation_id: string | null;
      payer_organisation_name: string | null;
      group_visit_id: string | null;
      group_visit_name: string | null;
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
      level_confirmed: TeacherAnswer | null;
      level_approved: TeacherAnswer | null;
      course_result: 'passed' | 'not_passed' | null;
      programme_name: string | null;
    }
  >(
    `${LIST.replace(
      'FROM bookings b',
      `, b.course_type_id, b.payer, b.payer_name, b.payer_organisation_id, po.name AS payer_organisation_name,
         b.group_visit_id, gv.name AS group_visit_name,
         b.visa_required, b.notes, b.source_registration_id,
         b.cancelled_at, b.cancel_reason, b.observed_at,
         (SELECT name FROM staff_users WHERE id = b.observed_by) AS observed_by_name,
         at.name_en AS accommodation_type_en, at.name_de AS accommodation_type_de,
         art.name_en AS accommodation_room_en, art.name_de AS accommodation_room_de,
         co.name_en AS accommodation_catering_en, co.name_de AS accommodation_catering_de,
         es.exam_type_id, es.starts_at AS exam_starts_at, es.ends_at AS exam_ends_at, es.registration_deadline AS exam_deadline,
         b.exam_filed_at, (SELECT name FROM staff_users WHERE id = b.exam_filed_by) AS exam_filed_by_name,
         b.source_exam_registration_id,
         er.written AS result_written, er.oral AS result_oral, er.booking_id IS NOT NULL AS has_result, er.collected_at, er.collected_note,
         b.level_confirmed, b.level_approved, b.course_result, (SELECT pr.name FROM programmes pr WHERE pr.code = b.programme_code) AS programme_name
    FROM bookings b
    LEFT JOIN exam_results er ON er.booking_id = b.id
    LEFT JOIN organisations po ON po.id = b.payer_organisation_id
    LEFT JOIN group_visits gv ON gv.id = b.group_visit_id
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
    query<{
      id: string;
      kind: ChargeKind;
      description: string;
      amount: string;
      created_at: Date;
      handed_out: boolean;
      handed_out_at: Date | null;
      handed_out_by: string | null;
      reversed: boolean;
    }>(
      // A book line names its book (0094) where its own words do not already.
      `SELECT c.id, c.kind,
              CASE WHEN m.id IS NOT NULL AND position(lower(m.title) IN lower(c.description)) = 0 THEN c.description || ' · ' || m.title ELSE c.description END AS description,
              c.amount, c.created_at, c.handed_out, c.handed_out_at, u.name AS handed_out_by, c.reversed
         FROM booking_charges c LEFT JOIN staff_users u ON u.id = c.handed_out_by LEFT JOIN materials m ON m.id = c.material_id
        WHERE c.booking_id = $1 ORDER BY c.created_at`,
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
      for_charge: string | null;
      voided_at: Date | null;
      void_reason: string | null;
      counterpart_id: string | null;
      counterpart_course: string | null;
      counterpart_start: Date | null;
    }>(
      // Who booked it here, else the colleague SchoolMan names; the cost line it settles (0094).
      `SELECT pm.id, pm.amount, pm.method, pm.received_at, pm.subject, pm.reference,
              coalesce(u.name, nullif(trim(concat_ws(' ', sp.first_name, sp.last_name)), '')) AS recorded_by_name,
              (SELECT c.description FROM booking_charges c WHERE c.id = pm.charge_id) AS for_charge,
              pm.voided_at, pm.void_reason,
              cb.id AS counterpart_id, coalesce(ct.name, cet.name) AS counterpart_course,
              (SELECT min(start_date) FROM booking_days bd WHERE bd.booking_id = cb.id) AS counterpart_start
         FROM payments pm
         LEFT JOIN staff_users u ON u.id = pm.recorded_by
         LEFT JOIN staff_members sm ON sm.id = pm.recorded_by_staff_id LEFT JOIN people sp ON sp.id = sm.person_id
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
    payerOrganisation:
      row.payer_organisation_id && row.payer_organisation_name ? { id: row.payer_organisation_id, name: row.payer_organisation_name } : null,
    groupVisit: row.group_visit_id && row.group_visit_name ? { id: row.group_visit_id, name: row.group_visit_name } : null,
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
      books: c.kind === 'books' ? { handedOut: c.handed_out, at: c.handed_out_at, by: c.handed_out_by } : null,
      reversed: c.reversed,
    })),
    payments: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      receivedAt: p.received_at,
      subject: p.subject,
      reference: p.reference,
      recordedByName: p.recorded_by_name,
      forCharge: p.for_charge,
      voidedAt: p.voided_at,
      voidReason: p.void_reason,
      counterpart: p.counterpart_id
        ? { id: p.counterpart_id, courseTypeName: p.counterpart_course, startDate: p.counterpart_start }
        : null,
    })),
    balance: item.charged - item.paid,
    levelConfirmed: row.level_confirmed,
    levelApproved: row.level_approved,
    courseResult: row.course_result,
    programme: row.programme_name,
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
    // A booking puts the learner on the register (0076): a website contact becomes a learner here.
    await client.query(`UPDATE people SET listed = true WHERE id = canonical_person_id($1) AND NOT listed`, [input.personId]);
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
    await syncOwnStay(client, id);
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
/**
 * A booking made here keeps one stay record in step with its stay (0070), so the stays list
 * („Aufenthalte") shows it and it can be placed at a place and room. Its dates, kind, room type and meals
 * follow the booking; where it is placed stays. A booking from SchoolMan has SchoolMan's stays instead.
 */
async function syncOwnStay(client: PoolClient, bookingId: string): Promise<void> {
  const { rows } = await client.query<{ type: string | null; room: string | null; catering: string | null; from: string | null; to: string | null; imported: boolean }>(
    `SELECT accommodation_type_code AS type, accommodation_room_type_code AS room, accommodation_catering_code AS catering,
            to_char(accommodation_from, 'YYYY-MM-DD') AS "from", to_char(accommodation_to, 'YYYY-MM-DD') AS "to", filemaker_booking_id IS NOT NULL AS imported
       FROM bookings WHERE id = $1`,
    [bookingId]
  );
  const b = rows[0];
  if (!b || b.imported) return;
  const own = (await client.query<{ id: string }>(`SELECT id FROM booking_stays WHERE booking_id = $1 AND filemaker_id IS NULL ORDER BY created_at, id LIMIT 1`, [bookingId])).rows[0];
  if (b.type && b.from && b.to && b.to >= b.from) {
    if (own) {
      await client.query(
        `UPDATE booking_stays SET starts_on = $2::date, ends_on = $3::date, accommodation_type_code = $4, room_type_code = $5, catering_code = $6, cancelled = false WHERE id = $1`,
        [own.id, b.from, b.to, b.type, b.room, b.catering]
      );
    } else {
      await client.query(
        `INSERT INTO booking_stays (booking_id, starts_on, ends_on, accommodation_type_code, room_type_code, catering_code) VALUES ($1, $2::date, $3::date, $4, $5, $6)`,
        [bookingId, b.from, b.to, b.type, b.room, b.catering]
      );
    }
  } else if (own) {
    await client.query(`DELETE FROM booking_stays WHERE booking_id = $1 AND filemaker_id IS NULL`, [bookingId]);
  }
}

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
    await syncOwnStay(client, id);
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
  input: { kind: ChargeKind; description: string; amount: number; chargeTypeCode?: string | null; rateId?: string | null },
  actor: StaffUser
): Promise<void> {
  await query(
    `INSERT INTO booking_charges (booking_id, kind, description, amount, charge_type_code, rate_id, created_by)
     VALUES ($1, $2, $3, $4, (SELECT code FROM charge_types WHERE code = $5), (SELECT id FROM rates WHERE id = $6::uuid), $7)`,
    [bookingId, input.kind, input.description, input.amount, input.chargeTypeCode ?? null, input.rateId ?? null, actor.id]
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
/** Yellow: the booking is under observation, from now, by this colleague. */
export async function observeBooking(id: string, actor: StaffUser): Promise<void> {
  const rows = await query<{ id: string }>(
    `UPDATE bookings SET observation_reason = 'other', observation_note = NULL, observed_at = now(), observed_by = $2
      WHERE id = $1 AND deleted_at IS NULL AND status <> 'cancelled' AND observation_reason IS NULL RETURNING id`,
    [id, actor.id]
  );
  if (rows.length) await logActivity({ actor, entity: 'booking', entityId: id, action: 'booking_observed' });
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

// ------------------------------------------------------------- follow-ups (0062)

export type FollowUp = { id: string; dueOn: string; reason: string; doneAt: Date | null; createdByName: string | null };

/** A booking's follow-ups: the open ones by day, then the latest few done. */
export async function bookingFollowUps(bookingId: string): Promise<{ open: FollowUp[]; done: FollowUp[]; doneTotal: number }> {
  const rows = await query<{ id: string; due_on: string; reason: string; done_at: Date | null; created_by_name: string | null; done_rank: string | null }>(
    `SELECT f.id, to_char(f.due_on, 'YYYY-MM-DD') AS due_on, f.reason, f.done_at, coalesce(u.name, f.created_by_name) AS created_by_name,
            CASE WHEN f.done_at IS NOT NULL THEN row_number() OVER (PARTITION BY f.done_at IS NULL ORDER BY f.due_on DESC, f.id) END AS done_rank
       FROM booking_follow_ups f LEFT JOIN staff_users u ON u.id = f.created_by
      WHERE f.booking_id = $1
      ORDER BY f.due_on, f.id`,
    [bookingId]
  );
  const toFollowUp = (r: (typeof rows)[number]): FollowUp => ({ id: r.id, dueOn: r.due_on, reason: r.reason, doneAt: r.done_at, createdByName: r.created_by_name });
  const done = rows.filter((r) => r.done_at);
  return {
    open: rows.filter((r) => !r.done_at).map(toFollowUp),
    done: done.filter((r) => Number(r.done_rank) <= 3).sort((a, b) => b.due_on.localeCompare(a.due_on)).map(toFollowUp),
    doneTotal: done.length,
  };
}

export async function addFollowUp(bookingId: string, dueOn: string, reason: string, actor: StaffUser): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `INSERT INTO booking_follow_ups (booking_id, due_on, reason, created_by)
     SELECT id, $2, $3, $4 FROM bookings WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
    [bookingId, dueOn, reason, actor.id]
  );
  if (rows.length) await logActivity({ actor, entity: 'booking', entityId: bookingId, action: 'follow_up_added', detail: { due: dueOn } });
  return rows.length > 0;
}

/** Looked at: the follow-up is done. */
export async function completeFollowUp(bookingId: string, followUpId: string, actor: StaffUser): Promise<void> {
  const rows = await query<{ id: string }>(
    `UPDATE booking_follow_ups SET done_at = timezone('utc', now()), done_by = $3 WHERE id = $2 AND booking_id = $1 AND done_at IS NULL RETURNING id`,
    [bookingId, followUpId, actor.id]
  );
  if (rows.length) await logActivity({ actor, entity: 'booking', entityId: bookingId, action: 'follow_up_done' });
}

// ------------------------------------------------- the rest of SchoolMan's ledger (0063)

export type LedgerExtras = {
  /** `paidOn`: the day of the payment that paid it, where SchoolMan links one (0094). */
  instalments: { id: string; label: string | null; dueOn: string | null; amount: number; paid: boolean | null; paidOn: string | null }[];
  commissions: { id: string; agency: string | null; agencyId: string | null; description: string | null; baseAmount: number | null; percentage: number | null; amount: number; paid: boolean | null }[];
  /** `period`: the days a rent payout covers (0094). */
  payouts: {
    id: string;
    kind: 'host_rent' | 'agency_commission' | 'agency_direct' | 'other';
    to: string | null;
    toHref: string | null;
    amount: number;
    paidOn: string | null;
    period: { from: string; to: string } | null;
    note: string | null;
  }[];
  /** `cancelled`: its number was cancelled; `letterId`: the letter that is the invoice (0094). */
  invoices: { id: string; number: string; issuedOn: string | null; subject: string | null; amount: number | null; cancelled: boolean; letterId: string | null }[];
};

/** A booking's payment plan, its agency's commission, the money paid out for it and its invoices, read as SchoolMan has them. */
export async function bookingLedgerExtras(bookingId: string): Promise<LedgerExtras> {
  const [instalments, commissions, payouts, invoices] = await Promise.all([
    query<{ id: string; label: string | null; due_on: string | null; amount: string; paid: boolean | null; paid_on: string | null }>(
      `SELECT i.id, i.label, to_char(i.due_on, 'YYYY-MM-DD') AS due_on, i.amount, i.paid,
              (SELECT to_char(min(p.received_at), 'YYYY-MM-DD') FROM payments p WHERE p.instalment_id = i.id AND p.voided_at IS NULL) AS paid_on
         FROM booking_instalments i WHERE i.booking_id = $1 ORDER BY i.position, i.due_on NULLS LAST, i.id`,
      [bookingId]
    ),
    query<{ id: string; agency: string | null; agency_id: string | null; description: string | null; base_amount: string | null; percentage: string | null; amount: string; paid: boolean | null }>(
      `SELECT c.id, o.name AS agency, o.id AS agency_id, c.description, c.base_amount, c.percentage, c.amount, c.paid
         FROM booking_commissions c LEFT JOIN organisations o ON o.id = c.organisation_id
        WHERE c.booking_id = $1 ORDER BY c.created_at, c.id`,
      [bookingId]
    ),
    query<{
      id: string;
      kind: LedgerExtras['payouts'][number]['kind'];
      place_id: string | null;
      place: string | null;
      org_id: string | null;
      org: string | null;
      amount: string;
      paid_on: string | null;
      period_start: string | null;
      period_end: string | null;
      note: string | null;
    }>(
      `SELECT p.id, p.kind, a.id AS place_id, a.name AS place, o.id AS org_id, o.name AS org, p.amount, to_char(p.paid_on, 'YYYY-MM-DD') AS paid_on,
              to_char(p.period_start, 'YYYY-MM-DD') AS period_start, to_char(p.period_end, 'YYYY-MM-DD') AS period_end, p.note
         FROM payouts p LEFT JOIN accommodations a ON a.id = p.accommodation_id LEFT JOIN organisations o ON o.id = p.organisation_id
        WHERE p.booking_id = $1 ORDER BY p.paid_on NULLS LAST, p.id`,
      [bookingId]
    ),
    query<{ id: string; number: string; issued_on: string | null; subject: string | null; amount: string | null; cancelled: boolean; letter_id: string | null }>(
      `SELECT i.id, i.number, to_char(i.issued_on, 'YYYY-MM-DD') AS issued_on, i.subject, i.cancelled,
              coalesce(i.amount, (SELECT sum(c.amount) FROM booking_charges c WHERE c.invoice_number = i.number)) AS amount,
              (SELECT l.id FROM letters l WHERE l.invoice_id = i.id ORDER BY l.sent_at LIMIT 1) AS letter_id
         FROM invoices i WHERE i.booking_id = $1 ORDER BY i.issued_on, i.number`,
      [bookingId]
    ),
  ]);
  const n = (v: string | null) => (v == null ? null : Number(v));
  return {
    instalments: instalments.map((r) => ({ id: r.id, label: r.label, dueOn: r.due_on, amount: Number(r.amount), paid: r.paid, paidOn: r.paid_on })),
    commissions: commissions.map((r) => ({
      id: r.id,
      agency: r.agency,
      agencyId: r.agency_id,
      description: r.description,
      baseAmount: n(r.base_amount),
      percentage: n(r.percentage),
      amount: Number(r.amount),
      paid: r.paid,
    })),
    payouts: payouts.map((r) => ({
      id: r.id,
      kind: r.kind,
      to: r.place ?? r.org,
      toHref: r.place_id ? `/admin/accommodation/${r.place_id}` : r.org_id ? `/admin/organisations/${r.org_id}` : null,
      amount: Number(r.amount),
      paidOn: r.paid_on,
      period: r.period_start && r.period_end ? { from: r.period_start, to: r.period_end } : null,
      note: r.note,
    })),
    invoices: invoices.map((r) => ({
      id: r.id,
      number: r.number,
      issuedOn: r.issued_on,
      subject: r.subject,
      amount: n(r.amount),
      cancelled: r.cancelled,
      letterId: r.letter_id,
    })),
  };
}

/** An invoice as another record names it: its number, whether it was cancelled, the letter that is it (0094). */
export type InvoiceRef = { id: string; number: string; issuedOn: string | null; cancelled: boolean; letterId: string | null };

/** The invoices SchoolMan made from an offer, or for a group visit (0094), the oldest first. */
export async function invoicesOf(about: { offerId: string } | { groupVisitId: string }): Promise<InvoiceRef[]> {
  const [column, id] = 'offerId' in about ? ['offer_id', about.offerId] : ['group_visit_id', about.groupVisitId];
  const rows = await query<{ id: string; number: string; issued_on: string | null; cancelled: boolean; letter_id: string | null }>(
    `SELECT i.id, i.number, to_char(i.issued_on, 'YYYY-MM-DD') AS issued_on, i.cancelled,
            (SELECT l.id FROM letters l WHERE l.invoice_id = i.id ORDER BY l.sent_at LIMIT 1) AS letter_id
       FROM invoices i WHERE i.${column} = $1 ORDER BY i.issued_on NULLS LAST, i.number`,
    [id]
  );
  return rows.map((r) => ({ id: r.id, number: r.number, issuedOn: r.issued_on, cancelled: r.cancelled, letterId: r.letter_id }));
}

// ------------------------------------------------------- attendance (0064, read only)

export type AttendanceSummary = {
  /** Days with a mark, and how many of them the learner was there. */
  days: number;
  present: number;
  lateCount: number;
  lateMinutes: number;
  /** The latest absences, with why; `reported`: the office logged an absence notice for that day in SchoolMan (0094). */
  absences: { day: string; absence: 'ill' | 'excused' | 'unexcused' | null; sickNote: 'certificate' | 'self' | null; comment: string | null; reported: boolean }[];
  absentTotal: number;
};

/** A period of a booking as the class it is in: the course, its part of the day, and that class's week. */
export type BookingCoursePeriod = {
  id: string;
  startDate: string;
  endDate: string;
  kind: 'initial' | 'extension';
  courseId: string | null;
  /** The group of the course the period is in (its own page past the first: `recordHref('course', id, { group })`). */
  groupIndex: number | null;
  courseInstanceId: string | null;
  typeName: string | null;
  levelCode: string | null;
  /** A period whose course is not here: SchoolMan's level band for it (0093). */
  levelBand: string | null;
  session: Session | null;
  /** SchoolMan's number of the group: „#4771". */
  number: string | null;
  /** Where it stands today. */
  when: 'running' | 'upcoming' | 'past';
  /** The class's week — this one while it runs, else its first or its last: the times, the room, who teaches. */
  week: {
    times: string | null;
    rooms: { id: string; name: string }[];
    teachers: { id: string | null; name: string; days: string[]; substitute: boolean }[];
  } | null;
};

/**
 * The course a booking is in, period by period (Rahman, 2026-10-23: „the course that they are currently
 * doing … who is the teacher, type of course and morning or afternoon or evening"): read from the class
 * the period is placed in (`booking_periods.course_id`, `group_index`) and its lesson days.
 */
export async function bookingCourses(bookingId: string): Promise<BookingCoursePeriod[]> {
  const rows = await query<{
    id: string;
    start_date: string;
    end_date: string;
    kind: 'initial' | 'extension';
    course_id: string | null;
    group_index: number | null;
    course_instance_id: string | null;
    type_name: string | null;
    level_code: string | null;
    level_band: string | null;
    session: string | null;
    number: string | null;
  }>(
    // A period whose course is not here keeps SchoolMan's level band and part of the day (0093).
    `SELECT bp.id, to_char(bp.start_date, 'YYYY-MM-DD') AS start_date, to_char(bp.end_date, 'YYYY-MM-DD') AS end_date, bp.kind, bp.level_band,
            bp.course_id, bp.group_index, coalesce(c.course_instance_id, bp.course_instance_id) AS course_instance_id,
            coalesce(nullif(trim(ty.name_de), ''), ty.name) AS type_name, coalesce(bp.level_code, c.level_code) AS level_code,
            coalesce(c.session, i.session, bp.day_time_code) AS session,
            coalesce(c.filemaker_group_ids[coalesce(bp.group_index, 1)], c.filemaker_course_id) AS number
       FROM booking_periods bp
       LEFT JOIN courses c ON c.id = bp.course_id
       LEFT JOIN course_instances i ON i.id = coalesce(c.course_instance_id, bp.course_instance_id)
       LEFT JOIN course_types ty ON ty.id = i.course_type_id
      WHERE bp.booking_id = $1
      ORDER BY bp.start_date`,
    [bookingId]
  );
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
  return Promise.all(
    rows.map(async (r) => {
      const when = r.end_date < today ? 'past' : r.start_date > today ? 'upcoming' : 'running';
      let week: BookingCoursePeriod['week'] = null;
      if (r.course_id) {
        // The week shown: this one while it runs, the first before it starts, the last once it is over.
        const ref = when === 'running' ? today : when === 'upcoming' ? r.start_date : r.end_date;
        const days = await query<{
          on_date: string;
          times: string | null;
          room_id: string | null;
          room: string | null;
          teacher_id: string | null;
          teacher: string | null;
          is_substitute: boolean;
        }>(
          `SELECT to_char(d.on_date, 'YYYY-MM-DD') AS on_date, to_char(t.starts_at, 'HH24:MI') || '–' || to_char(t.ends_at, 'HH24:MI') AS times,
                  d.room_id, coalesce(r.nickname, r.name) AS room,
                  d.teacher_id, coalesce(sm.short_name, trim(concat_ws(' ', tp.first_name, tp.last_name))) AS teacher, d.is_substitute
             FROM course_days d
             JOIN course_day_times t ON t.id = d.id
             LEFT JOIN rooms r ON r.id = d.room_id
             LEFT JOIN staff_members sm ON sm.id = d.teacher_id LEFT JOIN people tp ON tp.id = sm.person_id
            WHERE d.course_id = $1 AND d.group_index = coalesce($2::int, (SELECT min(g.group_index) FROM course_days g WHERE g.course_id = $1))
              AND NOT d.cancelled AND d.on_date BETWEEN date_trunc('week', $3::date)::date AND date_trunc('week', $3::date)::date + 6
              AND d.on_date BETWEEN $4::date AND $5::date
            ORDER BY d.on_date`,
          [r.course_id, r.group_index, ref, r.start_date, r.end_date]
        );
        if (days.length) {
          const teachers = new Map<string, { id: string | null; name: string; days: string[]; substitute: boolean }>();
          for (const d of days) {
            if (!d.teacher) continue;
            const seen = teachers.get(d.teacher) ?? { id: d.teacher_id, name: d.teacher, days: [], substitute: true };
            teachers.set(d.teacher, { ...seen, days: [...seen.days, d.on_date], substitute: seen.substitute && d.is_substitute });
          }
          const rooms = new Map<string, { id: string; name: string }>();
          for (const d of days) if (d.room_id && d.room && !rooms.has(d.room_id)) rooms.set(d.room_id, { id: d.room_id, name: d.room });
          week = {
            times: days.find((d) => d.times)?.times ?? null,
            rooms: [...rooms.values()],
            teachers: [...teachers.values()],
          };
        }
      }
      return {
        id: r.id,
        startDate: r.start_date,
        endDate: r.end_date,
        kind: r.kind,
        courseId: r.course_id,
        groupIndex: r.group_index,
        courseInstanceId: r.course_instance_id,
        typeName: r.type_name,
        levelCode: r.level_code,
        levelBand: r.level_band,
        // A course without its part of the day stored: the class's own times say it.
        session: isSession(r.session) ? r.session : sessionAt(week?.times),
        number: r.number,
        when,
        week,
      } satisfies BookingCoursePeriod;
    })
  );
}

/** A booking's attendance as the Klassenbuch recorded it: the rate, lateness, and the latest absences. */
export async function bookingAttendance(bookingId: string): Promise<AttendanceSummary | null> {
  const [totals, absences] = await Promise.all([
    queryFirst<{ days: string; present: string; late_count: string; late_minutes: string | null; absent: string }>(
      `SELECT count(*) FILTER (WHERE present IS NOT NULL) AS days, count(*) FILTER (WHERE present) AS present,
              count(*) FILTER (WHERE minutes_late > 0) AS late_count, sum(minutes_late) AS late_minutes, count(*) FILTER (WHERE present = false) AS absent
         FROM booking_attendance WHERE booking_id = $1`,
      [bookingId]
    ),
    query<{ day: string; absence: AttendanceSummary['absences'][number]['absence']; sick_note: AttendanceSummary['absences'][number]['sickNote']; comment: string | null; reported: boolean }>(
      `SELECT to_char(a.day, 'YYYY-MM-DD') AS day, a.absence, a.sick_note, a.comment,
              EXISTS (SELECT 1 FROM staff_activity s WHERE s.action = 'schoolman_log' AND s.entity = 'booking' AND s.entity_id = a.booking_id
                         AND s.detail->'absence'->>'day' = to_char(a.day, 'YYYY-MM-DD')) AS reported
         FROM booking_attendance a
        WHERE a.booking_id = $1 AND a.present = false ORDER BY a.day DESC LIMIT 8`,
      [bookingId]
    ),
  ]);
  if (!totals || Number(totals.days) === 0) return null;
  return {
    days: Number(totals.days),
    present: Number(totals.present),
    lateCount: Number(totals.late_count),
    lateMinutes: Number(totals.late_minutes ?? 0),
    absences: absences.map((a) => ({ day: a.day, absence: a.absence, sickNote: a.sick_note, comment: a.comment, reported: a.reported })),
    absentTotal: Number(totals.absent),
  };
}
