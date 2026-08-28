import { describe, expect, it } from 'vitest';

import { THRESHOLDS } from '@/config/placement/policy';
import { resolveBoundary, resolveLevelModule, routeFromRouter } from '@/lib/placement/route';
import type { PlacementItemScore, PlacementLevel, PlacementStage } from '@/lib/placement/types';

/**
 * Routing decides which module a learner sees and, through the level module,
 * where they are seated. The behaviours pinned here are the ones a teacher will
 * challenge: does one slip cap someone a level low, does a lucky guess promote
 * them, and does the instrument admit when it cannot tell.
 */

function routerScore(level: PlacementLevel, credit: number): PlacementItemScore {
  return {
    itemId: `ROUTER-${level}-${credit}`,
    skill: 'language_use',
    stage: 'router',
    band: 'A1.1',
    level,
    credit,
    correct: credit === 1,
    answered: true,
  };
}

/** Two router items per tier, both at the same credit. */
function tier(level: PlacementLevel, credit: number): PlacementItemScore[] {
  return [
    { ...routerScore(level, credit), itemId: `${level}-1` },
    { ...routerScore(level, credit), itemId: `${level}-2` },
  ];
}

function levelScore(stage: PlacementStage, credit: number, index: number): PlacementItemScore {
  return {
    itemId: `${stage}-${index}`,
    skill: 'language_use',
    stage,
    band: 'B1.1',
    level: 'B1',
    credit,
    correct: credit === 1,
    answered: true,
  };
}

function stageScores(stage: PlacementStage, credit: number, count = 6): PlacementItemScore[] {
  return Array.from({ length: count }, (_, index) => levelScore(stage, credit, index));
}

describe('routeFromRouter', () => {
  it('serves A1 when nothing is cleared', () => {
    const outcome = routeFromRouter([...tier('A1', 0), ...tier('A2', 0), ...tier('B1', 0)]);
    expect(outcome.targetLevel).toBe('A1');
  });

  it('targets the highest cleared tier', () => {
    const outcome = routeFromRouter([
      ...tier('A1', 1),
      ...tier('A2', 1),
      ...tier('B1', 1),
      ...tier('B2', 0),
      ...tier('C1', 0),
    ]);
    expect(outcome.targetLevel).toBe('B1');
  });

  it('tolerates a single missed tier so one slip does not cap a learner', () => {
    // A2 missed, B1 cleared. Without gap tolerance this learner would sit an A1
    // module despite demonstrating B1.
    const outcome = routeFromRouter([
      ...tier('A1', 1),
      ...tier('A2', 0),
      ...tier('B1', 1),
      ...tier('B2', 0),
    ]);
    expect(outcome.targetLevel).toBe('B1');
    expect(outcome.discardedTiers).toHaveLength(0);
  });

  it('discounts a cleared tier that sits above a wall', () => {
    // A1 cleared, then A2 and B1 both missed — a wall. A cleared C1 above it is
    // far likelier a lucky guess on a four-option item than real competence.
    const outcome = routeFromRouter([
      ...tier('A1', 1),
      ...tier('A2', 0),
      ...tier('B1', 0),
      ...tier('B2', 0),
      ...tier('C1', 1),
    ]);
    expect(outcome.targetLevel).toBe('A1');
    expect(outcome.discardedTiers).toContain('C1');
  });

  it('ignores tiers with no delivered items rather than counting them as misses', () => {
    // While listening audio is missing a tier could lose items; an absent tier
    // must not read as a failed one.
    const outcome = routeFromRouter([...tier('A1', 1), ...tier('B1', 1)]);
    expect(outcome.targetLevel).toBe('B1');
  });

  it('reports the tier credits it decided from', () => {
    const outcome = routeFromRouter(tier('A1', 1));
    const a1 = outcome.tiers.find((entry) => entry.level === 'A1');
    expect(a1).toMatchObject({ credit: 1, cleared: true, itemCount: 2 });
  });
});

