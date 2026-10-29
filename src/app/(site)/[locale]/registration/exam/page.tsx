import type { Metadata } from 'next';

import { ExamWizard } from '@/components/registration/exam-wizard';
import { RegistrationPageShell } from '@/components/registration/registration-page-shell';
import { getContentLocale } from '@/lib/content/locale.server';
import { getExamRegistrationCatalog } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';
import { say } from '@/lib/cms/copy';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();

  return createPublicMetadata({
    locale,
    title: locale === 'de' ? 'Anmeldung zur telc-Prüfung in Bremen' : 'Register for a telc exam in Bremen',
    description: locale === 'de' ? 'Melde dich online zu telc Deutsch B2 oder telc Deutsch C1 Hochschule bei CASA in Bremen an: Prüfung und Termin wählen, Daten eintragen, fertig.' : 'Register online for telc Deutsch B2 or telc Deutsch C1 Hochschule at CASA in Bremen: choose your exam and date, enter your details and you are done.',
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
      title={say(locale, 'Prüfungsanmeldung', 'Exam registration')}
      intro={say(locale, 'In drei Schritten meldest du dich zu deiner Prüfung an.', 'Register for your exam in three steps.')}
      formId="exam-registration-form"
      helpTitle={say(locale, 'Fragen zur Prüfung?', 'Questions about the exam?')}
      helpBody={say(locale, 'Wir helfen dir gern bei der Wahl von Prüfung und Termin.', 'We’re happy to help you choose an exam and a date.')}
    >
      <ExamWizard catalog={examCatalog} />
    </RegistrationPageShell>
  );
}
