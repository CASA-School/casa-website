/**
 * CASA pricing configuration — single source of truth.
 *
 * Course prices are the ones verified against casa-bremen.de in
 * docs/COURSE_FACTS_SOURCE_OF_TRUTH.md — read that before changing a number here.
 * The remaining figures come from the 2026 CASA source documents:
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

/**
 * The level a half-level belongs to. The sequence above is written in halves,
 * so the level is whatever precedes the dot — which leaves B1+ (no dot) as a
 * level of its own that is only ever sold as a single 4-week step.
 */
export function casaLevelGroupId(level: CasaLevel) {
  return level.split('.')[0];
}

/**
 * CASA_LEVEL_SEQUENCE grouped into the levels it is actually sold as:
 * [A1.1 A1.2] [A2.1 A2.2] [B1.1 B1.2] [B1+] [B2.1 B2.2] [C1.1 C1.2].
 *
 * Derived from the sequence rather than hand-written so the two cannot drift.
 * Only a two-member group can be bought as a full 8-week level; a lone half —
 * and B1+, whose group has one member — is a 4-week half level.
 */
export const CASA_LEVEL_GROUPS: readonly (readonly CasaLevel[])[] =
  CASA_LEVEL_SEQUENCE.reduce<CasaLevel[][]>((groups, level) => {
    const currentGroup = groups[groups.length - 1];

    if (currentGroup && casaLevelGroupId(currentGroup[0]) === casaLevelGroupId(level)) {
      currentGroup.push(level);
    } else {
      groups.push([level]);
    }

    return groups;
  }, []);

// ---------------------------------------------------------------------------
// Intensive courses — level pricing
// ---------------------------------------------------------------------------

/** Price for a full 8-week intensive level (source: docs/COURSE_FACTS_SOURCE_OF_TRUTH.md:52) */
export const INTENSIVE_FULL_LEVEL_8_WEEKS = 940;

/** Price for a half 4-week intensive level (source: docs/COURSE_FACTS_SOURCE_OF_TRUTH.md:52) */
export const INTENSIVE_HALF_LEVEL_4_WEEKS = 520;

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
// Special courses — individual module pricing
// ---------------------------------------------------------------------------

/**
 * Price of a single special course module
 * (source: docs/COURSE_FACTS_SOURCE_OF_TRUTH.md:54; every module in
 * src/config/courses/special-course-modules.ts carries the same 192).
 */
export const SPECIAL_COURSE_DEFAULT_PRICE = 192;

// ---------------------------------------------------------------------------
// Textbooks — per book
// ---------------------------------------------------------------------------

/**
 * Verified 2026-08-13 directly against casa-bremen.de/en/language-courses/
 * intensive-german-courses: "books 23,99€-26,99€* *varies according to level".
 *
 * The educational-leave page separately quotes "books 46€ - 54€*" with the
 * footnote "*costs for two books" — Bildungszeit runs two intensive courses in
 * parallel, so that figure is a doubled total, not a different per-book price.
 * 2x23.99=47.98 and 2x26.99=53.98 land inside that range, confirming the two
 * figures describe the same underlying per-book cost. See
 * docs/COURSE_FACTS_SOURCE_OF_TRUTH.md.
 */

/** Per book price for levels A1, A2, B1 (Netzwerk neu series) */
export const BOOK_PRICE_LOWER = 23.99;

/** Per book price for levels B1+, B2, C1 (Kontext series) */
export const BOOK_PRICE_UPPER = 26.99;

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
