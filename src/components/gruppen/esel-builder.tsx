'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  CURRENCY,
  GRUPPEN_ACTIVITIES,
  GRUPPEN_MODULES,
  GRUPPEN_WEEK_OPTIONS,
  MAX_ACTIVITIES_PER_WEEK,
  type GruppenActivityId,
  type GruppenModuleId,
  type GruppenWeeks,
} from '@/config/gruppen/packages';
import { calculateEselQuote } from '@/lib/gruppen/quote';
import type { ContentLocale } from '@/lib/content/types';

/**
 * How much of the price sheet the builder reveals.
 *   'detailed' — every module and activity carries its own figure.
 *   'total'    — only the per-person and group totals.
 */
export type EselPriceDisplay = 'detailed' | 'total';

const copy = {
  en: {
    trip: 'The stay',
    tripHint: 'Three and four week stays exist only as an Esel programme.',
    week: 'week',
    weeks: 'weeks',
    participants: 'Participants',
    participantsHint: 'Accompanying teachers are quoted separately.',
    modules: 'What we take care of',
    modulesHint: 'Switch off anything the group has already arranged.',
    alwaysIncluded: 'Always included',
    afternoons: 'Afternoons',
    afternoonsHint: (n: number) => `Up to ${n} for this stay — ${MAX_ACTIVITIES_PER_WEEK} a week.`,
    chosen: 'chosen',
    over: 'Over the usual allowance — send it anyway and we will say what fits.',
    perPerson: 'per person',
    groupTotal: (n: number) => `for ${n} ${n === 1 ? 'participant' : 'participants'}`,
    request: 'Request this programme',
    reset: 'Start over',
    estimate: 'An estimate, not an invoice.',
    categories: {
      city: 'In the city',
      culture: 'Culture and history',
      science: 'Science and nature',
      sport: 'Sport',
      daytrip: 'Day trips',
    },
  },
  de: {
    trip: 'Der Aufenthalt',
    tripHint: 'Drei und vier Wochen gibt es ausschließlich als Esel-Programm.',
    week: 'Woche',
    weeks: 'Wochen',
    participants: 'Teilnehmende',
    participantsHint: 'Begleitpersonen kalkulieren wir separat.',
    modules: 'Worum wir uns kümmern',
    modulesHint: 'Schalten Sie ab, was die Gruppe bereits selbst organisiert hat.',
    alwaysIncluded: 'Immer enthalten',
    afternoons: 'Nachmittage',
    afternoonsHint: (n: number) => `Bis zu ${n} für diesen Aufenthalt — ${MAX_ACTIVITIES_PER_WEEK} pro Woche.`,
    chosen: 'gewählt',
    over: 'Über dem üblichen Kontingent — senden Sie es trotzdem, wir sagen Ihnen, was möglich ist.',
    perPerson: 'pro Person',
    groupTotal: (n: number) => `für ${n} Teilnehmende`,
    request: 'Dieses Programm anfragen',
    reset: 'Neu beginnen',
    estimate: 'Eine Schätzung, keine Rechnung.',
    categories: {
      city: 'In der Stadt',
      culture: 'Kultur und Geschichte',
      science: 'Wissenschaft und Natur',
      sport: 'Sport',
      daytrip: 'Tagesausflüge',
    },
  },
} as const;

const CATEGORY_ORDER = ['city', 'culture', 'science', 'sport', 'daytrip'] as const;
const DEFAULT_MODULES: GruppenModuleId[] = GRUPPEN_MODULES.map((m) => m.id);
const DEFAULT_ACTIVITIES: GruppenActivityId[] = ['cityrallye', 'weserstadion', 'universum'];

