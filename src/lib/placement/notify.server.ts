/** Notify staff after a placement result has been stored; delivery never blocks the result page. */

import { notifyForm } from '@/lib/notifications/forms.server';
import { getPlacementResultWebhookUrl } from '@/lib/db/env';
import type { PlacementDecision } from './finalise';
import type { StoredAttempt } from './repository.server';


/**
 * What the dashboard receives.
 *
 * Carries the recommendation and the reasons a human should look, but no learner
 * identity: the placement test asks for no name or email (see
 * docs/PLACEMENT_TEST_OPEN_DECISIONS.md — the applicant-record link is an open
 * CASA decision). The token is how staff find the attempt.
 */
export type PlacementResultEvent = {
  event: 'placement.attempt.submitted';
  token: string;
  submittedAt: string;
  locale: 'en' | 'de';
  /** Non-identifying learner context collected before the test. */
  intake: {
    priorLearning: string;
    goal: string;
    lastContact: string;
  } | null;
  policyVersion: number;
  releaseMode: string;
  band: string;
  confidence: string;
  autoConfirmable: boolean;
  reviewReasons: readonly string[];
  speakingRequired: boolean;
  routerTargetLevel: string | null;
  boundaryModuleId: string | null;
  answeredShare: number;
  /** Per-skill credit. `null` where a skill was not measured at all. */
  skillProfile: readonly { skill: string; credit: number | null; itemCount: number }[];
  /** The engine's own reasoning, so a reviewer can interrogate the placement. */
  rationale: readonly string[];
};

export function buildPlacementResultEvent(
  attempt: StoredAttempt,
  decision: PlacementDecision
): PlacementResultEvent {
  return {
    event: 'placement.attempt.submitted',
    token: attempt.token,
    submittedAt: attempt.submittedAt ?? new Date().toISOString(),
    locale: attempt.locale,
    intake: attempt.intake
      ? {
          priorLearning: attempt.intake.priorLearning,
          goal: attempt.intake.goal,
          lastContact: attempt.intake.lastContact,
        }
      : null,
    policyVersion: decision.policyVersion,
    releaseMode: decision.releaseMode,
    band: decision.band,
    confidence: decision.confidence,
    autoConfirmable: decision.autoConfirmable,
    reviewReasons: decision.reviewReasons,
    speakingRequired: decision.speakingRequired,
    routerTargetLevel: attempt.routerTargetLevel,
    boundaryModuleId: attempt.boundaryModuleId,
    answeredShare: decision.answeredShare,
    skillProfile: decision.skillProfile.map((entry) => ({
      skill: entry.skill,
      credit: entry.credit,
      itemCount: entry.itemCount,
    })),
    rationale: decision.rationale,
  };
}

/** Delivery never determines whether the learner can see their saved result. */
export async function notifyPlacementResult(
  attempt: StoredAttempt,
  decision: PlacementDecision
): Promise<void> {
  await notifyForm('placement', { ...buildPlacementResultEvent(attempt, decision) }, getPlacementResultWebhookUrl());
}
