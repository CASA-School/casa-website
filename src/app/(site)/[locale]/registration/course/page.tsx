import type { Metadata } from 'next';

import { CourseWizard } from '@/components/registration/course-wizard';
import { RegistrationPageShell } from '@/components/registration/registration-page-shell';
import { getContentLocale } from '@/lib/content/locale.server';
import { getCourseRegistrationCatalog, getExamRegistrationCatalog } from '@/lib/content/repository';
import { describeBookedLevel } from '@/lib/registration/levels';
import { createPublicMetadata } from '@/lib/seo';
import { say } from '@/lib/cms/copy';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Kursanmeldung: Deutschkurs in Bremen buchen' : 'Book a German course in Bremen',
    description: locale === 'de' ? 'Melde dich online zu deinem Deutschkurs bei CASA in Bremen an: Kurs, Niveau und Termin wählen und deine Wünsche nennen. Wir melden uns persönlich bei dir.' : 'Register online for your German course at CASA in Bremen: choose your course, level and start date and tell us your plans. We will get back to you in person.',
    path: '/registration/course',
  });
}

export default async function CourseRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const locale = await getContentLocale();
  const { courseId, level } = await searchParams;
  const requestedInstanceId = typeof courseId === 'string' ? courseId : undefined;
  // The exam catalogue too: an exam can be booked with the courses.
  const [catalog, examCatalog] = await Promise.all([
    getCourseRegistrationCatalog(locale, requestedInstanceId),
    getExamRegistrationCatalog(locale),
  ]);
  // A course page's Kurstermine card names the level too (`?level=A2.2`); kept when the course offers it.
  const slug = catalog.courseTypes.find((type) => type.id === catalog.defaultCourseTypeId)?.slug;
  const option = catalog.defaultCourseTypeId
    ? catalog.optionsByCourseTypeId[catalog.defaultCourseTypeId]?.find((candidate) => candidate.id === catalog.defaultOptionId)
    : undefined;
  const requestedLevel = typeof level === 'string' && option && describeBookedLevel(slug, level, option.availableLevels, locale) ? level : undefined;
  const registrationData = requestedLevel ? { ...catalog, defaultLevel: requestedLevel } : catalog;

  return (
    <RegistrationPageShell
      locale={locale}
      title={say(locale, 'Kursanmeldung', 'Course registration')}
      intro={say(locale, 'In drei Schritten meldest du dich zu deinem Kurs an.', 'Register for your course in three steps.')}
      formId="course-registration-form"
      helpTitle={say(locale, 'Fragen zur Anmeldung?', 'Questions about registering?')}
      helpBody={say(locale, 'Wir helfen dir gern bei der Wahl von Kurs, Niveau und Termin.', 'We’re happy to help you choose a course, a level and a date.')}
    >
      <CourseWizard catalog={registrationData} examCatalog={examCatalog} />
    </RegistrationPageShell>
  );
}
