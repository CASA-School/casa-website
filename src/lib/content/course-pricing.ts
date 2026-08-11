import type { ContentLocale, CourseTypeRow } from './types';

type PriceSource = Pick<CourseTypeRow, 'default_price' | 'currency'> &
  Partial<Pick<CourseTypeRow, 'pricing_mode' | 'visa_eligible'>>;

/**
 * Renders a course price honestly.
 *
 * Some CASA products genuinely have no public price — German for Groups and
 * Firmenunterricht are quoted per enquiry. Those must never render a number.
 * See docs/COURSE_FACTS_SOURCE_OF_TRUTH.md.
 */
export function formatCoursePrice(course: PriceSource, locale: ContentLocale) {
  const mode = course.pricing_mode ?? 'from';

  if (mode === 'on_request') {
    return locale === 'de' ? 'Auf Anfrage' : 'On request';
  }

  const amount = `${course.default_price} ${course.currency}`;

  return mode === 'fixed' ? amount : locale === 'de' ? `ab ${amount}` : `from ${amount}`;
}

/** Label for the price row itself, since "Price from" is wrong for quoted products. */
export function coursePriceLabel(course: PriceSource, locale: ContentLocale) {
  if ((course.pricing_mode ?? 'from') === 'on_request') {
    return locale === 'de' ? 'Preis' : 'Price';
  }

  return locale === 'de' ? 'Preis' : 'Price';
}

/** True when the product is quoted rather than sold at a list price. */
export function isQuoteOnly(course: PriceSource) {
  return (course.pricing_mode ?? 'from') === 'on_request';
}

/**
 * Student-visa eligibility as a three-state value. `null` means no staff
 * confirmation exists, and must not be presented to a visitor as a "No".
 * Never infer this from lessons_per_week — CASA's own guidance is a minimum of
 * 20 lessons/week, above the old `>= 15` heuristic this replaces.
 */
export function courseVisaEligibility(course: PriceSource): boolean | null {
  return course.visa_eligible ?? null;
}

export function formatVisaEligibility(value: boolean | null, locale: ContentLocale) {
  if (value === null) {
    return locale === 'de' ? 'Bitte erfragen' : 'Please ask';
  }

  if (value) {
    return locale === 'de' ? 'Ja' : 'Yes';
  }

  return locale === 'de' ? 'Nein' : 'No';
}
