import { bildungszeitOffer } from './bildungszeit';
import { ownCoursePrice } from './courses';
import type { BookingOffer, CohortOffer, CourseTypeOffer } from './booking-offer-types';
import { query, queryFirst } from './db';
import { upcomingSittings } from './exams';
import { accommodationLine, bookedLevelLabel, bookedSpan, ENROLMENT_FEE, isIsoDay, isJoinMonday } from './booking-levels';
import type { Bilingual } from './i18n';
import { accommodationWeeks, teachingWeeks, termLessons } from './offers/course';
import { coursePrice, listOn, rentPrice, type PriceList } from './prices/price-list';
import { loadPriceLists } from './prices/repo';
import { upcomingLevelPlaces } from './waitlist';
import { bremenDate } from '@/lib/appointments/schedule';
import { toDateInputValue } from '@/lib/dates';

/**
 * What CASA can sell today, priced from the operational setup.
 *
 * The booking wizard asks one question at a time — what kind of course, which
 * one, which level, books, accommodation — and every answer narrows the next
 * question. This module is the catalogue behind that: it reads the cohorts,
 * the levels, the material list and the accommodation vocabulary, and resolves
 * each price through `applicable_rate()` as of today — a course's tuition and
 * the rent through the price list (src/lib/admin/prices), whose weeks tables
 * `applicable_rate()` does not read.
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
  const [cohortRows, examRows, levels, materials, accommodation, roomTypes, catering, fee, prices, sittings] =
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
        lessons_per_week: number;
        schedule: { days?: string[]; time?: string } | null;
        lessons: number | null;
        default_price: string;
        type_position: number;
        format: string | null;
      }>(
        `SELECT i.id, i.course_type_id, coalesce(nullif(trim(t.name_de), ''), t.name) AS course_type_name, t.slug, t.format, t.position AS type_position, i.title,
                i.start_date, i.end_date, i.level_code, i.session,
                coalesce(r.nickname, r.name) AS room_name, i.capacity,
                (SELECT count(DISTINCT bp.booking_id) FROM booking_periods bp
                   JOIN bookings b ON b.id = bp.booking_id
                  WHERE bp.course_instance_id = i.id
                    AND b.deleted_at IS NULL AND b.status <> 'cancelled') AS seats_taken,
                t.lessons_per_week, i.schedule, i.lessons, t.default_price
           FROM course_instances i
           JOIN course_types t ON t.id = i.course_type_id
           LEFT JOIN rooms r ON r.id = i.room_id
          WHERE i.end_date >= current_date AND i.status <> 'cancelled'
          ORDER BY i.start_date, t.position, t.name`
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
        // The half levels: 'B1+', kept for registrations and placements made before B1+ was booked in halves, is left out.
        `SELECT code, cefr FROM levels l
          WHERE NOT EXISTS (SELECT 1 FROM levels h WHERE h.code LIKE l.code || '.%')
          ORDER BY sort_order`
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
          ORDER BY level_rank(m.level_code), m.level_code, m.part NULLS LAST, m.title`
      ),
      query<{ code: string; name_en: string; name_de: string | null; is_casa_managed: boolean }>(
        `SELECT code, name_en, name_de, is_casa_managed FROM accommodation_types
          WHERE is_bookable ORDER BY position`
      ),
      query<{ code: string; name_en: string; name_de: string | null }>(
        `SELECT code, name_en, name_de FROM accommodation_room_types ORDER BY position`
      ),
      query<{ code: string; name_en: string; name_de: string | null }>(
        `SELECT code, name_en, name_de FROM catering_options ORDER BY position`
      ),
      queryFirst<{ amount: string | null }>(
        `SELECT amount FROM rates WHERE id = applicable_rate(
           'charge_type'::rate_scope, current_date, NULL, NULL, NULL, NULL, NULL,
           NULL, 'enrolment_fee', NULL, NULL, NULL, NULL)`
      ),
      loadPriceLists(),
      upcomingSittings(),
    ]);

  const byType = new Map<string, CourseTypeOffer>();
  const typeOrder = new Map<string, number>();

  const places = await upcomingLevelPlaces();

  for (const row of cohortRows) {
    const { weeks, price } = cohortPrice(prices, row);
    const published = Number(row.default_price);

    const slot = scheduleOf(row.schedule);
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
      format: row.format,
      days: slot?.days ?? null,
      time: slot?.time ?? null,
      roomName: row.room_name,
      seatsTaken: Number(row.seats_taken),
      capacity: row.capacity,
      levels: places.get(row.id) ?? {},
      tuition: price?.amount ?? (published > 0 ? published : null),
      tuitionUnit: price || published > 0 ? 'item' : null,
    };

    typeOrder.set(row.course_type_id, row.type_position);
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

  // Bildungszeit is booked into the intensive classes of a week (2026-10-17): offered whenever such a
  // week is ahead, whether or not it has starts of its own.
  const bildungszeit = await bildungszeitOffer();
  if (bildungszeit?.weeks.length && !byType.has(bildungszeit.courseTypeId)) {
    byType.set(bildungszeit.courseTypeId, { id: bildungszeit.courseTypeId, name: bildungszeit.name, slug: 'bildungszeit', cohorts: [] });
  }

  return {
    bildungszeit,
    // Intensive, evening and special courses first, then the rest (course_types.position, 0040).
    courseTypes: [...byType.values()].sort((a, b) => (typeOrder.get(a.id) ?? 100) - (typeOrder.get(b.id) ?? 100) || a.name.localeCompare(b.name)),
    exams: examRows.map((e) => ({
      id: e.id,
      name: e.name,
      feeBothParts: e.fee_both === null ? null : Number(e.fee_both),
      feeOnePart: e.fee_one === null ? null : Number(e.fee_one),
      sittings: sittings
        .filter((s) => s.examTypeId === e.id)
        .map((s) => ({
          id: s.id,
          startsAt: s.startsAt,
          deadline: s.registrationDeadline,
          places: { places: s.capacity, booked: s.booked, offered: s.offered, queue: s.queue, offeredTo: s.offeredTo },
        })),
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
      name: names(a),
      isCasaManaged: a.is_casa_managed,
    })),
    roomTypes: roomTypes.map((r) => ({ code: r.code, name: names(r) })),
    catering: catering.map((c) => ({ code: c.code, name: names(c) })),
    enrolmentFee: fee?.amount === null || fee?.amount === undefined ? null : Number(fee.amount),
    currency: 'EUR',
  };
}

/** A start's schedule as stored: its weekdays and its time, when it has them. */
function scheduleOf(schedule: { days?: string[]; time?: string } | null): { days: string[]; time: string } | null {
  return Array.isArray(schedule?.days) && typeof schedule?.time === 'string' ? { days: schedule.days, time: schedule.time } : null;
}

