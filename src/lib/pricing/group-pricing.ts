/**
 * Group course price model.
 *
 * Ported from `Preiskalkulation_Gruppen.xlsx` (received 2026-08-12, authored by
 * the group-courses coordinator). The workbook computes a per-person total from
 * six components for a given number of weeks.
 *
 * This module is deliberately pure and UI-free so it can back both a public
 * estimator and an internal quoting tool.
 *
 * IMPORTANT — this is an ESTIMATE, never a quotation. CASA's published position
 * is that group offers are "unverbindlich" (non-binding). Anything rendered to
 * the public must say so, and the binding figure still comes from staff.
 *
 * Three deviations from the workbook are applied here on purpose. Each is a bug
 * in the sheet, each changes the total, and all three need the coordinator's
 * sign-off before this drives a real quote. See DEVIATIONS below.
 */

export type RoomType = 'double' | 'single';
export type CultureTier = 'small' | 'medium' | 'large';
export type TransitTicket =
  | 'none'
  | 'weekly-student'
  | 'weekly-adult'
  | 'monthly-student'
  | 'monthly-adult';

export type GroupQuoteInput = {
  weeks: number;
  /** Learners in the group. Currently informational — no volume tiering exists yet. */
  participants?: number;
  roomType: RoomType;
  /** Half board is the only option the workbook prices. */
  includeAccommodation: boolean;
  includeCanteen: boolean;
  transit: TransitTicket;
  culture: CultureTier | 'none';
  includeMaterials?: boolean;
};

/** All rates in EUR, per person. Source: Kalkulation sheet. */
export const GROUP_RATES = {
  /** Kurspreis B4 — 20 UE/week. Per-UE equivalent is 7.25. */
  coursePerWeek: 145,
  lessonsPerWeek: 20,
  /** Lehrmaterial B5. Flat, once per person. */
  materials: 20,
  /** Verwaltungskosten B32 — "muss immer aufgeschlagen werden". */
  administration: 30,
  /** Kantine B24, per week. */
  canteenPerWeek: 60,
  /** Kulturprogramm B27:B29, per week. */
  culturePerWeek: { small: 40, medium: 60, large: 100 } as Record<CultureTier, number>,
  /** ÖPNV B18:B21. `perWeeks` is the span one ticket covers. */
  transit: {
    none: { price: 0, perWeeks: 1 },
    'weekly-student': { price: 25, perWeeks: 1 },
    'weekly-adult': { price: 35, perWeeks: 1 },
    'monthly-student': { price: 75, perWeeks: 4 },
    'monthly-adult': { price: 100, perWeeks: 4 },
  } as Record<TransitTicket, { price: number; perWeeks: number }>,
  /** Accommodation A8:B15, half board, indexed by week count (1-4). */
  accommodation: {
    double: { 1: 255, 2: 450, 3: 645, 4: 840 } as Record<number, number>,
    single: { 1: 265, 2: 550, 3: 805, 4: 1060 } as Record<number, number>,
  },
  /** Marginal weekly rate beyond the workbook's 4-week table. Unconfirmed. */
  accommodationMarginalWeek: { double: 195, single: 255 } as Record<RoomType, number>,
} as const;

export const MAX_TABULATED_WEEKS = 4;

/**
 * Deviations from the workbook, applied by this module.
 *
 * 1. MATERIALS ARE INCLUDED. The sheet defines Lehrmaterial at B5 = 20 but the
 *    total at I11 is `SUM(I5:I10)`, which never references B5. Every quote the
 *    sheet produces is 20 EUR per person short. Set `includeMaterials: false`
 *    to reproduce the sheet's output exactly.
 *
 * 2. MONTHLY TICKETS ARE NOT MULTIPLIED BY WEEKS. The sheet computes
 *    `VLOOKUP(ticket) * weeks` for every ticket type. That is right for the
 *    7-day tickets and wrong for the monthly ones: a 2-week stay on a
 *    Monatsticket Schüler is charged 150 EUR instead of 75. Here a monthly
 *    ticket covers up to 4 weeks and is charged per 4-week block.
 *
 * 3. ACCOMMODATION WEEKS FOLLOW THE STAY. The sheet picks accommodation from a
 *    dropdown whose label embeds its own week count ("2 Wochen, DZ, HP"),
 *    independent of the week count driving every other line. Choosing a
 *    mismatched pair silently produces a wrong total. Here accommodation is
 *    derived from `weeks`, so the two cannot disagree.
 */
