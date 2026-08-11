import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { PageHero } from '@/components/marketing/hero/page-hero';
import {
  estimateNewsReadingTime,
  formatNewsDate,
  NewsPostBody,
  NewsPostLead,
} from '@/components/news/news-post-renderer';
import { JsonLdScript } from '@/components/seo/json-ld';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { shouldShowDraftClaims } from '@/lib/content/locale';
import { getContentLocale } from '@/lib/content/locale.server';
import { getNewsList, getNewsPost, getPageHero } from '@/lib/content/repository';
import { publishDueScheduledPosts } from '@/lib/news/publishDueScheduledPosts';
import { createPublicMetadata, toAbsoluteUrl } from '@/lib/seo';

type NewsDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  await publishDueScheduledPosts();

  const { slug } = await params;
  const post = await getNewsPost(slug, 'en');

  if (!post) {
    return createPublicMetadata({
      title: 'Article',
      description: 'CASA Bremen article',
      path: `/news/${slug}`,
    });
  }

  return createPublicMetadata({
    title: post.title,
    description: post.summary,
    path: `/news/${post.slug}`,
    keywords: ['CASA article', post.category, 'German learning Bremen'],
  });
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  await publishDueScheduledPosts();

  const locale = await getContentLocale();
  const showDraftClaims = shouldShowDraftClaims();
  const { slug } = await params;

  const [hero, post, newsList] = await Promise.all([
    Promise.resolve(getPageHero('news-detail', locale)),
    getNewsPost(slug, locale),
    getNewsList(locale),
  ]);

  if (!post) {
    notFound();
  }

  const related = newsList.filter((item) => item.slug !== post.slug).slice(0, 2);
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.summary,
    datePublished: post.publishedAt,
    author: {
      '@type': 'Organization',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'CASA Internationale Sprachschule Bremen',
    },
    mainEntityOfPage: toAbsoluteUrl(`/news/${post.slug}`),
  };

  return (
    <main className="bg-white text-[var(--casa-ink)]">
      <JsonLdScript id={`news-article-schema-${post.slug}`} data={articleSchema} />
      <PageHero
        spec={hero}
        showDraftClaims={showDraftClaims}
        breadcrumbs={[
          { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
          { label: locale === 'de' ? 'News' : 'News', href: '/news' },
          { label: post.title },
        ]}
        utilityItems={[
          { label: locale === 'de' ? 'Kategorie' : 'Category', value: post.category },
          { label: locale === 'de' ? 'Autor' : 'Author', value: post.author },
          { label: locale === 'de' ? 'Lesedauer' : 'Reading time', value: `${estimateNewsReadingTime(post.body)} min` },
          { label: locale === 'de' ? 'Veröffentlicht' : 'Published', value: formatNewsDate(post.publishedAt, locale) },
        ]}
      />

      <section className="py-16 md:py-20">
        <Container>
          <Link href="/news" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-[var(--casa-accent-text)]">
            <ArrowLeft className="h-4 w-4" />
            Back to all news
          </Link>

          <NewsPostLead
            locale={locale}
            category={post.category}
            title={post.title}
            summary={post.summary}
            body={post.body}
            publishedAt={post.publishedAt}
            author={post.author}
          />
        </Container>
      </section>

      <section className="pb-14 sm:pb-16">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <NewsPostBody body={post.body} contentJson={post.contentJson} />

            <aside className="space-y-5">
              <div className="rounded-3xl border border-[color:var(--casa-sand)]/60 bg-[var(--casa-warm-soft)]/45 p-6">
                <h2 className="text-xl font-black">Plan your next step</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Ready to turn this insight into progress? We can recommend the best course and timeline for you.
                </p>
                <div className="mt-5 space-y-3">
                  <Button asChild variant="prism" className="w-full justify-between px-4">
                    <Link href="/courses">
                      Find my course path
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline-prism" className="w-full justify-between bg-white px-4">
                    <Link href="/contact">
                      Talk to admissions
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-3xl border border-[color:var(--casa-sand)]/60 bg-white p-6">
                <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-500">Related articles</h3>
                <ul className="mt-4 space-y-4">
                  {related.map((item) => (
                    <li key={item.slug}>
                      <Link href={`/news/${item.slug}`} className="block rounded-xl border border-[color:var(--casa-sand)]/30 p-4 transition-colors hover:border-[color:var(--casa-sand)]/70">
                        <p className="text-sm font-bold text-[var(--casa-ink)]">{item.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatNewsDate(item.publishedAt, locale)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </Container>
      </section>
    </main>
  );
}
