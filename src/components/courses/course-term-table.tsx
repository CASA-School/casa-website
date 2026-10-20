'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { useSiteCopy } from '@/components/cms/site-copy-provider';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { ContentLocale } from '@/lib/content/types';
import { formatStart } from '@/lib/registration/term-format';
import { cn } from '@/lib/utils';

export type CourseTermDate = {
  id: string;
  start: string;
  end: string;
  /** The registration form with this term chosen; the course page for a format not registered online. */
  href: string;
  /** Begun and still open to join (an evening term). */
  joinable: boolean;
  /** „Mo + Mi", where the course's starts differ by their days (the evening course); else empty. */
  days: string;
};

export type CourseTermLevel = { label: string; value: string };

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
  dates,
  levels,
  scheduleNote,
  weeks,
  locale,
  note,
}: {
  dates: CourseTermDate[];
  levels: CourseTermLevel[];
  /** How the course is timed, said once: „Vormittags (Mo–Fr, 09:00–12:30) oder nachmittags …". */
  scheduleNote: string;
  /** Weeks a whole level takes, where the format sells one (the intensive course): 8. */
  weeks: number | null;
  locale: ContentLocale;
  note?: string;
}) {
  const { say } = useSiteCopy();
  const [level, setLevel] = useState('');
  const [dateId, setDateId] = useState(dates[0]?.id ?? '');
  if (dates.length === 0) {
    return null;
  }

  const date = dates.find((candidate) => candidate.id === dateId) ?? dates[0];
  const href = level ? `${date.href}${date.href.includes('?') ? '&' : '?'}level=${encodeURIComponent(level)}` : date.href;
  const levelLabel = levels.find((candidate) => candidate.value === level)?.label;
  const years = [...new Set(dates.map((candidate) => (candidate.joinable ? 'now' : candidate.start.slice(0, 4))))];
  const dayMonth = (value: string) =>
    new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));

  return (
    <section>
      <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{say(locale, 'Kurstermine', 'Course dates')}</h2>

      <div className="mt-7 rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] sm:p-8">
        {levels.length > 0 ? (
          <fieldset>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <legend className="text-sm font-semibold text-[var(--casa-ink)]">{say(locale, 'Dein Niveau', 'Your level')}</legend>
              <Link href="/placement-test" className="text-sm font-semibold text-[var(--casa-accent-text)] underline-offset-4 hover:underline">
                {say(locale, 'Kostenloser Einstufungstest', 'Free placement test')}
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {levels.map((candidate) => (
                <Pill
                  key={candidate.value}
                  name="term-level"
                  value={candidate.value}
                  checked={candidate.value === level}
                  onChange={() => setLevel(candidate.value === level ? '' : candidate.value)}
                  className="min-w-14 justify-center font-bold"
                >
                  {candidate.label}
                </Pill>
              ))}
            </div>
          </fieldset>
        ) : null}

        <fieldset className={levels.length > 0 ? 'mt-7' : undefined}>
          <legend className="text-sm font-semibold text-[var(--casa-ink)]">{say(locale, 'Starttermin', 'Start date')}</legend>
          <div className="mt-3 space-y-3">
            {years.map((year) => (
              <div key={year} className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-4">
                <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-[var(--casa-muted)]">
                  {year === 'now' ? say(locale, 'Läuft', 'Running') : year}
                </span>
                <div className="flex flex-wrap gap-2">
                  {dates
                    .filter((candidate) => (candidate.joinable ? 'now' : candidate.start.slice(0, 4)) === year)
                    .map((candidate) => (
                      <Pill
                        key={candidate.id}
                        name="term-start"
                        value={candidate.id}
                        checked={candidate.id === date.id}
                        onChange={() => setDateId(candidate.id)}
                        label={formatStart(candidate.start, locale)}
                      >
                        <span className="tabular-nums">
                          {candidate.joinable ? say(locale, 'Jetzt einsteigen', 'Join now') : dayMonth(candidate.start)}
                        </span>
                        {candidate.days ? <span className="font-normal opacity-70">{candidate.days}</span> : null}
                      </Pill>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        <div className="mt-8 flex flex-col gap-5 border-t border-[color:var(--casa-sand)] pt-6 md:flex-row md:items-center md:justify-between">
          <p aria-live="polite" className="text-base leading-relaxed text-[var(--casa-ink)]">
            {levelLabel ? <span className="font-semibold">{levelLabel} · </span> : null}
            {date.joinable
              ? say(locale, 'Einstieg in den laufenden Kurs, bis {date}', 'Join the running course, until {date}', { date: formatStart(date.end, locale) })
              : say(locale, 'ab {date}', 'from {date}', { date: formatStart(date.start, locale) })}
            {weeks && levelLabel && !date.joinable ? <span className="text-[var(--casa-muted)]"> · {say(locale, '{weeks} Wochen', '{weeks} weeks', { weeks })}</span> : null}
          </p>
          <Button asChild variant="prism" size="lg" className="shrink-0">
            <Link href={href}>
              {say(locale, 'Anmelden', 'Register')}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </Button>
        </div>
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
        'inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--casa-blue)]/40 has-[:focus-visible]:ring-offset-2',
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
