import type { ContentLocale } from '@/lib/content/types';
import { pick, say } from '@/lib/cms/copy';

/**
 * Exam and preparation fees, per docs/COURSE_FACTS_SOURCE_OF_TRUTH.md.
 *
 * /exams and each exam's own page both read them here, so a fee changes in one
 * place. German pages write "190 €", English ones "€190" (brief 2026-10-02).
 */
const EXAM_FEES: Record<string, { full: number; partial: number; prep: number }> = {
  telc_b2: { full: 190, partial: 160, prep: 260 },
  telc_c1_hochschule: { full: 210, partial: 185, prep: 520 },
};

/** How the preparation course runs: B2 on Monday and Wednesday evenings, C1 as a four-week block. */
const PREP_RHYTHM: Record<string, Record<ContentLocale, string>> = {
  telc_b2: { de: '1 Monat, Mo und Mi abends', en: '1 month, Mon and Wed evenings' },
  telc_c1_hochschule: { de: '4 Wochen', en: '4 weeks' },
};

export function getExamFees(code: string, locale: ContentLocale) {
  const fees = EXAM_FEES[code];

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
