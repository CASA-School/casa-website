import { describe, expect, it } from 'vitest';

import { socialProofByLocale, socialProofForCourse } from '@/config/content/social-proof';
import { fallbackCourseTypes } from '@/config/content/public-fixtures';

/**
 * These are real people's words with their real first names attached.
 *
 * The cards render an editorially trimmed excerpt rather than the full quote,
 * because CASA's published testimonials run from 101 to 460 characters and the
 * long ones took a full screen. Trimming is normal; rewriting is not. The
 * substring assertion below is the whole reason the excerpt/verbatim split
 * exists — it makes paraphrasing a named learner fail the build.
 */
describe('learner testimonials', () => {
  it('renders only text the learner actually wrote', () => {
    for (const locale of ['en', 'de'] as const) {
      for (const item of socialProofByLocale[locale]) {
        expect(
          item.quoteFull.includes(item.quote),
          `${item.id}: the rendered excerpt is not a contiguous substring of the verbatim quote — it has been reworded, or an ellipsis has been spliced in`
        ).toBe(true);
      }
    }
  });

  it('keeps every excerpt in a band that renders at a consistent height', () => {
    /*
     * The upper bound is what stops one tile running to eleven lines while its
     * neighbour runs to three. The lower bound catches an excerpt trimmed so far
     * that it stops being a testimonial ("It was great!").
     */
    for (const item of socialProofByLocale.en) {
      expect(item.quote.length, `${item.id} is too short to say anything`).toBeGreaterThanOrEqual(90);
      expect(item.quote.length, `${item.id} will overflow its card`).toBeLessThanOrEqual(200);
    }
  });

  it('ends every excerpt on a finished sentence', () => {
    // No mid-sentence cuts and no "…". If it needs an ellipsis it is the wrong
    // excerpt: pick different sentences instead.
    for (const item of socialProofByLocale.en) {
      expect(item.quote, `${item.id} should not contain an ellipsis`).not.toMatch(/\.\.\.|…/);
      expect(item.quote.trim(), `${item.id} should end on a full stop or exclamation`).toMatch(/[.!]$/);
    }
  });

  it('attributes every testimonial to a named person and a real course', () => {
    const slugs = new Set(fallbackCourseTypes.map((course) => course.slug));

    for (const locale of ['en', 'de'] as const) {
      for (const item of socialProofByLocale[locale]) {
        expect(item.personDisplay, `${item.id} needs a name`).toMatch(/\S/);
        // Guards against the anonymous archetypes this file used to hold.
        expect(item.personDisplay, `${item.id} looks like a placeholder`).not.toMatch(
          /student|learner|candidate|participant|community|post/i
        );

        if (item.courseSlug) {
          expect(slugs.has(item.courseSlug), `${item.id} points at a missing course`).toBe(true);
        }
      }
    }
  });

  it('leads a course page with that course’s own learner', () => {
    const evening = socialProofForCourse('evening-german', 'en');
    expect(evening[0]?.courseSlug).toBe('evening-german');

    const groups = socialProofForCourse('german-for-groups', 'en');
    expect(groups[0]?.courseSlug).toBe('german-for-groups');
  });
});
