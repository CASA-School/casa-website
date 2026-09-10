import type { BookingOffer, CohortOffer, CourseTypeOffer } from './booking-offer-types';
import { query, queryFirst } from './db';

/**
 * What CASA can sell today, priced from the operational setup.
 *
 * The booking wizard asks one question at a time — what kind of course, which
 * one, which level, books, accommodation — and every answer narrows the next
 * question. This module is the catalogue behind that: it reads the cohorts,
 * the levels, the material list and the accommodation vocabulary, and resolves
 * each price through `applicable_rate()` as of today.
 *
 * TWO PRICE ORIGINS, AND THE DIFFERENCE MATTERS
 *
 * A **rate** is set once in Settings and the workspace resolves it — the
 * enrolment fee, a book, an exam entry. Those are authoritative, and the
 * server re-resolves them when the booking is created; the browser's copy is
 * only for showing a running total.
 *
 * An **agreed amount** is typed by a staff member — the tuition where CASA has
 * not published a rate yet, a negotiated accommodation figure, a discount.
 * Those come from the form, validated for range. `priceSelection` keeps the
 * two apart so a client can never invent a rate-backed price.
 */

export type {
  AccommodationOffer,
  BookingOffer,
  CohortOffer,
  CourseTypeOffer,
  ExamOffer,
  MaterialOffer,
} from './booking-offer-types';

/** Everything the wizard needs, in one round trip. */
export async function bookingOffer(): Promise<BookingOffer> {
  const [cohortRows, examRows, levels, materials, accommodation, roomTypes, catering, fee] =
    await Promise.all([
      query<{
        id: string;
        course_type_id: string;
        course_type_name: string;
        slug: string;
        title: string | null;
        start_date: Date;
        end_date: Date;
        level_code: string | null;
        session: string | null;
        room_name: string | null;
        seats_taken: string;
        capacity: number;
        rate_amount: string | null;
        rate_unit: string | null;
        default_price: string;
      }>(
        `SELECT i.id, i.course_type_id, t.name AS course_type_name, t.slug, i.title,
                i.start_date, i.end_date, i.level_code, i.session,
                coalesce(r.nickname, r.name) AS room_name, i.capacity,
                (SELECT count(DISTINCT bp.booking_id) FROM booking_periods bp
                   JOIN bookings b ON b.id = bp.booking_id
                  WHERE bp.course_instance_id = i.id
                    AND b.deleted_at IS NULL AND b.status <> 'cancelled') AS seats_taken,
                rt.amount AS rate_amount, rt.unit::text AS rate_unit, t.default_price
           FROM course_instances i
           JOIN course_types t ON t.id = i.course_type_id
           LEFT JOIN rooms r ON r.id = i.room_id
           LEFT JOIN rates rt ON rt.id = applicable_rate(
             'course_type'::rate_scope, current_date, i.course_type_id, NULL, NULL, NULL, NULL,
             NULL, NULL, i.level_code, i.session, NULL, NULL)
          WHERE i.end_date >= current_date AND i.status <> 'cancelled'
          ORDER BY i.start_date, t.name`
      ),
      query<{
        id: string;
        name: string;
        fee_both: string | null;
        fee_one: string | null;
      }>(
        `SELECT e.id, e.name,
                (SELECT amount FROM rates WHERE id = applicable_rate(
                   'exam_type'::rate_scope, current_date, NULL, e.id, NULL, NULL, NULL,
                   NULL, NULL, NULL, NULL, NULL, 2::smallint)) AS fee_both,
                (SELECT amount FROM rates WHERE id = applicable_rate(
                   'exam_type'::rate_scope, current_date, NULL, e.id, NULL, NULL, NULL,
                   NULL, NULL, NULL, NULL, NULL, 1::smallint)) AS fee_one
           FROM exam_types e WHERE e.is_active ORDER BY e.name`
      ),
      query<{ code: string; cefr: string | null }>(
        `SELECT code, cefr FROM levels ORDER BY sort_order`
      ),
      query<{
        id: string;
        title: string;
        level_code: string | null;
        part: number | null;
        price: string | null;
      }>(
        `SELECT m.id, m.title, m.level_code, m.part,
                (SELECT amount FROM rates WHERE id = applicable_rate(
                   'material'::rate_scope, current_date, NULL, NULL, m.id, NULL, NULL,
                   NULL, NULL, NULL, NULL, NULL, NULL)) AS price
           FROM materials m
          WHERE m.is_active AND m.level_code IS NOT NULL
          ORDER BY m.level_code, m.part NULLS LAST, m.title`
      ),
      query<{ code: string; name_en: string; is_casa_managed: boolean }>(
        `SELECT code, name_en, is_casa_managed FROM accommodation_types
          WHERE is_bookable ORDER BY position`
      ),
      query<{ code: string; name_en: string }>(
        `SELECT code, name_en FROM accommodation_room_types ORDER BY position`
      ),
      query<{ code: string; name_en: string }>(
        `SELECT code, name_en FROM catering_options ORDER BY position`
      ),
      queryFirst<{ amount: string | null }>(
        `SELECT amount FROM rates WHERE id = applicable_rate(
           'charge_type'::rate_scope, current_date, NULL, NULL, NULL, NULL, NULL,
           NULL, 'enrolment_fee', NULL, NULL, NULL, NULL)`
      ),
    ]);

  const byType = new Map<string, CourseTypeOffer>();

  for (const row of cohortRows) {
    const weeks = weeksBetween(row.start_date, row.end_date);
    const rate = row.rate_amount === null ? null : Number(row.rate_amount);
    const published = Number(row.default_price);

    const cohort: CohortOffer = {
      id: row.id,
      courseTypeId: row.course_type_id,
      label: [
        row.title ?? row.course_type_name,
        row.level_code,
        `${format(row.start_date)} – ${format(row.end_date)}`,
        row.room_name,
      ]
        .filter(Boolean)
        .join(' · '),
      startDate: row.start_date,
      endDate: row.end_date,
      weeks,
      levelCode: row.level_code,
      session: row.session,
      roomName: row.room_name,
      seatsTaken: Number(row.seats_taken),
      capacity: row.capacity,
      tuition: rate ?? (published > 0 ? published : null),
      tuitionUnit:
        rate !== null
          ? (row.rate_unit as CohortOffer['tuitionUnit'])
          : published > 0
            ? 'item'
            : null,
    };

    const existing = byType.get(row.course_type_id);
    if (existing) existing.cohorts.push(cohort);
    else
      byType.set(row.course_type_id, {
        id: row.course_type_id,
        name: row.course_type_name,
        slug: row.slug,
        cohorts: [cohort],
      });
  }

  return {
    courseTypes: [...byType.values()].sort((a, b) => a.name.localeCompare(b.name)),
    exams: examRows.map((e) => ({
      id: e.id,
      name: e.name,
      feeBothParts: e.fee_both === null ? null : Number(e.fee_both),
      feeOnePart: e.fee_one === null ? null : Number(e.fee_one),
    })),
    levels,
    materials: materials.map((m) => ({
      id: m.id,
      title: m.title,
      levelCode: m.level_code,
      part: m.part,
      price: m.price === null ? null : Number(m.price),
    })),
    accommodation: accommodation.map((a) => ({
      code: a.code,
      name: a.name_en,
      isCasaManaged: a.is_casa_managed,
    })),
    roomTypes: roomTypes.map((r) => ({ code: r.code, name: r.name_en })),
    catering: catering.map((c) => ({ code: c.code, name: c.name_en })),
    enrolmentFee: fee?.amount === null || fee?.amount === undefined ? null : Number(fee.amount),
    currency: 'EUR',
  };
}

