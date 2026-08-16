import type { Metadata } from 'next';

import { HeroCUtilityRail } from '@/components/heroes';
import {
  ComparisonModule,
  GuidedPicker,
  HumanStoryBlock,
  ProcessSteps,
  ProofBand,
  SavedCompareTray,
} from '@/components/sections';
import { ExamsReadinessCheck } from '@/components/signatures';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { shouldShowDraftClaims } from '@/lib/content/locale';
import { getContentLocale } from '@/lib/content/locale.server';
import { getExamCatalog, getProofMetrics, getSocialProof } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';
import { cn } from '@/lib/utils';

export const metadata: Metadata = createPublicMetadata({
  title: 'Exams',
  description: 'Compare CASA exam pathways, review readiness criteria, and register with confidence.',
  path: '/exams',
  keywords: ['CASA exams', 'telc Deutsch B2', 'telc Deutsch C1 Hochschule'],
});

function examFeeSummary(code: string, locale: 'en' | 'de') {
  if (code === 'telc_b2') {
    return locale === 'de' ? 'Vollprüfung 190 EUR, Vorbereitung 260 EUR' : 'Full exam EUR 190, prep EUR 260';
  }
  if (code === 'telc_c1_hochschule') {
    return locale === 'de' ? 'Vollprüfung 210 EUR, Vorbereitung 520 EUR' : 'Full exam EUR 210, prep EUR 520';
  }
  return locale === 'de' ? 'Gebühr wird bestätigt' : 'Fee confirmed by office';
}

function examDetailHref(code: string, anchorId: string) {
  if (code === 'telc_b2') return '/exams/b2';
  if (code === 'telc_c1_hochschule') return '/exams/c1';
  return `/exams/${anchorId}`;
}

