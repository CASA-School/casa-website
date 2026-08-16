import { cn } from '@/lib/utils';

export type StatItem = {
  value: string;
  label: string;
  description?: string;
};

type StatsRowProps = {
  title?: string;
  items: StatItem[];
  className?: string;
};

/**
 * Proof metrics, rendered exactly as they were approved.
 *
 * This component used to count each value up from zero on scroll. It was
 * removed rather than tuned, because the intermediate frames were false claims:
 *
 *   - "7-80+ age range represented" was parsed as a *range* and both bounds were
 *     animated independently, so the homepage rendered "0-3+" and "1-6+" — an
 *     age range this school does not teach.
 *   - "30,000+ learners supported" rendered "1,114+" and "2,227+" on the way up.
 *
 * The values in the DOM were always correct; the animation invented the rest.
 * A range is not a quantity and cannot be counted, and a rounded aggregate that
 * reads 1,114+ for 400ms is worse than no animation on a site whose content
 * rules forbid publishing unverified figures. See
 * docs/PREMIUM_UI_REVIEW_2026-08-16.md §1.1.
 *
 * Restoring a count-up means proving no frame can assert something untrue.
 */
export function StatsRow({ title, items, className }: StatsRowProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className={cn('relative overflow-hidden rounded-lg bg-[var(--casa-ink-deep)] text-white shadow-[var(--shadow-modal)]', className)}>
      {/*
        Was a hard-stop three-colour flag stripe cutting at exactly 34% / 68%.
        One accent, faded, reads as a considered edge rather than a flag.
      */}
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--casa-blue)_0%,color-mix(in_srgb,var(--casa-blue)_15%,transparent)_100%)]" aria-hidden="true" />
      <div className="absolute -right-20 -top-24 h-52 w-52 rounded-full border border-white/10" aria-hidden="true" />
      <div className="absolute -bottom-28 left-10 h-56 w-56 rounded-full border border-white/10" aria-hidden="true" />

      <div className="relative px-5 py-6 md:px-7 md:py-7">
        {title ? <h2 className="max-w-2xl text-2xl font-bold text-white md:text-3xl">{title}</h2> : null}
      </div>

      <ul
        className={cn(
          'relative grid border-t border-white/10 sm:grid-cols-2 xl:grid-cols-4',
          title ? '' : 'border-t-0'
        )}
      >
        {items.map((item, index) => (
          <li
            key={`${item.value}-${item.label}`}
            className={cn(
              'group relative min-h-[8rem] border-white/10 px-5 py-5 transition-colors duration-200 hover:bg-white/[0.06]',
              index > 0 && 'border-t',
              index % 2 === 1 && 'sm:border-l',
              index > 1 && 'sm:border-t',
              index < 2 && 'sm:border-t-0',
              index > 0 && 'xl:border-l',
              'xl:border-t-0'
            )}
          >
            {/*
              These ticks used to cycle blue -> sun -> red -> white by index, so
              a four-stat row put the entire brand triad on screen at once and
              implied a category difference between stats that have none.
            */}
            <span
              className="mb-4 block h-1 w-10 rounded-full bg-[var(--casa-blue)] transition-[width] duration-200 group-hover:w-16"
              aria-hidden="true"
            />
            <p className="tabular-nums text-4xl font-black leading-none text-white sm:text-5xl">
              {item.value}
            </p>
            <p className="mt-3 max-w-[15rem] text-sm font-semibold uppercase leading-snug tracking-eyebrow text-white/68">{item.label}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
