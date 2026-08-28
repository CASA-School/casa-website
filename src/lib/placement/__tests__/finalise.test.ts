import { describe, expect, it } from 'vitest';

import { AUTO_CONFIRM_CEILING, RELEASE_MODE, isBandAtOrBelow } from '@/config/placement/policy';
import { finaliseDirectBeginner, finalisePlacement, type FinaliseInput } from '@/lib/placement/finalise';
import type { BoundaryOutcome, LevelOutcome, RouterOutcome } from '@/lib/placement/route';
import type { PlacementItemScore, PlacementSkill } from '@/lib/placement/types';

/**
 * Finalisation is where the package's non-negotiables become code. The tests
 * that matter most here are the refusals: C1 is never auto-confirmed, B2 is not
 * auto-confirmed in v1, the B1+/B2 edge always reaches a teacher, and shadow
 * mode confirms nothing at all.
 */

const router: RouterOutcome = {
  targetLevel: 'B1',
  tiers: [],
  discardedTiers: [],
  reason: 'test router',
};

function level(overrides: Partial<LevelOutcome> = {}): LevelOutcome {
  return {
    provisionalBand: 'B1.1',
    foundationCredit: 0.9,
    stretchCredit: 0.3,
    routerOvershot: false,
    boundaryProbe: null,
    reason: 'test level',
    ...overrides,
  };
}

function scores(options: { skill?: PlacementSkill; credit?: number; count?: number; answered?: boolean } = {}) {
  const { skill = 'language_use', credit = 0.9, count = 6, answered = true } = options;
  return Array.from({ length: count }, (_, index): PlacementItemScore => ({
    itemId: `${skill}-${index}`,
    skill,
    stage: 'foundation',
    band: 'B1.1',
    level: 'B1',
    credit: answered ? credit : 0,
    correct: credit === 1,
    answered,
  }));
}

/**
 * Wrapper that defaults `servedItemCount` to the number of scores supplied.
 *
 * Every test here hands in a fully answered score set, so "served" and "scored"
 * coincide; the one test about thin evidence overrides it explicitly. Keeping
 * the default here rather than inline means adding a future field to
 * `FinaliseInput` does not mean editing fourteen call sites.
 */
function finalise(input: Omit<FinaliseInput, 'servedItemCount'> & { servedItemCount?: number }) {
  return finalisePlacement({
    ...input,
    servedItemCount: input.servedItemCount ?? input.allScores.length,
  });
}

describe('finaliseDirectBeginner', () => {
  it('places at A1.1 without testing', () => {
    const decision = finaliseDirectBeginner();
    expect(decision.band).toBe('A1.1');
    expect(decision.confidence).toBe('high');
  });

  it('does not send an unambiguous beginner to review for anything but shadow mode', () => {
    const decision = finaliseDirectBeginner();
    const reasons = decision.reviewReasons.filter((reason) => reason !== 'shadow_mode');
    expect(reasons).toEqual([]);
  });
});

