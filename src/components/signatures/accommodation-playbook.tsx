type AccommodationPlaybookProps = {
  title: string;
  description: string;
  cards: Array<{
    title: string;
    detail: string;
  }>;
  checklist: string[];
};

export function AccommodationPlaybook({ title, description, cards, checklist }: AccommodationPlaybookProps) {
  return (
    <section className="rounded-3xl border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-soft)] md:p-7">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">Signature</p>
      <h2 className="mt-2 text-3xl font-black text-[var(--casa-ink)]">{title}</h2>
      <p className="mt-2 text-sm text-[var(--casa-muted)] md:text-base">{description}</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-3">
          {cards.map((card) => (
            <article key={card.title} className="rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] p-4">
              <h3 className="text-sm font-bold text-[var(--casa-ink)]">{card.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[var(--casa-muted)]">{card.detail}</p>
            </article>
          ))}
        </div>

        <aside className="rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)]/34 p-4">
          <h3 className="text-sm font-bold text-[var(--casa-ink)]">Housing checklist</h3>
          <ul className="mt-2 space-y-2">
            {checklist.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-[var(--casa-ink)]">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--casa-blue)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
