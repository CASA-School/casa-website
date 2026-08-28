/**
 * Finalisation: evidence -> a band, a confidence, and an honest list of reasons
 * a human should look at it.
 *
 * Pure. This module decides nothing about presentation — it produces the record
 * a teacher reads and the result page renders. What the *learner* is told is in
 * result-copy.ts, deliberately separated so a reason code can never leak into
 * learner-facing copy.
 */

import {
  AUTO_CONFIRM_CEILING,
  CONFIDENCE_BANDS,
  CONFIDENCE_PENALTIES,
  LISTENING_AUDIO_AVAILABLE,
  POLICY_VERSION,
  RELEASE_MODE,
  REVIEW_REASON_ORDER,
  SPEAKING_REQUIRED_FROM,
  THRESHOLDS,
  bandIndex,
  isBandAtOrBelow,
  levelOfBand,
  type PlacementReviewReason,
} from '@/config/placement/policy';
import { meanCredit } from './score-item';
import type { BoundaryOutcome, LevelOutcome, RouterOutcome } from './route';
import type {
  PlacementBand,
  PlacementItemScore,
  PlacementSkill,
} from './types';

export type PlacementConfidence = 'high' | 'medium' | 'low';

export type SkillProfileEntry = {
  skill: PlacementSkill;
  /** Null when the skill was not measured at all — currently listening. */
  credit: number | null;
  itemCount: number;
};

export type PlacementDecision = {
  policyVersion: number;
  releaseMode: 'shadow' | 'live';

  band: PlacementBand;
  confidence: PlacementConfidence;
  /** Raw 0–1 score behind the confidence band, for analysis and calibration. */
  confidenceScore: number;

  skillProfile: readonly SkillProfileEntry[];
  answeredShare: number;

  /**
   * Whether the engine may present this as settled. False in shadow mode
   * always, and above the auto-confirm ceiling always.
   */
  autoConfirmable: boolean;
  reviewReasons: readonly PlacementReviewReason[];
  speakingRequired: boolean;

  /** Human-readable trail, ordered as the decisions were taken. */
  rationale: readonly string[];
};

export type FinaliseInput = {
  router: RouterOutcome;
  level: LevelOutcome;
  boundary: BoundaryOutcome | null;
  /** Every objective score from the whole attempt. */
  allScores: readonly PlacementItemScore[];
  /**
   * How many items the attempt actually put in front of the learner.
   *
   * REQUIRED, and separate from `allScores.length` for a reason. `allScores`
   * only holds items that have a stored response, so a completeness measure
   * taken from it divides the answers by themselves and reads 100% for a
   * learner who quit after three questions — which silently disabled the
   * `incomplete_objective_evidence` review trigger entirely.
   *
   * The skill profile still comes from `allScores`: "how did they do on what
   * they attempted" and "how much did they attempt" are two different
   * questions, and conflating them is what caused that bug.
   */
  servedItemCount: number;
  /** True when the learner declared no prior German and skipped testing. */
  directBeginner?: boolean;
  /** Set when writing was offered and not completed. */
  productionIncomplete?: boolean;
  /** Set when the client reported a technical fault during the attempt. */
  technicalProblem?: boolean;
  /** Set when the learner explicitly asked for a human to look. */
  learnerRequestedReview?: boolean;
};

function skillProfile(scores: readonly PlacementItemScore[]): SkillProfileEntry[] {
  const skills: PlacementSkill[] = ['language_use', 'reading', 'listening'];

  return skills.map((skill) => {
    const forSkill = scores.filter((score) => score.skill === skill);
    return {
      skill,
      credit: forSkill.length === 0 ? null : meanCredit(forSkill),
      itemCount: forSkill.length,
    };
  });
}

/** Widest gap between two measured skills. Null when fewer than two were measured. */
function profileSpread(profile: readonly SkillProfileEntry[]): number | null {
  const measured = profile
    .map((entry) => entry.credit)
    .filter((credit): credit is number => credit !== null);

  if (measured.length < 2) return null;
  return Math.max(...measured) - Math.min(...measured);
}

/** How close a value sits to a threshold, as an absolute margin. */
function isBorderline(value: number, threshold: number): boolean {
  return Math.abs(value - threshold) < THRESHOLDS.borderlineMargin;
}

/**
 * A learner who declares no German at all is placed at A1.1 without sitting a
 * test they cannot read. This is a package non-negotiable ("Direct true
 * beginners to A1.1 without testing"), and it is also the humane behaviour:
 * fifteen router items in a language you do not have is not a measurement, it
 * is a discouragement.
 */
export function finaliseDirectBeginner(): PlacementDecision {
  return {
    policyVersion: POLICY_VERSION,
    releaseMode: RELEASE_MODE,
    band: 'A1.1',
    confidence: 'high',
    confidenceScore: 1,
    skillProfile: skillProfile([]),
    answeredShare: 1,
    // Still not auto-confirmed in shadow mode, but there is nothing ambiguous
    // to review — the learner told us, and A1.1 is the start of the ladder.
    autoConfirmable: RELEASE_MODE === 'live',
    reviewReasons: RELEASE_MODE === 'shadow' ? ['shadow_mode'] : [],
    speakingRequired: false,
    rationale: ['Learner reported no previous German; placed at the entry band without testing.'],
  };
}

