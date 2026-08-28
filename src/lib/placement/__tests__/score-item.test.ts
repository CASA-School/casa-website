import { describe, expect, it } from 'vitest';

import {
  answeredShare,
  meanCredit,
  normaliseTypedAnswer,
  scoreItem,
} from '@/lib/placement/score-item';
import type { PlacementItem } from '@/lib/placement/types';

/**
 * Scoring is the one part of the placement engine where a quiet mistake is
 * invisible: a learner marked wrong on a right answer just gets seated a level
 * low, and nothing in the system complains. So every response type is pinned
 * here with concrete arithmetic, including the partial-credit rules.
 */

const baseItem = {
  moduleId: 'LEVEL-A1',
  level: 'A1',
  band: 'A1.1',
  stage: 'foundation',
  skill: 'language_use',
  construct: 'test construct',
  stimulusId: null,
  prompt: 'Ich ___ in Bremen.',
  options: null,
  blanks: null,
  tokens: null,
  matching: null,
  inputConstraints: null,
  tags: [],
} satisfies Omit<PlacementItem, 'id' | 'responseType' | 'answer'>;

const singleChoice: PlacementItem = {
  ...baseItem,
  id: 'SC-1',
  responseType: 'single_choice',
  options: [
    { key: 'a', text: 'wohnen' },
    { key: 'b', text: 'wohne' },
  ],
  answer: { type: 'single_choice', optionKey: 'b' },
};

const multipleChoice: PlacementItem = {
  ...baseItem,
  id: 'MC-1',
  responseType: 'multiple_choice',
  options: [
    { key: 'a', text: 'right' },
    { key: 'b', text: 'wrong' },
    { key: 'c', text: 'right' },
    { key: 'd', text: 'wrong' },
  ],
  answer: { type: 'multiple_choice', optionKeys: ['a', 'c'] },
};

const shortText: PlacementItem = {
  ...baseItem,
  id: 'ST-1',
  responseType: 'short_text',
  inputConstraints: { maxLength: 40, inputMode: 'text', spellcheck: false, allowNotKnown: true },
  answer: { type: 'short_text', accepted: ['lernen'] },
};

const cloze: PlacementItem = {
  ...baseItem,
  id: 'CZ-1',
  responseType: 'inline_cloze',
  blanks: [
    { id: 'b1', options: [{ key: 'a', text: 'fährt' }, { key: 'b', text: 'fahrt' }] },
    { id: 'b2', options: [{ key: 'a', text: 'an' }, { key: 'b', text: 'ab' }] },
  ],
  answer: { type: 'inline_cloze', blanks: [{ blankId: 'b1', optionKey: 'a' }, { blankId: 'b2', optionKey: 'b' }] },
};

const order: PlacementItem = {
  ...baseItem,
  id: 'OT-1',
  responseType: 'order_tokens',
  tokens: [
    { id: 't1', text: 'Wenn das Wetter gut ist' },
    { id: 't2', text: 'gehe ich' },
    { id: 't3', text: 'am Sonntag' },
    { id: 't4', text: 'spazieren' },
  ],
  answer: { type: 'order_tokens', order: ['t1', 't2', 't3', 't4'] },
};

const matching: PlacementItem = {
  ...baseItem,
  id: 'MT-1',
  responseType: 'matching',
  matching: {
    left: [{ id: 'l1', text: 'Tarek' }, { id: 'l2', text: 'Miriam' }],
    right: [{ id: 'r1', text: 'Angebote' }, { id: 'r2', text: 'Kosten' }],
  },
  answer: { type: 'matching', pairs: [{ leftId: 'l1', rightId: 'r1' }, { leftId: 'l2', rightId: 'r2' }] },
};

describe('normaliseTypedAnswer', () => {
  it('forgives case, padding, and trailing punctuation', () => {
    expect(normaliseTypedAnswer('  Lernen.  ')).toBe('lernen');
  });

  it('maps umlauts the way a keyboard substitution does', () => {
    // faehrt -> fährt is a real typing workaround and must match.
    expect(normaliseTypedAnswer('faehrt')).toBe(normaliseTypedAnswer('fährt'));
    expect(normaliseTypedAnswer('Grüße')).toBe('gruesse');
  });

  it('does not collapse an umlaut to its bare vowel', () => {
    // "fahrt" is a different verb form, not a typo for "fährt". Accepting it
    // would silently mark a grammatical error correct.
    expect(normaliseTypedAnswer('fahrt')).not.toBe(normaliseTypedAnswer('fährt'));
  });
});

describe('scoreItem — single choice', () => {
  it('credits the keyed option', () => {
    const score = scoreItem(singleChoice, { type: 'single_choice', optionKey: 'b' });
    expect(score).toMatchObject({ credit: 1, correct: true, answered: true });
  });

  it('gives no credit for another option', () => {
    const score = scoreItem(singleChoice, { type: 'single_choice', optionKey: 'a' });
    expect(score).toMatchObject({ credit: 0, correct: false, answered: true });
  });
});

