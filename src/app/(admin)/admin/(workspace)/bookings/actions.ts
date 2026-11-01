'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  addCharge,
  addFollowUp,
  bookingCourses,
  BOOKING_STATUSES,
  BookingRefused,
  cancelBooking,
  carryOverCredit,
  changeExam,
  changeStay,
  completeFollowUp,
  createBooking,
  deleteBooking,
  endObservation,
  extendBooking,
  getBooking,
  isLevelCode,
  observeBooking,
  recordPayment,
  removeCharge,
  removePeriod,
  setPeriodLevel,
  updateBooking,
  voidPayment,
  type BookingStatus,
  type ChargeKind,
  type PaymentMethod,
  type Payer,
  bookingYears,
  type BookingYear,
} from '@/lib/admin/bookings';
import { bildungszeitClasses, bildungszeitTypeId } from '@/lib/admin/bildungszeit';
import { setBooksHandedOut } from '@/lib/admin/books';
import { addDays, BZ_WEEKS, bzSegments } from '@/lib/admin/bildungszeit-rules';
import { accommodationCharge, bookedPeriod, expectedCharges, priceSelection, stayVocabulary, type BookingSelection } from '@/lib/admin/booking-offer';
import { addToWaitlist } from '@/lib/admin/waitlist';
import { senderUndecided } from '@/lib/admin/registration-person';
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
import { canAccess } from '@/lib/admin/access';
import { isUuid } from '@/lib/admin/ids';
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
  // „2.052,98 €", „2052,98", „2052.98": a German amount's thousands dots go when it has a decimal comma.
  const typed = String(formData.get(field) ?? '').replace(/[€\s]/g, '');
  const raw = typed.includes(',') ? typed.replace(/\./g, '').replace(',', '.') : typed;
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

/** Nothing is booked or queued from a registration whose person is still undecided (2026-11-01). */
async function requireSenderDecided(formData: FormData, back: string): Promise<void> {
  const undecided = await senderUndecided({ courseLine: optionalId(formData, 'sourceRegistrationId'), examLine: optionalId(formData, 'sourceExamRegistrationId') });
  if (undecided) fail(back, (await getI18n()).t('Erst die Person klären: schon bei CASA oder neu.', 'Confirm the person first: already at CASA, or new.'));
}

/** A stay's arrival and departure from a form: dates or nothing, departure not before arrival. */
function readStayDates(formData: FormData, back: string, t: T): { from: string | null; to: string | null } {
  const from = String(formData.get('accommodationFrom') ?? '');
  const to = String(formData.get('accommodationTo') ?? '');
  if ((from && !DATE.test(from)) || (to && !DATE.test(to))) fail(back, t('Bitte gib An- und Abreise als Datum an.', 'Give arrival and departure as dates.'));
  if (from && to && to < from) fail(back, t('Die Abreise liegt vor der Anreise.', 'Departure is before arrival.'));
  return { from: from || null, to: to || null };
}

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
  const back = `/admin/bookings/${bookingId}`;
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
  // The stay, when the form carried it (a course booking that is not cancelled): changed, its rent priced again.
  if (formData.get('stayFields') === '1') {
    const { t } = await getI18n();
    const typeCode = text(formData, 'accommodationTypeCode', 40);
    const vocabulary = await stayVocabulary();
    const known = (list: { code: string }[], code: string | null) => (code && list.some((v) => v.code === code) ? code : null);
    const stay = typeCode
      ? {
          typeCode: known(vocabulary.types, typeCode) ?? fail(back, t('Unbekannte Unterkunft.', 'Unknown accommodation.')),
          roomTypeCode: known(vocabulary.rooms, text(formData, 'roomTypeCode', 40)),
          cateringCode: known(vocabulary.catering, text(formData, 'cateringCode', 40)),
          ...readStayDates(formData, back, t),
        }
      : null;
    if (stay && (!stay.from || !stay.to)) fail(back, t('Die Unterkunft braucht An- und Abreise.', 'The stay needs arrival and departure.'));
    const rent = stay ? await accommodationCharge(stay) : null;
    await changeStay(bookingId, stay, rent ? { description: rent.description, amount: rent.amount, rateId: rent.rateId } : null, actor);
  }
  revalidatePath('/admin/bookings', 'layout');
  redirect(back);
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
  // A line taken from the price list keeps its charge type and the rate it came from.
  const chargeTypeCode = String(formData.get('chargeTypeCode') ?? '');
  const rateId = String(formData.get('rateId') ?? '');
  await addCharge(
    bookingId,
    {
      kind: kind as ChargeKind,
      description,
      amount,
      chargeTypeCode: /^[a-z_]{2,40}$/.test(chargeTypeCode) ? chargeTypeCode : null,
      rateId: UUID.test(rateId) ? rateId : null,
    },
    actor
  );
  revalidatePath('/admin/bookings', 'layout');
  redirect(back);
}

