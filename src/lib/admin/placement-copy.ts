import type { PlacementReviewReason } from '@/config/placement/policy';
import type { PlacementSkill } from '@/lib/placement/types';

/**
 * Staff-facing copy for the placement engine's own vocabulary.
 *
 * SEPARATE FROM `src/lib/placement/result-copy.ts` ON PURPOSE. That file is
 * learner-facing and `finalise.ts` says explicitly that the two are kept apart
 * so a reason code can never leak into learner copy. This is the other side of
 * that wall: a teacher needs the reason code named plainly, including the ones
 * that would alarm a learner, and phrased as what to do about it.
 */

export const REVIEW_REASON_COPY: Record<PlacementReviewReason, string> = {
  technical_problem: 'Something went wrong during the test — treat the score as unreliable.',
  incomplete_objective_evidence: 'Too little of the test was answered to place on it alone.',
  router_level_disagreement:
    'The opening screener and the level module pointed at different levels.',
  low_confidence: 'The evidence supports the band only weakly.',
  unresolved_boundary: 'The boundary check did not settle which side of the edge they are on.',
  b1plus_b2_boundary: 'On the B1+/B2 edge, where CASA course structure changes.',
  above_auto_confirm_ceiling: 'Above B1.2, which CASA policy never auto-confirms.',
  uneven_skill_profile: 'Strong in one skill and weak in another — one class may not fit.',
  speaking_required: 'From B1+ a spoken conversation is part of the placement.',
  incomplete_production: 'The writing task was offered and not finished.',
  learner_requested_review: 'The learner asked for a person to look at this.',
  shadow_mode:
    'The test is in shadow mode: every result is a recommendation for staff, never a placement.',
};

export const SKILL_LABELS: Record<PlacementSkill, string> = {
  language_use: 'Language use',
  reading: 'Reading',
  listening: 'Listening',
};

export const CONFIDENCE_COPY = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
} as const;

/** Unscored self-report from the intake step, labelled for a reader. */
export const INTAKE_LABELS: Record<string, string> = {
  priorLearning: 'Prior learning',
  goal: 'Why they are learning',
  lastContact: 'Last contact with German',
  selfAssessedLevel: 'Level they would guess',
  studyContext: 'Where they studied',
};
