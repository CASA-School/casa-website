import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import {
  formatNewsDate,
  NewsPostBody,
  NewsPostLead,
} from '@/components/news/news-post-renderer';
import { JsonLdScript } from '@/components/seo/json-ld';
import { Container } from '@/components/ui/container';
import { TextCta } from '@/components/ui/text-cta';
import { getContentLocale } from '@/lib/content/locale.server';
import { getNewsList, getNewsPost } from '@/lib/content/repository';
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
  const { slug } = await params;

  const [post, newsList] = await Promise.all([
    getNewsPost(slug, locale),
    getNewsList(locale),
  ]);

  if (!post) {
    notFound();
  }
  const copy =
    locale === 'de'
      ? {
          backToIssue: 'Zurück zum NewsFlash',

          eyebrow: 'Artikel des Monats',
          nextStepTitle: 'Der nächste Schritt',

          nextStepBody:
            'Aus dem Gelesenen soll Fortschritt werden? Wir empfehlen Ihnen den passenden Kurs und einen realistischen Zeitplan.',

          findCourse: 'Kurs finden',
          talkToAdmissions: 'Lieber erst beraten lassen',

          relatedTitle: 'Weitere Artikel',
        }
      : {
          backToIssue: 'Back to the NewsFlash',

          eyebrow: 'Article of the month',
          nextStepTitle: 'Your next step',

          nextStepBody:
            'Ready to turn this into progress? We can recommend the right course and a realistic timeline.',

          findCourse: 'Find my course',
          talkToAdmissions: 'Ask an advisor first',

          relatedTitle: 'More articles',
        };


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
      {/*
        NO PageHero here, deliberately.

        It rendered a generic marketing headline ("Vom Impuls zum nächsten
        Sprachlern-Meilenstein") that was not the article's, a striped data
        panel, a process box, two competing buttons and the school's proof
        metrics — and then the real article title appeared underneath it. Two
        headers on one page, and the furniture said nothing about the piece you
        had clicked to read. The article's own lead is the header.

        Category, author, reading time and date all still appear, inside
        NewsPostLead where they belong to the article rather than to a panel.
      */}
      {/*
        One editorial column. No sidebar, no card, no conversion panel.

        This carried a two-column layout with the article boxed on the left and a
        warm CTA block plus a related-articles card on the right — which reads as
        a landing page that happens to contain prose. An article page has one
        job, so the measure is a reading measure (44rem, roughly 70 characters at
        17px) and everything else sits after the piece rather than beside it.

        Also fixed: every string here was hardcoded English, so a German reader
        got "Back to all news" and "Plan your next step" on a German article.
      */}
      <section className="pb-20 pt-10 md:pt-14">
        <Container>
          <div className="mx-auto max-w-[44rem]">
            <Link
              href="/news"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--casa-muted)] transition-colors hover:text-[var(--casa-accent-text)]"
            >
              <ArrowLeft className="h-4 w-4" />
              {copy.backToIssue}
            </Link>

            <div className="mt-10">
              <NewsPostLead
                locale={locale}
                category={post.category}
                title={post.title}
                summary={post.summary}
                body={post.body}
                publishedAt={post.publishedAt}
                author={post.author}
              />
            </div>

            <div className="mt-8">
              <NewsPostBody body={post.body} contentJson={post.contentJson} />
            </div>

            {/*
              A single quiet line at the end, not a panel. The reader who finishes
              an article is the one worth inviting onward, and one sentence with
              one link does that without turning the page into a funnel.
            */}
            <div className="mt-12 border-t border-[color:var(--casa-sand)] pt-8">
              <p className="text-[15px] leading-relaxed text-[var(--casa-muted)]">
                {copy.nextStepBody}
              </p>
              <TextCta href="/courses" className="mt-4">
                {copy.findCourse}
              </TextCta>
            </div>

            {related.length > 0 ? (
              <div className="mt-14 border-t border-[color:var(--casa-sand)] pt-8">
                <h2 className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                  {copy.relatedTitle}
                </h2>
                <ul className="mt-5 divide-y divide-[color:var(--casa-sand)]">
                  {related.map((item) => (
                    <li key={item.slug}>
                      <Link href={`/news/${item.slug}`} className="group flex items-baseline justify-between gap-4 py-4">
                        <span className="min-w-0">
                          <span className="block text-lg font-bold leading-snug text-[var(--casa-ink)] group-hover:text-[var(--casa-accent-text)]">
                            {item.title}
                          </span>
                          <span className="mt-1 block text-xs text-[var(--casa-muted)]">
                            {formatNewsDate(item.publishedAt, locale)}
                          </span>
                        </span>
                        <ArrowRight
                          className="h-4 w-4 shrink-0 text-[var(--casa-muted)] transition-transform duration-300 motion-safe:group-hover:translate-x-1"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Container>
      </section>

    </main>
  );
}
