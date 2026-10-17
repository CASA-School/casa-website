'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  addCharge,
  BOOKING_STATUSES,
  BookingRefused,
  cancelBooking,
  carryOverCredit,
  changeExam,
  createBooking,
  deleteBooking,
  endObservation,
  extendBooking,
  isLevelCode,
  observeBooking,
  OBSERVATION_REASONS,
  recordPayment,
  removeCharge,
  removePeriod,
  setPeriodLevel,
  updateBooking,
  voidPayment,
  type BookingStatus,
  type ChargeKind,
  type ObservationReason,
  type PaymentMethod,
  type Payer,
} from '@/lib/admin/bookings';
import { bildungszeitClasses, bildungszeitTypeId } from '@/lib/admin/bildungszeit';
import { addDays, BZ_WEEKS, bzSegments } from '@/lib/admin/bildungszeit-rules';
import { priceSelection, type BookingSelection } from '@/lib/admin/booking-offer';
import { addToWaitlist } from '@/lib/admin/waitlist';
import type { StaffUser } from '@/lib/admin/auth';
import { isExamParts, ratedParts } from '@/lib/admin/exam-parts';
import { addToExamWaitlist, getSitting } from '@/lib/admin/exams';
import { toDateInputValue } from '@/lib/dates';
import { issueBookingLetter } from '@/lib/admin/letters/booking-issue';
import { BOOKING_LETTER_KEYS, STANDARD_SLOTS, type ComposedKind } from '@/lib/admin/letters/booking-letters';
import { readChoices } from '@/lib/admin/letters/choices';
import { saveStandardText } from '@/lib/admin/letters/repo';
import { BOOKING_LETTER_KINDS, REGISTRATION_LETTER_KINDS, WAITLIST_LETTER_KINDS, type BookingLetterKind, type LetterLanguage } from '@/lib/admin/letters/types';
import { requireModule } from '@/lib/admin/guard';
import { pick, type T } from '@/lib/admin/i18n';
import { getI18n } from '@/lib/admin/i18n.server';

