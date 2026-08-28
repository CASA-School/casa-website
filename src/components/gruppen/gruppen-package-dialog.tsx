'use client';

import { Button } from '@/components/ui/button';
import { DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { EselBuilder } from '@/components/gruppen/esel-builder';
import { ESEL_PRICE_DISPLAY } from '@/config/gruppen/display';
import {
  CURRENCY,
  GRUPPEN_INCLUDED_SUMMARY,
  PRICE_DISCLAIMER,
  TEACHING_UNITS_PER_WEEK,
  getActivity,
  type GruppenPackage,
} from '@/config/gruppen/packages';
import type { ContentLocale } from '@/lib/content/types';

const copy = {
  en: {
    week: 'week',
    weeks: 'weeks',
    units: 'teaching units',
    bestFor: 'Best for',
    afternoons: 'The afternoons',
    from: 'from',
    perPerson: 'per person',
    close: 'Close',
    request: 'Request this programme',
  },
  de: {
    week: 'Woche',
    weeks: 'Wochen',
    units: 'Unterrichtseinheiten',
    bestFor: 'Passt zu',
    afternoons: 'Die Nachmittage',
    from: 'ab',
    perPerson: 'pro Person',
    close: 'Schließen',
    request: 'Dieses Programm anfragen',
  },
} as const;

function formatCurrency(value: number, locale: ContentLocale) {
  return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/*
  One programme's detail.

  Three parts that never move relative to each other: a header naming the
  programme, a body that scrolls, and a bar at the foot carrying the price and
  the one action. The same shape for all four, so opening a second programme
  after a first puts every comparable number in the same place on screen.

  No photograph in the header. It cost roughly 180px at the top of a panel that
  has to scroll, and the image was a general CASA group shot with nothing to do
  with the programme being read — atmosphere where the reader wants the
  afternoons and the price. The Stadtmusikanten lead the page instead.

  Esel is the exception in content, not in shape: its detail IS the builder, so
  the builder occupies the body and brings its own total bar.
*/
export function GruppenPackageDialog({
  item,
  locale = 'en',
}: {
  item: GruppenPackage;
  locale?: ContentLocale;
}) {
  const t = copy[locale];
  const isEsel = item.priceFrom === null;
  const activities = item.activities.map((id) => getActivity(id));

  const facts = item.weeks
    ? `${item.weeks} ${item.weeks === 1 ? t.week : t.weeks} · ${
        item.weeks * TEACHING_UNITS_PER_WEEK
      } ${t.units}`
    : '';

  return (
    <DialogContent
      closeLabel={t.close}
      className={`flex max-h-[calc(100dvh-2rem)] flex-col p-0 ${isEsel ? 'max-w-3xl' : 'max-w-2xl'}`}
    >
      <div className="shrink-0 border-b border-[color:var(--casa-sand)] px-6 py-6 sm:px-8 sm:py-7">
        <p className="pr-10 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
          {item.animal[locale]}
          {facts ? ` · ${facts}` : ''}
        </p>
        {/* Radix wires aria-labelledby from this. Renders an h2 -> Playfair. */}
        <DialogTitle className="mt-2 pr-10 sm:text-3xl">{item.descriptor[locale]}</DialogTitle>
        <DialogDescription className="mt-3 max-w-measure">
          {item.tagline[locale]}
        </DialogDescription>
      </div>

      {isEsel ? (
        <EselBuilder locale={locale} priceDisplay={ESEL_PRICE_DISPLAY} />
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8">
            <p className="max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
              {item.intro[locale]}
            </p>

            <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
              <span className="font-bold text-[var(--casa-ink)]">{t.bestFor}: </span>
              {item.bestFor[locale]}
            </p>

            <div className="mt-7">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                {t.afternoons}
              </p>
              <ul className="mt-2 grid gap-x-10 gap-y-0 sm:grid-cols-2">
                {activities.map((activity) => (
                  <li
                    key={activity.id}
                    className="border-t border-[color:var(--casa-sand)] py-3.5"
                  >
                    <p className="font-bold text-[var(--casa-ink)]">{activity.name}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--casa-muted)]">
                      {activity.blurb[locale]}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-7 max-w-measure text-sm leading-relaxed text-[var(--casa-muted)]">
              {GRUPPEN_INCLUDED_SUMMARY[locale]} {PRICE_DISCLAIMER[locale]}
            </p>
          </div>

          <div className="shrink-0 border-t border-[color:var(--casa-sand)] bg-white px-6 py-4 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <p className="flex items-baseline gap-3">
                <span className="text-3xl font-black leading-none tabular-nums text-[var(--casa-ink)]">
                  {formatCurrency(item.priceFrom ?? 0, locale)}
                </span>
                <span className="text-sm text-[var(--casa-muted)]">
                  {t.from} · {t.perPerson}
                </span>
              </p>
              <Button asChild variant="prism" className="h-11 whitespace-normal px-6">
                <a href="/contact?topic=group-booking">{t.request}</a>
              </Button>
            </div>
          </div>
        </>
      )}
    </DialogContent>
  );
}
