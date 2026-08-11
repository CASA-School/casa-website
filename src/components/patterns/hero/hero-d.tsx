import { ShieldCheck } from 'lucide-react';

import { CTAStack } from '@/components/patterns/cta-stack';
import { ProofStrip } from '@/components/patterns/proof-strip';

import { HeroMediaCard, HeroShell, type HeroPatternProps } from './shared';

export function HeroD({ spec, showDraftClaims = false, className, dataTestId }: HeroPatternProps) {
  const isDe = spec.locale === 'de';
  const points =
    spec.chips && spec.chips.length > 0
      ? spec.chips.slice(0, 3)
      : ['Trusted host placements', 'Clear support process', 'People-first guidance'];

  return (
    <HeroShell spec={spec} className={className} dataTestId={dataTestId}>
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          <div className="relative">
            <HeroMediaCard spec={spec} compact className="min-h-[300px]" />
            <div className="absolute -bottom-3 left-5 rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-[var(--shadow-soft)]">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                {isDe ? 'Wohnen in Bremen' : 'Bremen housing'}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[var(--shadow-soft)]">
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              {isDe ? 'Vertrauenssignal' : 'Trust signal'}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              {isDe
                ? 'Wohnqualität, Ansprechpartner und Onboarding-Standards werden vor jeder Vermittlung geprüft.'
                : 'Living quality, support contact, and onboarding standards are reviewed before placement.'}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{spec.eyebrow}</p>
          <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-[var(--casa-ink)] sm:text-[2.85rem]">
            {spec.headline}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">{spec.subheadline}</p>

          <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--casa-amber)]" />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <CTAStack items={spec.ctas} className="mt-6" />
        </div>
      </div>

      <ProofStrip
        metrics={spec.proofMetrics}
        showDraftClaims={showDraftClaims}
        compact
        className="mt-6"
        dataTestId="hero-proof-strip"
      />
    </HeroShell>
  );
}
