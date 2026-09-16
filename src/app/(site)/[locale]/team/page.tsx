import type { Metadata } from 'next';

import { HeroAPhotoLed } from '@/components/heroes';
import { EditorialSplit } from '@/components/sections';
import { TeamDirectory } from '@/components/signatures';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getTeamSpotlights } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Unser Team' : 'Our team',
    description: locale === 'de' ? 'Lernen Sie die Menschen kennen, die Sie bei CASA in Bremen unterrichten, beraten und begleiten.' : 'Meet the people who teach, advise and support you at CASA in Bremen.',
    path: '/team',
    keywords: ['CASA team', 'Language school teachers', 'Bremen student support'],
  });
}

export default async function TeamPage() {
  const locale = await getContentLocale();
  const rhythm = getLayoutRhythm('team');
  const pageConfig = getPublicPageConfig('team', locale);

  const team = getTeamSpotlights(locale);

  const breadcrumbs = [
    { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
    { label: locale === 'de' ? 'Unsere Schule' : 'Our School', href: '/about' },
    { label: locale === 'de' ? 'Team' : 'Team' },
  ];

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      {/*
        THE SITE'S STANDARD HERO, one action. This page and /ueber-uns/gemeinnuetzigkeit
        were the last two on HeroBEditorial: a smaller, heavier h1 than every other
        page, a framed photo card instead of the bleed, and two actions where the
        rest of the site offers one. The course finder the second action pointed at
        is one click away in the navigation.
      */}
      <HeroAPhotoLed
        eyebrow="Team"
        title={locale === 'de' ? 'Wir sind für Sie da' : 'The people here for you'}
        description={
          locale === 'de'
            ? 'Ob im Unterricht, bei der Kurswahl oder bei Fragen zum Aufenthalt: Unser Team begleitet Sie persönlich.'
            : 'In the classroom, when choosing a course or as you settle into Bremen, our team are here to help.'
        }
        photo={pageConfig.photos.team}
        ctas={[{ label: locale === 'de' ? 'Beratung anfragen' : 'Talk to admissions', href: '/contact', kind: 'primary' }]}
        breadcrumbs={breadcrumbs}
      />

      {/* Section 1: Team Directory */}
      <section className="py-16 md:py-20 bg-white">
        <Container>
          <TeamDirectory
            title={locale === 'de' ? 'Team nach Rollen filtern' : 'Filterable team directory'}
            description={
              locale === 'de'
                ? 'Lernen Sie unser Team kennen und finden Sie die passende Ansprechperson für Ihr Anliegen.'
                : 'Get to know our team and find the right person to talk to.'
            }
            team={team}
            contactLabel={locale === 'de' ? 'Team kontaktieren' : 'Contact team'}
            contactHref="/contact"
          />
        </Container>
      </section>

      {/* Section 2: Editorial Split */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <EditorialSplit
            eyebrow={locale === 'de' ? 'Menschen zuerst' : 'People first'}
            title={locale === 'de' ? 'Gemeinsam für Ihren guten Start' : 'Support that brings everything together'}
            description={
              locale === 'de'
                ? 'Lehrkräfte und Verwaltung arbeiten eng zusammen, damit Sie sich auf das Lernen konzentrieren können und bei Fragen Unterstützung finden.'
                : 'Our teachers and office team work closely together, so you can focus on learning and know who to turn to with questions.'
            }
            bullets={[
              locale === 'de' ? 'Klare Rollen und schnelle Kommunikation' : 'Clear roles and responsive communication',
              locale === 'de' ? 'Persönliche Begleitung während Ihrer Zeit bei CASA' : 'Personal support throughout your time at CASA',
              locale === 'de' ? 'Fokus auf Fortschritt und Integration' : 'Focus on progress and integration',
            ]}
            photo={{
              ...pageConfig.photos.mission,
              caption: 'International students practicing together after class - Learning continues outside the classroom.',
            }}
          />
        </Container>
      </section>

      {/*
        NO TESTIMONIAL GRID HERE.

        This was the third full grid of the same seven quotes, under a heading
        about "the team experience" — but CASA's testimonials are about courses,
        and the two that mention a person mention Claudia Gröne, who is already
        listed by name in the directory above. The page's job is who works here.

        The teaching-quality claim it used to lean on is now stated directly, in
        CASA's own words, in the EditorialSplit above.
      */}
    </main>
  );
}
