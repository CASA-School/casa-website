/**
 * Hands a finished attempt to CASA staff.
 *
 * WHY A WEBHOOK AND NOT A REVIEW QUEUE
 *
 * The upstream package assumes a staff review UI with placement-reviewer roles.
 * `CLAUDE.md` is explicit that this repo must not reintroduce auth, roles, or
 * dashboard surfaces — the portal was removed on purpose. So the division is:
 * the website owns the learner-facing test, the engine, and persistence; the
 * CASA dashboard workspace owns review. This is the seam, and it matches the
 * fan-out idiom the site already uses for contact, careers, and both
 * registration forms.
 *
 * Fire and forget, deliberately. A learner's result must never depend on a
 * downstream system being up: the attempt is already stored and the result page
 * already renders from the database. A failed notification is logged and the
 * attempt is still recoverable by token.
 *
 * SERVER ONLY.
 */

import { getPlacementResultWebhookUrl } from '@/lib/db/env';
import type { PlacementDecision } from './finalise';
import type { StoredAttempt } from './repository.server';

const REQUEST_TIMEOUT_MS = 8000;

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

/** Sends the event if a webhook is configured. Never throws. */
export async function notifyPlacementResult(
  attempt: StoredAttempt,
  decision: PlacementDecision
): Promise<void> {
  const webhookUrl = getPlacementResultWebhookUrl();
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(buildPlacementResultEvent(attempt, decision)),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Webhook rejected the placement result with status ${response.status}`);
    }
  } catch (error) {
    // Logged, not surfaced. The attempt is stored and the learner has their
    // result; staff can still find it by token.
    console.error('[placement] result notification failed', {
      token: attempt.token,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
