import { CheckCircle2 } from 'lucide-react';

import { CTAStack } from '@/components/patterns/cta-stack';
import { ProofStrip } from '@/components/patterns/proof-strip';

import { HeroShell, type HeroPatternProps } from './shared';

export function HeroE({ spec, showDraftClaims = false, utilityItems, className, dataTestId }: HeroPatternProps) {
  const isDe = spec.locale === 'de';
  const fallbackUtilityItems = spec.proofMetrics.slice(0, 4).map((metric) => ({ label: metric.label, value: metric.value }));
  const panels = utilityItems && utilityItems.length > 0 ? utilityItems.slice(0, 4) : fallbackUtilityItems;

  return (
    <HeroShell spec={spec} className={className} dataTestId={dataTestId}>
      <div className="grid gap-8 lg:grid-cols-[1.06fr_0.94fr]">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{spec.eyebrow}</p>
          <h1 className="text-4xl font-black leading-[1.08] tracking-tight text-[var(--casa-ink)] sm:text-5xl">
            {spec.headline}
          </h1>
          <p className="mt-5 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] sm:text-lg">{spec.subheadline}</p>

          <div className="mt-6 rounded-xl border border-[color:var(--casa-sand)]/80 bg-white px-4 py-3 text-sm text-[var(--casa-muted)] shadow-[var(--shadow-soft)]">
            <p className="font-semibold text-[var(--casa-ink)]">{isDe ? 'Ablauf' : 'Utility flow'}</p>
            <p className="mt-1 inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[var(--casa-accent-text)]" />
              {isDe
                ? 'Details vergleichen -> Option wählen -> Anmeldung abschließen'
                : 'Compare details -> pick option -> complete registration'}
            </p>
          </div>

          <CTAStack items={spec.ctas} className="mt-6" />
        </div>

        <aside className="rounded-3xl border border-[color:var(--casa-sand)]/80 bg-[repeating-linear-gradient(45deg,#f8fafc_0,#f8fafc_14px,#ffffff_14px,#ffffff_28px)] p-6 shadow-[var(--shadow-soft)]">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{isDe ? 'Datenpanel' : 'Data panel'}</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {panels.map((panel) => (
              <div key={`${panel.label}-${panel.value}`} className="rounded-xl border border-[color:var(--casa-sand)]/70 bg-white px-3 py-2.5">
                <dt className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{panel.label}</dt>
                <dd className="mt-1 text-sm font-semibold text-[var(--casa-ink)]">{panel.value}</dd>
              </div>
            ))}
          </dl>
        </aside>
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