describe('resolveLevelModule', () => {
  it('awards the entry band when foundation holds but stretch does not', () => {
    const outcome = resolveLevelModule('B1', [...stageScores('foundation', 1), ...stageScores('stretch', 0)]);
    expect(outcome.provisionalBand).toBe('B1.1');
    expect(outcome.routerOvershot).toBe(false);
  });

  it('awards the upper band when both hold', () => {
    const outcome = resolveLevelModule('B1', [
      ...stageScores('foundation', 1),
      ...stageScores('stretch', 0.7),
    ]);
    expect(outcome.provisionalBand).toBe('B1.2');
  });

  it('steps down and flags a disagreement when foundation fails', () => {
    const outcome = resolveLevelModule('B1', [
      ...stageScores('foundation', 0.2),
      ...stageScores('stretch', 0),
    ]);
    expect(outcome.routerOvershot).toBe(true);
    expect(outcome.provisionalBand).toBe('A2.2');
    expect(outcome.boundaryProbe?.moduleId).toBe('BOUNDARY-A2-B1');
  });

  it('has nowhere to step down to at A1 and seats the entry band', () => {
    const outcome = resolveLevelModule('A1', [
      ...stageScores('foundation', 0.1),
      ...stageScores('stretch', 0),
    ]);
    expect(outcome.provisionalBand).toBe('A1.1');
    expect(outcome.routerOvershot).toBe(false);
    expect(outcome.boundaryProbe).toBeNull();
  });

  it('probes upward when stretch is decisive', () => {
    const outcome = resolveLevelModule('B1', [
      ...stageScores('foundation', 1),
      ...stageScores('stretch', 1),
    ]);
    expect(outcome.provisionalBand).toBe('B1.2');
    expect(outcome.boundaryProbe?.moduleId).toBe('BOUNDARY-B1-B1P');
  });

  it('probes downward on a weak hold of the level', () => {
    // Foundation just over the floor: worth settling against the level below
    // rather than seating a scraping learner half a band too high.
    const weak = (THRESHOLDS.levelFoundationClear + THRESHOLDS.boundaryProbeDown) / 2;
    const outcome = resolveLevelModule('B1', [
      ...stageScores('foundation', weak),
      ...stageScores('stretch', 0),
    ]);
    expect(outcome.provisionalBand).toBe('B1.1');
    expect(outcome.boundaryProbe?.moduleId).toBe('BOUNDARY-A2-B1');
  });

  it('treats B1+ as a single band with no upper half', () => {
    const outcome = resolveLevelModule('B1_PLUS', [
      ...stageScores('foundation', 1),
      ...stageScores('stretch', 0.7),
    ]);
    expect(outcome.provisionalBand).toBe('B1+');
  });

  it('probes the B1+/B2 edge from a decisive B1+ stretch', () => {
    const outcome = resolveLevelModule('B1_PLUS', [
      ...stageScores('foundation', 1),
      ...stageScores('stretch', 1),
    ]);
    expect(outcome.boundaryProbe?.moduleId).toBe('BOUNDARY-B1P-B2');
  });

  it('does not probe above C1, the top of the ladder', () => {
    const outcome = resolveLevelModule('C1', [
      ...stageScores('foundation', 1),
      ...stageScores('stretch', 1),
    ]);
    expect(outcome.provisionalBand).toBe('C1.2');
    expect(outcome.boundaryProbe).toBeNull();
  });
});

describe('resolveBoundary', () => {
  const probe = { moduleId: 'BOUNDARY-B1-B1P', lowerLevel: 'B1' as const, upperLevel: 'B1_PLUS' as const };

  function boundaryScores(lower: number, upper: number): PlacementItemScore[] {
    return [
      ...Array.from({ length: 3 }, (_, index) => levelScore('lower_exit', lower, index)),
      ...Array.from({ length: 3 }, (_, index) => levelScore('upper_entry', upper, index)),
    ];
  }

  it('awards the upper entry band when the upper side is clear', () => {
    const outcome = resolveBoundary(probe, boundaryScores(1, 1));
    expect(outcome.band).toBe('B1+');
    expect(outcome.unresolved).toBe(false);
  });

  it('holds the lower exit band when only the lower side is clear', () => {
    const outcome = resolveBoundary(probe, boundaryScores(1, 0));
    expect(outcome.band).toBe('B1.2');
    expect(outcome.unresolved).toBe(false);
  });

  it('seats low and admits it could not tell when neither side is clear', () => {
    // Starting a little low costs ease; starting too high costs the course. But
    // the uncertainty is reported, not smoothed away.
    const outcome = resolveBoundary(probe, boundaryScores(0.2, 0.2));
    expect(outcome.band).toBe('B1.2');
    expect(outcome.unresolved).toBe(true);
  });
});
