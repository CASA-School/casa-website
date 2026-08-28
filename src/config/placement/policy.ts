/**
 * Placement policy — the CASA-owned numbers.
 *
 * ASSUMPTION (2026-08-23). The upstream handoff package ships its thresholds in
 * `content/config/policy.v1.json`, which is **not present on this machine**
 * (docs/PLACEMENT_TEST_IMPLEMENTATION.md §2). Every number below is therefore
 * authored here rather than ported, and is a hypothesis for piloting — the same
 * epistemic status the package assigns its own cut scores ("provisional; revise
 * through pilot standard-setting and data").
 *
 * The *rules* below, by contrast, are not free choices. They are transcribed
 * from the package's non-negotiables and open decisions:
 *
 *  - "C1 is never confirmed automatically in v1"      -> autoConfirm ceiling
 *  - "B2 automatic confirmation: disabled in v1"      -> autoConfirm ceiling
 *  - "Automatic-confirmation ceiling: B1.2 maximum"   -> autoConfirmCeiling
 *  - "B1+/B2 boundary cases are teacher-reviewed"     -> reviewTriggers
 *  - "Use shadow mode initially"                      -> releaseMode
 *  - "No automatic AI grading of writing or speaking" -> production is never scored here
 *  - "Do not call the result a certificate"           -> see result-copy.ts
 *
 * Do not change the rules without a recorded CASA decision. Changing the
 * numbers is expected — that is what the pilot is for. Bump `POLICY_VERSION`
 * when you do, so stored attempts stay interpretable against the policy that
 * scored them.
 */

import { CASA_LEVEL_SEQUENCE, type CasaLevel } from '@/config/calculator/pricing';
import type { PlacementBand, PlacementLevel } from '@/lib/placement/types';

export const POLICY_VERSION = 1;

/**
 * `shadow` — the engine produces a recommendation, it is handed to staff, and
 * staff decide. Nothing is presented to the learner as final.
 * `live` — bands at or below the auto-confirm ceiling may be presented as
 * confirmed. Requires the pilot evidence listed in OPEN_DECISIONS.
 *
 * Stays `shadow` until CASA records the decision to move.
 */
export const RELEASE_MODE: 'shadow' | 'live' = 'shadow';

/**
 * Listening is authored, ported, and implemented, but no audio exists yet: the
 * upstream verification report counts 33 missing scored recordings plus one
 * device-check file as expected warnings that block scored listening.
 *
 * While this is false, listening items are dropped from module composition and
 * scores are normalised over what was actually delivered. Flip it when the
 * recordings land under `public/placement-audio/v1/`.
 *
 * Showing transcripts instead is not an alternative: it would convert a
 * listening construct into a reading one and leak protected content.
 */
export const LISTENING_AUDIO_AVAILABLE = false;

/** The level tiers the router probes, low to high. */
export const PLACEMENT_LEVELS: readonly PlacementLevel[] = [
  'A1',
  'A2',
  'B1',
  'B1_PLUS',
  'B2',
  'C1',
] as const;

/**
 * Bands each level module can award. B1+ is a single 4-week step at CASA, not a
 * pair of half-levels — which is why it has one band while every other level
 * has two. Mirrors `casaLevelGroups` in the calculator's pricing config.
 */
export const BANDS_BY_LEVEL: Record<PlacementLevel, readonly PlacementBand[]> = {
  A1: ['A1.1', 'A1.2'],
  A2: ['A2.1', 'A2.2'],
  B1: ['B1.1', 'B1.2'],
  B1_PLUS: ['B1+'],
  B2: ['B2.1', 'B2.2'],
  C1: ['C1.1', 'C1.2'],
} as const;

/**
 * Which boundary module resolves the edge between two adjacent levels. The
 * router probes five tiers but there are five edges, one fewer than the six
 * levels — B1_PLUS sits between B1 and B2 as its own step.
 */
export const BOUNDARY_MODULE_BY_EDGE: Record<string, string> = {
  'A1|A2': 'BOUNDARY-A1-A2',
  'A2|B1': 'BOUNDARY-A2-B1',
  'B1|B1_PLUS': 'BOUNDARY-B1-B1P',
  'B1_PLUS|B2': 'BOUNDARY-B1P-B2',
  'B2|C1': 'BOUNDARY-B2-C1',
} as const;

// ---------------------------------------------------------------------------
// thresholds — ASSUMPTION, revise from pilot data
// ---------------------------------------------------------------------------

export const THRESHOLDS = {
  /**
   * Mean credit on a router tier's items for that tier to count as cleared.
   * 0.5 on a 2–3 item tier means "more right than wrong at this level".
   */
  routerTierClear: 0.5,

  /**
   * How many consecutive uncleared tiers end the walk up the router. One gap is
   * tolerated so a single careless slip cannot cap a learner a whole level low;
   * two consecutive misses is a wall, and a cleared tier above a wall is far
   * more likely a lucky guess than real competence.
   */
  routerGapTolerance: 2,

  /**
   * Mean credit on the level module's `foundation` items needed to confirm the
   * router's choice. Below this the router overshot: the learner is placed
   * lower and the disagreement is flagged, because a router and a level module
   * pointing in different directions is the clearest low-confidence signal the
   * instrument produces.
   */
  levelFoundationClear: 0.55,

  /**
   * Mean credit on `stretch` items needed to award the upper half-band (L.2)
   * rather than the entry band (L.1).
   */
  levelStretchClear: 0.6,

  /**
   * Stretch credit at or above this, having already cleared foundation, means
   * the learner may belong at the entry of the *next* level. Triggers the
   * boundary module upward.
   */
  boundaryProbeUp: 0.8,

  /**
   * Foundation credit below this — but at or above `levelFoundationClear` — is
   * a weak hold on the level. Triggers the boundary module downward.
   */
  boundaryProbeDown: 0.65,

  /** Mean credit on a boundary module's `upper_entry` items to award the upper band. */
  boundaryUpperClear: 0.6,

  /**
   * Below this share of items answered, the evidence is too thin to place on.
   * Sends the attempt to review rather than guessing from fragments.
   */
  minimumAnsweredShare: 0.7,

  /**
   * Spread between the strongest and weakest skill above which the profile is
   * called uneven. An uneven profile is a real finding, not noise — a learner
   * who reads at B2 and produces at A2 needs a teacher, not an average.
   */
  unevenSkillSpread: 0.4,

  /** Margin from a threshold below which a decision counts as borderline. */
  borderlineMargin: 0.12,
} as const;

