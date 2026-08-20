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
    <main className="min-h-screen bg-[var(--casa-canvas)] py-16 text-[var(--casa-ink)] md:py-20">
      <Container className="space-y-6">
        <Breadcrumbs
          items={[
            { label: copy.breadcrumbHome, href: '/' },
            { label: copy.breadcrumbCurrent },
          ]}
        />
        {/*
          A white card, like every other card on the site.

          This carried two brand colours in one sweep — blue in at 0%, sun out at
          100% — and the page ground carried the same pair as radials. Two of the
          site's last three multi-colour gradients were on this one route. The
          border and shadow already separate the card; the colours were only
          telling the reader that the calculator is a different product.
        */}
        <section className="rounded-3xl border border-[color:var(--casa-sand)] bg-white px-6 py-6 shadow-[var(--shadow-card)] md:px-8 md:py-7">
          <p className="inline-flex rounded-full border border-[color:var(--casa-sand)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-ink)]">
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-black text-[var(--casa-ink)] md:text-4xl">
            {copy.heading}
          </h1>
          <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">
            {copy.intro}
          </p>
        </section>
        <CasaCostPathwayCalculator locale={locale} />
      </Container>
    </main>
  );
}
