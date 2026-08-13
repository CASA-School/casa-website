import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, CalendarDays, HelpCircle, Newspaper } from 'lucide-react';

import { HeroEMinimal } from '@/components/heroes';
import { UnifiedSearchPanel } from '@/components/sections';
import { Container } from '@/components/ui/container';
import { getContentLocale } from '@/lib/content/locale.server';
import { getSearchScope, searchPublicContent, type PublicSearchResultType } from '@/lib/search/public-search';
import { createPublicMetadata } from '@/lib/seo';
import { cn } from '@/lib/utils';

export const metadata: Metadata = createPublicMetadata({
  title: 'Search',
  description: 'Search across CASA courses, exams, FAQ, and news from one place.',
  path: '/search',
  keywords: ['CASA search', 'courses exams faq news'],
});

type SearchPageProps = {
  searchParams: Promise<{ q?: string; scope?: string }>;
};

function SearchResultGroup({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[color:var(--casa-sand)] bg-white p-4 shadow-[var(--shadow-soft)] sm:p-5">
      <header className="flex items-center justify-between gap-3 border-b border-[color:var(--casa-sand)] pb-3">
        <h2 className="text-lg font-bold text-[var(--casa-ink)]">{title}</h2>
        <span className="rounded-full bg-[var(--casa-warm-soft)] px-2.5 py-1 text-xs font-bold text-[var(--casa-muted)]">
          {count}
        </span>
      </header>
      <ul className="mt-3 space-y-2">{children}</ul>
    </section>
  );
}

