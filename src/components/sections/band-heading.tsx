import { cn } from '@/lib/utils';

/**
 * The centred band heading — eyebrow, title, lead sentence.
 *
 * WHY THIS EXISTS. The identical markup was written inline in three places: the
 * homepage above its course-format rows, /courses above the same rows, and
 * /courses again above "Four things worth knowing first". Same measure
 * (`max-w-[46rem]`), same centring, same `mt-4` / `mt-5` rhythm, same eyebrow
 * class — three copies, so a change to the band heading was a three-file edit
 * that nobody would remember to finish. This codebase has already been bitten by
 * exactly that twice: ProofBand rendered at two widths because each page clamped
 * its own copy, and a course's photograph changed between surfaces because each
 * page did its own lookup.
 *
 * `tone` is the only real variation, and it was already the only difference
 * between the three copies: on ink-deep the title runs white and the lead at
 * `white/72`; on a light ground they become ink and muted. Two expressions of one
 * hierarchy, which is why it is a prop rather than a `className` each call site
 * has to get right.
 *
 * Pairs with `CourseFormatRows`, which takes the same `tone`. A band is normally
 * this heading plus those rows.
 */
export function BandHeading({
  eyebrow,
  title,
  description,
  tone = 'dark',
  className,
}: {
  /** Optional: the homepage's testimonials band is a heading on its own. */
  eyebrow?: string;
  title: string;
  /** Optional, for the same reason. */
  description?: string;
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const isDark = tone === 'dark';

  return (
    <div className={cn('mx-auto max-w-[46rem] text-center', className)}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{eyebrow}</p>
      ) : null}
      <h2
        className={cn(
          /*
            `text-balance` and `text-pretty` are defaults here, not call-site
            opt-ins. Both were added by hand to the non-profit band on the
            homepage — "without it 'mission.' sits alone on line two at 1440",
            and "'projects.' was landing alone on a fourth line at 375". A
            centred heading and a centred lead paragraph want that treatment
            every time, and a fix discovered on one band should not have to be
            rediscovered on the next.
          */
          'text-balance text-3xl font-bold leading-tight md:text-4xl',
          eyebrow && 'mt-4',
          isDark ? 'text-white' : 'text-[var(--casa-ink)]'
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            'mx-auto mt-5 max-w-measure text-pretty text-base leading-relaxed md:text-lg',
            isDark ? 'text-white/72' : 'text-[var(--casa-muted)]'
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