function deadlineClosed(deadline?: string | null) {
  if (!deadline) {
    return false;
  }

  return new Date(deadline).getTime() < Date.now();
}

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ compare?: string }>;
}) {
  const locale = await getContentLocale();
  const { compare } = await searchParams;
  const rhythm = getLayoutRhythm('exams-index');
  const pageConfig = getPublicPageConfig('exams', locale);
  const showDraftClaims = shouldShowDraftClaims();

  const [catalog, proofMetrics, stories] = await Promise.all([
    getExamCatalog(locale),
    Promise.resolve(getProofMetrics(locale)),
    Promise.resolve(getSocialProof(locale)),
  ]);
  const leadStory = stories[0];

  const examItems = catalog.items.slice(0, 4).map((item) => {
    const nextSession = item.sessions[0];
    const hasClosedDeadline = deadlineClosed(nextSession?.registration_deadline);

    return {
      id: item.examType.id,
      title: item.examType.name,
      description:
        item.narrative?.summary ||
        (locale === 'de' ? 'Anerkannte Prüfungsroute mit klaren Fristen.' : 'Recognized exam pathway with clear deadlines.'),
      bestFor: item.examType.level || (locale === 'de' ? 'Geeignet für CEFR-Fortschritt' : 'Best for: CEFR progression'),
      href: examDetailHref(item.examType.code, item.anchorId),
      ctaLabel: hasClosedDeadline
        ? locale === 'de'
          ? 'Warteliste'
          : 'Join waitlist'
        : locale === 'de'
          ? 'Zur Prüfungsanmeldung'
          : 'Reserve exam seat',
      meta: examFeeSummary(item.examType.code, locale),
      deadlineIso: nextSession?.registration_deadline ?? null,
      compare: {
        id: item.examType.id,
        title: item.examType.name,
        href: examDetailHref(item.examType.code, item.anchorId),
        meta: item.examType.level || undefined,
      },
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

  const proofStats = proofMetrics
    .filter((metric) => showDraftClaims || metric.verificationStatus === 'verified')
    .slice(0, 3)
    .map((metric) => ({ value: metric.value, label: metric.label }));
  const heroProofStats = proofStats.filter((item) => !item.value.includes('1983'));

  const breadcrumbs = [
    { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
    { label: locale === 'de' ? 'Prüfungen' : 'Exams' },
  ];

  const compareIds = compare ? compare.split(',').map((value) => decodeURIComponent(value)) : [];
  const compareExams = catalog.items.filter((entry) => compareIds.includes(entry.examType.id)).slice(0, 2);

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      <HeroCUtilityRail
        eyebrow={locale === 'de' ? 'Prüfungen' : 'Exams'}
        title={locale === 'de' ? 'Prüfungswege mit klarer Orientierung' : 'Exam pathways with clear orientation'}
        description={
          locale === 'de'
            ? 'Vergleichen Sie telc Deutsch B2 und telc Deutsch C1 Hochschule, bereiten Sie sich gezielt vor und registrieren Sie rechtzeitig.'
            : 'Compare telc Deutsch B2 and telc Deutsch C1 Hochschule, prepare with structure, and register on time.'
        }
        breadcrumbs={breadcrumbs}
        infoTitle={locale === 'de' ? 'Prüfungen kurz gefasst' : 'Exam quick facts'}
        infoItems={[
          { label: locale === 'de' ? 'Niveaus' : 'Levels', value: 'B2 / C1' },
          { label: locale === 'de' ? 'Termine' : 'Sessions', value: locale === 'de' ? 'Nach Prüfungsplan 2026' : 'Published 2026 exam dates' },
          { label: locale === 'de' ? 'Preis ab' : 'Price from', value: '190 EUR' },
          { label: locale === 'de' ? 'Vorbereitung' : 'Preparation', value: locale === 'de' ? 'B2 260 EUR / C1 520 EUR' : 'B2 EUR 260 / C1 EUR 520' },
          {
            label: locale === 'de' ? 'Nächster Schritt' : 'Next step',
            value: locale === 'de' ? 'Termin prüfen / anmelden' : 'Check date / reserve seat',
          },
        ]}
        notes={locale === 'de' ? 'Termine und Fristen werden vom CASA Prüfungsbüro bestätigt.' : 'Dates and deadlines are confirmed by the CASA exam office.'}
        ctas={pageConfig.ctas}
        photo={{
          ...pageConfig.photos.thumbA,
          caption: 'Exam preparation table scene - Structured exam practice and strategy.',
        }}
        proofItems={heroProofStats}
        themeClassName="hero-theme-exams"
      />

      <div id="b2" className="scroll-mt-28" />
      <div id="c1" className="scroll-mt-28" />

      <div id="exam-sessions" className="scroll-mt-28" />

      {/* Section 1: Options Shortlist */}
      <section className="py-16 md:py-20 bg-white">
        <Container>
          <GuidedPicker
            eyebrow={locale === 'de' ? 'Prüfungsoptionen' : 'Exam shortlist'}
            title={locale === 'de' ? 'Primäre Prüfungsoptionen' : 'Primary exam options'}
            description={
              locale === 'de'
                ? 'Starten Sie mit den wichtigsten Zertifikaten und wechseln Sie dann in den Detailweg.'
                : 'Start with core certifications, then move into the detail pathway.'
            }
            items={examItems}
            locale={locale}
            compareType="exam"
          />
        </Container>
      </section>

      {/* Section 2: Readiness Check */}
      <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-[var(--casa-surface-wash)]/30">
        <Container>
          <ExamsReadinessCheck
            title={locale === 'de' ? 'Prüfungsreife selbst prüfen' : 'Exam readiness self-check'}
            description={
              locale === 'de'
                ? 'Interaktive Checkliste für Anmeldung, Vorbereitung und Dokumente.'
                : 'Interactive checklist for registration, preparation, and required documents.'
            }
            checklist={[
              locale === 'de' ? 'Prüfungstyp ist klar definiert' : 'I have selected the right exam type',
              locale === 'de' ? 'Registrierungsfrist ist eingeplant' : 'I have noted the registration deadline',
              locale === 'de' ? 'Vorbereitungskalender ist erstellt' : 'I have a preparation plan',
              locale === 'de' ? 'Prüfungs- und Vorbereitungskosten sind geklärt' : 'I have checked exam and preparation fees',
              locale === 'de' ? 'Ausweisdokument ist gültig' : 'My identification is valid',
            ]}
          />
        </Container>
      </section>

      {/* Section 3: Story */}
      {leadStory ? (
        <section className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-white">
          <Container>
            <HumanStoryBlock
              eyebrow={locale === 'de' ? 'Kandidatenstimme' : 'Candidate story'}
              title={locale === 'de' ? 'Prüfungserfolg entsteht durch ruhige Vorbereitung' : 'Exam confidence comes from calm preparation'}
              quote={leadStory.quote}
              person={leadStory.personDisplay}
              context={leadStory.country}
              photo={{
                src: pageConfig.photos.thumbA.src,
                alt: pageConfig.photos.thumbA.alt,
              }}
              supportingText={
                locale === 'de'
                  ? 'Kandidatinnen und Kandidaten profitieren von klaren Fristen, Struktur und persönlicher Begleitung.'
                  : 'Candidates progress faster when deadlines, preparation rhythm, and support stay clear.'
              }
              cta={{
                label: locale === 'de' ? 'Prüfungsdetails ansehen' : 'Explore exam details',
                href: '/exams/b2',
              }}
              mediaSide="right"
            />
          </Container>
        </section>
      ) : null}

      {/* Section 4: Comparison (Conditional) */}
      {compareExams.length >= 2 ? (
        <section id="exam-compare-section" className="py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40 bg-[var(--casa-surface-wash)]/30 scroll-mt-28">
          <Container>
            <ComparisonModule
              eyebrow={locale === 'de' ? 'Gespeicherter Vergleich' : 'Saved compare'}
              title={locale === 'de' ? 'Ihre ausgewählten Prüfungen' : 'Your selected exams'}
              description={
                locale === 'de'
                  ? 'Vergleich der wichtigsten Registrierungsfaktoren.'
                  : 'Compare key registration factors side by side.'
              }
              leftTitle={compareExams[0].examType.name}
              rightTitle={compareExams[1].examType.name}
              rows={[
                {
                  label: locale === 'de' ? 'Level' : 'Level',
                  left: compareExams[0].examType.level || '-',
                  right: compareExams[1].examType.level || '-',
                },
                {
                  label: locale === 'de' ? 'Preis ab' : 'Price from',
                  left: `${compareExams[0].examType.default_fee} ${compareExams[0].examType.currency}`,
                  right: `${compareExams[1].examType.default_fee} ${compareExams[1].examType.currency}`,
                },
                {
                  label: locale === 'de' ? 'Nächste Session' : 'Next session',
                  left: compareExams[0].sessions[0]?.starts_at
                    ? new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'medium' }).format(new Date(compareExams[0].sessions[0].starts_at))
                    : locale === 'de' ? 'Wird bestätigt' : 'TBD',
                  right: compareExams[1].sessions[0]?.starts_at
                    ? new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'medium' }).format(new Date(compareExams[1].sessions[0].starts_at))
                    : locale === 'de' ? 'Wird bestätigt' : 'TBD',
                },
                {
                  label: locale === 'de' ? 'Anmeldefrist' : 'Registration deadline',
                  left: compareExams[0].sessions[0]?.registration_deadline
                    ? new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'medium' }).format(new Date(compareExams[0].sessions[0].registration_deadline as string))
                    : locale === 'de' ? 'Wird bestätigt' : 'TBD',
                  right: compareExams[1].sessions[0]?.registration_deadline
                    ? new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'medium' }).format(new Date(compareExams[1].sessions[0].registration_deadline as string))
                    : locale === 'de' ? 'Wird bestätigt' : 'TBD',
                },
                {
                  label: locale === 'de' ? 'Nächster Schritt' : 'Next step',
                  left: locale === 'de' ? 'Termine prüfen und anmelden' : 'Check dates and register',
                  right: locale === 'de' ? 'Termine prüfen und anmelden' : 'Check dates and register',
                },
              ]}
            />
          </Container>
        </section>
      ) : null}

      {/* Section 5: Steps */}
      <section className={cn(
        "py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40",
        compareExams.length >= 2 ? "bg-white" : "bg-[var(--casa-surface-wash)]/30"
      )}>
        <Container>
          <ProcessSteps
            eyebrow={locale === 'de' ? 'Vorbereitungsweg' : 'Preparation pathway'}
            title={locale === 'de' ? 'Anmelden – Vorbereiten – Prüfung ablegen' : 'Register → Prepare → Sit exam'}
            description={
              locale === 'de'
                ? 'Ein konsistenter Ablauf für bessere Performance am Prüfungstag.'
                : 'A consistent sequence for stronger exam-day performance.'
            }
            steps={[
              {
                step: locale === 'de' ? '1' : '1',
                title: locale === 'de' ? 'Registrierung' : 'Registration',
                description: locale === 'de' ? 'Session auswählen und Daten bestätigen.' : 'Select session and confirm candidate details.',
              },
              {
                step: locale === 'de' ? '2' : '2',
                title: locale === 'de' ? 'Vorbereitung' : 'Preparation',
                description: locale === 'de' ? 'Lernplan mit Fokus auf Schwächen erstellen.' : 'Build a focused prep plan around weak areas.',
              },
              {
                step: locale === 'de' ? '3' : '3',
                title: locale === 'de' ? 'Prüfungstag' : 'Exam day',
                description: locale === 'de' ? 'Dokumente bereit und frühzeitig vor Ort.' : 'Bring documents and arrive early.',
              },
            ]}
          />
        </Container>
      </section>

      {/* Section 6: Proof Band */}
      <section className={cn(
        "py-16 md:py-20 border-t border-[color:var(--casa-sand)]/40",
        compareExams.length >= 2 ? "bg-[var(--casa-surface-wash)]/30" : "bg-white"
      )}>
        <Container>
          <ProofBand
            locale={locale}
            title={locale === 'de' ? 'Vertrauen und Standards' : 'Trust and standards'}
            credibilityLine={
              locale === 'de'
                ? 'Anerkannte Partner plus langjährige Erfahrung in Prüfungsbegleitung.'
                : 'Recognized partners plus long-standing exam support experience.'
            }
          />
        </Container>
      </section>

      <SavedCompareTray type="exam" locale={locale} comparePath="/exams" />
    </main>
  );
}
