import type { ContentLocale } from '@/lib/content/types';
import { DEFAULT_PUBLISHED_PRICES, type PublishedPrices } from '@/lib/content/published-prices';
import { pick, say } from '@/lib/cms/copy';

/**
 * Exam and preparation fees, as the price list in force publishes them
 * (published-prices.ts); the published figures without a database.
 *
 * /exams and each exam's own page both read them here. German pages write
 * "190 €", English ones "€190" (brief 2026-10-02).
 */

/** How the preparation course runs: B2 on Monday and Wednesday evenings, C1 as a four-week block. */
const PREP_RHYTHM: Record<string, Record<ContentLocale, string>> = {
  telc_b2: { de: '1 Monat, Mo und Mi abends', en: '1 month, Mon and Wed evenings' },
  telc_c1_hochschule: { de: '4 Wochen', en: '4 weeks' },
};

export function getExamFees(code: string, locale: ContentLocale, prices: PublishedPrices = DEFAULT_PUBLISHED_PRICES) {
  const listed = prices.exams[code as keyof PublishedPrices['exams']];
  const fees = listed ? { full: listed.full, partial: listed.part, prep: listed.prep } : undefined;

  if (!fees) {
    return {
      full: say(locale, 'Wird bestätigt', 'To be confirmed'),
      partial: say(locale, 'Nach Rücksprache', 'On request'),
      prep: say(locale, 'Nach Rücksprache', 'On request'),
      prepRhythm: undefined,
    };
  }

  const euro = (amount: number) => (say(locale, '{amount} €', '€{amount}', { amount }));

  return {
    full: euro(fees.full),
    partial: euro(fees.partial),
    prep: euro(fees.prep),
    prepRhythm: pick(locale, PREP_RHYTHM[code]),
  };
}