const names = (r: { name_en: string; name_de: string | null }): Bilingual => ({ de: r.name_de?.trim() || r.name_en, en: r.name_en });

/**
 * A cohort's tuition from the price list in force when it starts: its teaching weeks, its lessons — or,
 * for the part of it booked (an intensive start's first half, a second half joined here, a course joined
 * while it runs), that part's. `share`: the part's class days of the whole, for a course's own price.
 */
function cohortPrice(
  prices: readonly PriceList[],
  row: { slug: string; start_date: Date; end_date: Date; lessons_per_week: number; schedule: { days?: string[]; time?: string } | null; lessons: number | null },
  booked?: { startDate: string; endDate: string } | null
) {
  const startDate = toDateInputValue(row.start_date);
  const endDate = toDateInputValue(row.end_date);
  const part =
    booked && (booked.startDate !== startDate || booked.endDate !== endDate)
      ? { startDate: booked.startDate < startDate ? startDate : booked.startDate, endDate: booked.endDate > endDate ? endDate : booked.endDate }
      : null;
  const span = part && part.endDate >= part.startDate ? part : { startDate, endDate };
  const weeks = teachingWeeks(span.startDate, span.endDate);
  const slot = scheduleOf(row.schedule);
  const lessons = termLessons({ ...span, slot, lessons: span === part ? null : row.lessons }, row.lessons_per_week);
  // Class days, counted alike for the part and the whole: one a day, whatever the lessons a week.
  const days = (term: { startDate: string; endDate: string }) => termLessons({ ...term, slot, lessons: null }, slot?.days.length || 5);
  const share = span === part ? days(span) / Math.max(1, days({ startDate, endDate })) : 1;
  return { weeks, share, price: coursePrice(prices, row.slug, startDate, { weeks, lessons }) };
}

