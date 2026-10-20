import type { Metadata } from 'next';
import { Building2, ChartNoAxesColumn, Check, Mail } from 'lucide-react';

import { HeroSurface } from '@/components/heroes/shared';
import { KlettLevelTests } from '@/components/sections';
import { Container } from '@/components/ui/container';
import { IconBadge } from '@/components/ui/icon-badge';
import { TextCta } from '@/components/ui/text-cta';
import { getContentLocale } from '@/lib/content/locale.server';
import { getPlacementNarrative } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';
import { pickTree, say } from '@/lib/cms/copy';

/**
 * The placement page: the Klett online tests, or placement in person.
 *
 * SIMPLER, TESTS FIRST (Rahman, 2026-10-12): "it should be easier for students
 * to get there and start with the level tests … beautiful and easy to navigate"
 * until CASA's own test is ready. The six tests are in the hero, A1 marked as
 * where to begin; then the three steps (start with A1, name and email in
 * Klett's form, send the result to online@); then the two other ways — no test
 * for complete beginners, placement in person — and a link to what the levels
 * mean, which the levels page now tells in full (the level overview that used
 * to close this page went there).
 *
 * WHY KLETT (2026-10-01). From 2026-08-23 this page led into CASA's own
 * adaptive test. That test is not finished, so CASA went back to the Klett
 * tests the old casa-bremen.de offered, while the own test stays in development
 * behind `placementTestEnabled()` (src/lib/placement/availability.ts). The copy
 * follows the old site's page, in its „du" (2026-10-07). This page never links
 * into the own test (availability.test.ts checks it).
 */

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Deutsch-Einstufungstest' : 'German placement test',
    description:
      locale === 'de'
        ? 'Finde dein Deutschniveau mit den kostenlosen Online-Einstufungstests von A1 bis C1, oder komm ohne Termin zur persönlichen Einstufung zu CASA in Bremen.'
        : 'Find your German level with the free online placement tests from A1 to C1, or come to CASA in Bremen for a placement test in person, no appointment needed.',
    path: '/placement-test',
    keywords: ['German placement test Bremen', 'Einstufungstest Deutsch', 'Einstufungstest Bremen', 'CASA Bremen'],
  });
}

