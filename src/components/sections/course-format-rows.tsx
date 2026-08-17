import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

import { CasaImage as Image } from '@/components/ui/casa-image';
import { cn } from '@/lib/utils';

export type CourseFormatRow = {
  /**
   * Rendered as a DOM id, and it is an in-page link target rather than
   * decoration — the homepage persona cards deep-link straight to a format
   * (`#course-evening-german`) and e2e asserts the target lands in view.
   * Dropping the id silently breaks those links with no type error.
   */
  id: string;
  title: string;
  description: string;
  bestFor: string;
  outcomes: string[];
  href: string;
  ctaLabel: string;
  /** Optional kicker, e.g. "Next start: 3 Mar 2026". */
  meta?: string;
  media: { src: string; alt: string };
};

/**
 * The alternating course-format rows.
 *
 * SHARED BY THE HOMEPAGE AND /courses ON PURPOSE. Both pages present the same
 * six formats, and both used to draw them with their own markup — which is
 * precisely how this codebase has broken before. ProofBand rendered at two
 * different widths because each page clamped its own copy, and a course's
 * photograph changed between surfaces because each page did its own positional
 * lookup. Repeating a pattern across pages is what a design system is for;
 * repeating the MARKUP is what makes two pages drift.
 *
 * So the composition lives here once. A page chooses the surface it sits on and
 * supplies the rows; it does not restyle them.
 *
 * `tone` is the one real variation. On ink-deep the copy runs white at three
 * opacity tiers and the CTA is outlined in white; on a light surface those same
 * tiers become ink and muted. They are two expressions of one hierarchy, not
 * two designs — which is why they are a prop here rather than a `className`
 * that call sites would each have to get right.
 *
 * Nothing in this component states a price or an hours figure. Every field is
 * passed in from the content layer's course narrative
 * (see docs/COURSE_FACTS_SOURCE_OF_TRUTH.md before adding one).
 */
export function CourseFormatRows({
  rows,
  tone = 'dark',
  className,
}: {
  rows: CourseFormatRow[];
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const isDark = tone === 'dark';

  return (
    <div className={cn('mx-auto max-w-[85rem] space-y-12 md:space-y-20', className)}>
      {rows.map((row, index) => (
        <div
          key={row.id}
          id={row.id}
          className="grid scroll-mt-28 items-center gap-8 md:scroll-mt-32 md:grid-cols-2 md:gap-14"
        >
          {/*
            `md:order-2` only. On phones the DOM order stands for every row —
            copy first, photograph second — so the stack never alternates. An
            alternating stack on a narrow screen reads as inconsistent rather
            than as rhythm, because the pairing that justifies the flip is not
            visible at that width.
          */}
          <div className={cn(index % 2 === 1 && 'md:order-2')}>
            {row.meta ? (
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
                {row.meta}
              </p>
            ) : null}
            <h3
              className={cn(
                'mt-3 text-2xl font-bold leading-tight md:text-4xl',
                isDark ? 'text-white' : 'text-[var(--casa-ink)]'
              )}
            >
              {row.title}
            </h3>
            <p
              className={cn(
                'mt-4 max-w-measure text-base leading-relaxed md:mt-5',
                isDark ? 'text-white/72' : 'text-[var(--casa-muted)]'
              )}
            >
              {row.description}
            </p>
            <p
              className={cn(
                'mt-3 max-w-measure text-base leading-relaxed',
                isDark ? 'text-white/56' : 'text-[var(--casa-muted)]/80'
              )}
            >
              {row.bestFor}
            </p>
            {row.outcomes.length > 0 ? (
              <ul className="mt-6 space-y-2.5">
                {row.outcomes.slice(0, 3).map((outcome) => (
                  <li
                    key={outcome}
                    className={cn(
                      'flex items-start gap-2.5 text-sm leading-relaxed',
                      isDark ? 'text-white/72' : 'text-[var(--casa-muted)]'
                    )}
                  >
                    <CheckCircle2
                      className={cn(
                        'mt-0.5 h-4 w-4 shrink-0',
                        isDark ? 'text-[var(--casa-sun)]' : 'text-[var(--casa-blue)]'
                      )}
                      aria-hidden
                    />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {/*
              A real control, not a text link. Each row is a separate decision
              with its own destination, so the one-solid-button rule applies per
              row rather than per band. Outlined rather than filled: six filled
              buttons down a field would read as a toolbar, and the fill inverts
              on hover so the affordance stays unmistakable.
            */}
            <Link
              href={row.href}
              className={cn(
                'mt-7 inline-flex items-center gap-2 rounded-lg border px-5 py-3 text-sm font-bold transition-colors md:mt-8',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                isDark
                  ? 'border-white/30 text-white hover:border-white hover:bg-white hover:text-[var(--casa-ink-deep)] focus-visible:ring-[var(--casa-sun)] focus-visible:ring-offset-[var(--casa-ink-deep)]'
                  : 'border-[color:var(--casa-ink-deep)]/25 text-[var(--casa-ink)] hover:border-[color:var(--casa-ink-deep)] hover:bg-[var(--casa-ink-deep)] hover:text-white focus-visible:ring-[var(--casa-blue)]'
              )}
            >
              {row.ctaLabel}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <div
            className={cn(
              'casa-media-overlay relative aspect-[4/3] overflow-hidden rounded-2xl',
              index % 2 === 1 && 'md:order-1'
            )}
          >
            <Image
              src={row.media.src}
              alt={row.media.alt}
              fill
              sizes="(min-width: 768px) 34vw, 92vw"
              className="object-cover"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
