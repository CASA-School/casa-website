import type { PlacementReviewReason } from '@/config/placement/policy';
import type { PlacementSkill } from '@/lib/placement/types';

import type { Bilingual } from './i18n';

/**
 * Staff-facing copy for the placement engine's own vocabulary.
 *
 * SEPARATE FROM `src/lib/placement/result-copy.ts` ON PURPOSE. That file is
 * learner-facing and `finalise.ts` says explicitly that the two are kept apart
 * so a reason code can never leak into learner copy. This is the other side of
 * that wall: a teacher needs the reason code named plainly, including the ones
 * that would alarm a learner, and phrased as what to do about it. Every text
 * is in both of the workspace's languages, read with `pick(lang, …)`.
 */

export const REVIEW_REASON_COPY: Record<PlacementReviewReason, Bilingual> = {
  technical_problem: {
    de: 'Während des Tests ist etwas schiefgelaufen – betrachte den Wert als unzuverlässig.',
    en: 'Something went wrong during the test — treat the score as unreliable.',
  },
  incomplete_objective_evidence: {
    de: 'Zu wenig vom Test wurde bearbeitet, um allein danach einzustufen.',
    en: 'Too little of the test was answered to place on it alone.',
  },
  router_level_disagreement: {
    de: 'Der Einstiegsteil und das Niveaumodul zeigen auf unterschiedliche Niveaus.',
    en: 'The opening screener and the level module pointed at different levels.',
  },
  low_confidence: {
    de: 'Die Hinweise stützen diese Stufe nur schwach.',
    en: 'The evidence supports the band only weakly.',
  },
  unresolved_boundary: {
    de: 'Die Grenzprüfung hat nicht geklärt, auf welcher Seite der Grenze die Person liegt.',
    en: 'The boundary check did not settle which side of the edge they are on.',
  },
  b1plus_b2_boundary: {
    de: 'An der Grenze B1+/B2, wo sich die Kursstruktur bei CASA ändert.',
    en: 'On the B1+/B2 edge, where CASA course structure changes.',
  },
  above_auto_confirm_ceiling: {
    de: 'Über B1.2 – das bestätigt CASA nie automatisch.',
    en: 'Above B1.2, which CASA policy never auto-confirms.',
  },
  uneven_skill_profile: {
    de: 'Stark in einer Fertigkeit, schwach in einer anderen – ein einzelner Kurs passt vielleicht nicht.',
    en: 'Strong in one skill and weak in another — one class may not fit.',
  },
  speaking_required: {
    de: 'Ab B1+ gehört ein Gespräch zur Einstufung.',
    en: 'From B1+ a spoken conversation is part of the placement.',
  },
  incomplete_production: {
    de: 'Die Schreibaufgabe wurde angeboten, aber nicht abgeschlossen.',
    en: 'The writing task was offered and not finished.',
  },
  learner_requested_review: {
    de: 'Die lernende Person möchte, dass sich jemand das ansieht.',
    en: 'The learner asked for a person to look at this.',
  },
  shadow_mode: {
    de: 'Der Test läuft im Schattenmodus: Jedes Ergebnis ist eine Empfehlung fürs Team, nie eine Einstufung.',
    en: 'The test is in shadow mode: every result is a recommendation for staff, never a placement.',
  },
};

/** The workspace's own skill names. The learner's are in src/config/placement/result-copy.ts. */
export const SKILL_LABELS: Record<PlacementSkill, Bilingual> = {
  language_use: { de: 'Sprachgebrauch', en: 'Language use' },
  reading: { de: 'Lesen', en: 'Reading' },
  listening: { de: 'Hören', en: 'Listening' },
};

export const CONFIDENCE_COPY: Record<'high' | 'medium' | 'low', Bilingual> = {
  high: { de: 'Hoch', en: 'High' },
  medium: { de: 'Mittel', en: 'Medium' },
  low: { de: 'Niedrig', en: 'Low' },
};

/** Unscored self-report from the intake step, labelled for a reader. */
export const INTAKE_LABELS: Record<string, Bilingual> = {
  priorLearning: { de: 'Bisher gelernt', en: 'Prior learning' },
  goal: { de: 'Warum Deutsch', en: 'Why they are learning' },
  lastContact: { de: 'Letzter Kontakt mit Deutsch', en: 'Last contact with German' },
  selfAssessedLevel: { de: 'Selbst geschätztes Niveau', en: 'Level they would guess' },
  studyContext: { de: 'Wo gelernt', en: 'Where they studied' },
};
