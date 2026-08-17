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
    /*
      A CHILD OF THE "BEFORE YOU ENROL" BAND, not a peer of it.

      This used to be its own section: a shadowed, fully-bordered white card
      with an h2 the same size as the band heading above it. Two headings at the
      same weight in the same band read as two competing sections, when the
      relationship is actually parent -> child: the band states the four things
      to know, and this answers "so how does each format actually run?".

      So the shell is gone entirely — it sits open on the parent's background —
      and the heading drops to an h3 a step below the band's h2. The only
      painted surface left is the tinted outcomes rail, which is the one thing
      here that should draw the eye.
    */
    <section>
      <div className="text-center">
        <h3 className="text-xl font-bold leading-snug text-[var(--casa-ink)] md:text-2xl">{title}</h3>
        <p className="mx-auto mt-3 max-w-measure text-base leading-relaxed text-[var(--casa-muted)]">{description}</p>

        <div className="mt-6 flex justify-center gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Course format selector">
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

      <div className="mt-8 grid gap-0 overflow-hidden rounded-lg border border-[color:var(--casa-sand)] bg-white lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.82fr)]">
        <article className="p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{labels?.bestFor ?? 'Best for'}</p>
          <p className="mt-3 text-lg font-bold leading-snug text-[var(--casa-ink)]">{selected.bestFor}</p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{labels?.schedule ?? 'Schedule'}</dt>
              <dd className="mt-1 text-sm font-semibold leading-relaxed text-[var(--casa-ink)]">{selected.schedule}</dd>
            </div>
            <div className="rounded-lg border border-[color:var(--casa-sand)] bg-[var(--casa-bg)] px-4 py-3">
              <dt className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-muted)]">{labels?.intensity ?? 'Intensity'}</dt>
              <dd className="mt-1 text-sm font-semibold leading-relaxed text-[var(--casa-ink)]">{selected.intensity}</dd>
            </div>
          </dl>
        </article>

        <article className="bg-[var(--casa-warm-soft)]/42 p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">{labels?.outcomes ?? 'Likely outcomes'}</p>
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
