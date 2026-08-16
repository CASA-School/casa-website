import { Quote } from 'lucide-react';

import { CTAStack } from '@/components/patterns/cta-stack';
import { ProofStrip } from '@/components/patterns/proof-strip';

import { HeroMediaCard, HeroShell, type HeroPatternProps } from './shared';

export function HeroA({ spec, showDraftClaims = false, className, dataTestId }: HeroPatternProps) {
  return (
    <HeroShell spec={spec} className={className} dataTestId={dataTestId}>
      <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{spec.eyebrow}</p>
          <h1 className="text-4xl font-black leading-[1.04] tracking-tight text-[var(--casa-ink)] sm:text-5xl lg:text-5xl">
            {spec.headline}
          </h1>
          <p className="mt-5 max-w-measure text-lg leading-relaxed text-[var(--casa-muted)]">{spec.subheadline}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {spec.proofMetrics.slice(0, 3).map((metric) => (
              <article
                key={`${metric.value}-${metric.label}`}
                className="rounded-xl border border-[color:var(--casa-sand)]/80 bg-white px-3 py-3 shadow-[var(--shadow-soft)]"
              >
                <p className="text-xl font-black text-[var(--casa-ink)]">{metric.value}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--casa-muted)]">{metric.label}</p>
              </article>
            ))}
          </div>

          {spec.chips && spec.chips.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {spec.chips.slice(0, 4).map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-[color:var(--casa-sand)]/80 bg-white/90 px-3 py-1 text-xs font-semibold text-[var(--casa-muted)]"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}

          <CTAStack items={spec.ctas} className="mt-7" />
        </div>

        <div className="space-y-4">
          <HeroMediaCard spec={spec} className="min-h-[360px]" />

          <blockquote className="rounded-xl border border-[color:var(--casa-sand)]/80 bg-white p-4 shadow-[var(--shadow-soft)]">
            <Quote className="h-4 w-4 text-[var(--casa-accent-text)]" />
            <p className="mt-2 text-sm leading-relaxed text-[var(--casa-ink)]">&quot;{spec.story.quote}&quot;</p>
            <footer className="mt-3 text-xs font-semibold text-[var(--casa-muted)]">
              {spec.story.personDisplay} · {spec.story.country}
            </footer>
          </blockquote>
        </div>
      </div>

      <ProofStrip
        metrics={spec.proofMetrics}
        showDraftClaims={showDraftClaims}
        className="mt-8"
        dataTestId="hero-proof-strip"
      />
    </HeroShell>
  );
}
