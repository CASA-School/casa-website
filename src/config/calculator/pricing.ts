/**
 * CASA pricing configuration — single source of truth.
 *
 * All figures sourced from 2026 official CASA flyers and level development plan:
 *   - Flyer Abendkurs Herbst 26.docx / GERMAN IN THE EVENING 26.docx
 *   - Flyer Intensivkurse NEU 24.25.docx
 *   - ENG_Level_Developmentplan_2026.docx (dated 05.12.2025)
 *
 * NOTE: This file is intentionally CMS-forward — a future admin dashboard
 * will replace these constants with database-driven values. Until then,
 * all price references across the site must import from here.
 */

// ---------------------------------------------------------------------------
// Level sequence
// ---------------------------------------------------------------------------

export const CASA_LEVEL_SEQUENCE = [
  'A1.1',
  'A1.2',
  'A2.1',
  'A2.2',
  'B1.1',
  'B1.2',
  'B1+',
  'B2.1',
  'B2.2',
  'C1.1',
  'C1.2',
] as const;

export type CasaLevel = (typeof CASA_LEVEL_SEQUENCE)[number];

// ---------------------------------------------------------------------------
// Intensive courses — weekly pricing (source: Flyer Intensivkurse NEU 24.25)
// ---------------------------------------------------------------------------

/**
 * Price per number of weeks for intensive courses.
 * Index 0 = 1 week, index 7 = 8 weeks.
 */
export const INTENSIVE_WEEKLY_PRICES = [140, 270, 390, 500, 600, 700, 800, 900] as const;

/** Price for a full 8-week intensive level (source: Level Development Plan 2026) */
export const INTENSIVE_FULL_LEVEL_8_WEEKS = 940;

/** Price for a half 4-week intensive level */
export const INTENSIVE_HALF_LEVEL_4_WEEKS = 500;

// ---------------------------------------------------------------------------
// Evening courses — trimester pricing (source: GERMAN IN THE EVENING 26.docx)
// ---------------------------------------------------------------------------

export type EveningTerm = 'spring' | 'autumn';

/**
 * Evening course price by trimester.
 * Spring (Frühlingstrimester): 378 €
 * Autumn (Herbsttrimester):   476 €
 */
export const EVENING_TRIMESTER_PRICES: Record<EveningTerm, number> = {
  spring: 378,
  autumn: 476,
};

/** Default / planning basis evening price (Herbst, the longer term) */
export const EVENING_DEFAULT_PRICE = EVENING_TRIMESTER_PRICES.autumn;

// ---------------------------------------------------------------------------
// Special courses — individual module pricing (source: Herbst 26 flyer)
// ---------------------------------------------------------------------------

export type SpecialCourseSlug =
  | 'c1-grammar-conversation'
  | 'phonetics'
  | 'writing-workshop'
  | 'b1-b2-grammar-conversation'
  | 'basic-grammar';

export const SPECIAL_COURSE_PRICES: Record<SpecialCourseSlug, number> = {
  'c1-grammar-conversation': 176,
  phonetics: 176,
  'writing-workshop': 176,
  'b1-b2-grammar-conversation': 192,
  'basic-grammar': 176,
};

/** Default / planning basis for a single special course module */
export const SPECIAL_COURSE_DEFAULT_PRICE = 176;

// ---------------------------------------------------------------------------
// Textbooks — per book (source: Flyer Intensivkurse NEU 24.25)
// ---------------------------------------------------------------------------

/** Per book price for levels A1, A2, B1 (Netzwerk neu series) */
export const BOOK_PRICE_LOWER = 22.99;

/** Per book price for levels B1+, B2, C1 (Kontext series) */
export const BOOK_PRICE_UPPER = 25.99;

// ---------------------------------------------------------------------------
// Enrollment fee (source: Level Development Plan 2026)
// ---------------------------------------------------------------------------

export const ENROLLMENT_FEE = 50;

// ---------------------------------------------------------------------------
// Exam fees (source: Level Development Plan 2026 + Telc 2025 sheet)
// ---------------------------------------------------------------------------

export const EXAM_FEES = {
  telcB2: {
    prep: 260,
    examFull: 190,
    examPartial: 160,
  },
  telcC1: {
    prep: 500,
    examFull: 210,
    examPartial: 185,
  },
} as const;

/** Number of telc B2 exam dates per year (source: Level Development Plan 2026) */
export const TELC_B2_SESSIONS_PER_YEAR = 7;

/** Number of telc C1 Hochschule exam dates per year */
export const TELC_C1_HS_SESSIONS_PER_YEAR = 10;

// ---------------------------------------------------------------------------
// Accommodation (source: Wohnen_2023.pdf / FAQ confirmed)
// ---------------------------------------------------------------------------

export const ACCOMMODATION_FEES = {
  base4Weeks: 580,
  commissionFee: 50,
  deposit: 580,
  perAdditionalWeek: 145,
  holidaySurchargeHostFamilyPerWeek: 145,
  holidaySurchargeSharedFlatPerWeek: 145,
} as const;

// ---------------------------------------------------------------------------
// Legacy aggregate export — kept for backward-compat with cost-calculator.ts
// ---------------------------------------------------------------------------

export const CASA_CALCULATOR_PRICING = {
  currency: 'EUR',
  enrollmentFee: ENROLLMENT_FEE,
  intensive: {
    halfLevel4Weeks: INTENSIVE_HALF_LEVEL_4_WEEKS,
    fullLevel8Weeks: INTENSIVE_FULL_LEVEL_8_WEEKS,
    bookRangePerBook: [BOOK_PRICE_LOWER, BOOK_PRICE_UPPER] as const,
  },
  evening: {
    halfLevelTrimester: EVENING_DEFAULT_PRICE,
    textbookStrategy: 'reuseIntensiveRange' as 'reuseIntensiveRange' | 'overrideOnly',
    textbookRangePerBook: [BOOK_PRICE_LOWER, BOOK_PRICE_UPPER] as const,
  },
  specialCourse: {
    unitPrice: SPECIAL_COURSE_DEFAULT_PRICE,
  },
  exams: EXAM_FEES,
  accommodation: ACCOMMODATION_FEES,
} as const;

export type CasaCalculatorPricing = typeof CASA_CALCULATOR_PRICING;
