/**
 * Attempt orchestration: the state machine between the pure engine and storage.
 *
 * One integrated attempt, forward only. There is no back navigation and that is
 * a design choice, not an omission — an adaptive test whose earlier answers can
 * be revised after seeing later items is no longer measuring what it routed on,
 * and it turns "one item at a time" into a form the learner reviews.
 *
 * SERVER ONLY.
 */

import { LISTENING_AUDIO_AVAILABLE } from '@/config/placement/policy';
import {
  ROUTER_MODULE_ID,
  composeModuleItems,
  getItem,
  getStimulus,
  levelModuleId,
  optionOrderFor,
  tokenOrderFor,
  writingPromptFor,
} from './content.server';
import { finaliseDirectBeginner, finalisePlacement, type PlacementDecision } from './finalise';
import { notifyPlacementResult } from './notify.server';
import {
  resolveBoundary,
  resolveLevelModule,
  routerEvidenceIsConclusive,
  routeFromRouter,
  type BoundaryOutcome,
  type LevelOutcome,
  type RouterOutcome,
} from './route';
import {
  createAttempt,
  getAttemptByToken,
  getAttemptByTokenWithPersistence,
  listResponses,
  saveResponse,
  saveWriting,
  updateAttempt,
  type PlacementIntake,
  type StoredAttempt,
} from './repository.server';
import { sanitiseItem } from './sanitise';
import { scoreItem } from './score-item';
import type {
  ClientAttemptState,
  ClientItem,
  PlacementItem,
  PlacementItemScore,
  PlacementPhase,
  PlacementProductionPrompt,
  PlacementResponse,
  PlacementResponseValue,
} from './types';

/**
 * The item sequence for a phase, plus the scores for whatever has been answered.
 * Recomputed per request rather than cached: the bank is static, the response
 * set is small, and a cache here would be a resume bug waiting to happen.
 */
type PhaseEvidence = { items: PlacementItem[]; scores: PlacementItemScore[]; answeredCount: number };

function evaluatePhase(items: PlacementItem[], responses: Map<string, PlacementResponse>): PhaseEvidence {
  const scores: PlacementItemScore[] = [];
  let answeredCount = 0;

  for (const item of items) {
    const response = responses.get(item.id);
    if (!response) continue;
    answeredCount += 1;
    scores.push(scoreItem(item, response.value));
  }

  return { items, scores, answeredCount };
}

function responseMap(responses: readonly PlacementResponse[]): Map<string, PlacementResponse> {
  return new Map(responses.map((response) => [response.itemId, response]));
}

// ---------------------------------------------------------------------------
// progression
// ---------------------------------------------------------------------------

/**
 * Everything the engine currently knows about an attempt.
 *
 * Derived from stored responses on every call, so the truth is always the
 * answers rather than a phase column that could drift out of step with them.
 * The stored `phase` is a resume hint; this is the authority.
 */
export type AttemptProgress = {
  attempt: StoredAttempt;
  phase: PlacementPhase;
  router: RouterOutcome | null;
  level: LevelOutcome | null;
  boundary: BoundaryOutcome | null;
  /** The item the learner should see now, or null when the phase is complete. */
  nextItem: PlacementItem | null;
  positionInPhase: number;
  itemsInPhase: number;
  allScores: PlacementItemScore[];
  /**
   * Every item the attempt has put in front of the learner across all phases
   * entered so far, answered or not. The denominator for completeness — see the
   * note on `FinaliseInput.servedItemCount`.
   */
  servedItemCount: number;
  writingPrompt: PlacementProductionPrompt | null;
};