/**
 * Bookings module mutations. Creating, editing, extending, adding cost lines,
 * recording payments and carrying a credit over need `edit`; cancelling, voiding a payment, removing
 * a period or a cost line and deleting need `full` and the confirmation field.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PAYERS = new Set<string>(['self', 'agency', 'company', 'other']);
const KINDS = new Set<string>([
  'enrolment_fee',
  'tuition',
  'books',
  'exam_fee',
  'accommodation',
  'deposit',
  'cancellation',
  'discount',
  'other',
]);
const METHODS = new Set<string>(['card', 'cash', 'transfer', 'carryover', 'agency', 'offset']);

const id = (formData: FormData, field: string): string => {
  const value = String(formData.get(field) ?? '');
  if (!UUID.test(value)) throw new Error(`Invalid ${field}`);
  return value;
};
const optionalId = (formData: FormData, field: string): string | null => {
  const value = String(formData.get(field) ?? '');
  if (value === '') return null;
  if (!UUID.test(value)) throw new Error(`Invalid ${field}`);
  return value;
};
const text = (formData: FormData, field: string, max: number): string | null => {
  const value = String(formData.get(field) ?? '').trim();
  return value === '' ? null : value.slice(0, max);
};
const money = (formData: FormData, field: string): number | null => {
  const raw = String(formData.get(field) ?? '')
    .trim()
    .replace(',', '.');
  if (raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || Math.abs(n) > 1_000_000) throw new Error(`Invalid ${field}`);
  return Math.round(n * 100) / 100;
};
// A function declaration, not an arrow: TypeScript only narrows after a call
// to a `never`-returning function whose type is declared explicitly.
function fail(path: string, message: string): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(message)}`);
}
const confirmed = (formData: FormData) => formData.get('confirmed') === '1';

function readDates(formData: FormData, back: string, t: T): { startDate: string; endDate: string } {
  const startDate = String(formData.get('startDate') ?? '');
  const endDate = String(formData.get('endDate') ?? '');
  if (!DATE.test(startDate) || !DATE.test(endDate))
    fail(back, t('Start- und Enddatum sind nötig.', 'Start and end dates are required.'));
  if (endDate < startDate) fail(back, t('Das Enddatum liegt vor dem Start.', 'The end date is before the start.'));
  return { startDate, endDate };
}

export async function updateBookingAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const bookingId = id(formData, 'bookingId');
  const status = String(formData.get('status') ?? '');
  if (!(BOOKING_STATUSES as readonly string[]).includes(status)) throw new Error('Invalid status');
  const payer = String(formData.get('payer') ?? 'self');
  if (!PAYERS.has(payer)) throw new Error('Invalid payer');
  await updateBooking(
    bookingId,
    {
      courseTypeId: optionalId(formData, 'courseTypeId'),
      status: status as BookingStatus,
      payer: payer as Payer,
      payerName: text(formData, 'payerName', 120),
      visaRequired: formData.get('visaRequired') === 'on',
      notes: text(formData, 'notes', 2000),
    },
    actor
  );
  revalidatePath('/admin/bookings', 'layout');
  redirect(`/admin/bookings/${bookingId}`);
}

export async function extendBookingAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const bookingId = id(formData, 'bookingId');
  const back = `/admin/bookings/${bookingId}`;
  const { t } = await getI18n();
  const dates = readDates(formData, back, t);
  const levelRaw = text(formData, 'levelCode', 8);
  await extendBooking(
    bookingId,
    { courseInstanceId: optionalId(formData, 'courseInstanceId'), ...dates, levelCode: levelRaw && (await isLevelCode(levelRaw)) ? levelRaw : null },
    actor
  );
  const tuition = money(formData, 'tuition');
  if (tuition !== null && tuition !== 0) {
    await addCharge(
      bookingId,
      {
        kind: 'tuition',
        description: text(formData, 'tuitionLabel', 120) ?? 'Extension',
        amount: tuition,
      },
      actor
    );
  }
  revalidatePath('/admin/bookings', 'layout');
  redirect(back);
}

export async function removePeriodAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'full');
  const bookingId = id(formData, 'bookingId');
  const back = `/admin/bookings/${bookingId}`;
  if (!confirmed(formData)) redirect(back);
  const result = await removePeriod(bookingId, id(formData, 'periodId'), actor);
  revalidatePath('/admin/bookings', 'layout');
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  redirect(back);
}

export async function addChargeAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const bookingId = id(formData, 'bookingId');
  const back = `/admin/bookings/${bookingId}`;
  const kind = String(formData.get('kind') ?? '');
  if (!KINDS.has(kind)) throw new Error('Invalid kind');
  const { t } = await getI18n();
  const amount = money(formData, 'amount');
  if (amount === null || amount === 0) fail(back, t('Ein Betrag ist nötig.', 'An amount is required.'));
  const description = text(formData, 'description', 160);
  if (!description) fail(back, t('Schreib dazu, wofür der Posten ist.', 'Say what the line is for.'));
  await addCharge(bookingId, { kind: kind as ChargeKind, description, amount }, actor);
  revalidatePath('/admin/bookings', 'layout');
  redirect(back);
}

export async function removeChargeAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'full');
  const bookingId = id(formData, 'bookingId');
  const back = `/admin/bookings/${bookingId}`;
  if (!confirmed(formData)) redirect(back);
  await removeCharge(bookingId, id(formData, 'chargeId'), actor);
  revalidatePath('/admin/bookings', 'layout');
  redirect(back);
}

export async function recordPaymentAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const bookingId = id(formData, 'bookingId');
  const back = `/admin/bookings/${bookingId}`;
  const { t } = await getI18n();
  const amount = money(formData, 'amount');
  if (amount === null || amount === 0) fail(back, t('Ein Betrag ist nötig.', 'An amount is required.'));
  const method = String(formData.get('method') ?? '');
  if (!METHODS.has(method)) throw new Error('Invalid method');
  const receivedAt = String(formData.get('receivedAt') ?? '');
  if (!DATE.test(receivedAt)) fail(back, t('Eine Zahlung braucht ein Datum.', 'A payment needs a date.'));
  const subject = text(formData, 'subject', 160);
  if (!subject) fail(back, t('Schreib dazu, wofür die Zahlung ist.', 'Say what the payment is for.'));
  await recordPayment(
    bookingId,
    {
      amount,
      method: method as PaymentMethod,
      receivedAt,
      subject,
      reference: text(formData, 'reference', 120),
    },
    actor
  );
  revalidatePath('/admin/bookings', 'layout');
  redirect(back);
}

export async function voidPaymentAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'full');
  const bookingId = id(formData, 'bookingId');
  const back = `/admin/bookings/${bookingId}`;
  if (!confirmed(formData)) redirect(back);
  await voidPayment(
    bookingId,
    id(formData, 'paymentId'),
    text(formData, 'reason', 200) ?? 'Voided',
    actor
  );
  revalidatePath('/admin/bookings', 'layout');
  redirect(back);
}

/** A credit moved to another booking of the same learner; the library checks the person, the target and the amount. */
export async function carryOverAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const bookingId = id(formData, 'bookingId');
  const back = `/admin/bookings/${bookingId}`;
  const { t, lang } = await getI18n();
  const amount = money(formData, 'amount');
  if (amount === null || amount <= 0) fail(back, t('Ein Betrag über null ist nötig.', 'An amount above zero is required.'));
  const result = await carryOverCredit(bookingId, id(formData, 'targetId'), amount, actor);
  revalidatePath('/admin/bookings', 'layout');
  if (!result.ok) fail(back, pick(lang, result.reason));
  redirect(back);
}

