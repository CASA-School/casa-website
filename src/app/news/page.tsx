import type { Metadata } from 'next';
import Link from 'next/link';
import NextImage from 'next/image';

/*
 * `next/image` directly, not the CasaImage placeholder wrapper.
 *
 * The site-wide placeholders stand in for stock photography still being chosen.
 * Both photographs on this page are the opposite of that — a named editor and a
 * specific event — so they ARE the content, and a colour block would defeat the
 * blocks that hold them.
 */
import { ArrowRight, CalendarDays, Clock, MessageCircle, Sparkles, Star, UserRound } from 'lucide-react';

import { CefrBandBadge } from '@/components/news/cefr-band-badge';
import { NewsFlashTicker } from '@/components/news/newsflash-ticker';
import { localizedText, newsFlashIssue } from '@/config/content/newsflash';
import { JsonLdScript } from '@/components/seo/json-ld';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { getContentLocale } from '@/lib/content/locale.server';
import { getNewsList } from '@/lib/content/repository';
import { publishDueScheduledPosts } from '@/lib/news/publishDueScheduledPosts';
import { createPublicMetadata, toAbsoluteUrl } from '@/lib/seo';
import { cn } from '@/lib/utils';

export const metadata: Metadata = createPublicMetadata({
  title: 'News',
  description:
    'Read CASA Bremen stories, language-learning insights, and community updates for international students.',
  path: '/news',
  keywords: ['CASA news', 'language learning stories Bremen', 'German school journal'],
});

/**
 * Rubric presentation, keyed off the issue config.
 *
 * The editor picks `kind` and `icon` in newsflash.ts and never touches a class
 * name; everything visual is resolved here. That is what keeps a monthly issue
 * a writing job rather than a markup job.
 *
 * Fills are CASA tints, not the printed edition's Canva pink and cyan — the
 * point of the port was the STRUCTURE (a rubric per block, colour-coded, tagged
 * by level), not the palette.
 */
const RUBRIC_ICON = {
  chat: MessageCircle,
  clock: Clock,
  person: UserRound,
  star: Star,
  sparkles: Sparkles,
  calendar: CalendarDays,
} as const;

