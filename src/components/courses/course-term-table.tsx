'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { useSiteCopy } from '@/components/cms/site-copy-provider';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { ContentLocale } from '@/lib/content/types';
import { formatStart, termRange } from '@/lib/registration/term-format';
import { cn } from '@/lib/utils';

export type CourseTermDate = {
  id: string;
  start: string;
  end: string;
  /** The registration form with this term chosen; the course page for a format not registered online. */
  href: string;
  /** Begun and still open to join (an evening term). */
  joinable: boolean;
  /** "Montag + Mittwoch", where the course's starts differ by their days (the evening course): its tab. Else empty. */
  days: string;
  /** The levels this start offers, as the level pills' values (lib/registration/levels `offeredLevels`). */
  levels: string[];
  /** Said after the chosen term's dates: an exam preparation's exam day, „Prüfung am 5. Februar 2027". */
  note?: string;
};

/** A level to choose: "B1", or a half "A1.1" with the level it belongs to, so halves sit in pairs. */
export type CourseTermLevel = { label: string; value: string; level: string };

/**
 * KURSTERMINE: A LEVEL AND A START (Rahman, 2026-10-20). After a two-column table, a tile chooser and
 * a card per slot: „one row with levels like a1, a2, b1 … and the start dates, and don't define
 * morning and afternoon so we can balance our number of students".
 *
 * So one card: the levels in a row (whole levels; the form asks a half where the format sells one),
 * the starts in a row under their year, every start of the course in one list whatever its time of
 * day, the choice said back in a line, and „Anmelden" with the course, the start and the level
 * (`?courseId=…&level=…`). Morning and afternoon are a sentence under it: CASA assigns the group.
 * Pills, not tiles or dropdowns; selected is the ink fill the site's primary buttons use.
 */
