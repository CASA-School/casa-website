import { query } from './db';

/**
 * The school's own setup: the vocabularies. The price list has its own
 * module (src/lib/admin/prices).
 *
 * These are values CASA sets once and leaves alone for a season, so they live
 * under Settings rather than in the main navigation. The read side is a
 * summary per vocabulary. Adding a new *kind* of type is a migration, on
 * purpose.
 *
 * docs/CATALOGUE_AND_PRICING.md is the survey this model came from.
 */

export type VocabularySummary = {
  key: string;
  label: string;
  total: number;
  active: number;
  /** A few names, so the screen shows what the list contains without opening it. */
  sample: string[];
};

export async function vocabularySummaries(): Promise<VocabularySummary[]> {
  const rows = await query<{
    key: string;
    total: string;
    active: string;
    sample: string[] | null;
  }>(
    `SELECT 'charge_types' AS key, count(*)::text AS total,
            count(*) FILTER (WHERE is_active)::text AS active,
            (array_agg(name_en ORDER BY position))[1:4] AS sample FROM charge_types
     UNION ALL
     SELECT 'accommodation_types', count(*)::text, count(*) FILTER (WHERE is_bookable)::text,
            (array_agg(name_en ORDER BY position))[1:4] FROM accommodation_types
     UNION ALL
     SELECT 'catering_options', count(*)::text, count(*)::text,
            (array_agg(name_en ORDER BY position))[1:4] FROM catering_options
     UNION ALL
     SELECT 'accommodation_room_types', count(*)::text, count(*)::text,
            (array_agg(name_en ORDER BY position))[1:4] FROM accommodation_room_types
     UNION ALL
     SELECT 'day_times', count(*)::text, count(*)::text,
            (array_agg(name_en ORDER BY position))[1:4] FROM day_times
     UNION ALL
     SELECT 'levels', count(*)::text, count(*)::text,
            (array_agg(code ORDER BY sort_order))[1:4] FROM levels
     UNION ALL
     SELECT 'materials', count(*)::text, count(*) FILTER (WHERE is_active)::text,
            (array_agg(title ORDER BY title))[1:3] FROM materials
     UNION ALL
     SELECT 'course_types', count(*)::text, count(*) FILTER (WHERE is_active)::text,
            (array_agg(name ORDER BY name))[1:4] FROM course_types
     UNION ALL
     SELECT 'exam_types', count(*)::text, count(*) FILTER (WHERE is_active)::text,
            (array_agg(name ORDER BY name))[1:4] FROM exam_types
     UNION ALL
     SELECT 'countries', count(*)::text, count(*)::text, ARRAY[]::text[] FROM countries`
  );

  const LABELS: Record<string, string> = {
    course_types: 'Course types',
    exam_types: 'Exams',
    levels: 'Levels',
    day_times: 'Day sessions',
    charge_types: 'Charge types',
    accommodation_types: 'Accommodation types',
    catering_options: 'Catering',
    accommodation_room_types: 'Accommodation rooms',
    materials: 'Books & material',
    countries: 'Countries',
  };
  const ORDER = Object.keys(LABELS);

  return rows
    .map((r) => ({
      key: r.key,
      label: LABELS[r.key] ?? r.key,
      total: Number(r.total),
      active: Number(r.active),
      sample: r.sample ?? [],
    }))
    .sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
}
