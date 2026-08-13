import {
  CASA_CALCULATOR_PRICING,
  CASA_LEVEL_GROUPS,
  CASA_LEVEL_SEQUENCE,
  type CasaCalculatorPricing,
  type CasaLevel,
} from '@/config/calculator/pricing';

export type StudyMode = 'intensive' | 'evening';
export type ExamTarget = 'none' | 'telcB2' | 'telcC1';
export type ExamType = 'full' | 'partial';
export type AccommodationType = 'none' | 'hostFamily' | 'sharedFlat';

export type CasaCalculatorInput = {
  currentLevel: CasaLevel;
  targetLevel: CasaLevel;
  studyMode: StudyMode;
  includeEnrollmentFee: boolean;
  includeBooks: boolean;
  booksOverride: number | null;
  examTarget: ExamTarget;
  includeExamPrep: boolean;
  examType: ExamType;
  accommodationType: AccommodationType;
  accommodationWeeks: number;
  holidayWeeks: number;
  includeDeposit: boolean;
  specialCourseCount: number;
};

export type BooksLineItem = {
  exact: number | null;
  min: number;
  max: number;
  isRange: boolean;
};

export type CasaCalculatorBreakdown = {
  tuition: number;
  enrollmentFee: number;
  books: BooksLineItem;
  examPrep: number;
  examFee: number;
  specialCourseFees: number;
  accommodationRent: number;
  accommodationCommission: number;
  accommodationHolidaySurcharge: number;
  refundableDeposit: number;
  totalMin: number;
  totalMax: number;
};

