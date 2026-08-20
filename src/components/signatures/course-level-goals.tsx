
import { levelKeyFromLabel, levelTokens } from '@/config/brand/tokens';

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

  const copy = {
    netzwerkLabel: `${locale === 'de' ? 'Lehrwerk Netzwerk' : 'Netzwerk Textbook'} (${range(netzwerkLevels)})`,
    netzwerkDesc: locale === 'de' ? 'Fokus auf Alltagswörter, Grammatik-Grundlagen und Dialoge' : 'Focus on daily vocabulary, grammar basics, and dialogues',
    kontextLabel: `${locale === 'de' ? 'Lehrwerk Kontext' : 'Kontext Textbook'} (${range(kontextLevels)})`,
    kontextDesc: locale === 'de' ? 'Fokus auf komplexe Satzstrukturen, Fachsprache und Diskussionen' : 'Focus on complex structures, professional terminology, and debate',
  };

  const column = (
    items: LevelGoalItem[],
    label: string,
    blurb: string,
    accent: string
  ) =>
    items.length === 0 ? null : (
      <div>
        <p className="text-xs font-semibold uppercase tracking-eyebrow" style={{ color: accent }}>
          {label}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--casa-muted)]">{blurb}</p>
        <ul className="mt-5 divide-y divide-[color:var(--casa-sand)]/70">
          {items.map((item) => (
            <li key={item.level} className="flex items-start gap-3 py-3.5 first:pt-0">
              <span
                style={levelChipStyle(item.level)}
                className="mt-px inline-flex min-w-[2.25rem] shrink-0 items-center justify-center rounded-md bg-[var(--casa-accent-surface)] px-2 py-1 text-xs font-bold leading-none text-white"
              >
                {item.level}
              </span>
              <p className="text-sm leading-relaxed text-[var(--casa-ink)]">{item.focus}</p>
            </li>
          ))}
        </ul>
      </div>
    );

  /*
   * NO CARD, AND NO CARDS INSIDE IT.
   *
   * This was a rounded-3xl white panel with a border AND a shadow, containing two
   * more rounded-xl white panels each with a border AND a shadow, each containing
   * a pill. Measured on a course detail page: 15 card-like blocks, 7 of them
   * carrying both a hairline and an elevation, 5 nested inside another card, and
   * three different radii — 14px, 10px and 8px. Boxes inside boxes is what made
   * these pages read as a stack of equal slabs rather than as a document, and it
   * is PREMIUM_UI_REVIEW §4.5 (the border-plus-shadow doubling) showing up at
   * page scale.
   *
   * The structure survives entirely in type and hairlines: the two textbook
   * groups are columns split by a vertical rule, each level is a divided row, and
   * the practices sit in the one tinted block on the section — because that is
   * the single thing here that should catch the eye.
   */
  return (
    <section>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)] lg:gap-12">
        <div>
          <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
          <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">{description}</p>
        </div>

        <aside className="rounded-xl bg-[var(--casa-warm-soft)]/35 p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
            {practiceTitle}
          </p>
          <ul className="mt-3.5 space-y-2.5">
            {practices.slice(0, 4).map((practice) => (
              <li key={practice} className="flex gap-2.5 text-sm leading-relaxed text-[var(--casa-ink)]">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]" />
                <span>{practice}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/*
        A vertical rule between the two textbook groups on desktop, a horizontal
        one when they stack. The `md:` divider is the only thing separating them —
        no panel, no fill.
      */}
      <div className="mt-10 grid gap-8 border-t border-[color:var(--casa-sand)] pt-8 md:grid-cols-2 md:gap-10 md:divide-x md:divide-[color:var(--casa-sand)] [&>*+*]:md:pl-10">
        {column(netzwerkLevels, copy.netzwerkLabel, copy.netzwerkDesc, 'var(--casa-accent-text)')}
        {column(kontextLevels, copy.kontextLabel, copy.kontextDesc, 'var(--casa-gold-deep)')}
      </div>
    </section>
  );
}
