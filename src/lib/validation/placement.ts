/**
 * Request validation for the placement API.
 *
 * Every route handler parses its body through one of these before touching the
 * engine, per the repository's API convention. The response-value union mirrors
 * `PlacementResponseValue` and is validated structurally rather than trusted:
 * a client could otherwise post a `matching` payload for a `single_choice`
 * item, and a malformed shape reaching the scorer is a scoring bug, not a 400.
 *
 * Safe on the client — this validates learner input, not answer keys.
 */

import * as z from 'zod';

import { INTAKE_QUESTIONS } from '@/config/placement/intake';

const optionKey = z.string().min(1).max(8);
const itemId = z.string().min(1).max(64);

/** Caps mirror the bank: four options, four tokens, two matching rows. */
export const placementResponseValueSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('single_choice'), optionKey }),
  z.object({ type: z.literal('multiple_choice'), optionKeys: z.array(optionKey).min(1).max(8) }),
  // maxLength on the widest typed-recall item is 40; 200 leaves room for a
  // future item without letting a client post a paragraph into a one-word slot.
  z.object({ type: z.literal('short_text'), text: z.string().max(200) }),
  z.object({
    type: z.literal('inline_cloze'),
    blanks: z.array(z.object({ blankId: z.string().min(1).max(8), optionKey })).min(1).max(6),
  }),
  z.object({ type: z.literal('order_tokens'), order: z.array(z.string().min(1).max(8)).min(2).max(8) }),
  z.object({
    type: z.literal('matching'),
    pairs: z
      .array(z.object({ leftId: z.string().min(1).max(8), rightId: z.string().min(1).max(8) }))
      .min(1)
      .max(8),
  }),
  z.object({ type: z.literal('not_known') }),
  z.object({ type: z.literal('skipped') }),
]);

/**
 * Intake options are derived from the question config rather than restated, so
 * adding an option cannot leave the validator rejecting a value the form offers.
 */
function optionValues(questionId: (typeof INTAKE_QUESTIONS)[number]['id']) {
  const question = INTAKE_QUESTIONS.find((candidate) => candidate.id === questionId);
  if (!question) throw new Error(`[placement validation] unknown intake question ${questionId}`);
  return question.options.map((option) => option.value) as [string, ...string[]];
}

export const placementIntakeSchema = z.object({
  priorLearning: z.enum(optionValues('priorLearning')),
  goal: z.enum(optionValues('goal')),
  lastContact: z.enum(optionValues('lastContact')),
});

export const startAttemptSchema = z.object({
  locale: z.enum(['en', 'de']),
  intake: placementIntakeSchema,
});

export const resumeAttemptSchema = z.object({
  token: z.string().min(16).max(128),
});

export const saveResponseSchema = z.object({
  token: z.string().min(16).max(128),
  itemId,
  value: placementResponseValueSchema,
});

export const submitAttemptSchema = z.object({
  token: z.string().min(16).max(128),
  /** Set by the client when it could not deliver an item (audio failure, etc.). */
  technicalProblem: z.boolean().optional(),
  /** Set when the learner skipped the writing task or it failed to store. */
  productionIncomplete: z.boolean().optional(),
});

export const submitWritingSchema = z.object({
  token: z.string().min(16).max(128),
  promptId: z.string().min(1).max(64),
  // C1 tasks suggest 220–290 words; 6000 characters is generous headroom while
  // still bounding what a single request can store.
  text: z.string().min(1).max(6000),
});

export type PlacementIntakeInput = z.infer<typeof placementIntakeSchema>;
export type SaveResponseInput = z.infer<typeof saveResponseSchema>;
