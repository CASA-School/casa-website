import { describe, expect, it } from 'vitest';

import { BANDS_BY_LEVEL, BOUNDARY_MODULE_BY_EDGE, LISTENING_AUDIO_AVAILABLE, levelOfBand } from '@/config/placement/policy';
import { PLACEMENT_ITEMS } from '@/config/placement/content/items.server';
import { PLACEMENT_MODULES } from '@/config/placement/content/modules.server';
import { PLACEMENT_STIMULI } from '@/config/placement/content/stimuli.server';
import {
  PLACEMENT_SPEAKING_PROMPTS,
  PLACEMENT_WRITING_PROMPTS,
  PLACEMENT_WRITING_RUBRIC,
  PLACEMENT_SPEAKING_RUBRIC,
} from '@/config/placement/content/production.server';
import {
  ROUTER_MODULE_ID,
  composeModuleItems,
  levelModuleId,
  optionOrderFor,
  tokenOrderFor,
  writingPromptFor,
} from '@/lib/placement/content.server';
import { scoreItem } from '@/lib/placement/score-item';

/**
 * Integrity of the ported bank.
 *
 * The port script already asserts the upstream checksums, but it runs by hand.
 * These assertions run in CI, so a hand-edit to a generated file, a bad re-port,
 * or a policy change that orphans a module fails the build instead of shipping
 * a test that cannot be completed.
 */

/** Upstream VERIFICATION_REPORT.md totals. */
const UPSTREAM = {
  items: 163,
  modules: 12,
  readingStimuli: 33,
  listeningStimuli: 33,
  writingPrompts: 18,
  speakingPrompts: 12,
};

describe('ported bank matches the upstream package', () => {
  it('has the declared totals', () => {
    expect(PLACEMENT_ITEMS).toHaveLength(UPSTREAM.items);
    expect(PLACEMENT_MODULES).toHaveLength(UPSTREAM.modules);
    expect(PLACEMENT_WRITING_PROMPTS).toHaveLength(UPSTREAM.writingPrompts);
    expect(PLACEMENT_SPEAKING_PROMPTS).toHaveLength(UPSTREAM.speakingPrompts);
    expect(PLACEMENT_STIMULI.filter((s) => s.kind === 'reading')).toHaveLength(UPSTREAM.readingStimuli);
    expect(PLACEMENT_STIMULI.filter((s) => s.kind === 'listening')).toHaveLength(UPSTREAM.listeningStimuli);
  });

  it('has the declared module composition', () => {
    const sizes = (kind: string) =>
      PLACEMENT_MODULES.filter((entry) => entry.kind === kind).map((entry) => entry.itemIds.length);

    expect(sizes('router')).toEqual([15]);
    expect(sizes('level')).toEqual([18, 18, 18, 18, 18, 18]);
    expect(sizes('boundary')).toEqual([8, 8, 8, 8, 8]);
  });

  it('keeps the non-multiple-choice response types the audit pass added', () => {
    // CONTENT_AUDIT_LOG.md: typed recall was added deliberately so the pilot
    // does not rely only on recognition. Losing it in a re-port would silently
    // narrow the construct.
    const byType = PLACEMENT_ITEMS.reduce<Record<string, number>>((accumulator, item) => {
      accumulator[item.responseType] = (accumulator[item.responseType] ?? 0) + 1;
      return accumulator;
    }, {});

    expect(byType).toEqual({
      single_choice: 147,
      short_text: 6,
      inline_cloze: 4,
      order_tokens: 3,
      multiple_choice: 2,
      matching: 1,
    });
  });
});

