import type { Bilingual } from './i18n';

/**
 * What of an exam a candidate sits (0036): the whole exam, or one of its two parts — telc sells the
 * written and the oral part separately, at a lower fee. The same three words as the website's
 * registration form, so a registration becomes a booking without translation. Client-safe.
 */
export const EXAM_PARTS = ['full', 'written', 'oral'] as const;
export type ExamParts = (typeof EXAM_PARTS)[number];

export const EXAM_PARTS_LABELS: Record<ExamParts, Bilingual> = {
  full: { de: 'Ganze Prüfung', en: 'Full exam' },
  written: { de: 'Nur schriftlicher Teil', en: 'Written part only' },
  oral: { de: 'Nur mündlicher Teil', en: 'Oral part only' },
};

export const isExamParts = (value: unknown): value is ExamParts => (EXAM_PARTS as readonly unknown[]).includes(value);

/** How many parts a rate is for: both (2), or one (1) — the written and the oral cost the same. */
export const ratedParts = (parts: ExamParts): 1 | 2 => (parts === 'full' ? 2 : 1);

/** What telc sent for one part a candidate sat (0038): never free text. */
export const EXAM_OUTCOMES = ['passed', 'failed', 'absent'] as const;
export type ExamOutcome = (typeof EXAM_OUTCOMES)[number];
export const EXAM_OUTCOME_LABELS: Record<ExamOutcome, Bilingual> = {
  passed: { de: 'Bestanden', en: 'Passed' },
  failed: { de: 'Nicht bestanden', en: 'Not passed' },
  absent: { de: 'Nicht erschienen', en: 'Did not come' },
};
export const isExamOutcome = (value: unknown): value is ExamOutcome => (EXAM_OUTCOMES as readonly unknown[]).includes(value);

/** The parts a booking sat: both, or the one. */
export const partsSat = (parts: ExamParts): ('written' | 'oral')[] => (parts === 'full' ? ['written', 'oral'] : [parts]);

/** The whole result, worked out from the parts and never stored. */
export type ExamOverall = 'passed' | 'partial' | 'failed' | 'absent';
export const EXAM_OVERALL_LABELS: Record<ExamOverall, Bilingual> = {
  passed: { de: 'Bestanden', en: 'Passed' },
  partial: { de: 'Teilweise bestanden', en: 'Partly passed' },
  failed: { de: 'Nicht bestanden', en: 'Not passed' },
  absent: { de: 'Nicht erschienen', en: 'Did not come' },
};

/**
 * Every part sat passed: passed; none came: absent; one passed and one not: partly passed — telc lets
 * the other be sat again; else not passed. Null while a part sat has no outcome yet.
 */
export function overallOutcome(parts: ExamParts, result: { written: ExamOutcome | null; oral: ExamOutcome | null }): ExamOverall | null {
  const outcomes = partsSat(parts).map((p) => result[p]);
  if (outcomes.some((o) => o === null)) return null;
  if (outcomes.every((o) => o === 'passed')) return 'passed';
  if (outcomes.every((o) => o === 'absent')) return 'absent';
  if (outcomes.some((o) => o === 'passed')) return 'partial';
  return 'failed';
}

/** A sitting is prepared (not on the website), on offer, or called off (0038). */
export const SITTING_STATUS_LABELS: Record<'draft' | 'scheduled' | 'cancelled', Bilingual> = {
  draft: { de: 'Entwurf', en: 'Draft' },
  scheduled: { de: 'Auf der Website', en: 'On the website' },
  cancelled: { de: 'Abgesagt', en: 'Cancelled' },
};
