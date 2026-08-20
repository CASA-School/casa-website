'use client';

import { Button } from '@/components/ui/button';

type AccommodationArrivalChecklistProps = {
  title: string;
  description: string;
  neighborhoodNotes: string[];
  arrivalChecklist: string[];
  /**
   * All localised. These four were hardcoded English — "Signature",
   * "Print checklist", "Neighborhood notes", "Arrival checklist" — on a
   * component whose every other string is passed in through `locale`.
   */
  neighborhoodTitle: string;
  checklistTitle: string;
  printLabel: string;
};

/**
 * The arrival block on an accommodation option page.
 *
 * Four things beyond the layout:
 *
 *  - Its eyebrow was the literal word "Signature", the internal name for this
 *    class of component, shipped to visitors as a label.
 *  - Three of its headings never went through the locale at all.
 *  - The neighbourhood notes were rendered as `- {note}` and the checklist as
 *    `[ ] {item}` — a hyphen and two ASCII brackets standing in for a bullet
 *    and a checkbox, inside the text content. A screen reader reads "left
 *    square bracket, right square bracket" before every item, and the brackets
 *    survive into anything that copies the text.
 *  - It was a `rounded-3xl` card with both a hairline and a shadow, holding two
 *    more bordered boxes.
 *
 * The checkbox is now an empty bordered square, which is what the brackets were
 * imitating, and it is `aria-hidden` so the item reads as an item.
 */
export function AccommodationArrivalChecklist({
  title,
  description,
  neighborhoodNotes,
  arrivalChecklist,
  neighborhoodTitle,
  checklistTitle,
  printLabel,
}: AccommodationArrivalChecklistProps) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
          <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">{description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.print()}
          className="casa-button-outline border-[color:var(--casa-sand)] text-[var(--casa-ink)] hover:bg-[var(--casa-warm-soft)] print:hidden"
        >
          {printLabel}
        </Button>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2 md:gap-10 md:divide-x md:divide-[color:var(--casa-sand)]">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
            {neighborhoodTitle}
          </h3>
          <ul className="mt-4 space-y-3">
            {neighborhoodNotes.map((note) => (
              <li key={note} className="flex gap-2.5 text-sm leading-relaxed text-[var(--casa-ink)]">
                <span aria-hidden className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:pl-10">
          <h3 className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">
            {checklistTitle}
          </h3>
          <ul className="mt-4 space-y-3">
            {arrivalChecklist.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-[var(--casa-ink)]">
                <span
                  aria-hidden
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-[3px] border border-[color:var(--casa-sand)] bg-white"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
