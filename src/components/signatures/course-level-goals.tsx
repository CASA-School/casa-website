
type LevelGoalItem = {
  level: string;
  textbook: 'netzwerk' | 'context';
  focus: string;
};

type CourseLevelGoalsProps = {
  title: string;
  description: string;
  levels: LevelGoalItem[];
  practices: string[];
  practiceTitle?: string;
  eyebrow?: string;
  locale: 'en' | 'de';
};

export function CourseLevelGoals({
  title,
  description,
  levels,
  practices,
  practiceTitle = 'What you will practice',
  eyebrow = 'Course Goals',
  locale = 'en',
}: CourseLevelGoalsProps) {
  const netzwerkLevels = levels.filter((l) => l.textbook === 'netzwerk');
  const contextLevels = levels.filter((l) => l.textbook === 'context');

  const copy = {
    netzwerkLabel: locale === 'de' ? 'Lehrwerk Netzwerk (A1 – B1)' : 'Netzwerk Textbook (A1 – B1)',
    netzwerkDesc: locale === 'de' ? 'Fokus auf Alltagswörter, Grammatik-Grundlagen und Dialoge' : 'Focus on daily vocabulary, grammar basics, and dialogues',
    // The Klett series is spelled "Kontext" (see src/config/content/klett-textbooks.ts).
    contextLabel: locale === 'de' ? 'Lehrwerk Kontext (B1+ – C1)' : 'Kontext Textbook (B1+ – C1)',
    contextDesc: locale === 'de' ? 'Fokus auf komplexe Satzstrukturen, Fachsprache und Diskussionen' : 'Focus on complex structures, professional terminology, and debate',
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-[color:var(--casa-sand)] bg-white shadow-[var(--shadow-card)]">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)] border-b border-[color:var(--casa-sand)]">
        {/* Main Content Area */}
        <div className="p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[var(--casa-muted)]">{description}</p>
        </div>

        {/* Practice Highlights Side Rail */}
        <aside className="bg-[var(--casa-blue)]/5 p-6 border-l lg:border-l border-[color:var(--casa-sand)] md:p-8 flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{practiceTitle}</p>
          <ul className="mt-4 space-y-3">
            {practices.slice(0, 4).map((practice) => (
              <li key={practice} className="flex gap-2.5 text-sm leading-relaxed text-[var(--casa-ink)] font-medium">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]" />
                <span>{practice}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* Level Columns Grid */}
      <div className="p-6 md:p-8 bg-slate-50/20">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Netzwerk Column */}
          {netzwerkLevels.length > 0 ? (
            <div className="rounded-xl border border-[color:var(--casa-sand)] bg-white p-5 md:p-6 shadow-[var(--shadow-soft)] flex flex-col">
              <div className="border-b border-[color:var(--casa-sand)]/60 pb-4 mb-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--casa-blue)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--casa-accent-text)]">
                  {copy.netzwerkLabel}
                </span>
                <p className="mt-2 text-xs text-[var(--casa-muted)] font-medium leading-relaxed">
                  {copy.netzwerkDesc}
                </p>
              </div>
              <ul className="space-y-4 flex-1">
                {netzwerkLevels.map((item) => (
                  <li key={item.level} className="flex gap-3 items-start">
                    <span className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--casa-accent-surface)] px-2 py-1 min-w-[2rem] text-xs font-bold text-white leading-none">
                      {item.level}
                    </span>
                    <p className="text-sm font-semibold leading-relaxed text-[var(--casa-ink)] pt-0.5">
                      {item.focus}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Context Column */}
          {contextLevels.length > 0 ? (
            <div className="rounded-xl border border-[color:var(--casa-sand)] bg-white p-5 md:p-6 shadow-[var(--shadow-soft)] flex flex-col">
              <div className="border-b border-[color:var(--casa-sand)]/60 pb-4 mb-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-amber-800 border border-amber-200">
                  {copy.contextLabel}
                </span>
                <p className="mt-2 text-xs text-[var(--casa-muted)] font-medium leading-relaxed">
                  {copy.contextDesc}
                </p>
              </div>
              <ul className="space-y-4 flex-1">
                {contextLevels.map((item) => (
                  <li key={item.level} className="flex gap-3 items-start">
                    <span className="inline-flex shrink-0 items-center justify-center rounded-lg bg-amber-700 px-2 py-1 min-w-[2rem] text-xs font-bold text-white leading-none">
                      {item.level}
                    </span>
                    <p className="text-sm font-semibold leading-relaxed text-[var(--casa-ink)] pt-0.5">
                      {item.focus}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