/** Yellow, with its reason. „Sonstiges" needs a note saying what; the others may have one. */
export async function observeBookingAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const bookingId = id(formData, 'bookingId');
  const back = `/admin/bookings/${bookingId}`;
  const reason = String(formData.get('reason') ?? '');
  if (!(OBSERVATION_REASONS as readonly string[]).includes(reason)) {
    fail(back, (await getI18n()).t('Bitte wähle einen Grund.', 'Choose a reason.'));
  }
  const note = text(formData, 'note', 300);
  if (reason === 'other' && !note) {
    fail(back, (await getI18n()).t('Bei „Sonstiges" sag kurz, worum es geht.', 'For “Other”, say briefly what it is.'));
  }
  await observeBooking(bookingId, reason as ObservationReason, note, actor);
  revalidatePath('/admin/bookings', 'layout');
  redirect(back);
}

export async function endObservationAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const bookingId = id(formData, 'bookingId');
  await endObservation(bookingId, actor);
  revalidatePath('/admin/bookings', 'layout');
  redirect(`/admin/bookings/${bookingId}`);
}

export async function cancelBookingAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'full');
  const bookingId = id(formData, 'bookingId');
  const back = `/admin/bookings/${bookingId}`;
  if (!confirmed(formData)) redirect(back);
  await cancelBooking(bookingId, text(formData, 'reason', 200) ?? 'Cancelled', actor);
  revalidatePath('/admin', 'layout');
  redirect(back);
}

export async function deleteBookingAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'full');
  const bookingId = id(formData, 'bookingId');
  const back = `/admin/bookings/${bookingId}`;
  if (!confirmed(formData)) redirect(back);
  const result = await deleteBooking(bookingId, actor);
  revalidatePath('/admin', 'layout');
  if (!result.ok) fail(back, pick((await getI18n()).lang, result.reason));
  redirect('/admin/bookings');
}

/**
 * Creates a booking from the wizard's answers.
 *
 * The wizard sends a SELECTION, not a price list. Every rate-backed line —
 * the enrolment fee, each book, an exam entry — is resolved again here from
 * `rates`, so a crafted form cannot invent an amount. The two staff-agreed
 * figures, tuition and accommodation, do come from the form because CASA has
 * published no rate for them yet; both are clamped to a sane range.
 */
