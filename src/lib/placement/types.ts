/**
 * Placement-test domain types.
 *
 * Two vocabularies live here and the split is load-bearing:
 *
 *  - `Placement*` types describe the *authoring* record. They carry answer keys
 *    and listening transcripts and are only ever read on the server.
 *  - `Client*` types describe what a browser is allowed to see. They have no
 *    field that could hold a key, so leaking one is a type error rather than a
 *    review miss. `sanitise.ts` is the only bridge between the two.
 *
 * See docs/PLACEMENT_TEST_IMPLEMENTATION.md §7.
 */

import type { CasaLevel } from '@/config/calculator/pricing';

/** The 11 CASA placement bands, e.g. `A1.1`, `B1+`, `C1.2`. */
export type PlacementBand = CasaLevel;

/** The coarse level a band belongs to. Matches the item bank's `level` field. */
export type PlacementLevel = 'A1' | 'A2' | 'B1' | 'B1_PLUS' | 'B2' | 'C1';

/** What an item measures. `language_use` is the bank's term for Sprachbausteine. */
export type PlacementSkill = 'language_use' | 'reading' | 'listening';

/**
 * Where an item sits inside its module.
 *
 * `foundation` evidences the level itself, `stretch` the upper half-band. In a
 * boundary module `lower_exit` and `upper_entry` name the two sides of the edge
 * being resolved.
 */
export type PlacementStage = 'router' | 'foundation' | 'stretch' | 'lower_exit' | 'upper_entry';

export type PlacementModuleKind = 'router' | 'level' | 'boundary';

export type PlacementResponseType =
  | 'single_choice'
  | 'multiple_choice'
  | 'short_text'
  | 'inline_cloze'
  | 'order_tokens'
  | 'matching';

// ---------------------------------------------------------------------------
// authoring records (server only)
// ---------------------------------------------------------------------------

export type PlacementOption = { key: string; text: string };

export type PlacementBlank = { id: string; options: readonly PlacementOption[] };

export type PlacementToken = { id: string; text: string };

export type PlacementMatchingSides = {
  left: readonly PlacementToken[];
  right: readonly PlacementToken[];
};

export type PlacementInputConstraints = {
  maxLength: number;
  inputMode: string;
  spellcheck: boolean;
  /**
   * Whether the learner may declare they do not know the answer. Typed recall
   * without this invites guessing noise, which is worse than a clean blank for
   * a placement decision.
   */
  allowNotKnown: boolean;
};

export type PlacementAnswerKey =
  | { type: 'single_choice'; optionKey: string }
  | { type: 'multiple_choice'; optionKeys: readonly string[] }
  | { type: 'short_text'; accepted: readonly string[] }
  | { type: 'inline_cloze'; blanks: readonly { blankId: string; optionKey: string }[] }
  | { type: 'order_tokens'; order: readonly string[] }
  | { type: 'matching'; pairs: readonly { leftId: string; rightId: string }[] };

export type PlacementItem = {
  id: string;
  moduleId: string;
  level: PlacementLevel;
  band: PlacementBand;
  stage: PlacementStage;
  skill: PlacementSkill;
  responseType: PlacementResponseType;
  /** What the item is testing, in reviewer shorthand. Never shown to learners. */
  construct: string;
  stimulusId: string | null;
  prompt: string;
  options: readonly PlacementOption[] | null;
  blanks: readonly PlacementBlank[] | null;
  tokens: readonly PlacementToken[] | null;
  matching: PlacementMatchingSides | null;
  inputConstraints: PlacementInputConstraints | null;
  answer: PlacementAnswerKey;
  tags: readonly string[];
};

export type PlacementReadingStimulus = {
  id: string;
  kind: 'reading';
  title: string;
  text: string;
};

export type PlacementListeningStimulus = {
  id: string;
  kind: 'listening';
  title: string;
  audioPath: string;
  maxPlays: number;
  /** Protected. Never sanitised into a client payload. */
  transcript: string;
  /** Direction for the voice talent. Internal production note. */
  recordingDirection: string | null;
};

export type PlacementStimulus = PlacementReadingStimulus | PlacementListeningStimulus;

export type PlacementModule = {
  id: string;
  title: string;
  kind: PlacementModuleKind;
  stages: readonly PlacementStage[];
  itemIds: readonly string[];
};

