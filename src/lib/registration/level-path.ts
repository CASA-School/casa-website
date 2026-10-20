/**
 * A LEARNING PATH THROUGH THE LEVELS (2026-10-05).
 *
 * Agencies, and many learners, book several levels in a row: A2 to B2 is three
 * whole levels, one intensive term each. Rather than adding the terms by hand,
 * the learner picks where to stop ("bis B2") and the path follows: every next
 * level in the first term that starts after the previous one ends, with B1+
 * between B1 and B2, as the intensive course runs. Continuing past a level
 * means finishing it, so a path that starts at its first half (A2.1) starts
 * with the whole level (A2 komplett); one that starts at a second half runs
 * that four-week block first. A term the catalogue does not
 * list yet is a step without a date, which CASA plans with the learner.
 *
 * The wizard shows the path from here and the route stores it from here, so
 * what the learner saw is what staff receive; the workspace's offers build a
 * learner's course from it too, over its own cohorts. Client-safe.
 */
import { isSecondHalf } from './halves';
import type { ContentLocale, CourseRegistrationOption } from '@/lib/content/types';
import { describeBookedLevel, levelChoiceGroups, levelOf } from './levels';

/** A term as the path needs it: its dates. A registration option, or a workspace cohort. */
export type PathTerm = { startDate: string; endDate: string; secondHalfStart?: string | null };

export type PathStep<T extends PathTerm = CourseRegistrationOption> = {
  /** 'B1' for a whole level, 'A2.2' for a four-week block. */
  level: string;
  label: string;
  startCode: string;
  complete: boolean;
  /** Weeks of teaching: eight for a whole level, four for a half level. */
  weeks: number;
  /** The term; null when the catalogue lists none yet. */
  option: T | null;
  start: string | null;
  end: string | null;
};

const dayMs = 24 * 60 * 60 * 1000;
const addDays = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * dayMs).toISOString().slice(0, 10);

/*
 * The rungs a path climbs: each whole level, B1+ among them between B1 and B2
 * (Rahman, 2026-10-07: a learner going on from B1 to B2 takes it in between).
 */
function pathRungs(slug: string | undefined, availableLevels: readonly string[]): string[] {
  return levelChoiceGroups(slug, availableLevels, 'de')
    .filter((group) => group.choices.some((choice) => choice.value === group.level))
    .map((group) => group.level);
}

/** The rungs a learner can continue to after `value`: after 'A2' or 'A2.2', ['B1', 'B1+', 'B2', 'C1']. */
export function continuationLevels(slug: string | undefined, value: string, availableLevels: readonly string[]): string[] {
  const rungs = pathRungs(slug, availableLevels);
  const index = rungs.indexOf(rungs.includes(value) ? value : levelOf(value));
  return index >= 0 ? rungs.slice(index + 1) : [];
}

/** The learner's level, then each rung up to `pathTo` (whole levels), each in the first term after the last. */
export function buildLevelPath<T extends PathTerm = CourseRegistrationOption>(input: {
  slug: string | undefined;
  /** The level chosen: 'A2', 'A2.1', 'B1+.2'. */
  value: string;
  option: T;
  /** The format's terms. */
  options: readonly T[];
  availableLevels: readonly string[];
  /** A rung from `continuationLevels` (a whole level), or '' for this level alone. */
  pathTo: string;
  locale: ContentLocale;
}): PathStep<T>[] {
  const { slug, option, availableLevels, locale } = input;
  const targets = input.pathTo ? continuationLevels(slug, input.value, availableLevels) : [];
  const stop = targets.indexOf(input.pathTo);
  // Going on past a first half means finishing its level.
  const value = stop >= 0 && /\.1$/.test(input.value) ? levelOf(input.value) : input.value;
  const first = describeBookedLevel(slug, value, availableLevels, locale);
  if (!first) return [];

  // A step of eight weeks fills its term; a half level ends after four weeks.
  const endIn = (term: T, weeks: number) => (weeks >= 8 ? term.endDate : addDays(term.startDate, 25));
  // A second half runs from its own first day to the term's end (lib/registration/halves).
  const secondHalf = !first.complete && isSecondHalf(first.startCode);
  const firstStart = secondHalf ? option.secondHalfStart ?? option.startDate : option.startDate;
  const firstEnd = secondHalf ? option.endDate : endIn(option, first.weeks);
  const steps: PathStep<T>[] = [{ level: value, label: first.label, startCode: first.startCode, complete: first.complete, weeks: first.weeks, option, start: firstStart, end: firstEnd }];
  if (stop < 0) return steps;

  const terms = [...input.options].sort((a, b) => a.startDate.localeCompare(b.startDate));
  let previousEnd: string | null = firstEnd;
  for (const level of targets.slice(0, stop + 1)) {
    const booked = describeBookedLevel(slug, level, availableLevels, locale);
    if (!booked) break;
    const term: T | null = previousEnd ? terms.find((candidate) => candidate.startDate > previousEnd!) ?? null : null;
    const end: string | null = term ? endIn(term, booked.weeks) : null;
    steps.push({ level, label: booked.label, startCode: booked.startCode, complete: booked.complete, weeks: booked.weeks, option: term, start: term?.startDate ?? null, end });
    previousEnd = end;
  }
  return steps;
}

/** Weeks of teaching in a path. */
export const pathWeeks = (steps: readonly PathStep<PathTerm>[]) => steps.reduce((total, step) => total + step.weeks, 0);