describe('internal consistency', () => {
  it('gives every item a unique id', () => {
    const ids = new Set(PLACEMENT_ITEMS.map((item) => item.id));
    expect(ids.size).toBe(PLACEMENT_ITEMS.length);
  });

  it('resolves every module item id to a real item', () => {
    const byId = new Map(PLACEMENT_ITEMS.map((item) => [item.id, item]));
    const missing = PLACEMENT_MODULES.flatMap((entry) =>
      entry.itemIds.filter((itemId) => !byId.has(itemId))
    );
    expect(missing).toEqual([]);
  });

  it('assigns every item to the module that owns it', () => {
    const owners = new Map<string, string>();
    for (const entry of PLACEMENT_MODULES) {
      for (const itemId of entry.itemIds) owners.set(itemId, entry.id);
    }
    const mismatched = PLACEMENT_ITEMS.filter((item) => owners.get(item.id) !== item.moduleId);
    expect(mismatched.map((item) => item.id)).toEqual([]);
  });

  it('resolves every stimulus reference', () => {
    const byId = new Set(PLACEMENT_STIMULI.map((stimulus) => stimulus.id));
    const dangling = PLACEMENT_ITEMS.filter(
      (item) => item.stimulusId !== null && !byId.has(item.stimulusId)
    );
    expect(dangling.map((item) => item.id)).toEqual([]);
  });

  it('uses every stimulus at least once', () => {
    const referenced = new Set(PLACEMENT_ITEMS.map((item) => item.stimulusId).filter(Boolean));
    const orphans = PLACEMENT_STIMULI.filter((stimulus) => !referenced.has(stimulus.id));
    expect(orphans.map((stimulus) => stimulus.id)).toEqual([]);
  });

  /**
   * `band` is the band an item provides *evidence about*; `level` is the module
   * family it lives in. Those coincide everywhere except one deliberate case.
   *
   * The B1+ bridge module's `foundation` stage is banded B1.2, not B1+, because
   * it asks "have you actually finished B1.2?" before the `stretch` items test
   * B1+ itself. CONTENT_AUDIT_LOG.md records this as a correction: "B1+
   * foundation metadata so it correctly represents B1.2 exit evidence".
   *
   * Asserted as an exact exception rather than skipped, so the exception cannot
   * quietly spread to other modules in a re-port.
   */
  it('bands every item within its own level, except the B1+ bridge foundation', () => {
    const exceptions = PLACEMENT_ITEMS.filter(
      (item) => !BANDS_BY_LEVEL[item.level].includes(item.band)
    );

    expect(exceptions.map((item) => item.id).sort()).toEqual(
      [
        'B1P-LS-FOUND-001',
        'B1P-LS-FOUND-002',
        'B1P-LS-FOUND-003',
        'B1P-LU-FOUND-001',
        'B1P-LU-FOUND-002',
        'B1P-LU-FOUND-003',
        'B1P-RD-FOUND-001',
        'B1P-RD-FOUND-002',
        'B1P-RD-FOUND-003',
      ].sort()
    );

    // Every exception is the same shape: B1+ module, foundation stage, B1.2 band.
    for (const item of exceptions) {
      expect(item.level).toBe('B1_PLUS');
      expect(item.stage).toBe('foundation');
      expect(item.band).toBe('B1.2');
    }

    // And the B1+ stretch stage does target B1+ itself.
    const stretch = PLACEMENT_ITEMS.filter(
      (item) => item.level === 'B1_PLUS' && item.stage === 'stretch'
    );
    expect(stretch.length).toBeGreaterThan(0);
    for (const item of stretch) expect(item.band).toBe('B1+');
  });

  it('keeps boundary items on the side of the edge they test', () => {
    // Unlike the bridge module, a boundary module's two stages must sit on
    // opposite sides: lower_exit below the edge, upper_entry above it.
    const boundaryModules = PLACEMENT_MODULES.filter((entry) => entry.kind === 'boundary');
    expect(boundaryModules.length).toBeGreaterThan(0);

    for (const entry of boundaryModules) {
      const items = PLACEMENT_ITEMS.filter((item) => item.moduleId === entry.id);
      for (const item of items) {
        expect(BANDS_BY_LEVEL[item.level], `${item.id}`).toContain(item.band);
      }
    }
  });

  it('gives reading and listening items a stimulus', () => {
    const orphaned = PLACEMENT_ITEMS.filter(
      (item) => item.skill !== 'language_use' && item.stimulusId === null
    );
    expect(orphaned.map((item) => item.id)).toEqual([]);
  });
});

