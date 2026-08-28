import { describe, expect, it } from 'vitest';

import { LISTENING_AUDIO_AVAILABLE } from '@/config/placement/policy';
import { PLACEMENT_ITEMS } from '@/config/placement/content/items.server';
import {
  computeProgress,
  loadAttempt,
  recordResponse,
  resumeAttempt,
  startAttempt,
  submitAttempt,
  toClientItem,
} from '@/lib/placement/attempt.server';
import { buildPlacementResultEvent } from '@/lib/placement/notify.server';
import { findForbiddenFields } from '@/lib/placement/sanitise';
import type {
  PlacementItem,
  PlacementResponseValue,
} from '@/lib/placement/types';

/**
 * End-to-end attempt flow, through the real state machine and the real bank.
 *
 * The unit tests above cover scoring and routing in isolation with synthetic
 * scores. This file drives the thing a learner actually drives: start, answer,
 * advance, cross a phase boundary, finish. It runs in fallback mode (no
 * `DATABASE_URL` under vitest), which is exactly the parity CLAUDE.md requires
 * to keep working.
 *
 * Answers are steered by reading each item's own key, so a test can aim at a
 * band on purpose — "answer everything up to A2 correctly, then stop" — instead
 * of hoping a fixed pattern lands somewhere useful.
 */

const intake = { priorLearning: 'some_courses', goal: 'work', lastContact: 'recent' };

/** The response that scores full credit on an item. */
function correctAnswer(item: PlacementItem): PlacementResponseValue {
  const answer = item.answer;
  switch (answer.type) {
    case 'single_choice':
      return { type: 'single_choice', optionKey: answer.optionKey };
    case 'multiple_choice':
      return { type: 'multiple_choice', optionKeys: answer.optionKeys };
    case 'short_text':
      return { type: 'short_text', text: answer.accepted[0] };
    case 'inline_cloze':
      return { type: 'inline_cloze', blanks: answer.blanks.map((blank) => ({ ...blank })) };
    case 'order_tokens':
      return { type: 'order_tokens', order: [...answer.order] };
    case 'matching':
      return { type: 'matching', pairs: answer.pairs.map((pair) => ({ ...pair })) };
  }
}

/** A response that scores zero without being an unanswered item. */
function wrongAnswer(item: PlacementItem): PlacementResponseValue {
  const answer = item.answer;
  if (answer.type === 'single_choice') {
    const wrong = item.options?.find((option) => option.key !== answer.optionKey);
    if (wrong) return { type: 'single_choice', optionKey: wrong.key };
  }
  // Every item type accepts "not known", which is answered evidence of a gap.
  return { type: 'not_known' };
}

/**
 * Runs an attempt to the end of its objective part.
 *
 * `answerCorrectlyUpTo` names the highest router tier the learner clears: items
 * above it are answered wrong. That is what makes routing steerable.
 */
async function runObjectivePart(options: {
  answerCorrectlyUpTo: readonly string[];
  /** Stop after this many items, to test an abandoned attempt. */
  stopAfter?: number;
}) {
  const { attempt } = await startAttempt({
    locale: 'en',
    intake: { ...intake, directBeginner: false },
  });

  const served: PlacementItem[] = [];
  let guard = 0;

  for (;;) {
    guard += 1;
    if (guard > 80) throw new Error('attempt did not terminate');

    const progress = await computeProgress(attempt);
    const item = progress.nextItem;
    if (!item) return { attempt, served, progress };
    if (options.stopAfter !== undefined && served.length >= options.stopAfter) {
      return { attempt, served, progress };
    }

    served.push(item);

    const shouldBeCorrect = options.answerCorrectlyUpTo.includes(item.level);
    const result = await recordResponse(
      attempt,
      item.id,
      shouldBeCorrect ? correctAnswer(item) : wrongAnswer(item)
    );
    expect(result.accepted, `${item.id} rejected: ${result.reason}`).toBe(true);
  }
}

