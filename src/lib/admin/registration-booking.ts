import { logActivity } from './activity';
import type { StaffUser } from './auth';
import { levelFree, levelPlaces } from './booking-offer-types';
import { stayFor, wishesWholeLevel } from './booking-levels';
import { bookedPeriod, priceSelection, type BookingSelection } from './booking-offer';
import { BookingRefused, createBooking, type BookingStatus, type ChargeKind, type Payer } from './bookings';
import { queryFirst } from './db';
import { isExamParts, ratedParts } from './exam-parts';
import { getSitting } from './exams';
import type { Bilingual } from './i18n';
import { getRegistration, type RegistrationCourseLine, type RegistrationExamLine } from './registrations';
import { startLevelPlaces } from './waitlist';
import { toDateInputValue } from '../dates';

/**
 * „Alle buchen" on an Anmeldung (0096, Rahman 2026-10-27): every line a colleague ticks becomes its own
 * booking — one per level, as SchoolMan books follow-on levels, each pointing at its line — and the exam
 * its exam booking. What a booking costs is decided as the wizard decides it (`priceSelection`): the
 * enrolment fee on the first course only, the stay around each course's own dates, so consecutive levels
 * read as one stay. A line that cannot be booked here is left open and named: no date yet, its level
 * full (its queue is the waiting list), or its sitting full.
 */

export type BookAllChoice = {
  /** The lines to book, course and exam alike. */
  lineIds: readonly string[];
  status: BookingStatus;
  payer: Payer;
  payerName: string | null;
  includeEnrolmentFee: boolean;
  /** The stay to book with each course, when one was asked for. */
  accommodation: { typeCode: string; roomTypeCode: string | null; cateringCode: string | null } | null;
};

export type BookAllResult = { booked: number; skipped: { line: string; reason: Bilingual }[] };

/** „A1 komplett · 8 Wochen" → „A1"; a code stays as it is. */
const levelWord = (raw: string | null) => raw?.trim().split(/\s/)[0] ?? null;

const courseName = (line: RegistrationCourseLine) => [line.courseTypeLabel, levelWord(line.declaredLevelRaw ?? line.declaredLevelCode)].filter(Boolean).join(' ');
const examName = (line: RegistrationExamLine) => line.examTypeLabel ?? '';

export async function bookRegistration(registrationId: string, choice: BookAllChoice, actor: StaffUser): Promise<BookAllResult | null> {
  const registration = await getRegistration(registrationId);
  if (!registration?.personId) return null;
  const personId = registration.personId;
  const chosen = new Set(choice.lineIds);
  const result: BookAllResult = { booked: 0, skipped: [] };
  let fee = choice.includeEnrolmentFee;

  for (const line of registration.courses) {
    if (!chosen.has(line.id) || line.outcome.kind === 'booked' || line.outcome.kind === 'declined') continue;
    const name = courseName(line);
    if (!line.courseInstanceId) {
      result.skipped.push({ line: name, reason: { de: 'noch kein Termin', en: 'no date yet' } });
      continue;
    }
    const dates = await bookedPeriod(line.courseInstanceId, line.declaredLevelCode, wishesWholeLevel(line.declaredLevelRaw) ? 'whole' : 'half');
    if (!dates) {
      result.skipped.push({ line: name, reason: { de: 'der Termin ist nicht mehr buchbar', en: 'the start can no longer be booked' } });
      continue;
    }
    if (line.declaredLevelCode) {
      const places = await startLevelPlaces(line.courseInstanceId);
      if (levelFree(levelPlaces({ levels: places }, line.declaredLevelCode), personId) === 0) {
        result.skipped.push({ line: name, reason: { de: 'das Niveau ist voll', en: 'the level is full' } });
        continue;
      }
    }
    const courseTypeId =
      line.courseTypeId ??
      (await queryFirst<{ id: string }>(`SELECT course_type_id AS id FROM course_instances WHERE id = $1`, [line.courseInstanceId]))?.id ??
      null;
    const stay = choice.accommodation ? stayFor(dates.startDate, dates.endDate) : null;
    const selection: BookingSelection = {
      kind: 'course',
      courseInstanceId: line.courseInstanceId,
      courseTypeId,
      examTypeId: null,
      examParts: null,
      startDate: dates.startDate,
      endDate: dates.endDate,
      levelCode: line.declaredLevelCode,
      tuitionOverride: null,
      includeEnrolmentFee: fee,
      materialIds: [],
      accommodationTypeCode: stay ? choice.accommodation!.typeCode : null,
      roomTypeCode: stay ? choice.accommodation!.roomTypeCode : null,
      cateringCode: stay ? choice.accommodation!.cateringCode : null,
      accommodationFrom: stay?.from ?? null,
      accommodationTo: stay?.to ?? null,
    };
    const charges = await priceSelection(selection);
    await createBooking(
      {
        personId,
        courseTypeId,
        courseInstanceId: line.courseInstanceId,
        levelCode: line.declaredLevelCode,
        startDate: dates.startDate,
        endDate: dates.endDate,
        status: choice.status,
        payer: choice.payer,
        payerName: choice.payerName,
        visaRequired: registration.stay?.visaRequired ?? false,
        notes: null,
        accommodationTypeCode: selection.accommodationTypeCode,
        accommodationRoomTypeCode: selection.roomTypeCode,
        accommodationCateringCode: selection.cateringCode,
        accommodationFrom: selection.accommodationFrom,
        accommodationTo: selection.accommodationTo,
        charges: charges.map((c) => ({ kind: c.kind as ChargeKind, description: c.description, amount: c.amount, chargeTypeCode: c.chargeTypeCode, rateId: c.rateId })),
        sourceRegistrationId: line.id,
      },
      actor
    );
    fee = false;
    result.booked += 1;
  }

  for (const line of registration.exams) {
    if (!chosen.has(line.id) || line.outcome.kind === 'booked' || line.outcome.kind === 'declined') continue;
    const name = examName(line);
    const sitting = line.examSessionId ? await getSitting(line.examSessionId) : null;
    if (!sitting) {
      result.skipped.push({ line: name, reason: { de: 'den Prüfungstermin gibt es nicht mehr', en: 'the sitting no longer exists' } });
      continue;
    }
    const parts = isExamParts(line.registrationType) ? line.registrationType : 'full';
    const day = toDateInputValue(sitting.startsAt);
    const charges = await priceSelection({
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
    try {
      await createBooking(
        {
          personId,
          courseTypeId: null,
          courseInstanceId: null,
          startDate: day,
          endDate: day,
          status: choice.status,
          payer: choice.payer,
          payerName: choice.payerName,
          visaRequired: false,
          notes: null,
          charges: charges.map((c) => ({ kind: c.kind as ChargeKind, description: c.description, amount: c.amount, chargeTypeCode: c.chargeTypeCode, rateId: c.rateId })),
          exam: { sessionId: sitting.id, parts, sourceRegistrationId: line.id },
        },
        actor
      );
      result.booked += 1;
    } catch (error) {
      if (!(error instanceof BookingRefused)) throw error;
      result.skipped.push({ line: name, reason: error.reason });
    }
  }

  if (result.booked) {
    await logActivity({ actor, entity: 'registration', entityId: registrationId, action: 'registration_booked', detail: { count: result.booked } });
  }
  return result;
}
