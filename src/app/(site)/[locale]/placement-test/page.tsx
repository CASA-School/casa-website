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
 * the old site's page, in its „du“ (2026-10-07): start with A1, take the test
 * alone without aids, enter name and email in Klett's form, send the result to
 * online@, no test for complete beginners, and placement in person without an
 * appointment. The old page „Niveaustufen“ redirects here, so the level section
 * at the end carries its descriptions of each level.
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
        ? 'Mit den kostenlosen Online-Einstufungstests von A1 bis C1 findest du dein Deutschniveau. In Bremen kannst du auch ohne Termin zur persönlichen Einstufung zu CASA kommen.'
        : 'Find your German level with the free online placement tests from A1 to C1. In Bremen, you can also come to CASA and take a placement test in person, without an appointment.',
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
          heroTitle: 'Finde dein Deutschniveau',
          heroBody:
            'Die richtige Einstufung ist die Grundlage für erfolgreiches Lernen. Mach einen kostenlosen Online-Test oder komm zur persönlichen Einstufung zu uns in die Schule.',
          heroCta: 'Zu den Tests',
          meta: ['Kostenlose Online-Tests', 'Vor Ort ohne Termin'],
          howTitle: 'So gehst du vor',
          steps: [
            'Beginne immer mit dem A1-Test.',
            'Nimm dir Ruhe und Zeit, und mach den Test allein und ohne Hilfsmittel wie Wörterbücher.',
            'Trag im Testformular deinen Namen und deine E-Mail-Adresse ein, damit wir dein Ergebnis zuordnen können.',
          ],
          sendTitle: 'Schick uns deine Ergebnisse',
          sendBody: 'Wenn ein Test ausgewertet ist, schick das Ergebnis bitte an',
          beginnerTitle: 'Noch gar keine Deutschkenntnisse?',
          beginnerBody: 'Dann brauchst du keinen Einstufungstest und beginnst einfach mit einem Kurs auf dem Niveau A1.',
          beginnerCta: 'Zur Kursanmeldung',
          finalNote:
            'Bei den Intensivkursen stufen wir dich ohnehin vor Ort ein. Wir behalten uns dabei vor, dein Kursniveau anzupassen, auch wenn du schon ein Zertifikat hast.',
          inPersonTitle: 'Lieber persönlich in Bremen?',
          inPersonBody:
            'Wenn du in Bremen oder Umgebung lebst, laden wir dich herzlich zur persönlichen Einstufung und Beratung in die Schule ein. Die Einstufung ist unverbindlich, und du lernst dabei die Schule kennen und kannst deine Fragen stellen.',
          inPersonFacts: [
            { label: 'Ohne Termin', lines: ['Montag bis Donnerstag 08:30–19:00 Uhr', 'Freitag 08:30–13:00 Uhr'] },
            { label: 'Dauer', lines: ['Plane mindestens eine Stunde ein.'] },
          ],
          inPersonCta: 'Kontakt und Adresse',
          prepTitle: 'Was du vorbereiten kannst',
        }
      : {
          heroTitle: 'Find your German level',
          heroBody:
            'Learning well starts with a group at the right level. To find yours, take a free online test or come to the school for a placement test in person.',
          heroCta: 'Go to the tests',
          meta: ['Free online tests', 'In person, no appointment'],
          howTitle: 'How it works',
          steps: [
            'Always start with the A1 test.',
            'Find a quiet moment and take your time. Do the test on your own, without help such as a dictionary.',
            'Enter your name and email address in the test form so that we can match your result to you.',
          ],
          sendTitle: 'Send us your results',
          sendBody: 'Once a test has been marked, please send the result to',
          beginnerTitle: 'No German at all yet?',
          beginnerBody: 'Then you don’t need a placement test. You simply start with a course at level A1.',
          beginnerCta: 'Register for a course',
          finalNote:
            'If you join an intensive course, we will place you here at the school anyway, and we may adjust your course level even if you already have a certificate.',
          inPersonTitle: 'Prefer to come in person?',
          inPersonBody:
            'If you live in or near Bremen, you’re very welcome to come to the school for a placement test and advice in person. The placement test doesn’t commit you to anything, and it’s a chance to get to know the school and ask your questions.',
          inPersonFacts: [
            { label: 'No appointment needed', lines: ['Monday to Thursday 08:30–19:00', 'Friday 08:30–13:00'] },
            { label: 'Time', lines: ['Allow at least an hour.'] },
          ],
          inPersonCta: 'Contact and address',
          prepTitle: 'What to prepare',
        };

  return (
    <main className="min-h-screen bg-[var(--casa-canvas)] text-[var(--casa-ink)]">
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
              <p className="mt-3 text-base leading-relaxed text-[var(--casa-muted)]">{copy.inPersonBody}</p>
              {/* The opening hours as facts, not a sentence (2026-10-07): in the
                  paragraph they made this card twice the height of its neighbour. */}
              <dl className="mt-5 grid flex-1 content-start gap-3 sm:grid-cols-2">
                {copy.inPersonFacts.map((fact) => (
                  <div key={fact.label} className="rounded-xl bg-[var(--casa-canvas)] px-4 py-3">
                    <dt className="text-xs text-[var(--casa-muted)]">{fact.label}</dt>
                    {fact.lines.map((line) => (
                      <dd key={line} className="mt-1 text-sm font-semibold leading-snug text-[var(--casa-ink)]">{line}</dd>
                    ))}
                  </div>
                ))}
              </dl>
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
