import { describe, expect, it } from 'vitest';

import {
  DEFAULT_COURSE_ARCHETYPE,
  archetypeAllowsFact,
  courseArchetypes,
  getCourseArchetype,
} from '@/config/courses/archetypes';
import {
  GENERAL_OFFICE_CONTACT,
  courseProfiles,
  getCourseContact,
  getCoursePhotoKey,
  hasNamedCourseContact,
} from '@/config/courses/course-profiles';
import { fallbackCourseTypes } from '@/config/content/public-fixtures';
import { isQuoteOnly } from '@/lib/content/course-pricing';

describe('course archetypes', () => {
  it('never lets a quote-only product expose a price or start date row', () => {
    const pkg = courseArchetypes['package-inquiry'];

    // The structural guarantee: it is not that a component hides the price,
    // it is that the archetype does not list it, so there is nothing to render.
    expect(archetypeAllowsFact(pkg, 'price')).toBe(false);
    expect(archetypeAllowsFact(pkg, 'next-start')).toBe(false);
    expect(pkg.showsStartDateSelector).toBe(false);
    expect(pkg.cta).toBe('request-quote');
  });

  it('routes every quote-only course to the package-inquiry archetype', () => {
    const quoteOnlySlugs = fallbackCourseTypes.filter(isQuoteOnly).map((course) => course.slug);

    expect(quoteOnlySlugs.length).toBeGreaterThan(0);
    for (const slug of quoteOnlySlugs) {
      expect(courseProfiles[slug]?.archetype).toBe('package-inquiry');
    }
  });

  it('falls back to scheduled-cohort so an unregistered course keeps old behaviour', () => {
    expect(getCourseArchetype(undefined).id).toBe('scheduled-cohort');
    expect(DEFAULT_COURSE_ARCHETYPE).toBe('scheduled-cohort');

    const scheduled = courseArchetypes['scheduled-cohort'];
    // Parity with the pre-registry page: same five facts, same section order.
    expect(scheduled.facts).toEqual(['next-start', 'duration', 'lessons-per-week', 'level-range', 'price']);
    expect(scheduled.sections).toEqual([
      'summary-strip',
      'level-goals',
      'audience',
      'next-steps',
      'testimonials',
      'related-courses',
    ]);
  });

  it('keeps learner testimonials off organiser-facing pages', () => {
    expect(courseArchetypes['package-inquiry'].sections).not.toContain('testimonials');
    expect(courseArchetypes['scheduled-cohort'].sections).toContain('testimonials');
  });

  it('gives every course format a contact, falling back to the office', () => {
    const hidden = new Set(['exam-preparation', 'summer-intensive', 'integration-german']);

    for (const course of fallbackCourseTypes.filter((c) => !hidden.has(c.slug))) {
      const contact = getCourseContact(course.slug);

      // Never null — an unassigned format resolves to the general office.
      expect(contact.email).toMatch(/@casa-bremen\.de$/);
      expect(contact.name.length).toBeGreaterThan(0);
    }
  });

  it('only names a person where CASA already publishes one', () => {
    // Ina Eismann is published on casa-bremen.de as the group-quote contact.
    expect(hasNamedCourseContact('german-for-groups')).toBe(true);
    expect(getCourseContact('german-for-groups').name).toBe('Ina Eismann');

    // Everything else falls back until staff confirm an owner. Guards against
    // someone inventing a plausible-looking contact.
    for (const slug of ['intensive-german', 'evening-german', 'medical-german', 'in-company']) {
      expect(hasNamedCourseContact(slug), `${slug} should not name a person yet`).toBe(false);
      expect(getCourseContact(slug)).toBe(GENERAL_OFFICE_CONTACT);
    }
  });

  it('records where every named contact was verified from', () => {
    for (const [slug, profile] of Object.entries(courseProfiles)) {
      if (profile.contact) {
        expect(profile.contact.source, `${slug} contact needs a source`).toMatch(/\S/);
      }
    }
  });

  it('gives every public course a profile and a resolvable photo key', () => {
    const hidden = new Set(['exam-preparation', 'summer-intensive', 'integration-german']);
    const publicCourses = fallbackCourseTypes.filter((course) => !hidden.has(course.slug));

    for (const course of publicCourses) {
      // The old route file had a level-goals map that four routed courses were
      // missing, silently dropping them onto a generic A1-B1 / B2-C1 fallback.
      expect(courseProfiles[course.slug], `missing profile for ${course.slug}`).toBeDefined();
      expect(getCoursePhotoKey(course.slug)).not.toBe('supportCard');
    }
  });
});
