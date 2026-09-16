import { cn } from '@/lib/utils';

export type FeeFigure = {
  label: string;
  amount: string;
  note?: string;
  /** The label must also identify a refundable deposit in words. */
  tone?: 'charge' | 'refundable';
};

/** Shared by course and accommodation pages. Keep every charge visible, with
 * its meaning before its amount. A deposit has a separate, quieter surface;
 * prices and their conditions always come from the content configuration. */
export function FeeStrip({ figures, className }: { figures: FeeFigure[]; className?: string }) {
  if (figures.length === 0) return null;

  return (
    <dl
      data-fee-strip
      className={cn(
        'overflow-hidden rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)]/40',
        className
      )}
    >
      {figures.map((figure) => (
        <div
          key={figure.label}
          className={cn(
            'grid gap-x-8 gap-y-1.5 border-t border-[color:var(--casa-sand)] px-5 py-5 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_max-content] sm:px-7',
            figure.tone === 'refundable' && 'bg-[var(--casa-blue)]/5'
          )}
        >
          <dt className="text-base font-semibold leading-relaxed text-[var(--casa-ink)]">
            {figure.label}
          </dt>
          <dd className="text-xl font-semibold leading-relaxed tabular-nums text-[var(--casa-ink)] sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:text-right">
            {figure.amount}
          </dd>
          {figure.note ? (
            <dd className="max-w-measure text-sm leading-relaxed text-[var(--casa-muted)] sm:col-start-1">
              {figure.note}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