export async function createBookingFromWizardAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const personId = id(formData, 'personId');
  const raw = String(formData.get('returnTo') ?? '');
  const safeBack = /^\/admin(\/[A-Za-z0-9\-_/]*)?$/.test(raw) ? raw : `/admin/people/${personId}`;

  const kind = String(formData.get('kind') ?? 'course') === 'exam' ? 'exam' : 'course';
  if (kind === 'exam') return createExamBooking(formData, actor, personId, safeBack);
  if (formData.get('superintensive') === '1') return createBildungszeitBooking(formData, actor, personId, safeBack);
  const { t } = await getI18n();
  const dates = readDates(formData, safeBack, t);
  const status = String(formData.get('status') ?? 'reserved');
  if (!(BOOKING_STATUSES as readonly string[]).includes(status)) throw new Error('Invalid status');
  const payer = String(formData.get('payer') ?? 'self');
  if (!PAYERS.has(payer)) throw new Error('Invalid payer');

  const levelRaw = text(formData, 'levelCode', 8);
  const materialIds = formData
    .getAll('materialIds')
    .map(String)
    .filter((value) => UUID.test(value));

  const selection: BookingSelection = {
    kind,
    courseInstanceId: optionalId(formData, 'courseInstanceId'),
    courseTypeId: optionalId(formData, 'courseTypeId'),
    examTypeId: null,
    examParts: null,
    ...dates,
    levelCode: levelRaw,
    // No money comes from the wizard: the cohort's price is resolved on the
    // server. An override only exists when a colleague edits the booking.
    tuitionOverride: null,
    includeEnrolmentFee: formData.get('includeEnrolmentFee') === '1',
    materialIds,
    accommodationTypeCode: text(formData, 'accommodationTypeCode', 40),
    roomTypeCode: text(formData, 'roomTypeCode', 40),
    cateringCode: text(formData, 'cateringCode', 40),
    accommodationFrom: text(formData, 'accommodationFrom', 10),
    accommodationTo: text(formData, 'accommodationTo', 10),
  };

  const lines = await priceSelection(selection);

  const bookingId = await createBooking(
    {
      personId,
      courseTypeId: selection.courseTypeId,
      courseInstanceId: selection.courseInstanceId,
      levelCode: levelRaw && (await isLevelCode(levelRaw)) ? levelRaw : null,
      ...dates,
      status: status as BookingStatus,
      payer: payer as Payer,
      payerName: text(formData, 'payerName', 120),
      visaRequired: formData.get('visaRequired') === 'on',
      notes: text(formData, 'notes', 2000),
      accommodationTypeCode: selection.accommodationTypeCode,
      accommodationRoomTypeCode: selection.roomTypeCode,
      accommodationCateringCode: selection.cateringCode,
      accommodationFrom: selection.accommodationFrom,
      accommodationTo: selection.accommodationTo,
      charges: lines.map((line) => ({
        kind: line.kind as ChargeKind,
        description: line.description,
        amount: line.amount,
        chargeTypeCode: line.chargeTypeCode,
        rateId: line.rateId,
      })),
      sourceRegistrationId: optionalId(formData, 'sourceRegistrationId'),
    },
    actor
  );

  revalidatePath('/admin', 'layout');
  redirect(`/admin/bookings/${bookingId}`);
}

/** An exam booking's sitting or parts (0036): another sitting of the same exam with a place, or other parts. */
export async function changeExamAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const bookingId = id(formData, 'bookingId');
  const back = `/admin/bookings/${bookingId}`;
  const parts = String(formData.get('examParts') ?? '');
  if (!isExamParts(parts)) throw new Error('Invalid examParts');
  try {
    await changeExam(bookingId, { sessionId: id(formData, 'examSessionId'), parts }, actor);
  } catch (error) {
    if (error instanceof BookingRefused) fail(back, pick((await getI18n()).lang, error.reason));
    throw error;
  }
  revalidatePath('/admin', 'layout');
  redirect(back);
}