describe('answer keys are well formed', () => {
  it('matches every answer to its item shape', () => {
    const broken = PLACEMENT_ITEMS.filter((item) => item.answer.type !== item.responseType);
    expect(broken.map((item) => item.id)).toEqual([]);
  });

  it('scores full credit when replaying its own key', () => {
    // The strongest check available without a human reviewer: every item must be
    // answerable correctly through the real scorer. A key that resolved to a
    // non-existent option would score zero here.
    const unanswerable: string[] = [];

    for (const item of PLACEMENT_ITEMS) {
      const answer = item.answer;
      const response = (() => {
        switch (answer.type) {
          case 'single_choice':
            return { type: 'single_choice' as const, optionKey: answer.optionKey };
          case 'multiple_choice':
            return { type: 'multiple_choice' as const, optionKeys: answer.optionKeys };
          case 'short_text':
            return { type: 'short_text' as const, text: answer.accepted[0] };
          case 'inline_cloze':
            return { type: 'inline_cloze' as const, blanks: answer.blanks };
          case 'order_tokens':
            return { type: 'order_tokens' as const, order: answer.order };
          case 'matching':
            return { type: 'matching' as const, pairs: answer.pairs };
        }
      })();

      if (scoreItem(item, response).credit !== 1) unanswerable.push(item.id);
    }

    expect(unanswerable).toEqual([]);
  });

  it('gives every choice item at least two options', () => {
    const thin = PLACEMENT_ITEMS.filter(
      (item) =>
        (item.responseType === 'single_choice' || item.responseType === 'multiple_choice') &&
        (item.options?.length ?? 0) < 2
    );
    expect(thin.map((item) => item.id)).toEqual([]);
  });

  it('gives every typed-recall item an accepted answer and a not-known escape', () => {
    const typed = PLACEMENT_ITEMS.filter((item) => item.responseType === 'short_text');
    for (const item of typed) {
      expect(item.inputConstraints?.allowNotKnown).toBe(true);
      if (item.answer.type !== 'short_text') throw new Error('shape mismatch');
      expect(item.answer.accepted.length).toBeGreaterThan(0);
    }
  });
});

describe('module composition under the listening gate', () => {
  it('drops listening items while audio is unavailable', () => {
    const composed = composeModuleItems(ROUTER_MODULE_ID);
    const listening = composed.filter((item) => item.skill === 'listening');

    if (LISTENING_AUDIO_AVAILABLE) {
      expect(listening.length).toBeGreaterThan(0);
    } else {
      expect(listening).toHaveLength(0);
      // 15 router items minus 5 listening.
      expect(composed).toHaveLength(10);
    }
  });

  it('still leaves every module able to route', () => {
    // A module emptied by the gate would deadlock the attempt.
    for (const entry of PLACEMENT_MODULES) {
      expect(composeModuleItems(entry.id).length).toBeGreaterThan(0);
    }
  });

  it('keeps both stages present in every level and boundary module', () => {
    // A level module with no stretch items cannot distinguish L.1 from L.2.
    for (const entry of PLACEMENT_MODULES) {
      if (entry.kind === 'router') continue;
      const composed = composeModuleItems(entry.id);
      for (const stage of entry.stages) {
        expect(
          composed.filter((item) => item.stage === stage).length,
          `${entry.id} lost every ${stage} item`
        ).toBeGreaterThan(0);
      }
    }
  });

  it('resolves a level module id for every level the router can target', () => {
    for (const level of ['A1', 'A2', 'B1', 'B1_PLUS', 'B2', 'C1'] as const) {
      const id = levelModuleId(level);
      expect(PLACEMENT_MODULES.some((entry) => entry.id === id), `${id} missing`).toBe(true);
    }
  });

  it('resolves every boundary module the policy can name', () => {
    for (const moduleId of Object.values(BOUNDARY_MODULE_BY_EDGE)) {
      expect(PLACEMENT_MODULES.some((entry) => entry.id === moduleId), `${moduleId} missing`).toBe(true);
    }
  });
});