export function finalisePlacement(input: FinaliseInput): PlacementDecision {
  const { router, level, boundary, allScores } = input;

  const band = boundary ? boundary.band : level.provisionalBand;
  const profile = skillProfile(allScores);

  const answeredCount = allScores.filter((score) => score.answered).length;
  const answered =
    input.servedItemCount === 0 ? 1 : Math.min(1, answeredCount / input.servedItemCount);

  const spread = profileSpread(profile);

  const rationale: string[] = [router.reason, level.reason];
  if (boundary) rationale.push(boundary.reason);

  // --- confidence ----------------------------------------------------------
  let confidenceScore = 1;
  const reviewReasons = new Set<PlacementReviewReason>();

  if (level.routerOvershot) {
    confidenceScore -= CONFIDENCE_PENALTIES.routerDisagreement;
    reviewReasons.add('router_level_disagreement');
  }

  if (
    isBorderline(level.foundationCredit, THRESHOLDS.levelFoundationClear) ||
    isBorderline(level.stretchCredit, THRESHOLDS.levelStretchClear)
  ) {
    confidenceScore -= CONFIDENCE_PENALTIES.borderlineDecision;
    rationale.push('A band decision fell within the borderline margin of its threshold.');
  }

  if (boundary?.unresolved) {
    confidenceScore -= CONFIDENCE_PENALTIES.unresolvedBoundary;
    reviewReasons.add('unresolved_boundary');
  }

  if (spread !== null && spread >= THRESHOLDS.unevenSkillSpread) {
    confidenceScore -= CONFIDENCE_PENALTIES.unevenProfile;
    reviewReasons.add('uneven_skill_profile');
    rationale.push(`Skill profile spread ${spread.toFixed(2)} at or above ${THRESHOLDS.unevenSkillSpread}.`);
  }

  if (answered < THRESHOLDS.minimumAnsweredShare) {
    // Scaled by how far short the evidence falls, not flat. A flat penalty
    // scored an attempt with a fifth of its items answered the same as one just
    // under the threshold, which let a near-empty attempt keep medium
    // confidence. Both terms are shares of the same 0–1 confidence budget, so
    // adding the shortfall directly needs no fudge factor.
    const shortfall = THRESHOLDS.minimumAnsweredShare - answered;
    confidenceScore -= CONFIDENCE_PENALTIES.incompleteEvidence + shortfall;
    reviewReasons.add('incomplete_objective_evidence');
    rationale.push(`Only ${(answered * 100).toFixed(0)}% of served items were answered.`);
  }

  if (!LISTENING_AUDIO_AVAILABLE) {
    confidenceScore -= CONFIDENCE_PENALTIES.missingListeningConstruct;
    rationale.push('Listening was not delivered: audio recordings are not yet available.');
  }

  confidenceScore = Math.max(0, Math.min(1, confidenceScore));

  const confidence: PlacementConfidence =
    confidenceScore >= CONFIDENCE_BANDS.high
      ? 'high'
      : confidenceScore >= CONFIDENCE_BANDS.medium
        ? 'medium'
        : 'low';

  if (confidence === 'low') reviewReasons.add('low_confidence');

  // --- rule-driven review triggers ----------------------------------------
  // These are transcribed policy, not tuning. See policy.ts.
  if (!isBandAtOrBelow(band, AUTO_CONFIRM_CEILING)) {
    reviewReasons.add('above_auto_confirm_ceiling');
  }

  // The B1+/B2 edge is called out separately in the package because it is the
  // one CASA teachers most often disagree with an instrument about.
  if (level.boundaryProbe?.moduleId === 'BOUNDARY-B1P-B2' || boundary?.band === 'B2.1') {
    reviewReasons.add('b1plus_b2_boundary');
  }

  const speakingRequired = bandIndex(band) >= bandIndex(SPEAKING_REQUIRED_FROM);
  if (speakingRequired) reviewReasons.add('speaking_required');

  if (input.productionIncomplete) reviewReasons.add('incomplete_production');
  if (input.technicalProblem) reviewReasons.add('technical_problem');
  if (input.learnerRequestedReview) reviewReasons.add('learner_requested_review');
  if (RELEASE_MODE === 'shadow') reviewReasons.add('shadow_mode');

  // Anything that reaches review is by definition not auto-confirmed. In shadow
  // mode that is every attempt, which is the point of shadow mode.
  const autoConfirmable = reviewReasons.size === 0;

  return {
    policyVersion: POLICY_VERSION,
    releaseMode: RELEASE_MODE,
    band,
    confidence,
    confidenceScore,
    skillProfile: profile,
    answeredShare: answered,
    autoConfirmable,
    reviewReasons: REVIEW_REASON_ORDER.filter((reason) => reviewReasons.has(reason)),
    speakingRequired,
    rationale,
  };
}

/**
 * The band a learner should be *offered*, which is not always the band the
 * evidence points at.
 *
 * Above the auto-confirm ceiling the recommendation is provisional, so the
 * result page presents the band as "pending confirmation" rather than as a
 * seat. This helper keeps that distinction in one place so the UI cannot
 * accidentally present an unconfirmed C1 as settled.
 */
export function presentationBand(decision: PlacementDecision): {
  band: PlacementBand;
  provisional: boolean;
} {
  return {
    band: decision.band,
    provisional: !decision.autoConfirmable,
  };
}

/** Level label for display, e.g. `B1_PLUS` -> `B1+`. */
export function levelLabelOfBand(band: PlacementBand): string {
  const level = levelOfBand(band);
  return level === 'B1_PLUS' ? 'B1+' : level;
}
