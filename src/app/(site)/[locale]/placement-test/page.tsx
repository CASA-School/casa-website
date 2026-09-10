import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import {
  ArrowRight,
  Building2,
  Check,
  Clock3,
  LaptopMinimalCheck,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import { HeroEMinimal } from '@/components/heroes';
import { LevelProgressionTimeline } from '@/components/sections';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { TextCta } from '@/components/ui/text-cta';
import { getContentLocale } from '@/lib/content/locale.server';
import { getPlacementNarrative } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

/**
 * The placement page.
 *
 * WHAT CHANGED AND WHY (2026-08-23)
 *
 * This page used to end in `KlettLevelTests` — six external links to
 * einstufungstests.klett-sprachen.de, one per level. That arrangement had the
 * test backwards: it asked the learner to pick their own level in order to find
 * out their level, and CASA never saw the outcome, so `/registration/course`
 * still had to ask them to self-report it.
 *
 * It now leads to CASA's own adaptive test, which starts from one button and
 * ends with a recommendation CASA holds. Klett remains CASA's *curriculum*
 * (Netzwerk neu → Kontext); only the placement instrument changed. See
 * docs/PLACEMENT_TEST_IMPLEMENTATION.md.
 *
 * PROGRESSIVE DISCLOSURE
 *
 * One primary action, above everything else. No level cards, no CEFR grid, and
 * no level vocabulary in the hero — a learner who could confidently read a
 * level grid would not need the page. What the test costs in time and what
 * happens with the result are answered before the button, because those are the
 * two questions that actually stop people; everything else is below it.
 */

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: 'Placement Test',
    description:
      'Take CASA Bremen’s own German placement test and get a course recommendation from our teaching team. Free, about 15–30 minutes, no registration needed.',
    path: '/placement-test',
    keywords: ['German placement test Bremen', 'CEFR level check', 'Einstufungstest Bremen', 'CASA admissions'],
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
          heroTitle: 'Finden Sie Ihr Niveau — ohne selbst zu raten',
          heroBody:
            'Der CASA-Einstufungstest passt sich Ihren Antworten an und endet mit einer Kursempfehlung, die unser Unterrichtsteam bestätigt.',
          heroCta: 'Test starten',
          startEyebrow: 'Kostenlos, ohne Anmeldung',
          startTitle: 'Ein Test, nicht sechs',
          startBody:
            'Sie wählen kein Niveau aus. Der Test beginnt breit, wird dann genauer und stoppt, sobald Ihr Niveau klar ist.',
          startCta: 'Einstufungstest starten',
          facts: [
            { label: 'Dauer', value: 'etwa 15–30 Minuten' },
            { label: 'Kosten', value: 'kostenlos' },
            { label: 'Konto', value: 'nicht nötig' },
          ],
          assurances: [
            'Sie können pausieren und später weitermachen.',
            'Eine Lehrkraft bestätigt jede Einstufung, bevor Ihr Kurs beginnt.',
            'Kein Zertifikat, kein Bestehen oder Nichtbestehen — nur die passende Gruppe.',
          ],
          howTitle: 'Was Sie erwartet',
          how: [
            {
              title: 'Drei kurze Fragen',
              body: 'Vorkenntnisse, Ziel und letzter Kontakt mit Deutsch. Nichts davon wird bewertet.',
            },
            {
              title: 'Erste Einschätzung',
              body: 'Gemischte Aufgaben über mehrere Niveaus, um ungefähr Ihren Stand zu finden.',
            },
            {
              title: 'Ihr Niveau genauer',
              body: 'Aufgaben auf dem erreichten Niveau — und an einer Grenze noch einige mehr.',
            },
            {
              title: 'Ein kurzer Schreibtext',
              body: 'Wird von einer Lehrkraft gelesen, nie automatisch bewertet.',
            },
          ],
          inPersonTitle: 'Lieber vor Ort in Bremen?',
          inPersonBody:
            'Kommen Sie während der Bürozeiten vorbei — ohne Termin. Bei Intensivkursen führen wir die Einstufung ohnehin vor Ort durch.',
          inPersonCta: 'Termin vor Ort anfragen',
          prepTitle: 'Was Sie vorbereiten sollten',
          prepBody: 'Mit ein paar Angaben erhalten Sie schneller eine passgenaue Empfehlung.',
          pilotTitle: 'Unser eigenes Instrument, in der Pilotphase',
          pilotBody:
            'CASA hat diesen Test selbst entwickelt: eigene Aufgaben, an unserem Lehrplan ausgerichtet, geprüft von unserem Unterrichtsteam. Während der Pilotphase bestätigt immer eine Lehrkraft das Ergebnis — die Empfehlung ist der Ausgangspunkt für dieses Gespräch, nicht das letzte Wort.',
        }
      : {
          heroTitle: 'Find your level without guessing at it',
          heroBody:
            'CASA’s placement test adapts to your answers and ends with a course recommendation our teaching team confirms.',
          heroCta: 'Start the test',
          startEyebrow: 'Free, no account needed',
          startTitle: 'One test, not six',
          startBody:
            'You do not pick a level. The test starts broad, narrows as it goes, and stops once your level is clear.',
          startCta: 'Start the placement test',
          facts: [
            { label: 'Takes', value: 'about 15–30 minutes' },
            { label: 'Costs', value: 'nothing' },
            { label: 'Account', value: 'not needed' },
          ],
          assurances: [
            'You can pause and come back later.',
            'A teacher confirms every placement before your course starts.',
            'No certificate, no pass or fail — just the right group.',
          ],
          howTitle: 'What to expect',
          how: [
            {
              title: 'Three short questions',
              body: 'Prior learning, your goal, and when you last used German. None of it is scored.',
            },
            {
              title: 'First impression',
              body: 'A spread of questions across levels, to find roughly where you are.',
            },
            {
              title: 'A closer look',
              body: 'Questions at the level you reached — and a few more if you land near a boundary.',
            },
            {
              title: 'One short piece of writing',
              body: 'Read by a teacher, never graded automatically.',
            },
          ],
          inPersonTitle: 'Prefer to come to Bremen?',
          inPersonBody:
            'Drop in during office hours, no appointment needed. For intensive courses we run the placement on site anyway.',
          inPersonCta: 'Ask about an in-person slot',
          prepTitle: 'What to prepare',
          prepBody: 'A few details help us give you a sharper recommendation.',
          pilotTitle: 'Our own instrument, in its pilot phase',
          pilotBody:
            'CASA built this test in house: our own questions, written against our curriculum and reviewed by our teaching team. During the pilot a teacher always confirms the outcome — the recommendation is the starting point for that conversation, not the last word.',
        };

  return (
    <main className="min-h-screen bg-white text-[var(--casa-ink)]">
      <HeroEMinimal
        eyebrow={locale === 'de' ? 'Einstufung' : 'Placement'}
        title={copy.heroTitle}
        description={copy.heroBody}
        breadcrumbs={breadcrumbs}
        cta={{ label: copy.heroCta, href: '/placement-test/test', kind: 'primary' }}
        meta={[
          locale === 'de' ? 'Etwa 15–30 Minuten' : 'About 15–30 minutes',
          locale === 'de' ? 'Kostenlos' : 'Free',
        ]}
      />

      {/*
        The start panel. Deliberately the only filled button on the page besides
        the hero's, and deliberately before the explanation — a learner who is
        already convinced should not have to read four steps to find the door.
      */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="flex flex-col rounded-3xl border border-[var(--casa-sand)]/80 bg-white p-7 shadow-[var(--shadow-soft)] sm:p-9">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--casa-blue)]/10 text-[var(--casa-accent-text)]">
                <LaptopMinimalCheck className="h-5 w-5" aria-hidden />
              </div>
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                {copy.startEyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{copy.startTitle}</h2>
              <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
                {copy.startBody}
              </p>

              <dl className="mt-6 grid gap-4 border-y border-[color:var(--casa-sand)]/70 py-5 sm:grid-cols-3">
                {copy.facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-text-subtle)]">
                      {fact.label}
                    </dt>
                    <dd className="mt-0.5 text-base font-bold text-[var(--casa-ink)]">{fact.value}</dd>
                  </div>
                ))}
              </dl>

              <ul className="mt-6 flex-1 space-y-2.5">
                {copy.assurances.map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-sm leading-relaxed">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-[var(--casa-success-text)]" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                <Button
                  asChild
                  className="h-12 rounded-lg casa-button-prism bg-[var(--casa-ink-deep)] px-6 text-sm font-bold text-white hover:bg-[var(--casa-ink-deep-hover)]"
                >
                  <Link href="/placement-test/test">
                    {copy.startCta}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>
            </article>

            {/* In-person, as a real alternative rather than a consolation.
                CASA runs intensive placements on site regardless, so this is
                not a lesser path. */}
            <article className="flex flex-col rounded-3xl border border-[var(--casa-sand)]/80 bg-white p-7 shadow-[var(--shadow-soft)]">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--casa-coral)]/14 text-[var(--casa-coral)]">
                <Building2 className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{copy.inPersonTitle}</h2>
              <p className="mt-3 flex-1 text-base leading-relaxed text-[var(--casa-muted)]">
                {copy.inPersonBody}
              </p>
              <div className="mt-6">
                <TextCta href="/contact?topic=placement-in-person">{copy.inPersonCta}</TextCta>
              </div>
            </article>
          </div>
        </Container>
      </section>

      {/* How it works — four steps, disclosed after the door, not before it. */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-[var(--casa-canvas)]">
        <Container>
          <div className="max-w-measure">
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
              {locale === 'de' ? 'Ablauf' : 'How it works'}
            </p>
            <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
            <h2 className="mt-2 text-3xl font-bold tracking-tight">{copy.howTitle}</h2>
          </div>

          <ol className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {copy.how.map((step, index) => (
              <li
                key={step.title}
                className="rounded-lg border border-[color:var(--casa-sand)] bg-white p-5 shadow-xs"
              >
                <span
                  aria-hidden
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--casa-blue)]/10 text-xs font-bold tabular-nums text-[var(--casa-accent-text)]"
                >
                  {index + 1}
                </span>
                <h3 className="mt-3 text-base font-bold text-[var(--casa-ink)]">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--casa-muted)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section id="level-progression" className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <LevelProgressionTimeline locale={locale} />
        </Container>
      </section>

      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-[var(--casa-canvas)]">
        <Container>
          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-3xl border border-[var(--casa-sand)]/80 bg-white p-7 shadow-[var(--shadow-soft)]">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--casa-blue)]/10 text-[var(--casa-accent-text)]">
                <Clock3 className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{copy.prepTitle}</h2>
              <p className="mt-2 text-sm text-[var(--casa-muted)]">{copy.prepBody}</p>
              <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-[var(--casa-ink)]">
                {narrative.prepChecklist.map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span
                      aria-hidden
                      className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-amber)]"
                    />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            {/*
              The pilot status, stated on the public page rather than only in
              the result. A school that says "our own test, still being
              calibrated, always confirmed by a teacher" is more trustworthy
              than one that implies an instrument is finished.
            */}
            <div className="rounded-3xl border border-[var(--casa-sand)]/80 bg-white p-7 shadow-[var(--shadow-soft)]">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--casa-blue)]/10 text-[var(--casa-accent-text)]">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{copy.pilotTitle}</h2>
              <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
                {copy.pilotBody}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-[color:var(--casa-sand)]/70 pt-5">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--casa-ink)]">
                  <UserRound className="h-4 w-4 text-[var(--casa-accent-text)]" aria-hidden />
                  {locale === 'de'
                    ? 'Jede Einstufung wird von einer Lehrkraft bestätigt'
                    : 'Every placement is confirmed by a teacher'}
                </span>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