/**
 * The lines the price list says a booking is missing, added in one click (2026-10-23): each one asked for,
 * or all. Worked out again here from the booking — the page sends only which ones — so the amounts are the
 * price list's.
 */
export async function addSuggestedChargesAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const bookingId = id(formData, 'bookingId');
  const back = `/admin/bookings/${bookingId}`;
  const keys = new Set(formData.getAll('key').map(String));
  const booking = await getBooking(bookingId);
  if (!booking || booking.status === 'cancelled' || booking.exam) redirect(back);
  const courses = await bookingCourses(bookingId);
  const expected = await expectedCharges({
    bookingId,
    personId: booking.personId,
    courseTypeId: booking.courseTypeId,
    periods: courses.map((c) => ({ courseInstanceId: c.courseInstanceId, startDate: c.startDate, endDate: c.endDate, levelCode: c.levelCode })),
    levelRange: booking.levelRange,
    charges: booking.charges,
  });
  for (const line of expected.filter((e) => keys.has(e.key))) {
    await addCharge(bookingId, { kind: line.kind, description: line.description, amount: line.amount, chargeTypeCode: line.chargeTypeCode, rateId: line.rateId }, actor);
  }
  revalidatePath('/admin/bookings', 'layout');
  redirect(back);
}

/** A book line's books handed out — or, a mistake, not (0087): red to green and back, on the booking. */
export async function setBooksHandedOutAction(input: { chargeId: string; handedOut: boolean }): Promise<{ ok: boolean }> {
  const actor = await requireModule('bookings', 'edit');
  if (!UUID.test(String(input.chargeId))) return { ok: false };
  const result = await setBooksHandedOut(input.chargeId, input.handedOut === true, actor);
  revalidatePath('/admin/bookings', 'layout');
  return result;
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
  // The payment confirmed in writing at once, when the colleague asked for it: the receipt, then its mail screen.
  redirect(formData.get('receipt') === '1' && amount! > 0 ? `${back}/letter?kind=receipt` : back);
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

/**
 * The colour chosen from a booking's dot, as in SchoolMan (Rahman, 2026-10-18): `ok` — in order, so the
 * booking shows what its money says (green, or grey until paid) —, `watch` — u.B., yellow —, or `no` —
 * red, the booking cancelled, which takes the right to cancel and the confirmation. Used on the booking's
 * page and wherever its dot is, so it revalidates the workspace.
 */
export async function setBookingLightAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const bookingId = id(formData, 'bookingId');
  const choice = String(formData.get('light') ?? '');
  if (choice === 'ok') await endObservation(bookingId, actor);
  else if (choice === 'watch') await observeBooking(bookingId, actor);
  else if (choice === 'no') {
    const canceller = await requireModule('bookings', 'full');
    if (!confirmed(formData)) return;
    await cancelBooking(bookingId, 'Cancelled', canceller);
  } else throw new Error('Invalid colour');
  revalidatePath('/admin', 'layout');
}

/** A follow-up set: a day to look at the booking again, and why (0062). */
export async function addFollowUpAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const bookingId = id(formData, 'bookingId');
  const back = `/admin/bookings/${bookingId}`;
  const { t } = await getI18n();
  const due = String(formData.get('dueOn') ?? '').trim();
  const reason = text(formData, 'reason', 300);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) fail(back, t('Bitte wähle den Tag.', 'Choose the day.'));
  if (!reason) fail(back, t('Sag kurz, worum es geht.', 'Say briefly what it is about.'));
  await addFollowUp(bookingId, due, reason!, actor);
  revalidatePath('/admin/bookings', 'layout');
  redirect(back);
}

