import { Link } from '@/i18n/navigation';

import { HeroAPhotoLed } from '@/components/heroes';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Container } from '@/components/ui/container';
import { TextCta } from '@/components/ui/text-cta';
import { getOtherResourceGuides, type ResourceGuideData } from '@/content/resource-guides';
import type { ContentLocale } from '@/lib/content/types';

/*
 * THE THREE RESOURCE GUIDES — a document, not a marketing page.
 *
 * Two rebuilds happened on 2026-09-10 and the first one was wrong, so both are
 * recorded here.
 *
 * It began as its own hero (a framed photo card with a caption, a rotated-square
 * ornament, a tricolour rule, two blur blobs, two buttons) followed by seven
 * card-shaped sections that restated each other, in three per-guide colour
 * schemes.
 *
 * The first rebuild put it on the marketing hero and replaced the cards with
 * hairline lists. That removed the ornament and gave nothing back: five of the
 * six sections were marked only by a 12px uppercase eyebrow, so below the
 * headline the page was one uniform grey column at 14px with no hierarchy, no
 * density and no way to navigate 4,500px of it. The eyebrow-as-heading is the
 * pattern the workspace design standards forbid for exactly this reason.
 *
 * What it is now. This page is a REFERENCE DOCUMENT: someone reads it once,
 * mid-decision, looking for one answer. So it is built like one and not like the
 * course pages:
 *
 *   - THE SITE'S STANDARD HERO, the photo-led one. This was briefly the compact
 *     centred hero that /contact, /faq and /search use, on the argument that a
 *     reference page needs no photograph. The product owner's correction was
 *     right: the photo-led hero is the standard on eight of the site's content
 *     routes, a guide is a content page rather than a utility page, and the
 *     thing that actually looked wrong was a numbered PLACEHOLDER filling the
 *     frame — a temporary artifact, and no basis for a permanent decision.
 *   - A contents list directly under it. Length is an asset in a guide as long
 *     as the reader can skip; it was a liability while they could not.
 *   - Every section is a real <h2> at the site's section scale with its own
 *     anchor. `DocSection` renders all of them, so the hierarchy cannot drift
 *     back to labels.
 *   - The body is aligned to the grid, like every other page under this hero:
 *     each heading clamped to a readable measure, the content beneath it using
 *     the full container. It was briefly a centred column, which only worked
 *     under the centred hero and made the guides an outlier under this one.
 *   - Alternating white and canvas grounds separate the sections, so no section
 *     needs a card, a tint or a rule of its own.
 *
 * LANGUAGE. Both languages are real content now: `src/content/resource-guides/`
 * holds an English and a German set with the same structure, and a test keeps
 * them from drifting apart. The chrome below is what belongs to the layout
 * rather than to a guide.
 */

const chrome = {
  en: {
    home: 'Home',
    resources: 'Resources',
    eyebrow: 'Resource guide',
    contents: 'On this page',
    glance: 'What to know first',
    topics: 'In more depth',
    faq: 'Questions people ask',
    sources: 'Official sources',
    related: 'The other guides',
    disclaimer: 'Requirements change. Check the official source for your country before you act on any of this.',
  },
  de: {
    home: 'Start',
    resources: 'Ressourcen',
    eyebrow: 'Ratgeber',
    contents: 'Inhalt',
    glance: 'Das Wichtigste zuerst',
    topics: 'Vertiefung',
    faq: 'Häufige Fragen',
    sources: 'Offizielle Quellen',
    related: 'Die anderen Ratgeber',
    disclaimer: 'Anforderungen ändern sich. Prüfen Sie die offizielle Quelle für Ihr Land, bevor Sie handeln.',
  },
} satisfies Record<ContentLocale, Record<string, string>>;

/**
 * One section of the document: an anchor, an <h2> at the section scale, an
 * optional lead, and a body clamped to the document column.
 */
