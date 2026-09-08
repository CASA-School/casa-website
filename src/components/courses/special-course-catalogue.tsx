'use client';

import { useMemo, useState } from 'react';

import { SpecialCourseDialog } from '@/components/courses/special-course-dialog';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { skillTokens } from '@/config/brand/tokens';
import {
  SPECIAL_COURSE_TERM_LABEL,
  specialCourseModules,
  type SpecialCourseModule,
} from '@/config/courses/special-course-modules';
import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';

/**
 * Special Courses module catalogue.
 *
 * The live page is a flat list of eight visually identical blocks — same price,
 * same time, same length — so the only two questions a reader actually has,
 * "which one is for me?" and "does it fit my week?", are unanswerable at a
 * glance. Everything constant is stated once at the top; the two real variables,
 * level and evening, become the filters and the layout.
 *
 * Skill colour comes from the shared `skillTokens`, mirrored from the student
 * app, so writing reads teal in both products. Colour never carries meaning on
 * its own here — every module shows its category as text next to the accent.
 *
 * Direction: docs/GROUP_PRICING_AND_SPECIAL_COURSES.md, Part 2.
 */

const WEEKDAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function formatDateRange(start: string, end: string, locale: ContentLocale) {
  const fmt = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });
  return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`;
}

type Props = {
  locale: ContentLocale;
  className?: string;
};

export function SpecialCourseCatalogue({ locale, className }: Props) {
  const [level, setLevel] = useState<string | null>(null);
  const [weekday, setWeekday] = useState<string | null>(null);

  const copy =
    locale === 'de'
      ? {
          eyebrow: 'Modulübersicht',
          title: 'Welches Modul passt in Ihre Woche?',
          lead: 'Spezialkurse ergänzen einen laufenden Kurs — oder stehen für sich, wenn Sie gezielt eine Fertigkeit vertiefen wollen.',
          constants: 'Alle Module: ein Abend pro Woche, 90 Minuten, 12 Wochen, 192 €.',
          filterLevel: 'Niveau',
          filterWeekday: 'Abend',
          all: 'Alle',
          empty: 'Keine Module für diese Auswahl. Bitte Filter zurücksetzen.',
          reset: 'Filter zurücksetzen',
          termNote: `Termine für ${SPECIAL_COURSE_TERM_LABEL}. Alle Kurse 18:30–20:00 Uhr; Termine werden bei der Anmeldung bestätigt.`,
          countLabel: (n: number) => `${n} ${n === 1 ? 'Modul' : 'Module'}`,
          readMore: 'Mehr erfahren',
        }
      : {
          eyebrow: 'Module catalogue',
          title: 'Which module fits your week?',
          lead: 'Special courses complement a main course — or stand alone when you want to deepen one specific skill.',
          constants: 'Every module: one evening a week, 90 minutes, 12 weeks, €192.',
          filterLevel: 'Level',
          filterWeekday: 'Evening',
          all: 'All',
          empty: 'No modules match this selection. Try resetting the filters.',
          reset: 'Reset filters',
          termNote: `Dates for ${SPECIAL_COURSE_TERM_LABEL}. All modules run 18:30–20:00; dates are confirmed during registration.`,
          countLabel: (n: number) => `${n} ${n === 1 ? 'module' : 'modules'}`,
          readMore: 'Read more',
        };

  const levels = useMemo(
    () => [...new Set(specialCourseModules.map((m) => m.level))],
    []
  );

  const weekdays = useMemo(
    () =>
      [...new Set(specialCourseModules.map((m) => m.weekday.en))].sort(
        (a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b)
      ),
    []
  );

  const visible = useMemo(
    () =>
      specialCourseModules.filter(
        (m) => (!level || m.level === level) && (!weekday || m.weekday.en === weekday)
      ),
    [level, weekday]
  );

  const columns = weekdays
    .map((day) => ({
      day,
      label:
        specialCourseModules.find((m) => m.weekday.en === day)?.weekday[locale] ?? day,
      modules: visible.filter((m) => m.weekday.en === day),
    }))
    .filter((column) => column.modules.length > 0);

  const hasFilters = level !== null || weekday !== null;

  return (
    <section
      id="module-catalogue"
      aria-label={copy.title}
      className={cn('scroll-mt-28 md:scroll-mt-32', className)}
    >
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
        {copy.eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold text-[var(--casa-ink)] sm:text-3xl">
        {copy.title}
      </h2>
      <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">{copy.lead}</p>

      {/* Everything that is identical across all eight modules, said once. */}
      <p className="mt-4 inline-flex rounded-lg bg-[var(--casa-warm-soft)]/60 px-3 py-2 text-sm font-semibold text-[var(--casa-ink)]">
        {copy.constants}
      </p>

      {/* Filters — the two variables that actually differ */}
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <FilterGroup
          label={copy.filterLevel}
          allLabel={copy.all}
          options={levels.map((value) => ({ value, label: value }))}
          selected={level}
          onSelect={setLevel}
        />
        <FilterGroup
          label={copy.filterWeekday}
          allLabel={copy.all}
          options={weekdays.map((value) => ({
            value,
            label: specialCourseModules.find((m) => m.weekday.en === value)?.weekday[locale] ?? value,
          }))}
          selected={weekday}
          onSelect={setWeekday}
        />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <p aria-live="polite" className="text-sm font-semibold text-[var(--casa-muted)]">
          {copy.countLabel(visible.length)}
        </p>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setLevel(null);
              setWeekday(null);
            }}
            className="text-sm font-semibold text-[var(--casa-accent-text)] underline-offset-4 hover:underline"
          >
            {copy.reset}
          </button>
        ) : null}
      </div>

      {/* The week, as a week */}
      {columns.length > 0 ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((column) => (
            <div key={column.day}>
              <h3 className="rounded-lg bg-[var(--casa-surface-subtle)] px-3 py-2 text-sm font-bold text-[var(--casa-ink)]">
                {column.label}
              </h3>
              <ul className="mt-3 space-y-3">
                {column.modules.map((courseModule) => (
                  <li key={courseModule.id}>
                    <ModuleCard
                      courseModule={courseModule}
                      locale={locale}
                      readMoreLabel={copy.readMore}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-[color:var(--casa-sand)] bg-white px-4 py-6 text-sm text-[var(--casa-muted)]">
          {copy.empty}
        </p>
      )}

      <p className="mt-5 text-xs leading-relaxed text-[var(--casa-text-subtle)]">{copy.termNote}</p>
    </section>
  );
}

function FilterGroup({
  label,
  allLabel,
  options,
  selected,
  onSelect,
}: {
  label: string;
  allLabel: string;
  options: { value: string; label: string }[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-text-subtle)]">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={label}>
        <FilterChip active={selected === null} onClick={() => onSelect(null)}>
          {allLabel}
        </FilterChip>
        {options.map((option) => (
          <FilterChip
            key={option.value}
            active={selected === option.value}
            onClick={() => onSelect(selected === option.value ? null : option.value)}
          >
            {option.label}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
        active
          ? 'border-[var(--casa-blue)] bg-[var(--casa-accent-surface)] text-white'
          : 'border-[color:var(--casa-sand)] bg-white text-[var(--casa-muted)] hover:border-[var(--casa-blue)]/40 hover:text-[var(--casa-ink)]'
      )}
    >
      {children}
    </button>
  );
}

function ModuleCard({
  courseModule,
  locale,
  readMoreLabel,
}: {
  courseModule: SpecialCourseModule;
  locale: ContentLocale;
  readMoreLabel: string;
}) {
  const skill = skillTokens[courseModule.skill];

  return (
    /*
      `flex flex-col` and a `mt-auto` footer, so the trigger sits on the card's
      bottom edge whatever the title does above it. The grid stretches every card
      in a weekday column to the tallest, and Monday's telc C1 title runs to three
      lines against Basisgrammatik's one — without this the buttons in a column
      land at three different heights.
    */
    <article
      className="flex h-full flex-col rounded-xl border border-[color:var(--casa-sand)] bg-white p-4 shadow-[var(--shadow-soft)]"
      style={{ borderLeft: `4px solid ${skill.surface}` }}
    >
      {/* Skill is signalled by colour AND this label — never colour alone. */}
      <p className="text-xs font-semibold uppercase tracking-eyebrow" style={{ color: skill.text }}>
        {courseModule.category[locale] ?? courseModule.category.en}
      </p>
      <h4 className="mt-1.5 text-sm font-bold leading-snug text-[var(--casa-ink)]">
        {courseModule.title[locale] ?? courseModule.title.en}
      </h4>
      <dl className="mt-3 space-y-1 text-xs text-[var(--casa-muted)]">
        <div className="flex gap-1.5">
          <dt className="sr-only">{locale === 'de' ? 'Niveau' : 'Level'}</dt>
          <dd className="rounded-lg bg-[var(--casa-surface-subtle)] px-1.5 py-0.5 font-bold text-[var(--casa-ink)]">
            {courseModule.level}
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="sr-only">{locale === 'de' ? 'Zeitraum' : 'Dates'}</dt>
          <dd className="tabular-nums">
            {formatDateRange(courseModule.startDate, courseModule.endDate, locale)}
          </dd>
        </div>
      </dl>

      {/*
        One Dialog per card rather than one for the section with shared state:
        Radix returns focus to the trigger that opened it, which is what a reader
        tabbing a grid of eight expects, and it is what the Gruppen packages do.

        The accessible name carries the module title — eight buttons all reading
        "Read more" is a screen-reader list with no way to tell them apart, and
        the visible label stays short because the card has ~200px for it.
      */}
      <div className="mt-auto pt-4">
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label={`${readMoreLabel}: ${courseModule.title[locale] ?? courseModule.title.en}`}
              className="inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-[var(--casa-accent-text)] underline-offset-4 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)] focus-visible:ring-offset-2"
            >
              {readMoreLabel}
              <span aria-hidden>&rarr;</span>
            </button>
          </DialogTrigger>
          <SpecialCourseDialog courseModule={courseModule} locale={locale} />
        </Dialog>
      </div>
    </article>
  );
}
