import type { Metadata } from 'next';

import { HeroLede, HeroSurface } from '@/components/heroes/shared';
import { HumanStoryBlock, ProcessSteps, ProofBand } from '@/components/sections';
import { ExamsHeroVisual, type ExamSeal } from '@/components/sections/exams-hero-visual';
import nightHero from '@/components/sections/night-hero.module.css';
import { ExamOptionCards, type ExamOption } from '@/components/signatures';
import { Container } from '@/components/ui/container';
import { getExamFees } from '@/config/content/exam-fees';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getExamCatalog, getSocialProofById } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'telc-Prüfungen in Bremen' : 'telc exams in Bremen',
    description: locale === 'de'
      ? 'Bei CASA in Bremen kannst du telc Deutsch B2 und telc Deutsch C1 Hochschule ablegen. Hier findest du Termine, Vorbereitungskurse und Hilfe bei der Anmeldung.'
      : 'Take telc Deutsch B2 or telc Deutsch C1 Hochschule at CASA in Bremen. Find exam dates, preparation courses and help with registration.',
    path: '/exams',
    keywords: ['CASA exams', 'telc Deutsch B2', 'telc Deutsch C1 Hochschule'],
  });
}

function formatExamDate(value: string, locale: 'en' | 'de') {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  }).format(new Date(value));
}

function examDetailHref(code: string, anchorId: string) {
  if (code === 'telc_b2') return '/exams/b2';
  if (code === 'telc_c1_hochschule') return '/exams/c1';
  return `/exams/${anchorId}`;
}

