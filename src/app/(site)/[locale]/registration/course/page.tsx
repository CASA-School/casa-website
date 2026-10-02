import type { Metadata } from 'next';

import { CourseWizard } from '@/components/registration/course-wizard';
import { RegistrationPageShell } from '@/components/registration/registration-page-shell';
import { getContentLocale } from '@/lib/content/locale.server';
import { getCourseRegistrationCatalog } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Kursanmeldung' : 'Course registration',
    description: locale === 'de' ? 'Melden Sie sich zu einem Deutschkurs bei CASA in Bremen an. Wählen Sie Ihren Kurs und teilen Sie uns Ihre Wünsche mit.' : 'Register for a German course at CASA in Bremen. Choose your course and tell us about your plans.',
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
  const registrationData = await getCourseRegistrationCatalog(locale, requestedInstanceId);

  return (
    <RegistrationPageShell
      locale={locale}
      title={locale === 'de' ? 'Kursanmeldung' : 'Course registration'}
      intro={locale === 'de'
        ? 'Wählen Sie Kurs und Starttermin, ergänzen Sie Ihre Angaben und prüfen Sie alles vor dem Absenden.'
        : 'Choose your course and start date, add your details, and review everything before you submit.'}
      formId="course-registration-form"
      helpTitle={locale === 'de' ? 'Fragen zur Anmeldung?' : 'Questions about registering?'}
      helpBody={locale === 'de'
        ? 'Nicht sicher, welcher Kurs passt oder wann er beginnt? Rufen Sie an oder schreiben Sie uns, wir helfen gern bei der Anmeldung.'
        : 'Not sure which course fits or when it starts? Call or write to us, we are happy to help you register.'}
    >
      <CourseWizard catalog={registrationData} />
    </RegistrationPageShell>
  );
}
