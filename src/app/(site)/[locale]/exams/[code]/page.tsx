import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';

import { HeroCUtilityRail } from '@/components/heroes';
import { DecisionRail, EditorialSplit, ProcessSteps } from '@/components/sections';
import { serializeJsonLd } from '@/components/seo/json-ld';
import { ExamDayTimelineSignature } from '@/components/signatures';
import { Container } from '@/components/ui/container';
import { getLayoutRhythm } from '@/config/layout-rhythm';
import { getPublicPageConfig } from '@/config/public-page-config';
import { getContentLocale } from '@/lib/content/locale.server';
import { getExamDetail } from '@/lib/content/repository';
import { createPublicMetadata, toAbsoluteUrl } from '@/lib/seo';
import { getCasaContact } from '@/config/content/contacts';
import { getExamFees } from '@/config/content/exam-fees';
import { nextPreparationCourses, preparationCoursesSentence } from '@/config/content/exam-preparation-courses';
import { bremenDate } from '@/lib/appointments/schedule';

type ExamDetailPageProps = {
  params: Promise<{ code: string }>;
  searchParams?: Promise<{ session?: string }>;
};

function formatDate(value: string, locale: 'en' | 'de') {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  }).format(new Date(value));
}


export async function generateMetadata({ params }: ExamDetailPageProps): Promise<Metadata> {
  const locale = await getContentLocale();
  const { code } = await params;
  const detail = await getExamDetail(code, locale);

  // A missing exam 404s from here, so no canonical is emitted for it.
  if (!detail) {
    notFound();
  }

  return createPublicMetadata({
    locale,
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

  const detail = await getExamDetail(code, locale);

  if (!detail) {
    notFound();
  }

  // Each exam has its own photographs (2026-10-02): a 4:3 crop for phones, a
  // 2.4:1 crop for the hero band from lg up, and a different second photo.
  const examPhotoKey = detail.examType.code === 'telc_c1_hochschule' ? 'c1' : detail.examType.code === 'telc_b2' ? 'b2' : null;
  const examPhoto = (examPhotoKey && pageConfig.photos[examPhotoKey]) || pageConfig.photos.supportCard;
  const examHeroPhoto = examPhotoKey ? pageConfig.photos[`${examPhotoKey}Hero`] : undefined;
  const examStoryPhoto = (examPhotoKey && pageConfig.photos[`${examPhotoKey}Story`]) || pageConfig.photos.supportCard;

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

  const nextDateLabel = locale === 'de' ? 'Nächster Termin' : 'Next date';
  const levelLabel = locale === 'de' ? 'Niveau' : 'Level';

  const infoItems = [
    {
      label: nextDateLabel,
      value: selectedSession
        ? formatDate(selectedSession.starts_at, locale)
        : locale === 'de'
          ? 'Wird bekannt gegeben'
          : 'To be announced',
      selector:
        selectedSessionOptions.length > 1 && selectedSession
          ? {
              selectedValue: selectedSession.id,
              options: selectedSessionOptions,
            }
          : undefined,
    },
    { label: levelLabel, value: detail.examType.level || '-' },
    { label: locale === 'de' ? 'Prüfungsgebühr' : 'Exam fee', value: getExamFees(detail.examType.code, locale).full },
    { label: locale === 'de' ? 'Vorbereitung' : 'Preparation', value: getExamFees(detail.examType.code, locale).prep },
    { label: locale === 'de' ? 'Teilprüfung' : 'Partial exam', value: getExamFees(detail.examType.code, locale).partial },
    /*
      NO LOCATION ROW. It read "CASA Bremen Exam Center", which is the same
      building for every exam CASA runs — a constant cannot inform a choice, and
      it was a row of card height on a hero that did not fit a 768px viewport.

      The three fee rows above DO stay, unlike the four prices on the
      accommodation card: those are itemised further down their page, and these
      are not published anywhere else on this one. Trimming this card further
      needs a fees section in the page body first.
    */
  ];

  /*
   * THE DECISION ROWS, NOT EVERY ROW.
   *
   * `infoItems` above has six: next date, level, exam fee, preparation, partial
   * repeat, location. That is right for the hero card, which is where the
   * decision is offered and where a candidate is comparing. It was wrong for the
   * sticky card further down, which was rendering the identical six — so all
   * three fee figures appeared twice on one page, and the card a reader scrolls
   * back to for "when is it" was mostly a price list.
   *
   * /courses/[slug] has always drawn this distinction (`decisionItems` there is
   * a two-row subset of the same source); the exam page simply never did. Date
   * and level are what carry the decision at the moment of acting — the fees
   * stay in the hero card and the location is the same building for every exam
   * CASA runs, so it decides nothing.
   */
  const decisionItems = infoItems.filter((item) => item.label === nextDateLabel || item.label === levelLabel);

  const examRegistrationHref = selectedSession
    ? `/registration/exam?sessionId=${encodeURIComponent(selectedSession.id)}`
    : '/registration/exam';

  /*
   * What the old casa-bremen.de exam pages explained and the move lost, brought
   * back 2026-10-07 in German: the exam day and its hours, when results arrive,
   * who telc C1 Hochschule is for (the narrative), what its preparation course
   * covers and requires, and that the exam can be taken without the course.
   * Facts come from those pages, the FAQ and docs/COURSE_FACTS_SOURCE_OF_TRUTH.md;
   * the dates themselves come from the catalogue and are never written here. An
   * exam CASA has published nothing about (TestDaF) gets the general lines. The
   * English lines below each German one say the same.
   */
  const isB2 = detail.examType.code === 'telc_b2';
  const isC1 = detail.examType.code === 'telc_c1_hochschule';
  const examDayDe = isB2
    ? 'Die Prüfung findet bei uns in der Schule statt und dauert etwa von 9 bis 17 Uhr. Komm rechtzeitig und bring deine Unterlagen mit.'
    : isC1
      ? 'Die Prüfung ist immer an einem Freitag und dauert etwa von 8:30 bis 17 Uhr. Komm rechtzeitig und bring deine Unterlagen mit.'
      : 'Komm rechtzeitig und bring deine Unterlagen mit.';
  const examDayEn = isB2
    ? 'The exam takes place here at the school and runs from about 09:00 to 17:00. Arrive in good time and bring your documents with you.'
    : isC1
      ? 'The exam is always on a Friday and runs from about 08:30 to 17:00. Arrive in good time and bring your documents with you.'
      : 'Arrive in good time and bring your documents with you.';
  // The next preparation courses from FileMaker, as casa-bremen.de listed them on its C1 page.
  const nextPreparation = nextPreparationCourses(isC1 ? 'telc_c1_hochschule' : 'telc_b2', bremenDate());
  const nextPreparationDe = [preparationCoursesSentence(nextPreparation, 'de')].filter((line): line is string => Boolean(line));
  const nextPreparationEn = [preparationCoursesSentence(nextPreparation, 'en')].filter((line): line is string => Boolean(line));
  const preparationDe = isC1
    ? {
        title: 'Der Vorbereitungskurs',
        description:
          'Bei uns kannst du telc Deutsch C1 Hochschule ablegen und dich in einem vierwöchigen Kurs darauf vorbereiten. Du kannst die Prüfung auch ohne den Kurs machen, wir empfehlen dir aber, beides zusammen zu belegen.',
        bullets: [
          ...nextPreparationDe,
          'Im Kurs lernst du die formalen Anforderungen der Prüfung kennen und übst mit Original-Prüfungsaufgaben von telc.',
          'Gemeinsam entwickeln wir Strategien für die Aufgaben. Wir üben Hören, Lesen, Schreiben und Sprechen, vor allem aber Schreiben und Sprechen.',
          'Du solltest einen C1-Kurs erfolgreich abgeschlossen haben, denn Wortschatz, Redemittel und Grammatik der C1 sind nicht Inhalt des Kurses. Alternativ kannst du bei uns vor Ort einen Einstufungstest machen.',
          'Eine Garantie, die Prüfung zu bestehen, kann dir der Kurs nicht geben.',
          'Wenn du dich zum ersten Mal an unserer Schule anmeldest, kommt eine einmalige Einschreibegebühr von 50 € dazu.',
        ],
      }
    : isB2
      ? {
          title: 'Der Vorbereitungskurs',
          description: 'Unser Vorbereitungskurs für telc Deutsch B2 läuft einen Monat lang an zwei Abenden pro Woche.',
          bullets: [
          ...nextPreparationDe,
            'Die Vorbereitung gehört nicht zu den Intensivkursen. Wenn du das Zertifikat brauchst, buchst du sie zusätzlich.',
            'Plane genug Zeit bis zum Prüfungstermin ein, damit du in Ruhe üben kannst.',
          ],
        }
      : {
          title: 'Gut vorbereitet in die Prüfung',
          description: 'Wer die Aufgaben kennt und genug Zeit zum Üben hat, geht ruhiger in die Prüfung.',
          bullets: [
            'Plane genug Zeit bis zum Prüfungstermin ein.',
            'Übe mit den typischen Aufgaben der Prüfung.',
            'Geh vor dem Prüfungstag die Liste der Unterlagen durch.',
          ],
        };
  const preparationEn = isC1
    ? {
        title: 'The preparation course',
        description:
          'You can take telc Deutsch C1 Hochschule with us and prepare for it in a four-week course. You can also take the exam without the course, but we recommend doing both.',
        bullets: [
          ...nextPreparationEn,
          'In the course you get to know the formal requirements of the exam and practise with original telc exam tasks.',
          'Together we work out strategies for the tasks. We practise listening, reading, writing and speaking, but above all writing and speaking.',
          'You should have successfully completed a C1 course, because C1 vocabulary, phrases and grammar are not taught in this course. Alternatively, you can take a placement test with us at the school.',
          'The course cannot guarantee that you will pass the exam.',
          'If this is your first time registering at our school, there is also a one-off enrolment fee of €50.',
        ],
      }
    : isB2
      ? {
          title: 'The preparation course',
          description: 'Our preparation course for telc Deutsch B2 runs for one month, on two evenings a week.',
          bullets: [
          ...nextPreparationEn,
            'Preparation is not part of the intensive courses. If you need the certificate, you book it separately.',
            'Leave yourself enough time before the exam date, so that you can practise without rushing.',
          ],
        }
      : {
          title: 'Well prepared for the exam',
          description: 'If you know the tasks and have had enough time to practise, you go into the exam feeling calmer.',
          bullets: [
            'Leave yourself enough time before the exam date.',
            'Practise with the typical exam tasks.',
            'Go through the list of documents before the exam day.',
          ],
        };

  const examSchema = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOccupationalCredential',
    name: detail.examType.name,
    description: detail.narrative?.summary || '',
    url: toAbsoluteUrl(`/exams/${code}`),
  };

  return (
    <main className="bg-[var(--casa-canvas)] text-[var(--casa-ink)]" data-rhythm={rhythm.hero}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(examSchema) }} />

      <HeroCUtilityRail
        eyebrow={locale === 'de' ? 'Prüfungsdetail' : 'Exam detail'}
        title={detail.examType.name}
        description={detail.narrative?.summary || (locale === 'de' ? 'Von der Anmeldung bis zum Ergebnis begleiten wir dich.' : 'We support you from registration through to your result.')}
        breadcrumbs={breadcrumbs}
        /* Not "Exam info rail" — "rail" is our word for the component, not a
           thing a visitor has a name for. The German string never said it. */
        infoTitle={locale === 'de' ? 'Prüfungsinfos' : 'Exam info'}
        infoItems={infoItems}
        notes={locale === 'de' ? 'Prüfungstermine und Anmeldefristen halten wir hier aktuell.' : 'We keep the exam dates and registration deadlines here up to date.'}
        /*
         * The hero primary carries the session id.
         *
         * The body rail used to render its own duplicate pair of CTAs, and only
         * that copy was session-aware — `pageConfig.ctas` points at a bare
         * /registration/exam. Dropping the duplicate would have quietly dropped
         * the prefill with it, so the session-aware href moves up here and the
         * page keeps one registration CTA that still knows which sitting the
         * reader was looking at.
         */
        ctas={pageConfig.ctas.map((cta, index) =>
          index === 0 ? { ...cta, href: examRegistrationHref } : cta
        )}
        photo={examPhoto}
        photoWide={examHeroPhoto}
        themeClassName="hero-theme-exams"
      />

      <section className="py-16 md:py-20">
        <Container className="space-y-12 md:space-y-14">
          <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
            {/* `min-w-0`, as on /courses/[slug]: no child may widen the column. */}
            <div className="min-w-0 space-y-12 md:space-y-14">
              {/*
                Who the exam is for, in the old site's words (2026-10-08). It
                was the hero's text, five lines beside the facts card; the hero
                says the short version and the page says this.
              */}
              {detail.narrative?.intro ? (
                <section aria-labelledby="exam-audience">
                  <h2 id="exam-audience" className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">
                    {locale === 'de' ? 'Für wen ist die Prüfung?' : 'Who is the exam for?'}
                  </h2>
                  <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{detail.narrative.intro}</p>
                </section>
              ) : null}
              <ExamDayTimelineSignature
                title={locale === 'de' ? 'Von der Anmeldung bis zum Ergebnis' : 'From registration to your result'}
                description={
                  locale === 'de'
                    ? 'Hier siehst du, wie deine Prüfung abläuft und was du am Prüfungstag mitbringst.'
                    : 'Here you can see how your exam works and what to bring on the day.'
                }
                timeline={[
                  { label: '1', title: locale === 'de' ? 'Anmelden' : 'Register', description: locale === 'de' ? 'Such dir einen Prüfungstermin aus und melde dich vor Ablauf der Anmeldefrist an.' : 'Choose an exam date and register before the deadline.' },
                  {
                    label: '2',
                    title: locale === 'de' ? 'Vorbereiten' : 'Prepare',
                    description:
                      locale === 'de'
                        ? isB2 || isC1
                          ? 'Bereite dich in unserem Vorbereitungskurs oder allein auf die Aufgaben vor.'
                          : 'Bereite dich gezielt auf die Aufgaben der Prüfung vor.'
                        : isB2 || isC1
                          ? 'Prepare for the tasks in our preparation course or on your own.'
                          : 'Focus your preparation on the exam tasks.',
                  },
                  { label: '3', title: locale === 'de' ? 'Prüfungstag' : 'Exam day', description: locale === 'de' ? examDayDe : examDayEn },
                  {
                    label: '4',
                    title: locale === 'de' ? 'Ergebnis' : 'Results',
                    description:
                      locale === 'de'
                        ? isB2 || isC1
                          ? 'Ergebnis und Zertifikat liegen etwa 6 Wochen nach der Prüfung vor. Wir sagen dir Bescheid, sobald sie da sind.'
                          : 'Wir sagen dir Bescheid, sobald dein Ergebnis da ist.'
                        : isB2 || isC1
                          ? 'Your result and certificate are ready about 6 weeks after the exam. We will let you know as soon as they arrive.'
                          : 'We will let you know as soon as your result arrives.',
                  },
                ]}
                bringTitle={locale === 'de' ? 'Das bringst du mit' : 'What to bring'}
                bringItems={[
                  locale === 'de' ? 'Gültiger Ausweis' : 'Valid photo ID',
                  locale === 'de' ? 'Anmeldebestätigung' : 'Registration confirmation',
                  locale === 'de' ? 'Erlaubte Hilfsmittel laut Prüfungsregeln' : 'Any materials the exam rules allow',
                ]}
              />

              <EditorialSplit
                eyebrow={locale === 'de' ? 'Vorbereitung' : 'Preparation'}
                title={locale === 'de' ? preparationDe.title : preparationEn.title}
                description={
                  locale === 'de'
                    ? preparationDe.description
                    : preparationEn.description
                }
                bullets={
                  locale === 'de'
                    ? preparationDe.bullets
                    : preparationEn.bullets
                }
                photo={examStoryPhoto}
              />

              <ProcessSteps
                eyebrow={locale === 'de' ? 'Anmeldung' : 'Registration'}
                title={locale === 'de' ? 'So meldest du dich an' : 'How to register'}
                description={
                  locale === 'de'
                    ? 'Wenn du bereit bist, meldest du dich direkt über unser Formular an.'
                    : 'When you are ready, you can register straight away using our form.'
                }
                steps={[
                  {
                    step: '1',
                    title: locale === 'de' ? 'Termin wählen' : 'Choose a date',
                    // The form offers Vollprüfung, Nur schriftlich and Nur mündlich.
                    description:
                      locale === 'de'
                        ? 'Wähle deinen Prüfungstermin und entscheide, ob du die ganze Prüfung oder nur den schriftlichen oder den mündlichen Teil ablegst.'
                        : 'Pick your exam date and decide whether you are taking the whole exam or only the written or the oral part.',
                  },
                  {
                    step: '2',
                    title: locale === 'de' ? 'Daten eingeben' : 'Enter your details',
                    description:
                      locale === 'de'
                        ? 'Gib deine Daten genau so an, wie sie in deinem Ausweis stehen.'
                        : 'Enter your details exactly as they appear on your ID.',
                  },
                  {
                    step: '3',
                    title: locale === 'de' ? 'Absenden' : 'Submit',
                    description:
                      locale === 'de'
                        ? 'Schick die Anmeldung ab. Sobald wir deine Angaben und die Zahlung geprüft haben, bestätigen wir dir deinen Platz per E-Mail.'
                        : 'Send off your registration. As soon as we have checked your details and your payment, we will confirm your place by email.',
                  },
                ]}
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
              infoTitle={locale === 'de' ? 'Auf einen Blick' : 'At a glance'}
              infoItems={decisionItems}
              /*
                No `notes`. Same leak as the accommodation rail carried: copy
                that explains what the sticky card is for rather than telling the
                reader anything about the exam.
              */
              deadlineIso={selectedSession?.registration_deadline}
              // Only for a real sitting: with none on offer the badge's
              // no-deadline state read "Laufende Anmeldung" beside "Wird bekannt gegeben".
              showDeadline={Boolean(selectedSession)}
              /*
                Tanja Langenickel, per CASA's 2026-09-08 allocation. This card
                had no contact row at all — it ended on the `notes` line removed
                above, so a candidate deciding on a telc entry was given a date,
                a price and nobody to ask.
              */
              contact={getCasaContact('exams', locale)}
            />
          </div>
        </Container>
      </section>
    </main>
  );
}
