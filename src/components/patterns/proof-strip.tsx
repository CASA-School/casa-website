import type { ProofMetric } from '@/lib/content/types';
import { cn } from '@/lib/utils';

type ProofStripProps = {
  metrics: ProofMetric[];
  showDraftClaims?: boolean;
  className?: string;
  compact?: boolean;
  dataTestId?: string;
};

export function ProofStrip({
  metrics,
  showDraftClaims = false,
  className,
  compact = false,
  dataTestId,
}: ProofStripProps) {
  const visible = metrics.filter((metric) => showDraftClaims || metric.verificationStatus === 'verified').slice(0, 4);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'grid gap-3 rounded-xl border border-slate-200/80 bg-white/90 p-3 shadow-[var(--shadow-soft)] sm:grid-cols-2 lg:grid-cols-4',
        compact && 'p-2 text-sm',
        className
      )}
      data-testid={dataTestId}
    >
      {visible.map((metric) => (
        <article key={`${metric.value}-${metric.label}`} className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
          <p className="text-xl font-black text-[var(--casa-ink)]">{metric.value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-600">{metric.label}</p>
          {metric.verificationStatus === 'draft' ? (
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--casa-coral)]">Draft</p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
