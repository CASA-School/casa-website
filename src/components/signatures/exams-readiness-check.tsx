'use client';

import { useMemo, useState } from 'react';

type ExamsReadinessCheckProps = {
  title: string;
  description: string;
  checklist: string[];
};

export function ExamsReadinessCheck({ title, description, checklist }: ExamsReadinessCheckProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const completed = useMemo(
    () => checklist.filter((item) => checked[item]).length,
    [checked, checklist]
  );

  const progress = checklist.length > 0 ? Math.round((completed / checklist.length) * 100) : 0;

  return (
    <section className="rounded-3xl border border-[color:var(--casa-sand)] bg-white p-6 shadow-[var(--shadow-soft)] md:p-7">
      <p className="text-xs font-semibold uppercase tracking-eyebrow text-[var(--casa-accent-text)]">Signature</p>
      <h2 className="mt-2 text-3xl font-bold text-[var(--casa-ink)]">{title}</h2>
      <p className="mt-2 text-sm text-[var(--casa-muted)] md:text-base">{description}</p>

      <div className="mt-4 rounded-full bg-[var(--casa-warm-soft)] p-1">
        <div
          className="h-2 rounded-full bg-[var(--casa-blue)] transition-all"
          style={{ width: `${progress}%` }}
          aria-hidden
        />
      </div>
      <p className="mt-1 text-xs font-semibold text-[var(--casa-muted)]">{progress}% ready</p>

      <ul className="mt-4 space-y-2">
        {checklist.map((item) => (
          <li key={item} className="rounded-xl bg-[var(--casa-surface-wash)] px-3 py-2.5">
            <label className="flex items-start gap-2 text-sm text-[var(--casa-ink)]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded-sm border-[color:var(--casa-sand)]"
                checked={Boolean(checked[item])}
                onChange={(event) => setChecked((current) => ({ ...current, [item]: event.target.checked }))}
              />
              <span>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
