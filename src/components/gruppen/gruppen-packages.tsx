'use client';

import { ArrowRight } from 'lucide-react';

import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { GruppenPackageDialog } from '@/components/gruppen/gruppen-package-dialog';

import {
  CURRENCY,
  GRUPPEN_PACKAGES_BY_STACK,
  MAX_ACTIVITIES_PER_WEEK,
  TEACHING_UNITS_PER_WEEK,
  GRUPPEN_INCLUDED_SUMMARY,
  PRICE_DISCLAIMER,
} from '@/config/gruppen/packages';
import type { ContentLocale } from '@/lib/content/types';

const copy = {
  en: {
    eyebrow: 'The packages',
    title: 'Four programmes, named after the Town Musicians',
    description:
      'The rooster is the shortest trip. The donkey at the base is the one you build yourself. Everything between is a question of how long you stay and which afternoons fill it.',
    week: 'week',
    weeks: 'weeks',
    units: 'Teaching units',
    afternoons: 'Afternoons',
    afternoonsFlexible: `your choice, up to ${MAX_ACTIVITIES_PER_WEEK} a week`,
    lengthFlexible: '1–4 weeks',
    unitsFlexible: `${TEACHING_UNITS_PER_WEEK} a week`,
    from: 'from',
    perPerson: 'per person',
    modular: 'Priced by the week',
    bestFor: 'Best for',
    view: 'See the programme',
  },
  de: {
    eyebrow: 'Die Pakete',
    title: 'Vier Programme, benannt nach den Stadtmusikanten',
    description:
      'Der Hahn ist die kürzeste Reise. Der Esel an der Basis ist das Paket, das Sie selbst zusammenstellen. Dazwischen geht es um die Dauer und darum, womit die Nachmittage gefüllt sind.',
    week: 'Woche',
    weeks: 'Wochen',
    units: 'Unterrichtseinheiten',
    afternoons: 'Nachmittage',
    afternoonsFlexible: `frei wählbar, bis ${MAX_ACTIVITIES_PER_WEEK} pro Woche`,
    lengthFlexible: '1–4 Wochen',
    unitsFlexible: `${TEACHING_UNITS_PER_WEEK} pro Woche`,
    from: 'ab',
    perPerson: 'pro Person',
    modular: 'Preis nach Wochen',
    bestFor: 'Passt zu',
    view: 'Zum Programm',
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
  Four cards, no comparison table.

  The first draft of this section carried both: four cards AND an eight-row
  matrix underneath repeating the same facts, most of whose cells read
  "Included / Included / Included / Optional". The matrix said almost nothing
  the cards had not already said, and a wall of identical cells is the kind of
  thing a visitor scrolls past rather than reads.

  What actually differs between the packages is three numbers — length, teaching
  units, afternoons — plus the price and who it suits. Those live on the card as
  a hairline list, so the comparison happens across four cards at a glance
  instead of down a grid. What is identical across all four (host family, full
  board, transit pass, materials) is stated once, elsewhere on the page.
*/
export function GruppenPackages({ locale = 'en' }: { locale?: ContentLocale }) {
  const t = copy[locale];

  return (
    <section id="gruppen-packages" className="scroll-mt-28 md:scroll-mt-32" data-track-section="gruppen-packages">
      <div className="max-w-[42rem]">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
          {t.eyebrow}
        </p>
        <h2 className="mt-4 text-balance text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">
          {t.title}
        </h2>
        <p className="mt-4 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
          {t.description}
        </p>
      </div>

      <ul className="mt-10 grid gap-6 sm:grid-cols-2">
        {GRUPPEN_PACKAGES_BY_STACK.map((item) => {
          const modular = item.priceFrom === null;

          const facts: [string, string][] = [
            [
              locale === 'de' ? 'Dauer' : 'Length',
              item.weeks
                ? `${item.weeks} ${item.weeks === 1 ? t.week : t.weeks}`
                : t.lengthFlexible,
            ],
            [
              t.units,
              item.weeks ? String(item.weeks * TEACHING_UNITS_PER_WEEK) : t.unitsFlexible,
            ],
            [
              t.afternoons,
              item.weeks ? String(item.activities.length) : t.afternoonsFlexible,
            ],
          ];

          return (
            <li key={item.slug} id={item.slug} className="scroll-mt-28 md:scroll-mt-32">
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="group flex h-full w-full flex-col text-left rounded-xl bg-white p-7 shadow-[var(--shadow-card)] transition-all duration-300 motion-safe:hover:-translate-y-1 hover:shadow-[var(--shadow-modal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)] focus-visible:ring-offset-2"
                  >
                <span className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                  {item.animal[locale]}
                </span>
                <h3 className="mt-4 text-xl font-bold leading-snug text-[var(--casa-ink)] group-hover:text-[var(--casa-accent-text)]">
                  {item.descriptor[locale]}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--casa-muted)]">
                  {item.tagline[locale]}
                </p>

                <dl className="mt-5 space-y-0 text-sm">
                  {facts.map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-baseline justify-between gap-3 border-t border-[color:var(--casa-sand)] py-2"
                    >
                      <dt className="text-[var(--casa-muted)]">{label}</dt>
                      <dd className="text-right font-bold tabular-nums text-[var(--casa-ink)]">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                    {t.bestFor}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-[var(--casa-muted)]">
                    {item.bestFor[locale]}
                  </p>
                </div>

                <p className="mt-auto pt-6">
                  {modular ? (
                    <span className="block text-base font-bold text-[var(--casa-ink)]">
                      {t.modular}
                    </span>
                  ) : (
                    <>
                      <span className="block text-2xl font-bold leading-none tabular-nums text-[var(--casa-ink)]">
                        {formatCurrency(item.priceFrom ?? 0, locale)}
                      </span>
                      <span className="mt-1 block text-xs text-[var(--casa-muted)]">
                        {t.from} · {t.perPerson}
                      </span>
                    </>
                  )}
                </p>

                <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--casa-ink)]">
                  {t.view}
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-300 motion-safe:group-hover:translate-x-1"
                    aria-hidden
                  />
                </span>
                  </button>
                </DialogTrigger>
                <GruppenPackageDialog item={item} locale={locale} />
              </Dialog>
            </li>
          );
        })}
      </ul>

      {/*
        One line, not a section. This used to be a six-row "What every programme
        contains" block sitting directly above "Costs and conditions", which
        states the teaching hours and the host-family arrangement again in its
        own words — two lists a screen apart disagreeing about how to phrase the
        same facts. The full list stays inside each programme's dialog, next to
        that programme's price, which is where the question is actually asked.
      */}
      <p className="mt-8 max-w-measure text-sm leading-relaxed text-[var(--casa-muted)]">
        {GRUPPEN_INCLUDED_SUMMARY[locale]} {PRICE_DISCLAIMER[locale]}
      </p>
    </section>
  );
}
