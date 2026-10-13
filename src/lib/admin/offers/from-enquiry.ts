/**
 * A group enquiry's brief, read as the start of an offer. Pure.
 *
 * The public groups form stores machine tokens (`half-board-plus-canteen`,
 * `not-needed`) so a brief can be handed on without a translation layer
 * (src/lib/validation/contact.ts). This is that hand-over, onto the packages
 * of the groups page: a group that takes everything for one week is Hahn, for
 * two weeks Katze; a group that leaves a block out, or stays longer, builds its
 * own — Esel, with those blocks switched off. The free-text preferred dates stay
 * text, shown beside the dates rather than guessed into them.
 */

import { DEFAULT_STAY, type StayChoices } from './types';

type Brief = Record<string, unknown> | null | undefined;

const str = (brief: Brief, key: string) => (typeof brief?.[key] === 'string' ? (brief[key] as string) : null);
const num = (brief: Brief, key: string) => {
  const v = brief?.[key];
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

export function choicesFromBrief(brief: Brief): StayChoices {
  const weeks = Math.min(num(brief, 'durationWeeks') ?? DEFAULT_STAY.weeks, 52);
  const modules = {
    ...DEFAULT_STAY.modules,
    accommodation: str(brief, 'accommodation') !== 'not-needed',
    lunch: str(brief, 'meals') !== 'not-needed' && str(brief, 'meals') !== 'half-board',
    transport: str(brief, 'transport') !== 'not-needed',
  };
  const everything = modules.accommodation && modules.lunch && modules.transport;
  const pkg = everything && weeks === 1 ? 'hahn' : everything && weeks === 2 ? 'katze' : 'esel';
  return { ...DEFAULT_STAY, package: pkg, weeks, modules };
}

export function participantsFromBrief(brief: Brief): number | null {
  return num(brief, 'groupSize');
}
