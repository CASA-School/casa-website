import { cn } from '@/lib/utils';

export type TimelineItem = {
  label: string;
  title: string;
  description: string;
};

type TimelineProps = {
  items: readonly TimelineItem[];
  className?: string;
  dataTestId?: string;
};

export function Timeline({ items, className, dataTestId }: TimelineProps) {
  return (
    <ol className={cn('relative space-y-5', className)} data-testid={dataTestId}>
      {items.map((item, index) => (
        <li key={`${item.label}-${item.title}`} className="relative rounded-xl border border-slate-200/80 bg-white p-5 shadow-[var(--shadow-soft)]">
          {index < items.length - 1 ? <span className="absolute left-7 top-full h-5 w-px bg-slate-200" aria-hidden="true" /> : null}
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{item.label}</p>
          <h3 className="mt-2 text-lg font-bold text-[var(--casa-ink)]">{item.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
        </li>
      ))}
    </ol>
  );
}
