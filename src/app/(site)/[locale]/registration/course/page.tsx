import type { Metadata } from 'next';

import { CourseWizard } from '@/components/registration/course-wizard';
import { RegistrationPageShell } from '@/components/registration/registration-page-shell';
import { getContentLocale } from '@/lib/content/locale.server';
import { getCourseRegistrationCatalog, getExamRegistrationCatalog } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Kursanmeldung' : 'Course registration',
    description: locale === 'de' ? 'Melde dich zu einem Deutschkurs bei CASA in Bremen an. Wähle deinen Kurs und teile uns deine Wünsche mit.' : 'Register for a German course at CASA in Bremen. Choose your course and tell us about your plans.',
    path: '/registration/course',
  });
}

export default async function CourseRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const locale = await getContentLocale();
  const { courseId } = await searchParams;
  const requestedInstanceId = typeof courseId === 'string' ? courseId : undefined;
  // The exam catalogue too: an exam can be booked with the courses.
  const [registrationData, examCatalog] = await Promise.all([
    getCourseRegistrationCatalog(locale, requestedInstanceId),
    getExamRegistrationCatalog(locale),
  ]);

  return (
    <RegistrationPageShell
      locale={locale}
      title={locale === 'de' ? 'Kursanmeldung' : 'Course registration'}
      intro={locale === 'de'
        ? 'In drei Schritten meldest du dich zu deinem Kurs an.'
        : 'Register for your course in three steps.'}
      formId="course-registration-form"
      helpTitle={locale === 'de' ? 'Fragen zur Anmeldung?' : 'Questions about registering?'}
      helpBody={locale === 'de'
        ? 'Wir helfen dir gern bei der Wahl von Kurs, Niveau und Termin.'
        : 'We’re happy to help you choose a course, a level and a date.'}
    >
      <CourseWizard catalog={registrationData} examCatalog={examCatalog} />
    </RegistrationPageShell>
  );
}