export default async function PlacementTestPage() {
  const locale = await getContentLocale();
  const narrative = getPlacementNarrative(locale);
  const breadcrumbs = [
    { label: say(locale, 'Start', 'Home'), href: '/' },
    { label: say(locale, 'Einstufung', 'Placement test') },
  ];

  const copy =
    pickTree(locale, { de: {
          heroTitle: 'Finde dein Deutschniveau',
          heroBody:
            'Die richtige Einstufung ist die Grundlage für erfolgreiches Lernen. Mach einen kostenlosen Online-Test oder komm zur persönlichen Einstufung zu uns in die Schule.',
          howTitle: 'So gehst du vor',
          steps: [
            { title: 'Mit A1 beginnen', body: 'Beginne immer mit dem A1-Test. Nimm dir Ruhe und Zeit, und mach den Test allein und ohne Hilfsmittel wie Wörterbücher.' },
            { title: 'Name und E-Mail eintragen', body: 'Trag im Testformular deinen Namen und deine E-Mail-Adresse ein, damit wir dein Ergebnis zuordnen können.' },
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
          levelsTitle: 'Was die Stufen bedeuten',
          levelsBody: 'Von A1 bis C1: Auf der Seite Niveaustufen siehst du, was du auf jeder Stufe verstehen und sagen kannst.',
          levelsCta: 'Zu den Niveaustufen',
        }, en: {
          heroTitle: 'Find your German level',
          heroBody:
            'Learning well starts with a group at the right level. To find yours, take a free online test or come to the school for a placement test in person.',
          howTitle: 'How it works',
          steps: [
            { title: 'Start with A1', body: 'Always start with the A1 test. Find a quiet moment and take your time. Do the test on your own, without help such as a dictionary.' },
            { title: 'Enter your name and email', body: 'Enter your name and email address in the test form so that we can match your result to you.' },
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
          levelsTitle: 'What the levels mean',
          levelsBody: 'From A1 to C1: the levels page shows what you can understand and say at each level.',
          levelsCta: 'Go to the levels',
        } });

  return (
    <main className="min-h-screen bg-[var(--casa-canvas)] text-[var(--casa-ink)]">
      {/* The tests are the hero: the lede beside them, the six tiles one tap away. */}
      <HeroSurface themeClassName="hero-theme-plain" archetype="C" breadcrumbs={breadcrumbs}>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{say(locale, 'Einstufung', 'Placement')}</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight text-[var(--casa-ink)] sm:text-5xl">{copy.heroTitle}</h1>
            <p className="mt-5 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{copy.heroBody}</p>
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-[var(--casa-ink)] shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--casa-sand)]">
              <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--casa-sun)]" />
              {say(locale, 'Kostenlos, von A1 bis C1', 'Free, from A1 to C1')}
            </p>
          </div>
          <KlettLevelTests locale={locale} />
        </div>
      </HeroSurface>

      <section className="border-t border-[color:var(--casa-sand)]/40 py-16 md:py-20" aria-labelledby="placement-steps">
        <Container>
          <div className="casa-editorial-measure rounded-3xl bg-[var(--casa-warm-panel)] px-5 py-8 sm:px-6 md:px-9 md:py-10">
            <span className="casa-tricolor-rule block h-1 w-20 rounded-full" aria-hidden />
            <h2 id="placement-steps" className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">{copy.howTitle}</h2>
            <ol className="mt-8 grid gap-7 md:grid-cols-3">
              {copy.steps.map((step, index) => (
                <li key={step.title} className="relative min-w-0 border-l border-[color:var(--casa-sand)] pl-4">
                  <span className="absolute -left-2 top-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--casa-accent-surface)] text-xs font-bold text-white">{index + 1}</span>
                  <h3 className="text-base font-semibold text-[var(--casa-ink)]">{step.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-[var(--casa-muted)]">{step.body}</p>
                </li>
              ))}
              <li className="relative min-w-0 border-l border-[color:var(--casa-sand)] pl-4">
                <span className="absolute -left-2 top-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--casa-accent-surface)] text-xs font-bold text-white">3</span>
                <h3 className="text-base font-semibold text-[var(--casa-ink)]">{copy.sendTitle}</h3>
                <p className="mt-2 text-base leading-relaxed text-[var(--casa-muted)]">
                  {copy.sendBody}{' '}
                  <a href="mailto:online@casa-bremen.de" className="inline-flex items-center gap-1 font-bold text-[var(--casa-accent-text)] underline underline-offset-4">
                    <Mail className="h-4 w-4" aria-hidden />
                    online@casa-bremen.de
                  </a>
                  .
                </p>
              </li>
            </ol>
            <p className="mt-8 border-t border-[color:var(--casa-sand)] pt-5 text-sm leading-relaxed text-[var(--casa-muted)]">{copy.finalNote}</p>
          </div>
        </Container>
      </section>

      <section className="pb-20 md:pb-28">
        <Container>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <article className="flex flex-col rounded-3xl bg-white p-7 shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--casa-sand)] sm:p-8">
              <IconBadge icon={Building2} meaning="orientation" size="lg" className="mb-4" />
              <h2 className="text-2xl font-bold tracking-tight">{copy.inPersonTitle}</h2>
              <p className="mt-3 text-base leading-relaxed text-[var(--casa-muted)]">{copy.inPersonBody}</p>
              <dl className="mt-5 grid content-start gap-3 sm:grid-cols-2">
                {copy.inPersonFacts.map((fact) => (
                  <div key={fact.label} className="rounded-xl bg-[var(--casa-canvas)] px-4 py-3">
                    <dt className="text-xs text-[var(--casa-muted)]">{fact.label}</dt>
                    {fact.lines.map((line) => (
                      // A time range stays on one line: "08:30–19:00" broke after the dash on a phone.
                      <dd key={line} className="mt-1 text-sm font-semibold leading-snug text-[var(--casa-ink)]">{line.replace(/(\d)–(\d)/g, '$1–\u2060$2')}</dd>
                    ))}
                  </div>
                ))}
              </dl>
              <p className="mt-6 text-sm font-semibold text-[var(--casa-ink)]">{copy.prepTitle}</p>
              <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--casa-muted)]">
                {narrative.prepChecklist.map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span aria-hidden className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-amber)]" />
                    {line}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <TextCta href="/contact?topic=placement-in-person">{copy.inPersonCta}</TextCta>
              </div>
            </article>

            <div className="grid gap-6">
              <article className="flex flex-col rounded-3xl bg-white p-7 shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--casa-sand)]">
                <IconBadge icon={Check} meaning="courses" size="lg" className="mb-4" />
                <h2 className="text-2xl font-bold tracking-tight">{copy.beginnerTitle}</h2>
                <p className="mt-3 flex-1 text-base leading-relaxed text-[var(--casa-muted)]">{copy.beginnerBody}</p>
                <div className="mt-6">
                  <TextCta href="/registration/course">{copy.beginnerCta}</TextCta>
                </div>
              </article>
              <article className="flex flex-col rounded-3xl bg-white p-7 shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--casa-sand)]">
                <IconBadge icon={ChartNoAxesColumn} meaning="orientation" size="lg" className="mb-4" />
                <h2 className="text-2xl font-bold tracking-tight">{copy.levelsTitle}</h2>
                <p className="mt-3 flex-1 text-base leading-relaxed text-[var(--casa-muted)]">{copy.levelsBody}</p>
                <div className="mt-6">
                  <TextCta href="/courses/levels">{copy.levelsCta}</TextCta>
                </div>
              </article>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
