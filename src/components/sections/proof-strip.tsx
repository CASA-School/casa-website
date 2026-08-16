import type { ProofMetric } from '@/lib/content/types';
import { cn } from '@/lib/utils';

export type ProofStripItem = {
  value: string;
  label: string;
  description?: string;
  isDraft?: boolean;
};

type ProofStripProps = {
  items: ProofStripItem[];
  className?: string;
  compact?: boolean;
};

export function toProofStripItems(metrics: ProofMetric[], showDraftClaims = false, limit = 6): ProofStripItem[] {
  return metrics
    .filter((metric) => showDraftClaims || metric.verificationStatus === 'verified')
    .slice(0, limit)
    .map((metric) => ({
      value: metric.value,
      label: metric.label,
      description: metric.asOf,
      isDraft: metric.verificationStatus === 'draft',
    }));
}

export function ProofStrip({ items, className, compact = false }: ProofStripProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="CASA proof points"
      className={cn(
        'rounded-3xl bg-[var(--casa-warm-soft)]/32 px-6 py-7',
        compact ? 'p-3' : 'p-4 md:p-5',
        className
      )}
    >
      <ul
        className={cn(
          'grid gap-3',
          compact ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
        )}
      >
        {items.map((item) => (
          <li
            key={`${item.value}-${item.label}`}
            className="border-l border-[color:var(--casa-sand)] pl-3"
          >
            <p className={cn('font-black leading-none text-[var(--casa-ink)]', compact ? 'text-lg' : 'text-xl')}>
              {item.value}
            </p>
            <p className="mt-1 text-xs font-semibold text-[var(--casa-muted)]">{item.label}</p>
            {item.description ? <p className="mt-1 text-xs text-[var(--casa-muted)]">{item.description}</p> : null}
            {item.isDraft ? (
              <p className="mt-1 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-coral-text)]">Draft</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
