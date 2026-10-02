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
        ? 'Wählen Sie Prüfung und Termin, ergänzen Sie Ihre Angaben und prüfen Sie alles vor dem Absenden.'
        : 'Choose your exam and session, add your details, and review everything before you submit.'}
      formId="exam-registration-form"
      helpTitle={locale === 'de' ? 'Fragen zur Prüfung?' : 'Questions about the exam?'}
      helpBody={locale === 'de'
        ? 'Nicht sicher, welche Prüfung oder welcher Termin passt? Rufen Sie an oder schreiben Sie uns, wir helfen gern bei der Anmeldung.'
        : 'Not sure which exam or which date fits? Call or write to us, we are happy to help you register.'}
    >
      <ExamWizard catalog={examCatalog} />
    </RegistrationPageShell>
  );
}
