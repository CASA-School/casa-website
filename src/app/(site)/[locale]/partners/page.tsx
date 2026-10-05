import type { Metadata } from 'next';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

import { Breadcrumbs } from '@/components/patterns/breadcrumbs';
import { PartnerLogoTile } from '@/components/sections/partner-logo-tile';
import { Container } from '@/components/ui/container';
import { partners, tandemSchools, type Partner } from '@/config/content/partners';
import { Link } from '@/i18n/navigation';
import { getContentLocale } from '@/lib/content/locale.server';
import type { ContentLocale } from '@/lib/content/types';
import { createPublicMetadata } from '@/lib/seo';
import { cn } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    path: '/partners',
    keywords: ['CASA Kooperationspartner', 'HERE AHEAD', 'Garantiefonds Hochschule', 'TANDEM International', 'Sprachschule Bremen'],
    ...(locale === 'de'
      ? {
          title: 'Kooperationspartner',
          description: 'Mit diesen Organisationen arbeitet CASA in Bremen und darüber hinaus zusammen: HERE AHEAD, Garantiefonds Hochschule, Visionskultur, Hood Training und TANDEM International.',
        }
      : {
          title: 'Cooperation partners',
          description: 'The organisations CASA works with in Bremen and beyond: HERE AHEAD, Garantiefonds Hochschule, Visionskultur, Hood Training and TANDEM International.',
        }),
  });
}

const externalLinkClass =
  'inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-[var(--casa-accent-text)] underline decoration-[color:var(--casa-sand)] underline-offset-4 transition-colors hover:text-[var(--casa-accent-text-hover)] hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--casa-blue)]';

function ExternalLink({ href, children, locale }: { href: string; children: React.ReactNode; locale: ContentLocale }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={externalLinkClass}>
      {children}
      <span aria-hidden="true">↗</span>
      <span className="sr-only">{locale === 'de' ? '(öffnet in einem neuen Tab)' : '(opens in a new tab)'}</span>
    </a>
  );
}

function PartnerCard({ partner, locale }: { partner: Partner; locale: ContentLocale }) {
  return (
    <li className="relative flex flex-col overflow-hidden rounded-3xl border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-soft)] sm:p-8">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[var(--casa-blue)]" />
      <PartnerLogoTile partner={partner} />
      <p className={cn('text-sm font-semibold text-[var(--casa-accent-text)]', partner.logo && 'mt-6')}>{partner.label[locale]}</p>
      <h2 className="mt-1 text-2xl font-bold text-[var(--casa-ink)]">{partner.name}</h2>
      {partner.about ? <p className="mt-3 leading-relaxed text-[var(--casa-ink)]">{partner.about[locale]}</p> : null}
      <p className="mt-3 leading-relaxed text-[var(--casa-muted)]">{partner.text[locale]}</p>
      <div className="mt-auto pt-6">
        <ExternalLink href={partner.href} locale={locale}>
          {locale === 'de' ? 'Website besuchen' : 'Visit website'}
        </ExternalLink>
      </div>
    </li>
  );
}

