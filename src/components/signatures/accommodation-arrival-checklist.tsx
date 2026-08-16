'use client';

import { Button } from '@/components/ui/button';

type AccommodationArrivalChecklistProps = {
  title: string;
  description: string;
  neighborhoodNotes: string[];
  arrivalChecklist: string[];
};

export function AccommodationArrivalChecklist({
  title,
  description,
  neighborhoodNotes,
  arrivalChecklist,
}: AccommodationArrivalChecklistProps) {
  return (
    <section className="rounded-3xl border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-soft)] md:p-7 print:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">Signature</p>
          <h2 className="mt-2 text-3xl font-bold text-[var(--casa-ink)]">{title}</h2>
          <p className="mt-2 text-sm text-[var(--casa-muted)] md:text-base">{description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.print()}
          className="casa-button-outline border-[color:var(--casa-sand)] text-[var(--casa-ink)] hover:bg-[var(--casa-warm-soft)] print:hidden"
        >
          Print checklist
        </Button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)]/34 p-4">
          <h3 className="text-sm font-bold text-[var(--casa-ink)]">Neighborhood notes</h3>
          <ul className="mt-2 space-y-2">
            {neighborhoodNotes.map((note) => (
              <li key={note} className="text-sm text-[var(--casa-ink)]">
                - {note}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-[color:var(--casa-sand)] bg-white p-4">
          <h3 className="text-sm font-bold text-[var(--casa-ink)]">Arrival checklist</h3>
          <ul className="mt-2 space-y-2">
            {arrivalChecklist.map((item) => (
              <li key={item} className="text-sm text-[var(--casa-ink)]">
                [ ] {item}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
