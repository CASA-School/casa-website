import { Quote } from 'lucide-react';

import { CTAStack } from '@/components/patterns/cta-stack';
import { ProofStrip } from '@/components/patterns/proof-strip';

import { HeroMediaCard, HeroShell, type HeroPatternProps } from './shared';

export function HeroF({ spec, showDraftClaims = false, className, dataTestId }: HeroPatternProps) {
  return (
    <HeroShell spec={spec} className={className} dataTestId={dataTestId}>
      <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{spec.eyebrow}</p>
          <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-[var(--casa-ink)] sm:text-[2.95rem]">
            {spec.headline}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">{spec.subheadline}</p>

          <blockquote className="mt-6 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[var(--shadow-soft)]">
            <Quote className="h-5 w-5 text-[var(--casa-accent-text)]" />
            <p className="mt-3 text-base leading-relaxed text-slate-700">&quot;{spec.story.quote}&quot;</p>
            <footer className="mt-4 text-sm font-semibold text-slate-500">
              {spec.story.personDisplay} · {spec.story.country}
            </footer>
          </blockquote>

          <CTAStack items={spec.ctas} className="mt-6" />
        </div>

        <div className="space-y-4">
          <HeroMediaCard spec={spec} compact className="min-h-[280px]" />

          <div className="grid gap-3 sm:grid-cols-2">
            {spec.proofMetrics.slice(0, 2).map((metric) => (
              <article key={`${metric.value}-${metric.label}`} className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-[var(--shadow-soft)]">
                <p className="text-xl font-black text-[var(--casa-ink)]">{metric.value}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">{metric.label}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <ProofStrip
        metrics={spec.proofMetrics}
        showDraftClaims={showDraftClaims}
        className="mt-7"
        dataTestId="hero-proof-strip"
      />
    </HeroShell>
  );
}