export default async function PartnersPage() {
  const locale = await getContentLocale();
  const de = locale === 'de';
  const main = partners.find((partner) => partner.main);
  const others = partners.filter((partner) => !partner.main);

  const breadcrumbs = [
    { label: de ? 'Start' : 'Home', href: '/' },
    { label: de ? 'Unsere Schule' : 'Our school', href: '/about' },
    { label: de ? 'Kooperationspartner' : 'Cooperation partners' },
  ];

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]">
      <section className="pb-14 pt-6 md:pb-20 md:pt-8">
        <Container>
          <Breadcrumbs items={breadcrumbs} />
          <header className="mt-4 max-w-3xl">
            <h1 className="text-3xl font-bold md:text-4xl">{de ? 'Kooperationspartner' : 'Cooperation partners'}</h1>
            <p className="mt-3 text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
              {de
                ? 'Mit diesen Organisationen arbeitet CASA in Bremen und darüber hinaus zusammen. Als gemeinnützige Sprachschule verbinden wir Deutschunterricht mit Beratung und Begegnung.'
                : 'These are the organisations CASA works with, in Bremen and beyond. As a non-profit language school, we bring German teaching together with advice and opportunities to meet others.'}
            </p>
          </header>

          {main ? (
            <article className="relative mt-8 overflow-hidden rounded-3xl border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-card)] sm:p-10">
              <span aria-hidden="true" className="casa-logo-stripe absolute inset-x-0 top-0 h-1" />
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-12">
                <div className="min-w-0">
                  <PartnerLogoTile partner={main} size="lg" />
                  <p className="mt-6 text-sm font-semibold text-[var(--casa-accent-text)]">
                    {de ? 'Hauptpartner' : 'Main partner'} · {main.label[locale]}
                  </p>
                  <h2 className="mt-1 text-3xl font-bold text-[var(--casa-ink)] md:text-4xl">{main.name}</h2>
                  {main.about ? <p className="mt-4 text-base leading-relaxed text-[var(--casa-ink)] md:text-lg">{main.about[locale]}</p> : null}
                  <p className="mt-3 leading-relaxed text-[var(--casa-muted)]">{main.text[locale]}</p>
                  <div className="mt-6">
                    <ExternalLink href={main.href} locale={locale}>
                      {de ? 'Website besuchen' : 'Visit website'}
                    </ExternalLink>
                  </div>
                </div>

                {main.programmes?.length ? (
                  <ul className="space-y-4 lg:border-l lg:border-[color:var(--casa-sand)] lg:pl-12" aria-label={de ? 'Programme' : 'Programmes'}>
                    {main.programmes.map((programme) => (
                      <li key={programme.name} className="rounded-2xl bg-[var(--casa-canvas)] p-5">
                        <PartnerLogoTile partner={programme} />
                        <p className="mt-4 text-sm font-semibold text-[var(--casa-accent-text)]">{programme.label[locale]}</p>
                        <h3 className="mt-1 text-lg font-bold text-[var(--casa-ink)]">{programme.name}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">{programme.text[locale]}</p>
                        <div className="mt-4">
                          <ExternalLink href={programme.href} locale={locale}>
                            {de ? 'Zum Programm' : 'About the programme'}
                          </ExternalLink>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </article>
          ) : null}

          <ul className="mt-6 grid gap-6 md:grid-cols-2">
            {others.map((partner) => (
              <PartnerCard key={partner.id} partner={partner} locale={locale} />
            ))}
          </ul>

          <section className="mt-6 rounded-3xl border border-[color:var(--casa-sand)] bg-white p-6 sm:p-8" aria-labelledby="tandem-schools-title">
            <h2 id="tandem-schools-title" className="text-xl font-bold text-[var(--casa-ink)]">
              {de ? 'Schulen im TANDEM-Netzwerk' : 'Schools in the TANDEM network'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">
              {de ? 'Eine Auswahl der Sprachschulen, mit denen wir über TANDEM verbunden sind.' : 'A selection of the language schools we are connected with through TANDEM.'}
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-6 lg:grid-cols-4">
              {tandemSchools.map((school) => (
                <li key={school.name}>
                  <a
                    href={school.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-full flex-col rounded-lg px-2 transition-colors hover:bg-[var(--casa-canvas)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--casa-blue)]"
                  >
                    <Image src={school.logo} alt={school.name} width={240} height={100} className="h-16 w-full object-contain" sizes="(min-width: 1024px) 240px, 40vw" />
                    <span className="mt-3 text-sm font-semibold text-[var(--casa-ink)]">
                      {school.name}{'\u00a0'}<span aria-hidden="true">↗</span>
                    </span>
                    <span className="mt-0.5 text-xs text-[var(--casa-muted)]">
                      {school.city[locale]} · {school.country[locale]}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-10 flex flex-col gap-4 border-t border-[color:var(--casa-sand)] pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-lg font-semibold text-[var(--casa-ink)]">
              {de ? 'Sie möchten mit CASA zusammenarbeiten?' : 'Would you like to work with CASA?'}
            </p>
            <Link
              href="/contact?topic=other"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--casa-accent-text)] underline decoration-[color:var(--casa-sand)] underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--casa-blue)]"
            >
              {de ? 'Schreiben Sie uns' : 'Get in touch'}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </Container>
      </section>
    </main>
  );
}
