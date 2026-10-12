import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { ArrowRight, BookOpen, CalendarDays, FileText, HelpCircle, Newspaper, Sparkles } from 'lucide-react';

import { HeroEMinimal } from '@/components/heroes';
import { UnifiedSearchPanel } from '@/components/sections';
import { Container } from '@/components/ui/container';
import { getContentLocale } from '@/lib/content/locale.server';
import { getSearchScope, searchPublicContent, type PublicSearchResultType } from '@/lib/search/public-search';
import { createPublicMetadata } from '@/lib/seo';
import { cn } from '@/lib/utils';
import { say } from '@/lib/cms/copy';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return {
    ...createPublicMetadata({
      locale,
      title: locale === 'de' ? 'Suche' : 'Search',
      description: locale === 'de' ? 'Hier durchsuchst du die ganze CASA-Website: Kurse, Prüfungen, Unterkunft, Antworten und Neuigkeiten.' : 'Search the whole CASA website: courses, exams, accommodation, answers and news.',
      path: '/search',
      keywords: ['CASA search', 'courses exams faq news'],
    }),
    // A results page per query is not a page to rank; its links still are.
    robots: { index: false, follow: true },
  };
}

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
            <span className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{eyebrow}</span>
            {badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-[color:var(--casa-sand)] bg-white px-2 py-0.5 text-xs font-semibold text-[var(--casa-muted)]"
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
                <span key={item} className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[var(--casa-muted)]">
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
          pages: 'Seiten',
          courses: 'Kurse',
          exams: 'Prüfungen',
          faq: 'FAQ',
          news: 'Aktuelles',
        }[scope]
      : {
          all: 'All content',
          pages: 'Pages',
          courses: 'Courses',
          exams: 'Exams',
          faq: 'FAQ',
          news: 'News',
        }[scope];

  const resultTypeLabels: Record<PublicSearchResultType, string> = {
    pages: say(locale, 'Seite', 'Page'),
    courses: say(locale, 'Kurs', 'Course'),
    exams: say(locale, 'Prüfung', 'Exam'),
    faq: 'FAQ',
    news: say(locale, 'Aktuelles', 'News'),
  };
  const resultActionLabels: Record<PublicSearchResultType, string> = {
    pages: say(locale, 'Seite öffnen', 'Open page'),
    courses: say(locale, 'Kurs ansehen', 'View course'),
    exams: say(locale, 'Prüfung ansehen', 'View exam'),
    faq: say(locale, 'FAQ öffnen', 'Open FAQ'),
    news: say(locale, 'Artikel lesen', 'Read article'),
  };

  const groupTitles: Record<PublicSearchResultType, string> = {
    pages: say(locale, 'Seiten', 'Pages'),
    courses: say(locale, 'Kurse', 'Courses'),
    exams: say(locale, 'Prüfungen', 'Exams'),
    faq: 'FAQ',
    news: say(locale, 'Aktuelles', 'News'),
  };
  const groupIcons: Record<PublicSearchResultType, typeof BookOpen> = {
    pages: FileText,
    courses: BookOpen,
    exams: CalendarDays,
    faq: HelpCircle,
    news: Newspaper,
  };

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]">
      <HeroEMinimal
        eyebrow={say(locale, 'Suche', 'Search')}
        title={say(locale, 'Ein Suchfeld für die ganze Website', 'One search box for the whole website')}
        description={
          say(locale, 'So findest du schnell, was du suchst, ohne dich durch viele Seiten zu klicken.', 'Find what you’re looking for quickly, without clicking through lots of pages.')
        }
        breadcrumbs={[
          { label: say(locale, 'Start', 'Home'), href: '/' },
          { label: say(locale, 'Suche', 'Search') },
        ]}
        cta={{ label: say(locale, 'Kontakt', 'Contact'), href: '/contact', kind: 'secondary' }}
        meta={[
          say(locale, 'Zentrale Suche', 'Site-wide search'),
          say(locale, 'Seiten, Kurse, Prüfungen, FAQ, Aktuelles', 'Pages, courses, exams, FAQ, news'),
        ]}
      />

      <section className="py-14 md:py-16">
        <Container className="space-y-8">
          <UnifiedSearchPanel locale={locale} defaultScope={scope} />

          {shouldSearch ? (
            <p className="text-sm text-[var(--casa-muted)]">
              {say(locale, '{totalResults} Treffer für „{q}“ in „{scopeLabel}“', '{totalResults} {value} for “{q}” in “{scopeLabel}”', { totalResults, q, scopeLabel, value: totalResults === 1 ? 'result' : 'results' })}
            </p>
          ) : (
            <p className="text-sm text-[var(--casa-muted)]">
              {say(locale, 'Gib einen Suchbegriff ein, dann siehst du hier die Ergebnisse.', 'Enter a search term and your results will appear here.')}
            </p>
          )}

          {shouldSearch && totalResults === 0 ? (
            <section className="rounded-xl border border-[color:var(--casa-sand)] bg-white p-5 shadow-[var(--shadow-soft)]">
              <h2 className="text-lg font-bold">{say(locale, 'Keine Treffer gefunden', 'No results found')}</h2>
              <p className="mt-2 text-sm text-[var(--casa-muted)]">
                {say(locale, 'Versuch es mit einem allgemeineren Wort oder wähle einen anderen Suchbereich.', 'Try a more general word or choose a different area to search.')}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/courses" className="text-sm font-semibold text-[var(--casa-accent-text)] hover:underline">
                  {say(locale, 'Alle Kurse ansehen', 'See all courses')}
                </Link>
                <Link href="/contact" className="text-sm font-semibold text-[var(--casa-accent-text)] hover:underline">
                  {say(locale, 'Beratung anfragen', 'Get advice')}
                </Link>
              </div>
            </section>
          ) : null}

          {search.answer ? (
            <section className="rounded-xl border border-[color:var(--casa-blue)]/25 bg-[var(--casa-warm-panel)] p-4 sm:p-5" aria-labelledby="search-answer">
              <p id="search-answer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--casa-accent-text)]">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {say(locale, 'Direkt beantwortet', 'Quick answer')}
              </p>
              <p className="mt-2 max-w-measure text-base leading-relaxed text-[var(--casa-ink)]">{search.answer.message}</p>
              <Link href={search.answer.href} className="tap-target mt-3 inline-flex items-center gap-1 text-sm font-bold text-[var(--casa-accent-text)] hover:underline">
                {search.answer.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </section>
          ) : null}

          {search.didYouMean ? (
            <p className="text-sm text-[var(--casa-muted)]">
              {say(locale, 'Meintest du', 'Did you mean')}{' '}
              <Link href={`/search?q=${encodeURIComponent(search.didYouMean)}&scope=${scope}`} className="font-semibold text-[var(--casa-accent-text)] hover:underline">
                {search.didYouMean}
              </Link>
              ?
            </p>
          ) : null}

          {search.order.map((type) =>
            resultGroups[type].length > 0 ? (
              <SearchResultGroup key={type} title={groupTitles[type]} count={search.counts[type]}>
                {resultGroups[type].map((result) => {
                  const Icon = groupIcons[type];
                  return (
                    <SearchResultCard
                      key={result.id}
                      href={result.href}
                      icon={<Icon className="h-4 w-4" aria-hidden="true" />}
                      eyebrow={result.context ?? resultTypeLabels[type]}
                      title={result.title}
                      snippet={result.snippet}
                      badges={result.badges}
                      meta={result.meta}
                      actionLabel={resultActionLabels[type]}
                      tone={type === 'courses' || type === 'exams' ? 'blue' : 'default'}
                    />
                  );
                })}
              </SearchResultGroup>
            ) : null
          )}
        </Container>
      </section>
    </main>
  );
}
