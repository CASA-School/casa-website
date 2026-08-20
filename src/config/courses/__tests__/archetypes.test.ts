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
  getQuoteAudience,
  hasNamedCourseContact,
} from '@/config/courses/course-profiles';
import { specialCourseModules } from '@/config/courses/special-course-modules';
import { skillTokens } from '@/config/brand/tokens';
import { fallbackCourseTypes } from '@/config/content/public-fixtures';
import { socialProofByLocale } from '@/config/content/social-proof';
import { formatCoursePrice, isQuoteOnly } from '@/lib/content/course-pricing';

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

  /*
   * This used to assert that every quote-only course uses `package-inquiry`.
   * That conflated two independent things. German for Medical is quote-only --
   * CASA publishes no price, no dates and no weekly load for it -- but it is a
   * professional track, not a package: the reader is a doctor choosing a course
   * for themselves, and the page owes them the FSP syllabus and other learners'
   * experience, neither of which `package-inquiry` renders.
   *
   * What actually has to hold is that no quote-only course renders a number,
   * whichever archetype it uses.
   */
  it('never renders a number for a course CASA quotes per enquiry', () => {
    const quoteOnly = fallbackCourseTypes.filter(isQuoteOnly);

    expect(quoteOnly.length).toBeGreaterThan(0);
    for (const course of quoteOnly) {
      for (const locale of ['en', 'de'] as const) {
        expect(formatCoursePrice(course, locale), `${course.slug} (${locale})`).not.toMatch(/\d/);
      }
    }
  });

  it('routes the two package products to package-inquiry with distinct audiences', () => {
    expect(courseProfiles['german-for-groups']?.archetype).toBe('package-inquiry');
    expect(courseProfiles['in-company']?.archetype).toBe('package-inquiry');

    // A visiting school group and a Bremen employer buy different things.
    // Sharing one archetype without this split had the Firmenunterricht page
    // promising HR an accommodation and culture programme.
    expect(getQuoteAudience('german-for-groups')).toBe('group');
    expect(getQuoteAudience('in-company')).toBe('organisation');
  });

  it('publishes no weekly lesson count where CASA publishes none', () => {
    // 0 is the "not published" sentinel. The facts rail must translate it, and
    // these are the formats it is set on.
    for (const slug of ['in-company', 'medical-german']) {
      const course = fallbackCourseTypes.find((item) => item.slug === slug);
      expect(course?.lessons_per_week, `${slug} should carry the 0 sentinel`).toBe(0);
    }
  });

  it('keeps courses CASA does not offer out of the catalogue', () => {
    // These four were development placeholders that reached the public site.
    // 'integration-german' contradicted CASA's own FAQ, which states plainly
    // that no Integrationskurse are offered.
    const slugs = new Set(fallbackCourseTypes.map((course) => course.slug));

    for (const gone of ['university-prep', 'business-german', 'summer-intensive', 'integration-german']) {
      expect(slugs.has(gone), `${gone} is not a CASA product`).toBe(false);
    }
  });

  it('falls back to scheduled-cohort so an unregistered course keeps old behaviour', () => {
    expect(getCourseArchetype(undefined).id).toBe('scheduled-cohort');
    expect(DEFAULT_COURSE_ARCHETYPE).toBe('scheduled-cohort');

    const scheduled = courseArchetypes['scheduled-cohort'];
    // Same five facts as the pre-registry page.
    expect(scheduled.facts).toEqual(['next-start', 'duration', 'lessons-per-week', 'level-range', 'price']);
    expect(scheduled.sections).toEqual([
      'summary-strip',
      'level-goals',
      // Both added 2026-08-18. CASA publishes a term table and a fee table for
      // every dated format, and the pages carried neither.
      'term-table',
      'practical-details',
      'audience',
      'next-steps',
      'testimonials',
      'related-courses',
    ]);
  });

  it('shows the fee and conditions block on every archetype', () => {
    // The reader always needs to know what it costs and what they are agreeing
    // to, whether the number is a price or "quoted per enquiry".
    for (const archetype of Object.values(courseArchetypes)) {
      expect(archetype.sections, archetype.id).toContain('practical-details');
    }
  });

  it('only shows a term table where CASA publishes terms', () => {
    // A quoted product has no terms. An empty table would read as "no courses"
    // rather than "dates by arrangement".
    expect(courseArchetypes['scheduled-cohort'].sections).toContain('term-table');
    expect(courseArchetypes['package-inquiry'].sections).not.toContain('term-table');
    expect(courseArchetypes['professional-track'].sections).not.toContain('term-table');
  });

  it('renders the module catalogue on the archetype named after it, and nowhere else', () => {
    const catalogue = courseArchetypes['module-catalogue'];

    // The section slot is what actually puts the week grid on the page. Without
    // it the archetype is named module-catalogue and renders no catalogue.
    expect(catalogue.sections).toContain('module-catalogue');

    // It leads: on this archetype the page IS the picker.
    expect(catalogue.sections.indexOf('module-catalogue')).toBeLessThan(
      catalogue.sections.indexOf('level-goals')
    );

    for (const [id, archetype] of Object.entries(courseArchetypes)) {
      if (id === 'module-catalogue') continue;
      expect(archetype.sections).not.toContain('module-catalogue');
    }
  });

  it('gives every special-course module a skill colour and a text label to pair it with', () => {
    // Colour must never be the only signal, so a module needs both a skill key
    // that resolves to a token and a category label the reader can actually read.
    expect(specialCourseModules.length).toBeGreaterThan(0);

    for (const courseModule of specialCourseModules) {
      expect(skillTokens[courseModule.skill]).toBeDefined();
      expect(courseModule.category.en.trim()).not.toBe('');
      expect(courseModule.category.de.trim()).not.toBe('');
    }
  });

  it('keeps the special-course constants actually constant, since the UI states them once', () => {
    // The catalogue prints "one evening a week, 90 minutes, 12 weeks, EUR 192"
    // a single time at the top. If any module drifts, that line starts lying.
    const prices = new Set(specialCourseModules.map((m) => m.priceEur));
    const times = new Set(specialCourseModules.map((m) => m.time));

    expect([...prices]).toEqual([192]);
    expect([...times]).toEqual(['18:30 - 20:00']);
  });

  it('shows testimonials on every archetype, now that real ones exist per course', () => {
    /*
     * This used to assert the opposite for `package-inquiry` — "keeps learner
     * testimonials off organiser-facing pages". The reasoning was sound while the
     * quotes were invented learner archetypes. CASA's real testimonials include
     * the teacher who accompanied a school group and a company-course
     * participant, who are the organiser-facing reader, so the exclusion now
     * hides the most relevant voice on those two pages.
     */
    for (const archetype of Object.values(courseArchetypes)) {
      expect(archetype.sections, archetype.id).toContain('testimonials');
    }
  });

  it('binds every published testimonial to a course that exists', () => {
    const slugs = new Set(fallbackCourseTypes.map((course) => course.slug));

    for (const locale of ['en', 'de'] as const) {
      for (const item of socialProofByLocale[locale]) {
        if (item.courseSlug) {
          expect(slugs.has(item.courseSlug), `${item.id} points at a missing course`).toBe(true);
        }
      }
    }
  });

  it('never attributes a testimonial to an invented person', () => {
    const invented = ['Former intensive student', 'CASA community post', 'Exam candidate', 'Anna Keller'];

    for (const locale of ['en', 'de'] as const) {
      for (const item of socialProofByLocale[locale]) {
        expect(invented, `${item.id}`).not.toContain(item.personDisplay);
      }
    }
  });

  it('gives every course format a contact, falling back to the office', () => {
    const hidden = new Set(['exam-preparation']);

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
    const hidden = new Set(['exam-preparation']);
    const publicCourses = fallbackCourseTypes.filter((course) => !hidden.has(course.slug));

    for (const course of publicCourses) {
      // The old route file had a level-goals map that four routed courses were
      // missing, silently dropping them onto a generic A1-B1 / B2-C1 fallback.
      expect(courseProfiles[course.slug], `missing profile for ${course.slug}`).toBeDefined();
      expect(getCoursePhotoKey(course.slug)).not.toBe('supportCard');
    }
  });
});
