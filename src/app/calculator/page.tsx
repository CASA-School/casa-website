import type { Metadata } from 'next';

import { CasaCostPathwayCalculator } from '@/components/calculator/casa-cost-pathway-calculator';
import { Breadcrumbs } from '@/components/patterns/breadcrumbs';
import { Container } from '@/components/ui/container';
import { getContentLocale } from '@/lib/content/locale.server';
import { createPublicMetadata } from '@/lib/seo';

const pageCopy = {
  en: {
    title: 'Cost & Pathway Calculator',
    description:
      'Estimate duration and total cost to reach your target German level at CASA, including optional exams and accommodation.',
    breadcrumbHome: 'Home',
    breadcrumbCurrent: 'Calculator',
    eyebrow: 'CASA Planning Tool',
    heading: 'Calculate your course, exam, and housing estimate quickly',
    intro:
      'Choose your current level, target level, and optional services. The estimate updates immediately and keeps refundable deposits separate.',
  },
  de: {
    title: 'Kosten- und Kursweg-Rechner',
    description:
      'Schätzen Sie Dauer und Kosten für Ihren Deutschkurs bei CASA, inklusive optionaler Prüfung und Unterkunft.',
    breadcrumbHome: 'Start',
    breadcrumbCurrent: 'Rechner',
    eyebrow: 'CASA Planungstool',
    heading: 'Kurs, Prüfung und Unterkunft schnell berechnen',
    intro:
      'Wählen Sie aktuelles Niveau, Zielniveau und optionale Leistungen. Die Schätzung aktualisiert sich sofort und zeigt rückerstattbare Kaution getrennt.',
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getContentLocale();
  const copy = pageCopy[locale];

  return createPublicMetadata({
    title: copy.title,
    description: copy.description,
    path: '/calculator',
    keywords: ['CASA calculator', 'German course cost estimate', 'pathway estimator'],
  });
}

export default async function CalculatorPage() {
  const locale = await getContentLocale();
  const copy = pageCopy[locale];

  return (
    <main className="min-h-screen bg-[var(--casa-canvas)] bg-[radial-gradient(130%_90%_at_0%_0%,color-mix(in_srgb,var(--casa-blue)_8%,transparent),transparent_55%),radial-gradient(120%_90%_at_100%_0%,color-mix(in_srgb,var(--casa-sun)_10%,transparent),transparent_58%)] py-16 text-[var(--casa-ink)] md:py-20">
      <Container className="space-y-6">
        <Breadcrumbs
          items={[
            { label: copy.breadcrumbHome, href: '/' },
            { label: copy.breadcrumbCurrent },
          ]}
        />
        <section className="rounded-3xl border border-[color:var(--casa-sand)] bg-white bg-[linear-gradient(165deg,color-mix(in_srgb,var(--casa-blue)_8%,transparent)_0%,transparent_44%,color-mix(in_srgb,var(--casa-sun)_12%,transparent)_100%)] px-6 py-6 shadow-[var(--shadow-card)] md:px-8 md:py-7">
          <p className="inline-flex rounded-full border border-[color:var(--casa-sand)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-ink)]">
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-black leading-tight text-[var(--casa-ink)] md:text-4xl">
            {copy.heading}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[var(--casa-muted)]">
            {copy.intro}
          </p>
        </section>
        <CasaCostPathwayCalculator locale={locale} />
      </Container>
    </main>
  );
}
