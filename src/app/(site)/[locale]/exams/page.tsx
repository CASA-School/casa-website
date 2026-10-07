import type { Metadata } from 'next';

import { HeroAPhotoLed } from '@/components/heroes';
import {
  GuidedPicker,
  HumanStoryBlock,
  ProcessSteps,
  ProofBand,
} from '@/components/sections';
import { ExamsReadinessCheck } from '@/components/signatures';
import { Container } from '@/components/ui/container';
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

// German pages write "190 €", English "€190" (brief 2026-10-02), as the course pages do.
function examFeeSummary(code: string, locale: 'en' | 'de') {
  if (code === 'telc_b2') {
    return locale === 'de' ? 'Vollprüfung 190\u00a0€, Vorbereitung 260\u00a0€' : 'Full exam €190, preparation €260';
  }
  if (code === 'telc_c1_hochschule') {
    return locale === 'de' ? 'Vollprüfung 210\u00a0€, Vorbereitung 520\u00a0€' : 'Full exam €210, preparation €520';
  }
  return locale === 'de' ? 'Gebühr wird bestätigt' : 'Fee to be confirmed';
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

  const examItems = catalog.items.slice(0, 4).map((item) => {
    // getExamCatalog holds only sittings still open for registration, so
    // there is no closed-deadline state to label here.
    const nextSession = item.sessions[0];

    return {
      id: item.examType.id,
      title: item.examType.name,
      description:
        item.narrative?.summary ||
        (locale === 'de' ? 'Eine anerkannte Prüfung mit festen Terminen und Anmeldefristen.' : 'A recognised exam with fixed dates and registration deadlines.'),
      bestFor: item.examType.level || (locale === 'de' ? 'Für deinen nächsten Schritt' : 'For your next step'),
      href: examDetailHref(item.examType.code, item.anchorId),
      // The card opens the exam's own page, so the label says so.
      ctaLabel: locale === 'de' ? 'Mehr zur Prüfung' : 'More about the exam',
      meta: examFeeSummary(item.examType.code, locale),
      deadlineIso: nextSession?.registration_deadline ?? null,
      media: {
        src:
          item.examType.code === 'telc_b2'
            ? pageConfig.photos.thumbA.src
            : item.examType.code === 'telc_c1_hochschule'
              ? pageConfig.photos.thumbB.src
              : pageConfig.photos.thumbC.src,
        alt: item.examType.name,
      },
    };
  });

  const breadcrumbs = [
    { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
    { label: locale === 'de' ? 'Prüfungen' : 'Exams' },
  ];

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      {/*
        THE SITE'S STANDARD HERO. This was HeroCUtilityRail — the course/exam
        DETAIL hero, with a bordered "Exam quick facts" card on the right. On a
        detail page that card is right: the reader has already chosen the exam
        and wants its four numbers. On this index the reader has not chosen yet,
        and a card of aggregate figures answered a question nobody had arrived
        with while making the index look like one more detail page.

        The card's five rows are not relocated into the hero. Levels, fees,
        preparation prices and session dates are all still on this page — the
        option cards below carry the per-exam fee, and the detail pages carry
        the rest — and the fifth row restated the button anyway ("Next step /
        check date, reserve seat").

        `thumbC` (learners writing in class), not `thumbA`. thumbA is the
        close-up of exam notes that the telc B2 option card renders below; a
        detail crop that small also has nothing left to read once the bleed
        mask dissolves a third of its width.
      */}
      <HeroAPhotoLed
        eyebrow={locale === 'de' ? 'Prüfungen' : 'Exams'}
        title={locale === 'de' ? 'Deine telc-Prüfung bei CASA' : 'Your telc exam at CASA'}
        description={
          locale === 'de'
            ? 'Du brauchst ein Deutschzertifikat für deinen nächsten Schritt? Bei uns kannst du telc Deutsch B2 und telc Deutsch C1 Hochschule ablegen und dich in einem Kurs darauf vorbereiten.'
            : 'Do you need a German certificate for your next step? You can take telc Deutsch B2 and telc Deutsch C1 Hochschule with us, and prepare for them in one of our courses.'
        }
        breadcrumbs={breadcrumbs}
        ctas={pageConfig.ctas.slice(0, 1)}
        photo={pageConfig.photos.thumbC}
      />

      <div id="b2" className="scroll-mt-28" />
      <div id="c1" className="scroll-mt-28" />

      <div id="exam-sessions" className="scroll-mt-28" />

      {/* Section 1: Options Shortlist */}
      <section className="py-16 md:py-20 bg-white">
        <Container>
          <GuidedPicker
            eyebrow={locale === 'de' ? 'Prüfungsoptionen' : 'Exam options'}
            title={locale === 'de' ? 'Unsere Prüfungen' : 'Our exams'}
            description={
              locale === 'de'
                ? 'Wähl eine Prüfung aus, dann erfährst du mehr über Voraussetzungen, Ablauf und Anmeldung.'
                : 'Choose an exam to see the requirements, what to expect and how to register.'
            }
            items={examItems}
            locale={locale}
          />
        </Container>
      </section>

      {/* Section 2: Readiness Check */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <ExamsReadinessCheck
            locale={locale}
            title={locale === 'de' ? 'Bereit für die Prüfung?' : 'Ready for the exam?'}
            description={
              locale === 'de'
                ? 'Mit dieser Liste prüfst du, ob du an alles gedacht hast.'
                : 'Use this list to check that you have thought of everything.'
            }
            checklist={[
              locale === 'de' ? 'Ich weiß, welche Prüfung ich brauche.' : 'I know which exam I need.',
              locale === 'de' ? 'Ich kenne die Anmeldefrist.' : 'I know the registration deadline.',
              locale === 'de' ? 'Ich habe Zeit für die Vorbereitung eingeplant.' : 'I have set aside time to prepare.',
              locale === 'de' ? 'Ich kenne die Kosten für Prüfung und Vorbereitung.' : 'I know what the exam and the preparation cost.',
              locale === 'de' ? 'Mein Ausweis ist gültig.' : 'My ID is valid.',
            ]}
          />
        </Container>
      </section>

      {/* Section 3: Story */}
      {leadStory ? (
        <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-white">
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

      {/* Section 5: Steps */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40">
        <Container>
          <ProcessSteps
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
                description: locale === 'de' ? 'Such dir einen Prüfungstermin aus und gib im Formular deine Daten an.' : 'Choose an exam date and enter your details in the form.',
              },
              {
                step: '2',
                title: locale === 'de' ? 'Vorbereitung' : 'Preparation',
                description: locale === 'de' ? 'Bereite dich in einem unserer Vorbereitungskurse oder allein gezielt auf die Aufgaben vor.' : 'Prepare for the exam tasks in one of our preparation courses or on your own.',
              },
              {
                step: '3',
                title: locale === 'de' ? 'Prüfungstag' : 'Exam day',
                description: locale === 'de' ? 'Komm rechtzeitig zu uns in die Schule und bring deinen Ausweis und deine Anmeldebestätigung mit.' : 'Come to the school in good time and bring your ID and your registration confirmation.',
              },
            ]}
          />
        </Container>
      </section>

      {/* Section 6: Proof Band */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-white">
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