function SearchResultCard({
  href,
  icon,
  eyebrow,
  title,
  snippet,
  meta = [],
  badges = [],
  actionLabel,
  tone = 'default',
}: {
  href: string;
  icon: ReactNode;
  eyebrow: string;
  title: string;
  snippet: string;
  meta?: string[];
  badges?: string[];
  actionLabel: string;
  tone?: 'default' | 'blue';
}) {
  return (
    <li>
      <Link
        href={href}
        className="group grid gap-3 rounded-xl border border-transparent bg-transparent p-3 text-[var(--casa-ink)] transition-colors hover:border-[color:var(--casa-sand)]/80 hover:bg-[var(--casa-bg)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:p-4"
      >
        <span
          className={cn(
            'inline-flex h-10 w-10 items-center justify-center rounded-full',
            tone === 'blue' ? 'bg-[var(--casa-blue)]/10 text-[var(--casa-accent-text)]' : 'bg-white text-[var(--casa-muted)]'
          )}
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--casa-muted)]">{eyebrow}</span>
            {badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-[color:var(--casa-sand)] bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--casa-muted)]"
              >
                {badge}
              </span>
            ))}
          </span>
          <span className="mt-1 block text-sm font-bold leading-snug text-[var(--casa-ink)] group-hover:text-[var(--casa-accent-text)] sm:text-base">
            {title}
          </span>
          <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-[var(--casa-muted)]">{snippet}</span>
          {meta.length > 0 ? (
            <span className="mt-2 flex flex-wrap gap-1.5">
              {meta.map((item) => (
                <span key={item} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[var(--casa-muted)]">
                  {item}
                </span>
              ))}
            </span>
          ) : null}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--casa-accent-text)] sm:justify-self-end">
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const locale = await getContentLocale();
  const { q, scope: rawScope } = await searchParams;
  const query = (q ?? '').trim();
  const scope = getSearchScope(rawScope);
  const shouldSearch = query.length > 1;
  const search = await searchPublicContent({ locale, query, scope, limitPerGroup: 8 });
  const totalResults = search.totalResults;
  const resultGroups = search.groups;
  const scopeLabel =
    locale === 'de'
      ? {
          all: 'Alle Inhalte',
          courses: 'Kurse',
          exams: 'Prüfungen',
          faq: 'FAQ',
          news: 'News',
        }[scope]
      : {
          all: 'All content',
          courses: 'Courses',
          exams: 'Exams',
          faq: 'FAQ',
          news: 'News',
        }[scope];

  const resultTypeLabels: Record<PublicSearchResultType, string> = {
    courses: locale === 'de' ? 'Kurs' : 'Course',
    exams: locale === 'de' ? 'Prüfung' : 'Exam',
    faq: 'FAQ',
    news: 'News',
  };
  const resultActionLabels: Record<PublicSearchResultType, string> = {
    courses: locale === 'de' ? 'Kurs ansehen' : 'View course',
    exams: locale === 'de' ? 'Prüfung ansehen' : 'View exam',
    faq: locale === 'de' ? 'FAQ öffnen' : 'Open FAQ',
    news: locale === 'de' ? 'Artikel lesen' : 'Read article',
  };

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]">
      <HeroEMinimal
        eyebrow={locale === 'de' ? 'Suche' : 'Search'}
        title={locale === 'de' ? 'Ein Suchfeld für Kurse, Prüfungen, FAQ und News' : 'One search entry for courses, exams, FAQ, and news'}
        description={
          locale === 'de'
            ? 'Finden Sie Informationen schneller, ohne zwischen Seiten zu wechseln.'
            : 'Find answers faster without jumping between pages.'
        }
        breadcrumbs={[
          { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
          { label: locale === 'de' ? 'Suche' : 'Search' },
        ]}
        cta={{ label: locale === 'de' ? 'Kontakt' : 'Contact', href: '/contact', kind: 'secondary' }}
        meta={[
          locale === 'de' ? 'Zentrale Suche' : 'Unified search',
          locale === 'de' ? 'Kurse + Prüfungen + FAQ + News' : 'Courses + Exams + FAQ + News',
        ]}
      />

      <section className="py-14 md:py-16">
        <Container className="space-y-8">
          <UnifiedSearchPanel locale={locale} defaultScope={scope} />

          {shouldSearch ? (
            <p className="text-sm text-[var(--casa-muted)]">
              {locale === 'de'
                ? `${totalResults} Treffer für "${q}" in "${scopeLabel}"`
                : `${totalResults} results for "${q}" in "${scopeLabel}"`}
            </p>
          ) : (
            <p className="text-sm text-[var(--casa-muted)]">
              {locale === 'de'
                ? 'Geben Sie einen Suchbegriff ein, um Ergebnisse zu sehen.'
                : 'Enter a search term to see results.'}
            </p>
          )}

          {shouldSearch && totalResults === 0 ? (
            <section className="rounded-xl border border-[color:var(--casa-sand)] bg-white p-5 shadow-[var(--shadow-soft)]">
              <h2 className="text-lg font-bold">{locale === 'de' ? 'Keine Treffer gefunden' : 'No matching results found'}</h2>
              <p className="mt-2 text-sm text-[var(--casa-muted)]">
                {locale === 'de'
                  ? 'Versuchen Sie ein breiteres Stichwort oder wechseln Sie den Suchbereich.'
                  : 'Try a broader keyword or switch the search scope.'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/courses" className="text-sm font-semibold text-[var(--casa-accent-text)] hover:underline">
                  {locale === 'de' ? 'Alle Kurse ansehen' : 'Browse all courses'}
                </Link>
                <Link href="/contact" className="text-sm font-semibold text-[var(--casa-accent-text)] hover:underline">
                  {locale === 'de' ? 'Beratung anfragen' : 'Contact admissions'}
                </Link>
              </div>
            </section>
          ) : null}

          {resultGroups.courses.length > 0 ? (
            <SearchResultGroup title={locale === 'de' ? 'Kurse' : 'Courses'} count={search.counts.courses}>
              {resultGroups.courses.map((result) => (
                <SearchResultCard
                  key={result.id}
                  href={result.href}
                  icon={<BookOpen className="h-4 w-4" aria-hidden="true" />}
                  eyebrow={resultTypeLabels.courses}
                  title={result.title}
                  snippet={result.snippet}
                  badges={result.badges}
                  meta={result.meta}
                  actionLabel={resultActionLabels.courses}
                  tone="blue"
                />
              ))}
            </SearchResultGroup>
          ) : null}

          {resultGroups.exams.length > 0 ? (
            <SearchResultGroup title={locale === 'de' ? 'Prüfungen' : 'Exams'} count={search.counts.exams}>
              {resultGroups.exams.map((result) => (
                <SearchResultCard
                  key={result.id}
                  href={result.href}
                  icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
                  eyebrow={resultTypeLabels.exams}
                  title={result.title}
                  snippet={result.snippet}
                  badges={result.badges}
                  meta={result.meta}
                  actionLabel={resultActionLabels.exams}
                  tone="blue"
                />
              ))}
            </SearchResultGroup>
          ) : null}

          {resultGroups.faq.length > 0 ? (
            <SearchResultGroup title="FAQ" count={search.counts.faq}>
              {resultGroups.faq.map((result) => (
                <SearchResultCard
                  key={result.id}
                  href={result.href}
                  icon={<HelpCircle className="h-4 w-4" aria-hidden="true" />}
                  eyebrow={resultTypeLabels.faq}
                  title={result.title}
                  snippet={result.snippet}
                  meta={result.meta}
                  badges={result.badges}
                  actionLabel={resultActionLabels.faq}
                />
              ))}
            </SearchResultGroup>
          ) : null}

          {resultGroups.news.length > 0 ? (
            <SearchResultGroup title="News" count={search.counts.news}>
              {resultGroups.news.map((result) => (
                <SearchResultCard
                  key={result.id}
                  href={result.href}
                  icon={<Newspaper className="h-4 w-4" aria-hidden="true" />}
                  eyebrow={resultTypeLabels.news}
                  title={result.title}
                  snippet={result.snippet}
                  meta={result.meta}
                  badges={result.badges}
                  actionLabel={resultActionLabels.news}
                />
              ))}
            </SearchResultGroup>
          ) : null}
        </Container>
      </section>
    </main>
  );
}
