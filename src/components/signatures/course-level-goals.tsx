import { Compass, GraduationCap, HeartHandshake, LaptopMinimalCheck, MessageCircle, NotebookPen, Sparkles, UsersRound, type LucideIcon } from 'lucide-react';

import { TextCta } from '@/components/ui/text-cta';
import { levelKeyFromLabel, levelTokens } from '@/config/brand/tokens';
import { LEVELS_PATH } from '@/config/content/cefr-levels';
import type { SchoolFeatureIcon } from '@/config/content/school-features';
import { say } from '@/lib/cms/copy';

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
  /** „Unsere Merkmale“, the same eight on every course page (config/content/school-features). */
  features: { icon: SchoolFeatureIcon; label: string }[];
  featuresTitle: string;
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
  features,
  featuresTitle,
  locale = 'en',
}: CourseLevelGoalsProps) {
  const netzwerkLevels = levels.filter((l) => l.textbook === 'netzwerk');
  const kontextLevels = levels.filter((l) => l.textbook === 'kontext');

  /*
   * The range under each label is THE TEXTBOOK'S range: Netzwerk neu covers
   * A1–B1 and Kontext covers B1+–C1, on every course page (CASA, 2026-10-07).
   *
   * It used to be derived from the rows below it, so the intensive page read
   * "Kontext B2 – C1" and the evening page the same, which states the wrong
   * range for the book. The chips in the rows still show this course's own
   * levels, so Bildungszeit (from B1) shows a single B1 chip under Netzwerk neu.
   */
  const groups = [
    {
      items: netzwerkLevels,
      label: say(locale, 'Lehrwerk Netzwerk neu', 'Netzwerk neu textbook'),
      range: 'A1 – B1',
      blurb:
        say(locale, 'Mit Netzwerk neu lernst du Wörter für den Alltag, die Grundlagen der Grammatik, Dialoge und Texte.', 'With Netzwerk neu you learn everyday vocabulary, the basics of grammar, dialogues and texts.'),
    },
    {
      items: kontextLevels,
      label: say(locale, 'Lehrwerk Kontext', 'Kontext textbook'),
      range: 'B1+ – C1',
      blurb:
        say(locale, 'Mit Kontext übst du komplexe Satzstrukturen, Fachsprache und Diskussionen.', 'With Kontext you practise complex sentence structures, specialist language and discussions.'),
    },
  ].filter((group) => group.items.length > 0);

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
              <p className="mt-1.5 text-base font-bold text-[var(--casa-ink)]">{group.range}</p>
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
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--casa-muted)]">{levelBand(item.level, locale)}</p>
                    <p className="mt-0.5 text-base leading-relaxed text-[var(--casa-ink)]">{item.focus}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/*
        The levels page says in full what each level means; this section holds
        the short version, so one quiet link under the ladder leads there
        (2026-10-12). One link for the section, not one per row: six repeated
        "more" links read as noise.
      */}
      <div className="mt-6">
        <TextCta href={LEVELS_PATH}>{say(locale, 'Mehr zu den Niveaustufen', 'More about the levels')}</TextCta>
      </div>

      {/*
        „Unsere Merkmale“, at the end and at full width (CASA's content review, 2026-10-20; Rahman:
        „more premium … something that stands out“). The one dark block on the section, ink as the
        emphasis it is elsewhere on the site, with eight frosted cards on it: a golden icon tile in the
        logo's sun, the card's number, the feature. One column of rows on a phone, so no word breaks;
        two, then four cards across from a tablet up. A slight lift on hover, none for reduced motion.
      */}
      {features.length ? (
        <div className="relative mt-10 overflow-hidden rounded-2xl bg-[var(--casa-ink-deep)] px-5 py-8 text-white md:px-10 md:py-11">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,213,0,0.16),transparent_68%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(0,159,227,0.14),transparent_70%)]"
          />
          <h3 className="relative text-2xl font-bold leading-tight text-white md:text-3xl">{featuresTitle}</h3>
          <ul className="relative mt-6 grid gap-3 sm:grid-cols-2 md:mt-8 lg:grid-cols-4">
            {features.map((feature, index) => {
              const FeatureIcon = FEATURE_ICONS[feature.icon];
              return (
                <li
                  key={feature.icon}
                  className="group flex items-center gap-4 rounded-xl bg-white/[0.05] p-4 ring-1 ring-white/10 transition duration-300 hover:bg-white/[0.09] hover:ring-white/25 motion-safe:hover:-translate-y-0.5 sm:min-h-[9.5rem] sm:flex-col sm:items-start sm:gap-0 sm:p-5"
                >
                  <div className="flex shrink-0 items-center justify-between sm:w-full">
                    <span
                      aria-hidden
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffe27a] via-[#ffd500] to-[#f0a500] text-[var(--casa-ink-deep)] shadow-[0_8px_18px_-8px_rgba(255,190,0,0.65)] transition-transform duration-300 motion-safe:group-hover:scale-105"
                    >
                      <FeatureIcon className="h-5 w-5" />
                    </span>
                    <span aria-hidden className="hidden text-xs font-semibold tabular-nums tracking-wide text-white/35 sm:inline">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <p className="min-w-0 text-[1rem] font-semibold leading-snug text-white sm:mt-auto sm:pt-5">{feature.label}</p>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

const FEATURE_ICONS: Record<SchoolFeatureIcon, LucideIcon> = {
  teachers: GraduationCap,
  atmosphere: HeartHandshake,
  materials: NotebookPen,
  cafeteria: UsersRound,
  digital: LaptopMinimalCheck,
  advice: Compass,
  'language-cafe': MessageCircle,
  culture: Sparkles,
};

/**
 * Each level's band in the GER, as CASA's content review names it (2026-10-20, for Bettina to
 * confirm): A elementary, B independent in three steps, C proficient.
 */
function levelBand(level: string, locale: 'en' | 'de'): string {
  switch (level) {
    case 'A1':
      return say(locale, 'Elementare Sprachverwendung · Anfänger', 'Basic user · beginner');
    case 'A2':
      return say(locale, 'Elementare Sprachverwendung · grundlegende Kenntnisse', 'Basic user · elementary');
    case 'B1':
      return say(locale, 'Selbstständige Sprachverwendung 1', 'Independent user 1');
    case 'B1+':
      return say(locale, 'Selbstständige Sprachverwendung 2', 'Independent user 2');
    case 'B2':
      return say(locale, 'Selbstständige Sprachverwendung 3', 'Independent user 3');
    case 'C1':
      return say(locale, 'Kompetente Sprachverwendung', 'Proficient user');
    default:
      return '';
  }
}