export default async function ExamsPage() {
  const locale = await getContentLocale();
  const rhythm = getLayoutRhythm('exams-index');
  const pageConfig = getPublicPageConfig('exams', locale);

  const [catalog, candidateStory] = await Promise.all([
    getExamCatalog(locale),
    Promise.resolve(getSocialProofById('fatameh-evening', locale)),
  ]);
  // Fatameh is the only CASA learner who writes about sitting an exam.
  const leadStory = candidateStory;

  const examOptions: ExamOption[] = catalog.items.slice(0, 4).map((item) => {
    // getExamCatalog holds only sittings still open for registration, so
    // the first one is the next date a candidate can still book.
    const nextSession = item.sessions[0];
    const fees = getExamFees(item.examType.code, locale);

    return {
      anchorId: item.examType.code === 'telc_c1_hochschule' ? 'c1' : item.examType.code === 'telc_b2' ? 'b2' : item.anchorId,
      level: item.examType.level ?? '',
      name: item.examType.name,
      summary:
        item.narrative?.summary ||
        (locale === 'de' ? 'Eine anerkannte Prüfung mit festen Terminen und Anmeldefristen.' : 'A recognised exam with fixed dates and registration deadlines.'),
      href: examDetailHref(item.examType.code, item.anchorId),
      facts: [
        {
          label: locale === 'de' ? 'Prüfungsgebühr' : 'Exam fee',
          value: fees.full,
          note: locale === 'de' ? `Teilprüfung ${fees.partial}` : `Partial exam ${fees.partial}`,
        },
        { label: locale === 'de' ? 'Vorbereitungskurs' : 'Preparation course', value: fees.prep, note: fees.prepRhythm },
        nextSession
          ? {
              label: locale === 'de' ? 'Nächster Termin' : 'Next exam date',
              value: formatExamDate(nextSession.starts_at, locale),
              note: nextSession.registration_deadline
                ? `${locale === 'de' ? 'Anmeldeschluss' : 'Register by'} ${formatExamDate(nextSession.registration_deadline, locale)}`
                : undefined,
            }
          : { label: locale === 'de' ? 'Nächster Termin' : 'Next exam date', value: locale === 'de' ? 'Wird bekannt gegeben' : 'To be announced' },
      ],
    };
  });

  const breadcrumbs = [
    { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
    { label: locale === 'de' ? 'Prüfungen' : 'Exams' },
  ];

  /*
    The hero's seals: exactly the exams the catalogue offers, drawn for two.
    The centre shows telc, the level and what follows it in the name
    ("Hochschule"); the caption the same summary as the option card.
  */
  const sealFor = (option: ExamOption): ExamSeal => ({
    id: option.anchorId,
    name: option.name,
    level: option.level,
    qualifier: option.name.replace(/^telc\s+(Deutsch\s+)?/i, '').replace(option.level, '').trim() || undefined,
    summary: option.summary,
    href: option.href,
    cta: locale === 'de' ? 'Mehr zur Prüfung' : 'More about the exam',
  });
  const telcOptions = examOptions.filter((option) => /^telc\b/i.test(option.name) && option.level);
  const examSeals: readonly [ExamSeal, ExamSeal] | null =
    telcOptions.length === 2 ? [sealFor(telcOptions[0]), sealFor(telcOptions[1])] : null;

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      {/*
        THE PICTURE (Rahman, 2026-10-08): the exams CASA runs, drawn in the CASA
        film's line style as two seals on a calm horizon at sunrise, in place of
        the photograph of learners writing in class (thumbC). A sister of the
        non-profit page's income ring and the accommodation page's street, on
        the same night hero; the courses hero has the film's staircase, so this
        one is deliberately not a staircase. One seal per exam this page offers
        (the catalogue's two), each a link to its exam page with the published
        summary on hover or focus; round each, the two parts the registration
        form offers, written and oral. Same composition as HeroAPhotoLed
        (HeroSurface + HeroLede), with the seals where the photo was.

        It used to be HeroCUtilityRail, the DETAIL hero with an "Exam quick
        facts" card. On this index the reader has not chosen an exam yet; the
        fees, preparation prices and dates are in the option cards below and on
        the detail pages, so nothing moved into the hero.

        The section after it is white, so the ink hero does not run into a
        second dark band.
      */}
      <HeroSurface themeClassName="hero-theme-plain" archetype="A" breadcrumbs={breadcrumbs} className={`overflow-x-clip ${nightHero.night}`}>
        <div className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6">
          <HeroLede
            eyebrow={locale === 'de' ? 'Prüfungen' : 'Exams'}
            title={locale === 'de' ? 'Deine telc-Prüfung bei CASA' : 'Your telc exam at CASA'}
            description={
              locale === 'de'
                ? 'Du brauchst ein Deutschzertifikat für deinen nächsten Schritt? Bei uns kannst du telc Deutsch B2 und telc Deutsch C1 Hochschule ablegen und dich in einem Kurs darauf vorbereiten.'
                : 'Do you need a German certificate for your next step? You can take telc Deutsch B2 and telc Deutsch C1 Hochschule with us, and prepare for them in one of our courses.'
            }
            ctas={pageConfig.ctas.slice(0, 1)}
            className="lg:py-6"
          />
          {examSeals ? (
            <ExamsHeroVisual
              locale={locale}
              label={
                locale === 'de'
                  ? `Die Prüfungen bei CASA: ${examSeals.map((seal) => seal.name).join(' und ')}, jede mit einem schriftlichen und einem mündlichen Teil.`
                  : `The exams at CASA: ${examSeals.map((seal) => seal.name).join(' and ')}, each with a written and an oral part.`
              }
              // The registration form's split: Vollprüfung, nur schriftlich, nur mündlich.
              parts={locale === 'de' ? ['Schriftlich', 'Mündlich'] : ['Written', 'Oral']}
              exams={examSeals}
            />
          ) : null}
        </div>
      </HeroSurface>

      {/*
        BELOW THE HERO (2026-10-07): the two exams as fact cards, a learner's
        story, the three steps, the partners. The photo cards and the separate
        readiness checklist went. The checklist's five ticks were the cards'
        facts (which exam, what it costs) and the steps' advice (the deadline,
        time to prepare, a valid ID), so they are said there now, once.

        The legacy anchors #b2 and #c1 sit on the cards themselves;
        #exam-sessions, an older one, still lands on the section.
      */}
      <section id="exam-sessions" className="scroll-mt-28 bg-white py-16 md:py-20">
        <Container>
          <div className="casa-editorial-measure">
            <ExamOptionCards
              eyebrow={locale === 'de' ? 'Prüfungsoptionen' : 'Exam options'}
              title={locale === 'de' ? 'Unsere Prüfungen' : 'Our exams'}
              description={
                locale === 'de'
                  ? 'Wähl eine Prüfung aus, dann erfährst du mehr über Voraussetzungen, Ablauf und Anmeldung.'
                  : 'Choose an exam to see the requirements, what to expect and how to register.'
              }
              items={examOptions}
              linkLabel={locale === 'de' ? 'Mehr zur Prüfung' : 'More about the exam'}
            />
          </div>
        </Container>
      </section>

      {leadStory ? (
        <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
          <Container>
            <HumanStoryBlock
              eyebrow={locale === 'de' ? 'Eine Teilnehmerin erzählt' : 'One learner’s story'}
              title={locale === 'de' ? 'Mit mehr Sicherheit in die Prüfung' : 'Going into the exam with more confidence'}
              quote={leadStory.quote}
              person={leadStory.personDisplay}
              context={leadStory.country}
              photo={{
                src: pageConfig.photos.story.src,
                alt: pageConfig.photos.story.alt,
              }}
              supportingText={
                locale === 'de'
                  ? 'Wer die Aufgaben kennt und genug Zeit zum Üben hat, geht ruhiger in die Prüfung.'
                  : 'If you know the tasks and have had enough time to practise, you go into the exam feeling calmer.'
              }
              cta={{
                // The link opens the telc Deutsch B2 page, the exam Fatameh took.
                label: locale === 'de' ? 'Mehr zu telc Deutsch B2' : 'More about telc Deutsch B2',
                href: '/exams/b2',
              }}
              mediaSide="right"
            />
          </Container>
        </section>
      ) : null}

      <section className="py-16 md:py-20 bg-white border-t border-[color:var(--casa-sand)]/40">
        <Container>
          {/* Plain and without the panel's inset, so its heading lines up with „Unsere Prüfungen". */}
          <ProcessSteps
            tone="plain"
            className="px-0 md:px-0"
            eyebrow={locale === 'de' ? 'Ablauf' : 'How it works'}
            title={locale === 'de' ? 'So kommst du zur Prüfung' : 'Getting to exam day'}
            description={
              locale === 'de'
                ? 'Von der Anmeldung bis zum Prüfungstag sind es drei Schritte.'
                : 'There are three steps between registering and the exam itself.'
            }
            steps={[
              {
                step: '1',
                title: locale === 'de' ? 'Anmeldung' : 'Registration',
                description: locale === 'de' ? 'Such dir einen Prüfungstermin aus und melde dich vor dem Anmeldeschluss über unser Formular an.' : 'Choose an exam date and register using our form before the registration deadline.',
              },
              {
                step: '2',
                title: locale === 'de' ? 'Vorbereitung' : 'Preparation',
                description: locale === 'de' ? 'Plane genug Zeit ein und bereite dich in einem unserer Vorbereitungskurse oder allein auf die Aufgaben vor.' : 'Leave yourself enough time and prepare for the tasks in one of our preparation courses or on your own.',
              },
              {
                step: '3',
                title: locale === 'de' ? 'Prüfungstag' : 'Exam day',
                description: locale === 'de' ? 'Komm rechtzeitig zu uns in die Schule und bring deinen gültigen Ausweis und deine Anmeldebestätigung mit.' : 'Come to the school in good time and bring a valid ID and your registration confirmation.',
              },
            ]}
            cta={{ label: locale === 'de' ? 'Zur Prüfungsanmeldung' : 'Register for an exam', href: '/registration/exam' }}
          />
        </Container>
      </section>

      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <ProofBand
            locale={locale}
            title={locale === 'de' ? 'Vertrauen und Standards' : 'Trust and standards'}
            credibilityLine={
              locale === 'de'
                ? 'Wir arbeiten mit anerkannten Partnern zusammen und haben langjährige Erfahrung mit Prüfungen.'
                : 'We work with recognised partners and have many years of experience with exams.'
            }
          />
        </Container>
      </section>

    </main>
  );
}
