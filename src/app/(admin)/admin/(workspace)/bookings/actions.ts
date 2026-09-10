'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  addCharge,
  BOOKING_STATUSES,
  cancelBooking,
  createBooking,
  deleteBooking,
  extendBooking,
  recordPayment,
  removeCharge,
  removePeriod,
  updateBooking,
  voidPayment,
  type BookingStatus,
  type ChargeKind,
  type PaymentMethod,
  type Payer,
} from '@/lib/admin/bookings';
import { priceSelection, type BookingSelection } from '@/lib/admin/booking-offer';
import { requireModule } from '@/lib/admin/guard';

/**
 * Bookings module mutations. Creating, editing, extending, adding cost lines
 * and recording payments need `edit`; cancelling, voiding a payment, removing
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
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}
const confirmed = (formData: FormData) => formData.get('confirmed') === '1';

function readDates(formData: FormData, back: string): { startDate: string; endDate: string } {
  const startDate = String(formData.get('startDate') ?? '');
  const endDate = String(formData.get('endDate') ?? '');
  if (!DATE.test(startDate) || !DATE.test(endDate)) fail(back, 'Start and end dates are required.');
  if (endDate < startDate) fail(back, 'The end date is before the start.');
  return { startDate, endDate };
}

export async function createBookingAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const personId = id(formData, 'personId');
  const back = String(formData.get('returnTo') ?? `/admin/people/${personId}`);
  const safeBack = /^\/admin(\/[A-Za-z0-9\-_/]*)?$/.test(back) ? back : '/admin/bookings';

  const dates = readDates(formData, safeBack);
  const status = String(formData.get('status') ?? 'reserved');
  if (!(BOOKING_STATUSES as readonly string[]).includes(status)) throw new Error('Invalid status');
  const payer = String(formData.get('payer') ?? 'self');
  if (!PAYERS.has(payer)) throw new Error('Invalid payer');

  const charges: { kind: ChargeKind; description: string; amount: number }[] = [];
  const tuition = money(formData, 'tuition');
  if (tuition !== null && tuition !== 0) {
    charges.push({
      kind: 'tuition',
      description: text(formData, 'tuitionLabel', 120) ?? 'Course price',
      amount: tuition,
    });
  }
  const fee = money(formData, 'enrolmentFee');
  if (fee !== null && fee !== 0)
    charges.push({ kind: 'enrolment_fee', description: 'Enrolment fee', amount: fee });

  const bookingId = await createBooking(
    {
      personId,
      courseTypeId: optionalId(formData, 'courseTypeId'),
      courseInstanceId: optionalId(formData, 'courseInstanceId'),
      ...dates,
      status: status as BookingStatus,
      payer: payer as Payer,
      payerName: text(formData, 'payerName', 120),
      visaRequired: formData.get('visaRequired') === 'on',
      notes: text(formData, 'notes', 2000),
      charges,
      sourceRegistrationId: optionalId(formData, 'sourceRegistrationId'),
    },
    actor
  );
  revalidatePath('/admin', 'layout');
  redirect(`/admin/bookings/${bookingId}`);
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
  const dates = readDates(formData, back);
  await extendBooking(
    bookingId,
    { courseInstanceId: optionalId(formData, 'courseInstanceId'), ...dates },
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
  if (!result.ok) fail(back, result.reason);
  redirect(back);
}

export async function addChargeAction(formData: FormData): Promise<void> {
  const actor = await requireModule('bookings', 'edit');
  const bookingId = id(formData, 'bookingId');
  const back = `/admin/bookings/${bookingId}`;
  const kind = String(formData.get('kind') ?? '');
  if (!KINDS.has(kind)) throw new Error('Invalid kind');
  const amount = money(formData, 'amount');
  if (amount === null || amount === 0) fail(back, 'An amount is required.');
  const description = text(formData, 'description', 160);
  if (!description) fail(back, 'Say what the line is for.');
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
  const amount = money(formData, 'amount');
  if (amount === null || amount === 0) fail(back, 'An amount is required.');
  const method = String(formData.get('method') ?? '');
  if (!METHODS.has(method)) throw new Error('Invalid method');
  const receivedAt = String(formData.get('receivedAt') ?? '');
  if (!DATE.test(receivedAt)) fail(back, 'A payment needs a date.');
  const subject = text(formData, 'subject', 160);
  if (!subject) fail(back, 'Say what the payment is for.');
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
  if (!result.ok) fail(back, result.reason);
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
  const dates = readDates(formData, safeBack);
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
    examTypeId: kind === 'exam' ? optionalId(formData, 'examTypeId') : null,
    examParts: String(formData.get('examParts') ?? '2') === '1' ? 1 : 2,
    ...dates,
    levelCode: levelRaw,
    tuitionAmount: kind === 'course' ? money(formData, 'tuitionAmount') : null,
    includeEnrolmentFee: formData.get('includeEnrolmentFee') === '1',
    materialIds,
    accommodationTypeCode: text(formData, 'accommodationTypeCode', 40),
    roomTypeCode: text(formData, 'roomTypeCode', 40),
    cateringCode: text(formData, 'cateringCode', 40),
    accommodationFrom: text(formData, 'accommodationFrom', 10),
    accommodationTo: text(formData, 'accommodationTo', 10),
    accommodationAmount: money(formData, 'accommodationAmount'),
  };

  const lines = await priceSelection(selection);
  if (lines.length === 0) fail(safeBack, 'Nothing to charge yet. Choose a course or an exam.');

  const bookingId = await createBooking(
    {
      personId,
      courseTypeId: selection.courseTypeId,
      courseInstanceId: selection.courseInstanceId,
      ...dates,
      status: status as BookingStatus,
      payer: payer as Payer,
      payerName: text(formData, 'payerName', 120),
      visaRequired: formData.get('visaRequired') === 'on',
      notes: text(formData, 'notes', 2000),
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
