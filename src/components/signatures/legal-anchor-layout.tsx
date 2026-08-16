import Link from 'next/link';

export type LegalAnchorSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

type LegalAnchorLayoutProps = {
  title: string;
  intro: string;
  sections: LegalAnchorSection[];
};

export function LegalAnchorLayout({ title, intro, sections }: LegalAnchorLayoutProps) {
  return (
    <section className="rounded-3xl border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-soft)] md:p-7 print:shadow-none">
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">Signature</p>
      <h2 className="mt-2 text-3xl font-bold text-[var(--casa-ink)]">{title}</h2>
      <p className="mt-2 text-sm text-[var(--casa-muted)] md:text-base">{intro}</p>

      <nav aria-label="Legal section anchors" className="mt-4 rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-warm-soft)]/34 p-4 print:hidden">
        <ul className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <li key={section.id}>
              <Link href={`#${section.id}`} className="rounded-full border border-[color:var(--casa-sand)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--casa-ink)] hover:bg-[var(--casa-warm-soft)]">
                {section.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-5 space-y-5">
        {sections.map((section) => (
          <article key={section.id} id={section.id} className="scroll-mt-28 rounded-xl border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] p-4 print:border-[color:var(--casa-sand)]">
            <h3 className="text-lg font-bold text-[var(--casa-ink)]">{section.title}</h3>
            <div className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--casa-muted)]">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
