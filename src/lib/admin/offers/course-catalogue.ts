import 'server-only';

import { query } from '../db';
import { loadPriceLists } from '../prices/repo';
import { toDateInputValue } from '@/lib/dates';

import { levelsBetween, type CourseCatalogue, type CourseSlot, type LearnerHistory } from './course';

/**
 * What a learner can be offered, from the workspace's own catalogue: every
 * course CASA sells at a price (not the ones quoted on request), its levels,
 * its terms still to come with their days, times and lessons, the books for
 * each half level, the exams, and the price lists. Read once per screen; the
 * offer keeps a copy of what was picked (docs/OFFERS.md §A learner's course).
 */

function slotFrom(schedule: unknown): CourseSlot | null {
  const s = schedule as { days?: unknown; time?: unknown } | null;
  if (!s || !Array.isArray(s.days) || typeof s.time !== 'string') return null;
  return { days: s.days.filter((d): d is string => typeof d === 'string'), time: s.time };
}

export async function courseCatalogue(): Promise<CourseCatalogue> {
  const [types, terms, books, exams, prices] = await Promise.all([
    // Intensive, evening and special courses first, then the rest (course_types.position, 0040).
    query<{ id: string; slug: string; name: string; name_de: string | null; lessons_per_week: number; level_min: string | null; level_max: string | null; default_price: string }>(
      `SELECT id, slug, name, name_de, lessons_per_week, level_min, level_max, default_price
         FROM course_types WHERE is_active AND pricing_mode <> 'on_request' ORDER BY position, name`
    ),
    query<{ id: string; course_type_id: string; start_date: Date; end_date: Date; schedule: unknown; lessons: number | null }>(
      `SELECT id, course_type_id, start_date, end_date, schedule, lessons FROM course_instances
        WHERE start_date >= current_date AND status <> 'cancelled' ORDER BY start_date`
    ),
    query<{ id: string; title: string; level_code: string; part: number | null }>(
      `SELECT m.id, m.title, m.level_code, m.part
         FROM materials m WHERE m.is_active AND m.level_code IS NOT NULL ORDER BY m.level_code, m.part NULLS LAST`
    ),
    // The full exam (both parts) at the rate for its date; a session's own fee wins.
    query<{ code: string; name: string; level: string; day: string; fee: string | null }>(
      `SELECT t.code, t.name, t.level, to_char(s.starts_at AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD') AS day,
              COALESCE(s.fee_override,
                       (SELECT amount FROM rates WHERE id = applicable_rate('exam_type', (s.starts_at AT TIME ZONE 'Europe/Berlin')::date,
                                                                            p_exam_type_id => t.id, p_parts => 2::smallint)),
                       NULLIF(t.default_fee, 0)) AS fee
         FROM exam_types t JOIN exam_sessions s ON s.exam_type_id = t.id
        WHERE t.is_active AND t.level IS NOT NULL AND s.starts_at > now() AND s.status <> 'cancelled'
        ORDER BY s.starts_at`
    ),
    loadPriceLists(),
  ]);

  const courses = types
    .map((t) => ({
      slug: t.slug,
      name: { de: t.name_de ?? t.name, en: t.name },
      lessonsPerWeek: t.lessons_per_week,
      levels: levelsBetween(t.level_min, t.level_max),
      listPrice: Number(t.default_price) > 0 ? Number(t.default_price) : null,
      terms: terms
        .filter((term) => term.course_type_id === t.id)
        .map((term) => ({
          id: term.id,
          startDate: toDateInputValue(term.start_date),
          endDate: toDateInputValue(term.end_date),
          slot: slotFrom(term.schedule),
          lessons: term.lessons,
        })),
    }))
    .filter((c) => c.terms.length > 0);

  return {
    courses,
    books: books.map((b) => ({ key: b.id, title: b.title, level: b.level_code, part: b.part })),
    exams: [...new Set(exams.map((e) => e.code))].map((code) => {
      const rows = exams.filter((e) => e.code === code);
      return { code, name: rows[0].name, level: rows[0].level, sessions: rows.map((e) => ({ date: e.day, fee: e.fee == null ? null : Number(e.fee) })) };
    }),
    prices,
  };
}

/**
 * What CASA knows of a learner from their bookings, as SQL over a person id.
 * Studied before: a booking that went ahead, or one that was charged the
 * enrolment fee — FileMaker charges the fee once per learner, ever, and a
 * cancelled booking that paid it still counts. Stayed before: a booking with
 * accommodation that went ahead; the placement fee and deposit are for the
 * first stay.
 */
export const studiedBeforeSql = (person: string) => `EXISTS (
  SELECT 1 FROM bookings b
   WHERE canonical_person_id(b.person_id) = canonical_person_id(${person}) AND b.deleted_at IS NULL
     AND (b.status <> 'cancelled'
          OR EXISTS (SELECT 1 FROM booking_charges c WHERE c.booking_id = b.id AND (c.charge_type_code = 'enrolment_fee' OR c.kind = 'enrolment_fee'))))`;

export const stayedBeforeSql = (person: string) => `EXISTS (
  SELECT 1 FROM bookings b
   WHERE canonical_person_id(b.person_id) = canonical_person_id(${person}) AND b.deleted_at IS NULL
     AND b.status <> 'cancelled' AND b.accommodation_from IS NOT NULL)`;

export async function learnerHistory(personId: string): Promise<LearnerHistory> {
  const rows = await query<{ studied: boolean; stayed: boolean }>(
    `SELECT ${studiedBeforeSql('$1::uuid')} AS studied, ${stayedBeforeSql('$1::uuid')} AS stayed`,
    [personId]
  );
  return { studiedBefore: Boolean(rows[0]?.studied), stayedBefore: Boolean(rows[0]?.stayed) };
}