describe('finalisePlacement — review rules', () => {
  it('never auto-confirms in shadow mode', () => {
    // The whole point of shadow mode: the engine recommends, staff decide.
    const decision = finalise({ router, level: level(), boundary: null, allScores: scores() });
    if (RELEASE_MODE === 'shadow') {
      expect(decision.autoConfirmable).toBe(false);
      expect(decision.reviewReasons).toContain('shadow_mode');
    }
  });

  it('flags every band above the auto-confirm ceiling', () => {
    const decision = finalise({
      router,
      level: level({ provisionalBand: 'C1.2' }),
      boundary: null,
      allScores: scores(),
    });
    expect(decision.reviewReasons).toContain('above_auto_confirm_ceiling');
    expect(decision.autoConfirmable).toBe(false);
  });

  it('keeps C1 out of auto-confirmation by policy, not by score', () => {
    // A perfect C1 attempt must still reach a human in v1.
    const decision = finalise({
      router: { ...router, targetLevel: 'C1' },
      level: level({ provisionalBand: 'C1.2', foundationCredit: 1, stretchCredit: 1 }),
      boundary: null,
      allScores: scores({ credit: 1 }),
    });
    expect(isBandAtOrBelow('C1.2', AUTO_CONFIRM_CEILING)).toBe(false);
    expect(decision.autoConfirmable).toBe(false);
  });

  it('flags the B1+/B2 edge specifically', () => {
    const decision = finalise({
      router,
      level: level({
        provisionalBand: 'B1+',
        boundaryProbe: { moduleId: 'BOUNDARY-B1P-B2', lowerLevel: 'B1_PLUS', upperLevel: 'B2' },
      }),
      boundary: null,
      allScores: scores(),
    });
    expect(decision.reviewReasons).toContain('b1plus_b2_boundary');
  });

  it('requires a spoken conversation from B1+ upward', () => {
    const decision = finalise({
      router,
      level: level({ provisionalBand: 'B1+' }),
      boundary: null,
      allScores: scores(),
    });
    expect(decision.speakingRequired).toBe(true);
    expect(decision.reviewReasons).toContain('speaking_required');
  });

  it('does not require speaking below B1+', () => {
    const decision = finalise({ router, level: level({ provisionalBand: 'A2.2' }), boundary: null, allScores: scores() });
    expect(decision.speakingRequired).toBe(false);
  });

  it('flags a router/level disagreement', () => {
    const decision = finalise({
      router,
      level: level({ routerOvershot: true, provisionalBand: 'A2.2', foundationCredit: 0.2 }),
      boundary: null,
      allScores: scores(),
    });
    expect(decision.reviewReasons).toContain('router_level_disagreement');
    expect(decision.confidence).not.toBe('high');
  });

  it('flags an unresolved boundary and takes the boundary band', () => {
    const boundary: BoundaryOutcome = {
      band: 'B1.2',
      lowerExitCredit: 0.2,
      upperEntryCredit: 0.2,
      unresolved: true,
      reason: 'test boundary',
    };
    const decision = finalise({ router, level: level(), boundary, allScores: scores() });
    expect(decision.band).toBe('B1.2');
    expect(decision.reviewReasons).toContain('unresolved_boundary');
  });

  it('flags thin evidence rather than placing confidently on fragments', () => {
    // Two answered out of ten served. `servedItemCount` is what makes this
    // detectable: counting only the scores present would read as 100% answered.
    const decision = finalise({
      router,
      level: level(),
      boundary: null,
      allScores: scores({ count: 2 }),
      servedItemCount: 10,
    });
    expect(decision.reviewReasons).toContain('incomplete_objective_evidence');
    expect(decision.confidence).toBe('low');
  });

  it('flags an uneven skill profile as a finding, not noise', () => {
    // Reading far above language use is a real diagnosis a teacher should see,
    // not something to average away.
    const decision = finalise({
      router,
      level: level(),
      boundary: null,
      allScores: [
        ...scores({ skill: 'reading', credit: 1 }),
        ...scores({ skill: 'language_use', credit: 0.1 }),
      ],
    });
    expect(decision.reviewReasons).toContain('uneven_skill_profile');
  });

  it('propagates a technical fault and incomplete production', () => {
    const decision = finalise({
      router,
      level: level(),
      boundary: null,
      allScores: scores(),
      technicalProblem: true,
      productionIncomplete: true,
    });
    expect(decision.reviewReasons).toContain('technical_problem');
    expect(decision.reviewReasons).toContain('incomplete_production');
  });
});

describe('finalisePlacement — record quality', () => {
  it('keeps the reasoning trail a reviewer needs', () => {
    const decision = finalise({ router, level: level(), boundary: null, allScores: scores() });
    expect(decision.rationale).toContain('test router');
    expect(decision.rationale).toContain('test level');
  });

  it('stamps the policy version that scored the attempt', () => {
    // Cut scores are pilot hypotheses; without this the record cannot be re-read.
    const decision = finalise({ router, level: level(), boundary: null, allScores: scores() });
    expect(decision.policyVersion).toBeGreaterThan(0);
  });

  it('reports an unmeasured skill as null rather than zero', () => {
    // Listening is currently not delivered. Zero would read as "failed".
    const decision = finalise({
      router,
      level: level(),
      boundary: null,
      allScores: scores({ skill: 'reading' }),
    });
    const listening = decision.skillProfile.find((entry) => entry.skill === 'listening');
    expect(listening?.credit).toBeNull();
    expect(listening?.itemCount).toBe(0);
  });

  it('orders review reasons deterministically', () => {
    const first = finalise({
      router,
      level: level({ routerOvershot: true }),
      boundary: null,
      allScores: scores(),
      technicalProblem: true,
    });
    const second = finalise({
      router,
      level: level({ routerOvershot: true }),
      boundary: null,
      allScores: scores(),
      technicalProblem: true,
    });
    expect(first.reviewReasons).toEqual(second.reviewReasons);
    // Most actionable first: a technical fault outranks a shadow-mode note.
    expect(first.reviewReasons[0]).toBe('technical_problem');
  });
});
