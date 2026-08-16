import type { Metadata } from 'next';

import { Navbar } from '@/components/layout/navbar';
import { CourseWizard } from '@/components/registration/course-wizard';
import { getContentLocale } from '@/lib/content/locale.server';
import { getCourseRegistrationCatalog } from '@/lib/content/repository';
import { createPublicMetadata } from '@/lib/seo';

export const metadata: Metadata = createPublicMetadata({
  title: 'Course Registration',
  description:
    'Complete your CASA Bremen course registration with program selection, schedule options, and admissions review.',
  path: '/registration/course',
});

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
    <main className="min-h-screen bg-[var(--casa-sand)]/30 text-[var(--casa-ink)]">
      {/* Main navigation header */}
      <Navbar contentLocale={locale} />

      <div className="mx-auto max-w-4xl px-4 py-8 md:py-16">
        <header className="mb-6 md:mb-8">
          <h1 className="text-3xl font-black tracking-tight text-[var(--casa-ink)] md:text-4xl">
            {locale === 'de' ? 'Kursanmeldung' : 'Course registration'}
          </h1>
          <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-ink)]">
            {locale === 'de'
              ? 'Wählen Sie Kurs und Starttermin, ergänzen Sie Ihre Angaben und prüfen Sie alles vor dem Absenden.'
              : 'Choose your course and start date, add your details, and review everything before you submit.'}
          </p>
        </header>

        <div
          id="course-registration-form"
          className="relative min-w-0 scroll-mt-28 overflow-hidden rounded-3xl border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] bg-[radial-gradient(130%_120%_at_0%_0%,color-mix(in_srgb,var(--casa-blue)_8%,transparent),transparent_55%)] p-6 shadow-[var(--shadow-card)] sm:p-10"
        >
          <CourseWizard catalog={registrationData} />
        </div>
      </div>
    </main>
  );
}
