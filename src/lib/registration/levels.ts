/**
 * THE LEVEL A LEARNER BOOKS (2026-10-05).
 *
 * The form asked for "Ihr aktuelles Niveau" from the half levels a course runs
 * (A1.1, A1.2, …). CASA sells the intensive course by the half level
 * (Teilniveau, 4 weeks) or by the whole level (komplettes Niveau, 8 weeks: one
 * term, which is why its dates run eight weeks), so the intensive course now
 * offers both: "A1 komplett" beside A1.1 and A1.2. The other formats keep their
 * half levels. The wizard builds its choices here and the route checks and
 * labels a submitted value here, so staff read the choice the learner made.
 *
 * Client-safe: no server imports.
 */
import { CASA_LEVEL_SEQUENCE } from '@/config/calculator/pricing';
import type { ContentLocale } from '@/lib/content/types';

/** Formats CASA sells by the half level or the whole level. */
const SOLD_BY_LEVEL = new Set(['intensive-german']);

/** Formats whose every term is half a level (the evening course: A1.1 in about 3½ months, then A1.2). */
const TERM_IS_HALF_LEVEL = new Set(['evening-german']);

/** Whether a term of this format teaches half a level, so a learner books a half (A1.1), not a whole level. */
export const termIsHalfLevel = (slug: string | undefined) => Boolean(slug && TERM_IS_HALF_LEVEL.has(slug));

/** Whether a format is sold by the half level, so a learner can start at a term's second half. */
export const soldByLevel = (slug: string | undefined) => Boolean(slug && SOLD_BY_LEVEL.has(slug));

/*
 * B1+ is the level between B1 and B2, taught with Kontext, and sold like every
 * other: the whole level, or its halves B1+.1 and B1+.2 (Rahman, 2026-10-13:
 * "B1+ is the same as the other intensive courses"). A half level runs four
 * weeks, a whole level eight.
 */

/**
 * The half levels a start offers (Rahman, 2026-10-21: „in the evening we don't have the B1+ course, you
 * are not getting the right data"). From what the start runs (`levels`, its courses as SchoolMan and the
 * workspace plan them): an intensive start runs a level's first half and teaches both, so A2.1 offers A2.1
 * and A2.2; an evening start offers exactly its halves. Where a start has nothing planned yet, what the
 * format runs on its other starts (`formatLevels`), else the range the format is set up for (`fallback`).
 */
export function offeredLevels(slug: string | undefined, levels: readonly string[] | undefined, formatLevels: readonly string[], fallback: readonly string[]): string[] {
  const codes = levels?.length ? levels : formatLevels.length ? formatLevels : null;
  if (!codes) return [...fallback];
  const offered = soldByLevel(slug) ? codes.flatMap((code) => [`${levelOf(code)}.1`, `${levelOf(code)}.2`]) : [...codes];
  return CASA_LEVEL_SEQUENCE.filter((code) => offered.includes(code));
}

/** The level a code belongs to: 'B2.1' → 'B2', 'B1+.2' → 'B1+', 'B1+' → 'B1+'. */
export const levelOf = (code: string) => (code.includes('.') ? code.slice(0, code.lastIndexOf('.')) : code);
const weeksOf = (whole: boolean) => (whole ? 8 : 4);

export type LevelChoice = {
  value: string;
  label: string;
};

export type LevelChoiceGroup = {
  /** 'A1', 'B1', … */
  level: string;
  choices: LevelChoice[];
};

export type BookedLevel = {
  /** What staff and the learner read, e.g. "A1 komplett · 8 Wochen". */
  label: string;
  /** The half level the learner starts at, the code the workspace stores. */
  startCode: string;
  /** The whole level: both halves. */
  complete: boolean;
  /** Weeks of teaching: eight for a whole level, four for a half level. */
  weeks: number;
};

const weeks = (count: number, locale: ContentLocale) => (locale === 'de' ? `${count} Wochen` : `${count} weeks`);

/** The levels a format offers, grouped by level, the whole level first where the format sells one. */
export function levelChoiceGroups(
  slug: string | undefined,
  availableLevels: readonly string[],
  locale: ContentLocale
): LevelChoiceGroup[] {
  const byLevel = soldByLevel(slug);
  const groups = new Map<string, string[]>();

  for (const half of availableLevels) {
    const level = levelOf(half);
    groups.set(level, [...(groups.get(level) ?? []), half]);
  }

  return [...groups].map(([level, halves]) => {
    const first = `${level}.1`;
    const second = `${level}.2`;
    const whole = byLevel && halves.includes(first) && halves.includes(second)
      ? [{
          value: level,
          // "komplett" says both halves; the codes beside it only repeated the group.
          label: `${level} ${locale === 'de' ? 'komplett' : 'complete'} · ${weeks(8, locale)}`,
        }]
      : [];

    return {
      level,
      choices: [
        ...whole,
        ...halves.map((half) => ({ value: half, label: byLevel ? `${half} · ${weeks(weeksOf(false), locale)}` : half })),
      ],
    };
  });
}

/** A submitted level, if the format offers it: its label, the half level it starts at, and whether it is whole. */
export function describeBookedLevel(
  slug: string | undefined,
  value: string,
  availableLevels: readonly string[],
  locale: ContentLocale
): BookedLevel | null {
  for (const group of levelChoiceGroups(slug, availableLevels, locale)) {
    const choice = group.choices.find((candidate) => candidate.value === value);
    if (choice) {
      const complete = choice.value === group.level;
      return { label: choice.label, startCode: complete ? `${group.level}.1` : choice.value, complete, weeks: weeksOf(complete) };
    }
  }
  return null;
}
