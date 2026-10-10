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
import { say } from '@/lib/cms/copy';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Unser Team: die Menschen bei CASA in Bremen' : 'Our team: the people at CASA in Bremen',
    description: locale === 'de' ? 'Lerne die Menschen kennen, die dich bei CASA in Bremen unterrichten, beraten und begleiten.' : 'Meet the people who teach, advise and support you at CASA, the non-profit language school in Bremen.',
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
    { label: say(locale, 'Start', 'Home'), href: '/' },
    { label: say(locale, 'Unsere Schule', 'Our school'), href: '/about' },
    { label: say(locale, 'Team', 'Team') },
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
        title={say(locale, 'Wir sind für dich da', 'We are here for you')}
        description={
          say(locale, 'Unser Team begleitet dich persönlich im Unterricht, bei der Wahl deines Kurses und bei allen Fragen zu deinem Aufenthalt in Bremen.', 'Our team supports you personally in class, when you choose your course and with any questions about your stay in Bremen.')
        }
        photo={pageConfig.photos.team}
        ctas={[{ label: say(locale, 'Beratung anfragen', 'Get advice'), href: '/contact', kind: 'primary' }]}
        breadcrumbs={breadcrumbs}
      />

      {/* Section 1: Team Directory */}
      <section className="py-16 md:py-20">
        <Container>
          <TeamDirectory
            title={say(locale, 'Das CASA-Team', 'The CASA team')}
            description={
              say(locale, 'Hier stellen wir dir die Menschen vor, die bei uns die Schule leiten und organisieren. So findest du schnell die richtige Ansprechperson für deine Frage.', 'Here you can meet the people who run and organise our school and quickly find the right person for your question.')
            }
            team={team}
            contactLabel={say(locale, 'Schreib uns', 'Write to us')}
            contactHref="/contact"
          />
        </Container>
      </section>

      {/* Section 2: Editorial Split */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <EditorialSplit
            eyebrow={say(locale, 'Unser Team', 'Our team')}
            title={say(locale, 'Wer wir sind', 'Who we are')}
            description={
              say(locale, 'Unser Team ist eine bunte Mischung aus erfahrenen Kolleginnen und Kollegen und jungen Menschen, die gerade ins Berufsleben starten. Uns alle verbindet die Leidenschaft für die Sprache, die wir jeden Tag vermitteln.', 'Our team is a colourful mix of experienced colleagues and young people just starting out in their careers. What we all share is a passion for the language we teach every day.')
            }
            bullets={[
              say(locale, 'Unsere Lehrkräfte sind Muttersprachlerinnen und Muttersprachler mit Universitätsabschluss. Viele von uns sprechen mehrere Fremdsprachen.', 'Our teachers are native speakers with university degrees. Many of us speak several foreign languages.'),
              say(locale, 'Die meisten von uns haben im Ausland gelebt oder gearbeitet und dabei selbst erfahren, was es heißt, eine Fremdsprache zu lernen.', 'Most of us have lived or worked abroad and know from experience what it means to learn a foreign language.'),
              say(locale, 'Wir alle legen großen Wert auf eine persönliche und lernfreundliche Atmosphäre, in der du dich wohlfühlst.', 'We all care a great deal about a personal, friendly atmosphere for learning, where you feel at ease.'),
            ]}
            photo={{
              ...pageConfig.photos.mission,
              caption: 'International students practising together after class. Learning carries on outside the classroom.',
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
