import type { Metadata } from 'next';
import { Building2, Check, Clock3, Mail } from 'lucide-react';

import { HeroEMinimal } from '@/components/heroes';
import { KlettLevelTests, LevelProgressionTimeline } from '@/components/sections';
import { Container } from '@/components/ui/container';
import { TextCta } from '@/components/ui/text-cta';
import { getContentLocale } from '@/lib/content/locale.server';
import { getPlacementNarrative } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

/**
 * The placement page: the Klett online tests, or placement in person.
 *
 * WHAT CHANGED AND WHY (2026-10-01)
 *
 * From 2026-08-23 this page led into CASA's own adaptive test. That test is not
 * finished, so CASA decided to go back to the Klett tests the old
 * casa-bremen.de offered, while the own test stays in development behind
 * `placementTestEnabled()` (src/lib/placement/availability.ts). The copy follows
 * the old site's page, in the new site's "Sie": start with A1, take the test
 * alone without aids, enter name and email in Klett's form, send the result to
 * online@, no test for complete beginners, and placement in person without an
 * appointment.
 *
 * The address stays: about 67 legacy redirects, the sitemap, the footer and
 * twenty internal links point here.
 */

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Deutsch-Einstufungstest' : 'German placement test',
    description:
      locale === 'de'
        ? 'Finden Sie Ihr Deutschniveau: kostenlose Online-Einstufungstests von A1 bis C1 oder eine persönliche Einstufung bei CASA in Bremen, ohne Termin.'
        : 'Find your German level: free online placement tests from A1 to C1, or a personal placement at CASA in Bremen, no appointment needed.',
    path: '/placement-test',
    keywords: ['German placement test Bremen', 'Einstufungstest Deutsch', 'Einstufungstest Bremen', 'CASA Bremen'],
  });
}

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
          heroTitle: 'Finden Sie Ihr Deutschniveau',
          heroBody:
            'Die richtige Einstufung ist die Grundlage für erfolgreiches Lernen. Machen Sie dazu einen kostenlosen Online-Test oder kommen Sie zur persönlichen Einstufung zu uns in die Schule.',
          heroCta: 'Zu den Tests',
          meta: ['Kostenlose Online-Tests', 'Vor Ort ohne Termin'],
          howTitle: 'So gehen Sie vor',
          steps: [
            'Beginnen Sie immer mit dem A1-Test.',
            'Nehmen Sie sich Ruhe und Zeit, und machen Sie den Test allein und ohne Hilfsmittel wie Wörterbücher.',
            'Tragen Sie im Testformular Ihren Namen und Ihre E-Mail-Adresse ein, damit wir Ihr Ergebnis zuordnen können.',
          ],
          sendTitle: 'Senden Sie uns Ihr Ergebnis',
          sendBody: 'Schicken Sie uns Ihre Ergebnisse nach der Auswertung des jeweiligen Tests bitte an',
          beginnerTitle: 'Noch gar keine Deutschkenntnisse?',
          beginnerBody: 'Dann brauchen Sie keinen Einstufungstest. Sie beginnen mit einem Kurs auf dem Niveau A1.',
          beginnerCta: 'Zur Kursanmeldung',
          finalNote:
            'Bei den Intensivkursen führen wir die Einstufung ohnehin vor Ort durch und behalten uns vor, das Kursniveau anzupassen – unabhängig von zuvor erworbenen Zertifikaten.',
          inPersonTitle: 'Lieber persönlich in Bremen?',
          inPersonBody:
            'Wenn Sie in Bremen oder Umgebung leben, kommen Sie gern zur persönlichen Einstufung und Beratung in die Schule. Sie ist unverbindlich, und Sie lernen dabei die Schule kennen und können Ihre Fragen stellen. Ein Termin ist nicht nötig: Kommen Sie Montag bis Donnerstag von 08:30 bis 19:00 Uhr oder freitags von 08:30 bis 13:00 Uhr, und planen Sie mindestens eine Stunde ein.',
          inPersonCta: 'Kontakt und Adresse',
          prepTitle: 'Was Sie vorbereiten können',
        }
      : {
          heroTitle: 'Find your German level',
          heroBody:
            'The right placement is the basis for learning well. Take a free online test, or come to our school for a personal placement.',
          heroCta: 'Go to the tests',
          meta: ['Free online tests', 'In person, no appointment'],
          howTitle: 'How it works',
          steps: [
            'Always start with the A1 test.',
            'Take your time, and do the test on your own, without help such as a dictionary.',
            'Enter your name and email address in the test form, so that we can match your result to you.',
          ],
          sendTitle: 'Send us your result',
          sendBody: 'Once a test has been evaluated, please send your results to',
          beginnerTitle: 'No German at all yet?',
          beginnerBody: 'Then you don’t need a placement test. You start with a course at level A1.',
          beginnerCta: 'Register for a course',
          finalNote:
            'Intensive courses are placed on site in any case, and we may adjust your level regardless of certificates you already hold.',
          inPersonTitle: 'Prefer to come in person?',
          inPersonBody:
            'If you live in or near Bremen, you are welcome to come to the school for a personal placement and advice. It is not binding, and it lets you get to know the school and ask your questions. No appointment is needed: come Monday to Thursday 08:30–19:00 or Friday 08:30–13:00, and allow at least an hour.',
          inPersonCta: 'Contact and address',
          prepTitle: 'What to prepare',
        };

  return (
    <main className="min-h-screen bg-white text-[var(--casa-ink)]">
      <HeroEMinimal
        eyebrow={locale === 'de' ? 'Einstufung' : 'Placement'}
        title={copy.heroTitle}
        description={copy.heroBody}
        breadcrumbs={breadcrumbs}
        cta={{ label: copy.heroCta, href: '/placement-test#klett-level-tests', kind: 'primary' }}
        meta={copy.meta}
      />

      {/* What to do, before the links: the A1 rule and the email to online@
          are the two things people miss. */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-3xl border border-[var(--casa-sand)]/80 bg-white p-7 shadow-[var(--shadow-soft)] sm:p-9">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{copy.howTitle}</h2>
              <ol className="mt-6 space-y-3">
                {copy.steps.map((step, index) => (
                  <li key={step} className="flex items-start gap-3 text-base leading-relaxed">
                    <span
                      aria-hidden
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--casa-blue)]/10 text-xs font-bold tabular-nums text-[var(--casa-accent-text)]"
                    >
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <div className="mt-7 rounded-2xl bg-[var(--casa-surface-wash)] p-5">
                <p className="flex items-center gap-2 text-base font-bold">
                  <Mail className="h-5 w-5 text-[var(--casa-accent-text)]" aria-hidden />
                  {copy.sendTitle}
                </p>
                <p className="mt-2 text-base leading-relaxed text-[var(--casa-muted)]">
                  {copy.sendBody}{' '}
                  <a
                    href="mailto:online@casa-bremen.de"
                    className="font-bold text-[var(--casa-accent-text)] underline underline-offset-4"
                  >
                    online@casa-bremen.de
                  </a>
                  .
                </p>
              </div>
              <p className="mt-6 text-sm leading-relaxed text-[var(--casa-muted)]">{copy.finalNote}</p>
            </article>

            <article className="flex flex-col rounded-3xl border border-[var(--casa-sand)]/80 bg-white p-7 shadow-[var(--shadow-soft)]">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--casa-blue)]/10 text-[var(--casa-accent-text)]">
                <Check className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{copy.beginnerTitle}</h2>
              <p className="mt-3 flex-1 text-base leading-relaxed text-[var(--casa-muted)]">{copy.beginnerBody}</p>
              <div className="mt-6">
                <TextCta href="/registration/course">{copy.beginnerCta}</TextCta>
              </div>
            </article>
          </div>
        </Container>
      </section>

      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-[var(--casa-canvas)]">
        <Container>
          <KlettLevelTests locale={locale} />
        </Container>
      </section>

      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="flex flex-col rounded-3xl border border-[var(--casa-sand)]/80 bg-white p-7 shadow-[var(--shadow-soft)]">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--casa-coral)]/14 text-[var(--casa-coral)]">
                <Building2 className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{copy.inPersonTitle}</h2>
              <p className="mt-3 flex-1 text-base leading-relaxed text-[var(--casa-muted)]">{copy.inPersonBody}</p>
              <div className="mt-6">
                <TextCta href="/contact?topic=placement-in-person">{copy.inPersonCta}</TextCta>
              </div>
            </article>

            <article className="rounded-3xl border border-[var(--casa-sand)]/80 bg-white p-7 shadow-[var(--shadow-soft)]">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--casa-blue)]/10 text-[var(--casa-accent-text)]">
                <Clock3 className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{copy.prepTitle}</h2>
              <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-[var(--casa-ink)]">
                {narrative.prepChecklist.map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span aria-hidden className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-amber)]" />
                    {line}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </Container>
      </section>

      <section id="level-progression" className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-[var(--casa-canvas)]">
        <Container>
          <LevelProgressionTimeline locale={locale} />
        </Container>
      </section>
    </main>
  );
}
