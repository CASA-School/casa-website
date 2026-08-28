/**
 * Routing: router evidence -> which level module to serve; level evidence ->
 * which band, and whether a boundary module is needed to settle it.
 *
 * Pure. Every decision returns its own reasoning alongside the outcome, because
 * a placement a teacher cannot interrogate is a placement they will not trust —
 * and in shadow mode a teacher reads every one of these.
 */

import {
  BANDS_BY_LEVEL,
  BOUNDARY_MODULE_BY_EDGE,
  PLACEMENT_LEVELS,
  THRESHOLDS,
  levelIndex,
} from '@/config/placement/policy';
import { meanCredit } from './score-item';
import type {
  PlacementBand,
  PlacementItem,
  PlacementItemScore,
  PlacementLevel,
} from './types';

// ---------------------------------------------------------------------------
// router
// ---------------------------------------------------------------------------

export type RouterTierResult = {
  level: PlacementLevel;
  itemCount: number;
  credit: number;
  cleared: boolean;
};

export type RouterOutcome = {
  targetLevel: PlacementLevel;
  tiers: readonly RouterTierResult[];
  /** Tiers above the target that were cleared but discounted as guesses. */
  discardedTiers: readonly PlacementLevel[];
  reason: string;
};

/**
 * Whether the router already has enough evidence to stop asking higher-level
 * questions.
 *
 * This applies the same wall the final router uses: once two fully answered,
 * consecutive tiers are uncleared, any tier above them would be discarded by
 * `routeFromRouter` anyway. Stopping here changes no placement decision; it
 * only avoids making a learner continue into B2/C1 questions that can no
 * longer affect their route.
 */
export function routerEvidenceIsConclusive(
  items: readonly PlacementItem[],
  scores: readonly PlacementItemScore[]
): boolean {
  let consecutiveMisses = 0;
  let probedTierCount = 0;

  for (const level of PLACEMENT_LEVELS) {
    const tierItems = items.filter((item) => item.level === level);
    if (tierItems.length === 0) continue;

    probedTierCount += 1;
    const tierScores = scores.filter((score) => score.level === level);

    // Item order is low to high. An incomplete tier means the learner still
    // needs to finish the current level before the wall can be trusted.
    if (tierScores.length < tierItems.length) return false;

    if (meanCredit(tierScores) >= THRESHOLDS.routerTierClear) {
      consecutiveMisses = 0;
    } else {
      consecutiveMisses += 1;
      if (consecutiveMisses >= THRESHOLDS.routerGapTolerance) return true;
    }
  }

  // Every deliverable tier was answered without reaching a wall.
  return probedTierCount > 0;
}

/**
 * Picks the level module from router evidence.
 *
 * Walks the tiers upward and keeps the highest cleared one, tolerating a single
 * uncleared tier so one careless slip cannot cap a learner a whole level low.
 * `routerGapTolerance` consecutive misses is treated as a wall: a cleared tier
 * *above* a wall is far more likely a lucky guess on a four-option item than
 * real competence, so it is discarded rather than promoted.
 *
 * The router only chooses which module to serve next. It never places anyone —
 * the level module does that, and may overrule this.
 */
export function routeFromRouter(scores: readonly PlacementItemScore[]): RouterOutcome {
  const tiers: RouterTierResult[] = PLACEMENT_LEVELS.map((level) => {
    const tierScores = scores.filter((score) => score.level === level);
    return {
      level,
      itemCount: tierScores.length,
      credit: meanCredit(tierScores),
      cleared: tierScores.length > 0 && meanCredit(tierScores) >= THRESHOLDS.routerTierClear,
    };
  });

  // Tiers with no items are invisible to the walk rather than counting as a
  // miss. The router bank has no B1_PLUS tier, and while listening audio is
  // missing a tier could in principle lose all its items.
  const probed = tiers.filter((tier) => tier.itemCount > 0);

  let highestCleared: PlacementLevel | null = null;
  let consecutiveMisses = 0;
  let wallReached = false;
  const discardedTiers: PlacementLevel[] = [];

  for (const tier of probed) {
    if (wallReached) {
      if (tier.cleared) discardedTiers.push(tier.level);
      continue;
    }

    if (tier.cleared) {
      highestCleared = tier.level;
      consecutiveMisses = 0;
      continue;
    }

    consecutiveMisses += 1;
    if (consecutiveMisses >= THRESHOLDS.routerGapTolerance) wallReached = true;
  }

  if (highestCleared === null) {
    return {
      targetLevel: 'A1',
      tiers,
      discardedTiers,
      reason: 'No router tier cleared; serving the A1 module.',
    };
  }

  const reason = wallReached
    ? `Highest cleared tier ${highestCleared}; ${discardedTiers.length} higher tier(s) discounted after ${THRESHOLDS.routerGapTolerance} consecutive misses.`
    : `Highest cleared tier ${highestCleared}.`;

  return { targetLevel: highestCleared, tiers, discardedTiers, reason };
}

