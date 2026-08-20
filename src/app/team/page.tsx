import type { Metadata } from 'next';

import { HeroBEditorial } from '@/components/heroes';
import { EditorialSplit } from '@/components/sections';
import { TeamDirectory } from '@/components/signatures';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getTeamSpotlights } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Team',
  description: 'Meet the people behind CASA: teachers, coordination, and student support roles.',
  path: '/team',
  keywords: ['CASA team', 'Language school teachers', 'Bremen student support'],
});

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
      <HeroBEditorial
        eyebrow={locale === 'de' ? 'Team' : 'Team'}
        title={locale === 'de' ? 'Menschen, die Lernwege möglich machen' : 'People who make learner journeys possible'}
        description={
          locale === 'de'
            ? 'Lehrkräfte, Koordination und Support arbeiten gemeinsam dafür, dass jede lernende Person Fortschritte macht.'
            : 'Teachers, coordinators, and student support work as one team to help every learner move forward.'
        }
        photo={{
          ...pageConfig.photos.team,
          caption: 'Teacher giving feedback during speaking exercise - Personal feedback in small groups.',
        }}
        ctas={[
          { label: locale === 'de' ? 'Beratung anfragen' : 'Talk to admissions', href: '/contact', kind: 'primary' },
          { label: locale === 'de' ? 'Passenden Kurs finden' : 'Find my course path', href: '/courses', kind: 'secondary' },
        ]}
        breadcrumbs={breadcrumbs}
        themeClassName="hero-theme-about"
      />

      {/* Section 1: Team Directory */}
      <section className="py-16 md:py-20 bg-white">
        <Container>
          <TeamDirectory
            title={locale === 'de' ? 'Team nach Rollen filtern' : 'Filterable team directory'}
            description={
              locale === 'de'
                ? 'Filtern Sie nach Rollen und sehen Sie, wie das Team den Lernprozess begleitet.'
                : 'Filter by roles and explore how each team function supports learners.'
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
            title={locale === 'de' ? 'Lehrqualität trifft menschliche Begleitung' : 'Teaching quality meets personal guidance'}
            description={
              locale === 'de'
                ? 'Der Lernerfolg entsteht durch Teamarbeit zwischen Unterricht, Organisation und Support.'
                : 'Learner progress is built through teamwork across teaching, operations, and support.'
            }
            bullets={[
              locale === 'de' ? 'Klare Rollen und schnelle Kommunikation' : 'Clear roles and responsive communication',
              locale === 'de' ? 'Verbindliche Begleitung im gesamten Lernweg' : 'Consistent support across the full journey',
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
