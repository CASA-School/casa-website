import { describe, expect, it } from 'vitest';

import { fallbackCourseTypes } from '@/config/content/public-fixtures';
import {
  CEFR_LADDER,
  countsForField,
  coversLevel,
  filterCourses,
  goalOf,
  scheduleOf,
} from '../course-finder';

/**
 * These assert the behaviours that were WRONG on the running site before this
 * module existed, so a regression fails here rather than shipping a filter that
 * quietly contradicts itself.
 */
const courses = fallbackCourseTypes;
const bySlug = (slug: string) => {
  const course = courses.find((entry) => entry.slug === slug);
  if (!course) {
    throw new Error(`fixture missing: ${slug}`);
  }

  return course;
};

describe('course finder — the filters mean what they say', () => {
  it('puts Intensive German under Intensive', () => {
    // Previously returned only german-for-medical, because schedule was read
    // from session labels and "Fri" matched weekdays.
    expect(scheduleOf(bySlug('intensive-german'))).toBe('intensive');
    expect(filterCourses(courses, { schedule: 'intensive' }).map((c) => c.slug)).toContain(
      'intensive-german'
    );
  });

  it('puts the Evening Course under Evening', () => {
    // Previously matched nothing at all, so the page silently showed every course.
    expect(scheduleOf(bySlug('evening-german'))).toBe('evening');
    expect(filterCourses(courses, { schedule: 'evening' }).map((c) => c.slug)).toContain(
      'evening-german'
    );
  });

  it('never returns a course under a schedule it does not run', () => {
    for (const facet of ['intensive', 'evening', 'daytime', 'flexible'] as const) {
      for (const course of filterCourses(courses, { schedule: facet })) {
        expect(scheduleOf(course), `${course.slug} under ${facet}`).toBe(facet);
      }
    }
  });

  it('does not classify a general course as exam prep because its prose says "exam"', () => {
    expect(goalOf(bySlug('intensive-german'))).toBe('general');
    expect(goalOf(bySlug('evening-german'))).toBe('general');
    expect(goalOf(bySlug('medical-german'))).toBe('medical');
    expect(goalOf(bySlug('in-company'))).toBe('professional');
  });

  it('treats B1+ as a real rung between B1 and B2', () => {
    expect(CEFR_LADDER).toContain('B1+');
    expect(CEFR_LADDER.indexOf('B1+')).toBeGreaterThan(CEFR_LADDER.indexOf('B1'));
    expect(CEFR_LADDER.indexOf('B1+')).toBeLessThan(CEFR_LADDER.indexOf('B2'));

    // A course spanning B1..B2 teaches B1+ without needing to say so.
    expect(coversLevel({ level_min: 'B1', level_max: 'B2' }, 'B1+')).toBe(true);
    // One that stops at B1 does not.
    expect(coversLevel({ level_min: 'A1', level_max: 'B1' }, 'B1+')).toBe(false);
  });

  it('excludes a course whose range does not reach the level', () => {
    // medical-german is B2-C1 in the fixtures.
    expect(coversLevel(bySlug('medical-german'), 'A1')).toBe(false);
    expect(coversLevel(bySlug('medical-german'), 'C1')).toBe(true);
  });

  it('counts an option against the other facets, not the whole catalogue', () => {
    const all = countsForField(courses, 'schedule', ['intensive', 'evening'], {});
    const atB2 = countsForField(courses, 'schedule', ['intensive', 'evening'], { level: 'B2' });

    // A count is a promise about what clicking does, so it must narrow when
    // another facet is already set.
    for (const key of ['intensive', 'evening']) {
      expect(atB2[key]).toBeLessThanOrEqual(all[key]);
    }
  });

  it('reports zero for a combination with no courses, rather than a fallback count', () => {
    // medical-german is the only medical course and it is B2-C1, so medical at
    // A1 is genuinely empty — the control should be able to say so.
    const counts = countsForField(courses, 'goal', ['medical'], { level: 'A1' });
    expect(counts.medical).toBe(0);
    expect(filterCourses(courses, { goal: 'medical', level: 'A1' })).toEqual([]);
  });

  it('every course lands in exactly one schedule and one goal bucket', () => {
    for (const course of courses) {
      expect(['intensive', 'evening', 'daytime', 'flexible']).toContain(scheduleOf(course));
      expect(['exam', 'medical', 'professional', 'general']).toContain(goalOf(course));
    }
  });
});
