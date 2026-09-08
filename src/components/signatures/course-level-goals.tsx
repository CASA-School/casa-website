import { levelKeyFromLabel, levelTokens } from '@/config/brand/tokens';
import { cn } from '@/lib/utils';

type LevelGoalItem = {
  level: string;
  textbook: 'netzwerk' | 'kontext';
  focus: string;
};

/**
 * A filled CEFR chip on the sequential level ramp.
 *
 * `ink` is stored per step rather than assumed white: the ramp crosses over
 * between B1+ and B2, so A1–B1+ carry dark ink and only B2/C1 carry white.
 * These chips previously used one flat colour for every level, which threw away
 * the ordering the ramp exists to show. Falls back to the class-based
 * `--casa-accent-surface` fill when a label is not a CEFR level.
 */
function levelChipStyle(label: string) {
  const key = levelKeyFromLabel(label);
  if (!key) {
    return undefined;
  }

  return { background: levelTokens[key].surface, color: levelTokens[key].ink };
}

type CourseLevelGoalsProps = {
  title: string;
  description: string;
  levels: LevelGoalItem[];
  practices: string[];
  practiceTitle?: string;
  locale: 'en' | 'de';
};

/**
 * What a learner can do at each CEFR level of this course.
 *
 * WHY THIS WAS REBUILT — a sequence was drawn as two parallel columns.
 *
 * The levels used to sit in two side-by-side lists split by a vertical rule:
 * A1, A2, B1 on the left and B2, C1 on the right, one column per textbook
 * series. Two columns side by side read as two CATEGORIES to compare. These are
 * not categories — they are one ladder, and the single thing a reader is doing
 * here is finding the rung they are on and seeing what the next one asks. The
 * layout made the eye jump A1→A2→B1, back up and across, then B2→C1, which
 * breaks the exact progression the CEFR colour ramp exists to show.
 *
 * It is one vertical sequence now, top to bottom, A1 through C1. The textbook is
 * a group heading beside its own rows rather than a column of its own, so the
 * grouping is still legible and the width still gets used — but the order is
 * never interrupted.
 *
 * AND THE HEADER NO LONGER MAKES AN L. "What you will practice" was a tinted
 * box in the top-right corner, opposite a two-line description. Because the box
 * was taller than the text beside it, the section opened with a block of empty
 * space under the description and the reader met the void before the content.
 * The header is full width at reading measure now, and the practice list moved
 * to the end — which is also the better reading order: what each level asks of
 * you, and then what you will be doing to get there.
 *
 * NO CARD, AND NO CARDS INSIDE IT — the earlier pass's rule, kept. This was a
 * rounded panel with a border AND a shadow containing two more rounded panels
 * each with a border AND a shadow. Measured on a course detail page: 15
 * card-like blocks, 7 carrying both a hairline and an elevation, 5 nested inside
 * another card, three different radii. The structure lives in type and
 * hairlines; the one tinted block on the section is the practice list, because
 * that is the single thing here that should catch the eye.
 */