function DocSection({
  id,
  title,
  lead,
  ground = 'canvas',
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  ground?: 'canvas' | 'white';
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-28 border-b border-[color:var(--casa-sand)]/40 py-14 md:py-18 ${
        ground === 'white' ? 'bg-white' : ''
      }`}
    >
      <Container>
        {/*
          Heading clamped, content full width — the shape every other page under
          the photo-led hero uses. A centred column read well under the centred
          hero and made these three pages an outlier once the standard hero came
          back.
        */}
        <div className="max-w-[46rem]">
          <h2 className="text-3xl font-bold leading-tight text-[var(--casa-ink)] md:text-[2.125rem]">{title}</h2>
          {lead ? (
            <p className="mt-4 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{lead}</p>
          ) : null}
        </div>
        <div className="mt-9">{children}</div>
      </Container>
    </section>
  );
}

export function ResourceGuidePage({ data, locale }: { data: ResourceGuideData; locale: ContentLocale }) {
  const t = chrome[locale];
  const primary = data.hero.ctas[0];
  const related = getOtherResourceGuides(data.slug, locale);

  const contents = [
    { id: 'overview', label: t.glance },
    { id: 'roadmap', label: data.stepsTitle },
    { id: 'detail', label: t.topics },
    { id: 'questions', label: t.faq },
    { id: 'sources', label: t.sources },
  ];

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]">
      <HeroAPhotoLed
        eyebrow={t.eyebrow}
        title={data.hero.title}
        description={data.hero.lead}
        photo={data.hero.photo}
        ctas={primary ? [{ label: primary.label, href: primary.href, kind: 'primary' }] : []}
        breadcrumbs={[
          { label: t.home, href: '/' },
          { label: t.resources, href: '/resources/study-in-germany' },
          { label: data.hero.title },
        ]}
      />

      {/*
        The contents. A guide is read by people looking for one answer, so the
        first thing below the headline is the list of answers it holds.
      */}
      <nav aria-label={t.contents} className="border-b border-[color:var(--casa-sand)] bg-white py-6">
        <Container>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:gap-8">
            <p className="shrink-0 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
              {t.contents}
            </p>
            <ol className="flex flex-wrap gap-x-7 gap-y-2">
              {contents.map((item, index) => (
                <li key={item.id} className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold tabular-nums text-[var(--casa-muted)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <a
                    href={`#${item.id}`}
                    className="text-sm font-semibold text-[var(--casa-accent-text)] underline-offset-4 hover:underline"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </nav>

      {/*
        The four facts as one panel rather than four hairlines spread across the
        full grid — a summary is one object, and at 85rem each line was a
        fragment with ten rem of air beside it.
      */}
      <DocSection id="overview" title={t.glance}>
        <ul className="grid gap-x-10 gap-y-4 rounded-xl bg-[var(--casa-warm-soft)]/45 p-6 md:grid-cols-2 md:p-8">
          {data.quickFacts.map((fact) => (
            <li key={fact} className="flex gap-3 text-base leading-relaxed text-[var(--casa-ink)]">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]" aria-hidden />
              <span>{fact}</span>
            </li>
          ))}
        </ul>
      </DocSection>

      {/*
        The roadmap is the guide's spine, so it is a single sequence with a rule
        running down it — not a two-column grid, where step 2 sat beside step 1
        and the reader had to guess the order.
      */}
      <DocSection id="roadmap" title={data.stepsTitle} ground="white">
        <ol className="grid gap-x-14 gap-y-9 md:grid-cols-2">
          {data.steps.map((step, index) => (
            <li key={step.title} className="flex gap-5 border-t border-[color:var(--casa-sand)] pt-5">
              <span className="w-9 shrink-0 text-2xl font-bold leading-none tabular-nums text-[var(--casa-accent-text)]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="text-lg font-bold leading-snug text-[var(--casa-ink)]">{step.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-[var(--casa-muted)]">{step.text}</p>
                {step.action ? (
                  <p className="mt-2.5 text-base leading-relaxed text-[var(--casa-ink)]">{step.action}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </DocSection>

      <DocSection id="detail" title={t.topics}>
        <div className="grid gap-x-12 gap-y-11 lg:grid-cols-2">
          {data.sections.map((section) => (
            <article key={section.title}>
              <h3 className="text-xl font-bold leading-snug text-[var(--casa-ink)]">{section.title}</h3>
              <p className="mt-3 text-base leading-relaxed text-[var(--casa-muted)]">{section.intro}</p>
              <ul className="mt-4 space-y-2.5">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3 text-base leading-relaxed text-[var(--casa-ink)]">
                    <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]" aria-hidden />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              {section.link ? (
                <TextCta href={section.link.href} className="mt-5">
                  {section.link.label}
                </TextCta>
              ) : null}
            </article>
          ))}
        </div>
      </DocSection>

      <DocSection id="questions" title={t.faq} ground="white">
        <Accordion type="single" collapsible className="max-w-[60rem] border-t border-[color:var(--casa-sand)]">
          {data.faq.map((item) => (
            <AccordionItem key={item.question} value={item.question} className="border-[color:var(--casa-sand)]">
              <AccordionTrigger className="py-5 text-left text-lg font-semibold text-[var(--casa-ink)] hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="max-w-measure pb-5 text-base leading-relaxed text-[var(--casa-muted)]">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </DocSection>

      <DocSection id="sources" title={t.sources} lead={t.disclaimer}>
        <ul className="grid gap-x-14 border-t border-[color:var(--casa-sand)] md:grid-cols-2">
          {data.officialLinks.map((link) => (
            <li key={link.url} className="border-b border-[color:var(--casa-sand)] py-4">
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="text-base font-semibold text-[var(--casa-accent-text)] underline-offset-4 hover:underline"
              >
                {link.label}
              </a>
              <p className="mt-1 text-sm leading-relaxed text-[var(--casa-muted)]">{link.description}</p>
            </li>
          ))}
        </ul>

      </DocSection>

      <DocSection id="related" title={t.related} ground="white">
        <ul className="grid gap-x-12 gap-y-6 sm:grid-cols-2">
          {related.map((guide) => (
            <li key={guide.slug} className="border-t border-[color:var(--casa-sand)] pt-5">
              <Link
                href={guide.path}
                className="text-lg font-bold leading-snug text-[var(--casa-ink)] underline-offset-4 hover:text-[var(--casa-accent-text)] hover:underline"
              >
                {guide.hero.title}
              </Link>
              <p className="mt-2 text-base leading-relaxed text-[var(--casa-muted)]">{guide.hero.summary}</p>
            </li>
          ))}
        </ul>
      </DocSection>
    </main>
  );
}
