import type { Metadata } from 'next';

import { ExamWizard } from '@/components/registration/exam-wizard';
import { RegistrationPageShell } from '@/components/registration/registration-page-shell';
import { getContentLocale } from '@/lib/content/locale.server';
import { getExamRegistrationCatalog } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Prüfungsanmeldung' : 'Exam registration',
    description: locale === 'de' ? 'Melden Sie sich zu Ihrer telc-Prüfung bei CASA in Bremen an. Wählen Sie Prüfung und Termin und tragen Sie Ihre Daten ein.' : 'Register for your telc exam at CASA in Bremen. Choose your exam and date, then enter your details.',
    path: '/registration/exam',
  });
}

export default async function ExamRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const locale = await getContentLocale();
  const { sessionId } = await searchParams;
  const requestedSessionId = typeof sessionId === 'string' ? sessionId : undefined;
  const examCatalog = await getExamRegistrationCatalog(locale, requestedSessionId);

  return (
    <RegistrationPageShell
      locale={locale}
      title={locale === 'de' ? 'Prüfungsanmeldung' : 'Exam registration'}
      intro={locale === 'de'
        ? 'In drei Schritten zu Ihrem Prüfungsplatz.'
        : 'Book your exam in three steps.'}
      formId="exam-registration-form"
      helpTitle={locale === 'de' ? 'Fragen zur Prüfung?' : 'Questions about the exam?'}
      helpBody={locale === 'de'
        ? 'Wir helfen gern bei der Wahl von Prüfung und Termin.'
        : 'We are glad to help you choose an exam and a date.'}
    >
      <ExamWizard catalog={examCatalog} />
    </RegistrationPageShell>
  );
}
