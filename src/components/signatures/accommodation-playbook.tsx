type AccommodationPlaybookProps = {
  title: string;
  description: string;
  cards: Array<{
    title: string;
    detail: string;
  }>;
  checklist: string[];
  /**
   * Localised. This heading was the hardcoded English string "Housing
   * checklist", rendering untranslated on a page whose every other line goes
   * through `locale`.
   */
  checklistTitle: string;
};

/**
 * The housing expectations block on /accommodation.
 *
 * Three things were wrong with it beyond the layout.
 *
 * Its eyebrow was the literal word "Signature" — the internal name for this
 * class of component, shipped to visitors as a label, and untranslated. Its
 * checklist heading was hardcoded English. And it was a `rounded-3xl` card
 * carrying both a hairline and a shadow, containing four more `rounded-xl`
 * bordered boxes: the same card-in-card nesting removed from the course pages,
 * at the feature radius rather than the card radius the token ladder names.
 *
 * Now: an open section, the three cost facts as hairline-divided rows, and the
 * checklist as the one warm panel — which is the only thing here a reader is
 * meant to act on.
 */
export function AccommodationPlaybook({
  title,
  description,
  cards,
  checklist,
  checklistTitle,
}: AccommodationPlaybookProps) {
  return (
    /*
      REBUILT. The previous version was a two-column grid: three hairline rows on
      the left and a warm checklist panel on the right. The two columns had
      nothing to do with each other's height, so the panel floated as a tall
      cream box with a third of it empty, and the rows beside it ran to uneven
      lengths against a rule that stopped early. It read as two unfinished things
      side by side.

      Now it is one block that flows: the three facts as a 3-up on the editorial
      measure, each on its own rule, and the checklist as a single full-width
      strip beneath — so the warm surface is as tall as its content and the
      section has one bottom edge instead of two.
    */
    <section className="casa-editorial-measure">
      <div className="max-w-[46rem]">
        <h2 className="text-balance text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
        <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">{description}</p>
      </div>

      <dl className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
        {cards.map((card) => (
          <div key={card.title} className="border-t border-[color:var(--casa-sand)] pt-5">
            <dt className="text-sm font-bold text-[var(--casa-ink)]">{card.title}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-[var(--casa-muted)]">{card.detail}</dd>
          </div>
        ))}
      </dl>

      {/*
        A strip, not a column. Four short items sit on one row from md up, so the
        warm surface is the height of one line of text rather than a box waiting
        to be filled.
      */}
      <div className="mt-10 rounded-xl bg-[var(--casa-warm-soft)]/35 px-5 py-5 md:px-7 md:py-6">
        <h3 className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">
          {checklistTitle}
        </h3>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {checklist.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-[var(--casa-ink)]">
              <span aria-hidden className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