export function CourseTermTable({
  title,
  dates,
  levels,
  scheduleNote,
  levelSpan,
  datesAreTerms,
  locale,
  note,
}: {
  /** „Kurstermine" unless the page names what the dates are of (an exam page: the preparation course's). */
  title?: string;
  dates: CourseTermDate[];
  levels: CourseTermLevel[];
  /** How the course is timed, said once: „Vormittags (Mo–Fr, 09:00–12:30) oder nachmittags …". */
  scheduleNote: string;
  /** What a booking teaches, said after the level: "8 Wochen" (intensive), "eine halbe Niveaustufe" (evening). */
  levelSpan: string | null;
  /** A start is a whole term with its own end (the evening course), not a start into a running cycle: say its dates. */
  datesAreTerms: boolean;
  locale: ContentLocale;
  note?: string;
}) {
  const { say } = useSiteCopy();
  const [level, setLevel] = useState('');
  // The evening course's days as tabs (Rahman, 2026-10-21): "Montag + Mittwoch" | "Dienstag + Donnerstag".
  const tabs = [...new Set(dates.map((candidate) => candidate.days).filter(Boolean))];
  const [tab, setTab] = useState(tabs[0] ?? '');
  const [dateId, setDateId] = useState(dates[0]?.id ?? '');
  // The starts of the chosen days that run the chosen level: what CASA plans, start by start (2026-10-21).
  const runs = (candidate: CourseTermDate) => !level || candidate.levels.length === 0 || candidate.levels.includes(level);
  const onDays = tabs.length > 1 ? dates.filter((candidate) => candidate.days === tab) : dates;
  if (onDays.length === 0) {
    return null;
  }
  const shown = onDays.filter(runs);
  // The other days that do run it, offered where these do not.
  const otherTab = shown.length === 0 ? tabs.find((candidate) => candidate !== tab && dates.some((d) => d.days === candidate && runs(d))) : undefined;

  const date: CourseTermDate | undefined = shown.find((candidate) => candidate.id === dateId) ?? shown[0];
  const href = !date ? '' : level ? `${date.href}${date.href.includes('?') ? '&' : '?'}level=${encodeURIComponent(level)}` : date.href;
  const levelLabel = levels.find((candidate) => candidate.value === level)?.label;
  const halves = levels.some((candidate) => candidate.value !== candidate.level);
  const levelPairs = [...new Set(levels.map((candidate) => candidate.level))].map((whole) => levels.filter((candidate) => candidate.level === whole));
  const levelPill = (candidate: CourseTermLevel) => (
    <Pill
      key={candidate.value}
      name="term-level"
      value={candidate.value}
      checked={candidate.value === level}
      onChange={() => setLevel(candidate.value)}
      className="font-bold sm:min-w-14"
    >
      {candidate.label}
    </Pill>
  );
  // A running term's pill says "Jetzt einsteigen": two columns on a phone where one shows, plain dates three.
  const wide = shown.some((candidate) => candidate.joinable);
  const years = [...new Set(shown.map((candidate) => (candidate.joinable ? 'now' : candidate.start.slice(0, 4))))];
  const dayMonth = (value: string) =>
    new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));

  return (
    <section>
      <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{title ?? say(locale, 'Kurstermine', 'Course dates')}</h2>

      <div className="mt-7 rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] sm:p-8">
        {tabs.length > 1 ? (
          <div role="tablist" aria-label={say(locale, 'Kurstage', 'Course days')} className="mb-7 grid grid-cols-2 gap-1 rounded-xl bg-[var(--casa-surface-subtle)] p-1 sm:inline-grid sm:auto-cols-fr sm:grid-flow-col">
            {tabs.map((candidate) => (
              <button
                key={candidate}
                type="button"
                role="tab"
                aria-selected={candidate === tab}
                onClick={() => setTab(candidate)}
                className={cn(
                  'rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 sm:px-5',
                  candidate === tab ? 'bg-white text-[var(--casa-ink)] shadow-[var(--shadow-soft)]' : 'text-[var(--casa-muted)] hover:text-[var(--casa-ink)]'
                )}
              >
                {/* "Mo + Mi" on a phone, where the whole names wrapped inside the tab. */}
                <span className="sm:hidden">{candidate.split(' + ').map((day) => day.slice(0, locale === 'de' ? 2 : 3)).join(' + ')}</span>
                <span className="hidden sm:inline">{candidate}</span>
              </button>
            ))}
          </div>
        ) : null}
        {levels.length > 0 ? (
          <fieldset>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <legend className="text-sm font-semibold text-[var(--casa-ink)]">{say(locale, 'Dein Niveau', 'Your level')}</legend>
              <Link href="/placement-test" className="text-sm font-semibold text-[var(--casa-accent-text)] underline-offset-4 hover:underline">
                {say(locale, 'Kostenloser Einstufungstest', 'Free placement test')}
              </Link>
            </div>
            {/* On a phone the pills keep invisible columns (Rahman, 2026-10-21); from `sm` they run in a row.
                Halves sit in pairs, one pair per level, a wider gap between levels. */}
            {halves ? (
              <div className="mt-3 grid gap-2 min-[360px]:grid-cols-2 sm:flex sm:flex-wrap sm:gap-x-5">
                {levelPairs.map((pair) => (
                  <div key={pair[0].level} className="grid grid-cols-2 gap-2 sm:flex">
                    {pair.map(levelPill)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">{levels.map(levelPill)}</div>
            )}
          </fieldset>
        ) : null}

        <fieldset className={levels.length > 0 ? 'mt-7' : undefined}>
          <legend className="text-sm font-semibold text-[var(--casa-ink)]">{say(locale, 'Starttermin', 'Start date')}</legend>
          {shown.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-[var(--casa-muted)]">
              {say(locale, '{level} beginnt an diesen Tagen gerade nicht.', '{level} does not start on these days at the moment.', { level: levelLabel ?? level })}{' '}
              {otherTab ? (
                <button type="button" onClick={() => setTab(otherTab)} className="font-semibold text-[var(--casa-accent-text)] underline-offset-4 hover:underline">
                  {say(locale, '{days} ansehen', 'See {days}', { days: otherTab })}
                </button>
              ) : (
                <Link href="/contact?topic=course-advice" className="font-semibold text-[var(--casa-accent-text)] underline-offset-4 hover:underline">
                  {say(locale, 'Frag uns nach dem nächsten Start', 'Ask us about the next start')}
                </Link>
              )}
            </p>
          ) : null}
          <div className="mt-3 space-y-3">
            {years.map((year) => (
              <div key={year} className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-4">
                <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-[var(--casa-muted)]">
                  {year === 'now' ? say(locale, 'Läuft', 'Running') : year}
                </span>
                <div className={cn('grid gap-2 sm:flex sm:flex-wrap', wide ? 'grid-cols-2' : 'grid-cols-3')}>
                  {shown
                    .filter((candidate) => (candidate.joinable ? 'now' : candidate.start.slice(0, 4)) === year)
                    .map((candidate) => (
                      <Pill
                        key={candidate.id}
                        name="term-start"
                        value={candidate.id}
                        checked={candidate.id === date?.id}
                        onChange={() => setDateId(candidate.id)}
                        label={formatStart(candidate.start, locale)}
                      >
                        <span className="whitespace-nowrap tabular-nums">
                          {candidate.joinable ? say(locale, 'Jetzt einsteigen', 'Join now') : dayMonth(candidate.start)}
                        </span>
                      </Pill>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        {date ? (
        <div className="mt-8 flex flex-col gap-5 border-t border-[color:var(--casa-sand)] pt-6 md:flex-row md:items-center md:justify-between">
          <p aria-live="polite" className="text-base leading-relaxed text-[var(--casa-ink)]">
            {levelLabel ? <span className="font-semibold">{levelLabel} · </span> : null}
            {date.joinable
              ? say(locale, 'Einstieg in den laufenden Kurs, bis {date}', 'Join the running course, until {date}', { date: formatStart(date.end, locale) })
              : datesAreTerms
                ? termRange(date.start, date.end, locale)
                : say(locale, 'ab {date}', 'from {date}', { date: formatStart(date.start, locale) })}
            {levelSpan && levelLabel ? <span className="text-[var(--casa-muted)]"> · {levelSpan}</span> : null}
            {date.note ? <span className="text-[var(--casa-muted)]"> · {date.note}</span> : null}
          </p>
          <Button asChild variant="prism" size="lg" className="shrink-0">
            <Link href={href}>
              {say(locale, 'Anmelden', 'Register')}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        ) : null}
        {scheduleNote ? <p className="mt-4 text-sm leading-relaxed text-[var(--casa-muted)]">{scheduleNote}</p> : null}
      </div>

      {note ? <p className="mt-6 max-w-measure text-sm leading-relaxed text-[var(--casa-muted)]">{note}</p> : null}
    </section>
  );
}

function Pill({
  name,
  value,
  checked,
  onChange,
  label,
  className,
  children,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  /** What a screen reader says, where the visible text is short. */
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        'inline-flex min-h-10 cursor-pointer flex-wrap items-center justify-center gap-x-1.5 rounded-full px-2 py-1.5 text-center text-sm font-semibold sm:px-4 leading-tight transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--casa-blue)]/40 has-[:focus-visible]:ring-offset-2',
        checked
          ? 'bg-[var(--casa-ink-deep)] text-white'
          : 'bg-white text-[var(--casa-ink)] ring-1 ring-[color:var(--casa-sand)] hover:ring-[color:var(--casa-field-edge-hover)]',
        className
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} aria-label={label} className="sr-only" />
      {children}
    </label>
  );
}
