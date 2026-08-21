import { ACCOMMODATION_FEES } from '@/config/calculator/pricing';
import type { ContentLocale } from '@/lib/content/types';

/**
 * What CASA accommodation costs — stated once, for every accommodation surface.
 *
 * THE TWO OPTIONS COST THE SAME. docs/COURSE_FACTS_SOURCE_OF_TRUTH.md prices
 * them from one pair of pages — `/unterkunft/wohnen-in-einer-gastfamilie` and
 * `/unterkunft/die-casa-wg` — with one set of figures covering both. The pages
 * did not say so, and disagreed instead. Measured before this:
 *
 *   /accommodation          only 580 EUR
 *   /accommodation/flat     580, 145 and the 50 EUR placement fee
 *   /accommodation/host     580 and 145, no placement fee
 *
 * Worse, the same 145 EUR appeared as two different things: "plus 145 EUR for
 * each additional week" on the flat page and "holiday surcharge is planned at
 * 145 EUR per week" on the host page. The doc says it is BOTH — the
 * additional-week rate, and the Christmas/Easter closure surcharge. A reader
 * comparing the two options would reasonably have concluded they are priced
 * differently, and picked on that basis.
 *
 * So this is a single list rather than per-option highlights. If CASA ever does
 * price the two apart, that is the moment to split it — not before.
 *
 * `refundable` and `note` exist so the deposit reads as a deposit rather than as
 * a second 580 EUR charge, which is how it read when it was one bullet among
 * four in a highlights array.
 */
export type AccommodationCost = {
  label: { en: string; de: string };
  amount: string;
  note?: { en: string; de: string };
};

/*
 * DERIVED, not restated.
 *
 * config/calculator/pricing.ts already held these figures as ACCOMMODATION_FEES
 * (base4Weeks, commissionFee, deposit, perAdditionalWeek), sourced from
 * Wohnen_2023.pdf and the FAQ, and the cost calculator has been quoting from
 * them all along. Writing them out again here would have been a second source
 * for one set of numbers — exactly the duplication this file exists to remove on
 * the accommodation pages. They agree today; deriving is what keeps them
 * agreeing.
 */
const eur = (value: number) => `€${value}`;

export const accommodationCosts: AccommodationCost[] = [
  {
    label: { en: 'First 4 weeks', de: 'Erste 4 Wochen' },
    amount: eur(ACCOMMODATION_FEES.base4Weeks),
    note: {
      en: 'The same for a host family and for a CASA shared flat.',
      de: 'Für die Gastfamilie und für die CASA-WG identisch.',
    },
  },
  {
    label: { en: 'Each additional week', de: 'Jede weitere Woche' },
    amount: eur(ACCOMMODATION_FEES.perAdditionalWeek),
    note: {
      // One figure, two occasions. Both are in the verified table.
      en: 'Also the surcharge for the Christmas and Easter closure weeks.',
      de: 'Gilt auch als Zuschlag für die Schließzeiten zu Weihnachten und Ostern.',
    },
  },
  {
    label: { en: 'Placement fee', de: 'Vermittlungsgebühr' },
    amount: eur(ACCOMMODATION_FEES.commissionFee),
    note: {
      en: 'Charged once, for arranging the placement.',
      de: 'Einmalig, für die Vermittlung.',
    },
  },
  {
    label: { en: 'Deposit', de: 'Deponat' },
    amount: eur(ACCOMMODATION_FEES.deposit),
    note: {
      en: 'Refunded when the room and the keys come back as they were handed over.',
      de: 'Wird zurückerstattet, wenn Zimmer und Schlüssel so übergeben werden wie erhalten.',
    },
  },
];

export function localizeAccommodationCosts(locale: ContentLocale) {
  return accommodationCosts.map((cost) => ({
    label: cost.label[locale],
    amount: cost.amount,
    note: cost.note?.[locale],
  }));
}

/**
 * The one-line version, for a facts rail or a summary row.
 *
 * Deliberately leads with the two figures that decide affordability and leaves
 * the placement fee and deposit to the full table — a rail row is not the place
 * to itemise four charges.
 */
export function accommodationPriceSummary(locale: ContentLocale) {
  const base = eur(ACCOMMODATION_FEES.base4Weeks);
  const week = eur(ACCOMMODATION_FEES.perAdditionalWeek);

  return locale === 'de'
    ? `${base} für 4 Wochen, danach ${week} pro Woche`
    : `${base} for 4 weeks, then ${week} a week`;
}