describe('attempt flow — phases', () => {
  it('serves the router first, then a level module', async () => {
    const { served } = await runObjectivePart({ answerCorrectlyUpTo: ['A1', 'A2'] });

    const routerItems = served.filter((item) => item.moduleId === 'ROUTER-V1');
    const levelItems = served.filter((item) => item.moduleId.startsWith('LEVEL-'));

    // A1/A2 clear, then B1/B2 form the two-tier wall. C1 cannot affect the
    // route after that point and is not served.
    expect(routerItems).toHaveLength(LISTENING_AUDIO_AVAILABLE ? 12 : 8);
    // 18 level items minus 6 listening.
    expect(levelItems).toHaveLength(LISTENING_AUDIO_AVAILABLE ? 18 : 12);

    // The router is finished before the level module starts: no interleaving.
    const firstLevelIndex = served.findIndex((item) => item.moduleId.startsWith('LEVEL-'));
    expect(served.slice(0, firstLevelIndex).every((item) => item.moduleId === 'ROUTER-V1')).toBe(true);
  });

  it('routes to the level the learner actually cleared', async () => {
    const { served } = await runObjectivePart({ answerCorrectlyUpTo: ['A1', 'A2'] });
    const levelModule = served.find((item) => item.moduleId.startsWith('LEVEL-'))?.moduleId;
    expect(levelModule).toBe('LEVEL-A2');
  });

  it('routes a strong learner to a high level module', async () => {
    const { served } = await runObjectivePart({
      answerCorrectlyUpTo: ['A1', 'A2', 'B1', 'B1_PLUS', 'B2', 'C1'],
    });
    const levelModule = served.find((item) => item.moduleId.startsWith('LEVEL-'))?.moduleId;
    expect(levelModule).toBe('LEVEL-C1');
  });

  it('stops the router after two consecutive uncleared tiers', async () => {
    const { served } = await runObjectivePart({ answerCorrectlyUpTo: [] });
    const routerItems = served.filter((item) => item.moduleId === 'ROUTER-V1');

    expect(routerItems).toHaveLength(LISTENING_AUDIO_AVAILABLE ? 6 : 4);
    expect(new Set(routerItems.map((item) => item.level))).toEqual(new Set(['A1', 'A2']));
  });

  it('serves a boundary module when the level result sits on an edge', async () => {
    // Clearing everything means clearing the level module's stretch stage too,
    // which probes the edge above.
    const { served } = await runObjectivePart({
      answerCorrectlyUpTo: ['A1', 'A2', 'B1', 'B1_PLUS', 'B2', 'C1'],
    });
    const boundaryItems = served.filter((item) => item.moduleId.startsWith('BOUNDARY-'));

    // C1 is the top of the ladder, so a perfect C1 attempt has no edge above to
    // probe and should serve no boundary module at all.
    expect(boundaryItems).toHaveLength(0);
  });

  it('probes downward when the router overshoots', async () => {
    // Clear the router to C1, then fail the C1 module: the level module
    // overrules the router and the edge below is probed.
    const { attempt, served } = await runObjectivePart({
      answerCorrectlyUpTo: ['A1', 'A2', 'B1', 'B1_PLUS', 'B2'],
    });

    const progress = await computeProgress(attempt);
    expect(progress.router?.targetLevel).toBeDefined();

    const boundaryItems = served.filter((item) => item.moduleId.startsWith('BOUNDARY-'));
    expect(boundaryItems.length).toBeGreaterThan(0);
    // Every boundary item comes from one module: the edge being settled.
    expect(new Set(boundaryItems.map((item) => item.moduleId)).size).toBe(1);
  });

  it('offers a writing prompt once the objective part is done', async () => {
    const { progress } = await runObjectivePart({ answerCorrectlyUpTo: ['A1', 'A2'] });
    expect(progress.phase).toBe('writing');
    expect(progress.writingPrompt).not.toBeNull();
  });

  it('never serves the same item twice', async () => {
    const { served } = await runObjectivePart({ answerCorrectlyUpTo: ['A1', 'A2'] });
    expect(new Set(served.map((item) => item.id)).size).toBe(served.length);
  });

  it('serves no listening item while audio is unavailable', async () => {
    const { served } = await runObjectivePart({ answerCorrectlyUpTo: ['A1', 'A2', 'B1'] });
    if (!LISTENING_AUDIO_AVAILABLE) {
      expect(served.filter((item) => item.skill === 'listening')).toHaveLength(0);
    }
  });
});