/**
 * A Bildungszeit booking from the wizard (2026-10-17): one booking of the Bildungszeit course, with a
 * period in each of the week's two intensive classes — the newest start at its first half (`B1.1`) and
 * the previous start at its second (`B1.2`) — for the same one or two weeks. The two classes are worked out
 * again here from the Monday; the form names only the levels. Priced as Bildungszeit on the server.
 */
async function createBildungszeitBooking(formData: FormData, actor: StaffUser, personId: string, back: string): Promise<void> {
  const { t } = await getI18n();
  const monday = String(formData.get('bzMonday') ?? '');
  const weeks = Number(formData.get('bzWeeks'));
  if (!DATE.test(monday) || new Date(`${monday}T00:00:00Z`).getUTCDay() !== 1 || !(BZ_WEEKS as readonly number[]).includes(weeks))
    fail(back, t('Bitte wähle die Woche.', 'Choose the week.'));
  const first = String(formData.get('levelFirst') ?? '');
  const second = String(formData.get('levelSecond') ?? '');
  if (!first.endsWith('.1') || !second.endsWith('.2') || !(await isLevelCode(first)) || !(await isLevelCode(second)))
    fail(back, t('Bitte wähle beide Kurse.', 'Choose both classes.'));
  const [classes, typeId] = await Promise.all([bildungszeitClasses(monday, weeks), bildungszeitTypeId()]);
  if (!classes || !typeId) fail(back, t('In dieser Woche laufen keine zwei Intensivkurse.', 'No two intensive courses run that week.'));
  const status = String(formData.get('status') ?? 'reserved');
  if (!(BOOKING_STATUSES as readonly string[]).includes(status)) throw new Error('Invalid status');
  const payer = String(formData.get('payer') ?? 'self');
  if (!PAYERS.has(payer)) throw new Error('Invalid payer');
  const endDate = addDays(monday, 7 * (weeks - 1) + 4);

  const selection: BookingSelection = {
    kind: 'course',
    courseInstanceId: null,
    courseTypeId: typeId,
    examTypeId: null,
    examParts: null,
    startDate: monday,
    endDate,
    levelCode: null,
    tuitionOverride: null,
    includeEnrolmentFee: formData.get('includeEnrolmentFee') === '1',
    materialIds: formData.getAll('materialIds').map(String).filter((value) => UUID.test(value)),
    accommodationTypeCode: text(formData, 'accommodationTypeCode', 40),
    roomTypeCode: text(formData, 'roomTypeCode', 40),
    cateringCode: text(formData, 'cateringCode', 40),
    accommodationFrom: text(formData, 'accommodationFrom', 10),
    accommodationTo: text(formData, 'accommodationTo', 10),
    superintensive: { weeks },
  };
  const lines = await priceSelection(selection);
  const bookingId = await createBooking(
    {
      personId,
      courseTypeId: typeId,
      courseInstanceId: null,
      startDate: monday,
      endDate,
      status: status as BookingStatus,
      payer: payer as Payer,
      payerName: text(formData, 'payerName', 120),
      visaRequired: formData.get('visaRequired') === 'on',
      notes: text(formData, 'notes', 2000),
      accommodationTypeCode: selection.accommodationTypeCode,
      accommodationRoomTypeCode: selection.roomTypeCode,
      accommodationCateringCode: selection.cateringCode,
      accommodationFrom: selection.accommodationFrom,
      accommodationTo: selection.accommodationTo,
      charges: lines.map((line) => ({ kind: line.kind as ChargeKind, description: line.description, amount: line.amount, chargeTypeCode: line.chargeTypeCode, rateId: line.rateId })),
      sourceRegistrationId: optionalId(formData, 'sourceRegistrationId'),
      // Per part of the run, a period at each half of the newest start: its first half is its own course,
      // its second the running course of the start before (`resolveCourse`). A new start begins a new part.
      periods: bzSegments(classes).flatMap((part) => [
        { courseInstanceId: part.start.id, levelCode: first, startDate: part.from, endDate: part.to },
        { courseInstanceId: part.start.id, levelCode: second, startDate: part.from, endDate: part.to },
      ]),
    },
    actor
  );
  revalidatePath('/admin', 'layout');
  redirect(`/admin/bookings/${bookingId}`);
}