/** Looked at: the follow-up is done. */
export async function completeFollowUpAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const bookingId = id(formData, 'bookingId');
  const followUpId = id(formData, 'followUpId');
  await completeFollowUp(bookingId, followUpId, actor);
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
  await requireSenderDecided(formData, safeBack);

  const kind = String(formData.get('kind') ?? 'course') === 'exam' ? 'exam' : 'course';
  if (kind === 'exam') return createExamBooking(formData, actor, personId, safeBack);
  if (formData.get('superintensive') === '1') return createBildungszeitBooking(formData, actor, personId, safeBack);
  const { t } = await getI18n();
  const courseInstanceId = optionalId(formData, 'courseInstanceId');
  const levelRaw = text(formData, 'levelCode', 8);
  const levelCode = levelRaw && (await isLevelCode(levelRaw)) ? levelRaw : null;
  // A start's dates are worked out here from the level, how much of it and the Monday a learner joins a
  // running course from (2026-10-17), never taken from the form: the price follows them.
  const joinFrom = text(formData, 'joinFrom', 10);
  const dates = courseInstanceId
    ? await bookedPeriod(courseInstanceId, levelCode, formData.get('levelScope') === 'half' ? 'half' : 'whole', joinFrom)
    : readDates(formData, safeBack, t);
  if (!dates)
    fail(
      safeBack,
      joinFrom
        ? t('Ab dieser Woche kann niemand mehr in den Kurs einsteigen.', 'The course can no longer be joined from that week.')
        : t('Diesen Kurstermin gibt es nicht mehr.', 'That course start no longer exists.')
    );
  const status = String(formData.get('status') ?? 'reserved');
  if (!(BOOKING_STATUSES as readonly string[]).includes(status)) throw new Error('Invalid status');
  const payer = String(formData.get('payer') ?? 'self');
  if (!PAYERS.has(payer)) throw new Error('Invalid payer');

  const materialIds = formData
    .getAll('materialIds')
    .map(String)
    .filter((value) => UUID.test(value));

  const selection: BookingSelection = {
    kind,
    courseInstanceId,
    courseTypeId: optionalId(formData, 'courseTypeId'),
    examTypeId: null,
    examParts: null,
    startDate: dates.startDate,
    endDate: dates.endDate,
    levelCode,
    // No money comes from the wizard: the cohort's price is resolved on the
    // server. An override only exists when a colleague edits the booking.
    tuitionOverride: null,
    includeEnrolmentFee: formData.get('includeEnrolmentFee') === '1',
    materialIds,
    accommodationTypeCode: text(formData, 'accommodationTypeCode', 40),
    roomTypeCode: text(formData, 'roomTypeCode', 40),
    cateringCode: text(formData, 'cateringCode', 40),
    accommodationFrom: readStayDates(formData, safeBack, t).from,
    accommodationTo: readStayDates(formData, safeBack, t).to,
  };

  const lines = await priceSelection(selection);

  const bookingId = await createBooking(
    {
      personId,
      courseTypeId: selection.courseTypeId,
      courseInstanceId: selection.courseInstanceId,
      levelCode,
      startDate: dates.startDate,
      endDate: dates.endDate,
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
  await requireSenderDecided(formData, safeBack);
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
  redirect(`/admin/letters/mail?ids=${result.letterId}&saved=1`);
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

/**
 * What is still owed, year by year — worked out only when asked (Rahman, 2026-10-21: „the amount shouldn't be
 * just written there but calculated only if requested"), from the bookings filter panel. The totals are
 * finance's and management's: whoever holds the price list (`prices`).
 */
export async function bookingTotalsAction(input: { payer?: string; typeId?: string; programme?: string; payerId?: string }): Promise<BookingYear[]> {
  const user = await requireModule('bookings');
  if (!canAccess(user, 'prices', 'view')) throw new Error('Not allowed');
  const payer = (['self', 'agency', 'company'] as const).find((p) => p === input.payer);
  const typeId = input.typeId === 'exam' || isUuid(input.typeId ?? '') ? input.typeId : undefined;
  const payerId = isUuid(input.payerId ?? '') ? input.payerId : undefined;
  // A programme's code (0093): letters and an underscore only, checked against the vocabulary by the query itself.
  const programme = /^[a-z_]{1,40}$/.test(input.programme ?? '') ? input.programme : undefined;
  return bookingYears({ payer, typeId, payerId, programme });
}