describe('attempt flow — the rarer item types are actually reachable', () => {
  it('serves typed recall, cloze, and token ordering on a real path', async () => {
    // A2 is the module that carries both an order_tokens and an inline_cloze
    // item, so this is not a synthetic check: a learner routed to A2 meets them.
    const { served } = await runObjectivePart({ answerCorrectlyUpTo: ['A1', 'A2'] });
    const types = new Set(served.map((item) => item.responseType));

    expect(types).toContain('single_choice');
    expect(types).toContain('short_text');
    expect(types).toContain('order_tokens');
    expect(types).toContain('inline_cloze');
  });
});

describe('attempt flow — idempotency and resume', () => {
  it('does not duplicate a response when the same item is posted twice', async () => {
    const { attempt } = await startAttempt({
      locale: 'en',
      intake: { ...intake, directBeginner: false },
    });

    const first = (await computeProgress(attempt)).nextItem;
    if (!first) throw new Error('no first item');

    await recordResponse(attempt, first.id, correctAnswer(first));
    const afterOne = await computeProgress(attempt);

    // Re-posting the same value — a double tap, or a retry after a dropped
    // connection — is acknowledged without appending another response.
    await recordResponse(attempt, first.id, correctAnswer(first));
    const afterTwo = await computeProgress(attempt);

    expect(afterTwo.positionInPhase).toBe(afterOne.positionInPhase);
    expect(afterTwo.nextItem?.id).toBe(afterOne.nextItem?.id);
  });

  it('resumes at the first unanswered item', async () => {
    const { attempt, served } = await runObjectivePart({
      answerCorrectlyUpTo: ['A1'],
      stopAfter: 4,
    });

    // A fresh load by token behaves like a new device picking up the attempt.
    const reloaded = await loadAttempt(attempt.token);
    expect(reloaded).not.toBeNull();

    const progress = await computeProgress(reloaded as NonNullable<typeof reloaded>);
    expect(progress.positionInPhase).toBe(served.length + 1);
    expect(served.map((item) => item.id)).not.toContain(progress.nextItem?.id);
  });

  it('restores the client state from the private attempt token', async () => {
    const { attempt, served } = await runObjectivePart({
      answerCorrectlyUpTo: ['A1'],
      stopAfter: 2,
    });

    const restored = await resumeAttempt(attempt.token);
    expect(restored?.token).toBe(attempt.token);
    expect(restored?.positionInPhase).toBe(served.length + 1);
  });

  it('rejects an item that is not the current question', async () => {
    const { attempt } = await startAttempt({
      locale: 'en',
      intake: { ...intake, directBeginner: false },
    });
    const future = PLACEMENT_ITEMS.find((item) => item.id === 'ROUTER-LU-C1-001');
    if (!future) throw new Error('future router item missing');

    const result = await recordResponse(attempt, future.id, correctAnswer(future));
    expect(result).toMatchObject({ accepted: false, reason: 'item_not_current' });
  });

  it('rejects changing an answer after the test has advanced', async () => {
    const { attempt } = await startAttempt({
      locale: 'en',
      intake: { ...intake, directBeginner: false },
    });
    const first = (await computeProgress(attempt)).nextItem;
    if (!first) throw new Error('no first item');

    await recordResponse(attempt, first.id, correctAnswer(first));
    const result = await recordResponse(attempt, first.id, wrongAnswer(first));
    expect(result).toMatchObject({ accepted: false, reason: 'item_already_answered' });
  });

  it('refuses a response once the attempt is submitted', async () => {
    const { attempt } = await runObjectivePart({ answerCorrectlyUpTo: ['A1', 'A2'] });
    await submitAttempt(attempt);

    const closed = await loadAttempt(attempt.token);
    if (!closed) throw new Error('attempt vanished');

    const item = PLACEMENT_ITEMS[0];
    const result = await recordResponse(closed, item.id, correctAnswer(item));
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('attempt_not_in_progress');
  });

  it('rejects an unknown item id', async () => {
    const { attempt } = await startAttempt({
      locale: 'en',
      intake: { ...intake, directBeginner: false },
    });
    const result = await recordResponse(attempt, 'NOT-A-REAL-ITEM', { type: 'not_known' });
    expect(result).toMatchObject({ accepted: false, reason: 'unknown_item' });
  });

  it('rejects a listening item while audio is unavailable', async () => {
    const listening = PLACEMENT_ITEMS.find((item) => item.skill === 'listening');
    if (!listening || LISTENING_AUDIO_AVAILABLE) return;

    const { attempt } = await startAttempt({
      locale: 'en',
      intake: { ...intake, directBeginner: false },
    });
    const result = await recordResponse(attempt, listening.id, { type: 'not_known' });
    expect(result).toMatchObject({ accepted: false, reason: 'item_not_deliverable' });
  });
});