/**
 * An exam booking from the wizard (0036): the sitting and the parts, priced on the server from the
 * exam's rate on its day. Refused when the sitting has no place left for this person — the wizard
 * offers the waiting list instead.
 */
async function createExamBooking(formData: FormData, actor: StaffUser, personId: string, back: string): Promise<void> {
  const { t, lang } = await getI18n();
  const sessionId = optionalId(formData, 'examSessionId');
  const parts = String(formData.get('examParts') ?? 'full');
  if (!isExamParts(parts)) throw new Error('Invalid examParts');
  if (!sessionId) fail(back, t('Bitte wähle einen Prüfungstermin.', 'Choose a sitting.'));
  const sitting = await getSitting(sessionId);
  if (!sitting) fail(back, t('Diesen Prüfungstermin gibt es nicht mehr.', 'That sitting no longer exists.'));
  const status = String(formData.get('status') ?? 'reserved');
  if (!(BOOKING_STATUSES as readonly string[]).includes(status)) throw new Error('Invalid status');
  const payer = String(formData.get('payer') ?? 'self');
  if (!PAYERS.has(payer)) throw new Error('Invalid payer');
  const day = toDateInputValue(sitting.startsAt);
  const lines = await priceSelection({
    kind: 'exam',
    courseInstanceId: null,
    courseTypeId: null,
    examTypeId: sitting.examTypeId,
    examParts: ratedParts(parts),
    startDate: day,
    endDate: day,
    levelCode: null,
    tuitionOverride: null,
    includeEnrolmentFee: false,
    materialIds: [],
    accommodationTypeCode: null,
    roomTypeCode: null,
    cateringCode: null,
    accommodationFrom: null,
    accommodationTo: null,
  });
  let bookingId: string;
  try {
    bookingId = await createBooking(
      {
        personId,
        courseTypeId: null,
        courseInstanceId: null,
        startDate: day,
        endDate: day,
        status: status as BookingStatus,
        payer: payer as Payer,
        payerName: text(formData, 'payerName', 120),
        visaRequired: false,
        notes: text(formData, 'notes', 2000),
        charges: lines.map((line) => ({
          kind: line.kind as ChargeKind,
          description: line.description,
          amount: line.amount,
          chargeTypeCode: line.chargeTypeCode,
          rateId: line.rateId,
        })),
        exam: { sessionId, parts, sourceRegistrationId: optionalId(formData, 'sourceExamRegistrationId') },
      },
      actor
    );
  } catch (error) {
    if (error instanceof BookingRefused) fail(back, pick(lang, error.reason));
    throw error;
  }
  revalidatePath('/admin', 'layout');
  redirect(`/admin/bookings/${bookingId}`);
}

/**
 * The wizard's other ending: the level is full, so the learner goes into its queue instead of a
 * booking. Nothing is priced and nothing is booked; the registration it came from is answered.
 */