const format = (d: Date) =>
  new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

/**
 * The dates a booking of a start at a level covers, decided here and not by the form (`bookedSpan`):
 * the whole start; an intensive start's first half alone, to the end of its fourth teaching week; a
 * second half joined at a start, to the end of the running course of the start before (as
 * `resolveCourse` books it). A learner joining a course already running (2026-10-17) starts on their
 * Monday, `join`: a teaching week of the start, not before this one. Null when the start does not
 * exist, or the course cannot be joined from that Monday.
 */
export async function bookedPeriod(
  courseInstanceId: string,
  levelCode: string | null,
  scope: 'whole' | 'half',
  join: string | null = null
): Promise<{ startDate: string; endDate: string } | null> {
  if (join && !isIsoDay(join)) return null;
  const row = await queryFirst<{ start_date: string; end_date: string; format: string | null; schedule: { days?: string[]; time?: string } | null; running_end: string | null }>(
    `SELECT to_char(i.start_date, 'YYYY-MM-DD') AS start_date, to_char(i.end_date, 'YYYY-MM-DD') AS end_date, t.format, i.schedule,
            (SELECT to_char(r.end_date, 'YYYY-MM-DD') FROM course_instances r JOIN course_types rt ON rt.id = r.course_type_id
              WHERE rt.format = 'intensive' AND r.status <> 'cancelled' AND r.start_date < i.start_date AND r.end_date >= greatest(i.start_date, $2::date)
              ORDER BY r.start_date DESC LIMIT 1) AS running_end
       FROM course_instances i JOIN course_types t ON t.id = i.course_type_id
      WHERE i.id = $1`,
    [courseInstanceId, join]
  );
  if (!row) return null;
  if (join && join > row.start_date && !isJoinMonday(join, row.start_date, row.end_date, bremenDate())) return null;
  return bookedSpan(
    { format: row.format, startDate: row.start_date, endDate: row.end_date, days: scheduleOf(row.schedule)?.days ?? null, runningEnd: row.running_end },
    levelCode,
    scope,
    join
  );
}

// ------------------------------------------------------------------ accommodation

export type StayVocabulary = {
  types: { code: string; name: Bilingual; bookable: boolean }[];
  rooms: { code: string; name: Bilingual }[];
  catering: { code: string; name: Bilingual }[];
};

/** The accommodation types, rooms and meals, each name in both languages. */
export async function stayVocabulary(): Promise<StayVocabulary> {
  const [types, rooms, catering] = await Promise.all([
    query<{ code: string; name_en: string; name_de: string | null; is_bookable: boolean }>(
      `SELECT code, name_en, name_de, is_bookable FROM accommodation_types ORDER BY position`
    ),
    query<{ code: string; name_en: string; name_de: string | null }>(`SELECT code, name_en, name_de FROM accommodation_room_types ORDER BY position`),
    query<{ code: string; name_en: string; name_de: string | null }>(`SELECT code, name_en, name_de FROM catering_options ORDER BY position`),
  ]);
  return {
    types: types.map((t) => ({ code: t.code, name: names(t), bookable: t.is_bookable })),
    rooms: rooms.map((r) => ({ code: r.code, name: names(r) })),
    catering: catering.map((c) => ({ code: c.code, name: names(c) })),
  };
}

export type StayChoice = { typeCode: string; roomTypeCode: string | null; cateringCode: string | null; from: string | null; to: string | null };