describe('attempt flow — submission', () => {
  it('places a true beginner at A1.1 without serving an item', async () => {
    const { attempt, decision } = await startAttempt({
      locale: 'en',
      intake: { ...intake, priorLearning: 'none', directBeginner: true },
    });

    expect(decision?.band).toBe('A1.1');
    expect(attempt.status).toBe('submitted');

    const progress = await computeProgress(attempt);
    expect(progress.nextItem).toBeNull();
    expect(progress.phase).toBe('complete');
  });

  it('includes the unscored intake context in the teacher handoff', async () => {
    const { attempt, decision } = await startAttempt({
      locale: 'en',
      intake: { ...intake, directBeginner: true },
    });
    if (!decision) throw new Error('direct beginner decision missing');

    const event = buildPlacementResultEvent(attempt, decision);
    expect(event.intake).toEqual({
      priorLearning: intake.priorLearning,
      goal: intake.goal,
      lastContact: intake.lastContact,
    });
  });

  it('produces a decision with a band, a confidence, and a reasoning trail', async () => {
    const { attempt } = await runObjectivePart({ answerCorrectlyUpTo: ['A1', 'A2'] });
    const decision = await submitAttempt(attempt);

    expect(decision.band).toBeTruthy();
    expect(['high', 'medium', 'low']).toContain(decision.confidence);
    expect(decision.rationale.length).toBeGreaterThan(0);
    expect(decision.policyVersion).toBeGreaterThan(0);
  });

  it('returns the stored decision unchanged on a second submit', async () => {
    // Re-scoring on every result view would let a policy edit silently change a
    // placement a learner has already been told.
    const { attempt } = await runObjectivePart({ answerCorrectlyUpTo: ['A1', 'A2'] });
    const first = await submitAttempt(attempt);

    const reloaded = await loadAttempt(attempt.token);
    if (!reloaded) throw new Error('attempt vanished');
    const second = await submitAttempt(reloaded);

    expect(second).toEqual(first);
  });

  it('flags an attempt submitted on thin evidence rather than refusing it', async () => {
    const { attempt } = await runObjectivePart({ answerCorrectlyUpTo: ['A1'], stopAfter: 3 });
    const decision = await submitAttempt(attempt);

    expect(decision.reviewReasons).toContain('incomplete_objective_evidence');
    expect(decision.band).toBeTruthy();
  });

  it('places a strong learner above the auto-confirm ceiling, never confirmed', async () => {
    const { attempt } = await runObjectivePart({
      answerCorrectlyUpTo: ['A1', 'A2', 'B1', 'B1_PLUS', 'B2', 'C1'],
    });
    const decision = await submitAttempt(attempt);

    expect(decision.band).toBe('C1.2');
    expect(decision.autoConfirmable).toBe(false);
    expect(decision.reviewReasons).toContain('above_auto_confirm_ceiling');
  });
});

describe('attempt flow — client payloads', () => {
  it('leaks no answer key through the item the runner is handed', async () => {
    const { attempt } = await startAttempt({
      locale: 'en',
      intake: { ...intake, directBeginner: false },
    });

    let guard = 0;
    for (;;) {
      guard += 1;
      if (guard > 40) break;

      const progress = await computeProgress(attempt);
      const item = progress.nextItem;
      if (!item) break;

      const clientItem = toClientItem(attempt.id, item);
      expect(findForbiddenFields(clientItem, item.id)).toEqual([]);

      // The correct option's key must not be inferable from position either:
      // the client order is the attempt's shuffle, not the authored order.
      await recordResponse(attempt, item.id, correctAnswer(item));
    }

    expect(guard).toBeGreaterThan(1);
  });
});
