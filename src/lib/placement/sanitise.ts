/**
 * The one bridge from authoring records to client payloads.
 *
 * Every field that reaches a browser passes through here. The functions build
 * their output field by field rather than spreading and deleting, because a
 * spread plus a delete list silently ships whatever field the next upstream
 * revision adds — and the field it would ship is an answer key.
 *
 * `ClientItem` and `ClientStimulus` have no property capable of holding a key
 * or a transcript, so the compiler is the second line of defence and this file
 * is the first.
 *
 * See docs/PLACEMENT_TEST_IMPLEMENTATION.md §7.
 */

import type {
  ClientItem,
  ClientStimulus,
  PlacementItem,
  PlacementStimulus,
} from './types';

/**
 * Field names that must never appear in a client payload. Asserted by
 * `__tests__/answer-containment.test.ts` against real sanitiser output, so the
 * guard tests behaviour rather than restating intent.
 */
export const FORBIDDEN_CLIENT_FIELDS = [
  'answer',
  'accepted',
  'optionKey',
  'transcript',
  'recordingDirection',
  'construct',
  'credit',
  'correct',
] as const;

export function sanitiseStimulus(stimulus: PlacementStimulus): ClientStimulus {
  if (stimulus.kind === 'reading') {
    return {
      id: stimulus.id,
      kind: 'reading',
      title: stimulus.title,
      text: stimulus.text,
    };
  }

  // The transcript and the recording direction stop here. The browser gets a
  // URL and a play cap, nothing that reveals what is said.
  return {
    id: stimulus.id,
    kind: 'listening',
    title: stimulus.title,
    audioUrl: stimulus.audioPath,
    maxPlays: stimulus.maxPlays,
  };
}

/**
 * Builds the client view of an item.
 *
 * `optionOrder` and `tokenOrder` are the attempt's snapshot (see
 * `content.server.ts`); passing them in rather than deriving them here keeps
 * this module free of attempt state and therefore trivially testable.
 *
 * `construct` is dropped even though it is not an answer: "accusative after
 * brauchen" tells a learner exactly which of four options to pick.
 */
export function sanitiseItem(
  item: PlacementItem,
  options: {
    stimulus: PlacementStimulus | null;
    optionOrder: readonly string[] | null;
    tokenOrder: readonly string[] | null;
  }
): ClientItem {
  const orderedOptions = (() => {
    if (!item.options) return null;
    if (!options.optionOrder) return item.options.map(({ key, text }) => ({ key, text }));

    const byKey = new Map(item.options.map((option) => [option.key, option]));
    return options.optionOrder
      .map((key) => byKey.get(key))
      .filter((option): option is (typeof item.options)[number] => option !== undefined)
      .map(({ key, text }) => ({ key, text }));
  })();

  const orderedTokens = (() => {
    if (!item.tokens) return null;
    if (!options.tokenOrder) return item.tokens.map(({ id, text }) => ({ id, text }));

    const byId = new Map(item.tokens.map((token) => [token.id, token]));
    return options.tokenOrder
      .map((id) => byId.get(id))
      .filter((token): token is (typeof item.tokens)[number] => token !== undefined)
      .map(({ id, text }) => ({ id, text }));
  })();

  return {
    id: item.id,
    skill: item.skill,
    responseType: item.responseType,
    prompt: item.prompt,
    stimulus: options.stimulus ? sanitiseStimulus(options.stimulus) : null,
    options: orderedOptions,
    // Blank options are choices the learner picks between, not a key. Which of
    // them is right lives only in `item.answer`, which is not read here.
    blanks: item.blanks
      ? item.blanks.map((blank) => ({
          id: blank.id,
          options: blank.options.map(({ key, text }) => ({ key, text })),
        }))
      : null,
    tokens: orderedTokens,
    matching: item.matching
      ? {
          left: item.matching.left.map(({ id, text }) => ({ id, text })),
          // Right-hand rows are shuffled by the client's own render order in
          // the bank as authored; order here is the authored one, which for a
          // 2x2 match is not a giveaway.
          right: item.matching.right.map(({ id, text }) => ({ id, text })),
        }
      : null,
    inputConstraints: item.inputConstraints
      ? {
          maxLength: item.inputConstraints.maxLength,
          inputMode: item.inputConstraints.inputMode,
          spellcheck: item.inputConstraints.spellcheck,
          allowNotKnown: item.inputConstraints.allowNotKnown,
        }
      : null,
  };
}

/**
 * Recursively checks a payload for forbidden field names.
 *
 * Exported so the API layer can assert on its own responses in development and
 * so the containment test can run it over real output.
 */
export function findForbiddenFields(payload: unknown, path = '$'): string[] {
  if (payload === null || typeof payload !== 'object') return [];

  if (Array.isArray(payload)) {
    return payload.flatMap((entry, index) => findForbiddenFields(entry, `${path}[${index}]`));
  }

  const found: string[] = [];
  for (const [key, value] of Object.entries(payload)) {
    if ((FORBIDDEN_CLIENT_FIELDS as readonly string[]).includes(key)) {
      found.push(`${path}.${key}`);
    }
    found.push(...findForbiddenFields(value, `${path}.${key}`));
  }

  return found;
}

/**
 * Client view of a production prompt.
 *
 * `reviewFocus` is stripped: it is reviewer shorthand ("basic_sentence_control",
 * "source_integration") that tells a learner which criteria to perform to rather
 * than what to write, and it is the vocabulary of the rubric, not the task.
 */
export type ClientProductionPrompt = {
  id: string;
  title: string;
  instruction: string;
  requiredContent: readonly string[];
  sourceText: string | null;
  suggestedWords: { min: number; max: number } | null;
};

export function sanitiseProductionPrompt(prompt: {
  id: string;
  title: string;
  instruction: string;
  requiredContent: readonly string[];
  sourceText: string | null;
  suggestedWords?: { min: number; max: number };
}): ClientProductionPrompt {
  return {
    id: prompt.id,
    title: prompt.title,
    instruction: prompt.instruction,
    requiredContent: prompt.requiredContent,
    sourceText: prompt.sourceText,
    suggestedWords: prompt.suggestedWords ?? null,
  };
}
