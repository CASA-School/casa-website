import { cn } from '@/lib/utils';

type TableRow = {
  label: string;
  left: string;
  right: string;
};

type ComparisonModuleProps = {
  eyebrow: string;
  title: string;
  description: string;
  leftTitle: string;
  rightTitle: string;
  rows: TableRow[];
  /**
   * `dark` puts the table on an ink-deep field, copy inverted.
   *
   * Same prop and the same reasoning as CourseFormatRows: two expressions of one
   * hierarchy rather than two designs, so a page chooses the surface and the
   * component does not have to be restyled at the call site. It exists because
   * the accommodation pages had no inverted band anywhere — measured, nine
   * sections on /accommodation and not one of them dark, while the homepage gets
   * its rhythm from four ink-deep fields punctuating the light ones. A comparison
   * is the moment a reader decides, which is exactly what deserves the weight.
   */
  tone?: 'light' | 'dark';
  className?: string;
};

export function ComparisonModule({
  eyebrow,
  title,
  description,
  leftTitle,
  rightTitle,
  rows,
  tone = 'light',
  className,
}: ComparisonModuleProps) {
  const isDark = tone === 'dark';
  const rule = isDark ? 'border-white/15' : 'border-[color:var(--casa-sand)]';
  const muted = isDark ? 'text-white/72' : 'text-[var(--casa-muted)]';
  const strong = isDark ? 'text-white' : 'text-[var(--casa-ink)]';

  return (
    <section
      data-reveal="true"
      className={cn(
        isDark
          ? 'px-0 py-0'
          : 'casa-editorial-measure rounded-xl bg-white px-6 py-8 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70 md:px-9 md:py-10',
        className
      )}
    >
      {/*
        The heading block is clamped to a reading measure, and centred on the
        inverted field the way the ink-deep band on /courses is.

        Measured before this: five of the nine headings on /accommodation ran the
        full 1360px container, while every heading on the homepage and /courses
        sits between 518 and 736px. A 1360px-wide h2 over a 1360px table is why
        those pages read as one repeated full-width block — nothing in the
        composition ever narrows.
      */}
      <div className={cn('max-w-[46rem]', isDark && 'mx-auto text-center')}>
        <p
          className={cn(
            'text-xs font-semibold uppercase tracking-eyebrow',
            isDark ? 'text-[var(--casa-sun)]' : 'text-[var(--casa-accent-text)]'
          )}
        >
          {eyebrow}
        </p>
        {/* The accent rule is the light-surface mark; on ink the eyebrow carries it. */}
        {isDark ? null : <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />}
        <h2 className={cn('mt-2 text-balance text-2xl font-bold leading-tight sm:text-3xl', strong)}>{title}</h2>
        <p className={cn('mt-3 max-w-measure text-base leading-relaxed md:text-lg', isDark && 'mx-auto', muted)}>
          {description}
        </p>
      </div>

      {/* The table itself stays wide, but not edge-to-edge on the inverted field. */}
      <div className={cn('mt-8 overflow-x-auto', isDark && 'mx-auto max-w-[76rem]')}>
        <table className="w-full min-w-full border-collapse text-left text-base md:min-w-[520px]">
          <thead>
            <tr>
              <th className={cn('border-b px-2 py-2 text-xs font-semibold uppercase tracking-eyebrow', rule, muted)}>
                Focus
              </th>
              <th className={cn('border-b px-2 py-2 text-xs font-semibold uppercase tracking-eyebrow', rule, muted)}>
                {leftTitle}
              </th>
              <th className={cn('border-b px-2 py-2 text-xs font-semibold uppercase tracking-eyebrow', rule, muted)}>
                {rightTitle}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th className={cn('border-b px-2 py-3 text-base font-semibold', rule, strong)}>
                  {row.label}
                </th>
                <td className={cn('border-b px-2 py-3 text-base', rule, muted)}>{row.left}</td>
                <td className={cn('border-b px-2 py-3 text-base', rule, muted)}>{row.right}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
