/**
 * Server-side access to the item bank, and the one place a client payload is
 * built.
 *
 * SERVER ONLY. Importing this from a `'use client'` module would pull answer
 * keys and listening transcripts into the browser bundle.
 * `__tests__/answer-containment.test.ts` enforces that.
 */

import { LISTENING_AUDIO_AVAILABLE } from '@/config/placement/policy';
import { PLACEMENT_ITEMS } from '@/config/placement/content/items.server';
import { PLACEMENT_MODULES } from '@/config/placement/content/modules.server';
import { PLACEMENT_STIMULI } from '@/config/placement/content/stimuli.server';
import { PLACEMENT_WRITING_PROMPTS } from '@/config/placement/content/production.server';
import type {
  PlacementBand,
  PlacementItem,
  PlacementProductionPrompt,
  PlacementStimulus,
} from './types';

const ITEMS_BY_ID = new Map(PLACEMENT_ITEMS.map((item) => [item.id, item]));
const MODULES_BY_ID = new Map(PLACEMENT_MODULES.map((entry) => [entry.id, entry]));
const STIMULI_BY_ID = new Map(PLACEMENT_STIMULI.map((stimulus) => [stimulus.id, stimulus]));

export function getItem(itemId: string): PlacementItem | null {
  return ITEMS_BY_ID.get(itemId) ?? null;
}

export function getStimulus(stimulusId: string): PlacementStimulus | null {
  return STIMULI_BY_ID.get(stimulusId) ?? null;
}

/** The router module. There is exactly one in v1. */
export const ROUTER_MODULE_ID = 'ROUTER-V1';

export function levelModuleId(level: string): string {
  return `LEVEL-${level === 'B1_PLUS' ? 'B1P' : level}`;
}

/**
 * Whether an item can actually be delivered right now.
 *
 * Listening items are authored and ported but have no recordings yet, so they
 * are withheld rather than degraded. See docs/PLACEMENT_TEST_IMPLEMENTATION.md
 * §6.2 for why showing the transcript instead is not an option.
 */
export function isItemDeliverable(item: PlacementItem): boolean {
  if (item.skill !== 'listening') return true;
  return LISTENING_AUDIO_AVAILABLE;
}

/**
 * The items of a module, in delivery order, minus anything undeliverable.
 *
 * Order is the bank's own: grouped by skill, foundation before stretch within
 * each. That is a deliberate ramp — a learner meeting a module's hardest
 * reading item first would read the whole module as too hard. Items are never
 * shuffled between each other for this reason; only *options within an item*
 * are shuffled.
 */
export function composeModuleItems(moduleId: string): PlacementItem[] {
  const placementModule = MODULES_BY_ID.get(moduleId);
  if (!placementModule) return [];

  return placementModule.itemIds
    .map((itemId) => ITEMS_BY_ID.get(itemId))
    .filter((item): item is PlacementItem => item !== undefined)
    .filter(isItemDeliverable);
}

// ---------------------------------------------------------------------------
// deterministic per-attempt option order
// ---------------------------------------------------------------------------

/**
 * FNV-1a. Small, dependency-free, and good enough for shuffling four options —
 * this is presentation order, not a security boundary.
 */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Mulberry32: deterministic, uniform enough, one line of state. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Option order for one item within one attempt.
 *
 * Derived from `(attemptId, itemId)` rather than stored, so a resumed attempt
 * re-renders identically without a round trip, and a paused attempt cannot be
 * reshuffled into a different question. The order is still recorded on each
 * response, because item analysis has to be able to tell a genuinely tempting
 * distractor from a position effect.
 */
export function optionOrderFor(attemptId: string, item: PlacementItem): string[] | null {
  if (!item.options) return null;

  const keys = item.options.map((option) => option.key);
  const random = seededRandom(hashString(`${attemptId}:${item.id}`));

  // Fisher-Yates.
  for (let index = keys.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [keys[index], keys[swap]] = [keys[swap], keys[index]];
  }

  return keys;
}

/**
 * Token order for `order_tokens` items.
 *
 * The bank stores tokens in their *correct* order, and the review book labels
 * the list "shown in shuffled order" — so shuffling here is required, not
 * cosmetic. Without it the answer is simply the order as printed.
 */
export function tokenOrderFor(attemptId: string, item: PlacementItem): string[] | null {
  if (!item.tokens) return null;

  const ids = item.tokens.map((token) => token.id);
  const random = seededRandom(hashString(`${attemptId}:${item.id}:tokens`));

  for (let index = ids.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [ids[index], ids[swap]] = [ids[swap], ids[index]];
  }

  // A shuffle that lands on the correct order gives the answer away. One
  // rotation is enough to break it and keeps the result deterministic.
  const isIdentity = ids.every((id, index) => id === item.tokens?.[index].id);
  if (isIdentity && ids.length > 1) ids.push(ids.shift() as string);

  return ids;
}

// ---------------------------------------------------------------------------
// production prompts
// ---------------------------------------------------------------------------

/**
 * Picks the writing prompt for a band.
 *
 * Deterministic per attempt so a refresh cannot hand the learner a different
 * task mid-write. Prompts are level-targeted; `B1+` has its own set.
 */
export function writingPromptFor(
  attemptId: string,
  band: PlacementBand
): PlacementProductionPrompt | null {
  const candidates = PLACEMENT_WRITING_PROMPTS.filter((prompt) => prompt.bands.includes(band));
  if (candidates.length === 0) return null;

  const index = hashString(`${attemptId}:writing`) % candidates.length;
  return candidates[index];
}

/*
 * There is deliberately no `speakingPromptFor` here yet.
 *
 * The 12 speaking prompts are ported and asserted by the bank tests, but v1
 * satisfies the B1+ speaking requirement through a teacher conversation rather
 * than an in-browser recording (docs/PLACEMENT_TEST_IMPLEMENTATION.md §5), and
 * the staff surface that would hand a teacher their prompt lives in the CASA
 * dashboard workspace, not here. A selector with no caller is a claim that
 * something is wired up when it is not.
 */
