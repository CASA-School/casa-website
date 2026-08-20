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
    <section>
      <h2 className="text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
      <p className="mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">{description}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <dl className="border-t border-[color:var(--casa-sand)]">
          {cards.map((card) => (
            <div key={card.title} className="border-b border-[color:var(--casa-sand)]/60 py-4">
              <dt className="text-sm font-bold text-[var(--casa-ink)]">{card.title}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-[var(--casa-muted)]">{card.detail}</dd>
            </div>
          ))}
        </dl>

        <aside className="rounded-xl bg-[var(--casa-warm-soft)]/35 p-5 md:p-6">
          <h3 className="text-sm font-bold text-[var(--casa-ink)]">{checklistTitle}</h3>
          <ul className="mt-3 space-y-2.5">
            {checklist.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-[var(--casa-ink)]">
                <span aria-hidden className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