export async function computeProgress(attempt: StoredAttempt): Promise<AttemptProgress> {
  const responses = responseMap(await listResponses(attempt.id));

  const base = {
    attempt,
    router: null as RouterOutcome | null,
    level: null as LevelOutcome | null,
    boundary: null as BoundaryOutcome | null,
    writingPrompt: null as PlacementProductionPrompt | null,
  };

  // A learner who reported no German never sits an item.
  if (attempt.intake?.directBeginner) {
    return {
      ...base,
      phase: 'complete',
      nextItem: null,
      positionInPhase: 0,
      itemsInPhase: 0,
      allScores: [],
      servedItemCount: 0,
    };
  }

  // --- router --------------------------------------------------------------
  const routerItems = composeModuleItems(ROUTER_MODULE_ID);
  const routerEvidence = evaluatePhase(routerItems, responses);
  const allScores: PlacementItemScore[] = [...routerEvidence.scores];

  const routerComplete = routerEvidenceIsConclusive(routerItems, routerEvidence.scores);

  if (!routerComplete) {
    const nextItem = routerItems.find((item) => !responses.has(item.id)) ?? null;
    return {
      ...base,
      phase: 'router',
      nextItem,
      positionInPhase: routerEvidence.answeredCount + 1,
      itemsInPhase: routerItems.length,
      allScores,
      servedItemCount: routerItems.length,
    };
  }

  const router = routeFromRouter(routerEvidence.scores);
  const routerItemCount = routerEvidence.answeredCount;

  // --- level ---------------------------------------------------------------
  const levelItems = composeModuleItems(levelModuleId(router.targetLevel));
  const levelEvidence = evaluatePhase(levelItems, responses);
  allScores.push(...levelEvidence.scores);

  if (levelEvidence.answeredCount < levelItems.length) {
    const nextItem = levelItems.find((item) => !responses.has(item.id)) ?? null;
    return {
      ...base,
      router,
      phase: 'level',
      nextItem,
      positionInPhase: levelEvidence.answeredCount + 1,
      itemsInPhase: levelItems.length,
      allScores,
      servedItemCount: routerItemCount + levelItems.length,
    };
  }

  const level = resolveLevelModule(router.targetLevel, levelEvidence.scores);

  // --- boundary ------------------------------------------------------------
  let boundary: BoundaryOutcome | null = null;

  if (level.boundaryProbe) {
    const boundaryItems = composeModuleItems(level.boundaryProbe.moduleId);
    const boundaryEvidence = evaluatePhase(boundaryItems, responses);
    allScores.push(...boundaryEvidence.scores);

    if (boundaryEvidence.answeredCount < boundaryItems.length) {
      const nextItem = boundaryItems.find((item) => !responses.has(item.id)) ?? null;
      return {
        ...base,
        router,
        level,
        phase: 'boundary',
        nextItem,
        positionInPhase: boundaryEvidence.answeredCount + 1,
        itemsInPhase: boundaryItems.length,
        allScores,
        servedItemCount: routerItemCount + levelItems.length + boundaryItems.length,
      };
    }

    boundary = resolveBoundary(level.boundaryProbe, boundaryEvidence.scores);
  }

  // --- writing -------------------------------------------------------------
  const band = boundary ? boundary.band : level.provisionalBand;
  const writingPrompt = writingPromptFor(attempt.id, band);

  const boundaryItemCount = level.boundaryProbe
    ? composeModuleItems(level.boundaryProbe.moduleId).length
    : 0;

  return {
    ...base,
    router,
    level,
    boundary,
    phase: attempt.phase === 'complete' ? 'complete' : 'writing',
    nextItem: null,
    positionInPhase: 0,
    itemsInPhase: 0,
    allScores,
    servedItemCount: routerItemCount + levelItems.length + boundaryItemCount,
    writingPrompt,
  };
}

// ---------------------------------------------------------------------------
// public operations
// ---------------------------------------------------------------------------

export async function startAttempt(options: {
  locale: 'en' | 'de';
  intake: PlacementIntake;
}): Promise<{ attempt: StoredAttempt; decision: PlacementDecision | null; persisted: boolean }> {
  const directBeginner = options.intake.directBeginner;

  const { attempt, persisted } = await createAttempt({
    locale: options.locale,
    intake: options.intake,
    phase: directBeginner ? 'complete' : 'router',
  });

  if (!directBeginner) return { attempt, decision: null, persisted };

  // A true beginner is placed immediately, without being shown items in a
  // language they have told us they do not have.
  const decision = finaliseDirectBeginner();
  await updateAttempt(attempt.id, {
    status: 'submitted',
    phase: 'complete',
    decision,
    policyVersion: decision.policyVersion,
    releaseMode: decision.releaseMode,
    submitted: true,
  });

  const submitted: StoredAttempt = { ...attempt, status: 'submitted', decision };
  await notifyPlacementResult(submitted, decision);

  return { attempt: submitted, decision, persisted };
}

/**
 * Records one answer and reports what to show next.
 *
 * The option order is re-derived server-side rather than trusted from the
 * client, so a tampered or stale payload cannot claim a different order than
 * the one the item was rendered with.
 */
export async function recordResponse(
  attempt: StoredAttempt,
  itemId: string,
  value: PlacementResponseValue
): Promise<{ accepted: boolean; reason?: string }> {
  if (attempt.status !== 'in_progress') {
    return { accepted: false, reason: 'attempt_not_in_progress' };
  }

  const item = getItem(itemId);
  if (!item) return { accepted: false, reason: 'unknown_item' };
  if (item.skill === 'listening' && !LISTENING_AUDIO_AVAILABLE) {
    return { accepted: false, reason: 'item_not_deliverable' };
  }

  const existing = (await listResponses(attempt.id)).find(
    (response) => response.itemId === itemId
  );

  if (existing) {
    // A network retry may repeat the exact request after the server has already
    // advanced. Treat that as success. A changed answer is not a retry and is
    // rejected: revising router evidence after later items have been served
    // would invalidate the adaptive path.
    return JSON.stringify(existing.value) === JSON.stringify(value)
      ? { accepted: true }
      : { accepted: false, reason: 'item_already_answered' };
  }

  const progress = await computeProgress(attempt);
  if (progress.nextItem?.id !== itemId) {
    return { accepted: false, reason: 'item_not_current' };
  }

  await saveResponse(attempt.id, {
    itemId,
    value,
    optionOrder: optionOrderFor(attempt.id, item),
  });

  return { accepted: true };
}