export const DEVIATIONS = [
  'materials-included',
  'monthly-transit-not-per-week',
  'accommodation-derived-from-weeks',
] as const;

function accommodationCost(weeks: number, roomType: RoomType) {
  const table = GROUP_RATES.accommodation[roomType];
  if (weeks <= MAX_TABULATED_WEEKS) {
    return { amount: table[weeks] ?? 0, extrapolated: false };
  }

  // Beyond four weeks the workbook has no rate. Extend at the marginal weekly
  // rate and flag it, rather than silently inventing a number.
  const base = table[MAX_TABULATED_WEEKS] ?? 0;
  const extra = (weeks - MAX_TABULATED_WEEKS) * GROUP_RATES.accommodationMarginalWeek[roomType];
  return { amount: base + extra, extrapolated: true };
}

function transitCost(weeks: number, ticket: TransitTicket) {
  const { price, perWeeks } = GROUP_RATES.transit[ticket];
  if (price === 0) {
    return 0;
  }

  return price * Math.ceil(weeks / perWeeks);
}

export type GroupQuoteLine = {
  key: 'course' | 'materials' | 'accommodation' | 'canteen' | 'transit' | 'culture' | 'administration';
  amount: number;
};

export type GroupQuote = {
  lines: GroupQuoteLine[];
  /** Per person, EUR. */
  perPerson: number;
  /** Per person x participants, when a group size is known. */
  groupTotal: number | null;
  /** True when the stay exceeds the workbook's four-week accommodation table. */
  accommodationExtrapolated: boolean;
  warnings: string[];
};

export function calculateGroupQuote(input: GroupQuoteInput): GroupQuote {
  const weeks = Math.max(0, Math.floor(input.weeks));
  const warnings: string[] = [];

  if (weeks === 0) {
    return {
      lines: [],
      perPerson: 0,
      groupTotal: null,
      accommodationExtrapolated: false,
      warnings: ['A stay length of at least one week is required.'],
    };
  }

  const accommodation = input.includeAccommodation
    ? accommodationCost(weeks, input.roomType)
    : { amount: 0, extrapolated: false };

  if (accommodation.extrapolated) {
    warnings.push(
      `Accommodation beyond ${MAX_TABULATED_WEEKS} weeks is extrapolated at the marginal weekly rate and is not covered by the source calculation. Confirm with CASA.`
    );
  }

  const lines: GroupQuoteLine[] = [
    { key: 'course', amount: GROUP_RATES.coursePerWeek * weeks },
    { key: 'materials', amount: input.includeMaterials === false ? 0 : GROUP_RATES.materials },
    { key: 'accommodation', amount: accommodation.amount },
    { key: 'canteen', amount: input.includeCanteen ? GROUP_RATES.canteenPerWeek * weeks : 0 },
    { key: 'transit', amount: transitCost(weeks, input.transit) },
    {
      key: 'culture',
      amount: input.culture === 'none' ? 0 : GROUP_RATES.culturePerWeek[input.culture] * weeks,
    },
    { key: 'administration', amount: GROUP_RATES.administration },
  ];

  const perPerson = lines.reduce((sum, line) => sum + line.amount, 0);
  const participants = input.participants && input.participants > 0 ? input.participants : null;

  return {
    lines,
    perPerson,
    groupTotal: participants ? perPerson * participants : null,
    accommodationExtrapolated: accommodation.extrapolated,
    warnings,
  };
}
