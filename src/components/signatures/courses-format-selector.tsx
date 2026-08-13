'use client';

import { useMemo, useState } from 'react';

type CourseFormatItem = {
  id: string;
  title: string;
  bestFor: string;
  outcomes: string[];
  schedule: string;
  intensity: string;
  facts?: string[];
};

type CoursesFormatSelectorProps = {
  title: string;
  description: string;
  items: CourseFormatItem[];
  labels?: {
    signature?: string;
    bestFor?: string;
    schedule?: string;
    intensity?: string;
    outcomes?: string;
    facts?: string;
  };
};

export function CoursesFormatSelector({ title, description, items, labels }: CoursesFormatSelectorProps) {
  const [selectedId, setSelectedId] = useState(items[0]?.id || '');

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0],
    [items, selectedId]
  );

  if (!selected) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-lg border border-[color:var(--casa-sand)] bg-white shadow-[var(--shadow-card)]">
      <div className="p-5 md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{labels?.signature ?? 'Signature'}</p>
        <h2 className="mt-2 text-2xl font-bold leading-tight text-[var(--casa-ink)] sm:text-3xl">{title}</h2>
        <p className="mt-3 max-w-4xl text-base leading-relaxed text-[var(--casa-muted)] md:text-lg">{description}</p>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Course format selector">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected.id === item.id}
              onClick={() => setSelectedId(item.id)}
              className={
                selected.id === item.id
                  ? 'shrink-0 rounded-lg border border-[color:var(--casa-ink-deep)] bg-[var(--casa-ink-deep)] px-3.5 py-2 text-xs font-bold text-white shadow-[var(--shadow-soft)]'
                  : 'shrink-0 rounded-lg border border-[color:var(--casa-sand)] bg-white px-3.5 py-2 text-xs font-bold text-[var(--casa-muted)] transition-colors hover:bg-[var(--casa-warm-soft)] hover:text-[var(--casa-ink)]'
              }
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-0 border-t border-[color:var(--casa-sand)] lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.82fr)]">
        <article className="p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{labels?.bestFor ?? 'Best for'}</p>
          <p className="mt-3 text-lg font-bold leading-snug text-[var(--casa-ink)]">{selected.bestFor}</p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--casa-muted)]">{labels?.schedule ?? 'Schedule'}</dt>
              <dd className="mt-1 text-sm font-semibold leading-relaxed text-[var(--casa-ink)]">{selected.schedule}</dd>
            </div>
            <div className="rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--casa-muted)]">{labels?.intensity ?? 'Intensity'}</dt>
              <dd className="mt-1 text-sm font-semibold leading-relaxed text-[var(--casa-ink)]">{selected.intensity}</dd>
            </div>
          </dl>
        </article>

        <article className="bg-[var(--casa-warm-soft)]/42 p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--casa-accent-text)]">{labels?.outcomes ?? 'Likely outcomes'}</p>
          <ul className="mt-4 space-y-3">
            {selected.outcomes.slice(0, 3).map((outcome) => (
              <li key={outcome} className="flex gap-3 text-base leading-relaxed text-[var(--casa-ink)]">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--casa-blue)]" />
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
