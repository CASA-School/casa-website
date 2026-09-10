import { Link } from '@/i18n/navigation';

import { HeroAPhotoLed } from '@/components/heroes';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Container } from '@/components/ui/container';
import { TextCta } from '@/components/ui/text-cta';
import {
  livingInGermanyGuide,
  studyInGermanyGuide,
  whyGermanyGuide,
  type ResourceGuideData,
} from '@/content/resourcesGuides.en';
import type { ContentLocale } from '@/lib/content/types';

/*
 * One layout for the three resource guides, rebuilt 2026-09-10.
 *
 * What it replaced: its own hero (a framed photo card with a caption, a
 * rotated-square ornament, a tricolour rule, two blur blobs, two buttons), then
 * seven card-shaped sections that said the same things in different sizes — six
 * quick facts, eight steps, six "deep dive" cards each ending in an "Action:"
 * line, two decorative photo cards, an eight-item checklist that restated the
 * eight steps, a FAQ and the official links. Per-guide colour presets made the
 * three guides look like three sites.
 *
 * What it is now: the site's standard hero with one action, then five plain
 * sections — facts, roadmap, topics, questions, sources — as hairline lists on
 * white and canvas, the way /courses and /ueber-uns/gemeinnuetzigkeit are built.
 * Cross-links replace the topics that duplicated another guide.
 *
 * The body copy is English in both languages until the guides are translated;
 * the chrome (breadcrumbs, eyebrows, headings, the primary action) follows the
 * visitor's language, and the German page says so in one line.
 */

const chrome = {
  en: {
    home: 'Home',
    resources: 'Resources',
    eyebrow: 'Resource guide',
    glance: 'At a glance',
    roadmap: 'Roadmap',
    topics: 'In more depth',
    faq: 'Questions people ask',
    sources: 'Official sources',
    disclaimer: 'Requirements change. Check the official source for your country before you act on any of this.',
    related: 'More guides',
    languageNote: null,
  },
  de: {
    home: 'Start',
    resources: 'Ressourcen',
    eyebrow: 'Ratgeber',
    glance: 'Auf einen Blick',
    roadmap: 'Schritt für Schritt',
    topics: 'Vertiefung',
    faq: 'Häufige Fragen',
    sources: 'Offizielle Quellen',
    disclaimer: 'Anforderungen ändern sich. Prüfen Sie die offizielle Quelle für Ihr Land, bevor Sie handeln.',
    related: 'Weitere Ratgeber',
    languageNote: 'Dieser Ratgeber liegt derzeit auf Englisch vor.',
  },
} satisfies Record<ContentLocale, Record<string, string | null>>;

/** The one hero action per language; the guides' own labels are English. */
const primaryActionLabel: Record<ContentLocale, Record<string, string>> = {
  en: { '/courses': 'Explore CASA courses', '/placement-test': 'Take the placement test' },
  de: { '/courses': 'Kurse ansehen', '/placement-test': 'Einstufungstest starten' },
};

const allGuides = [studyInGermanyGuide, livingInGermanyGuide, whyGermanyGuide];

function Eyebrow({ children }: { children: string }) {
  return <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{children}</p>;
}

