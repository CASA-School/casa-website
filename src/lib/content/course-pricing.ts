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
/**
 * Formats a course amount as money, not as a database column.
 *
 * `default_price` arrives as a JS number in fallback mode but as a
 * `numeric(10,2)` *string* ("520.00") from Postgres, so a raw template literal
 * rendered "from 520.00 EUR" on the live site and "from 520 EUR" in tests —
 * the same class of mode gap recorded in MEMORY.md §18. Formatting both through
 * Intl removes the divergence and the trailing zeros.
 *
 * Whole amounts drop their decimals (520 EUR -> "520 €"); real fractions keep
 * them, because CASA does publish figures like 117.50 per additional week.
 */
function formatAmount(value: number | string, currency: string, locale: ContentLocale) {
  const amount = typeof value === 'number' ? value : Number.parseFloat(value);

  // An unparseable price is a data problem, not a formatting one. Fall back to
  // the raw pair rather than rendering "NaN €" at a visitor.
  if (!Number.isFinite(amount)) {
    return `${value} ${currency}`;
  }

  const hasFraction = Math.round(amount * 100) % 100 !== 0;

  return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-IE', {
    style: 'currency',
    currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(amount);
}

export function formatCoursePrice(course: PriceSource, locale: ContentLocale) {
  const mode = course.pricing_mode ?? 'from';

  if (mode === 'on_request') {
    return locale === 'de' ? 'Auf Anfrage' : 'On request';
  }

  const amount = formatAmount(course.default_price, course.currency, locale);

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
