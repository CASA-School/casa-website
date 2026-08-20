import { CasaImage as Image } from '@/components/ui/casa-image';
import Link from 'next/link';

import { Breadcrumbs } from '@/components/patterns/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { ResourceGuideData } from '@/content/resourcesGuides.en';

type ResourceGuidePageProps = {
  data: ResourceGuideData;
};

type ResourceVisualPreset = {
  heroThemeClass: string;
  heroArchetypeClass: string;
  quickFactsGridClass: string;
  quickFactItemClass: string;
  stepCardClass: string;
  deepDiveGridClass: string;
  deepDiveCardClass: string;
  bulletDotClass: string;
  checklistClass: string;
  officialCardClass: string;
  badgeClasses: [string, string, string];
};

const visualPresetBySlug: Record<ResourceGuideData['slug'], ResourceVisualPreset> = {
  'study-in-germany': {
    heroThemeClass: 'hero-theme-about',
    heroArchetypeClass: 'hero-archetype-b',
    quickFactsGridClass: 'md:grid-cols-2',
    quickFactItemClass: 'bg-[var(--casa-bg)]',
    stepCardClass: 'bg-[var(--casa-bg)]',
    deepDiveGridClass: 'lg:grid-cols-2',
    deepDiveCardClass: 'bg-white',
    bulletDotClass: 'bg-[var(--casa-blue)]',
    checklistClass: 'bg-[var(--casa-warm-soft)]/35',
    officialCardClass: 'bg-white',
    badgeClasses: [
      'bg-[var(--casa-accent-surface)] text-white',
      'bg-[var(--casa-sun)] text-[var(--casa-ink)]',
      'bg-[var(--casa-red)] text-white',
    ],
  },
  'living-in-germany': {
    heroThemeClass: 'hero-theme-accommodation',
    heroArchetypeClass: 'hero-archetype-d',
    quickFactsGridClass: 'md:grid-cols-2 lg:grid-cols-3',
    quickFactItemClass: 'border-[var(--casa-amber)]/40 bg-[var(--casa-warm-soft)]/35',
    stepCardClass: 'border-l-4 border-l-[var(--casa-blue)] bg-[var(--casa-bg)]',
    deepDiveGridClass: 'lg:grid-cols-2',
    deepDiveCardClass: 'bg-[var(--casa-bg)]',
    bulletDotClass: 'bg-[var(--casa-amber-strong)]',
    checklistClass: 'bg-[var(--casa-warm-soft)]/60',
    officialCardClass: 'bg-[var(--casa-bg)]',
    badgeClasses: [
      'bg-[var(--casa-amber-strong)] text-white',
      'bg-[var(--casa-accent-surface)] text-white',
      'bg-[var(--casa-red)] text-white',
    ],
  },
  'why-germany': {
    heroThemeClass: 'hero-theme-courses',
    heroArchetypeClass: 'hero-archetype-f',
    quickFactsGridClass: 'md:grid-cols-2 xl:grid-cols-3',
    quickFactItemClass: 'border-[var(--casa-blue)]/25 bg-white',
    stepCardClass: 'bg-white shadow-[var(--shadow-soft)]',
    deepDiveGridClass: 'lg:grid-cols-3',
    deepDiveCardClass: 'bg-white',
    bulletDotClass: 'bg-[var(--casa-red)]',
    checklistClass: 'bg-[var(--casa-bg)]',
    officialCardClass: 'bg-white',
    badgeClasses: [
      'bg-[var(--casa-red)] text-white',
      'bg-[var(--casa-accent-surface)] text-white',
      'bg-[var(--casa-sun)] text-[var(--casa-ink)]',
    ],
  },
};

function stepBadgeClass(index: number, preset: ResourceVisualPreset) {
  return preset.badgeClasses[index % preset.badgeClasses.length];
}

