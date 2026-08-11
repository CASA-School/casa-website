import type { Metadata } from 'next';

import { HeroBEditorial } from '@/components/heroes';
import { EditorialSplit, TestimonialGrid } from '@/components/sections';
import { TeamDirectory } from '@/components/signatures';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getSocialProof, getTeamSpotlights } from '@/lib/content/repository';
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

  const [team, stories] = await Promise.all([
    Promise.resolve(getTeamSpotlights(locale)),
    Promise.resolve(getSocialProof(locale)),
  ]);

  const testimonialPortraits = [
    pageConfig.photos.testimonialA,
    pageConfig.photos.testimonialB,
    pageConfig.photos.testimonialC,
  ];
  const testimonialCards = stories.map((story, index) => ({
    id: story.id,
    person: story.personDisplay,
    country: story.country,
    quote: story.quote,
    photoSrc: testimonialPortraits[index % testimonialPortraits.length].src,
    photoAlt: testimonialPortraits[index % testimonialPortraits.length].alt,
    photoCaption: '',
  }));

  const featuredQuote = stories[0]
    ? {
        quote: stories[0].quote,
        person: stories[0].personDisplay,
        role: stories[0].country,
      }
    : {
        quote:
          locale === 'de'
            ? 'Das Team hat mir geholfen, mich schnell in Bremen zurechtzufinden.'
            : 'The team helped me settle into Bremen quickly and confidently.',
        person: locale === 'de' ? 'CASA Lernende' : 'CASA learner',
        role: locale === 'de' ? 'Bremen' : 'Bremen',
      };

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
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-slate-50/30">
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

      {/* Section 3: Testimonial Grid */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-white">
        <Container>
          <TestimonialGrid
            title={locale === 'de' ? 'Wie Lernende das Team erleben' : 'How learners describe the team experience'}
            description={
              locale === 'de'
                ? 'Stimmen zur Rolle von Lehrkräften und Support im Alltag.'
                : 'Stories about teaching and support impact in day-to-day learning.'
            }
            cards={testimonialCards}
            featuredQuote={featuredQuote}
            locale={locale}
          />
        </Container>
      </section>
    </main>
  );
}
