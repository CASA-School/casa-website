import type { ContentLocale } from '@/lib/content/types';

/**
 * Course page archetypes.
 *
 * A course detail page is not defined by its subject matter but by the
 * *buying decision* behind it. Medical German and Business German teach very
 * different things and ask the same question ("does this get me to my licence
 * or my role?"). A school trip and corporate training teach different things
 * again and also ask one identical question ("can you build this for us, and
 * what will it cost?") — asked by someone who is not the learner.
 *
 * So there are four archetypes, not nine bespoke pages. Each fixes an ordered
 * section list, which facts its rail may show, and where its CTA goes.
 *
 * Rationale and migration order: docs/COPY_AND_COURSE_ARCHETYPE_REVIEW.md.
 */
export type CourseArchetypeId =
  | 'scheduled-cohort'
  | 'module-catalogue'
  | 'professional-track'
  | 'package-inquiry';

/** Body sections, rendered in the order the archetype lists them. */
export type CourseSectionKey =
  | 'summary-strip'
  /** The week-grid module picker. Only `module-catalogue` renders this. */
  | 'module-catalogue'
  | 'level-goals'
  /**
   * CASA's published term table. Only archetypes with dated cohorts list it —
   * a quoted product has no terms, and rendering an empty table would read as
   * "no courses" rather than "dates by arrangement".
   */
  | 'term-table'
  /** The fee table and the conditions of booking. Every archetype has these. */
  | 'practical-details'
  | 'audience'
  | 'next-steps'
  | 'testimonials'
  | 'related-courses';

/**
 * Rows the facts rail is permitted to show.
 *
 * This is the load-bearing part. A `package-inquiry` page cannot render a
 * price because its archetype does not list `price` — not because a component
 * remembered to hide it. Before this existed, Firmenunterricht rendered
 * "Price from 1200 EUR" for a product that is quoted per company, and a course
 * with no scheduled instance rendered the literal string "8 weeks (example)".
 */
export type CourseFactKey =
  | 'next-start'
  | 'duration'
  | 'lessons-per-week'
  | 'level-range'
  | 'price'
  | 'group-size'
  | 'included'
  | 'lead-time';

export type CourseCtaPolicy =
  /** Register for a dated instance; beginners are sent to placement first. */
  | 'register-or-place'
  /** Reserve a seat on a specific module. */
  | 'reserve-module'
  /** Talk to someone before committing — regulated or high-consideration. */
  | 'advisory-call'
  /** No self-serve path exists; the only real action is requesting a quote. */
  | 'request-quote';

export type CourseArchetype = {
  id: CourseArchetypeId;
  /** What the visitor is actually trying to decide. Kept as prose on purpose. */
  buyingQuestion: string;
  sections: CourseSectionKey[];
  facts: CourseFactKey[];
  cta: CourseCtaPolicy;
  /** Whether the hero may offer a start-date selector. */
  showsStartDateSelector: boolean;
};

export const courseArchetypes: Record<CourseArchetypeId, CourseArchetype> = {
  'scheduled-cohort': {
    id: 'scheduled-cohort',
    buyingQuestion: 'Which start date and level, and what does it cost?',
    sections: [
      'summary-strip',
      'level-goals',
      'term-table',
      'practical-details',
      'audience',
      'next-steps',
      'testimonials',
      'related-courses',
    ],
    facts: ['next-start', 'duration', 'lessons-per-week', 'level-range', 'price'],
    cta: 'register-or-place',
    showsStartDateSelector: true,
  },
  'module-catalogue': {
    id: 'module-catalogue',
    buyingQuestion: 'Which module, and does the slot fit my week?',
    // The catalogue leads: on this archetype the page IS the picker, and the
    // reader cannot evaluate anything else until they have found their module.
    sections: [
      'summary-strip',
      'module-catalogue',
      'practical-details',
      'level-goals',
      'audience',
      'next-steps',
      // Added once real testimonials existed: CASA publishes one from a learner
      // who took the B1/B2 grammar module, and this is the page it belongs on.
      'testimonials',
      'related-courses',
    ],
    facts: ['duration', 'lessons-per-week', 'level-range', 'price'],
    cta: 'reserve-module',
    showsStartDateSelector: true,
  },
  'professional-track': {
    id: 'professional-track',
    buyingQuestion: 'Does this get me to my licence or my role?',
    // No term table: CASA publishes no dates for the professional formats.
    sections: [
      'summary-strip',
      'level-goals',
      'practical-details',
      'audience',
      'next-steps',
      'testimonials',
      'related-courses',
    ],
    facts: ['next-start', 'duration', 'lessons-per-week', 'level-range', 'price'],
    cta: 'advisory-call',
    showsStartDateSelector: true,
  },
  'package-inquiry': {
    id: 'package-inquiry',
    buyingQuestion: 'Can you build this for my group or company, and what will it cost?',
    /*
     * Testimonials were excluded here on the grounds that "the quotes we have
     * are learner voices, and the reader here is an organiser buying on someone
     * else's behalf". That was true of the invented quotes. It is not true of
     * CASA's real ones: Elena is the teacher who accompanied a school group from
     * Siberia and writes about the host families and the children, and Majd
     * writes about a company course. Both are exactly this reader.
     */
    sections: [
      'summary-strip',
      'audience',
      'level-goals',
      'practical-details',
      'next-steps',
      'testimonials',
      'related-courses',
    ],
    // Deliberately no 'price' and no 'next-start'.
    facts: ['lessons-per-week', 'group-size', 'included', 'lead-time', 'level-range'],
    cta: 'request-quote',
    showsStartDateSelector: false,
  },
};

/** Courses with no declared archetype keep today's behaviour exactly. */
export const DEFAULT_COURSE_ARCHETYPE: CourseArchetypeId = 'scheduled-cohort';

export function getCourseArchetype(id: CourseArchetypeId | undefined): CourseArchetype {
  return courseArchetypes[id ?? DEFAULT_COURSE_ARCHETYPE];
}

export function archetypeAllowsFact(archetype: CourseArchetype, fact: CourseFactKey) {
  return archetype.facts.includes(fact);
}

export function archetypeIncludesSection(archetype: CourseArchetype, section: CourseSectionKey) {
  return archetype.sections.includes(section);
}

/** Section heading copy that varies by archetype rather than by course. */
export function nextStepsHeading(archetype: CourseArchetype, locale: ContentLocale) {
  if (archetype.cta === 'request-quote') {
    return locale === 'de'
      ? { eyebrow: 'Ablauf', title: 'Von der Anfrage zum fertigen Programm' }
      : { eyebrow: 'How it works', title: 'From enquiry to a finished programme' };
  }

  return locale === 'de'
    ? { eyebrow: 'Nächste Schritte', title: 'Nach dem Kursentscheid' }
    : { eyebrow: 'Next steps', title: 'After choosing this course' };
}
