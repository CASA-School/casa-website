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
  className?: string;
};

export function ComparisonModule({
  eyebrow,
  title,
  description,
  leftTitle,
  rightTitle,
  rows,
  className,
}: ComparisonModuleProps) {
  return (
    <section data-reveal="true" className={cn('rounded-xl bg-white px-6 py-8 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--casa-sand)]/70 md:px-9 md:py-10', className)}>
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{eyebrow}</p>
      <span className="casa-tricolor-rule mt-2 block h-1 w-20 rounded-full" aria-hidden />
      <h2 className="mt-2 text-2xl font-bold text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
      <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{description}</p>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-full border-collapse text-left text-base md:min-w-[520px]">
          <thead>
            <tr>
              <th className="border-b border-[color:var(--casa-sand)] px-2 py-2 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                Focus
              </th>
              <th className="border-b border-[color:var(--casa-sand)] px-2 py-2 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                {leftTitle}
              </th>
              <th className="border-b border-[color:var(--casa-sand)] px-2 py-2 text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
                {rightTitle}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th className="border-b border-[color:var(--casa-sand)] px-2 py-3 text-base font-semibold text-[var(--casa-ink)]">
                  {row.label}
                </th>
                <td className="border-b border-[color:var(--casa-sand)] px-2 py-3 text-base text-[var(--casa-muted)]">{row.left}</td>
                <td className="border-b border-[color:var(--casa-sand)] px-2 py-3 text-base text-[var(--casa-muted)]">{row.right}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
