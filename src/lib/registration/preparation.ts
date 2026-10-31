import { addDays, bremenDate } from '@/lib/appointments/schedule';

/**
 * WHICH EXAM DAY A PREPARATION COURSE LEADS TO (2026-10-31).
 *
 * SchoolMan plans each C1 Hochschule preparation to end a week or two before an exam day
 * (docs/COURSE_FACTS_SOURCE_OF_TRUTH.md); nothing links the two but the dates. So a course leads to
 * the first sitting of its exam after its last day, within three weeks: a later one is another
 * course's. The exam page, the course form and the exam form all ask this, so they agree. No db
 * import here, so a client component may use it.
 */
const EXAM_WITHIN_DAYS = 21;

/** The sitting a course ending on `courseEnd` (YYYY-MM-DD) leads to, from `sittings` sorted by date. */
export function examAfterPreparation<T>(sittings: readonly T[], courseEnd: string, startsAt: (sitting: T) => string): T | null {
  const last = addDays(courseEnd, EXAM_WITHIN_DAYS);
  return (
    sittings.find((sitting) => {
      const day = bremenDate(new Date(startsAt(sitting)));
      return day > courseEnd && day <= last;
    }) ?? null
  );
}