describe('scoreItem — multiple choice', () => {
  it('credits both correct picks', () => {
    const score = scoreItem(multipleChoice, { type: 'multiple_choice', optionKeys: ['a', 'c'] });
    expect(score.credit).toBe(1);
    expect(score.correct).toBe(true);
  });

  it('halves credit for one of two correct picks', () => {
    const score = scoreItem(multipleChoice, { type: 'multiple_choice', optionKeys: ['a'] });
    expect(score.credit).toBe(0.5);
    expect(score.correct).toBe(false);
  });

  it('cancels a right pick with a wrong one', () => {
    const score = scoreItem(multipleChoice, { type: 'multiple_choice', optionKeys: ['a', 'b'] });
    expect(score.credit).toBe(0);
  });

  it('gives nothing for selecting everything', () => {
    // Otherwise "tick all four" is a guaranteed full mark.
    const score = scoreItem(multipleChoice, {
      type: 'multiple_choice',
      optionKeys: ['a', 'b', 'c', 'd'],
    });
    expect(score.credit).toBe(0);
  });
});

describe('scoreItem — typed recall', () => {
  it('accepts a normalised match', () => {
    expect(scoreItem(shortText, { type: 'short_text', text: ' Lernen ' }).correct).toBe(true);
  });

  it('rejects a different word', () => {
    expect(scoreItem(shortText, { type: 'short_text', text: 'sprechen' }).correct).toBe(false);
  });

  it('treats an empty string as unanswered rather than wrong', () => {
    const score = scoreItem(shortText, { type: 'short_text', text: '   ' });
    expect(score.answered).toBe(false);
  });

  it('treats an explicit "not known" as answered evidence of a gap', () => {
    // An honest learner must not look like an incomplete attempt.
    const score = scoreItem(shortText, { type: 'not_known' });
    expect(score).toMatchObject({ credit: 0, correct: false, answered: true });
  });
});

describe('scoreItem — inline cloze', () => {
  it('credits only the whole correct pair', () => {
    const score = scoreItem(cloze, {
      type: 'inline_cloze',
      blanks: [{ blankId: 'b1', optionKey: 'a' }, { blankId: 'b2', optionKey: 'b' }],
    });
    expect(score.credit).toBe(1);
  });

  it('gives nothing for a half-right pair', () => {
    // CONTENT_AUDIT_LOG.md: per-blank scoring let learners assemble unnatural
    // combinations, and the affected items were rewritten as whole-pair choices.
    const score = scoreItem(cloze, {
      type: 'inline_cloze',
      blanks: [{ blankId: 'b1', optionKey: 'a' }, { blankId: 'b2', optionKey: 'a' }],
    });
    expect(score.credit).toBe(0);
  });
});

describe('scoreItem — token order', () => {
  it('credits the exact sentence in full', () => {
    const score = scoreItem(order, { type: 'order_tokens', order: ['t1', 't2', 't3', 't4'] });
    expect(score).toMatchObject({ credit: 1, correct: true });
  });

  it('gives partial credit when only an adjunct is misplaced', () => {
    // The inversion (t1 then t2) is the construct; swapping the last two chunks
    // is a weaker error than random order and should read differently.
    const score = scoreItem(order, { type: 'order_tokens', order: ['t1', 't2', 't4', 't3'] });
    expect(score.credit).toBeGreaterThan(0);
    expect(score.correct).toBe(false);
  });

  it('never lets partial credit reach a correct answer', () => {
    const partial = scoreItem(order, { type: 'order_tokens', order: ['t1', 't2', 't4', 't3'] });
    expect(partial.credit).toBeLessThanOrEqual(0.5);
  });

  it('gives nothing for a fully reversed sentence', () => {
    const score = scoreItem(order, { type: 'order_tokens', order: ['t4', 't3', 't2', 't1'] });
    expect(score.credit).toBe(0);
  });
});

describe('scoreItem — matching', () => {
  it('credits a complete correct match', () => {
    const score = scoreItem(matching, {
      type: 'matching',
      pairs: [{ leftId: 'l1', rightId: 'r1' }, { leftId: 'l2', rightId: 'r2' }],
    });
    expect(score.credit).toBe(1);
  });

  it('credits nothing for a swapped pair', () => {
    const score = scoreItem(matching, {
      type: 'matching',
      pairs: [{ leftId: 'l1', rightId: 'r2' }, { leftId: 'l2', rightId: 'r1' }],
    });
    expect(score.credit).toBe(0);
  });
});

describe('scoreItem — robustness', () => {
  it('scores zero when the response shape does not match the item', () => {
    // A stale client should cost one item, not the whole attempt.
    const score = scoreItem(singleChoice, { type: 'short_text', text: 'wohne' });
    expect(score).toMatchObject({ credit: 0, correct: false });
  });

  it('treats a missing response as unanswered', () => {
    expect(scoreItem(singleChoice, null).answered).toBe(false);
    expect(scoreItem(singleChoice, { type: 'skipped' }).answered).toBe(false);
  });
});

describe('aggregates', () => {
  it('returns zero rather than NaN for an empty set', () => {
    expect(meanCredit([])).toBe(0);
  });

  it('reports the answered share', () => {
    const scores = [
      scoreItem(singleChoice, { type: 'single_choice', optionKey: 'b' }),
      scoreItem(singleChoice, null),
    ];
    expect(answeredShare(scores)).toBe(0.5);
  });
});
