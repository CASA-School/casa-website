import { describe, expect, it } from 'vitest';

import { fallbackCourseTypes } from '@/config/content/public-fixtures';
import {
  formatCoursePrice,
  formatVisaEligibility,
  isQuoteOnly,
} from '@/lib/content/course-pricing';

function course(slug: string) {
  const found = fallbackCourseTypes.find((item) => item.slug === slug);
  if (!found) {
    throw new Error(`fixture course "${slug}" not found`);
  }

  return found;
}

describe('course pricing', () => {
  it('never renders a number for quote-only products', () => {
    for (const slug of ['german-for-groups', 'in-company']) {
      const target = course(slug);

      expect(isQuoteOnly(target)).toBe(true);
      expect(formatCoursePrice(target, 'en')).toBe('On request');
      expect(formatCoursePrice(target, 'de')).toBe('Auf Anfrage');
      // The regression this guards: default_price is 0 for these rows, so a
      // raw `${default_price} ${currency}` render would publish "0 EUR".
      expect(formatCoursePrice(target, 'en')).not.toMatch(/\d/);
    }
  });

  it('marks a lowest-of-several price as "from" and a single price as exact', () => {
    expect(formatCoursePrice(course('intensive-german'), 'en')).toBe('from 520 EUR');
    expect(formatCoursePrice(course('bildungszeit'), 'de')).toBe('ab 280 EUR');
    expect(formatCoursePrice(course('special-courses'), 'en')).toBe('192 EUR');
  });

  it('keeps published course facts aligned with casa-bremen.de', () => {
    // Sourced in docs/COURSE_FACTS_SOURCE_OF_TRUTH.md. Update that file first.
    expect(course('intensive-german').lessons_per_week).toBe(20);
    expect(course('intensive-german').default_price).toBe(520);
    expect(course('evening-german').lessons_per_week).toBe(4);
    expect(course('evening-german').default_price).toBe(476);
    expect(course('special-courses').lessons_per_week).toBe(2);
    expect(course('bildungszeit').lessons_per_week).toBe(40);
    // German for Groups is the school-group package, not a speaking club.
    expect(course('german-for-groups').lessons_per_week).toBe(20);
  });

  it('treats unconfirmed visa eligibility as a question, not a No', () => {
    expect(formatVisaEligibility(null, 'en')).toBe('Please ask');
    expect(formatVisaEligibility(null, 'de')).toBe('Bitte erfragen');
    expect(formatVisaEligibility(true, 'en')).toBe('Yes');
    expect(formatVisaEligibility(false, 'en')).toBe('No');
  });

  it('only claims visa eligibility where staff confirmed it', () => {
    // Guards the removed `lessons_per_week >= 15` heuristic from creeping back:
    // German for Groups is 20 lessons/week but is a short school-group stay.
    expect(course('german-for-groups').visa_eligible ?? null).toBeNull();
    expect(course('intensive-german').visa_eligible).toBe(true);
  });
});