const weeksBetween = (from: Date, to: Date): number => {
  const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1;
  return Math.max(1, Math.round(days / 7));
};

const format = (d: Date) =>
  new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

// ------------------------------------------------------------------ pricing

export type BookingSelection = {
  kind: 'course' | 'exam';
  courseInstanceId: string | null;
  courseTypeId: string | null;
  examTypeId: string | null;
  examParts: 1 | 2 | null;
  startDate: string;
  endDate: string;
  levelCode: string | null;
  /** Agreed with the learner, only where a colleague overrides the catalogue. */
  tuitionOverride: number | null;
  includeEnrolmentFee: boolean;
  materialIds: string[];
  accommodationTypeCode: string | null;
  roomTypeCode: string | null;
  cateringCode: string | null;
  accommodationFrom: string | null;
  accommodationTo: string | null;
};

export type PricedLine = {
  kind: 'enrolment_fee' | 'tuition' | 'books' | 'exam_fee' | 'accommodation';
  chargeTypeCode: string | null;
  description: string;
  amount: number;
  quantity: number | null;
  unitAmount: number | null;
  rateId: string | null;
};

/**
 * The authoritative cost of a selection.
 *
 * Every line is resolved HERE, from `rates` and the catalogue. The wizard
 * sends choices and no money at all, which is why staff never see a price
 * while they are booking: the cost appears on the booking once it exists.
 *
 * The one exception is a deliberate override — a colleague changing the course
 * fee on the booking itself — which arrives as `tuitionOverride` and is
 * clamped by the action.
 */