function formatCurrency(value: number, locale: ContentLocale) {
  return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[color:var(--casa-sand)] pt-5">
      <h4 className="text-sm font-bold text-[var(--casa-ink)]">{label}</h4>
      {hint ? <p className="mt-1 text-sm leading-relaxed text-[var(--casa-muted)]">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** A filled check for a module that cannot be switched off — a disabled input reads as "unavailable". */
function LockedCheck() {
  return (
    <span
      aria-hidden
      className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm bg-[var(--casa-blue)] text-white"
    >
      <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M3 8.5 6.5 12 13 4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/*
  The Esel builder, shaped for the dialog it lives in.

  It was a two-column page section with the running total in a `lg:sticky`
  aside, which is a shape that only works in a viewport-height scroll container.
  Inside a panel it parked the total below the fold, so a visitor toggled a
  module and nothing they could see moved — the thing that made it read as
  confusing.

  Now it is a scrolling body over a total bar that never leaves. Every change
  lands in the same place, which is the whole job of a configurator.
*/
export function EselBuilder({
  locale = 'en',
  priceDisplay = 'total',
  inquiryHref = '/contact?topic=group-booking',
}: {
  locale?: ContentLocale;
  priceDisplay?: EselPriceDisplay;
  inquiryHref?: string;
}) {
  const t = copy[locale];
  const showLinePrices = priceDisplay === 'detailed';

  const [weeks, setWeeks] = useState<GruppenWeeks>(2);
  const [participants, setParticipants] = useState(20);
  const [modules, setModules] = useState<GruppenModuleId[]>(DEFAULT_MODULES);
  const [activities, setActivities] = useState<GruppenActivityId[]>(DEFAULT_ACTIVITIES);

  const quote = useMemo(
    () => calculateEselQuote({ weeks, participants, modules, activities }),
    [weeks, participants, modules, activities]
  );

  const headCount = Math.max(1, Math.floor(participants));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8">
        {/* Duration and head count read as one question: what is the trip. */}
        <section>
          <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-start">
            <div>
              <h4 className="text-sm font-bold text-[var(--casa-ink)]">{t.trip}</h4>
              <p className="mt-1 text-sm leading-relaxed text-[var(--casa-muted)]">{t.tripHint}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {GRUPPEN_WEEK_OPTIONS.map((option) => {
                  const active = option === weeks;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setWeeks(option)}
                      className={`rounded-lg border px-4 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)] focus-visible:ring-offset-2 ${
                        active
                          ? 'border-[var(--casa-ink)] bg-[var(--casa-ink)] text-white'
                          : 'border-[color:var(--casa-sand)] bg-white text-[var(--casa-ink)] hover:border-[var(--casa-ink)]/40'
                      }`}
                    >
                      {option} {option === 1 ? t.week : t.weeks}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="sm:pt-1">
              <label
                htmlFor="esel-participants"
                className="block text-sm font-bold text-[var(--casa-ink)]"
              >
                {t.participants}
              </label>
              <p className="mt-1 text-sm leading-relaxed text-[var(--casa-muted)] sm:max-w-[14rem]">
                {t.participantsHint}
              </p>
              <input
                id="esel-participants"
                type="number"
                min={1}
                max={200}
                inputMode="numeric"
                value={participants}
                onChange={(e) => setParticipants(Number(e.target.value) || 1)}
                className="mt-4 h-11 w-24 rounded-lg border border-[color:var(--casa-sand)] bg-white px-3 text-base font-bold tabular-nums text-[var(--casa-ink)] outline-none transition focus-visible:border-[var(--casa-blue)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/20"
              />
            </div>
          </div>
        </section>

        <Field label={t.modules} hint={t.modulesHint}>
          <ul className="grid gap-x-8 sm:grid-cols-2">
            {GRUPPEN_MODULES.map((moduleEntry) => {
              const locked = Boolean(moduleEntry.required);
              const checked = locked || modules.includes(moduleEntry.id);

              return (
                <li key={moduleEntry.id}>
                  <label
                    className={`flex items-start gap-3 border-b border-[color:var(--casa-sand)] py-3 ${
                      locked ? '' : 'cursor-pointer'
                    }`}
                  >
                    {locked ? (
                      <LockedCheck />
                    ) : (
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setModules((cur) =>
                            cur.includes(moduleEntry.id)
                              ? cur.filter((x) => x !== moduleEntry.id)
                              : [...cur, moduleEntry.id]
                          )
                        }
                        className="mt-0.5 size-4 shrink-0 rounded-sm border-[color:var(--casa-sand)] accent-[var(--casa-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="text-sm font-bold text-[var(--casa-ink)]">
                          {moduleEntry.name[locale]}
                        </span>
                        {showLinePrices ? (
                          <span className="text-sm tabular-nums text-[var(--casa-ink)]">
                            {formatCurrency(moduleEntry.priceByWeeks[weeks], locale)}
                          </span>
                        ) : null}
                      </span>
                      {locked ? (
                        <span className="mt-0.5 block text-xs text-[var(--casa-muted)]">
                          {t.alwaysIncluded}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Field>

        <Field label={t.afternoons} hint={t.afternoonsHint(quote.activityAllowance)}>
          <p className="text-sm">
            <span
              className={`font-bold tabular-nums ${
                quote.overActivityAllowance
                  ? 'text-[var(--casa-danger-text)]'
                  : 'text-[var(--casa-ink)]'
              }`}
            >
              {activities.length} / {quote.activityAllowance}
            </span>{' '}
            <span className="text-[var(--casa-muted)]">{t.chosen}</span>
            {quote.overActivityAllowance ? (
              <span className="text-[var(--casa-muted)]"> — {t.over}</span>
            ) : null}
          </p>

          <div className="mt-4 space-y-5">
            {CATEGORY_ORDER.map((category) => {
              const items = GRUPPEN_ACTIVITIES.filter((a) => a.category === category);
              if (!items.length) return null;

              return (
                <div key={category}>
                  <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                    {t.categories[category]}
                  </p>
                  <ul className="mt-1.5 grid gap-x-8 sm:grid-cols-2">
                    {items.map((activity) => {
                      const checked = activities.includes(activity.id);
                      return (
                        <li key={activity.id}>
                          <label className="flex cursor-pointer items-center gap-3 border-b border-[color:var(--casa-sand)] py-2.5">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setActivities((cur) =>
                                  cur.includes(activity.id)
                                    ? cur.filter((x) => x !== activity.id)
                                    : [...cur, activity.id]
                                )
                              }
                              className="size-4 shrink-0 rounded-sm border-[color:var(--casa-sand)] accent-[var(--casa-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
                            />
                            <span className="min-w-0 flex-1 text-sm text-[var(--casa-ink)]">
                              {activity.name}
                            </span>
                            {showLinePrices ? (
                              <span className="shrink-0 text-sm tabular-nums text-[var(--casa-muted)]">
                                {formatCurrency(activity.price, locale)}
                              </span>
                            ) : null}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </Field>

        <button
          type="button"
          onClick={() => {
            setWeeks(2);
            setParticipants(20);
            setModules(DEFAULT_MODULES);
            setActivities(DEFAULT_ACTIVITIES);
          }}
          className="text-sm font-bold text-[var(--casa-muted)] underline-offset-4 transition-colors hover:text-[var(--casa-ink)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]"
        >
          {t.reset}
        </button>
      </div>

      {/*
        The total bar. It never scrolls away, so every toggle above lands
        somewhere the visitor is already looking.
      */}
      <div className="shrink-0 border-t border-[color:var(--casa-sand)] bg-white px-6 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="flex items-baseline gap-3"
          >
            <span className="text-3xl font-black leading-none tabular-nums text-[var(--casa-ink)]">
              {formatCurrency(quote.perPerson, locale)}
            </span>
            <span className="text-sm text-[var(--casa-muted)]">
              {t.perPerson} · {formatCurrency(quote.groupTotal, locale)} {t.groupTotal(headCount)}
            </span>
          </p>

          <Button asChild variant="prism" className="h-11 whitespace-normal px-6">
            <a href={inquiryHref}>{t.request}</a>
          </Button>
        </div>
        <p className="mt-2 text-xs text-[var(--casa-muted)]">{t.estimate}</p>
      </div>
    </div>
  );
}
