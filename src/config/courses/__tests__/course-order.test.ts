import { describe, expect, it } from 'vitest';

import { publicCourseOrder, sortByPublicCourseOrder } from '@/config/courses/course-order';
import { fallbackCourseTypes } from '@/config/content/public-fixtures';

/**
 * These guard an editorial invariant, not an implementation detail.
 *
 * The order of CASA's course formats was previously `ORDER BY lessons_per_week
 * DESC`, which silently ranked Bildungszeit (40 a week) above Intensive German
 * (20) the moment Bildungszeit was seeded. Nothing failed — the page rendered
 * perfectly, with the wrong course at the top and pre-selected in the format
 * tabs. A regression here is invisible unless it is asserted.
 */
describe('public course order', () => {
  it('leads with Intensive German', () => {
    expect(publicCourseOrder[0]).toBe('intensive-german');
  });

  it('does not lead with a funded-leave or quote-only format', () => {
    const notFirst = ['bildungszeit', 'german-for-groups', 'in-company'];

    for (const slug of notFirst) {
      expect(publicCourseOrder.indexOf(slug as never)).toBeGreaterThan(0);
    }
  });

  it('ranks every public fixture course, so none can fall to the end by accident', () => {
    // exam-preparation is sold through the Prüfungszentrum pages, not as a
    // course card — see hiddenPublicCourseSlugs in lib/content/repository.ts.
    const publicSlugs = fallbackCourseTypes
      .map((course) => course.slug)
      .filter((slug) => slug !== 'exam-preparation');

    expect([...publicCourseOrder].sort()).toEqual([...publicSlugs].sort());
  });

  it('sorts a shuffled catalogue into the published order', () => {
    const shuffled = [
      { slug: 'bildungszeit' },
      { slug: 'in-company' },
      { slug: 'intensive-german' },
      { slug: 'evening-german' },
    ];

    expect(sortByPublicCourseOrder(shuffled).map((course) => course.slug)).toEqual([
      'intensive-german',
      'evening-german',
      'bildungszeit',
      'in-company',
    ]);
  });

  it('puts an unranked slug last rather than first', () => {
    const withUnknown = [{ slug: 'a-brand-new-format' }, { slug: 'intensive-german' }];

    expect(sortByPublicCourseOrder(withUnknown).map((course) => course.slug)).toEqual([
      'intensive-german',
      'a-brand-new-format',
    ]);
  });

  it('does not mutate its input', () => {
    const input = [{ slug: 'in-company' }, { slug: 'intensive-german' }];
    const snapshot = input.map((course) => course.slug);

    sortByPublicCourseOrder(input);

    expect(input.map((course) => course.slug)).toEqual(snapshot);
  });
});
