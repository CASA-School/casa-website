/**
 * Per-item scoring. Pure: an item, a response, a number in [0, 1].
 *
 * Compound items (cloze pairs, token order, matching, multi-select) can be
 * partly right, and throwing that away would discard the most diagnostic
 * evidence a short test produces. So `credit` is fractional while `correct`
 * stays strictly boolean — the thresholds in policy.ts read credit, and a
 * partially right answer must never register as a right one.
 */

import type {
  PlacementItem,
  PlacementItemScore,
  PlacementResponseValue,
} from './types';

/**
 * Normalises typed recall before comparison.
 *
 * Forgives what a keyboard causes and nothing that grammar carries:
 * case, surrounding whitespace, and trailing sentence punctuation go; the
 * umlaut/eszett transliterations go the way a German keyboard substitution
 * actually works (ä -> ae), so `faehrt` matches `fährt` while `fahrt` — a
 * different word form — still does not.
 */
export function normaliseTypedAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?]+$/u, '')
    .replace(/\s+/gu, ' ')
    .replace(/ä/gu, 'ae')
    .replace(/ö/gu, 'oe')
    .replace(/ü/gu, 'ue')
    .replace(/ß/gu, 'ss');
}

/**
 * Share of adjacent pairs the learner ordered correctly.
 *
 * Used only as partial credit for `order_tokens`. A learner who puts the
 * inverted verb in the right place but misplaces a time adjunct has shown the
 * thing the item tests; random order has not. Capped below 1 by the caller so
 * an imperfect sentence can never score as a correct one.
 */
function adjacentPairAgreement(actual: readonly string[], expected: readonly string[]): number {
  if (expected.length < 2) return 0;

  const positionOf = new Map(actual.map((id, index) => [id, index]));
  let inOrder = 0;

  for (let index = 0; index < expected.length - 1; index += 1) {
    const first = positionOf.get(expected[index]);
    const second = positionOf.get(expected[index + 1]);
    if (first !== undefined && second !== undefined && first < second) inOrder += 1;
  }

  return inOrder / (expected.length - 1);
}

/** Partial credit for token order can never reach a correct answer's credit. */
const ORDER_PARTIAL_CEILING = 0.5;

/**
 * Scores one response against one item.
 *
 * A response whose `type` does not match the item's `responseType` scores zero
 * rather than throwing: a stale client that posts the wrong shape should cost
 * the learner one item, not the whole attempt.
 */
export function scoreItem(item: PlacementItem, value: PlacementResponseValue | null): PlacementItemScore {
  const base = {
    itemId: item.id,
    skill: item.skill,
    stage: item.stage,
    band: item.band,
    level: item.level,
  };

  if (value === null || value.type === 'skipped') {
    return { ...base, credit: 0, correct: false, answered: false };
  }

  // "I don't know" is an answer — it is answered evidence of a gap, not a
  // missing observation. Counting it as unanswered would make an honest learner
  // look like an incomplete attempt and push them into review for no reason.
  if (value.type === 'not_known') {
    return { ...base, credit: 0, correct: false, answered: true };
  }

  const answer = item.answer;
  const answered = true;

  if (value.type !== answer.type) {
    return { ...base, credit: 0, correct: false, answered };
  }

  switch (answer.type) {
    case 'single_choice': {
      const correct = value.type === 'single_choice' && value.optionKey === answer.optionKey;
      return { ...base, credit: correct ? 1 : 0, correct, answered };
    }

    case 'multiple_choice': {
      if (value.type !== 'multiple_choice') break;

      // Net scoring: a wrong pick cancels a right one, so selecting everything
      // scores zero rather than guaranteeing full marks.
      const expected = new Set(answer.optionKeys);
      const selected = new Set(value.optionKeys);
      let hits = 0;
      let misses = 0;
      for (const key of selected) {
        if (expected.has(key)) hits += 1;
        else misses += 1;
      }

      const credit = Math.max(0, (hits - misses) / expected.size);
      return { ...base, credit, correct: credit === 1, answered };
    }

    case 'short_text': {
      if (value.type !== 'short_text') break;
      const submitted = normaliseTypedAnswer(value.text);
      if (submitted.length === 0) {
        return { ...base, credit: 0, correct: false, answered: false };
      }
      const correct = answer.accepted.some(
        (accepted) => normaliseTypedAnswer(accepted) === submitted
      );
      return { ...base, credit: correct ? 1 : 0, correct, answered };
    }

    case 'inline_cloze': {
      if (value.type !== 'inline_cloze') break;

      // Whole-pair, not per-blank. CONTENT_AUDIT_LOG.md records that
      // independently scored blanks let learners assemble unnatural or
      // debatable combinations, and that the affected items were rewritten as
      // single whole-pair choices. Scoring the survivors per blank would
      // reintroduce exactly the defect that pass removed.
      const submitted = new Map(value.blanks.map((blank) => [blank.blankId, blank.optionKey]));
      const correct =
        submitted.size === answer.blanks.length &&
        answer.blanks.every((blank) => submitted.get(blank.blankId) === blank.optionKey);

      return { ...base, credit: correct ? 1 : 0, correct, answered };
    }

    case 'order_tokens': {
      if (value.type !== 'order_tokens') break;

      const exact =
        value.order.length === answer.order.length &&
        value.order.every((id, index) => id === answer.order[index]);

      if (exact) return { ...base, credit: 1, correct: true, answered };

      const partial = Math.min(
        ORDER_PARTIAL_CEILING,
        adjacentPairAgreement(value.order, answer.order)
      );
      return { ...base, credit: partial, correct: false, answered };
    }

    case 'matching': {
      if (value.type !== 'matching') break;

      const expected = new Map(answer.pairs.map((pair) => [pair.leftId, pair.rightId]));
      let hits = 0;
      for (const pair of value.pairs) {
        if (expected.get(pair.leftId) === pair.rightId) hits += 1;
      }

      const credit = expected.size === 0 ? 0 : hits / expected.size;
      return { ...base, credit, correct: credit === 1, answered };
    }
  }

  return { ...base, credit: 0, correct: false, answered };
}

/** Mean credit across a set of scores. Empty set is 0, not NaN. */
export function meanCredit(scores: readonly PlacementItemScore[]): number {
  if (scores.length === 0) return 0;
  const total = scores.reduce((sum, score) => sum + score.credit, 0);
  return total / scores.length;
}

/** Share of a set that the learner actually engaged with. */
export function answeredShare(scores: readonly PlacementItemScore[]): number {
  if (scores.length === 0) return 1;
  return scores.filter((score) => score.answered).length / scores.length;
}