export type CasaCalculatorResult = {
  isValid: boolean;
  validationError: string | null;
  steps: number;
  duration: {
    unit: 'weeks' | 'months';
    value: number;
  };
  breakdown: CasaCalculatorBreakdown;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function toNonNegativeInt(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function emptyBreakdown(): CasaCalculatorBreakdown {
  return {
    tuition: 0,
    enrollmentFee: 0,
    books: {
      exact: 0,
      min: 0,
      max: 0,
      isRange: false,
    },
    examPrep: 0,
    examFee: 0,
    specialCourseFees: 0,
    accommodationRent: 0,
    accommodationCommission: 0,
    accommodationHolidaySurcharge: 0,
    refundableDeposit: 0,
    totalMin: 0,
    totalMax: 0,
  };
}

export function calculateLevelSteps(currentLevel: CasaLevel, targetLevel: CasaLevel) {
  const currentIndex = CASA_LEVEL_SEQUENCE.indexOf(currentLevel);
  const targetIndex = CASA_LEVEL_SEQUENCE.indexOf(targetLevel);

  if (currentIndex === -1 || targetIndex === -1) {
    return null;
  }

  return targetIndex - currentIndex;
}

/**
 * Intensive tuition, priced per real level rather than per pair of steps.
 *
 * The learner studies the half-levels *after* their current one, up to and
 * including the target. Each level is then billed as a full 8-week level only
 * when both of its halves are studied; anything else — a lone half at either
 * end of the path, or the single-member B1+ level — is a 4-week half level.
 *
 * Counting pairs instead would bill B1+ together with a neighbouring half as a
 * "full level" CASA does not sell.
 */
function resolveIntensiveTuition(
  currentLevel: CasaLevel,
  targetLevel: CasaLevel,
  pricing: CasaCalculatorPricing
) {
  const currentIndex = CASA_LEVEL_SEQUENCE.indexOf(currentLevel);
  const targetIndex = CASA_LEVEL_SEQUENCE.indexOf(targetLevel);
  const studied = new Set<CasaLevel>(CASA_LEVEL_SEQUENCE.slice(currentIndex + 1, targetIndex + 1));

  return CASA_LEVEL_GROUPS.reduce((total, group) => {
    const studiedHalves = group.filter((level) => studied.has(level)).length;

    if (studiedHalves === 0) {
      return total;
    }

    return studiedHalves === group.length && group.length === 2
      ? total + pricing.intensive.fullLevel8Weeks
      : total + studiedHalves * pricing.intensive.halfLevel4Weeks;
  }, 0);
}

function resolveBooksLineItem(
  input: CasaCalculatorInput,
  steps: number,
  pricing: CasaCalculatorPricing
): BooksLineItem {
  if (!input.includeBooks) {
    return {
      exact: 0,
      min: 0,
      max: 0,
      isRange: false,
    };
  }

  if (input.booksOverride !== null && Number.isFinite(input.booksOverride)) {
    const exact = round2(Math.max(0, input.booksOverride));
    return {
      exact,
      min: exact,
      max: exact,
      isRange: false,
    };
  }

  const intensiveRange = pricing.intensive.bookRangePerBook;

  const [rangeMin, rangeMax] =
    input.studyMode === 'evening' && pricing.evening.textbookStrategy === 'overrideOnly'
      ? [0, 0]
      : input.studyMode === 'evening'
        ? pricing.evening.textbookRangePerBook
        : intensiveRange;

  return {
    exact: null,
    min: round2(steps * rangeMin),
    max: round2(steps * rangeMax),
    isRange: true,
  };
}

function resolveExamFees(input: CasaCalculatorInput, pricing: CasaCalculatorPricing) {
  if (input.examTarget === 'none') {
    return { examPrep: 0, examFee: 0 };
  }

  const examPricing =
    input.examTarget === 'telcB2' ? pricing.exams.telcB2 : pricing.exams.telcC1;

  return {
    examPrep: input.includeExamPrep ? examPricing.prep : 0,
    examFee: input.examType === 'full' ? examPricing.examFull : examPricing.examPartial,
  };
}

function resolveAccommodationFees(
  input: CasaCalculatorInput,
  pricing: CasaCalculatorPricing
) {
  if (input.accommodationType === 'none') {
    return {
      accommodationRent: 0,
      accommodationCommission: 0,
      accommodationHolidaySurcharge: 0,
      refundableDeposit: 0,
    };
  }

  const weeks = toNonNegativeInt(input.accommodationWeeks);
  const holidayWeeks = toNonNegativeInt(input.holidayWeeks);
  const blocks = Math.floor(weeks / 4);
  const remainder = weeks % 4;

  const accommodationRent =
    blocks * pricing.accommodation.base4Weeks +
    remainder * pricing.accommodation.perAdditionalWeek;

  const accommodationHolidaySurcharge =
    holidayWeeks *
    (input.accommodationType === 'hostFamily'
      ? pricing.accommodation.holidaySurchargeHostFamilyPerWeek
      : pricing.accommodation.holidaySurchargeSharedFlatPerWeek);

  return {
    accommodationRent,
    accommodationCommission: pricing.accommodation.commissionFee,
    accommodationHolidaySurcharge,
    refundableDeposit: input.includeDeposit ? pricing.accommodation.deposit : 0,
  };
}

export function calculateCasaCostPathway(
  input: CasaCalculatorInput,
  pricing: CasaCalculatorPricing = CASA_CALCULATOR_PRICING
): CasaCalculatorResult {
  const steps = calculateLevelSteps(input.currentLevel, input.targetLevel);

  const duration =
    input.studyMode === 'intensive'
      ? { unit: 'weeks' as const, value: 0 }
      : { unit: 'months' as const, value: 0 };

  if (steps === null || steps <= 0) {
    return {
      isValid: false,
      validationError: 'Target level must be higher than current level.',
      steps: steps ?? 0,
      duration,
      breakdown: emptyBreakdown(),
    };
  }

  const tuition =
    input.studyMode === 'intensive'
      ? resolveIntensiveTuition(input.currentLevel, input.targetLevel, pricing)
      : steps * pricing.evening.halfLevelTrimester;

  const computedDuration =
    input.studyMode === 'intensive'
      ? { unit: 'weeks' as const, value: steps * 4 }
      : { unit: 'months' as const, value: round2(steps * 3.5) };

  const books = resolveBooksLineItem(input, steps, pricing);
  const { examPrep, examFee } = resolveExamFees(input, pricing);
  const accommodation = resolveAccommodationFees(input, pricing);
  const enrollmentFee = input.includeEnrollmentFee ? pricing.enrollmentFee : 0;
  const specialCourseFees =
    toNonNegativeInt(input.specialCourseCount) * pricing.specialCourse.unitPrice;

  const fixedCostBase =
    tuition +
    enrollmentFee +
    examPrep +
    examFee +
    accommodation.accommodationRent +
    accommodation.accommodationCommission +
    accommodation.accommodationHolidaySurcharge +
    specialCourseFees;

  const totalMin = round2(fixedCostBase + books.min);
  const totalMax = round2(fixedCostBase + books.max);

  return {
    isValid: true,
    validationError: null,
    steps,
    duration: computedDuration,
    breakdown: {
      tuition: round2(tuition),
      enrollmentFee: round2(enrollmentFee),
      books,
      examPrep: round2(examPrep),
      examFee: round2(examFee),
      specialCourseFees: round2(specialCourseFees),
      accommodationRent: round2(accommodation.accommodationRent),
      accommodationCommission: round2(accommodation.accommodationCommission),
      accommodationHolidaySurcharge: round2(accommodation.accommodationHolidaySurcharge),
      refundableDeposit: round2(accommodation.refundableDeposit),
      totalMin,
      totalMax,
    },
  };
}
