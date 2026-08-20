import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Briefcase, Clock, MapPin } from 'lucide-react';
import { notFound } from 'next/navigation';

import { CareerApplicationForm } from '@/components/forms/career-application-form';
import { Breadcrumbs } from '@/components/patterns/breadcrumbs';
import { Container } from '@/components/ui/container';
import { getContentLocale } from '@/lib/content/locale.server';
import { getCareerPositionBySlug } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

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

  if (!position) {
    return createPublicMetadata({
      title: 'Career role',
      description: 'Career opportunity at CASA Bremen.',
      path: `/careers/${slug}`,
    });
  }

  return createPublicMetadata({
    // createPublicMetadata already appends "| CASA Bremen"
    title: `${position.title} — Careers`,
    description: position.shortDescription,
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
    locale === 'de'
      ? [
          'Lernorientierte Zusammenarbeit mit Lehrkräften und Koordination',
          'Qualitätsbewusste Umsetzung in Ihrem Verantwortungsbereich',
          'Klar strukturierte Kommunikation im internationalen Umfeld',
        ]
      : [
          'Learner-centered collaboration with teachers and coordination',
          'Quality-driven execution in your functional area',
          'Clear communication in an international environment',
        ];

  const copy =
    locale === 'de'
      ? {
          back: 'Zurück zu Karriere',
          applyNow: 'Jetzt bewerben',
          posted: 'Veröffentlicht',
          deadline: 'Bewerbungsfrist',
          team: 'Team',
          location: 'Standort',
          contract: 'Vertrag',
          mode: 'Arbeitsmodell',
          about: 'Über die Rolle',
          responsibilities: 'Aufgaben',
          requirements: 'Anforderungen',
          processTitle: 'Bewerbungsablauf',
          processSteps: [
            'Profil und Motivation senden',
            'CV-Review durch das CASA-Team',
            'Interview und gemeinsamer nächster Schritt',
          ],
        }
      : {
          back: 'Back to careers',
          applyNow: 'Apply now',
          posted: 'Posted',
          deadline: 'Application deadline',
          team: 'Team',
          location: 'Location',
          contract: 'Contract',
          mode: 'Work mode',
          about: 'About the role',
          responsibilities: 'Responsibilities',
          requirements: 'Requirements',
          processTitle: 'Application process',
          processSteps: [
            'Share your profile and motivation',
            'CV review with the CASA team',
            'Interview and next-step alignment',
          ],
        };

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]">
      {/* Banner / Hero Section */}
      {/*
        One accent, not two. This was a blue radial in the top-left AND a sun
        radial in the top-right — the same both-brand-colours-at-once treatment
        the site's nine hero themes were doing, on the one hero that does not go
        through HeroSurface. The blue corner wash now matches the strength used on
        every other form and detail panel.
      */}
      <section className="relative overflow-hidden border-b border-[color:var(--casa-sand)] bg-[var(--casa-bg)] bg-[radial-gradient(130%_120%_at_0%_0%,color-mix(in_srgb,var(--casa-blue)_8%,transparent),transparent_55%)] py-12 md:py-16">
        <Container className="space-y-6">
          <Breadcrumbs
            items={[
              { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
              { label: locale === 'de' ? 'Karriere' : 'Careers', href: '/careers' },
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
      <section className="py-12 md:py-16 bg-white">
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
              <article className="rounded-3xl border border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)]/35 p-6 shadow-[var(--shadow-card)]">
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
                <CareerApplicationForm
                  locale={locale}
                  positionId={position.id}
                  positionSlug={position.slug}
                  positionTitle={position.title}
                />
              </div>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
