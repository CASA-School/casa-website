import Link from 'next/link';

export type CourseTermGroup = {
  /** e.g. "Morning · Mon–Fri, 09:00–12:30" */
  slotLabel: string;
  terms: {
    id: string;
    rangeLabel: string;
    href: string;
    isSelected: boolean;
    isPast: boolean;
  }[];
};

/**
 * CASA's published term table.
 *
 * The facts rail says "Next start date". casa-bremen.de publishes the whole
 * table, in two columns, eight months ahead — and someone planning a visa,
 * booking leave, or lining up a flight needs the whole table, not the next row
 * of it. Before this the page said "Next start date: To be announced" while the
 * dates sat in the database.
 *
 * Grouped by slot rather than listed flat, because the intensive course's two
 * cohorts differ in a way that changes the decision: mornings run Monday to
 * Friday and afternoons Monday to Thursday. A flat list of eight dates hides
 * that the choice is between two different weekly commitments.
 *
 * Past terms are kept, dimmed and non-interactive. Removing them would leave a
 * reader unsure whether the table is short because CASA runs few courses or
 * because the year is half gone.
 */
export function CourseTermTable({
  groups,
  locale,
  note,
}: {
  groups: CourseTermGroup[];
  locale: 'en' | 'de';
  note?: string;
}) {
  if (groups.length === 0) {
    return null;
  }

  const copy = {
    eyebrow: locale === 'de' ? 'Termine' : 'Dates',
    title: locale === 'de' ? 'Kurstermine' : 'Course dates',
    past: locale === 'de' ? 'beendet' : 'finished',
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-[color:var(--casa-sand)] bg-white shadow-[var(--shadow-card)]">
      <div className="border-b border-[color:var(--casa-sand)] p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
          {copy.eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[var(--casa-ink)] sm:text-3xl">{copy.title}</h2>
      </div>

      <div className="grid gap-0 md:grid-cols-2">
        {groups.map((group, index) => (
          <div
            key={group.slotLabel}
            className={
              index === 0 && groups.length > 1
                ? 'border-b border-[color:var(--casa-sand)] p-6 md:border-b-0 md:border-r md:p-8'
                : 'p-6 md:p-8'
            }
          >
            <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
              {group.slotLabel}
            </p>
            <ul className="mt-4 space-y-0">
              {group.terms.map((term) => (
                <li
                  key={term.id}
                  className="border-b border-[color:var(--casa-sand)]/60 last:border-b-0"
                >
                  {term.isPast ? (
                    <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-sm tabular-nums text-[var(--casa-muted)]">
                      <span className="line-through decoration-1">{term.rangeLabel}</span>
                      <span className="text-xs uppercase tracking-eyebrow">{copy.past}</span>
                    </span>
                  ) : (
                    <Link
                      href={term.href}
                      aria-current={term.isSelected ? 'true' : undefined}
                      className={
                        term.isSelected
                          ? 'flex items-baseline justify-between gap-4 py-3 text-sm font-bold tabular-nums text-[var(--casa-ink)]'
                          : 'flex items-baseline justify-between gap-4 py-3 text-sm tabular-nums text-[var(--casa-ink)] transition-colors hover:text-[var(--casa-accent-text)]'
                      }
                    >
                      <span>{term.rangeLabel}</span>
                      {term.isSelected ? (
                        <span
                          aria-hidden
                          className="mt-[0.3rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]"
                        />
                      ) : null}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {note ? (
        <p className="border-t border-[color:var(--casa-sand)] bg-[var(--casa-surface-wash)] px-6 py-4 text-sm leading-relaxed text-[var(--casa-muted)] md:px-8">
          {note}
        </p>
      ) : null}
    </section>
  );
}
