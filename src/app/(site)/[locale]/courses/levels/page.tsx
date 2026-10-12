import type { Metadata } from 'next';

import { HeroAPhotoLed } from '@/components/heroes';
import { CefrLevelOverview, CefrLevelRows } from '@/components/sections';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { TextCta } from '@/components/ui/text-cta';
import { Link } from '@/i18n/navigation';
import { getContentLocale } from '@/lib/content/locale.server';
import { createPublicMetadata } from '@/lib/seo';
import { say } from '@/lib/cms/copy';

/**
 * THE LEVELS PAGE (2026-10-12), /sprachkurse/niveaustufen as on the old site:
 * what each level means, A1 to C1 with B1+, with the old page's pictures and
 * its text in the site's voice. The one place the levels are told in full —
 * course pages and the placement page carry the short version and link here
 * (config/content/cefr-levels.ts is the source for all of them).
 *
 * Order: the hero, the six levels at a glance (each bar jumps to its level),
 * the levels one by one, then the way to find your own level.
 */

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Niveaustufen A1 bis C1' : 'Language levels A1 to C1',
    description:
      locale === 'de'
        ? 'Was du auf jeder Niveaustufe kannst, von A1 bis C1 mit der B1+: die Stufen des Gemeinsamen Europäischen Referenzrahmens bei CASA in Bremen.'
        : 'What you can do at each level, from A1 to C1 with B1+: the levels of the Common European Framework of Reference at CASA in Bremen.',
    path: '/courses/levels',
    keywords: ['Niveaustufen Deutsch', 'GER Niveaustufen', 'A1 A2 B1 B2 C1', 'CEFR levels German', 'CASA Bremen'],
  });
}

export default async function LevelsPage() {
  const locale = await getContentLocale();
  const breadcrumbs = [
    { label: say(locale, 'Start', 'Home'), href: '/' },
    { label: say(locale, 'Kurse', 'Courses'), href: '/courses' },
    { label: say(locale, 'Niveaustufen', 'Levels') },
  ];

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]">
      <HeroAPhotoLed
        eyebrow={say(locale, 'Niveaustufen', 'Levels')}
        title={say(locale, 'Von A1 bis C1, Stufe für Stufe', 'From A1 to C1, step by step')}
        description={say(
          locale,
          'Bei uns laufen fortlaufend Kurse auf den Niveaustufen A1, A2, B1, B1+, B2 und C1. Hier siehst du, was du auf jeder Stufe kannst.',
          'Our courses run continuously at levels A1, A2, B1, B1+, B2 and C1. Here you can see what you can do at each level.'
        )}
        photo={{
          src: '/media/casa/levels-hero.jpg',
          alt: say(locale, 'Buchstaben aus goldenen Pailletten auf einer bemalten Leinwand', 'Letters of gold sequins on a painted canvas'),
          aspectRatio: '3 / 2',
        }}
        ctas={[{ label: say(locale, 'Zum Einstufungstest', 'Go to the placement test'), href: '/placement-test', kind: 'primary' }]}
        breadcrumbs={breadcrumbs}
      />

      <section className="py-16 md:py-24" aria-labelledby="levels-overview">
        <Container>
          {/* The heading at reading width, the bars under it at full width: beside it,
              the C band's name had one narrow column to fit in. */}
          <div>
            <div className="max-w-[46rem]">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                {say(locale, 'Gemeinsamer Europäischer Referenzrahmen', 'Common European Framework of Reference')}
              </p>
              <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
              <h2 id="levels-overview" className="mt-3 text-balance text-2xl font-bold leading-tight sm:text-3xl">
                {say(locale, 'Sechs Stufen in drei Bereichen', 'Six levels in three bands')}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
                {say(
                  locale,
                  'Wir orientieren uns streng am Gemeinsamen Europäischen Referenzrahmen für Sprachen (GER). Er beschreibt, was du auf jeder Stufe verstehen und sagen kannst. Die B1+ ist eine eigene Stufe unseres Intensivkurses zwischen B1 und B2.',
                  'We keep strictly to the Common European Framework of Reference for Languages (CEFR). It describes what you can understand and say at each level. B1+ is an extra step of our intensive course, between B1 and B2.'
                )}
              </p>
              <p className="mt-3 text-base leading-relaxed text-[var(--casa-muted)]">
                {say(
                  locale,
                  'Im Intensivkurs hast du {course.intensive-german.lessons} Unterrichtseinheiten à 45 Minuten pro Woche. Eine ganze Niveaustufe dauert dort in der Regel 8–9 Wochen, die B1+ genauso lange. Im Abendkurs dauert eine halbe Niveaustufe etwa ein Trimester.',
                  'On the intensive course, you have {course.intensive-german.lessons} lessons of 45 minutes a week, and a whole level usually takes 8–9 weeks. B1+ takes just as long. On the evening course, half a level takes about one trimester.'
                )}
              </p>
            </div>
            <CefrLevelOverview locale={locale} className="mt-12 max-w-5xl" />
          </div>
        </Container>
      </section>

      <section className="border-t border-[color:var(--casa-sand)]/40 py-16 md:py-24">
        <Container>
          <CefrLevelRows locale={locale} />
        </Container>
      </section>

      <section className="pb-20 pt-4 md:pb-28">
        <Container>
          <div className="casa-editorial-measure rounded-3xl bg-[var(--casa-warm-panel)] px-6 py-10 sm:px-9 md:px-12 md:py-12">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{say(locale, 'Einstufung', 'Placement test')}</p>
            <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
            <h2 className="mt-3 text-balance text-2xl font-bold leading-tight sm:text-3xl">
              {say(locale, 'Du kennst dein Niveau noch nicht?', 'Not sure of your level yet?')}
            </h2>
            <p className="mt-4 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
              {say(
                locale,
                'Lass dich gern von uns beraten. Eine gute Grundlage sind unsere kostenlosen Online-Einstufungstests. Wenn du noch gar kein Deutsch kannst, brauchst du keinen Test und beginnst einfach mit A1.',
                'We are happy to advise you. Our free online placement tests are a good place to start. If you don’t speak any German yet, you don’t need a test and simply start with A1.'
              )}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Button asChild className="casa-button-prism h-11 rounded-lg bg-[var(--casa-ink-deep)] px-5 font-semibold text-white hover:bg-[var(--casa-ink-deep-hover)]">
                <Link href="/placement-test">{say(locale, 'Zum Einstufungstest', 'Go to the placement test')}</Link>
              </Button>
              <TextCta href="/contact">{say(locale, 'Beratung anfragen', 'Get advice')}</TextCta>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
