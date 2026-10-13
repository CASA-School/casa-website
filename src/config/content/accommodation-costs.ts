import type { ContentLocale } from '@/lib/content/types';
import { DEFAULT_PUBLISHED_PRICES, type PublishedPrices } from '@/lib/content/published-prices';
import { pick, say } from '@/lib/cms/copy';

/** Same published rates for both accommodation options, from the price list in
 * force (published-prices.ts); the refundable deposit is identified separately. */
export type AccommodationCost = {
  label: { en: string; de: string };
  amount: number;
  note?: { en: string; de: string };
  refundable?: true;
};

// German pages write the amount first: "580 €" (go-live brief 2026-10-01).
const eur = (value: number, locale: ContentLocale = 'en') => (say(locale, '{value} €', '€{value}', { value }));

export const accommodationCostsFor = (p: PublishedPrices = DEFAULT_PUBLISHED_PRICES): AccommodationCost[] => [
  {
    label: { en: 'Rent for 4 weeks', de: 'Miete für 4 Wochen' },
    amount: p.rent4Weeks,
    note: {
      en: 'Your room for the first four weeks.',
      de: 'Dein Zimmer für die ersten vier Wochen.',
    },
  },
  {
    label: { en: 'Each additional week', de: 'Jede weitere Woche' },
    amount: p.rentExtraWeek,
    note: {
      en: 'If you stay longer than four weeks.',
      de: 'Wenn du länger als vier Wochen bleibst.',
    },
  },
  {
    label: { en: 'One-off booking fee', de: 'Einmalige Vermittlungsgebühr' },
    amount: p.placementFee,
    note: {
      en: 'For arranging your accommodation.',
      de: 'Für die Vermittlung deiner Unterkunft.',
    },
  },
  {
    label: { en: 'Refundable deposit', de: 'Rückerstattbare Kaution' },
    amount: p.deposit,
    refundable: true,
    note: {
      en: 'You get the deposit back after you leave, as long as the accommodation and keys are in the same condition as when you received them.',
      de: 'Nach deiner Abreise bekommst du die Kaution zurück, wenn Unterkunft und Schlüssel im gleichen Zustand sind wie bei der Übernahme.',
    },
  },
];

export function localizeAccommodationCosts(locale: ContentLocale, prices: PublishedPrices = DEFAULT_PUBLISHED_PRICES) {
  return accommodationCostsFor(prices).map((cost) => ({
    label: pick(locale, cost.label),
    amount: eur(cost.amount, locale),
    note: (cost.note ? pick(locale, cost.note) : undefined),
    tone: cost.refundable ? ('refundable' as const) : ('charge' as const),
  }));
}

/** A separate condition, not an unexplained second meaning of the weekly rent. */
export function accommodationHolidayNote(locale: ContentLocale, prices: PublishedPrices = DEFAULT_PUBLISHED_PRICES) {
  const amount = eur(prices.rentExtraWeek, locale);
  return say(locale, 'Wenn du über Weihnachten oder Ostern bleibst, zahlst du für die Wochen, in denen die Schule geschlossen ist, eine zusätzliche Unterkunftsgebühr von {amount} pro Woche.', 'If you stay over Christmas or Easter, you pay an additional accommodation charge of {amount} a week for the weeks when the school is closed.', { amount });
}
