/**
 * A group enquiry's brief, read as the start of an offer. Pure.
 *
 * The public groups form stores machine tokens (`half-board-plus-canteen`,
 * `14-17`) precisely so a brief can be handed to the price model without a
 * translation layer (src/lib/validation/contact.ts). This is that hand-over.
 * Whatever the organiser left as "undecided" keeps the builder's default; the
 * free-text preferred dates stay text, shown beside the dates rather than
 * guessed into them.
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
  const c: StayChoices = { ...DEFAULT_STAY };
  const weeks = num(brief, 'durationWeeks');
  if (weeks) c.weeks = Math.min(weeks, 52);
  const lessons = num(brief, 'weeklyLessons');
  if (lessons) c.lessonsPerWeek = Math.min(lessons, 60);

  const accommodation = str(brief, 'accommodation');
  if (accommodation === 'not-needed') c.accommodation = false;
  if (accommodation === 'double' || accommodation === 'single') c.room = accommodation;

  const meals = str(brief, 'meals');
  if (meals === 'half-board' || meals === 'not-needed') c.canteen = false;
  if (meals === 'half-board-plus-canteen') c.canteen = true;

  const transport = str(brief, 'transport');
  if (transport === 'not-needed') c.transit = false;
  if (transport === 'weekly' || transport === 'monthly') c.transit = true;

  const culture = str(brief, 'cultureProgramme');
  if (culture === 'not-needed') c.culture = 'none';
  if (culture === 'small' || culture === 'medium' || culture === 'large') c.culture = culture;

  // A pupil's ticket is for pupils. An older or mixed group travels on the
  // adult fare, which never under-charges.
  const age = str(brief, 'ageBand');
  if (age) c.fare = age === 'under-14' || age === '14-17' ? 'student' : 'adult';

  return c;
}

export function participantsFromBrief(brief: Brief): number | null {
  return num(brief, 'groupSize');
}