export function CourseLevelGoals({
  title,
  description,
  levels,
  practices,
  practiceTitle = 'What you will practice',
  locale = 'en',
}: CourseLevelGoalsProps) {
  const netzwerkLevels = levels.filter((l) => l.textbook === 'netzwerk');
  const kontextLevels = levels.filter((l) => l.textbook === 'kontext');

  /*
   * The range in each label is THIS COURSE'S levels, not the Klett series'.
   *
   * These were hard-coded as "(A1 – B1)" and "(B1+ – C1)", which are the ranges
   * the two textbook series cover. On a course that covers all of them that reads
   * correctly. On Bildungszeit — B1 upward, and the one format on the site that
   * is not open at A1 — the page announced "Netzwerk Textbook (A1 – B1)" directly
   * above a single B1 row, which is the series' range being read as the course's.
   * German for Medical (B2 and C1) had the same problem in the other direction.
   *
   * Derived from the rows actually rendered, so a label can no longer disagree
   * with the list underneath it.
   */
  const range = (items: LevelGoalItem[]) =>
    items.length === 0
      ? ''
      : items.length === 1
        ? items[0].level
        : `${items[0].level} – ${items[items.length - 1].level}`;

  const groups = [
    {
      items: netzwerkLevels,
      label: locale === 'de' ? 'Lehrwerk Netzwerk' : 'Netzwerk Textbook',
      blurb:
        locale === 'de'
          ? 'Alltagswörter, Grammatik-Grundlagen und Dialoge'
          : 'Daily vocabulary, grammar basics, and dialogues',
    },
    {
      items: kontextLevels,
      label: locale === 'de' ? 'Lehrwerk Kontext' : 'Kontext Textbook',
      blurb:
        locale === 'de'
          ? 'Komplexe Satzstrukturen, Fachsprache und Diskussionen'
          : 'Complex structures, professional terminology, and debate',
    },
  ].filter((group) => group.items.length > 0);

  /*
   * Columns follow the count, so three outcomes fill three columns instead of
   * leaving a fourth empty and wrapping "Improved speaking confidence" onto two
   * lines to fill the gap. Same rule as the fee strip on CoursePracticalDetails.
   */
  const shown = practices.slice(0, 4);
  const practiceColumns =
    {
      1: '',
      2: 'sm:grid-cols-2',
      3: 'sm:grid-cols-3',
      4: 'sm:grid-cols-2 lg:grid-cols-4',
    }[shown.length as 1 | 2 | 3 | 4] ?? 'sm:grid-cols-2 lg:grid-cols-4';

  return (
    <section>
      <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
      <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">{description}</p>

      <div className="mt-9 border-t border-[color:var(--casa-sand)]">
        {groups.map((group) => (
          /*
            The group heading sits BESIDE its rows on desktop, in a fixed 15rem
            column, so the ladder stays one uninterrupted vertical run while the
            heading still uses the width. Stacked below `lg`, the heading simply
            leads its own rows.
          */
          <div
            key={group.label}
            className="grid gap-x-10 gap-y-4 border-b border-[color:var(--casa-sand)] py-8 last:border-b-0 lg:grid-cols-[15rem_minmax(0,1fr)]"
          >
            <div>
              {/*
                ONE LABEL COLOUR, and it is the fix for the section's only WCAG
                failure. The Kontext label was `--casa-gold-deep` at 12px: 2.9:1
                against the canvas, where AA needs 4.5. The gold was carrying a
                second colour code for "which textbook" on top of the CEFR chips,
                which already colour the same distinction (pale blue at A1 to
                navy at C1) at a size that clears contrast. Both labels are now
                the same muted micro-caps every other sub-label in this run uses
                — COSTS, GOOD TO KNOW, the term-table slot labels — so the three
                sections stop using three label treatments for one job.
              */}
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                {group.label}
              </p>
              <p className="mt-1.5 text-base font-bold text-[var(--casa-ink)]">{range(group.items)}</p>
              <p className="mt-2 max-w-[18rem] text-sm leading-relaxed text-[var(--casa-muted)]">{group.blurb}</p>
            </div>

            <ul className="space-y-0">
              {group.items.map((item) => (
                <li
                  key={item.level}
                  className="flex items-start gap-4 border-b border-[color:var(--casa-sand)]/50 py-3.5 first:pt-0 last:border-b-0 last:pb-0"
                >
                  {/*
                    A larger chip than before — 2.75rem wide, its own line-height
                    — so the level reads as the row's anchor rather than as a tag
                    appended to the sentence. It is the thing a reader scans down.
                  */}
                  <span
                    style={levelChipStyle(item.level)}
                    className="inline-flex min-w-[2.75rem] shrink-0 items-center justify-center rounded-lg bg-[var(--casa-accent-surface)] px-2.5 py-1.5 text-sm font-bold leading-none text-white"
                  >
                    {item.level}
                  </span>
                  {/* Body copy at body size. This was `text-sm` — 14px, a step
                      below the 17px every lead paragraph on the page uses, which
                      is what made the section read small. */}
                  <p className="text-base leading-relaxed text-[var(--casa-ink)]">{item.focus}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/*
        The practice list, at the end and at full width.

        Four across on desktop rather than a stacked column in a corner: these
        are short parallel phrases, and set as a row they read as a set of
        outcomes instead of a bulleted afterthought.
      */}
      {shown.length ? (
        <div className="mt-8 rounded-xl bg-[var(--casa-warm-soft)]/35 px-5 py-5 md:px-7 md:py-6">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
            {practiceTitle}
          </p>
          <ul className={cn('mt-4 grid gap-x-8 gap-y-3', practiceColumns)}>
            {shown.map((practice) => (
              <li key={practice} className="flex gap-2.5 text-base leading-relaxed text-[var(--casa-ink)]">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]" />
                <span>{practice}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