describe('per-attempt snapshots', () => {
  it('shuffles options but keeps the same order for the same attempt', () => {
    const item = PLACEMENT_ITEMS.find((candidate) => candidate.options !== null);
    if (!item) throw new Error('no option-bearing item');

    const first = optionOrderFor('attempt-a', item);
    const second = optionOrderFor('attempt-a', item);
    expect(first).toEqual(second);
    expect(first?.slice().sort()).toEqual(item.options?.map((option) => option.key).slice().sort());
  });

  it('gives different attempts different orders somewhere in the bank', () => {
    // Not asserted per item — a four-option shuffle can legitimately collide.
    const differing = PLACEMENT_ITEMS.filter((item) => {
      if (!item.options) return false;
      return (
        JSON.stringify(optionOrderFor('attempt-a', item)) !==
        JSON.stringify(optionOrderFor('attempt-b', item))
      );
    });
    expect(differing.length).toBeGreaterThan(0);
  });

  it('never shows token order in its authored (correct) sequence', () => {
    // The bank stores order_tokens correctly ordered, so an identity shuffle
    // would print the answer.
    const tokenItems = PLACEMENT_ITEMS.filter((item) => item.tokens !== null);
    expect(tokenItems.length).toBeGreaterThan(0);

    for (const item of tokenItems) {
      for (const attemptId of ['a', 'b', 'c', 'd', 'e']) {
        const shown = tokenOrderFor(attemptId, item);
        const authored = item.tokens?.map((token) => token.id);
        expect(shown, `${item.id} in attempt ${attemptId}`).not.toEqual(authored);
      }
    }
  });

  it('offers a writing prompt for every band', () => {
    const bands = PLACEMENT_ITEMS.map((item) => item.band);
    for (const band of new Set(bands)) {
      expect(writingPromptFor('attempt-a', band), `no writing prompt for ${band}`).not.toBeNull();
    }
  });

  it('keeps the same writing prompt across calls for one attempt', () => {
    // A refresh must not hand the learner a different task mid-write.
    expect(writingPromptFor('attempt-a', 'B1.1')?.id).toBe(writingPromptFor('attempt-a', 'B1.1')?.id);
  });
});

describe('production tasks and rubrics', () => {
  it('targets every prompt at bands that belong to its level', () => {
    const wrong = [...PLACEMENT_WRITING_PROMPTS, ...PLACEMENT_SPEAKING_PROMPTS].filter((prompt) =>
      prompt.bands.some((band) => levelOfBand(band) !== prompt.targetLevel)
    );
    expect(wrong.map((prompt) => prompt.id)).toEqual([]);
  });

  it('gives every prompt required content a reviewer can check against', () => {
    for (const prompt of [...PLACEMENT_WRITING_PROMPTS, ...PLACEMENT_SPEAKING_PROMPTS]) {
      expect(prompt.requiredContent.length, prompt.id).toBeGreaterThan(0);
      expect(prompt.reviewFocus.length, prompt.id).toBeGreaterThan(0);
      expect(prompt.instruction.length, prompt.id).toBeGreaterThan(0);
    }
  });

  it('gives writing prompts a word range and speaking prompts a timing', () => {
    for (const prompt of PLACEMENT_WRITING_PROMPTS) {
      expect(prompt.suggestedWords?.min, prompt.id).toBeGreaterThan(0);
      expect(prompt.suggestedWords?.max).toBeGreaterThan(prompt.suggestedWords?.min ?? 0);
    }
    for (const prompt of PLACEMENT_SPEAKING_PROMPTS) {
      expect(prompt.preparationSeconds, prompt.id).toBeGreaterThan(0);
      expect(prompt.responseSeconds, prompt.id).toBeGreaterThan(0);
    }
  });

  it('gives both rubrics four criteria with five band descriptors each', () => {
    for (const rubric of [PLACEMENT_WRITING_RUBRIC, PLACEMENT_SPEAKING_RUBRIC]) {
      expect(rubric.criteria).toHaveLength(4);
      for (const criterion of rubric.criteria) {
        expect(Object.keys(criterion.descriptors)).toHaveLength(5);
      }
    }
  });
});
