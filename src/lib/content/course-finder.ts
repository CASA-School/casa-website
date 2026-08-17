import type { CourseTypeRow } from './types';

/**
 * THE COURSE FINDER'S MATCHING RULES.
 *
 * Pure functions over course rows, kept out of the route so they can be tested.
 * That matters here more than usual, because the logic this replaces was
 * confidently wrong in ways nobody could see: measured against the running
 * site, "Intensive" returned only German for Medical and excluded Intensive
 * German, and "Evening" matched nothing at all — including the Evening Course.
 *
 * The cause was inference from the wrong field. Schedule was derived by
 * string-matching the labels of a course's registration SESSIONS
 * (`'Fri'` -> weekdays, `'18:'` -> evening). Most courses have no seeded
 * sessions, so most courses matched nothing; German for Medical won "Intensive"
 * only because its Friday session label contains "Fri".
 *
 * Every course already states its own shape in `format`, so that is what is
 * read now. `format` differs between runtime modes — the fixtures say
 * `'Intensive'` and the Neon seed says `'intensive'` — so matching is
 * lowercase and substring-based, and a slug map overrides it wherever the
 * verified facts disagree with the label.
 */

/**
 * The ladder, including the half step CASA actually teaches. B1+ is not
 * decoration: it is a real CASA level with its own Klett coursebook
 * (Kontext B1+) and its own token in the CEFR colour ramp, and it was the one
 * rung missing from the finder.
 *
 * Courses record whole levels only (`level_min: 'B1'`, `level_max: 'B2'`), so
 * B1+ is covered by any course whose range spans it — which falls out of the
 * ordering rather than needing a special case.
 */
export const CEFR_LADDER = ['A1', 'A2', 'B1', 'B1+', 'B2', 'C1'] as const;
export type CefrStep = (typeof CEFR_LADDER)[number];

export type ScheduleFacet = 'intensive' | 'evening' | 'daytime' | 'flexible';
export type GoalFacet = 'exam' | 'medical' | 'professional' | 'general';

/**
 * Slug overrides, each traceable to docs/COURSE_FACTS_SOURCE_OF_TRUTH.md.
 *
 * Only where the `format` label alone would get it wrong:
 *   special-courses  format 'Modular' says nothing about when it runs; the
 *                    live site puts it at 18:30-20:00, so it is an evening
 *                    option and belongs under Evening alongside the Abendkurs.
 *   medical-german   Fridays 13:00-16:30 — neither intensive nor evening.
 *   bildungszeit     'Intensive Block', 30-40 clock hours per week.
 */
const SCHEDULE_BY_SLUG: Record<string, ScheduleFacet> = {
  'intensive-german': 'intensive',
  bildungszeit: 'intensive',
  'evening-german': 'evening',
  'special-courses': 'evening',
  'medical-german': 'daytime',
  'german-for-groups': 'flexible',
  'in-company': 'flexible',
};

/**
 * Goal is a property of the course, not of words that happen to appear in its
 * prose. The previous rule substring-searched the promise, audience and every
 * outcome for "exam"/"telc", so a general course whose outcomes mentioned
 * being ready for an exam was classified as exam prep and simultaneously
 * excluded from "General".
 */
const GOAL_BY_SLUG: Record<string, GoalFacet> = {
  'medical-german': 'medical',
  'in-company': 'professional',
  'business-german': 'professional',
  'university-prep': 'professional',
  'exam-preparation': 'exam',
  'special-courses': 'exam',
  'intensive-german': 'general',
  'evening-german': 'general',
  'german-for-groups': 'general',
  bildungszeit: 'general',
};

function stepIndex(value: string | null | undefined, fallback: number) {
  const index = CEFR_LADDER.indexOf((value ?? '').toUpperCase() as CefrStep);
  return index === -1 ? fallback : index;
}

/** What kind of timetable this course is, from its own `format`. */
export function scheduleOf(course: Pick<CourseTypeRow, 'slug' | 'format'>): ScheduleFacet {
  const override = SCHEDULE_BY_SLUG[course.slug];
  if (override) {
    return override;
  }

  const format = (course.format ?? '').toLowerCase();
  if (format.includes('evening') || format.includes('abend')) {
    return 'evening';
  }
  if (format.includes('intensiv')) {
    return 'intensive';
  }

  return 'flexible';
}

export function goalOf(course: Pick<CourseTypeRow, 'slug'>): GoalFacet {
  return GOAL_BY_SLUG[course.slug] ?? 'general';
}

/** Does this course teach at this rung? */
export function coversLevel(
  course: Pick<CourseTypeRow, 'level_min' | 'level_max'>,
  level: string
): boolean {
  const target = CEFR_LADDER.indexOf(level.toUpperCase() as CefrStep);
  if (target === -1) {
    return true;
  }

  const min = stepIndex(course.level_min, 0);
  const max = stepIndex(course.level_max, CEFR_LADDER.length - 1);

  return target >= min && target <= max;
}

export type FinderFacets = {
  level?: string;
  schedule?: string;
  goal?: string;
};

export function matchesFacets<T extends Pick<CourseTypeRow, 'slug' | 'format' | 'level_min' | 'level_max'>>(
  course: T,
  facets: FinderFacets
): boolean {
  if (facets.level && !coversLevel(course, facets.level)) {
    return false;
  }
  if (facets.schedule && scheduleOf(course) !== facets.schedule) {
    return false;
  }
  if (facets.goal && goalOf(course) !== facets.goal) {
    return false;
  }

  return true;
}

export function filterCourses<T extends Pick<CourseTypeRow, 'slug' | 'format' | 'level_min' | 'level_max'>>(
  courses: T[],
  facets: FinderFacets
): T[] {
  return courses.filter((course) => matchesFacets(course, facets));
}

/**
 * How many courses each option would return, given the OTHER two facets.
 *
 * This is what makes the control honest. Counting against the full catalogue
 * would promise results a second filter then removes; counting with the
 * option's own facet held out means "Evening (2)" is a real promise about what
 * clicking it does. An option that would return nothing can then be disabled
 * rather than silently falling back to showing everything — which is what the
 * page used to do, and why the filters looked inert.
 */
export function countsForField<T extends Pick<CourseTypeRow, 'slug' | 'format' | 'level_min' | 'level_max'>>(
  courses: T[],
  field: keyof FinderFacets,
  values: string[],
  facets: FinderFacets
): Record<string, number> {
  const others: FinderFacets = { ...facets, [field]: undefined };

  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = courses.filter((course) =>
      matchesFacets(course, value ? { ...others, [field]: value } : others)
    ).length;

    return counts;
  }, {});
}
