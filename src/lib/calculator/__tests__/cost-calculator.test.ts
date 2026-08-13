import { describe, expect, it } from 'vitest';

import {
  calculateCasaCostPathway,
  type CasaCalculatorInput,
} from '@/lib/calculator/cost-calculator';

/**
 * Pricing reference (docs/COURSE_FACTS_SOURCE_OF_TRUTH.md unless noted):
 *   - Intensive half-level (4 wks): 520 €  (INTENSIVE_HALF_LEVEL_4_WEEKS)
 *   - Intensive full-level (8 wks): 940 €  (INTENSIVE_FULL_LEVEL_8_WEEKS)
 *   - Evening trimester:            476 €  (autumn/default)
 *   - Book range: 23.99 – 26.99 € per book — verified 2026-08-13 directly
 *     against casa-bremen.de/en/language-courses/intensive-german-courses,
 *     see pricing.ts
 *   - Special course (default):     192 €  (SPECIAL_COURSE_DEFAULT_PRICE)
 *   - Exam: telcB2 prep=260, full=190, partial=160  (Level Development Plan 2026)
 *   - Accommodation: 580/4wk base, 145/extra-wk, 50 commission, 580 deposit, 145 holiday/wk
 *
 * Intensive tuition is billed per real level, not per pair of steps: a level
 * costs 940 € only when both of its halves are studied. B1+ is a level with a
 * single half, so it always costs 520 € and never pairs with a neighbour.
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
  it('bills a completed level as one full level and a leftover half separately', () => {
    // A1.1 → A2.2 studies A1.2, A2.1, A2.2:
    // lone A1 half (520) + complete A2 (940) = 1460
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
    expect(result.breakdown.tuition).toBe(1460); // 520 + 940
    expect(result.breakdown.totalMin).toBe(1460);
    expect(result.breakdown.totalMax).toBe(1460);
  });

  it('never pairs B1+ with a neighbouring half into a full level', () => {
    // B1.1 → B2.1 studies B1.2, B1+, B2.1 — three halves that each belong to a
    // different level, so three × 520 = 1560. Pairing by step count gave 1440.
    const result = calculateCasaCostPathway(
      makeInput({
        currentLevel: 'B1.1',
        targetLevel: 'B2.1',
        includeBooks: false,
        includeEnrollmentFee: false,
      })
    );

    expect(result.steps).toBe(3);
    expect(result.breakdown.tuition).toBe(1560);
  });

  it('bills two lone halves either side of a level boundary separately', () => {
    // A1.1 → A2.1 studies A1.2 and A2.1: two halves of two different levels,
    // so 2 × 520 = 1040, not one 940 full level.
    const result = calculateCasaCostPathway(
      makeInput({
        currentLevel: 'A1.1',
        targetLevel: 'A2.1',
        includeBooks: false,
        includeEnrollmentFee: false,
      })
    );

    expect(result.steps).toBe(2);
    expect(result.breakdown.tuition).toBe(1040);
  });

  it('bills the B1+ bridge on its own as a single half level', () => {
    const result = calculateCasaCostPathway(
      makeInput({
        currentLevel: 'B1.2',
        targetLevel: 'B1+',
        includeBooks: false,
        includeEnrollmentFee: false,
      })
    );

    expect(result.steps).toBe(1);
    expect(result.breakdown.tuition).toBe(520);
  });

  it('bills the full ladder level by level', () => {
    // A1.1 → C1.2: lone A1 half (520) + A2 (940) + B1 (940) + B1+ (520)
    //            + B2 (940) + C1 (940) = 4800
    const result = calculateCasaCostPathway(
      makeInput({
        currentLevel: 'A1.1',
        targetLevel: 'C1.2',
        includeBooks: false,
        includeEnrollmentFee: false,
      })
    );

    expect(result.steps).toBe(10);
    expect(result.breakdown.tuition).toBe(4800);
  });

  it('returns a books range when override is not provided', () => {
    // A1.1 → A1.2 = 1 step; book range: 23.99 – 26.99; tuition: 520
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
    expect(result.breakdown.books.min).toBe(23.99);
    expect(result.breakdown.books.max).toBe(26.99);
    expect(result.breakdown.totalMin).toBe(543.99); // 520 + 23.99
    expect(result.breakdown.totalMax).toBe(546.99); // 520 + 26.99
  });

  it('calculates evening path with exams and accommodation lines', () => {
    // A1.1 → B1.1 = 4 steps × 476 = 1904 tuition
    // telcB2 prep + partial: 260 + 160 = 420
    // Accommodation: 10 weeks = 2 blocks (580×2=1160) + 2 extra (145×2=290) = 1450
    // Commission: 50; holiday surcharge: 2×145=290; deposit: 580
    // Special courses: 2×192=384 (default unit price)
    // books override: 120
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
    expect(result.breakdown.specialCourseFees).toBe(384); // 2 × 192
    // NOTE: refundableDeposit (580) is a separate breakdown line, NOT in totalMin/totalMax
    // total = 1904 + 260 + 160 + 1450 + 50 + 290 + 384 + 120 = 4618
    expect(result.breakdown.totalMin).toBe(4618);
    expect(result.breakdown.totalMax).toBe(4618);
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
