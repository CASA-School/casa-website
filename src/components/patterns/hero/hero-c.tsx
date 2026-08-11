import { CTAStack } from '@/components/patterns/cta-stack';
import { Breadcrumbs } from '@/components/patterns/breadcrumbs';

import { HeroShell, type HeroPatternProps } from './shared';

export function HeroC({ spec, breadcrumbs, className, dataTestId }: HeroPatternProps) {
  const primary = spec.ctas.find((cta) => cta.kind === 'primary') ?? spec.ctas[0];

  return (
    <HeroShell spec={spec} className={className} dataTestId={dataTestId}>
      {breadcrumbs && breadcrumbs.length > 0 ? <Breadcrumbs items={breadcrumbs} className="mb-4" /> : null}

      <div className="mx-auto max-w-3xl text-center">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{spec.eyebrow}</p>
        <h1 className="text-3xl font-black leading-[1.1] tracking-tight text-[var(--casa-ink)] sm:text-4xl lg:text-[2.75rem]">
          {spec.headline}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-600">{spec.subheadline}</p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-500">
          {spec.proofMetrics.slice(0, 2).map((metric) => (
            <span key={`${metric.value}-${metric.label}`} className="rounded-full border border-slate-200 bg-white px-3 py-1">
              {metric.value} · {metric.label}
            </span>
          ))}
        </div>

        {primary ? <CTAStack items={[primary]} className="mt-5 justify-center" /> : null}
      </div>
    </HeroShell>
  );
}