export type PlacementProductionPrompt = {
  id: string;
  kind: 'writing' | 'speaking';
  title: string;
  targetLevel: PlacementLevel;
  bands: readonly PlacementBand[];
  instruction: string;
  requiredContent: readonly string[];
  /** Only C1 and some B2 writing tasks supply source positions to synthesise. */
  sourceText: string | null;
  reviewFocus: readonly string[];
  suggestedWords?: { min: number; max: number };
  preparationSeconds?: number;
  responseSeconds?: number;
};

export type PlacementRubricCriterion = {
  key: string;
  label: string;
  /** Band descriptors 0–4. */
  descriptors: Record<number, string>;
};

export type PlacementRubric = {
  id: string;
  version: number;
  criteria: readonly PlacementRubricCriterion[];
};

// ---------------------------------------------------------------------------
// learner responses
// ---------------------------------------------------------------------------

/**
 * What the learner sent back. Shapes mirror the response types, plus the
 * explicit `not_known` that typed recall allows and the `skipped` an autosave
 * records when a learner moves on without answering.
 */
export type PlacementResponseValue =
  | { type: 'single_choice'; optionKey: string }
  | { type: 'multiple_choice'; optionKeys: readonly string[] }
  | { type: 'short_text'; text: string }
  | { type: 'inline_cloze'; blanks: readonly { blankId: string; optionKey: string }[] }
  | { type: 'order_tokens'; order: readonly string[] }
  | { type: 'matching'; pairs: readonly { leftId: string; rightId: string }[] }
  | { type: 'not_known' }
  | { type: 'skipped' };

export type PlacementResponse = {
  itemId: string;
  value: PlacementResponseValue;
  /**
   * The option order this learner actually saw. Snapshotted per attempt so a
   * later reshuffle cannot reinterpret an old answer, and so item analysis can
   * separate a real distractor from a position effect.
   */
  optionOrder: readonly string[] | null;
  answeredAt: string;
};

/**
 * Per-item outcome. `partial` exists because compound items (cloze pairs,
 * matching, token order) can be half right, and throwing that away would
 * discard the most diagnostic evidence the bank produces.
 */
export type PlacementItemScore = {
  itemId: string;
  skill: PlacementSkill;
  stage: PlacementStage;
  band: PlacementBand;
  level: PlacementLevel;
  /** 0..1. */
  credit: number;
  correct: boolean;
  answered: boolean;
};

// ---------------------------------------------------------------------------
// client-facing shapes (no keys, no transcripts)
// ---------------------------------------------------------------------------

export type ClientStimulus =
  | { id: string; kind: 'reading'; title: string; text: string }
  | { id: string; kind: 'listening'; title: string; audioUrl: string; maxPlays: number };

export type ClientItem = {
  id: string;
  skill: PlacementSkill;
  responseType: PlacementResponseType;
  prompt: string;
  stimulus: ClientStimulus | null;
  /** Already shuffled for this attempt; the order is the snapshot. */
  options: readonly PlacementOption[] | null;
  blanks: readonly PlacementBlank[] | null;
  tokens: readonly PlacementToken[] | null;
  matching: PlacementMatchingSides | null;
  inputConstraints: PlacementInputConstraints | null;
};

/**
 * Named phases of the attempt. The learner sees these, not an item count — the
 * count is adaptive, so any number shown up front would be wrong.
 */
export type PlacementPhase =
  | 'intake'
  | 'router'
  | 'level'
  | 'boundary'
  | 'writing'
  | 'complete';

export type PlacementAttemptStatus = 'in_progress' | 'submitted' | 'abandoned';

/** What the runner needs to render the current screen. */
export type ClientAttemptState = {
  attemptId: string;
  /** Opaque resume token. Also the result URL segment. */
  token: string;
  status: PlacementAttemptStatus;
  phase: PlacementPhase;
  /** 1-based position inside the current phase, for the phase rail only. */
  positionInPhase: number;
  itemsInPhase: number;
  item: ClientItem | null;
  /** Answers already recorded, so a resumed attempt re-renders its state. */
  answeredItemIds: readonly string[];
  locale: 'en' | 'de';
};
