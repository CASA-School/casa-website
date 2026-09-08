'use client';

import { Button } from '@/components/ui/button';
import { DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { skillTokens } from '@/config/brand/tokens';
import {
  SPECIAL_COURSE_CONSTANTS,
  SPECIAL_COURSE_TERM_LABEL,
  type SpecialCourseModule,
} from '@/config/courses/special-course-modules';
import type { ContentLocale } from '@/lib/content/types';

const copy = {
  en: {
    close: 'Close',
    register: 'Register for this module',
    ask: 'Ask about this module',
    schedule: 'When it runs',
    evening: 'Evening',
    time: 'Time',
    dates: 'Dates',
    shape: 'Shape',
    level: 'Entry level',
    practises: 'What you practise',
    forWhom: 'Who it is for',
    requirements: 'Before you join',
    shapeValue: (weeks: number, minutes: number) =>
      `${weeks} weeks · one ${minutes}-minute session a week`,
    complements:
      'Special courses complement a main course — or stand alone when you want to deepen one specific skill.',
    termNote: (term: string) => `Dates for ${term}; confirmed during registration.`,
  },
  de: {
    close: 'Schließen',
    register: 'Für dieses Modul anmelden',
    ask: 'Zu diesem Modul beraten lassen',
    schedule: 'Termine',
    evening: 'Abend',
    time: 'Uhrzeit',
    dates: 'Zeitraum',
    shape: 'Umfang',
    level: 'Einstiegsniveau',
    practises: 'Das üben Sie',
    forWhom: 'Für wen',
    requirements: 'Vor der Anmeldung',
    shapeValue: (weeks: number, minutes: number) =>
      `${weeks} Wochen · ein Termin pro Woche, ${minutes} Minuten`,
    complements:
      'Spezialkurse ergänzen einen laufenden Kurs — oder stehen für sich, wenn Sie gezielt eine Fertigkeit vertiefen wollen.',
    termNote: (term: string) => `Termine für ${term}; werden bei der Anmeldung bestätigt.`,
  },
} as const;

function formatDateRange(start: string, end: string, locale: ContentLocale) {
  const fmt = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `${fmt.format(new Date(start))} – ${fmt.format(new Date(end))}`;
}

function formatPrice(value: number, locale: ContentLocale) {
  return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * One special-course module's detail.
 *
 * SAME THREE-PART SHAPE AS `GruppenPackageDialog`, on purpose: a header naming
 * the module, a body that scrolls, and a bar at the foot carrying the price and
 * the one action. Opening a second module after a first puts every comparable
 * number in the same place on screen — which is the whole reason a reader opens
 * two, since the eight modules differ in only two variables.
 *
 * WHAT IT SHOWS TODAY is the module's own schedule facts, which the card cannot
 * fit: the full date range with the year, the evening and time, the 12-week /
 * 90-minute shape, and the entry level. All of it read from
 * `special-course-modules.ts` — nothing in this component states a fact of its
 * own.
 *
 * WHAT IT WILL SHOW is the descriptive copy: intro, who it is for, what you
 * practise, entry expectations. Each renders only when the matching field on
 * `module.detail` is present, and every field is currently unset — CASA
 * publishes the timetable and the price for these modules, not a description of
 * each one, and a module's content is a claim about what is taught. Filling
 * `detail` in is a data-only change; see the note on `SpecialCourseDetail`.
 *
 * No photograph in the header, for the reason the Gruppen dialog gives: it cost
 * ~180px at the top of a panel that has to scroll, and there is no photograph
 * of an individual module to show.
 */
export function SpecialCourseDialog({
  courseModule,
  locale = 'en',
}: {
  courseModule: SpecialCourseModule;
  locale?: ContentLocale;
}) {
  const t = copy[locale];
  const skill = skillTokens[courseModule.skill];
  const detail = courseModule.detail;
  const { weeks, minutesPerSession } = SPECIAL_COURSE_CONSTANTS;

  /*
    The schedule rows. Built as data rather than markup so the grid below stays
    one map — a module that ever loses a field renders one row fewer instead of
    an empty cell with a dangling label.
  */
  const facts: { label: string; value: string }[] = [
    { label: t.level, value: courseModule.level },
    { label: t.evening, value: courseModule.weekday[locale] ?? courseModule.weekday.en },
    { label: t.time, value: courseModule.time.replace(' - ', '–') },
    { label: t.shape, value: t.shapeValue(weeks, minutesPerSession) },
    { label: t.dates, value: formatDateRange(courseModule.startDate, courseModule.endDate, locale) },
  ];

  return (
    <DialogContent
      closeLabel={t.close}
      className="flex max-h-[calc(100dvh-2rem)] max-w-2xl flex-col p-0"
    >
      <div className="shrink-0 border-b border-[color:var(--casa-sand)] px-6 py-6 sm:px-8 sm:py-7">
        {/* Skill signalled by colour AND the category text — never colour alone. */}
        <p
          className="pr-10 text-xs font-semibold uppercase tracking-eyebrow"
          style={{ color: skill.text }}
        >
          {courseModule.category[locale] ?? courseModule.category.en}
        </p>
        {/* Radix wires aria-labelledby from this. Renders an h2 -> Playfair. */}
        <DialogTitle className="mt-2 pr-10 text-balance sm:text-3xl">
          {courseModule.title[locale] ?? courseModule.title.en}
        </DialogTitle>
        <DialogDescription className="mt-3 max-w-measure">
          {detail?.intro?.[locale] ?? t.complements}
        </DialogDescription>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
          {t.schedule}
        </p>
        {/*
          Two columns of label-over-value, hairline-separated — the same figure
          treatment the cost sections use, so a fact reads the same wherever it
          appears. Single column below `sm`, where two would give each value
          ~130px and wrap the date range onto three lines.
        */}
        <dl className="mt-4 grid gap-x-10 sm:grid-cols-2">
          {facts.map((fact) => (
            <div key={fact.label} className="border-t border-[color:var(--casa-sand)] py-3.5">
              <dt className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                {fact.label}
              </dt>
              <dd className="mt-1.5 text-base font-semibold leading-snug text-[var(--casa-ink)]">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>

        {detail?.forWhom ? (
          <p className="mt-7 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
            <span className="font-bold text-[var(--casa-ink)]">{t.forWhom}: </span>
            {detail.forWhom[locale]}
          </p>
        ) : null}

        {detail?.practises?.length ? (
          <div className="mt-7">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
              {t.practises}
            </p>
            <ul className="mt-3 grid gap-x-10 gap-y-0 sm:grid-cols-2">
              {detail.practises.map((entry) => (
                <li
                  key={entry.en}
                  className="flex gap-3 border-t border-[color:var(--casa-sand)] py-3.5 text-base leading-relaxed text-[var(--casa-ink)]"
                >
                  <span
                    aria-hidden
                    className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]"
                  />
                  <span>{entry[locale]}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {detail?.requirements ? (
          <p className="mt-7 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
            <span className="font-bold text-[var(--casa-ink)]">{t.requirements}: </span>
            {detail.requirements[locale]}
          </p>
        ) : null}

        <p className="mt-7 max-w-measure text-sm leading-relaxed text-[var(--casa-muted)]">
          {t.termNote(SPECIAL_COURSE_TERM_LABEL)}
        </p>
      </div>

      <div className="shrink-0 border-t border-[color:var(--casa-sand)] bg-white px-6 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <p className="flex items-baseline gap-3">
            <span className="text-2xl font-bold leading-none tabular-nums text-[var(--casa-ink)]">
              {formatPrice(courseModule.priceEur, locale)}
            </span>
            <span className="text-sm text-[var(--casa-muted)]">
              {t.shapeValue(weeks, minutesPerSession)}
            </span>
          </p>
          <Button asChild variant="prism" className="h-11 whitespace-normal px-6">
            <a href="/registration/course">{t.register}</a>
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}
