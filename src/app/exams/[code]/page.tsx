import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { HeroCUtilityRail } from '@/components/heroes';
import { DecisionRail, EditorialSplit, ProcessSteps, TestimonialGrid } from '@/components/sections';
import { ExamDayTimelineSignature } from '@/components/signatures';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getExamDetail, getSocialProof } from '@/lib/content/repository';
import { createPublicMetadata, toAbsoluteUrl } from '@/lib/seo';

type ExamDetailPageProps = {
  params: Promise<{ code: string }>;
  searchParams?: Promise<{ session?: string }>;
};

function formatDate(value: string, locale: 'en' | 'de') {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function getExamFeeDetails(code: string, locale: 'en' | 'de') {
  if (code === 'telc_b2') {
    return {
      full: locale === 'de' ? 'Vollprüfung 190 EUR' : 'Full exam EUR 190',
      partial: locale === 'de' ? 'Teilprüfung 160 EUR' : 'Partial repeat EUR 160',
      prep: locale === 'de' ? 'Vorbereitung 260 EUR' : 'Preparation EUR 260',
    };
  }

  if (code === 'telc_c1_hochschule') {
    return {
      full: locale === 'de' ? 'Vollprüfung 210 EUR' : 'Full exam EUR 210',
      partial: locale === 'de' ? 'Teilprüfung 185 EUR' : 'Partial repeat EUR 185',
      prep: locale === 'de' ? 'Vorbereitung 520 EUR' : 'Preparation EUR 520',
    };
  }

  return {
    full: locale === 'de' ? 'Gebühr wird bestätigt' : 'Fee confirmed by office',
    partial: locale === 'de' ? 'Nach Rücksprache' : 'After office confirmation',
    prep: locale === 'de' ? 'Nach Rücksprache' : 'After office confirmation',
  };
}

export async function generateMetadata({ params }: ExamDetailPageProps): Promise<Metadata> {
  const { code } = await params;
  const detail = await getExamDetail(code, 'en');

  if (!detail) {
    return createPublicMetadata({ title: 'Exam detail', description: 'CASA exam detail', path: `/exams/${code}` });
  }

  return createPublicMetadata({
    // createPublicMetadata already appends "| CASA Bremen"
    title: detail.examType.name,
    description: detail.narrative?.summary || 'CASA exam detail',
    path: `/exams/${code}`,
    keywords: [detail.examType.name, 'Exam day timeline', 'CASA exam support'],
  });
}

export default async function ExamDetailPage({ params, searchParams }: ExamDetailPageProps) {
  const locale = await getContentLocale();
  const { code } = await params;
  const { session } = searchParams ? await searchParams : { session: undefined };
  const rhythm = getLayoutRhythm('exam-detail');
  const pageConfig = getPublicPageConfig('exam-detail', locale);

  const [detail, socialProof] = await Promise.all([
    getExamDetail(code, locale),
    Promise.resolve(getSocialProof(locale)),
  ]);

  if (!detail) {
    notFound();
  }

  const requestedSessionId = typeof session === 'string' ? session : '';
  const selectedSession =
    detail.sessions.find((examSession) => examSession.id === requestedSessionId) ?? detail.sessions[0];
  const selectedSessionOptions = detail.sessions.map((examSession) => ({
    value: examSession.id,
    label: formatDate(examSession.starts_at, locale),
    href: `/exams/${encodeURIComponent(code)}?session=${encodeURIComponent(examSession.id)}`,
  }));

  const breadcrumbs = [
    { label: locale === 'de' ? 'Start' : 'Home', href: '/' },
    { label: locale === 'de' ? 'Prüfungen' : 'Exams', href: '/exams' },
    { label: detail.examType.name },
  ];

  const infoItems = [
    {
      label: locale === 'de' ? 'Nächster Termin' : 'Next date',
      value: selectedSession ? formatDate(selectedSession.starts_at, locale) : 'TBD',
      selector:
        selectedSessionOptions.length > 1 && selectedSession
          ? {
              selectedValue: selectedSession.id,
              options: selectedSessionOptions,
            }
          : undefined,
    },
    { label: locale === 'de' ? 'Niveau' : 'Level', value: detail.examType.level || '-' },
    { label: locale === 'de' ? 'Prüfungsgebühr' : 'Exam fee', value: getExamFeeDetails(detail.examType.code, locale).full },
    { label: locale === 'de' ? 'Vorbereitung' : 'Preparation', value: getExamFeeDetails(detail.examType.code, locale).prep },
    { label: locale === 'de' ? 'Teilprüfung' : 'Partial repeat', value: getExamFeeDetails(detail.examType.code, locale).partial },
    { label: locale === 'de' ? 'Ort' : 'Location', value: locale === 'de' ? 'CASA Bremen Prüfungszentrum' : 'CASA Bremen Exam Center' },
  ];

  const examRegistrationHref = selectedSession
    ? `/registration/exam?sessionId=${encodeURIComponent(selectedSession.id)}`
    : '/registration/exam';

  const testimonialPortraits = [
    pageConfig.photos.testimonialA,
    pageConfig.photos.testimonialB,
    pageConfig.photos.testimonialC,
  ];
  const testimonialCards = socialProof.map((story, index) => ({
    id: story.id,
    person: story.personDisplay,
    country: story.country,
    quote: story.quote,
    photoSrc: testimonialPortraits[index % testimonialPortraits.length].src,
    photoAlt: testimonialPortraits[index % testimonialPortraits.length].alt,
    photoCaption: '',
  }));

  const examSchema = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOccupationalCredential',
    name: detail.examType.name,
    description: detail.narrative?.summary || '',
    url: toAbsoluteUrl(`/exams/${code}`),
  };

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(examSchema) }} />

      <HeroCUtilityRail
        eyebrow={locale === 'de' ? 'Prüfungsdetail' : 'Exam detail'}
        title={detail.examType.name}
        description={detail.narrative?.summary || (locale === 'de' ? 'Klarer Ablauf bis zum Ergebnis.' : 'Clear process from registration to results.')}
        breadcrumbs={breadcrumbs}
        infoTitle={locale === 'de' ? 'Prüfungsinfos' : 'Exam info rail'}
        infoItems={infoItems}
        notes={locale === 'de' ? 'Sessiondaten und Fristen werden fortlaufend aktualisiert.' : 'Session dates and deadlines are updated continuously.'}
        ctas={pageConfig.ctas}
        photo={{
          ...pageConfig.photos.supportCard,
          caption: 'Exam preparation table scene - Structured exam practice and strategy.',
        }}
        themeClassName="hero-theme-exams"
      />

      <section className="py-16 md:py-20">
        <Container className="space-y-12 md:space-y-14">
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
            <div className="space-y-12 md:space-y-14">
              <ExamDayTimelineSignature
                title={locale === 'de' ? 'Ablauf und Unterlagen für den Prüfungstag' : 'Exam day timeline + what to bring'}
                description={
                  locale === 'de'
                    ? 'Von Registrierung bis Ergebnis mit klaren Vorbereitungsschritten.'
                    : 'From registration to results with clear preparation checkpoints.'
                }
                timeline={[
                  { label: '1', title: locale === 'de' ? 'Anmelden' : 'Register', description: locale === 'de' ? 'Session wählen und Daten bestätigen.' : 'Select session and confirm details.' },
                  { label: '2', title: locale === 'de' ? 'Vorbereiten' : 'Prepare', description: locale === 'de' ? 'Lernplan mit Fokus auf Schwächen.' : 'Prepare with a focused study plan.' },
                  { label: '3', title: locale === 'de' ? 'Prüfungstag' : 'Exam day', description: locale === 'de' ? 'Früh da sein, Dokumente bereithalten.' : 'Arrive early with required documents.' },
                  { label: '4', title: locale === 'de' ? 'Ergebnisse' : 'Results', description: locale === 'de' ? 'Nächste Lernschritte planen.' : 'Plan next steps after results.' },
                ]}
                bringItems={[
                  locale === 'de' ? 'Gültiger Ausweis' : 'Valid photo ID',
                  locale === 'de' ? 'Anmeldebestätigung' : 'Registration confirmation',
                  locale === 'de' ? 'Erlaubte Materialien gemäß Richtlinie' : 'Permitted materials per exam rules',
                ]}
              />

              <EditorialSplit
                eyebrow={locale === 'de' ? 'Qualität der Vorbereitung' : 'Preparation quality'}
                title={locale === 'de' ? 'Prüfungserfolg entsteht vor dem Prüfungstag' : 'Exam success is built before exam day'}
                description={
                  locale === 'de'
                    ? 'Strukturierte Vorbereitung reduziert Stress und verbessert Ergebnisse.'
                    : 'Structured preparation reduces stress and improves exam outcomes.'
                }
                bullets={[
                  locale === 'de' ? 'Realistische Zeitplanung bis zum Termin' : 'Realistic planning before session date',
                  locale === 'de' ? 'Fokus auf typische Aufgabenformate' : 'Practice focused on exam task types',
                  locale === 'de' ? 'Klare Checkliste für den Prüfungstag' : 'Clear checklist for exam-day readiness',
                ]}
                photo={{
                  ...pageConfig.photos.supportCard,
                  caption: 'Teacher giving feedback during speaking exercise - Personal feedback in small groups.',
                }}
              />

              <ProcessSteps
                eyebrow={locale === 'de' ? 'Nächste Aktion' : 'Action path'}
                title={locale === 'de' ? 'Nächster Schritt für Kandidat:innen' : 'Next step for candidates'}
                description={
                  locale === 'de'
                    ? 'Wenn Sie bereit sind, wechseln Sie direkt in die Anmeldung.'
                    : 'If you are ready, continue directly to registration.'
                }
                steps={[
                  { step: locale === 'de' ? '1' : '1', title: locale === 'de' ? 'Termin wählen' : 'Choose session', description: locale === 'de' ? 'Passendes Datum auswählen.' : 'Select the right date.' },
                  { step: locale === 'de' ? '2' : '2', title: locale === 'de' ? 'Daten bestätigen' : 'Confirm details', description: locale === 'de' ? 'Kandidatenangaben prüfen.' : 'Confirm candidate information.' },
                  { step: locale === 'de' ? '3' : '3', title: locale === 'de' ? 'Absenden' : 'Submit', description: locale === 'de' ? 'Anmeldung finalisieren.' : 'Complete registration.' },
                ]}
              />

              <TestimonialGrid
                title={locale === 'de' ? 'Erfahrungen aus der Prüfungsvorbereitung' : 'Stories from exam preparation'}
                description={
                  locale === 'de'
                    ? 'Wie Kandidat:innen den Weg bis zum Abschluss erleben.'
                    : 'How candidates experience the path toward certification.'
                }
                cards={testimonialCards}
                locale={locale}
              />

              <Link
                href="/exams"
                className="inline-flex rounded-lg border border-[color:var(--casa-sand)] px-4 py-2 text-sm font-semibold text-[var(--casa-ink)] hover:bg-[var(--casa-warm-soft)]"
              >
                {locale === 'de' ? 'Zurück zu allen Prüfungen' : 'Back to all exams'}
              </Link>
            </div>

            <DecisionRail
              locale={locale}
              infoTitle={locale === 'de' ? 'Ihre Entscheidung' : 'Your decision rail'}
              infoItems={infoItems}
              notes={
                locale === 'de'
                  ? 'Behalten Sie Termin, Frist und Anmeldung im Blick, während Sie die Details lesen.'
                  : 'Keep date, deadline, and registration action visible while reading details.'
              }
              ctas={[
                {
                  label: locale === 'de' ? 'Jetzt Prüfung anmelden' : 'Register exam now',
                  href: examRegistrationHref,
                  kind: 'primary',
                },
                {
                  label: locale === 'de' ? 'Prüfungsberatung' : 'Exam guidance',
                  href: '/contact?topic=Exam registration',
                  kind: 'secondary',
                },
              ]}
              deadlineIso={selectedSession?.registration_deadline}
            />
          </div>
        </Container>
      </section>
    </main>
  );
}
