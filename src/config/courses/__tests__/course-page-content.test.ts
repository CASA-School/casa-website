import { describe, expect, it } from 'vitest';

import { getCourseAudienceContent, getCourseNextSteps } from '@/config/courses/course-page-content';
import { getCourseLevelGoals, courseProfiles } from '@/config/courses/course-profiles';
import { publicCourseOrder } from '@/config/courses/course-order';
import { fallbackCourseTypes } from '@/config/content/public-fixtures';

/**
 * These guard against the seven course pages collapsing back into one page.
 *
 * Before the per-course registry, five of them rendered the identical heading
 * "This course fits learners who want structure and human support" with the same
 * three bullets and the same three next steps. Nothing failed — every page
 * built, rendered and passed review, and a reader comparing two formats simply
 * found that only the numbers changed.
 */
describe('per-course page content', () => {
  const registered = ['intensive-german', 'evening-german', 'bildungszeit', 'medical-german', 'special-courses'];

  it('gives every registered course its own audience heading', () => {
    const titles = registered.map((slug) => getCourseAudienceContent(slug, 'en')?.title);

    expect(titles.every(Boolean)).toBe(true);
    expect(new Set(titles).size).toBe(registered.length);
  });

  it('never reuses the generic filler heading', () => {
    for (const slug of publicCourseOrder) {
      const title = getCourseAudienceContent(slug, 'en')?.title;
      if (!title) continue;
      expect(title).not.toMatch(/structure and human support/i);
    }
  });

  it('translates both locales for every registered course', () => {
    for (const slug of registered) {
      const en = getCourseAudienceContent(slug, 'en');
      const de = getCourseAudienceContent(slug, 'de');

      expect(en?.bullets.length, `${slug} en bullets`).toBeGreaterThan(0);
      expect(de?.bullets.length, `${slug} de bullets`).toBe(en?.bullets.length);
      expect(de?.title, `${slug} should not fall back to English`).not.toBe(en?.title);
    }
  });

  /*
   * German for Medical publishes only its B2/C1 entry and the FSP framing. The
   * fee, the weekly hours and the dates are internally sourced and unconfirmed —
   * see docs/COURSE_FACTS_SOURCE_OF_TRUTH.md, which records the 26.06-28.08.2026
   * dates as checked and inconclusive. This asserts none of them come back.
   */
  it('publishes no unconfirmed figures for German for Medical', () => {
    const text = JSON.stringify([
      getCourseAudienceContent('medical-german', 'en'),
      getCourseAudienceContent('medical-german', 'de'),
      getCourseNextSteps('medical-german', 'en'),
      getCourseNextSteps('medical-german', 'de'),
    ]);

    expect(text).not.toMatch(/400/);
    expect(text).not.toMatch(/26\.06|28\.08|26 Jun|28 Aug/);
    expect(text).not.toMatch(/\b4 (UE|lessons)\b/);
  });

  it('starts the Bildungszeit level table at B1, not A1', () => {
    const levels = getCourseLevelGoals('bildungszeit', 'en').levels.map((l) => l.level);

    expect(levels[0]).toBe('B1');
    expect(levels.join(' ')).not.toMatch(/A1|A2/);
  });

  it('keeps the level table inside each course’s published range', () => {
    for (const slug of Object.keys(courseProfiles)) {
      const course = fallbackCourseTypes.find((c) => c.slug === slug);
      if (!course) continue;

      const levels = getCourseLevelGoals(slug, 'en').levels.map((l) => l.level).join(' ');

      // A course that starts at B1 or above must not advertise A-level entry.
      if (course.level_min === 'B1' || course.level_min === 'B2') {
        expect(levels, `${slug} starts at ${course.level_min}`).not.toMatch(/A1|A2/);
      }
    }
  });

  it('opens the advisory-track journey with a conversation, not a registration', () => {
    const first = getCourseNextSteps('medical-german', 'en')?.steps[0]?.title ?? '';

    expect(first).not.toMatch(/registration/i);
    expect(first).toMatch(/contact|office/i);
  });
});