export function ResourceGuidePage({ data }: ResourceGuidePageProps) {
  const preset = visualPresetBySlug[data.slug];

  return (
    <main className="bg-[var(--casa-bg)] text-[var(--casa-ink)]">
      <section
        className={`${preset.heroThemeClass} ${preset.heroArchetypeClass} hero-grain relative border-b border-[color:var(--casa-sand)] py-10 md:py-14`}
      >
        <div className="pointer-events-none absolute -left-16 top-8 h-48 w-48 rounded-full bg-[var(--casa-sun)]/16 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-[var(--casa-blue)]/12 blur-3xl" />
        <Container className="hero-grain-content space-y-8">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Resources' },
              { label: data.hero.title },
            ]}
          />

          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">Resource guide</p>
              <h1 className="mt-3 text-4xl font-black leading-[1.08] tracking-tight text-[var(--casa-ink)] sm:text-5xl">
                {data.hero.title}
              </h1>
              <p className="mt-4 max-w-measure text-lg leading-relaxed text-[var(--casa-muted)]">{data.hero.lead}</p>
              <div className="mt-6 grid gap-3 sm:max-w-[38rem] sm:grid-cols-2">
                {data.hero.ctas.map((cta, index) => (
                  <Button
                    key={`${cta.href}-${cta.label}`}
                    asChild
                    variant={index === 0 ? 'prism' : 'outline-prism'}
                    className="h-10 w-full justify-center"
                  >
                    <Link href={cta.href}>{cta.label}</Link>
                  </Button>
                ))}
              </div>
            </div>

            <figure className="casa-card-surface overflow-hidden">
              <div className="casa-media-overlay relative aspect-[4/3]">
                <Image
                  src={data.hero.heroImage.src}
                  alt={data.hero.heroImage.alt}
                  fill
                  priority
                  sizes="(min-width: 1280px) 46vw, (min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
                <div className="pointer-events-none absolute bottom-8 left-8 h-10 w-10 rotate-45 border border-white/65" />
                <div className="casa-tricolor-rule pointer-events-none absolute bottom-4 left-4 h-1 w-24 rounded-full" />
              </div>
              <figcaption className="border-t border-[color:var(--casa-sand)] bg-white px-4 py-3 text-sm text-[var(--casa-muted)]">
                {data.hero.heroImage.caption}
              </figcaption>
            </figure>
          </div>
        </Container>
      </section>

      <section className="pt-16 pb-12 md:pt-20 md:pb-14">
        <Container>
          <article className="casa-card-surface relative overflow-hidden p-6 md:p-7">
            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full border border-[color:var(--casa-sand)]/90" />
            <h2 className="text-2xl font-bold text-[var(--casa-ink)]">At a glance</h2>
            <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
            <ul className={`mt-4 grid gap-3 ${preset.quickFactsGridClass}`}>
              {data.quickFacts.map((fact) => (
                <li
                  key={fact}
                  /* Surface comes from the preset — a base tint here would be a second
                     background class on the same element, resolved by CSS order. */
                  className={`rounded-xl px-4 py-3 text-sm leading-relaxed text-[var(--casa-ink)] ${preset.quickFactItemClass}`}
                >
                  {fact}
                </li>
              ))}
            </ul>
          </article>
        </Container>
      </section>

      <section className="pb-12 md:pb-14">
        <Container>
          <article className="casa-card-surface p-6 md:p-7">
            <h2 className="text-2xl font-bold text-[var(--casa-ink)]">{data.stepsTitle}</h2>
            <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
            <ol className="mt-5 space-y-4">
              {data.steps.map((step, index) => (
                <li key={step.title} className={`rounded-xl p-5 ${preset.stepCardClass}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${stepBadgeClass(index, preset)}`}>
                      {index + 1}
                    </span>
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-[var(--casa-ink)]">{step.title}</h3>
                      <p className="text-sm leading-relaxed text-[var(--casa-muted)]">{step.text}</p>
                      {step.action ? <p className="text-sm font-semibold text-[var(--casa-ink)]">{step.action}</p> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        </Container>
      </section>

      <section className="pb-12 md:pb-14">
        <Container className="space-y-6">
          <h2 className="text-2xl font-bold text-[var(--casa-ink)]">Deep dive</h2>
          <span className="casa-tricolor-rule block h-1 w-20 rounded-full" aria-hidden />
          <div className={`grid gap-4 ${preset.deepDiveGridClass}`}>
            {data.sections.map((section, index) => (
              <article
                key={section.title}
                className={`casa-card-surface relative overflow-hidden p-6 ${
                  data.slug === 'why-germany' && index === 0 ? 'lg:col-span-2' : ''
                } ${preset.deepDiveCardClass}`}
              >
                <h3 className="text-xl font-bold text-[var(--casa-ink)]">{section.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">{section.intro}</p>
                <ul className="mt-4 space-y-2">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2 text-sm leading-relaxed text-[var(--casa-ink)]">
                      <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${preset.bulletDotClass}`} aria-hidden />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 rounded-xl bg-[var(--casa-warm-soft)]/35 px-3 py-2.5 text-sm font-semibold text-[var(--casa-ink)]">
                  {section.cta}
                </p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-12 md:pb-14">
        <Container>
          <div className="grid gap-4 md:grid-cols-2">
            {data.imageSlots.map((image) => (
              <figure key={image.src} className="casa-card-surface overflow-hidden">
                <div className="casa-media-overlay relative aspect-[16/10]">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    sizes="(min-width: 1024px) 48vw, 100vw"
                    className="object-cover"
                  />
                  <div className="casa-tricolor-rule pointer-events-none absolute bottom-4 left-4 h-1 w-20 rounded-full" />
                </div>
                <figcaption className="border-t border-[color:var(--casa-sand)] bg-white px-4 py-3 text-sm text-[var(--casa-muted)]">
                  {image.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-12 md:pb-14">
        <Container>
          <article className={`casa-card-surface relative overflow-hidden p-6 md:p-7 ${preset.checklistClass}`}>
            <div className="pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full bg-[var(--casa-sun)]/20 blur-xl" />
            <h2 className="text-2xl font-bold text-[var(--casa-ink)]">{data.checklistTitle}</h2>
            <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
            <ul className="mt-4 space-y-2">
              {data.checklistItems.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-relaxed text-[var(--casa-ink)]">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </Container>
      </section>

      <section className="pb-12 md:pb-14">
        <Container>
          <article className="casa-card-surface p-6 md:p-7">
            <h2 className="text-2xl font-bold text-[var(--casa-ink)]">FAQ</h2>
            <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
            <Accordion type="single" collapsible className="mt-4">
              {data.faq.map((item) => (
                <AccordionItem key={item.question} value={item.question} className="border-[color:var(--casa-sand)]">
                  <AccordionTrigger className="text-base font-semibold text-[var(--casa-ink)] hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-[var(--casa-muted)]">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </article>
        </Container>
      </section>

      <section className="pb-12 md:pb-14">
        <Container className="space-y-4">
          <h2 className="text-2xl font-bold text-[var(--casa-ink)]">Official links</h2>
          <span className="block h-px w-24 bg-[color:var(--casa-sand)]" aria-hidden />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.officialLinks.map((link) => (
              <article
                key={link.url}
                className={`relative overflow-hidden rounded-xl border border-[color:var(--casa-sand)] p-4 shadow-[var(--shadow-soft)] ${preset.officialCardClass}`}
              >
                <h3 className="text-base font-bold text-[var(--casa-ink)]">{link.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">{link.description}</p>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold text-[var(--casa-accent-text)] hover:underline"
                >
                  Visit source
                </a>
              </article>
            ))}
          </div>

          <aside className="rounded-xl border border-[color:var(--casa-amber)]/40 bg-[var(--casa-warm-soft)] px-4 py-3 text-sm text-[var(--casa-ink)]">
            Information can change. Always verify official requirements with your embassy/university.
          </aside>
        </Container>
      </section>
    </main>
  );
}
