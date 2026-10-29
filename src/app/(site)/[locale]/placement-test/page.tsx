import type { Metadata } from 'next';
import { ArrowDown, Building2, Check, Mail } from 'lucide-react';

import { PlacementAppointmentDialog } from '@/components/appointments/placement-appointment-dialog';
import { HeroSurface } from '@/components/heroes/shared';
import { KlettLevelTests } from '@/components/sections';
import { Container } from '@/components/ui/container';
import { IconBadge } from '@/components/ui/icon-badge';
import { TextCta } from '@/components/ui/text-cta';
import { getContentLocale } from '@/lib/content/locale.server';
import { getPlacementNarrative } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';
import { Link } from '@/i18n/navigation';
import { pickTree, say } from '@/lib/cms/copy';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();
  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Deutsch-Einstufungstest' : 'German placement test',
    description: locale === 'de'
      ? 'Finde dein Deutschniveau mit den kostenlosen Online-Einstufungstests von A1 bis C1, oder buch dir einen Termin zur persönlichen Einstufung bei CASA in Bremen.'
      : 'Find your German level with the free online placement tests from A1 to C1, or book an appointment for a placement test in person at CASA in Bremen.',
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
  const copy = pickTree(locale, {
    de: {
      title: 'Finde dein Deutschniveau',
      intro: 'Ob du ganz neu anfängst, online testen oder persönlich zu uns kommen möchtest: Hier findest du deinen nächsten Schritt.',
      choiceTitle: 'Welcher Weg passt zu dir?',
      beginner: 'Ich fange ganz neu an',
      beginnerText: 'Noch keine Deutschkenntnisse? Starte mit einem A1-Kurs. Einen Online-Test brauchst du nicht.',
      beginnerAction: 'Zum A1-Kurs anmelden',
      online: 'Ich möchte den Online-Test machen',
      onlineText: 'Teste dein Deutsch kostenlos von zu Hause und schick uns dein Ergebnis.',
      onlineAction: 'So funktioniert der Online-Test',
      visit: 'Ich möchte zu CASA kommen',
      visitText: 'Buch einen Termin zur persönlichen Einstufung und Beratung in Bremen.',
      onlineTitle: 'Online-Test: Schritt für Schritt',
      steps: [
        { title: 'Mit A1 beginnen', body: 'Starte mit dem A1-Test. Mach den Test allein und ohne Hilfsmittel wie Wörterbücher.' },
        { title: 'Name und E-Mail eintragen', body: 'Trag im Testformular deinen Namen und deine E-Mail-Adresse ein, damit wir dein Ergebnis zuordnen können.' },
        { title: 'Ergebnis schicken', body: 'Schick dein Ergebnis an online@casa-bremen.de. Danach kannst du zur Kursanmeldung zurückkehren.' },
      ],
      testsTitle: 'Wähle deinen Test',
      testsIntro: 'Beginne mit A1. Die Tests öffnen sich beim Klett Verlag in einem neuen Tab.',
      visitTitle: 'Persönlich bei CASA in Bremen',
      visitBody: 'Wir finden gemeinsam dein Niveau und beantworten deine Fragen. Die Einstufung ist unverbindlich.',
      schedule: 'Dienstag bis Donnerstag · 30 Minuten · Am Dobben 14–16, Bremen',
      prep: 'Was du vorbereiten kannst',
      contact: 'Kontakt und Adresse',
      intensive: 'Für Intensivkurse prüfen wir das Niveau auch vor Ort. Wenn du ganz neu anfängst und Fragen dazu hast, sprich uns gern an.',
      levels: 'Was die Niveaustufen bedeuten',
      levelsAction: 'Niveaustufen ansehen',
    },
    en: {
      title: 'Find your German level',
      intro: 'Whether you are a complete beginner, want to take a test online or visit us in person, find your next step here.',
      choiceTitle: 'Which route suits you?',
      beginner: 'I am a complete beginner',
      beginnerText: 'New to German? Start with an A1 course. You do not need an online test.',
      beginnerAction: 'Register for an A1 course',
      online: 'I want to take the online test',
      onlineText: 'Test your German for free from home and send us your result.',
      onlineAction: 'How the online test works',
      visit: 'I want to visit CASA',
      visitText: 'Book an appointment for a personal assessment and advice in Bremen.',
      onlineTitle: 'Online test: step by step',
      steps: [
        { title: 'Start with A1', body: 'Start with the A1 test. Take it on your own, without help such as a dictionary.' },
        { title: 'Enter your name and email', body: 'Enter your name and email in the test form so that we can match your result to you.' },
        { title: 'Send your result', body: 'Email your result to online@casa-bremen.de. Then you can return to course registration.' },
      ],
      testsTitle: 'Choose your test',
      testsIntro: 'Start with A1. The tests open on Klett’s website in a new tab.',
      visitTitle: 'Visit CASA in Bremen',
      visitBody: 'We will find your level together and answer your questions. The assessment does not commit you to anything.',
      schedule: 'Tuesday to Thursday · 30 minutes · Am Dobben 14–16, Bremen',
      prep: 'What to prepare',
      contact: 'Contact and address',
      intensive: 'For intensive courses, we also check your level in person. If you are a complete beginner and have questions, please ask us.',
      levels: 'What the levels mean',
      levelsAction: 'Explore the levels',
    },
  });

  return (
    <main className="min-h-screen bg-[var(--casa-canvas)] text-[var(--casa-ink)]">
      <HeroSurface themeClassName="hero-theme-plain" archetype="C" breadcrumbs={breadcrumbs}>
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{say(locale, 'Einstufung', 'Placement')}</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">{copy.title}</h1>
          <p className="mt-5 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{copy.intro}</p>
        </div>
        <div className="mt-10">
          <h2 className="text-xl font-bold">{copy.choiceTitle}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <article className="flex flex-col rounded-2xl bg-white p-6 shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--casa-sand)]">
              <span className="text-sm font-bold text-[var(--casa-accent-text)]">01</span>
              <h3 className="mt-3 text-lg font-bold">{copy.beginner}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--casa-muted)]">{copy.beginnerText}</p>
              <div className="mt-5"><TextCta href="/registration/course">{copy.beginnerAction}</TextCta></div>
            </article>
            <article className="flex flex-col rounded-2xl bg-white p-6 shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--casa-sand)]">
              <span className="text-sm font-bold text-[var(--casa-accent-text)]">02</span>
              <h3 className="mt-3 text-lg font-bold">{copy.online}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--casa-muted)]">{copy.onlineText}</p>
              <a href="#online-test" className="mt-5 inline-flex min-h-11 items-center gap-2 self-start text-sm font-bold text-[var(--casa-accent-text)] underline underline-offset-4">{copy.onlineAction}<ArrowDown className="size-4" aria-hidden /></a>
            </article>
            <article className="flex flex-col rounded-2xl bg-white p-6 shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--casa-sand)]">
              <span className="text-sm font-bold text-[var(--casa-accent-text)]">03</span>
              <h3 className="mt-3 text-lg font-bold">{copy.visit}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--casa-muted)]">{copy.visitText}</p>
              <div className="mt-5"><PlacementAppointmentDialog locale={locale} /></div>
            </article>
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-[var(--casa-muted)]">{copy.intensive}</p>
        </div>
      </HeroSurface>

      <section id="online-test" className="scroll-mt-28 border-t border-[color:var(--casa-sand)]/40 py-16 md:py-20">
        <Container>
          <div className="rounded-3xl bg-[var(--casa-warm-panel)] px-5 py-8 sm:px-6 md:px-9 md:py-10">
            <span className="casa-tricolor-rule block h-1 w-20 rounded-full" aria-hidden />
            <h2 className="mt-3 text-2xl font-bold sm:text-3xl">{copy.onlineTitle}</h2>
            <ol className="mt-8 grid gap-7 md:grid-cols-3">
              {copy.steps.map((step, index) => (
                <li key={step.title} className="relative min-w-0 border-l border-[color:var(--casa-sand)] pl-4">
                  <span className="absolute -left-2 top-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--casa-accent-surface)] text-xs font-bold text-white">{index + 1}</span>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">{step.body}</p>
                  {index === 2 ? <a href="mailto:online@casa-bremen.de" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-[var(--casa-accent-text)] underline underline-offset-4"><Mail className="size-4" aria-hidden />online@casa-bremen.de</a> : null}
                </li>
              ))}
            </ol>
            <div className="mt-9 border-t border-[color:var(--casa-sand)] pt-7">
              <h3 className="text-xl font-bold">{copy.testsTitle}</h3>
              <p className="mb-5 mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">{copy.testsIntro}</p>
              <KlettLevelTests locale={locale} />
            </div>
          </div>
        </Container>
      </section>

      <section className="pb-20 md:pb-28">
        <Container>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <article className="rounded-3xl bg-white p-7 shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--casa-sand)] sm:p-8">
              <IconBadge icon={Building2} meaning="orientation" size="lg" className="mb-4" />
              <h2 className="text-2xl font-bold">{copy.visitTitle}</h2>
              <p className="mt-3 text-base leading-relaxed text-[var(--casa-muted)]">{copy.visitBody}</p>
              <p className="mt-4 text-sm font-semibold">{copy.schedule}</p>
              <h3 className="mt-6 text-sm font-semibold">{copy.prep}</h3>
              <ul className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--casa-muted)]">
                {narrative.prepChecklist.map((line) => <li key={line} className="flex gap-2"><span aria-hidden>•</span>{line}</li>)}
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-5"><PlacementAppointmentDialog locale={locale} /><TextCta href="/contact?topic=placement-in-person">{copy.contact}</TextCta></div>
            </article>
            <article className="flex flex-col rounded-3xl bg-white p-7 shadow-[var(--shadow-soft)] ring-1 ring-[color:var(--casa-sand)] sm:p-8">
              <IconBadge icon={Check} meaning="courses" size="lg" className="mb-4" />
              <h2 className="text-2xl font-bold">{copy.levels}</h2>
              <p className="mt-3 flex-1 text-base leading-relaxed text-[var(--casa-muted)]">{say(locale, 'Von A1 bis C1: Entdecke, was du auf jeder Stufe verstehen und sagen kannst.', 'From A1 to C1: discover what you can understand and say at each level.')}</p>
              <div className="mt-6"><Link href="/courses/levels" className="font-semibold text-[var(--casa-accent-text)] underline underline-offset-4">{copy.levelsAction}</Link></div>
            </article>
          </div>
        </Container>
      </section>
    </main>
  );
}
