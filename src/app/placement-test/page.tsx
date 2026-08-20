import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Building2, CheckCircle2, ClipboardCheck, LaptopMinimalCheck } from 'lucide-react';

import { HeroEMinimal } from '@/components/heroes';
import { KlettLevelTests, LevelProgressionTimeline } from '@/components/sections';
import { Button } from '@/components/ui/button';
import { TextCta } from '@/components/ui/text-cta';
import { Container } from '@/components/ui/container';
import { getContentLocale } from '@/lib/content/locale.server';
import { getPlacementNarrative } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Placement Test',
  description:
    'Start with the right CEFR level at CASA Bremen through online or in-person placement guidance.',
  path: '/placement-test',
  keywords: ['German placement test Bremen', 'CEFR level check', 'CASA admissions'],
});

export default async function PlacementTestPage() {
  const locale = await getContentLocale();
  const narrative = getPlacementNarrative(locale);
  const breadcrumbs = [
    { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
    { label: locale === 'de' ? 'Einstufung' : 'Placement test' },
  ];

  const copy =
    locale === 'de'
      ? {
          heroTitle: 'Finden Sie Ihr passendes Sprachniveau ohne Umwege',
          heroBody:
            'Starten Sie mit dem offiziellen Klett-Test und erhalten Sie danach eine klare CASA-Empfehlung für den richtigen Kurs.',
          heroCta: 'Direkt zum Test',
          onlineTitle: 'Online-Einstufung',
          onlineBody:
            'Ideal für Lernende außerhalb Bremens oder mit engem Zeitplan.',
          inPersonTitle: 'Einstufung vor Ort in Bremen',
          inPersonBody:
            'Ideal für Bewerberinnen und Bewerber mit Beratungsbedarf vor Ort.',
          prepTitle: 'Was Sie vorbereiten sollten',
          prepBody: 'Mit ein paar Angaben erhalten Sie schneller eine passgenaue Empfehlung.',
          continueTitle: 'Bereit für die Anmeldung?',
          continueBody: 'Wenn Sie Ihr Niveau kennen, können Sie direkt mit der Kursanmeldung fortfahren.',
          onlineCta: 'Online-Test starten',
          inPersonCta: 'Termin vor Ort anfragen',
          continueCourse: 'Zur Kursanmeldung',
          continueContact: 'Beratung anfragen',
          onlineBullets: [
            'In einem Durchgang von jedem Ort aus absolvieren.',
            'Auswertung durch CASA-Beratung und Unterrichtsteam.',
            'Sinnvoll vor der Intensivkurs-Anmeldung.',
          ],
          inPersonBullets: [
            'Geführter Ablauf im Schulbüro.',
            'Direkte Rückfragen vor Ort möglich.',
            'Empfohlen bei kurzfristigem Kursstart.',
          ],
        }
      : {
          heroTitle: 'Find your right language level without guesswork',
          heroBody:
            'Start with the official Klett test, then get a clear CASA recommendation for the most suitable course path.',
          heroCta: 'Jump to tests',
          onlineTitle: 'Online placement test',
          onlineBody:
            'Best for students outside Bremen or with tight timelines.',
          inPersonTitle: 'In-person assessment in Bremen',
          inPersonBody: 'Best for local applicants who want direct orientation before course selection.',
          prepTitle: 'What to prepare',
          prepBody: 'A few details help us give you a sharper recommendation.',
          continueTitle: 'Ready to continue?',
          continueBody: 'If you already know your level, you can proceed directly to registration.',
          onlineCta: 'Start online test',
          inPersonCta: 'Book in-person appointment',
          continueCourse: 'Continue to registration',
          continueContact: 'Talk to admissions',
          onlineBullets: [
            'Finish in one sitting from any location.',
            'Reviewed by CASA admissions and teaching staff.',
            'Ideal before intensive course registration.',
          ],
          inPersonBullets: [
            'Guided process at the school office.',
            'Immediate questions answered on site.',
            'Recommended for near-term course starts.',
          ],
        };

  return (
    <main className="min-h-screen bg-white text-[var(--casa-ink)]">
      <HeroEMinimal
        eyebrow={locale === 'de' ? 'Einstufung' : 'Placement'}
        title={copy.heroTitle}
        description={copy.heroBody}
        breadcrumbs={breadcrumbs}
        cta={{ label: copy.heroCta, href: '#klett-level-tests', kind: 'primary' }}
        meta={[
          locale === 'de' ? 'Klett Online-Test' : 'Klett online test',
          locale === 'de' ? 'CASA Empfehlung danach' : 'CASA recommendation after test',
        ]}
      />


      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <div className="grid gap-6 xl:grid-cols-2">
            <article className="flex h-full flex-col rounded-3xl border border-[var(--casa-sand)]/80 bg-white p-7 shadow-[var(--shadow-soft)]">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--casa-blue)]/10 text-[var(--casa-accent-text)]">
                <LaptopMinimalCheck className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold">{copy.onlineTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">{copy.onlineBody}</p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-[var(--casa-ink)]">
                {copy.onlineBullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--casa-amber)]" />
                    {bullet}
                  </li>
                ))}
              </ul>
              {/* The page hero already sends readers to #klett-level-tests as
                  its primary CTA, so this was the same jump offered a second
                  time in the same colour. Demoted, not deleted — in-page
                  wayfinding is useful; a second solid button is not. */}
              <div className="mt-6">
                <TextCta href="#klett-level-tests">{copy.onlineCta}</TextCta>
              </div>
            </article>

            <article className="flex h-full flex-col rounded-3xl border border-[var(--casa-sand)]/80 bg-white p-7 shadow-[var(--shadow-soft)]">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--casa-coral)]/14 text-[var(--casa-coral)]">
                <Building2 className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold">{copy.inPersonTitle}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">{copy.inPersonBody}</p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-[var(--casa-ink)]">
                {copy.inPersonBullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--casa-amber)]" />
                    {bullet}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button asChild variant="outline" className="h-11 rounded-lg casa-button-outline border-[var(--casa-ink)] px-5 font-semibold text-[var(--casa-ink)] hover:bg-[var(--casa-canvas)]">
                  <Link href="/contact?topic=placement-in-person">
                    {copy.inPersonCta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </article>
          </div>
        </Container>
      </section>

      <section id="level-progression" className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <LevelProgressionTimeline locale={locale} />
        </Container>
      </section>

      <section id="klett-level-tests" className="py-16 md:py-20 bg-white border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <KlettLevelTests locale={locale} />
        </Container>
      </section>

      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-[var(--casa-sand)]/80 bg-white p-7 shadow-[var(--shadow-soft)]">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--casa-blue)]/10 text-[var(--casa-accent-text)]">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold">{copy.prepTitle}</h2>
              <p className="mt-2 text-sm text-[var(--casa-muted)]">{copy.prepBody}</p>
              <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-[var(--casa-ink)]">
                {narrative.prepChecklist.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-[var(--casa-sand)]/80 bg-white p-7 shadow-[var(--shadow-soft)]">
              <h2 className="text-2xl font-bold">{copy.continueTitle}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--casa-muted)]">{copy.continueBody}</p>
              <div className="mt-5 space-y-3">
                <Button asChild className="w-full justify-between rounded-lg casa-button-prism bg-[var(--casa-ink-deep)] px-4 font-semibold text-white hover:bg-[var(--casa-ink-deep-hover)]">
                  <Link href="/registration/course">
                    {copy.continueCourse}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-between rounded-lg casa-button-outline border-[color:var(--casa-sand)] bg-white font-semibold text-[var(--casa-ink)] hover:bg-[var(--casa-canvas)]">
                  <Link href="/contact">
                    {copy.continueContact}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