const RUBRIC_STYLE = {
  notice: {
    panel: 'bg-white shadow-[var(--shadow-card)]',
    medallion: 'bg-[var(--casa-canvas)] text-[var(--casa-accent-text)]',
  },
  tip: {
    panel: 'border-2 border-[var(--casa-sun)] bg-[color-mix(in_srgb,var(--casa-sun)_10%,#fff)]',
    medallion: 'bg-[var(--casa-sun)] text-[var(--casa-ink)]',
  },
  wish: {
    panel: 'bg-[var(--casa-warm-soft)]',
    medallion: 'bg-white text-[var(--casa-gold-deep)]',
  },
  person: {
    panel: 'bg-[color-mix(in_srgb,var(--casa-blue)_10%,#fff)]',
    medallion: 'bg-white text-[var(--casa-accent-text)]',
  },
} as const;

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
  /*
   * Careers were dropped from this page: the NewsFlash is an issue, and open
   * roles are not news every month. /careers still owns them, and the nav still
   * links there — nothing was deleted, it just stopped competing for space in a
   * monthly bulletin.
   */
  const posts = await getNewsList(locale);

  /*
   * Only the lead post is rendered now — the "Updates" list was removed on
   * request. The remaining posts still exist, still have /news/[slug] pages and
   * are still in the site search index; they simply are not linked from here,
   * so nothing was deleted and the list can come back as an archive rubric.
   */
  const [featured] = posts;

  /* Resolved here rather than inside JSX: an IIFE in the middle of the tree is
     harder to read than a named constant, and the icon never changes per render. */
  const FeatureAsideIcon = RUBRIC_ICON[newsFlashIssue.feature.aside?.icon ?? 'star'];

  if (!featured) {
    return (
      <main className="bg-white text-[var(--casa-ink)]">
        <Container className="py-20">
          <h1 className="text-3xl font-black">News</h1>
          <p className="mt-3 text-base text-[var(--casa-muted)]">No articles are available yet.</p>
        </Container>
      </main>
    );
  }

  const copy =
    locale === 'de'
      ? {
          featured: 'Artikel des Monats',
          mastheadLede:
            'Der monatliche NewsFlash der CASA: Kurse, Prüfungen, Termine und Neues aus dem Haus - kurz gehalten und nach Niveau gekennzeichnet.',
          quoteTitle: 'Zitat des Monats',
          editorTitle: 'Wer schreibt hier?',
          tickerLabel: 'Termine dieser Ausgabe',
          wordTitle: 'Wort des Monats',
          readArticle: 'Vollständigen Artikel lesen',
        }
      : {
          featured: 'Article of the month',
          mastheadLede:
            "CASA's monthly NewsFlash: courses, exams, dates and news from the school - kept short and tagged by level.",
          quoteTitle: 'Quote of the month',
          editorTitle: 'Who writes this?',
          tickerLabel: 'Dates in this issue',
          wordTitle: 'Word of the month',
          readArticle: 'Open full article',
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
      {/*
        NEWSFLASH masthead, ported from the printed edition (August 2026).

        A dated masthead rather than a page hero, because this page is an ISSUE,
        not an evergreen index — the month is the first thing a returning reader
        looks for. The wordmark is CASA red on white with a rule above and below,
        which is the printed sheet's own structure; the newsletter's pink and
        cyan panels are not, and have been mapped onto CASA's palette below.
      */}
      <section className="pb-8 pt-12 md:pb-10 md:pt-16">
        <Container>
          <div className="mx-auto max-w-[85rem]">
            <div className="flex flex-wrap items-end justify-between gap-4 pb-3">
              <h1 className="text-5xl font-bold leading-none tracking-tight text-[var(--casa-red)] sm:text-6xl lg:text-7xl">
                NewsFlash
              </h1>
              <p className="pb-1 text-sm font-bold uppercase tracking-eyebrow text-[var(--casa-ink)]">
                {localizedText(newsFlashIssue.issue, locale)}
              </p>
            </div>
            {/*
              The masthead rule, sized off the printed sheet: a hairline directly
              under the wordmark and then a heavy bar beneath it. The weight is
              the point — a 1px line under a 72px wordmark reads as an accident,
              and the printed edition uses a bar you could measure with a ruler.
              Deep red rather than the bright brand red, which at this mass would
              fight the wordmark instead of seating it.
            */}
            <div className="h-px w-full bg-[var(--casa-ink)]" aria-hidden />
            <div
              className="mt-1.5 h-2.5 w-full rounded-[1px] bg-[color-mix(in_srgb,var(--casa-red)_62%,var(--casa-ink-deep))]"
              aria-hidden
            />

            <p className="mt-5 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
              {copy.mastheadLede}
            </p>
          </div>
        </Container>
      </section>

      {/*
        The ticker aligns with the masthead rather than bleeding to the viewport.
        A full-bleed red band sat on nothing — its ends did not meet any other
        edge on the page, so it read as a stripe laid over the layout. Held to the
        same 85rem measure as the wordmark above and the grid below, it reads as
        part of the sheet.
      */}
      <Container>
        <div className="mx-auto max-w-[85rem] overflow-hidden rounded-lg">
          <NewsFlashTicker
            items={newsFlashIssue.ticker.map((entry) => localizedText(entry, locale))}
            label={copy.tickerLabel}
          />
        </div>
      </Container>

      <section className="py-12 md:py-16">
        <Container>
          <div className="mx-auto grid max-w-[85rem] gap-5 lg:grid-cols-3">
            {/*
              SCHLAGZEILEN — the tall tinted column that opens the printed sheet.

              A grouped run of headline items, not another notice, which is why
              it spans two rows and sits first: in the PDF it is the thing your
              eye lands on after the masthead.

              The two rotated bars are the printed edition's washi tape. They are
              the one piece of pure decoration here and they earn it — the tape
              is what stops the panel reading as a plain box, and it is the
              detail that makes the page look made rather than generated.
              `aria-hidden`, obviously.
            */}
            <aside className="relative overflow-hidden rounded-2xl bg-[color-mix(in_srgb,var(--casa-coral)_14%,#fff)] p-7">
              <span
                aria-hidden
                className="absolute -left-6 top-8 h-7 w-28 -rotate-12 bg-[color-mix(in_srgb,var(--casa-coral)_34%,#fff)]/80"
              />
              <span
                aria-hidden
                className="absolute -right-8 bottom-10 h-7 w-28 -rotate-12 bg-[color-mix(in_srgb,var(--casa-coral)_34%,#fff)]/80"
              />

              <div className="relative">
                <h2 className="inline-block border-b-4 border-[var(--casa-ink)] pb-1 text-3xl font-bold text-[var(--casa-ink)]">
                  {localizedText(newsFlashIssue.headlines.title, locale)}
                </h2>

                <div className="mt-6 space-y-6">
                  {newsFlashIssue.headlines.items.map((item) => {
                    const HeadlineIcon = RUBRIC_ICON[item.icon];

                    return (
                      <div key={item.id}>
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[var(--casa-coral)]">
                            <HeadlineIcon className="h-4 w-4" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold uppercase tracking-eyebrow text-[var(--casa-ink)]">
                              {localizedText(item.title, locale)}
                            </p>
                            {item.levels ? <CefrBandBadge bands={item.levels} className="mt-2" /> : null}
                          </div>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-[var(--casa-ink)]/75">
                          {localizedText(item.body, locale)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/*
              THE MONTH'S FEATURE — the long written piece the printed sheet
              leads with, spanning two columns beside the Schlagzeilen column.

              Justified body text with a side note next to the photograph, which
              is how the printed edition sets it. Written FOR the issue by the
              editor, so unlike the Hauptbeitrag lower down it has no URL of its
              own and carries a level tag instead of a byline.
            */}
            <article className="rounded-2xl bg-white p-7 shadow-[var(--shadow-card)] sm:p-8 lg:col-span-2">
              <h2 className="text-2xl font-bold uppercase tracking-tight text-[var(--casa-ink)] sm:text-3xl">
                {localizedText(newsFlashIssue.feature.title, locale)}
              </h2>
              <CefrBandBadge bands={newsFlashIssue.feature.levels} className="mt-3" />

              {/*
                Body full width, then photograph and side note SIDE BY SIDE —
                which is how the printed sheet sets it, and the reason the block
                is not tall.

                The first attempt made the note a tall narrow column beside a
                stacked text+photo, which forced the article to 644px and left the
                Schlagzeilen panel next to it stretching over 400px of empty tint.
                Two short columns under the text cost about 140px less height, so
                the row no longer has to be deep enough for a portrait-shaped
                sidebar.
              */}
              <div className="mt-5 space-y-3">
                {newsFlashIssue.feature.body.map((paragraph, index) => (
                  <p
                    key={index}
                    className="text-sm leading-relaxed text-[var(--casa-muted)] sm:text-[15px] md:text-justify"
                  >
                    {localizedText(paragraph, locale)}
                  </p>
                ))}
              </div>

              <div className="mt-5 grid items-stretch gap-5 sm:grid-cols-[0.62fr_0.38fr]">
                {newsFlashIssue.feature.photo ? (
                  <div className="casa-media-overlay relative aspect-[16/9] overflow-hidden rounded-xl">
                    <NextImage
                      src={newsFlashIssue.feature.photo.src}
                      alt={localizedText(newsFlashIssue.feature.photo.alt, locale)}
                      fill
                      sizes="(min-width: 1024px) 34vw, 92vw"
                      className="object-cover"
                    />
                  </div>
                ) : null}

                {newsFlashIssue.feature.aside ? (
                  <aside className="flex flex-col items-center justify-center gap-3 rounded-xl bg-[var(--casa-warm-soft)]/60 p-5 text-center">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--casa-gold-deep)]">
                      <FeatureAsideIcon className="h-4 w-4" aria-hidden />
                    </span>
                    <p className="text-sm leading-relaxed text-[var(--casa-ink)]/80">
                      {localizedText(newsFlashIssue.feature.aside.text, locale)}
                    </p>
                  </aside>
                ) : null}
              </div>

            </article>

            {/* Wort des Monats — the issue's closing rubric. */}
            <aside className="rounded-2xl bg-[var(--casa-warm-soft)] p-7">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-gold-deep)]">
                {copy.wordTitle}
              </p>
              <p className="mt-3 text-2xl font-bold text-[var(--casa-ink)]">
                &ldquo;{newsFlashIssue.wordOfTheMonth.word}&rdquo;
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--casa-ink)]/75">
                {localizedText(newsFlashIssue.wordOfTheMonth.definition, locale)}
              </p>
            </aside>

            {/*
              Zitat des Monats. The printed edition sets this in a cyan box; CASA
              blue is the equivalent in this palette, and `casa-surface-dark`
              flips the accent tokens so nothing inside needs a hardcoded colour.
            */}
            <aside className="casa-surface-dark flex flex-col justify-center rounded-2xl bg-[var(--casa-ink-deep)] p-7 text-white">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-sun)]">
                {copy.quoteTitle}
              </p>
              <blockquote className="mt-4 text-xl font-bold leading-snug">
                &ldquo;{localizedText(newsFlashIssue.quote.text, locale)}&rdquo;
              </blockquote>
              <p className="mt-3 text-sm text-white/70">— {newsFlashIssue.quote.attribution}</p>
            </aside>

            {/*
              Masthead credit for the person who writes the issue.

              Uses `next/image` directly rather than the CasaImage placeholder
              wrapper: the placeholders stand in for stock photography that is
              still being chosen, whereas this is a specific, named photograph
              that IS the content. A colour block here would defeat the point of
              the block.
            */}
            <aside className="flex items-start gap-4 rounded-2xl bg-white p-7 shadow-[var(--shadow-card)]">
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full ring-2 ring-[var(--casa-sun)]">
                <NextImage
                  src={newsFlashIssue.editor.photo.src}
                  alt={localizedText(newsFlashIssue.editor.photo.alt, locale)}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                  {copy.editorTitle}
                </p>
                <p className="mt-1 text-lg font-bold text-[var(--casa-ink)]">{newsFlashIssue.editor.name}</p>
                <p className="text-xs text-[var(--casa-muted)]">
                  {localizedText(newsFlashIssue.editor.role, locale)}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--casa-muted)]">
                  {localizedText(newsFlashIssue.editor.blurb, locale)}
                </p>
              </div>
            </aside>

            {/*
              Notices. `kind` drives the panel, so the editor picks a rubric and
              the treatment follows — they never touch a class name.
            */}
            {newsFlashIssue.notices.map((notice) => {
              const RubricIcon = RUBRIC_ICON[notice.icon];
              const rubric = RUBRIC_STYLE[notice.kind];

              return (
                <aside key={notice.id} className={cn('rounded-2xl p-7', rubric.panel)}>
                  <div className="flex items-start gap-3">
                    <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', rubric.medallion)}>
                      <RubricIcon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                        {localizedText(notice.title, locale)}
                      </p>
                      {notice.levels ? <CefrBandBadge bands={notice.levels} className="mt-2" /> : null}
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-[var(--casa-muted)]">
                    {localizedText(notice.body, locale)}
                  </p>
                </aside>
              );
            })}

            {/*
              Lead article — the one long read, spanning two columns. It is a real
              news post from the repository, so it keeps its own URL, date and
              search indexing; only the notices around it come from the issue
              config.
            */}
            <article id="featured" className="rounded-2xl bg-white p-7 shadow-[var(--shadow-card)] sm:p-8 lg:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                {copy.featured}
              </p>
              <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{featured.title}</h2>
              <p className="mt-4 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
                {featured.summary}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[var(--casa-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {formatDate(featured.publishedAt, locale)}
                </span>
                <span>{estimateReadingTime(featured.body)} min</span>
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

          </div>
        </Container>
      </section>
    </main>
  );
}
