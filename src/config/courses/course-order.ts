/**
 * THE ORDER CASA'S COURSE FORMATS ARE PRESENTED IN.
 *
 * This exists because the site had two answers to the question and only one of
 * them was ever a decision.
 *
 * `getCourses()` used to read `ORDER BY lessons_per_week DESC`, and the three
 * fallback paths sorted the fixtures the same way. That is a fact about weekly
 * load standing in for an editorial ranking, and it ranked wrong the moment
 * Bildungszeit was seeded: at 40 lessons a week it led /courses ahead of
 * Intensive German's 20, and because the format selector on the same page reads
 * the same array, "Bildungszeit German" was also the pre-selected tab. A reader
 * arriving at the course index met a niche educational-leave format as CASA's
 * headline offer. Meanwhile the homepage was right, because it declared its own
 * private order starting at Intensive — so the same seven formats came out in
 * two different sequences on two pages.
 *
 * The sequence below is the published one: it follows the Courses panel in
 * `src/config/nav.ts` (Intensive, Evening, Special, then Medical and
 * Bildungszeit under "Professional & Specialized"), and closes with the two
 * formats CASA quotes individually rather than listing a price for.
 *
 * `lessons_per_week` remains a fact the pages display. It is no longer a rank.
 */
export const publicCourseOrder = [
  'intensive-german',
  'evening-german',
  'special-courses',
  'medical-german',
  'bildungszeit',
  'german-for-groups',
  'in-company',
] as const;

export type PublicCourseSlug = (typeof publicCourseOrder)[number];

const rankBySlug = new Map<string, number>(publicCourseOrder.map((slug, index) => [slug, index]));

/**
 * Sorts by the published order, stably, leaving unknown slugs at the end in the
 * order they arrived.
 *
 * A slug missing from `publicCourseOrder` is not an error — a course can be
 * seeded before anyone has decided where it belongs, and it should still render.
 * It sorts last rather than first, so an undecided format can never take the
 * position Bildungszeit just had.
 */
export function sortByPublicCourseOrder<T extends { slug: string }>(courses: readonly T[]): T[] {
  return [...courses].sort((a, b) => {
    const rankA = rankBySlug.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
    const rankB = rankBySlug.get(b.slug) ?? Number.MAX_SAFE_INTEGER;

    return rankA - rankB;
  });
}
