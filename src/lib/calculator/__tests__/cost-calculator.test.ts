import { describe, expect, it } from 'vitest';

import {
  calculateCasaCostPathway,
  type CasaCalculatorInput,
} from '@/lib/calculator/cost-calculator';

/**
 * Pricing reference (2026 source documents):
 *   - Intensive half-level (4 wks): 500 €  (INTENSIVE_HALF_LEVEL_4_WEEKS)
 *   - Intensive full-level (8 wks): 940 €  (INTENSIVE_FULL_LEVEL_8_WEEKS)
 *   - Evening trimester:            476 €  (autumn/default)
 *   - Book range: 22.99 – 25.99 € per book (BOOK_PRICE_LOWER / BOOK_PRICE_UPPER)
 *   - Special course (default):     176 €  (SPECIAL_COURSE_DEFAULT_PRICE)
 *   - Exam: telcB2 prep=260, full=190, partial=160
 *   - Accommodation: 580/4wk base, 145/extra-wk, 50 commission, 580 deposit, 145 holiday/wk
 *
 * Tests intentionally encode concrete arithmetic so any accidental regression
 * in pricing.ts is caught immediately.
 */

function makeInput(overrides: Partial<CasaCalculatorInput> = {}): CasaCalculatorInput {
  return {
    currentLevel: 'A1.1',
    targetLevel: 'A2.1',
    studyMode: 'intensive',
    includeEnrollmentFee: true,
    includeBooks: true,
    booksOverride: null,
    examTarget: 'none',
    includeExamPrep: false,
    examType: 'full',
    accommodationType: 'none',
    accommodationWeeks: 0,
    holidayWeeks: 0,
    includeDeposit: false,
    specialCourseCount: 0,
    ...overrides,
  };
}

describe('calculateCasaCostPathway', () => {
  it('calculates intensive tuition and duration using half-level steps', () => {
    // A1.1 → A2.2 = 3 steps: 1 full pair (940) + 1 remainder (500) = 1440
    const result = calculateCasaCostPathway(
      makeInput({
        currentLevel: 'A1.1',
        targetLevel: 'A2.2',
        includeBooks: false,
        includeEnrollmentFee: false,
      })
    );

    expect(result.isValid).toBe(true);
    expect(result.steps).toBe(3);
    expect(result.duration).toEqual({ unit: 'weeks', value: 12 });
    expect(result.breakdown.tuition).toBe(1440); // 940 + 500
    expect(result.breakdown.totalMin).toBe(1440);
    expect(result.breakdown.totalMax).toBe(1440);
  });

  it('returns a books range when override is not provided', () => {
    // A1.1 → A1.2 = 1 step; book range: 22.99 – 25.99; tuition: 500
    const result = calculateCasaCostPathway(
      makeInput({
        currentLevel: 'A1.1',
        targetLevel: 'A1.2',
        includeEnrollmentFee: false,
      })
    );

    expect(result.isValid).toBe(true);
    expect(result.steps).toBe(1);
    expect(result.breakdown.books.isRange).toBe(true);
    expect(result.breakdown.books.min).toBe(22.99);
    expect(result.breakdown.books.max).toBe(25.99);
    expect(result.breakdown.totalMin).toBe(522.99); // 500 + 22.99
    expect(result.breakdown.totalMax).toBe(525.99); // 500 + 25.99
  });

  it('calculates evening path with exams and accommodation lines', () => {
    // A1.1 → B1.1 = 4 steps × 476 = 1904 tuition
    // telcB2 prep + partial: 260 + 160 = 420
    // Accommodation: 10 weeks = 2 blocks (580×2=1160) + 2 extra (145×2=290) = 1450
    // Commission: 50; holiday surcharge: 2×145=290; deposit: 580
    // Special courses: 2×176=352 (default unit price)
    // books override: 120
    // total = 1904 + 260 + 160 + 1450 + 50 + 290 + 580 + 352 + 120 = 5166
    // (No enrollment fee — makeInput includes it, but tests can override)
    const result = calculateCasaCostPathway(
      makeInput({
        targetLevel: 'B1.1',
        studyMode: 'evening',
        booksOverride: 120,
        examTarget: 'telcB2',
        includeExamPrep: true,
        examType: 'partial',
        accommodationType: 'hostFamily',
        accommodationWeeks: 10,
        holidayWeeks: 2,
        includeDeposit: true,
        specialCourseCount: 2,
        includeEnrollmentFee: false,
      })
    );

    expect(result.isValid).toBe(true);
    expect(result.steps).toBe(4);
    expect(result.duration).toEqual({ unit: 'months', value: 14 });
    expect(result.breakdown.tuition).toBe(1904);
    expect(result.breakdown.examPrep).toBe(260);
    expect(result.breakdown.examFee).toBe(160);
    expect(result.breakdown.accommodationRent).toBe(1450);
    expect(result.breakdown.accommodationCommission).toBe(50);
    expect(result.breakdown.accommodationHolidaySurcharge).toBe(290);
    expect(result.breakdown.refundableDeposit).toBe(580);
    expect(result.breakdown.specialCourseFees).toBe(352); // 2 × 176
    // NOTE: refundableDeposit (580) is a separate breakdown line, NOT in totalMin/totalMax
    // total = 1904 + 260 + 160 + 1450 + 50 + 290 + 352 + 120 = 4586
    expect(result.breakdown.totalMin).toBe(4586);
    expect(result.breakdown.totalMax).toBe(4586);
  });

  it('rejects targets that are not above current level', () => {
    const result = calculateCasaCostPathway(
      makeInput({
        currentLevel: 'B1.2',
        targetLevel: 'B1.1',
      })
    );

    expect(result.isValid).toBe(false);
    expect(result.validationError).toBe('Target level must be higher than current level.');
    expect(result.breakdown.totalMin).toBe(0);
    expect(result.breakdown.totalMax).toBe(0);
  });
});
