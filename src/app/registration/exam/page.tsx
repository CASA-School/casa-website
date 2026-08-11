import type { Metadata } from 'next';

import { Navbar } from '@/components/layout/navbar';
import { ExamWizard } from '@/components/registration/exam-wizard';
import { getContentLocale } from '@/lib/content/locale.server';
import { getExamRegistrationCatalog } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Exam Registration',
  description:
    'Register for CASA Bremen exam sessions with transparent deadlines, fees, and candidate details.',
  path: '/registration/exam',
});

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
    <main className="min-h-screen bg-[var(--casa-sand)]/30 text-[var(--casa-ink)]">
      {/* Main navigation header */}
      <Navbar contentLocale={locale} />

      <div className="mx-auto max-w-4xl px-4 py-8 md:py-16">
        <header className="mb-6 md:mb-8">
          <h1 className="text-3xl font-black tracking-tight text-[var(--casa-ink)] md:text-4xl">
            {locale === 'de' ? 'Prüfungsanmeldung' : 'Exam registration'}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-700">
            {locale === 'de'
              ? 'Wählen Sie Prüfung und Termin, ergänzen Sie Ihre Angaben und prüfen Sie alles vor dem Absenden.'
              : 'Choose your exam and session, add your details, and review everything before you submit.'}
          </p>
        </header>

        <div
          id="exam-registration-form"
          className="relative min-w-0 scroll-mt-28 overflow-hidden rounded-3xl border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] bg-[radial-gradient(130%_120%_at_0%_0%,color-mix(in_srgb,var(--casa-blue)_8%,transparent),transparent_55%)] p-6 shadow-[var(--shadow-card)] sm:p-10"
        >
          <ExamWizard catalog={examCatalog} />
        </div>
      </div>
    </main>
  );
}
