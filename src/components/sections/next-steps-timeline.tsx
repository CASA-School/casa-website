'use client';

import { cn } from '@/lib/utils';

type NextStep = {
  title: string;
  description: string;
};

type NextStepsTimelineProps = {
  title: string;
  steps: NextStep[];
  className?: string;
};

export function NextStepsTimeline({ title, steps, className }: NextStepsTimelineProps) {
  return (
    <section className={cn('rounded-xl border border-[color:var(--casa-sand)] bg-white p-4', className)}>
      <p className="text-sm font-bold text-[var(--casa-ink)]">{title}</p>
      <ol className="mt-3 space-y-3">
        {steps.map((step, index) => (
          <li key={`${step.title}-${index}`} className="grid gap-2 grid-cols-[28px_1fr]">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--casa-warm-soft)] text-xs font-bold text-[var(--casa-ink)]">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--casa-ink)]">{step.title}</p>
              <p className="text-xs leading-relaxed text-[var(--casa-muted)]">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