export async function waitlistFromWizardAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const personId = id(formData, 'personId');
  const raw = String(formData.get('returnTo') ?? '');
  const safeBack = /^\/admin(\/[A-Za-z0-9\-_/]*)?$/.test(raw) ? raw : `/admin/people/${personId}`;
  const { t, lang } = await getI18n();
  // A full sitting: the candidate queues for it, with the parts they want (0036).
  if (String(formData.get('kind') ?? '') === 'exam') {
    const sessionId = optionalId(formData, 'examSessionId');
    const parts = String(formData.get('examParts') ?? 'full');
    if (!sessionId || !isExamParts(parts)) fail(safeBack, t('Für die Warteliste braucht es einen Prüfungstermin.', 'The waiting list needs a sitting.'));
    const registrationId = optionalId(formData, 'sourceExamRegistrationId');
    const queued = await addToExamWaitlist(
      { personId, examSessionId: sessionId, parts, source: registrationId ? 'registration' : 'office', registrationId, note: text(formData, 'notes', 300) },
      actor
    );
    if (!queued.ok) fail(safeBack, pick(lang, queued.reason));
    revalidatePath('/admin', 'layout');
    redirect(`/admin/catalogue/exams/${sessionId}`);
  }
  const courseInstanceId = optionalId(formData, 'courseInstanceId');
  const levelCode = text(formData, 'levelCode', 8);
  if (!courseInstanceId || !levelCode || !(await isLevelCode(levelCode))) {
    fail(safeBack, t('Für die Warteliste braucht es einen Kurstermin und ein Niveau.', 'The waiting list needs a course date and a level.'));
  }
  const registrationId = optionalId(formData, 'sourceRegistrationId');
  const result = await addToWaitlist(
    {
      personId,
      courseInstanceId,
      levelCode,
      source: registrationId ? 'registration' : 'office',
      registrationId,
      note: text(formData, 'notes', 300),
    },
    actor
  );
  if (!result.ok) fail(safeBack, pick(lang, result.reason));
  revalidatePath('/admin', 'layout');
  redirect(`/admin/catalogue/${courseInstanceId}?level=${encodeURIComponent(levelCode)}`);
}

/** A period's level, set or corrected: what the start's places count. */
export async function setPeriodLevelAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const bookingId = id(formData, 'bookingId');
  const back = `/admin/bookings/${bookingId}`;
  const levelRaw = text(formData, 'levelCode', 8);
  if (levelRaw && !(await isLevelCode(levelRaw))) fail(back, (await getI18n()).t('Unbekanntes Niveau.', 'Unknown level.'));
  await setPeriodLevel(bookingId, id(formData, 'periodId'), levelRaw, actor);
  revalidatePath('/admin', 'layout');
  redirect(back);
}

/**
 * A booking's letter, sent: built again on the server from the booking and the colleague's
 * choices, kept as it went out (docs/LETTERS.md), and then shown as sent, to print and mail.
 */
export async function issueBookingLetterAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const bookingId = id(formData, 'bookingId');
  const kind = String(formData.get('kind') ?? '');
  if (!(BOOKING_LETTER_KINDS as readonly string[]).includes(kind)) throw new Error('Invalid kind');
  const back = `/admin/bookings/${bookingId}/letter?kind=${BOOKING_LETTER_KEYS[kind as BookingLetterKind]}`;
  const choices = readChoices(formData);
  const { t, lang } = await getI18n();
  if (!choices) fail(back, t('Der Brief konnte nicht gelesen werden.', 'The letter could not be read.'));
  const result = await issueBookingLetter(bookingId, kind as BookingLetterKind, choices, actor);
  if (!result.ok) fail(back, pick(lang, result.reason));
  revalidatePath('/admin', 'layout');
  redirect(`/admin/letters/${result.letterId}?sent=1`);
}

/**
 * A letter's standard text — an opening, a closing — saved as CASA's: `full`, as for offers, on the
 * module the letter belongs to (a registration's on Registrations, the others on Bookings).
 */
export async function saveLetterStandardAction(input: { kind: string; language: LetterLanguage; part: string; body: string }): Promise<{ ok: boolean }> {
  const actor = await requireModule(String(input.kind).startsWith('registration_') ? 'registrations' : 'bookings', 'full');
  const kinds = [...BOOKING_LETTER_KINDS, ...WAITLIST_LETTER_KINDS, 'learner_confirmation', ...REGISTRATION_LETTER_KINDS] as readonly string[];
  if (!kinds.includes(input.kind) || (input.language !== 'de' && input.language !== 'en')) return { ok: false };
  const kind = input.kind as ComposedKind;
  const body = String(input.body ?? '').trim().slice(0, 2000);
  if (!STANDARD_SLOTS[kind].includes(input.part) || !body) return { ok: false };
  await saveStandardText(kind, input.language, input.part, body, actor);
  return { ok: true };
}