/**
 * The rent for a stay, as the offers price it (src/lib/admin/offers/course.ts): whole weeks, Sunday to
 * Saturday, from the price list in force on arrival. A rate for this kind of stay — its type, room or
 * meals (`rates`, scope `accommodation`), per week or one price — comes first; the 2026 list has none,
 * as SchoolMan prices every type alike, so today every stay is the list's rent for its weeks.
 * Written in German; the letters say it in their own language (`chargeLineNames`).
 */
export async function accommodationCharge(stay: StayChoice, lists?: readonly PriceList[]): Promise<PricedLine | null> {
  const prices = lists ?? (await loadPriceLists());
  const weeks = accommodationWeeks({ kind: 'host_family', from: stay.from, to: stay.to });
  const vocabulary = await stayVocabulary();
  const type = vocabulary.types.find((t) => t.code === stay.typeCode);
  if (!type) return null;
  const rate = stay.from
    ? await queryFirst<{ id: string; amount: string; unit: string }>(
        `SELECT id, amount, unit::text AS unit FROM rates WHERE id = applicable_rate(
           'accommodation'::rate_scope, $1::date, NULL, NULL, NULL, $2, $3, $4,
           NULL, NULL, NULL, $5::numeric, NULL)`,
        [stay.from, stay.typeCode, stay.cateringCode, stay.roomTypeCode, weeks || null]
      )
    : null;
  const rent = rate
    ? { id: rate.id, amount: rate.unit === 'week' ? Number(rate.amount) * weeks : Number(rate.amount) }
    : rentPrice(prices, stay.from, weeks);
  if (!rent || !(rent.amount > 0)) return null;
  const facts = {
    type: type.name,
    room: vocabulary.rooms.find((r) => r.code === stay.roomTypeCode)?.name ?? null,
    catering: vocabulary.catering.find((c) => c.code === stay.cateringCode)?.name ?? null,
    from: stay.from,
    to: stay.to,
  };
  return {
    kind: 'accommodation',
    chargeTypeCode: 'accommodation_rent',
    description: accommodationLine(facts, weeks, 'de'),
    amount: Math.round(rent.amount * 100) / 100,
    quantity: weeks || null,
    unitAmount: null,
    rateId: rent.id,
  };
}

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
  /** Bildungszeit (2026-10-17): two intensive classes for this many weeks, priced as Bildungszeit. */
  superintensive?: { weeks: number } | null;
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
 *
 * The descriptions are written in German — the course type's, the room's and
 * the meals' German names (2026-10-17: the letters read them, and CASA writes
 * German) — and a letter in English says them in English where a line can be
 * traced to what it is (`chargeLineNames`).
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
        description: ENROLMENT_FEE.de,
        amount: Number(fee.amount),
        quantity: null,
        unitAmount: null,
        rateId: fee.id,
      });
    }
  }

  const prices = await loadPriceLists();

  if (selection.kind === 'course' && selection.superintensive) {
    // Bildungszeit's own price for the weeks, else what it is: two intensive courses, twice the weeks
    // (one week 280 €, two 520 € — the intensive course's two and four weeks).
    const weeks = selection.superintensive.weeks;
    const own = listOn(prices, on)?.courses['bildungszeit']?.table[weeks] ?? null;
    const price = own ?? coursePrice(prices, 'intensive-german', on, { weeks: weeks * 2 });
    const amount = selection.tuitionOverride ?? price?.amount ?? null;
    const type = selection.courseTypeId
      ? await queryFirst<{ name: string; name_de: string | null }>(`SELECT name, name_de FROM course_types WHERE id = $1`, [selection.courseTypeId])
      : null;
    if (amount && amount > 0) {
      lines.push({
        kind: 'tuition',
        chargeTypeCode: 'tuition',
        description: `${type?.name_de?.trim() || type?.name || 'Bildungszeit'} · ${formatIso(selection.startDate)} – ${formatIso(selection.endDate)}`,
        amount,
        quantity: null,
        unitAmount: null,
        rateId: selection.tuitionOverride === null ? (price?.id ?? null) : null,
      });
    }
  } else if (selection.kind === 'course' && selection.courseInstanceId) {
    // The price list's price for this cohort — or the part of it booked — else the catalogue's own price.
    const course = await queryFirst<{
      title: string | null;
      name: string;
      name_de: string | null;
      format: string | null;
      level_code: string | null;
      slug: string;
      start_date: Date;
      end_date: Date;
      lessons_per_week: number;
      schedule: { days?: string[]; time?: string } | null;
      lessons: number | null;
      default_price: string;
    }>(
      `SELECT i.title, t.name, t.name_de, t.format, i.level_code,
              t.slug, i.start_date, i.end_date, t.lessons_per_week, i.schedule, i.lessons, t.default_price
         FROM course_instances i
         JOIN course_types t ON t.id = i.course_type_id
        WHERE i.id = $1`,
      [selection.courseInstanceId]
    );
    if (course) {
      // The course's own price first (an evening term, a module: SchoolMan's per course), then the list.
      // Either for the part booked: a learner joining a running course pays for the weeks from their Monday
      // (2026-10-17) — the list by those weeks and lessons, an own price by its share of the class days.
      const own = await ownCoursePrice(selection.courseInstanceId, selection.levelCode);
      const { price: listed, share } = cohortPrice(prices, course, { startDate: selection.startDate, endDate: selection.endDate });
      const price = own ? { id: null, amount: Math.round(own.amount * share * 100) / 100 } : listed;
      const resolved = selection.tuitionOverride ?? price?.amount ?? Number(course.default_price);
      // „Intensivkurs A2.1–A2.2 · 26.10.26 – 18.12.26": the course in German, how much of the level, the dates booked.
      const level = bookedLevelLabel([
        { format: course.format, levelCode: selection.levelCode ?? course.level_code, startDate: selection.startDate, endDate: selection.endDate },
      ]);
      if (resolved > 0) {
        lines.push({
          kind: 'tuition',
          chargeTypeCode: 'tuition',
          description: `${course.title?.trim() || course.name_de?.trim() || course.name}${level ? ` ${level}` : ''} · ${formatIso(selection.startDate)} – ${formatIso(selection.endDate)}`,
          amount: resolved,
          quantity: null,
          unitAmount: null,
          rateId: selection.tuitionOverride === null ? (price?.id ?? null) : null,
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
        // The exam's name, the same in both languages; the parts are on the booking, and its letters say them in the reader's.
        description: exam.name,
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
        ORDER BY level_rank(m.level_code), m.level_code, m.part NULLS LAST`,
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
    const line = await accommodationCharge(
      {
        typeCode: selection.accommodationTypeCode,
        roomTypeCode: selection.roomTypeCode,
        cateringCode: selection.cateringCode,
        from: selection.accommodationFrom,
        to: selection.accommodationTo,
      },
      prices
    );
    if (line) lines.push(line);
  }

  return lines;
}

const formatIso = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

// ------------------------------------------------------------------ a cost line from the price list

/** A line a colleague can add to a booking with one click: its words and its price from the price list. */
export type ChargeSuggestion = {
  key: string;
  kind: 'tuition' | 'books' | 'enrolment_fee' | 'exam_fee' | 'accommodation' | 'deposit' | 'discount' | 'cancellation' | 'other';
  description: string;
  amount: number;
  chargeTypeCode: string | null;
  rateId: string | null;
  /** A book of the booking's own level: first in the list. */
  ownLevel: boolean;
};

const SUGGESTED_KIND: Record<string, ChargeSuggestion['kind']> = {
  enrolment_fee: 'enrolment_fee',
  exam_fee: 'exam_fee',
  deposit: 'deposit',
  discount: 'discount',
  cancellation: 'cancellation',
  books: 'books',
  teaching_material: 'books',
};

/**
 * What „Posten hinzufügen" offers (Rahman, 2026-10-23: „we can't waste time on typing everything"): every
 * book with its price, the booking's level first; every fee the price list in force prices (enrolment,
 * deposit, the accommodation's placement fee …); every exam with its fee. A click fills the line.
 */
export async function chargeSuggestions(levels: readonly string[]): Promise<ChargeSuggestion[]> {
  const [books, fees, exams] = await Promise.all([
    query<{ id: string; title: string; level_code: string | null; rate_id: string; amount: string }>(
      `SELECT m.id, m.title, m.level_code, r.id AS rate_id, r.amount
         FROM materials m
         JOIN rates r ON r.id = applicable_rate('material'::rate_scope, current_date, NULL, NULL, m.id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
        WHERE m.is_active
        ORDER BY level_rank(m.level_code), m.level_code NULLS LAST, m.part NULLS LAST, m.title`
    ),
    query<{ code: string; category_code: string | null; name_de: string | null; name_en: string; rate_id: string; amount: string }>(
      `SELECT ct.code, ct.category_code, ct.name_de, ct.name_en, r.id AS rate_id, r.amount
         FROM charge_types ct
         JOIN rates r ON r.id = applicable_rate('charge_type'::rate_scope, current_date, NULL, NULL, NULL, NULL, NULL, NULL, ct.code, NULL, NULL, NULL, NULL)
        WHERE ct.is_active AND ct.code NOT IN ('tuition', 'accommodation_rent', 'carry_over', 'refund')
        ORDER BY ct.position`
    ),
    query<{ id: string; name: string; rate_id: string; amount: string }>(
      `SELECT e.id, e.name, r.id AS rate_id, r.amount
         FROM exam_types e
         JOIN rates r ON r.id = applicable_rate('exam_type'::rate_scope, current_date, NULL, e.id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2::smallint)
        WHERE e.is_active
        ORDER BY e.name`
    ),
  ]);
  const own = new Set(levels);
  return [
    ...books
      .map((b) => ({
        key: `book:${b.id}`,
        kind: 'books' as const,
        description: `Bücher · ${b.title}`,
        amount: Number(b.amount),
        chargeTypeCode: 'books',
        rateId: b.rate_id,
        ownLevel: Boolean(b.level_code && own.has(b.level_code)),
      }))
      .sort((a, b) => Number(b.ownLevel) - Number(a.ownLevel)),
    ...fees.map((f) => ({
      key: `fee:${f.code}`,
      kind: SUGGESTED_KIND[f.code] ?? (f.category_code === 'accommodation' ? ('accommodation' as const) : ('other' as const)),
      description: f.name_de?.trim() || f.name_en,
      amount: Number(f.amount),
      chargeTypeCode: f.code,
      rateId: f.rate_id,
      ownLevel: false,
    })),
    ...exams.map((e) => ({
      key: `exam:${e.id}`,
      kind: 'exam_fee' as const,
      description: e.name,
      amount: Number(e.amount),
      chargeTypeCode: 'exam_fee',
      rateId: e.rate_id,
      ownLevel: false,
    })),
  ];
}

/** The learner and every record merged into them: one person's bookings, wherever SchoolMan kept them. */
const SAME_PERSON = `SELECT p.id FROM people p, (SELECT coalesce(merged_into, id) AS id FROM people WHERE id = $1) me WHERE p.id = me.id OR p.merged_into = me.id`;

/**
 * What a booking should cost and does not yet show (Rahman, 2026-10-23: „if someone is booked in a course,
 * it should already predict the book and the course price, and whether the registration fee is necessary,
 * since every student pays it only once"): the course price of each period when the booking has none; the
 * book of each level booked, unless the learner bought it already, on this booking or another; the
 * enrolment fee, unless the learner has paid it on any booking. Priced as the booking wizard prices
 * (`priceSelection`), so a suggestion is what a new booking would have cost.
 */
export async function expectedCharges(input: {
  bookingId: string;
  personId: string;
  courseTypeId: string | null;
  periods: readonly { courseInstanceId: string | null; startDate: string; endDate: string; levelCode: string | null }[];
  /** „B1.1–B1.2": a whole level booked, both halves and their books. */
  levelRange: string | null;
  charges: readonly { kind: string; description: string; amount: number }[];
}): Promise<ChargeSuggestion[]> {
  const out: ChargeSuggestion[] = [];
  const none = (kind: string) => !input.charges.some((c) => c.kind === kind && c.amount > 0);

  if (none('tuition')) {
    for (const p of input.periods) {
      if (!p.courseInstanceId) continue;
      const lines = await priceSelection({
        kind: 'course',
        courseInstanceId: p.courseInstanceId,
        courseTypeId: input.courseTypeId,
        examTypeId: null,
        examParts: null,
        startDate: p.startDate,
        endDate: p.endDate,
        levelCode: p.levelCode,
        tuitionOverride: null,
        includeEnrolmentFee: false,
        materialIds: [],
        accommodationTypeCode: null,
        roomTypeCode: null,
        cateringCode: null,
        accommodationFrom: null,
        accommodationTo: null,
      });
      for (const l of lines.filter((line) => line.kind === 'tuition')) {
        out.push({ key: `tuition:${p.courseInstanceId}:${p.startDate}`, kind: 'tuition', description: l.description, amount: l.amount, chargeTypeCode: 'tuition', rateId: l.rateId, ownLevel: true });
      }
    }
  }

  // The levels booked: each period's, and both halves of a whole level („B1.1–B1.2").
  const levels = new Set(input.periods.map((p) => p.levelCode).filter((l): l is string => Boolean(l)));
  for (const end of input.levelRange?.split(/[–-]/) ?? []) if (/^[ABC][12]\+?\.\d$/.test(end.trim())) levels.add(end.trim());
  const [books, bought, enrolled, fee] = await Promise.all([
    levels.size
      ? query<{ id: string; title: string; rate_id: string; amount: string }>(
          `SELECT DISTINCT ON (m.level_code) m.id, m.title, r.id AS rate_id, r.amount
             FROM materials m
             JOIN rates r ON r.id = applicable_rate('material'::rate_scope, current_date, NULL, NULL, m.id, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
            WHERE m.is_active AND m.level_code = ANY($1::text[])
            ORDER BY m.level_code, m.part NULLS LAST, m.title`,
          [[...levels]]
        )
      : Promise.resolve([]),
    query<{ words: string }>(
      `SELECT lower(c.description) AS words FROM booking_charges c JOIN bookings b ON b.id = c.booking_id
        WHERE b.person_id IN (${SAME_PERSON}) AND c.kind = 'books' AND c.amount > 0`,
      [input.personId]
    ),
    // Once per learner, on their first booking: none when a fee is kept on any booking (charged and not taken
    // back), nor when they booked before — SchoolMan's older years are not all here, and a returning learner paid then.
    queryFirst<{ one: number }>(
      `SELECT 1 AS one FROM booking_charges c JOIN bookings b ON b.id = c.booking_id
        WHERE b.person_id IN (${SAME_PERSON}) AND c.kind = 'enrolment_fee'
        GROUP BY c.booking_id HAVING sum(c.amount) > 0
       UNION ALL
       SELECT 1 FROM bookings b
        WHERE b.person_id IN (${SAME_PERSON}) AND b.id <> $2 AND b.deleted_at IS NULL AND b.status <> 'cancelled'
          AND b.created_at < (SELECT created_at FROM bookings WHERE id = $2)
       LIMIT 1`,
      [input.personId, input.bookingId]
    ),
    queryFirst<{ id: string; amount: string }>(
      `SELECT id, amount FROM rates WHERE id = applicable_rate('charge_type'::rate_scope, current_date, NULL, NULL, NULL, NULL, NULL, NULL, 'enrolment_fee', NULL, NULL, NULL, NULL)`
    ),
  ]);
  for (const b of books) {
    if (bought.some((x) => x.words.includes(b.title.toLocaleLowerCase('de')))) continue;
    out.push({ key: `book:${b.id}`, kind: 'books', description: `Bücher · ${b.title}`, amount: Number(b.amount), chargeTypeCode: 'books', rateId: b.rate_id, ownLevel: true });
  }
  if (!enrolled && fee && none('enrolment_fee')) {
    out.push({ key: 'fee:enrolment_fee', kind: 'enrolment_fee', description: ENROLMENT_FEE.de, amount: Number(fee.amount), chargeTypeCode: 'enrolment_fee', rateId: fee.id, ownLevel: false });
  }
  return out;
}