/**
 * Confidence is derived, not guessed: each condition below subtracts from a
 * starting score of 1. The bands are then `high >= 0.75`, `medium >= 0.5`,
 * `low` otherwise.
 */
export const CONFIDENCE_PENALTIES = {
  /** The router and the level module pointed at different levels. */
  routerDisagreement: 0.4,
  /** A band decision sat within `borderlineMargin` of its threshold. */
  borderlineDecision: 0.2,
  /** A boundary module was served and did not resolve cleanly. */
  unresolvedBoundary: 0.25,
  /** Skill profile spread exceeded `unevenSkillSpread`. */
  unevenProfile: 0.15,
  /** Items were left unanswered. */
  incompleteEvidence: 0.3,
  /**
   * Listening was not delivered at all, so a third of the construct is
   * missing. Applies while `LISTENING_AUDIO_AVAILABLE` is false.
   */
  missingListeningConstruct: 0.1,
} as const;

export const CONFIDENCE_BANDS = { high: 0.75, medium: 0.5 } as const;

// ---------------------------------------------------------------------------
// review policy — RULES, not tunable numbers
// ---------------------------------------------------------------------------

/**
 * The highest band the engine may ever present as confirmed without a teacher.
 * B1.2 per OPEN_DECISIONS ("Automatic-confirmation ceiling: B1.2 maximum,
 * configurable"). Everything above needs a human, which also satisfies "B2
 * automatic confirmation: disabled in v1" and "C1 is never confirmed
 * automatically in v1" without stating them twice.
 */
export const AUTO_CONFIRM_CEILING: PlacementBand = 'B1.2';

/** Structured reasons a placement goes to a human. Stored, not free text. */
export type PlacementReviewReason =
  | 'shadow_mode'
  | 'above_auto_confirm_ceiling'
  | 'low_confidence'
  | 'router_level_disagreement'
  | 'unresolved_boundary'
  | 'b1plus_b2_boundary'
  | 'incomplete_objective_evidence'
  | 'incomplete_production'
  | 'speaking_required'
  | 'uneven_skill_profile'
  | 'technical_problem'
  | 'learner_requested_review';

/**
 * Learner-visible explanation is deliberately separate from the reason code:
 * codes are for staff and analytics, copy is in result-copy.ts. A learner
 * should never read "router_level_disagreement".
 */
export const REVIEW_REASON_ORDER: readonly PlacementReviewReason[] = [
  'technical_problem',
  'incomplete_objective_evidence',
  'router_level_disagreement',
  'low_confidence',
  'unresolved_boundary',
  'b1plus_b2_boundary',
  'above_auto_confirm_ceiling',
  'uneven_skill_profile',
  'speaking_required',
  'incomplete_production',
  'learner_requested_review',
  'shadow_mode',
] as const;

/**
 * From which band a spoken conversation is part of the placement. Package
 * position: "B1+ speaking requirement: speaking or documented teacher
 * conversation". v1 takes the conversation route — see §6 of the
 * implementation doc for why in-browser recording is deferred.
 */
export const SPEAKING_REQUIRED_FROM: PlacementBand = 'B1+';

// ---------------------------------------------------------------------------
// band ordering helpers
// ---------------------------------------------------------------------------

/**
 * Band order comes from the calculator's `CASA_LEVEL_SEQUENCE` rather than a
 * second list here, so the test, the cost calculator, and the course pages
 * cannot drift on what "one level up" means.
 */
export const BAND_SEQUENCE: readonly PlacementBand[] = CASA_LEVEL_SEQUENCE;

export function bandIndex(band: PlacementBand): number {
  return BAND_SEQUENCE.indexOf(band);
}

export function isBandAtOrBelow(band: PlacementBand, ceiling: PlacementBand): boolean {
  return bandIndex(band) <= bandIndex(ceiling);
}

/** Steps a band up or down the sequence, clamped at both ends. */
export function shiftBand(band: PlacementBand, steps: number): PlacementBand {
  const next = Math.min(BAND_SEQUENCE.length - 1, Math.max(0, bandIndex(band) + steps));
  return BAND_SEQUENCE[next];
}

export function levelIndex(level: PlacementLevel): number {
  return PLACEMENT_LEVELS.indexOf(level);
}

/** The level a band belongs to. `B1+` is its own level. */
export function levelOfBand(band: PlacementBand): PlacementLevel {
  if (band === 'B1+') return 'B1_PLUS';
  const prefix = band.split('.')[0] as 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  return prefix;
}

/** Asserts at build time that every band maps back to a level. */
const UNMAPPED_BANDS: readonly CasaLevel[] = BAND_SEQUENCE.filter(
  (band) => !BANDS_BY_LEVEL[levelOfBand(band)].includes(band)
);
if (UNMAPPED_BANDS.length > 0) {
  throw new Error(`[placement policy] bands missing from BANDS_BY_LEVEL: ${UNMAPPED_BANDS.join(', ')}`);
}