export function ResourceGuidePage({ data, locale }: { data: ResourceGuideData; locale: ContentLocale }) {
  const t = chrome[locale];
  const primary = data.hero.ctas[0];
  const related = allGuides.filter((guide) => guide.slug !== data.slug);

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]">
      <HeroAPhotoLed
        eyebrow={t.eyebrow}
        title={data.hero.title}
        description={data.hero.lead}
        photo={{ src: data.hero.heroImage.src, alt: data.hero.heroImage.alt }}
        ctas={
          primary
            ? [{ label: primaryActionLabel[locale][primary.href] ?? primary.label, href: primary.href, kind: 'primary' }]
            : []
        }
        breadcrumbs={[
          { label: t.home, href: '/' },
          { label: t.resources, href: '/resources/study-in-germany' },
          { label: data.hero.title },
        ]}
      />

      {/* Facts: the four things a reader should know before the roadmap. */}
      <section className="border-b border-[color:var(--casa-sand)]/40 bg-white py-14 md:py-16">
        <Container>
          {t.languageNote ? <p className="mb-6 text-sm text-[var(--casa-muted)]">{t.languageNote}</p> : null}
          <Eyebrow>{t.glance}</Eyebrow>
          <ul className="mt-6 grid gap-x-10 gap-y-5 md:grid-cols-2">
            {data.quickFacts.map((fact) => (
              <li
                key={fact}
                className="border-t border-[color:var(--casa-sand)] pt-4 text-base leading-relaxed text-[var(--casa-ink)]"
              >
                {fact}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Roadmap: the guide's spine. Number, title, what to do. */}
      <section className="border-b border-[color:var(--casa-sand)]/40 py-16 md:py-20">
        <Container>
          <div className="max-w-[46rem]">
            <Eyebrow>{t.roadmap}</Eyebrow>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-[var(--casa-ink)] md:text-4xl">{data.stepsTitle}</h2>
          </div>
          <ol className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {data.steps.map((step, index) => (
              <li key={step.title} className="border-t border-[color:var(--casa-sand)] pt-5">
                <div className="flex items-start gap-4">
                  <span className="w-8 shrink-0 text-2xl font-bold leading-none tabular-nums text-[var(--casa-accent-text)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold leading-snug text-[var(--casa-ink)]">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">{step.text}</p>
                    {step.action ? <p className="mt-2 text-sm leading-relaxed text-[var(--casa-ink)]">{step.action}</p> : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Topics: what the roadmap cannot say in one line each. */}
      <section className="border-b border-[color:var(--casa-sand)]/40 bg-white py-16 md:py-20">
        <Container>
          <Eyebrow>{t.topics}</Eyebrow>
          <div className="mt-6 grid gap-x-10 gap-y-10 md:grid-cols-2">
            {data.sections.map((section) => (
              <article key={section.title} className="border-t border-[color:var(--casa-sand)] pt-6">
                <h2 className="text-xl font-bold leading-snug text-[var(--casa-ink)]">{section.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--casa-muted)]">{section.intro}</p>
                <ul className="mt-4 space-y-2">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 text-sm leading-relaxed text-[var(--casa-ink)]">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]" aria-hidden />
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
        </Container>
      </section>

      {/* Questions. */}
      <section className="border-b border-[color:var(--casa-sand)]/40 py-16 md:py-20">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
            <Eyebrow>{t.faq}</Eyebrow>
            <Accordion type="single" collapsible className="border-t border-[color:var(--casa-sand)]">
              {data.faq.map((item) => (
                <AccordionItem key={item.question} value={item.question} className="border-[color:var(--casa-sand)]">
                  <AccordionTrigger className="py-4 text-left text-base font-semibold text-[var(--casa-ink)] hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-[var(--casa-muted)]">{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Container>
      </section>

      {/* Sources, and the other two guides. */}
      <section className="bg-white py-16 md:py-20">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <Eyebrow>{t.sources}</Eyebrow>
              <ul className="mt-6 divide-y divide-[color:var(--casa-sand)] border-t border-[color:var(--casa-sand)]">
                {data.officialLinks.map((link) => (
                  <li key={link.url} className="py-4">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-base font-semibold text-[var(--casa-accent-text)] hover:underline"
                    >
                      {link.label}
                    </a>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--casa-muted)]">{link.description}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm leading-relaxed text-[var(--casa-muted)]">{t.disclaimer}</p>
            </div>

            <div>
              <Eyebrow>{t.related}</Eyebrow>
              <ul className="mt-6 divide-y divide-[color:var(--casa-sand)] border-t border-[color:var(--casa-sand)]">
                {related.map((guide) => (
                  <li key={guide.slug} className="py-4">
                    <Link href={guide.path} className="text-base font-semibold text-[var(--casa-ink)] hover:text-[var(--casa-accent-text)]">
                      {guide.hero.title}
                    </Link>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--casa-muted)]">{guide.hero.lead}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
