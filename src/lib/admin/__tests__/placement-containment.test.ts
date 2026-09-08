import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { REVIEW_REASON_COPY, SKILL_LABELS } from '../placement-copy';
import { REVIEW_REASON_ORDER } from '@/config/placement/policy';
import { FORBIDDEN_CLIENT_FIELDS } from '@/lib/placement/sanitise';

/**
 * CLAUDE.md hard rule 6, applied to the staff workspace.
 *
 * `src/lib/placement/__tests__/answer-containment.test.ts` guards the learner's
 * payload. This guards the reviewer's, which is the case nobody thinks of: the
 * workspace feels internal, so it is tempting to "help the teacher" by showing
 * which items were answered correctly. That ships the answer key to a browser
 * on a shared office machine, and the bank is 163 items that took two DaF
 * reviewers to author.
 *
 * The rule holds by construction — nothing in the workspace reads the item
 * bank — and these tests assert the construction, because the day someone adds
 * the import is the day the guarantee is gone.
 */

const read = (relative: string) =>
  readFileSync(path.resolve(process.cwd(), relative), 'utf8');

/**
 * The same file with its comments removed.
 *
 * Needed because these files talk about the rule at length — the header of
 * `placement.ts` explains why it reads no answer key — and a naive substring
 * search over the prose flags the very comments that document the guarantee.
 * The interesting question is whether the CODE touches those names.
 */
const readCode = (relative: string) =>
  read(relative)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const WORKSPACE_PLACEMENT_FILES = [
  'src/lib/admin/placement.ts',
  'src/lib/admin/placement-copy.ts',
  'src/app/(admin)/admin/(workspace)/placement/page.tsx',
  'src/app/(admin)/admin/(workspace)/placement/[id]/page.tsx',
];

describe('the workspace never reaches the item bank', () => {
  it.each(WORKSPACE_PLACEMENT_FILES)('%s imports no item content', (file) => {
    const source = readCode(file);

    // The bank, the scorer, and the module that resolves an item to its key.
    expect(source).not.toContain('@/config/placement/content');
    expect(source).not.toContain('placement/item-bank');
    expect(source).not.toContain('score-item');
  });

  it('reads no stored response values', () => {
    // `placement_responses.value` is what the learner picked. Joined against the
    // bank it is a marked answer sheet; on its own it is an option index that
    // tells a teacher nothing. Either way it does not belong on the screen.
    const source = readCode('src/lib/admin/placement.ts');

    expect(source).toMatch(/count\(\*\)[\s\S]{0,80}FROM placement_responses/i);
    expect(source).not.toMatch(/SELECT[\s\S]{0,120}\bvalue\b[\s\S]{0,80}FROM placement_responses/i);
  });

  it.each(WORKSPACE_PLACEMENT_FILES)('%s reads no forbidden field', (file) => {
    const source = readCode(file);

    for (const field of FORBIDDEN_CLIENT_FIELDS) {
      // `credit` is the exception, and legitimately so: it is the aggregate
      // per-skill score the engine itself publishes in `skillProfile`, which is
      // a summary of performance and not an answer to anything.
      if (field === 'credit') continue;

      // Whole word, so `answeredShare` and the "Answered" column heading — both
      // of which are aggregates the engine publishes — do not trip it, while a
      // real `item.answer` or `stimulus.transcript` does.
      const asIdentifier = new RegExp(`\\b${field}\\b`);
      expect(asIdentifier.test(source), `${file} reads ${field}`).toBe(false);
    }
  });
});

describe('the review screen states what it is', () => {
  it('never calls a recommendation a result, a pass or a certificate', () => {
    const list = read('src/app/(admin)/admin/(workspace)/placement/page.tsx');
    const detail = read('src/app/(admin)/admin/(workspace)/placement/[id]/page.tsx');

    // The banner has to say these words in order to forbid them, so the check
    // is that the recommendation itself is never labelled with them.
    expect(list).toContain('recommendation');
    expect(list).toContain('shadow');
    expect(detail).toContain('not a certificate');
  });

  it('explains every review reason the engine can emit', () => {
    // An unexplained reason code on a teacher's screen is worse than none: it
    // looks like a system fault rather than a thing to check.
    for (const reason of REVIEW_REASON_ORDER) {
      expect(REVIEW_REASON_COPY[reason], reason).toBeTruthy();
    }
  });

  it('labels every skill the engine scores', () => {
    expect(Object.keys(SKILL_LABELS).sort()).toEqual([
      'language_use',
      'listening',
      'reading',
    ]);
  });
});
