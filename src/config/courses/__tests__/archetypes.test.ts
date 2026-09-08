import { describe, expect, it } from 'vitest';

import {
  DEFAULT_COURSE_ARCHETYPE,
  archetypeAllowsFact,
  courseArchetypes,
  getCourseArchetype,
} from '@/config/courses/archetypes';
import {
  courseProfiles,
  getCourseContactKey,
  getCoursePhotoKey,
  getQuoteAudience,
} from '@/config/courses/course-profiles';
import { CASA_CONTACT_KEYS, getCasaContact } from '@/config/content/contacts';
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

  /*
   * These three used to guard the opposite property: that NO course named a
   * person, because at the time only german-for-groups had a published owner and
   * the risk was someone inventing a plausible-looking colleague. CASA assigned
   * owners to five more formats on 2026-09-08, so the risk moved — it is now
   * that a name drifts from the verified roster, or that a format is quietly
   * reassigned to someone who does not handle it.
   */
  it('resolves every assigned contact to a name on the verified roster', () => {
    for (const key of CASA_CONTACT_KEYS) {
      const contact = getCasaContact(key, 'en');

      // Falling back to the office name means the teamId did not match anyone.
      expect(contact.name, `${key} does not resolve to a roster entry`).not.toBe('CASA Bremen');
      expect(contact.name.length).toBeGreaterThan(0);
      expect(contact.role.length).toBeGreaterThan(0);
    }
  });

  it('holds CASA\'s 2026-09-08 allocation, so a reassignment has to be deliberate', () => {
    const expected: Record<string, string> = {
      'intensive-german': 'Natàlia Sostres',
      'evening-german': 'Alissa Trouillet',
      'special-courses': 'Alissa Trouillet',
      'medical-german': 'Meike Große Hundrup',
      bildungszeit: 'Meike Große Hundrup',
      // Also Meike, but through the `company` key, which carries the call.
      'in-company': 'Meike Große Hundrup',
      'german-for-groups': 'Ina Eismann',
    };

    for (const [slug, name] of Object.entries(expected)) {
      const key = getCourseContactKey(slug);
      expect(key, `${slug} should have a contact key`).toBeDefined();
      expect(getCasaContact(key!, 'en').name, `${slug} contact`).toBe(name);
    }

    // Every routed format is covered, so a new one arriving without an owner is
    // a visible gap rather than a silent fallback.
    for (const slug of Object.keys(courseProfiles)) {
      expect(getCourseContactKey(slug), `${slug} has no contact key`).toBeDefined();
    }
  });

  it('offers a call only where CASA has committed to one', () => {
    /*
     * Two so far: group programmes and Firmenunterricht. Both are cases where
     * the buyer is scoping a programme for other people rather than picking a
     * level. Everyone else shows no button until CASA says otherwise, and this
     * asserts the negative too — a call is a commitment on a real calendar, so
     * switching one on should be a deliberate edit that trips this test.
     */
    const offersACall = ['groups', 'company'];

    for (const key of CASA_CONTACT_KEYS) {
      expect(
        getCasaContact(key, 'en').booking,
        `${key} ${offersACall.includes(key) ? 'should offer a call' : 'should not offer a call yet'}`
      ).toBe(offersACall.includes(key));
    }

    // Same colleague on both, and only one of her three formats offers it —
    // which is why contacts are keyed by surface and not by person.
    expect(getCasaContact('company', 'en').name).toBe(getCasaContact('professional', 'en').name);
    expect(getCasaContact('professional', 'en').booking).toBe(false);
  });

  it('spells the two names that are easy to get wrong', () => {
    // à on the SECOND a, not the first; and ß, not ss. Both come off the roster
    // rather than being typed per surface, and this is what that buys.
    expect(getCasaContact('accommodation', 'en').name).toBe('Natàlia Sostres');
    expect(getCasaContact('professional', 'en').name).toBe('Meike Große Hundrup');
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
