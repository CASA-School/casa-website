import { HelpCircle } from 'lucide-react';

type Fee = {
  label: string;
  amount: string;
  note?: string;
};

/**
 * The fee table and conditions CASA publishes for a course format.
 *
 * casa-bremen.de gives every course a "Kosten" table and a block of prose
 * conditions, and both were missing here entirely: a learner comparing formats
 * saw "Price: from €520" with no indication that a full level is €940, that an
 * extra week is €117.50, or that a first registration adds €50. The fee table is
 * the part of a course page people screenshot.
 *
 * Two columns rather than one, because they answer different questions — "what
 * will this cost me" and "what am I agreeing to" — and a reader almost always
 * arrives with one of them, not both. The conditions column carries the
 * expectation-setting sentences, including the unwelcome ones: exam preparation
 * is not included, placement can move you, A1.1 cannot join mid-course.
 *
 * Data comes from config/courses/course-practical-facts.ts. Never hardcode a
 * figure in here.
 */
export function CoursePracticalDetails({
  fees,
  feeNote,
  conditions,
  locale,
}: {
  fees?: Fee[];
  feeNote?: string;
  conditions: string[];
  locale: 'en' | 'de';
}) {
  if (!fees?.length && !feeNote && conditions.length === 0) {
    return null;
  }

  const copy = {
    title: locale === 'de' ? 'Kosten und Bedingungen' : 'Costs and conditions',
    fees: locale === 'de' ? 'Kosten' : 'Costs',
    conditions: locale === 'de' ? 'Gut zu wissen' : 'Good to know',
  };

  /*
   * Same treatment as the term table: the section is the section, not a slab.
   * The price list keeps its own hairline rows, which is the structure that
   * actually earns a rule here — a reader scans figures down a column.
   */
  return (
    <section>
      <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{copy.title}</h2>

      <div className="mt-7 grid gap-8 border-t border-[color:var(--casa-sand)] pt-7 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-10 md:divide-x md:divide-[color:var(--casa-sand)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{copy.fees}</p>

          {/*
            Rows are a two-column grid, not a wrapping flex row. With flex-wrap,
            a fee carrying a note ("Charged once, on your first registration at
            CASA") pushed its own amount onto the next line, so €50 sat under the
            caveat instead of in the column of figures the reader is scanning. The
            amount holds its column whatever the label does beside it.
          */}
          {fees?.length ? (
            <dl className="mt-5 space-y-0">
              {fees.map((fee) => (
                <div
                  key={fee.label}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 border-b border-[color:var(--casa-sand)]/60 py-3 last:border-b-0"
                >
                  <dt className="text-sm leading-relaxed text-[var(--casa-ink)]">
                    {fee.label}
                    {fee.note ? (
                      <span className="mt-1 block text-xs leading-relaxed text-[var(--casa-muted)]">{fee.note}</span>
                    ) : null}
                  </dt>
                  {/* Tabular figures so the amounts form a readable column. */}
                  <dd className="whitespace-nowrap text-base font-bold tabular-nums text-[var(--casa-ink)]">
                    {fee.amount}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {feeNote ? (
            <p className="mt-5 flex gap-2.5 text-sm leading-relaxed text-[var(--casa-muted)]">
              <HelpCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--casa-accent-text)]" />
              <span>{feeNote}</span>
            </p>
          ) : null}
        </div>

        <div className="md:pl-10">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
            {copy.conditions}
          </p>
          <ul className="mt-5 space-y-4">
            {conditions.map((condition) => (
              <li key={condition} className="flex gap-3 text-sm leading-relaxed text-[var(--casa-ink)]">
                <span aria-hidden className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]" />
                <span>{condition}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
