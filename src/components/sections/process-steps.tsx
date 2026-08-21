import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ProcessStep = {
  step: string;
  title: string;
  description: string;
};

type ProcessStepsProps = {
  /** Optional — see EditorialSplit. */
  eyebrow?: string;
  /**
   * `plain` drops the warm fill. Default stays `warm` so nothing changes where
   * this is a page's single accent — /accommodation had FOUR warm panels in nine
   * sections, which is what made it read as a tunnel.
   */
  tone?: 'warm' | 'plain';
  title: string;
  description: string;
  steps: ProcessStep[];
  cta?: {
    label: string;
    href: string;
  };
  className?: string;
};

export function ProcessSteps({
  eyebrow,
  title,
  description,
  steps,
  cta,
  tone = 'warm',
  className,
}: ProcessStepsProps) {
  return (
    <section data-reveal="true" className={cn(
        tone === 'warm' ? 'rounded-3xl bg-[var(--casa-warm-soft)]/35 px-6 py-8 md:px-9 md:py-10' : undefined,
        className
      )}>
      {/* Clamped: this heading was running the full container. See ComparisonModule. */}
      <div className="max-w-[46rem]">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{eyebrow}</p>
        ) : null}
        <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
        <h2 className="mt-2 text-balance text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
        <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">
          {description}
        </p>
      </div>

      <ol className="mt-8 grid gap-7 md:grid-cols-3">
        {steps.map((item) => (
          <li key={item.step} className="relative border-l border-[color:var(--casa-sand)] pl-4">
            <span className="absolute -left-2 top-0 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--casa-accent-surface)] text-xs font-bold text-white">
              {item.step}
            </span>
            <h3 className="text-base font-semibold text-[var(--casa-ink)]">{item.title}</h3>
            <p className="mt-2 text-base leading-relaxed text-[var(--casa-muted)]">{item.description}</p>
          </li>
        ))}
      </ol>

      {cta ? (
        <div className="mt-7">
          <Button asChild className="h-11 rounded-lg casa-button-prism bg-[var(--casa-ink-deep)] px-5 font-semibold text-white hover:bg-[var(--casa-ink-deep-hover)]">
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
