import type { ReactNode } from 'react';

import { HeroEMinimal } from '@/components/heroes';
import { LegalAnchorLayout, type LegalAnchorSection } from '@/components/signatures';
import { Container } from '@/components/ui/container';
import type { HeroSpec } from '@/lib/content/types';
import { type BreadcrumbItem } from '@/components/patterns/breadcrumbs';

type LegalSection = {
  title: string;
  body: string[];
};

type LegalUtilityTemplateProps = {
  hero: HeroSpec;
  breadcrumbs: BreadcrumbItem[];
  sections: LegalSection[];
  notice?: string;
  afterContent?: ReactNode;
};

function toAnchorSections(sections: LegalSection[]): LegalAnchorSection[] {
  return sections.map((section) => ({
    id: section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: section.title,
    paragraphs: section.body,
  }));
}

export function LegalUtilityTemplate({ hero, breadcrumbs, sections, notice, afterContent }: LegalUtilityTemplateProps) {
  const primaryAction = hero.ctas.find((cta) => cta.kind === 'primary') ?? hero.ctas[0];
  const anchorSections = toAnchorSections(sections);

  return (
    <main className="bg-[var(--casa-bg)] text-[var(--casa-ink)] print:bg-white">
      <HeroEMinimal
        eyebrow={hero.eyebrow}
        title={hero.headline}
        description={hero.subheadline}
        breadcrumbs={breadcrumbs}
        cta={primaryAction}
        meta={hero.proofMetrics.slice(0, 2).map((item) => `${item.value} ${item.label}`)}
      />

      <section className="py-10 md:py-12 print:py-4">
        <Container className="space-y-6">
          <figure className="overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70 print:hidden">
            <div
              role="img"
              aria-label="CASA Bremen exterior sign at the school entrance"
              className="h-64 bg-cover bg-center md:h-80"
              style={{
                backgroundImage: "url('/media/casa/school-entrance-sign.jpg')",
              }}
            />
          </figure>

          <LegalAnchorLayout
            title="Print-friendly legal layout"
            intro="Section anchors and typographic rhythm are structured for screen reading and printing."
            sections={anchorSections}
          />

          {notice ? (
            <div className="rounded-xl border border-[var(--casa-amber)]/45 bg-[var(--casa-warm-soft)]/72 p-5 text-sm leading-relaxed text-[var(--casa-ink)] print:border-slate-300 print:bg-white">
              {notice}
            </div>
          ) : null}

          {afterContent}
        </Container>
      </section>
    </main>
  );
}
