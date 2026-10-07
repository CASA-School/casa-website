import { ACCOMMODATION_FEES } from '@/config/calculator/pricing';
import type { ContentLocale } from '@/lib/content/types';

/** Same published rates for both accommodation options. Amounts remain tied
 * to the calculator; the refundable deposit is identified separately. */
export type AccommodationCost = {
  label: { en: string; de: string };
  amount: number;
  note?: { en: string; de: string };
  refundable?: true;
};

// German pages write the amount first: "580 €" (go-live brief 2026-10-01).
const eur = (value: number, locale: ContentLocale = 'en') => (locale === 'de' ? `${value}\u00a0€` : `€${value}`);

export const accommodationCosts: AccommodationCost[] = [
  {
    label: { en: 'Rent for 4 weeks', de: 'Miete für 4 Wochen' },
    amount: ACCOMMODATION_FEES.base4Weeks,
    note: {
      en: 'Your room for the first four weeks.',
      de: 'Dein Zimmer für die ersten vier Wochen.',
    },
  },
  {
    label: { en: 'Each additional week', de: 'Jede weitere Woche' },
    amount: ACCOMMODATION_FEES.perAdditionalWeek,
    note: {
      en: 'If you stay longer than four weeks.',
      de: 'Wenn du länger als vier Wochen bleibst.',
    },
  },
  {
    label: { en: 'One-time placement fee', de: 'Einmalige Vermittlungsgebühr' },
    amount: ACCOMMODATION_FEES.commissionFee,
    note: {
      en: 'For arranging your accommodation.',
      de: 'Für die Vermittlung deiner Unterkunft.',
    },
  },
  {
    label: { en: 'Refundable deposit', de: 'Rückerstattbare Kaution' },
    amount: ACCOMMODATION_FEES.deposit,
    refundable: true,
    note: {
      en: 'Returned after departure, provided the accommodation and keys are handed back in the condition in which you received them.',
      de: 'Nach deiner Abreise bekommst du die Kaution zurück, wenn Unterkunft und Schlüssel im gleichen Zustand sind wie bei der Übernahme.',
    },
  },
];

export function localizeAccommodationCosts(locale: ContentLocale) {
  return accommodationCosts.map((cost) => ({
    label: cost.label[locale],
    amount: eur(cost.amount, locale),
    note: cost.note?.[locale],
    tone: cost.refundable ? ('refundable' as const) : ('charge' as const),
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
  const base = eur(ACCOMMODATION_FEES.base4Weeks, locale);
  const week = eur(ACCOMMODATION_FEES.perAdditionalWeek, locale);

  return locale === 'de'
    ? `${base} für 4 Wochen, danach ${week} pro Woche`
    : `${base} for 4 weeks, then ${week} a week`;
}

/** A separate condition, not an unexplained second meaning of the weekly rent. */
export function accommodationHolidayNote(locale: ContentLocale) {
  const amount = eur(ACCOMMODATION_FEES.perAdditionalWeek, locale);
  return locale === 'de'
    ? `Wenn du über Weihnachten oder Ostern bleibst, zahlst du für die Wochen, in denen die Schule geschlossen ist, eine zusätzliche Unterkunftsgebühr von ${amount} pro Woche.`
    : `Staying over Christmas or Easter? An additional accommodation charge of ${amount} per week applies during the school closure.`;
}
