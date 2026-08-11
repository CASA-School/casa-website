import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Briefcase, Clock, MapPin, Users } from 'lucide-react';

import { HeroEMinimal } from '@/components/heroes';
import { Container } from '@/components/ui/container';
import { getContentLocale } from '@/lib/content/locale.server';
import { getCareerPositions } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Careers',
  description:
    'Explore open roles at CASA and join a people-first international language school in Bremen.',
  path: '/careers',
  keywords: ['CASA careers', 'Language school jobs Bremen', 'DaF teacher jobs'],
});

function formatDate(value: string, locale: 'en' | 'de') {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default async function CareersPage() {
  const locale = await getContentLocale();
  const positions = await getCareerPositions(locale);

  const copy =
    locale === 'de'
      ? {
          eyebrow: 'Karriere',
          title: 'Arbeiten bei CASA in Bremen',
          description:
            'Werden Sie Teil eines internationalen Teams, das Sprachlernen menschlich, strukturiert und wirksam gestaltet.',
          cta: 'Offene Stellen ansehen',
          openingLabel: 'Offene Stelle',
          team: 'Team',
          location: 'Standort',
          contract: 'Vertrag',
          mode: 'Modell',
          posted: 'Veröffentlicht',
          deadline: 'Bewerbungsfrist',
          requirements: 'Anforderungsprofil',
          apply: 'Details ansehen',
          noOpeningsTitle: 'Aktuell keine offenen Positionen',
          noOpeningsBody:
            'Senden Sie uns gern eine Initiativbewerbung. Wir melden uns, sobald eine passende Rolle verfügbar ist.',
          noOpeningsCta: 'Initiativbewerbung senden',
          footerTitle: 'Sie möchten Teil der CASA Community werden?',
          footerBody:
            'Wir freuen uns auf Bewerbungen von Menschen, die Lernen, Vielfalt und Teamarbeit aktiv gestalten wollen.',
          footerCta: 'Bewerbung senden',
        }
      : {
          eyebrow: 'Careers',
          title: 'Join CASA in Bremen',
          description:
            'Be part of an international team that makes language learning structured, personal, and genuinely effective.',
          cta: 'See open roles',
          openingLabel: 'Open role',
          team: 'Team',
          location: 'Location',
          contract: 'Contract',
          mode: 'Work mode',
          posted: 'Posted',
          deadline: 'Application deadline',
          requirements: 'Requirements',
          apply: 'View role',
          noOpeningsTitle: 'No open positions right now',
          noOpeningsBody:
            'You can still send an initiative application and we will contact you when a matching role opens.',
          noOpeningsCta: 'Send initiative application',
          footerTitle: 'Want to grow with the CASA community?',
          footerBody:
            'We value people who care about learning, inclusion, and meaningful support for international students.',
          footerCta: 'Send application',
        };

  const breadcrumbs = [
    { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
    { label: locale === 'de' ? 'Karriere' : 'Careers' },
  ];

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]">
      <HeroEMinimal
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        breadcrumbs={breadcrumbs}
        cta={{ label: copy.cta, href: '#open-roles', kind: 'primary' }}
        meta={['CASA Bremen', locale === 'de' ? 'Internationale Community' : 'International community']}
      />

      <section id="open-roles" className="py-16 md:py-20">
        <Container className="space-y-8">
          {positions.length === 0 ? (
            <article className="rounded-3xl border border-[color:var(--casa-sand)] bg-white p-7 shadow-[var(--shadow-card)]">
              <h2 className="text-2xl font-black text-[var(--casa-ink)]">{copy.noOpeningsTitle}</h2>
              <p className="mt-3 max-w-3xl text-base leading-relaxed text-[var(--casa-muted)]">{copy.noOpeningsBody}</p>
              <Link
                href="/contact?topic=careers"
                className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)]"
              >
                {copy.noOpeningsCta}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          ) : (
            <ul className="grid gap-5 lg:grid-cols-2">
              {positions.map((position) => {
                const requirementLines =
                  position.requirements
                    ?.split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .slice(0, 3) || [];

                return (
                  <li key={`${position.slug}-${position.locale}`}>
                    <article className="flex h-full flex-col rounded-3xl border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-card)]">
                      <div className="flex items-center justify-between gap-3">
                        <p className="inline-flex items-center gap-2 rounded-full bg-[var(--casa-warm-soft)]/88 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-ink)]">
                          <Briefcase className="h-3.5 w-3.5 text-[var(--casa-accent-text)]" />
                          {copy.openingLabel}
                        </p>
                        {position.isFeatured ? (
                          <span className="rounded-full bg-[var(--casa-blue)]/12 px-2.5 py-1 text-xs font-bold text-[var(--casa-accent-text)]">
                            {locale === 'de' ? 'Empfohlen' : 'Featured'}
                          </span>
                        ) : null}
                      </div>

                      <h2 className="mt-4 text-2xl font-black leading-tight text-[var(--casa-ink)]">{position.title}</h2>
                      <p className="mt-3 text-base leading-relaxed text-[var(--casa-muted)]">{position.shortDescription}</p>

                      <dl className="mt-5 grid gap-2 text-sm text-[var(--casa-muted)] sm:grid-cols-2">
                        <div className="inline-flex items-start gap-2">
                          <Users className="mt-0.5 h-4 w-4 text-[var(--casa-accent-text)]" />
                          <div>
                            <dt className="font-semibold text-[var(--casa-ink)]">{copy.team}</dt>
                            <dd>{position.team || (locale === 'de' ? 'CASA Team' : 'CASA Team')}</dd>
                          </div>
                        </div>
                        <div className="inline-flex items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 text-[var(--casa-accent-text)]" />
                          <div>
                            <dt className="font-semibold text-[var(--casa-ink)]">{copy.location}</dt>
                            <dd>{position.location}</dd>
                          </div>
                        </div>
                        <div className="inline-flex items-start gap-2">
                          <Briefcase className="mt-0.5 h-4 w-4 text-[var(--casa-accent-text)]" />
                          <div>
                            <dt className="font-semibold text-[var(--casa-ink)]">{copy.contract}</dt>
                            <dd>{position.employmentType}</dd>
                          </div>
                        </div>
                        <div className="inline-flex items-start gap-2">
                          <Clock className="mt-0.5 h-4 w-4 text-[var(--casa-accent-text)]" />
                          <div>
                            <dt className="font-semibold text-[var(--casa-ink)]">{copy.mode}</dt>
                            <dd>{position.workMode}</dd>
                          </div>
                        </div>
                      </dl>

                      <div className="mt-4 space-y-1 text-sm text-[var(--casa-muted)]">
                        <p>
                          <span className="font-semibold text-[var(--casa-ink)]">{copy.posted}: </span>
                          {formatDate(position.postedAt, locale)}
                        </p>
                        {position.closesAt ? (
                          <p>
                            <span className="font-semibold text-[var(--casa-ink)]">{copy.deadline}: </span>
                            {formatDate(position.closesAt, locale)}
                          </p>
                        ) : null}
                      </div>

                      {requirementLines.length > 0 ? (
                        <div className="mt-5 rounded-xl bg-[var(--casa-warm-soft)]/35 p-4">
                          <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--casa-ink)]">{copy.requirements}</h3>
                          <ul className="mt-2 space-y-1.5">
                            {requirementLines.map((line) => (
                              <li key={line} className="flex gap-2 text-sm leading-relaxed text-[var(--casa-muted)]">
                                <span aria-hidden className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--casa-blue)]" />
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      <div className="mt-auto pt-5">
                        <Link
                          href={`/careers/${position.slug}`}
                          className="inline-flex items-center gap-1 rounded-lg casa-button-prism bg-[var(--casa-ink-deep)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--casa-ink-deep-hover)]"
                        >
                          {copy.apply}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}

          <article className="rounded-xl border border-[color:var(--casa-sand)] bg-white px-5 py-4">
            <h2 className="text-lg font-bold text-[var(--casa-ink)]">{copy.footerTitle}</h2>
            <p className="mt-1 text-sm leading-relaxed text-[var(--casa-muted)]">{copy.footerBody}</p>
          </article>
        </Container>
      </section>
    </main>
  );
}
