import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, ArrowRight, Briefcase, Clock, MapPin } from 'lucide-react';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/patterns/breadcrumbs';
import { Container } from '@/components/ui/container';
import { getContentLocale } from '@/lib/content/locale.server';
import { getCareerPositionBySlug } from '@/lib/content/repository';
import { jobPostingNode } from '@/lib/structured-data';
import { JsonLdScript } from '@/components/seo/json-ld';
import { isDatabaseConfigured } from '@/lib/db/env';
import { createPublicMetadata } from '@/lib/seo';

import { ApplySection } from './apply-section';
import { pickTree, say } from '@/lib/cms/copy';

type CareerDetailPageProps = {
  params: Promise<{ slug: string }>;
};

function formatDate(value: string, locale: 'en' | 'de') {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function toParagraphs(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(/\n{2,}/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function toBullets(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
}

export async function generateMetadata({ params }: CareerDetailPageProps): Promise<Metadata> {
  const locale = await getContentLocale();
  const { slug } = await params;
  const position = await getCareerPositionBySlug(slug, locale);

  // A missing role 404s from here, so no canonical is emitted for it.
  if (!position) {
    notFound();
  }

  return createPublicMetadata({
    locale,
    // createPublicMetadata already appends "| CASA Bremen"
    title: `${position.title} — ${locale === 'de' ? 'Arbeiten bei CASA' : 'Working at CASA'}`,
    // The posting is written in German; the English page gets an English summary.
    description:
      locale === 'de'
        ? position.shortDescription
        : `${position.title} at CASA: teach international learners in small groups at a non-profit language school in Bremen since 1983.`,
    path: `/careers/${slug}`,
    keywords: ['CASA careers', position.title, 'Language school jobs Bremen'],
  });
}

export default async function CareerDetailPage({ params }: CareerDetailPageProps) {
  const locale = await getContentLocale();
  const { slug } = await params;
  const position = await getCareerPositionBySlug(slug, locale);

  if (!position) {
    notFound();
  }

  const paragraphs = toParagraphs(position.description);
  const requirements = toBullets(position.requirements);
  const responsibilities =
    paragraphs.length > 1 ? toBullets(paragraphs[1]) : [];

  const fallbackResponsibilities =
    pickTree(locale, { de: [
          'Du arbeitest eng mit den Lehrkräften und der Koordination zusammen.',
          'Du übernimmst Verantwortung für deinen Bereich und achtest auf gute Qualität.',
          'Du kommunizierst klar und verständlich mit Menschen aus vielen Ländern.',
        ], en: [
          'You work closely with the teachers and the coordination team.',
          'You take responsibility for your area and pay close attention to quality.',
          'You communicate clearly with people from many different countries.',
        ] });

  const copy =
    pickTree(locale, { de: {
          back: 'Zurück zu Karriere',
          applyNow: 'Jetzt bewerben',
          posted: 'Veröffentlicht',
          deadline: 'Bewerbungsfrist',
          team: 'Team',
          location: 'Standort',
          contract: 'Vertrag',
          mode: 'Arbeitsmodell',
          about: 'Über die Stelle',
          responsibilities: 'Aufgaben',
          requirements: 'Anforderungen',
          processTitle: 'Bewerbungsablauf',
          processSteps: [
            'Du schickst uns deinen Lebenslauf und schreibst uns, warum du bei CASA arbeiten möchtest.',
            'Das CASA-Team liest deine Unterlagen.',
            'Im Vorstellungsgespräch lernen wir uns kennen und besprechen die nächsten Schritte.',
          ],
        }, en: {
          back: 'Back to careers',
          applyNow: 'Apply now',
          posted: 'Posted',
          deadline: 'Application deadline',
          team: 'Team',
          location: 'Location',
          contract: 'Contract',
          mode: 'Work mode',
          about: 'About the job',
          responsibilities: 'Responsibilities',
          requirements: 'Requirements',
          processTitle: 'Application process',
          processSteps: [
            'You send us your CV and tell us why you would like to work at CASA.',
            'The CASA team reads your application.',
            'At the interview, we get to know each other and talk about the next steps.',
          ],
        } });

  // Google for Jobs reads the posting from this; the description is the page's own text.
  const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const jobSchema = jobPostingNode({
    locale,
    path: `/careers/${position.slug}`,
    title: position.title,
    descriptionHtml: [
      ...paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`),
      requirements.length ? `<ul>${requirements.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : '',
    ].join(''),
    employmentType: position.employmentType,
    postedAt: position.postedAt,
    closesAt: position.closesAt ?? null,
  });

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]">
      <JsonLdScript id="job-schema" data={jobSchema} />
      {/* Banner / Hero Section */}
      {/*
        One accent, not two. This was a blue radial in the top-left AND a sun
        radial in the top-right — the same both-brand-colours-at-once treatment
        the site's nine hero themes were doing, on the one hero that does not go
        through HeroSurface. The blue corner wash now matches the strength used on
        every other form and detail panel.
      */}
      <section className="relative overflow-hidden border-b border-[color:var(--casa-sand)] bg-[radial-gradient(130%_120%_at_0%_0%,color-mix(in_srgb,var(--casa-blue)_8%,transparent),transparent_55%)] py-12 md:py-16">
        <Container className="space-y-6">
          <Breadcrumbs
            items={[
              { label: say(locale, 'Start', 'Home'), href: '/' },
              { label: say(locale, 'Karriere', 'Careers'), href: '/careers' },
              { label: position.title },
            ]}
          />

          <Link
            href="/careers"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {copy.back}
          </Link>

          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end md:gap-12 pt-2">
            <div className="space-y-4 max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                {position.team ? (
                  <span className="rounded-full bg-[var(--casa-warm-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-ink)]">
                    {position.team}
                  </span>
                ) : null}
                <span className="rounded-full bg-[var(--casa-blue)]/12 px-3 py-1 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                  {position.workMode}
                </span>
              </div>

              <h1 className="text-4xl font-black tracking-tight text-[var(--casa-ink)] sm:text-5xl lg:text-6xl leading-[1.1]">
                {position.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-3 text-sm text-[var(--casa-muted)] font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[var(--casa-accent-text)] shrink-0" />
                  <span>{position.location}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-[var(--casa-accent-text)] shrink-0" />
                  <span>{position.employmentType}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[var(--casa-accent-text)] shrink-0" />
                  <span>{position.workMode}</span>
                </span>
                <span className="text-[var(--casa-sand)] hidden sm:inline">|</span>
                <span>
                  <span className="font-semibold text-[var(--casa-ink)]">{copy.posted}:</span> {formatDate(position.postedAt, locale)}
                </span>
                {position.closesAt ? (
                  <>
                    <span className="text-[var(--casa-sand)] hidden sm:inline">|</span>
                    <span>
                      <span className="font-semibold text-[var(--casa-ink)]">{copy.deadline}:</span>{' '}
                      {formatDate(position.closesAt, locale)}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="shrink-0">
              <Link
                href="#apply-form"
                className="inline-flex items-center justify-center gap-2 rounded-lg casa-button-prism bg-[var(--casa-ink-deep)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--casa-ink-deep-hover)] transition-colors shadow-[var(--shadow-soft)]"
              >
                {copy.applyNow}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Details Section */}
      <section className="py-12 md:py-16">
        <Container>
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)] xl:items-start">
            <article className="rounded-3xl border border-[color:var(--casa-sand)] bg-white p-6 md:p-10 shadow-[var(--shadow-card)] space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-[var(--casa-ink)]">{copy.about}</h2>
                <p className="mt-4 text-base leading-relaxed text-[var(--casa-muted)] font-medium">
                  {position.shortDescription}
                </p>
                {paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-base leading-relaxed text-[var(--casa-muted)]">
                    {paragraph}
                  </p>
                ))}
              </div>

              <hr className="border-[color:var(--casa-sand)]" />

              <div>
                <h3 className="text-2xl font-bold text-[var(--casa-ink)]">{copy.responsibilities}</h3>
                <ul className="mt-4 space-y-3.5">
                  {(responsibilities.length > 0 ? responsibilities : fallbackResponsibilities).map((item) => (
                    <li key={item} className="flex gap-3 text-base text-[var(--casa-muted)] leading-relaxed">
                      <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <hr className="border-[color:var(--casa-sand)]" />

              <div>
                <h3 className="text-2xl font-bold text-[var(--casa-ink)]">{copy.requirements}</h3>
                <ul className="mt-4 space-y-3.5">
                  {(requirements.length > 0 ? requirements : fallbackResponsibilities).map((item) => (
                    <li key={item} className="flex gap-3 text-base text-[var(--casa-muted)] leading-relaxed">
                      <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <div className="space-y-6">
              <article className="rounded-3xl border border-[color:var(--casa-sand)] bg-[var(--casa-warm-panel)] p-6 shadow-[var(--shadow-card)]">
                <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{copy.processTitle}</p>
                <ol className="mt-4 space-y-3">
                  {copy.processSteps.map((step, index) => (
                    <li key={step} className="flex items-start gap-3 text-sm text-[var(--casa-muted)] leading-relaxed font-medium">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--casa-ink-deep)] text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </article>

              <div id="apply-form" className="scroll-mt-8">
                <ApplySection
                  locale={locale}
                  position={position}
                  acceptsUploads={isDatabaseConfigured()}
                />
              </div>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