/** Persists writing and marks the objective part done. */
export async function recordWriting(
  attempt: StoredAttempt,
  promptId: string,
  text: string
): Promise<boolean> {
  return saveWriting(attempt.id, { promptId, text });
}

/**
 * Closes the attempt and stores the decision.
 *
 * Re-finalising an already submitted attempt returns the stored decision
 * unchanged. Re-scoring on every result-page view would let a policy edit
 * silently change a placement a learner has already been told, and a teacher
 * has possibly already acted on.
 */
export async function submitAttempt(
  attempt: StoredAttempt,
  options: { productionIncomplete?: boolean; technicalProblem?: boolean } = {}
): Promise<PlacementDecision> {
  if (attempt.decision) return attempt.decision;

  const progress = await computeProgress(attempt);

  if (attempt.intake?.directBeginner) {
    const decision = finaliseDirectBeginner();
    await updateAttempt(attempt.id, {
      status: 'submitted',
      phase: 'complete',
      decision,
      policyVersion: decision.policyVersion,
      releaseMode: decision.releaseMode,
      submitted: true,
    });
    return decision;
  }

  if (!progress.router || !progress.level) {
    // Submitted before the objective part finished. Score what exists and send
    // it to review rather than refusing: a learner who ran out of time still
    // deserves a starting point, and the thin evidence is recorded as the
    // reason a human should look.
    const router = progress.router ?? routeFromRouter(progress.allScores);
    const level =
      progress.level ?? resolveLevelModule(router.targetLevel, progress.allScores);

    const decision = finalisePlacement({
      router,
      level,
      boundary: progress.boundary,
      allScores: progress.allScores,
      servedItemCount: progress.servedItemCount,
      productionIncomplete: true,
      technicalProblem: options.technicalProblem,
    });

    await updateAttempt(attempt.id, {
      status: 'submitted',
      phase: 'complete',
      routerTargetLevel: router.targetLevel,
      boundaryModuleId: level.boundaryProbe?.moduleId ?? null,
      decision,
      policyVersion: decision.policyVersion,
      releaseMode: decision.releaseMode,
      submitted: true,
    });

    await notifyPlacementResult(
      {
        ...attempt,
        status: 'submitted',
        routerTargetLevel: router.targetLevel,
        boundaryModuleId: level.boundaryProbe?.moduleId ?? null,
        decision,
      },
      decision
    );

    return decision;
  }

  const decision = finalisePlacement({
    router: progress.router,
    level: progress.level,
    boundary: progress.boundary,
    allScores: progress.allScores,
    servedItemCount: progress.servedItemCount,
    productionIncomplete: options.productionIncomplete,
    technicalProblem: options.technicalProblem,
  });

  await updateAttempt(attempt.id, {
    status: 'submitted',
    phase: 'complete',
    routerTargetLevel: progress.router.targetLevel,
    boundaryModuleId: progress.level.boundaryProbe?.moduleId ?? null,
    decision,
    policyVersion: decision.policyVersion,
    releaseMode: decision.releaseMode,
    submitted: true,
  });

  await notifyPlacementResult(
    {
      ...attempt,
      status: 'submitted',
      routerTargetLevel: progress.router.targetLevel,
      boundaryModuleId: progress.level.boundaryProbe?.moduleId ?? null,
      decision,
    },
    decision
  );

  return decision;
}

// ---------------------------------------------------------------------------
// client state
// ---------------------------------------------------------------------------

export function toClientItem(attemptId: string, item: PlacementItem): ClientItem {
  return sanitiseItem(item, {
    stimulus: item.stimulusId ? getStimulus(item.stimulusId) : null,
    optionOrder: optionOrderFor(attemptId, item),
    tokenOrder: tokenOrderFor(attemptId, item),
  });
}

export async function toClientState(progress: AttemptProgress): Promise<ClientAttemptState> {
  const { attempt } = progress;
  const responses = await listResponses(attempt.id);

  return {
    attemptId: attempt.id,
    token: attempt.token,
    status: attempt.status,
    phase: progress.phase,
    positionInPhase: progress.positionInPhase,
    itemsInPhase: progress.itemsInPhase,
    item: progress.nextItem ? toClientItem(attempt.id, progress.nextItem) : null,
    answeredItemIds: responses.map((response) => response.itemId),
    locale: attempt.locale,
  };
}

/** Loads an attempt by its resume token, or null. */
export async function loadAttempt(token: string): Promise<StoredAttempt | null> {
  return getAttemptByToken(token);
}

/** Restores the learner-facing state and reports where the attempt is stored. */
export async function resumeAttempt(
  token: string
): Promise<(ClientAttemptState & { persistent: boolean }) | null> {
  const record = await getAttemptByTokenWithPersistence(token);
  if (!record) return null;

  const progress = await computeProgress(record.attempt);
  return {
    ...(await toClientState(progress)),
    persistent: record.persisted,
  };
}
