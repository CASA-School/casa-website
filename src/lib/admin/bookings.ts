import type { PoolClient } from 'pg';

import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { query, queryFirst, withTransaction } from './db';
import { raiseFlag } from './flags';

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
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  reserved: 'Reserved',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
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
export const PAYER_LABELS: Record<Payer, string> = {
  self: 'Learner',
  agency: 'Agency',
  company: 'Company',
  other: 'Other',
};
export const CHARGE_KIND_LABELS: Record<ChargeKind, string> = {
  enrolment_fee: 'Enrolment fee',
  tuition: 'Course price',
  books: 'Books',
  exam_fee: 'Exam fee',
  accommodation: 'Accommodation',
  deposit: 'Deposit',
  cancellation: 'Cancellation',
  discount: 'Discount',
  other: 'Other',
};
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: 'Card',
  cash: 'Cash',
  transfer: 'Bank transfer',
  carryover: 'Carried over',
  agency: 'Via agency',
  offset: 'Offset',
};

export type BookingListItem = {
  id: string;
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
};

export type BookingPeriod = {
  id: string;
  courseInstanceId: string | null;
  cohortLabel: string | null;
  startDate: Date;
  endDate: Date;
  kind: 'initial' | 'extension';
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
  periods: BookingPeriod[];
  charges: BookingCharge[];
  payments: Payment[];
  balance: number;
};

const LIST = `
  SELECT b.id, b.person_id, trim(p.first_name || ' ' || coalesce(p.last_name, '')) AS person_name,
         t.name AS course_type_name, b.status::text AS status, b.currency, b.created_at,
         (SELECT min(start_date) FROM booking_periods bp WHERE bp.booking_id = b.id) AS start_date,
         (SELECT max(end_date) FROM booking_periods bp WHERE bp.booking_id = b.id) AS end_date,
         coalesce((SELECT sum(amount) FROM booking_charges c WHERE c.booking_id = b.id), 0) AS charged,
         coalesce((SELECT sum(amount) FROM payments pm WHERE pm.booking_id = b.id AND pm.voided_at IS NULL), 0) AS paid
    FROM bookings b
    JOIN people p ON p.id = b.person_id
    LEFT JOIN course_types t ON t.id = b.course_type_id
`;

type ListRow = {
  id: string;
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
};

const toItem = (r: ListRow): BookingListItem => ({
  id: r.id,
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
});

export type BookingFilter = 'current' | 'upcoming' | 'reserved' | 'past' | 'cancelled' | 'all';

const FILTERS: Record<BookingFilter, string> = {
  current: `b.status IN ('reserved','confirmed') AND EXISTS (SELECT 1 FROM booking_periods bp WHERE bp.booking_id = b.id AND bp.start_date <= current_date AND bp.end_date >= current_date)`,
  upcoming: `b.status IN ('reserved','confirmed') AND (SELECT min(start_date) FROM booking_periods bp WHERE bp.booking_id = b.id) > current_date`,
  reserved: `b.status = 'reserved'`,
  past: `b.status = 'completed' OR ((SELECT max(end_date) FROM booking_periods bp WHERE bp.booking_id = b.id) < current_date AND b.status <> 'cancelled')`,
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
    where += ` AND (p.first_name ILIKE $1 OR p.last_name ILIKE $1 OR t.name ILIKE $1)`;
  }
  const total = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM bookings b JOIN people p ON p.id = b.person_id LEFT JOIN course_types t ON t.id = b.course_type_id ${where}`,
    params
  );
  const rows = await query<ListRow>(
    `${LIST} ${where} ORDER BY start_date DESC NULLS LAST, b.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
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