// ---------------------------------------------------------------------------
// level module
// ---------------------------------------------------------------------------

export type LevelOutcome = {
  /** Band the level module points at before any boundary probe. */
  provisionalBand: PlacementBand;
  foundationCredit: number;
  stretchCredit: number;
  /** True when foundation failed, i.e. the router aimed too high. */
  routerOvershot: boolean;
  /** Set when a boundary module should be served to settle the edge. */
  boundaryProbe: { moduleId: string; lowerLevel: PlacementLevel; upperLevel: PlacementLevel } | null;
  reason: string;
};

function boundaryModuleFor(lower: PlacementLevel, upper: PlacementLevel): string | null {
  return BOUNDARY_MODULE_BY_EDGE[`${lower}|${upper}`] ?? null;
}

/**
 * Turns level-module evidence into a band, and decides whether the edge above
 * or below still needs settling.
 *
 * Three outcomes:
 *  - foundation failed  -> the router overshot. Place at the level below and
 *    probe that edge; the disagreement is a review trigger downstream.
 *  - foundation held, stretch did not -> the entry band (L.1).
 *  - both held -> the upper band (L.2), and if stretch was decisive, probe the
 *    edge above in case the learner belongs at the next level's entry.
 */
export function resolveLevelModule(
  targetLevel: PlacementLevel,
  scores: readonly PlacementItemScore[]
): LevelOutcome {
  const foundationCredit = meanCredit(scores.filter((score) => score.stage === 'foundation'));
  const stretchCredit = meanCredit(scores.filter((score) => score.stage === 'stretch'));

  const bands = BANDS_BY_LEVEL[targetLevel];
  const entryBand = bands[0];
  const upperBand = bands[bands.length - 1];

  const index = levelIndex(targetLevel);
  const levelBelow = index > 0 ? PLACEMENT_LEVELS[index - 1] : null;
  const levelAbove = index < PLACEMENT_LEVELS.length - 1 ? PLACEMENT_LEVELS[index + 1] : null;

  // --- the router aimed too high -------------------------------------------
  if (foundationCredit < THRESHOLDS.levelFoundationClear) {
    if (levelBelow === null) {
      // Already at A1 and the foundation did not hold. There is nowhere lower
      // to place: A1.1 is the entry to the whole ladder.
      return {
        provisionalBand: 'A1.1',
        foundationCredit,
        stretchCredit,
        routerOvershot: false,
        boundaryProbe: null,
        reason: `A1 foundation credit ${foundationCredit.toFixed(2)} below ${THRESHOLDS.levelFoundationClear}; placing at the entry band.`,
      };
    }

    const belowBands = BANDS_BY_LEVEL[levelBelow];
    const moduleId = boundaryModuleFor(levelBelow, targetLevel);

    return {
      provisionalBand: belowBands[belowBands.length - 1],
      foundationCredit,
      stretchCredit,
      routerOvershot: true,
      boundaryProbe: moduleId
        ? { moduleId, lowerLevel: levelBelow, upperLevel: targetLevel }
        : null,
      reason: `Foundation credit ${foundationCredit.toFixed(2)} below ${THRESHOLDS.levelFoundationClear}: router target ${targetLevel} not confirmed, stepping down to ${levelBelow}.`,
    };
  }

  // --- foundation held, stretch did not ------------------------------------
  if (stretchCredit < THRESHOLDS.levelStretchClear) {
    // A weak hold on the level is worth settling against the level below, so a
    // learner scraping the floor is not seated a full half-band too high.
    const weakHold = foundationCredit < THRESHOLDS.boundaryProbeDown;
    const moduleId = weakHold && levelBelow ? boundaryModuleFor(levelBelow, targetLevel) : null;

    return {
      provisionalBand: entryBand,
      foundationCredit,
      stretchCredit,
      routerOvershot: false,
      boundaryProbe:
        moduleId && levelBelow ? { moduleId, lowerLevel: levelBelow, upperLevel: targetLevel } : null,
      reason: `Foundation held (${foundationCredit.toFixed(2)}), stretch ${stretchCredit.toFixed(2)} below ${THRESHOLDS.levelStretchClear}: entry band ${entryBand}.`,
    };
  }

  // --- both held -----------------------------------------------------------
  const decisiveStretch = stretchCredit >= THRESHOLDS.boundaryProbeUp;
  const moduleId = decisiveStretch && levelAbove ? boundaryModuleFor(targetLevel, levelAbove) : null;

  return {
    provisionalBand: upperBand,
    foundationCredit,
    stretchCredit,
    routerOvershot: false,
    boundaryProbe:
      moduleId && levelAbove ? { moduleId, lowerLevel: targetLevel, upperLevel: levelAbove } : null,
    reason: decisiveStretch
      ? `Foundation and stretch both held (${foundationCredit.toFixed(2)} / ${stretchCredit.toFixed(2)}); stretch at or above ${THRESHOLDS.boundaryProbeUp}, so the ${targetLevel} ceiling needs settling.`
      : `Foundation and stretch both held (${foundationCredit.toFixed(2)} / ${stretchCredit.toFixed(2)}): upper band ${upperBand}.`,
  };
}

