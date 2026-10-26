import { describe, expect, it } from 'vitest';

import { googleReviewsFor, socialProofByLocale, socialProofForCourse } from '@/config/content/social-proof';
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

describe('German pages and English testimonials', () => {
  it('shows a labelled German translation, never an unlabelled English quote', async () => {
    const { socialProofByLocale } = await import('../social-proof');

    for (const item of socialProofByLocale.de) {
      const english = /\b(the|and|was|I am|my)\b/.test(item.quote);
      expect(english, `${item.id} renders English on a German page`).toBe(false);
    }

    const laura = socialProofByLocale.de.find((item) => item.id === 'laura-medical-de');
    expect(laura?.country).toContain('aus dem Englischen übersetzt');
    expect(socialProofByLocale.en.find((item) => item.id === 'laura-medical-en')?.quote).toContain('makes justice to its name');
  });
});

describe('Google reviews (2026-10-20)', () => {
  it('carry their stars and link to CASA’s listing', () => {
    const reviews = googleReviewsFor('de');
    expect(reviews.length).toBeGreaterThanOrEqual(6);
    for (const review of reviews) {
      expect(review.sourcePlatform).toBe('google_reviews');
      expect(review.rating).toBe(5);
      expect(review.sourceUrl).toContain('maps.google.com');
    }
  });

  it('are labelled as translations wherever they are not in the reader’s language', () => {
    // English pages: a review without the label must be one written in English.
    for (const review of googleReviewsFor('en')) {
      if (review.country.includes('translated from German')) continue;
      expect(/\b(und|ich|der|die|das|sehr)\b/i.test(review.quote), `${review.id} is German without the label`).toBe(false);
    }
    // German pages: an English original is always shown translated, and says so.
    for (const review of googleReviewsFor('de')) {
      if (!review.country.includes('aus dem Englischen übersetzt')) continue;
      expect(/\b(the|and|was|my)\b/i.test(review.quote), `${review.id} still renders English`).toBe(false);
    }
  });

  it('give the courses with no review of their own three different ones each (2026-10-26)', () => {
    const shown = (slug: string) => socialProofForCourse(slug, 'de').slice(0, 3).map((item) => item.id);
    const pages = ['medical-german', 'special-courses', 'bildungszeit'].map(shown);
    for (const ids of pages) expect(ids).toHaveLength(3);
    expect(new Set(pages.flat()).size).toBe(9);
    for (const slug of ['medical-german', 'special-courses', 'bildungszeit']) {
      expect(socialProofForCourse(slug, 'de').slice(0, 3).every((item) => item.rating === 5), slug).toBe(true);
    }
  });

  it('replace the published quotes on the intensive and evening pages', () => {
    for (const slug of ['intensive-german', 'evening-german']) {
      const shown = socialProofForCourse(slug, 'de').slice(0, 3);
      expect(shown.every((item) => item.sourcePlatform === 'google_reviews'), `${slug}: ${shown.map((item) => item.id).join(', ')}`).toBe(true);
    }
    const intensive = socialProofForCourse('intensive-german', 'de').slice(0, 3).map((item) => item.id);
    const evening = socialProofForCourse('evening-german', 'de').slice(0, 3).map((item) => item.id);
    expect(intensive.filter((id) => evening.includes(id))).toEqual(['olexandra-google-de']);
  });
});