export async function personBookings(canonicalPersonId: string): Promise<BookingListItem[]> {
  const rows = await query<ListRow>(
    `${LIST} WHERE b.deleted_at IS NULL AND canonical_person_id(b.person_id) = $1 ORDER BY start_date DESC NULLS LAST`,
    [canonicalPersonId]
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
    }
  >(
    `${LIST.replace(
      'FROM bookings b',
      `, b.course_type_id, b.payer, b.payer_name, b.visa_required, b.notes, b.source_registration_id,
         b.cancelled_at, b.cancel_reason
    FROM bookings b`
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
    }>(
      `SELECT bp.id, bp.course_instance_id, bp.start_date, bp.end_date, bp.kind,
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
    }>(
      `SELECT pm.id, pm.amount, pm.method, pm.received_at, pm.subject, pm.reference,
              u.name AS recorded_by_name, pm.voided_at, pm.void_reason
         FROM payments pm LEFT JOIN staff_users u ON u.id = pm.recorded_by
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
    periods: periods.map((p) => ({
      id: p.id,
      courseInstanceId: p.course_instance_id,
      cohortLabel: p.cohort_label,
      startDate: p.start_date,
      endDate: p.end_date,
      kind: p.kind,
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
    })),
    balance: item.charged - item.paid,
  };
}

// -------------------------------------------------------------- mutations

export type NewBooking = {
  personId: string;
  courseTypeId: string | null;
  courseInstanceId: string | null;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  payer: Payer;
  payerName: string | null;
  visaRequired: boolean;
  notes: string | null;
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
};

async function addPeriodOn(
  client: PoolClient,
  bookingId: string,
  input: {
    courseInstanceId: string | null;
    startDate: string;
    endDate: string;
    kind: 'initial' | 'extension';
  },
  actor: StaffUser
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO booking_periods (booking_id, course_instance_id, start_date, end_date, kind, created_by)
     VALUES ($1, $2, $3::date, $4::date, $5, $6) RETURNING id`,
    [bookingId, input.courseInstanceId, input.startDate, input.endDate, input.kind, actor.id]
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
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO bookings (person_id, course_type_id, status, payer, payer_name, visa_required, notes, source_registration_id, created_by)
       VALUES ($1, $2, $3::booking_status, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        input.personId,
        input.courseTypeId,
        input.status,
        input.payer,
        input.payerName,
        input.visaRequired,
        input.notes,
        input.sourceRegistrationId ?? null,
        actor.id,
      ]
    );
    const id = rows[0].id;
    await addPeriodOn(
      client,
      id,
      {
        courseInstanceId: input.courseInstanceId,
        startDate: input.startDate,
        endDate: input.endDate,
        kind: 'initial',
      },
      actor
    );
    for (const c of input.charges) {
      await client.query(
        `INSERT INTO booking_charges
           (booking_id, kind, description, amount, charge_type_code, rate_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, c.kind, c.description, c.amount, c.chargeTypeCode ?? null, c.rateId ?? null, actor.id]
      );
    }
    if (input.sourceRegistrationId) {
      await client.query(
        `UPDATE course_registrations SET status = 'done' WHERE id = $1 AND status <> 'done'`,
        [input.sourceRegistrationId]
      );
    }
    await client.query(
      `INSERT INTO staff_activity (staff_user_id, staff_name, entity, entity_id, action, detail)
       VALUES ($1, $2, 'booking', $3, 'booking_created', $4)`,
      [
        actor.id,
        actor.name,
        id,
        JSON.stringify({ person: input.personId, from: input.sourceRegistrationId ?? null }),
      ]
    );
    return id;
  });
}

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
    `UPDATE bookings SET course_type_id = $2, status = $3::booking_status, payer = $4, payer_name = $5,
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

/** An extension: more dates, usually into the next cohort. */
export async function extendBooking(
  id: string,
  input: { courseInstanceId: string | null; startDate: string; endDate: string },
  actor: StaffUser
): Promise<void> {
  await withTransaction(async (client) => {
    await addPeriodOn(client, id, { ...input, kind: 'extension' }, actor);
  });
  await logActivity({
    actor,
    entity: 'booking',
    entityId: id,
    action: 'booking_extended',
    detail: input,
  });
}

export async function removePeriod(
  bookingId: string,
  periodId: string,
  actor: StaffUser
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const count = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM booking_periods WHERE booking_id = $1`,
    [bookingId]
  );
  if (Number(count?.n ?? 0) <= 1)
    return {
      ok: false,
      reason: 'A booking keeps at least one period. Cancel the booking instead.',
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

/** Money is never deleted: a wrong payment is voided, with a reason. */
export async function voidPayment(
  bookingId: string,
  paymentId: string,
  reason: string,
  actor: StaffUser
): Promise<void> {
  await query(
    `UPDATE payments SET voided_at = now(), voided_by = $3, void_reason = $4 WHERE id = $1 AND booking_id = $2 AND voided_at IS NULL`,
    [paymentId, bookingId, actor.id, reason]
  );
  await logActivity({
    actor,
    entity: 'booking',
    entityId: bookingId,
    action: 'payment_voided',
    detail: { payment: paymentId, reason },
  });
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

/** Soft delete. Refused while payments exist: money must stay visible. */
export async function deleteBooking(
  id: string,
  actor: StaffUser
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const paid = await queryFirst<{ n: string }>(
    `SELECT count(*) AS n FROM payments WHERE booking_id = $1`,
    [id]
  );
  if (Number(paid?.n ?? 0) > 0)
    return { ok: false, reason: 'This booking has payments. Cancel it instead of deleting it.' };
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