// ---------------------------------------------------------------------------
// boundary module
// ---------------------------------------------------------------------------

export type BoundaryOutcome = {
  band: PlacementBand;
  lowerExitCredit: number;
  upperEntryCredit: number;
  /** True when neither side was clear, so a teacher should settle it. */
  unresolved: boolean;
  reason: string;
};

/**
 * Settles one edge: does the learner exit the lower level or enter the upper one?
 *
 * `unresolved` is a real outcome, not a failure. A learner who neither holds the
 * lower level's exit nor reaches the upper level's entry is genuinely between
 * two groups, and saying so is more useful than picking one and calling it
 * confident.
 */
export function resolveBoundary(
  probe: { moduleId: string; lowerLevel: PlacementLevel; upperLevel: PlacementLevel },
  scores: readonly PlacementItemScore[]
): BoundaryOutcome {
  const lowerExitCredit = meanCredit(scores.filter((score) => score.stage === 'lower_exit'));
  const upperEntryCredit = meanCredit(scores.filter((score) => score.stage === 'upper_entry'));

  const lowerBands = BANDS_BY_LEVEL[probe.lowerLevel];
  const lowerExitBand = lowerBands[lowerBands.length - 1];
  const upperEntryBand = BANDS_BY_LEVEL[probe.upperLevel][0];

  if (upperEntryCredit >= THRESHOLDS.boundaryUpperClear) {
    return {
      band: upperEntryBand,
      lowerExitCredit,
      upperEntryCredit,
      unresolved: false,
      reason: `Upper-entry credit ${upperEntryCredit.toFixed(2)} at or above ${THRESHOLDS.boundaryUpperClear}: ${upperEntryBand}.`,
    };
  }

  // Neither side clear: the lower exit band is the safer seat — starting a
  // little low costs a learner some ease, starting too high costs them the
  // course. But it is flagged, not smoothed over.
  const holdsLowerExit = lowerExitCredit >= THRESHOLDS.boundaryUpperClear;

  return {
    band: lowerExitBand,
    lowerExitCredit,
    upperEntryCredit,
    unresolved: !holdsLowerExit,
    reason: holdsLowerExit
      ? `Upper entry not reached; lower exit held (${lowerExitCredit.toFixed(2)}): ${lowerExitBand}.`
      : `Neither side clear (lower ${lowerExitCredit.toFixed(2)}, upper ${upperEntryCredit.toFixed(2)}): seating at ${lowerExitBand} pending review.`,
  };
}
