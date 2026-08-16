'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

import type { ContentLocale } from '@/lib/content/types';
import { cn } from '@/lib/utils';

import { CompareToggleButton } from './compare-toggle-button';
import { DeadlineBadge } from './deadline-badge';

export type GuidedPickerItem = {
  id?: string;
  title: string;
  description: string;
  bestFor: string;
  href: string;
  ctaLabel: string;
  meta?: string;
  deadlineIso?: string | null;
  compare?: {
    id: string;
    title: string;
    href: string;
    meta?: string;
  };
  media?: {
    src: string;
    alt: string;
  };
};

type GuidedPickerProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: GuidedPickerItem[];
  locale?: ContentLocale;
  compareType?: 'course' | 'exam';
  desktopColumns?: 2 | 3;
  presentation?:
    | 'default'
    | 'featurePair'
    | 'stackedRows'
    | 'spotlightSplit'
    | 'courseAtlas'
    | 'courseMosaic'
    | 'courseSignalCards';
  showAccentRule?: boolean;
  showBestFor?: boolean;
  className?: string;
};

export function GuidedPicker({
  eyebrow,
  title,
  description,
  items,
  locale = 'en',
  compareType,
  desktopColumns,
  presentation = 'default',
  showAccentRule = true,
  showBestFor = true,
  className,
}: GuidedPickerProps) {
  const [showAll, setShowAll] = useState(false);

  const renderShowMoreButton = (limit: number = 3) => {
    if (items.length <= limit) return null;
    return (
      <div className="flex justify-center pt-4 md:hidden w-full">
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[color:var(--casa-sand)] bg-white px-5 text-sm font-bold text-[var(--casa-ink)] transition-colors hover:bg-[var(--casa-canvas)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/30"
        >
          {showAll
            ? (locale === 'de' ? 'Weniger anzeigen' : 'Show less')
            : (locale === 'de' ? `Mehr anzeigen (${items.length - limit} weitere)` : `Show ${items.length - limit} more`)}
        </button>
      </div>
    );
  };

  const isFeaturePair = presentation === 'featurePair';
  const isStackedRows = presentation === 'stackedRows';
  const isSpotlightSplit = presentation === 'spotlightSplit';
  const isCourseAtlas = presentation === 'courseAtlas';
  const isCourseMosaic = presentation === 'courseMosaic';
  const isCourseSignalCards = presentation === 'courseSignalCards';
  const gridColumnsClass =
    isFeaturePair
      ? 'lg:grid-cols-2'
      : desktopColumns === 3
      ? 'lg:grid-cols-3'
      : desktopColumns === 2
        ? 'lg:grid-cols-2'
        : items.length === 4
      ? 'lg:grid-cols-2'
      : items.length <= 2
        ? 'lg:grid-cols-2'
        : 'lg:grid-cols-3';
  const sectionHeader = (
    <div>
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{eyebrow}</p>
      {showAccentRule ? (
        <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
      ) : null}
      <h2 className={cn('text-2xl font-bold text-[var(--casa-ink)] sm:text-3xl', showAccentRule ? 'mt-2' : 'mt-3')}>
        {title}
      </h2>
      <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{description}</p>
      {compareType ? (
        <p className="mt-2 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
          {locale === 'de'
            ? 'Guardrail: wählen Sie genau 2 Optionen für den Vergleich.'
            : 'Guardrail: select exactly 2 options to compare.'}
        </p>
      ) : null}
    </div>
  );

  if (isCourseAtlas) {
    const leadItem = items[0];

    return (
      <section
        data-reveal="true"
        className={cn('grid gap-7 lg:grid-cols-[0.82fr_minmax(0,1.18fr)] lg:items-start', className)}
      >
        <div className="space-y-6">
          {sectionHeader}

          {leadItem?.media ? (
            <figure className="relative overflow-hidden rounded-lg bg-[var(--casa-ink-deep)] shadow-[var(--shadow-modal)]">
              <div className="relative aspect-[4/3]">
                <Image
                  src={leadItem.media.src}
                  alt={leadItem.media.alt}
                  fill
                  sizes="(min-width: 1024px) 34vw, 92vw"
                  className="object-cover opacity-90"
                />
                <div
                  className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,16,32,0)_24%,rgba(9,16,32,0.78)_100%)]"
                  aria-hidden
                />
              </div>
              <figcaption className="absolute inset-x-0 bottom-0 p-5 text-sm font-semibold text-white md:p-6">
                {locale === 'de'
                  ? 'Kleine Gruppen, klare Kurswege und direkte nächste Schritte.'
                  : 'Small groups, clear course routes, and direct next steps.'}
              </figcaption>
            </figure>
          ) : null}
        </div>

        <div className="w-full">
          <ul className="grid gap-3 min-[500px]:grid-cols-2">
            {items.map((item, index) => (
              <li key={item.id ?? item.href} className={cn(index >= 3 && !showAll ? 'hidden md:block' : '')}>
                <article className="group flex h-full min-h-[13rem] flex-col rounded-lg bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/75 transition-all hover:-translate-y-0.5 hover:ring-[var(--casa-blue)]/35">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {item.meta ? (
                      <span className="max-w-[9rem] text-right text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                        {item.meta}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-5 text-xl font-bold leading-tight text-[var(--casa-ink)]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--casa-muted)]">
                    {item.description}
                  </p>

                  <Link
                    href={item.href}
                    className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-[var(--casa-ink)] transition-colors group-hover:text-[var(--casa-accent-text)]"
                  >
                    {item.ctaLabel}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                </article>
              </li>
            ))}
          </ul>
          {renderShowMoreButton(3)}
        </div>
      </section>
    );
  }

  if (isCourseMosaic) {
    const leadItem = items[0];
    const supportingItems = items.slice(1);

    return (
      <section data-reveal="true" className={cn('space-y-7', className)}>
        {sectionHeader}

        <div className="grid gap-4 lg:grid-cols-[1.05fr_minmax(0,0.95fr)]">
          {leadItem ? (
            <article className="relative flex min-h-[28rem] overflow-hidden rounded-lg bg-[var(--casa-ink-deep)] p-5 text-white shadow-[var(--shadow-modal)] md:p-6">
              {leadItem.media ? (
                <Image
                  src={leadItem.media.src}
                  alt={leadItem.media.alt}
                  fill
                  sizes="(min-width: 1024px) 48vw, 92vw"
                  className="object-cover opacity-[0.48]"
                />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,16,32,0.05)_0%,rgba(9,16,32,0.86)_100%)]" aria-hidden />
              <div className="relative z-10 mt-auto max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-eyebrow text-white/70">
                  {locale === 'de' ? 'Empfohlener Startpunkt' : 'Recommended starting point'}
                </p>
                <h3 className="mt-3 text-3xl font-bold md:text-4xl">{leadItem.title}</h3>
                <p className="mt-4 text-base leading-relaxed text-white/82 md:text-lg">
                  {leadItem.description}
                </p>
                <Link
                  href={leadItem.href}
                  className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-[var(--casa-ink-deep)] transition-colors hover:bg-[var(--casa-warm-soft)]"
                >
                  {leadItem.ctaLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </article>
          ) : null}

          <div className="w-full">
            <ul className="grid gap-3 min-[500px]:grid-cols-2">
              {supportingItems.map((item, index) => (
                <li key={item.id ?? item.href} className={cn(index >= 2 && !showAll ? 'hidden md:block' : '')}>
                  <article className="group flex h-full min-h-[11.75rem] flex-col rounded-lg bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/75 transition-all hover:-translate-y-0.5 hover:ring-[var(--casa-blue)]/35">
                    <span className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                      {String(index + 2).padStart(2, '0')}
                    </span>
                    <h3 className="mt-4 text-lg font-bold leading-tight text-[var(--casa-ink)]">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--casa-muted)]">{item.description}</p>
                    <Link
                      href={item.href}
                      className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-semibold text-[var(--casa-ink)] transition-colors group-hover:text-[var(--casa-accent-text)]"
                    >
                      {item.ctaLabel}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
            {renderShowMoreButton(3)}
          </div>
        </div>
      </section>
    );
  }

  if (isCourseSignalCards) {
    return (
      <section data-reveal="true" className={cn('space-y-7', className)}>
        {sectionHeader}

        <div>
          <ul className="course-rail-scroll -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-3">
            {items.map((item, index) => (
              <li
                key={item.id ?? item.href}
                className="w-[85vw] min-[400px]:w-[78vw] shrink-0 snap-start md:w-auto md:shrink-0 md:snap-align-none"
              >
                <article
                  id={item.id}
                  className={cn(
                    "group flex h-full md:min-h-[25rem] flex-col overflow-hidden rounded-xl md:rounded-xl bg-white shadow-[var(--shadow-card)] md:shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70 md:ring-[color:var(--casa-sand)]/75 transition-all md:hover:-translate-y-1 md:hover:ring-[var(--casa-blue)]/35",
                    item.id ? 'scroll-mt-28 md:scroll-mt-32' : undefined
                  )}
                >
                  {item.media ? (
                    <div className="casa-media-overlay casa-media-overlay-card relative h-44 shrink-0 md:shrink-0 overflow-hidden">
                      <Image
                        src={item.media.src}
                        alt={item.media.alt}
                        fill
                        sizes="(max-width: 768px) 85vw, (min-width: 1280px) 28vw, 44vw"
                        className="object-cover transition-transform duration-500 md:group-hover:scale-[1.03]"
                      />
                      <span className="absolute left-3 top-3 md:left-4 md:top-4 inline-flex h-7 min-w-7 md:h-9 md:min-w-9 items-center justify-center rounded-lg md:rounded-lg bg-white/90 md:bg-white/92 px-2 text-xs md:text-xs font-bold tabular-nums text-[var(--casa-ink)] shadow-[var(--shadow-soft)]">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col gap-3 md:gap-0 p-4 md:p-5">
                    <h3 className="text-base md:text-xl font-bold leading-snug md:leading-tight text-[var(--casa-ink)]">
                      {item.title}
                    </h3>
                    <p className="line-clamp-3 md:line-clamp-none text-sm md:mt-3 leading-relaxed text-[var(--casa-muted)]">
                      {item.description}
                    </p>
                    <Link
                      href={item.href}
                      className="mt-auto inline-flex h-11 md:h-11 items-center justify-center gap-2 rounded-xl md:rounded-lg bg-[var(--casa-ink-deep)] px-4 md:px-5 text-sm font-bold text-white shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--casa-ink-deep-hover)]"
                    >
                      {item.ctaLabel}
                      <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden />
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
          {/* Scroll nudge */}
          <p className="mt-3 text-center text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)] md:hidden">
            {locale === 'de' ? 'Wischen für weitere Kurse' : 'Swipe to see more courses'}
          </p>
        </div>
      </section>
    );
  }

  if (isStackedRows) {
    return (
      <section data-reveal="true" className={cn('space-y-6 md:space-y-7', className)}>
        {sectionHeader}

        <div className="w-full">
          <ul className="space-y-4">
            {items.map((item, index) => (
              <li key={item.id ?? item.href} className={cn(index >= 3 && !showAll ? 'hidden md:block' : '')}>
                <article className="grid gap-5 rounded-lg bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/75 transition-all hover:-translate-y-0.5 hover:ring-[var(--casa-blue)]/35 md:grid-cols-[16rem_minmax(0,1fr)_auto] md:items-center md:p-5">
                  {item.media ? (
                    <div className="casa-media-overlay casa-media-overlay-card relative h-44 overflow-hidden rounded-lg md:h-36">
                      <Image
                        src={item.media.src}
                        alt={item.media.alt}
                        fill
                        sizes="(min-width: 1024px) 16rem, (min-width: 640px) 40vw, 92vw"
                        className="object-cover"
                      />
                    </div>
                  ) : null}

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                      Option {index + 1}
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-[var(--casa-ink)] md:text-2xl">
                      {item.title}
                    </h3>
                    {item.meta ? (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                        {item.meta}
                      </p>
                    ) : null}
                    <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
                      {item.description}
                    </p>
                  </div>

                  <Link
                    href={item.href}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--casa-ink-deep)] px-5 text-sm font-bold text-white shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--casa-ink-deep-hover)] md:min-w-[10.5rem]"
                  >
                    {item.ctaLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </article>
              </li>
            ))}
          </ul>
          {renderShowMoreButton(3)}
        </div>
      </section>
    );
  }

  if (isSpotlightSplit) {
    const featuredItem = items[0];
    const supportingItems = items.slice(1);

    return (
      <section data-reveal="true" className={cn('space-y-6 md:space-y-7', className)}>
        {sectionHeader}

        <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          {featuredItem ? (
            <article className="relative flex min-h-[28rem] overflow-hidden rounded-lg bg-[var(--casa-ink-deep)] p-5 text-white shadow-[var(--shadow-modal)] md:p-6">
              {featuredItem.media ? (
                <Image
                  src={featuredItem.media.src}
                  alt={featuredItem.media.alt}
                  fill
                  sizes="(min-width: 1024px) 50vw, 92vw"
                  className="object-cover opacity-[0.42]"
                />
              ) : null}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,16,32,0.2)_0%,rgba(9,16,32,0.82)_100%)]" aria-hidden />
              <div className="relative z-10 mt-auto max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-eyebrow text-white/70">
                  {locale === 'de' ? 'Intensiver Rhythmus' : 'Intensive rhythm'}
                </p>
                <h3 className="mt-3 text-3xl font-bold md:text-4xl">{featuredItem.title}</h3>
                <p className="mt-4 text-base leading-relaxed text-white/80 md:text-lg">
                  {featuredItem.description}
                </p>
                <Link
                  href={featuredItem.href}
                  className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-[var(--casa-ink-deep)] transition-colors hover:bg-[var(--casa-warm-soft)]"
                >
                  {featuredItem.ctaLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </article>
          ) : null}

          <div className="space-y-5">
            {supportingItems.map((item) => (
              <article
                key={item.id ?? item.href}
                className="grid gap-4 rounded-lg bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/75 md:p-6"
              >
                {item.media ? (
                  <div className="casa-media-overlay casa-media-overlay-card relative h-56 overflow-hidden rounded-lg">
                    <Image
                      src={item.media.src}
                      alt={item.media.alt}
                      fill
                      sizes="(min-width: 1024px) 42vw, 92vw"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                    {locale === 'de' ? 'Abendrhythmus' : 'Evening rhythm'}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-[var(--casa-ink)]">{item.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-[var(--casa-muted)]">{item.description}</p>
                  <Link
                    href={item.href}
                    className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--casa-ink-deep)] px-5 text-sm font-bold text-white shadow-[var(--shadow-soft)] transition-colors hover:bg-[var(--casa-ink-deep-hover)]"
                  >
                    {item.ctaLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section data-reveal="true" className={cn('space-y-6 md:space-y-7', className)}>
      {sectionHeader}

      <div className="w-full">
        <ul
          className={cn(
            'grid auto-rows-fr min-[500px]:grid-cols-2',
            isFeaturePair ? 'gap-5 md:gap-6' : 'gap-6',
            gridColumnsClass
          )}
        >
          {items.map((item, index) => (
            <li key={item.id ?? item.href} className={cn(index >= 3 && !showAll ? 'hidden md:block' : '')}>
              <article
                className={cn(
                  'group flex h-full flex-col bg-white shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70 transition-all hover:-translate-y-0.5 hover:ring-[var(--casa-blue)]/35',
                  isFeaturePair
                    ? 'overflow-hidden rounded-lg p-5 md:p-6'
                    : 'rounded-3xl p-6'
                )}
              >
                {item.media ? (
                  <div
                    className={cn(
                      'casa-media-overlay casa-media-overlay-card relative mb-4 overflow-hidden',
                      isFeaturePair ? 'h-52 rounded-lg md:h-56' : 'h-48 rounded-xl md:h-52'
                    )}
                  >
                    <Image
                      src={item.media.src}
                      alt={item.media.alt}
                      fill
                      sizes="(min-width: 1280px) 28vw, (min-width: 1024px) 42vw, (min-width: 640px) 44vw, 92vw"
                      className="object-cover"
                    />
                  </div>
                ) : null}
                <p className={cn('font-bold text-[var(--casa-ink)]', isFeaturePair ? 'text-xl' : 'text-base')}>
                  {item.title}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {item.meta ? (
                    <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                      {item.meta}
                    </p>
                  ) : null}
                  {item.deadlineIso ? <DeadlineBadge deadlineIso={item.deadlineIso} locale={locale} /> : null}
                </div>
                <p className="mt-4 text-base leading-relaxed text-[var(--casa-muted)]">{item.description}</p>
                {showBestFor ? (
                  <div className="mt-5 border-t border-[color:var(--casa-sand)]/80 pt-3">
                    <p className="text-xs font-semibold text-[var(--casa-accent-text)]">{item.bestFor}</p>
                  </div>
                ) : null}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                  <Link
                    href={item.href}
                    className={cn(
                      'inline-flex items-center gap-2 text-sm font-bold transition-colors',
                      isFeaturePair
                        ? 'rounded-lg bg-[var(--casa-ink-deep)] px-4 py-2.5 text-white shadow-[var(--shadow-soft)] hover:bg-[var(--casa-ink-deep-hover)]'
                        : 'text-[var(--casa-ink)] group-hover:text-[var(--casa-accent-text)]'
                    )}
                  >
                    {item.ctaLabel}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                  {compareType && item.compare ? (
                    <CompareToggleButton
                      type={compareType}
                      locale={locale}
                      item={item.compare}
                    />
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
        {renderShowMoreButton(3)}
      </div>
    </section>
  );
}
