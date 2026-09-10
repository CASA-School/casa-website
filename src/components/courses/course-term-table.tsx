import { Link } from '@/i18n/navigation';

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
    title: locale === 'de' ? 'Kurstermine' : 'Course dates',
    past: locale === 'de' ? 'beendet' : 'finished',
  };

  /*
   * Open on the page, not in a card. And no "DATES" eyebrow above a heading that
   * reads "Course dates" — the label restated the heading in smaller capitals,
   * which is one of 27 eyebrow instances measured on a single course page.
   */
  return (
    <section>
      <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{copy.title}</h2>

      <div className="mt-7 grid gap-8 border-t border-[color:var(--casa-sand)] pt-7 md:grid-cols-2 md:gap-10 md:divide-x md:divide-[color:var(--casa-sand)]">
        {groups.map((group, index) => (
          <div
            key={group.slotLabel}
            className={index > 0 ? 'md:pl-10' : undefined}
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
                    <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3.5 text-base tabular-nums text-[var(--casa-muted)]">
                      <span className="line-through decoration-1">{term.rangeLabel}</span>
                      <span className="text-xs uppercase tracking-eyebrow">{copy.past}</span>
                    </span>
                  ) : (
                    <Link
                      href={term.href}
                      aria-current={term.isSelected ? 'true' : undefined}
                      /*
                        Dates at body size (was `text-sm`), and the "current"
                        marker LEADS the date instead of trailing it. With
                        `justify-between` the dot was pushed to the far edge of
                        the column — which in the two-column layout is the
                        divider, so it floated in the gutter looking like a
                        stray pixel rather than marking a row. A leading dot is
                        the ordinary "you are here" idiom and stays attached to
                        the thing it marks.
                      */
                      className={
                        term.isSelected
                          ? 'flex items-baseline gap-3 py-3.5 text-base font-bold tabular-nums text-[var(--casa-ink)]'
                          : 'flex items-baseline gap-3 py-3.5 text-base tabular-nums text-[var(--casa-ink)] transition-colors hover:text-[var(--casa-accent-text)]'
                      }
                    >
                      {term.isSelected ? (
                        <span aria-hidden className="h-2 w-2 shrink-0 translate-y-[-1px] rounded-full bg-[var(--casa-blue)]" />
                      ) : null}
                      <span>{term.rangeLabel}</span>
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
