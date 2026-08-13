import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Briefcase, CalendarDays, Newspaper } from 'lucide-react';

import { PageHero } from '@/components/marketing/hero/page-hero';
import { JsonLdScript } from '@/components/seo/json-ld';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { shouldShowDraftClaims } from '@/lib/content/locale';
import { getContentLocale } from '@/lib/content/locale.server';
import { getCareerPositions, getNewsList, getPageHero } from '@/lib/content/repository';
import { publishDueScheduledPosts } from '@/lib/news/publishDueScheduledPosts';
import { createPublicMetadata, toAbsoluteUrl } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'News',
  description:
    'Read CASA Bremen stories, language-learning insights, and community updates for international students.',
  path: '/news',
  keywords: ['CASA news', 'language learning stories Bremen', 'German school journal'],
});

function formatDate(value: string, locale: 'en' | 'de') {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function estimateReadingTime(text: string) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

export default async function NewsPage() {
  await publishDueScheduledPosts();

  const locale = await getContentLocale();
  const showDraftClaims = shouldShowDraftClaims();

  const [hero, posts, careerOpenings] = await Promise.all([
    Promise.resolve(getPageHero('news', locale)),
    getNewsList(locale),
    getCareerPositions(locale),
  ]);

  const [featured, ...otherPosts] = posts;

  if (!featured) {
    return (
      <main className="bg-white text-[var(--casa-ink)]">
        <Container className="py-20">
          <h1 className="text-3xl font-black">News</h1>
          <p className="mt-3 text-base text-slate-600">No articles are available yet.</p>
        </Container>
      </main>
    );
  }

  const copy =
    locale === 'de'
      ? {
          featured: 'Hauptbeitrag',
          latestEyebrow: 'Neuigkeiten',
          latestTitle: 'Aktuelles aus der CASA Community',
          latestDescription: 'Kurze, klare Updates zu Kursen, Prüfungen, Alltag und Community.',
          readArticle: 'Vollständigen Artikel lesen',
          panelFeatured: 'Featured story',
          panelLatest: 'Latest updates',
          panelCareers: 'Team opportunities',
          panelContact: 'Talk to admissions',
          careersEyebrow: 'Karriere',
          careersTitle: 'Offene Stellen und Mitarbeit bei CASA',
          careersDescription: 'Neue Rollen und Team-Updates erscheinen hier laufend.',
          applyNow: 'Rolle ansehen',
        }
      : {
          featured: 'Featured story',
          latestEyebrow: 'Updates',
          latestTitle: 'Latest from the CASA community',
          latestDescription: 'Clear updates on courses, exams, student life, and community.',
          readArticle: 'Open full article',
          panelFeatured: 'Featured story',
          panelLatest: 'Latest updates',
          panelCareers: 'Team opportunities',
          panelContact: 'Talk to admissions',
          careersEyebrow: 'Careers',
          careersTitle: 'Open roles and team opportunities at CASA',
          careersDescription: 'New positions and team updates are published here regularly.',
          applyNow: 'View role details',
        };

  const newsListSchema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'CASA Journal',
    url: toAbsoluteUrl('/news'),
    blogPost: posts.map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      datePublished: post.publishedAt,
      description: post.summary,
      url: toAbsoluteUrl(`/news/${post.slug}`),
      author: {
        '@type': 'Organization',
        name: post.author,
      },
    })),
  };

  return (
    <main className="bg-white text-[var(--casa-ink)]">
      <JsonLdScript id="news-list-schema" data={newsListSchema} />
      <PageHero
        spec={{ ...hero, proofMetrics: [] }}
        showDraftClaims={showDraftClaims}
        breadcrumbs={[
          { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
          { label: locale === 'de' ? 'News' : 'News' },
        ]}
        quickLinks={[
          { label: copy.panelFeatured, href: '/news#featured' },
          { label: copy.panelLatest, href: '/news#latest' },
          { label: copy.panelCareers, href: '/news#careers' },
          { label: copy.panelContact, href: '/contact' },
        ]}
      />

      <section className="py-16 md:py-20">
        <Container className="space-y-12 md:space-y-14">
          <article id="featured" className="casa-card-surface p-7 sm:p-8">
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--casa-warm-soft)]/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-ink)]">
              <Newspaper className="h-3.5 w-3.5 text-[var(--casa-accent-text)]" />
              {copy.featured}
            </p>
            <h2 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{featured.title}</h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--casa-muted)]">{featured.summary}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[var(--casa-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {formatDate(featured.publishedAt, locale)}
              </span>
              <span>{estimateReadingTime(featured.body)} min read</span>
              <span className="rounded-full border border-[color:var(--casa-sand)] px-2.5 py-1 text-xs font-semibold">
                {featured.category}
              </span>
            </div>
            <div className="mt-6">
              <Button asChild className="h-11 rounded-lg casa-button-prism bg-[var(--casa-ink-deep)] px-5 font-semibold text-white hover:bg-[var(--casa-ink-deep-hover)]">
                <Link href={`/news/${featured.slug}`}>
                  {copy.readArticle}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </article>

          <section id="latest" className="casa-card-surface p-7 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{copy.latestEyebrow}</p>
            <h3 className="mt-2 text-2xl font-bold sm:text-3xl">{copy.latestTitle}</h3>
            <p className="mt-3 text-base leading-relaxed text-[var(--casa-muted)]">{copy.latestDescription}</p>

            <ul className="mt-6 divide-y divide-[color:var(--casa-sand)]/85">
              {otherPosts.slice(0, 8).map((post) => (
                <li key={post.slug} className="py-5">
                  <article className="grid gap-3 md:grid-cols-[1.3fr_auto] md:items-start md:gap-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-muted)]">{post.category}</p>
                      <h4 className="mt-1 text-xl font-bold text-[var(--casa-ink)]">{post.title}</h4>
                      <p className="mt-2 text-base leading-relaxed text-[var(--casa-muted)]">{post.summary}</p>
                      <p className="mt-2 text-sm text-[var(--casa-muted)]">
                        {formatDate(post.publishedAt, locale)} • {estimateReadingTime(post.body)} min
                      </p>
                    </div>
                    <div>
                      <Button asChild variant="outline" className="h-9 rounded-lg casa-button-outline border-[color:var(--casa-sand)] px-3 text-sm font-semibold text-[var(--casa-ink)] hover:bg-[var(--casa-warm-soft)]">
                        <Link href={`/news/${post.slug}`}>
                          {copy.readArticle}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </section>

          <section id="careers" className="rounded-3xl border border-[color:var(--casa-sand)]/80 bg-[var(--casa-warm-soft)]/42 p-7 sm:p-8">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
              <Briefcase className="h-3.5 w-3.5" />
              {copy.careersEyebrow}
            </p>
            <h3 className="mt-2 text-2xl font-bold sm:text-3xl">{copy.careersTitle}</h3>
            <p className="mt-3 text-base leading-relaxed text-[var(--casa-muted)]">{copy.careersDescription}</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {careerOpenings.length > 0 ? (
                careerOpenings.slice(0, 3).map((role) => (
                  <article key={`${role.slug}-${role.locale}`} className="rounded-xl bg-white p-5 shadow-[var(--shadow-soft)]">
                    <h4 className="text-base font-bold text-[var(--casa-ink)]">{role.title}</h4>
                    <p className="mt-1 text-sm text-[var(--casa-muted)]">{role.location}</p>
                    <p className="mt-1 text-sm text-[var(--casa-muted)]">{role.employmentType}</p>
                    <Link
                      href={`/careers/${role.slug}`}
                      className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
                    >
                      {copy.applyNow}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </article>
                ))
              ) : (
                <article className="rounded-xl bg-white p-5 shadow-[var(--shadow-soft)] md:col-span-3">
                  <h4 className="text-base font-bold text-[var(--casa-ink)]">
                    {locale === 'de' ? 'Aktuell keine offenen Stellen' : 'No open roles at the moment'}
                  </h4>
                  <p className="mt-1 text-sm text-[var(--casa-muted)]">
                    {locale === 'de'
                      ? 'Senden Sie uns gerne eine Initiativbewerbung.'
                      : 'You can still send an initiative application.'}
                  </p>
                  <Link
                    href="/contact?topic=careers"
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
                  >
                    {copy.applyNow}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </article>
              )}
            </div>
          </section>
        </Container>
      </section>
    </main>
  );
}