export async function priceSelection(selection: BookingSelection): Promise<PricedLine[]> {
  const on = selection.startDate;
  const lines: PricedLine[] = [];

  if (selection.includeEnrolmentFee) {
    const fee = await queryFirst<{ id: string; amount: string }>(
      `SELECT id, amount FROM rates WHERE id = applicable_rate(
         'charge_type'::rate_scope, $1::date, NULL, NULL, NULL, NULL, NULL,
         NULL, 'enrolment_fee', NULL, NULL, NULL, NULL)`,
      [on]
    );
    if (fee) {
      lines.push({
        kind: 'enrolment_fee',
        chargeTypeCode: 'enrolment_fee',
        description: 'Enrolment fee',
        amount: Number(fee.amount),
        quantity: null,
        unitAmount: null,
        rateId: fee.id,
      });
    }
  }

  if (selection.kind === 'course' && selection.courseInstanceId) {
    // The published rate for this cohort, else the catalogue's own price.
    const course = await queryFirst<{
      label: string;
      rate_id: string | null;
      rate_amount: string | null;
      default_price: string;
    }>(
      `SELECT coalesce(i.title, t.name)
              || coalesce(' ' || i.level_code, '')
              || ' · ' || to_char(i.start_date, 'DD.MM.YY') || ' – ' || to_char(i.end_date, 'DD.MM.YY')
              AS label,
              r.id AS rate_id, r.amount AS rate_amount, t.default_price
         FROM course_instances i
         JOIN course_types t ON t.id = i.course_type_id
         LEFT JOIN rates r ON r.id = applicable_rate(
           'course_type'::rate_scope, $2::date, i.course_type_id, NULL, NULL, NULL, NULL,
           NULL, NULL, i.level_code, i.session, NULL, NULL)
        WHERE i.id = $1`,
      [selection.courseInstanceId, on]
    );
    if (course) {
      const resolved =
        selection.tuitionOverride ??
        (course.rate_amount !== null ? Number(course.rate_amount) : Number(course.default_price));
      if (resolved > 0) {
        lines.push({
          kind: 'tuition',
          chargeTypeCode: 'tuition',
          description: course.label,
          amount: resolved,
          quantity: null,
          unitAmount: null,
          rateId: selection.tuitionOverride === null ? course.rate_id : null,
        });
      }
    }
  }

  if (selection.kind === 'exam' && selection.examTypeId) {
    const exam = await queryFirst<{ name: string; rate_id: string | null; amount: string | null }>(
      `SELECT e.name, r.id AS rate_id, r.amount
         FROM exam_types e
         LEFT JOIN rates r ON r.id = applicable_rate(
           'exam_type'::rate_scope, $2::date, NULL, e.id, NULL, NULL, NULL,
           NULL, NULL, NULL, NULL, NULL, $3::smallint)
        WHERE e.id = $1`,
      [selection.examTypeId, on, selection.examParts ?? 2]
    );
    if (exam?.amount) {
      lines.push({
        kind: 'exam_fee',
        chargeTypeCode: 'exam_fee',
        description: `${exam.name}${selection.examParts === 1 ? ' · one part' : ''}`,
        amount: Number(exam.amount),
        quantity: null,
        unitAmount: null,
        rateId: exam.rate_id,
      });
    }
  }

  if (selection.materialIds.length > 0) {
    const books = await query<{
      id: string;
      title: string;
      rate_id: string | null;
      amount: string | null;
    }>(
      `SELECT m.id, m.title, r.id AS rate_id, r.amount
         FROM materials m
         LEFT JOIN rates r ON r.id = applicable_rate(
           'material'::rate_scope, $2::date, NULL, NULL, m.id, NULL, NULL,
           NULL, NULL, NULL, NULL, NULL, NULL)
        WHERE m.id = ANY($1::uuid[]) AND m.is_active
        ORDER BY m.level_code, m.part NULLS LAST`,
      [selection.materialIds, on]
    );
    for (const book of books) {
      if (book.amount === null) continue;
      lines.push({
        kind: 'books',
        chargeTypeCode: 'teaching_material',
        description: book.title,
        amount: Number(book.amount),
        quantity: null,
        unitAmount: null,
        rateId: book.rate_id,
      });
    }
  }

  if (selection.accommodationTypeCode) {
    const [type, rate] = await Promise.all([
      queryFirst<{ name_en: string }>(`SELECT name_en FROM accommodation_types WHERE code = $1`, [
        selection.accommodationTypeCode,
      ]),
      queryFirst<{ id: string; amount: string }>(
        `SELECT id, amount FROM rates WHERE id = applicable_rate(
           'accommodation'::rate_scope, $1::date, NULL, NULL, NULL, $2, $3, $4,
           NULL, NULL, NULL, NULL, NULL)`,
        [on, selection.accommodationTypeCode, selection.cateringCode, selection.roomTypeCode]
      ),
    ]);
    if (!rate) return lines;
    const extras = [
      selection.roomTypeCode
        ? (
            await queryFirst<{ name_en: string }>(
              `SELECT name_en FROM accommodation_room_types WHERE code = $1`,
              [selection.roomTypeCode]
            )
          )?.name_en
        : null,
      selection.cateringCode
        ? (
            await queryFirst<{ name_en: string }>(
              `SELECT name_en FROM catering_options WHERE code = $1`,
              [selection.cateringCode]
            )
          )?.name_en
        : null,
    ].filter(Boolean);
    const period =
      selection.accommodationFrom && selection.accommodationTo
        ? ` · ${formatIso(selection.accommodationFrom)} – ${formatIso(selection.accommodationTo)}`
        : '';
    lines.push({
      kind: 'accommodation',
      chargeTypeCode: 'accommodation_rent',
      description: `${type?.name_en ?? 'Accommodation'}${extras.length ? ` (${extras.join(', ')})` : ''}${period}`,
      amount: Number(rate.amount),
      quantity: null,
      unitAmount: null,
      rateId: rate.id,
    });
  }

  return lines;
}

const formatIso = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
