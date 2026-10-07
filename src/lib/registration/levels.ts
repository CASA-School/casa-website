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
import type { ContentLocale } from '@/lib/content/types';

/** Formats CASA sells by the half level or the whole level. */
const SOLD_BY_LEVEL = new Set(['intensive-german']);

/*
 * B1+ is one step between B1.2 and B2.1, taught with Kontext, but it runs a
 * whole term: about two months, like a full level (Rahman, 2026-08-13; see
 * docs/COURSE_FACTS_SOURCE_OF_TRUTH.md). A half level runs four weeks.
 */
const FULL_TERM_STEPS = new Set(['B1+']);
const weeksOf = (value: string, whole: boolean) => (whole || FULL_TERM_STEPS.has(value) ? 8 : 4);

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
  /** Weeks of teaching: eight for a whole level or B1+, four for a half level. */
  weeks: number;
};

const weeks = (count: number, locale: ContentLocale) => (locale === 'de' ? `${count} Wochen` : `${count} weeks`);

/** The levels a format offers, grouped by level, the whole level first where the format sells one. */
export function levelChoiceGroups(
  slug: string | undefined,
  availableLevels: readonly string[],
  locale: ContentLocale
): LevelChoiceGroup[] {
  const soldByLevel = Boolean(slug && SOLD_BY_LEVEL.has(slug));
  const groups = new Map<string, string[]>();

  for (const half of availableLevels) {
    // 'B1+' belongs with B1.
    const level = half.slice(0, 2);
    groups.set(level, [...(groups.get(level) ?? []), half]);
  }

  return [...groups].map(([level, halves]) => {
    const first = `${level}.1`;
    const second = `${level}.2`;
    const whole = soldByLevel && halves.includes(first) && halves.includes(second)
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
        ...halves.map((half) => ({ value: half, label: soldByLevel ? `${half} · ${weeks(weeksOf(half, false), locale)}` : half })),
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
      return { label: choice.label, startCode: complete ? `${group.level}.1` : choice.value, complete, weeks: weeksOf(choice.value, complete) };
    }
  }
  return null;
}
