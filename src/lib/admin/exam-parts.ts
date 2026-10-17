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
