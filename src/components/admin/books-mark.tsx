'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { Icon } from './icons';
import { useWsLang } from './lang';
import { cn } from '@/lib/utils';

/**
 * Course books handed out (0087, Rahman 2026-10-23): as in SchoolMan, a book line is red until the
 * learner has their books and green after. Learners from abroad pay online and pick the books up on the
 * first day or a few days before; the colleague at the desk switches the line with one click — on the
 * booking, or beside the learner in the Tagesplan's class.
 */

export type BookLine = { id: string; label: string; handedOut: boolean; detail?: string | null };
export type SetBooks = (input: { chargeId: string; handedOut: boolean }) => Promise<{ ok: boolean }>;

const pill = (state: 'yes' | 'no' | 'some') =>
  cn(
    'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[0.76rem] font-bold whitespace-nowrap ring-1 ring-inset transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 disabled:opacity-70 [&_svg]:size-3.5',
    state === 'yes'
      ? 'bg-[#e5f5eb] text-[#137a3c] ring-[#bfe3c9] hover:bg-[#d6efdf]'
      : state === 'no'
        ? 'bg-[#fdecee] text-[#a3050f] ring-[#f5c2c7] hover:bg-[#fadadd]'
        : 'bg-[#fff4d6] text-[#6b4a00] ring-[#f2dc9b] hover:bg-[#ffecb8]'
  );

/** One book line: red until handed out, green after; a click switches it. `short` beside a learner. */
export function BooksToggle({ line, onSet, canEdit, short = false }: { line: BookLine; onSet: SetBooks; canEdit: boolean; short?: boolean }) {
  const { t } = useWsLang();
  const [on, setOn] = useState(line.handedOut);
  const [pending, start] = useTransition();
  const words = short
    ? on
      ? t('Bücher', 'Books')
      : t('Bücher offen', 'Books due')
    : on
      ? t('Ausgegeben', 'Handed out')
      : t('Nicht ausgegeben', 'Not handed out');
  const title = [line.label, line.detail].filter(Boolean).join(' · ');
  if (!canEdit) {
    return (
      <span className={cn(pill(on ? 'yes' : 'no'), 'cursor-default')} title={title}>
        {on ? Icon.check : null}
        {words}
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={pending}
      title={title}
      aria-label={on ? t(`${line.label}: ausgegeben`, `${line.label}: handed out`) : t(`${line.label}: nicht ausgegeben`, `${line.label}: not handed out`)}
      onClick={() => {
        const next = !on;
        setOn(next);
        start(async () => {
          const result = await onSet({ chargeId: line.id, handedOut: next });
          if (!result.ok) setOn(!next);
        });
      }}
      className={pill(on ? 'yes' : 'no')}
    >
      {on ? Icon.check : null}
      {words}
    </button>
  );
}

/** A learner's books beside their name: one line switches at once; several open a short list. */
export function BooksMark({ lines, onSet, canEdit }: { lines: BookLine[]; onSet: SetBooks; canEdit: boolean }) {
  const { t } = useWsLang();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', down);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  if (!lines.length) return null;
  if (lines.length === 1) return <BooksToggle key={`${lines[0].id}:${lines[0].handedOut}`} line={lines[0]} onSet={onSet} canEdit={canEdit} short />;
  const given = lines.filter((l) => l.handedOut).length;
  const state = given === lines.length ? 'yes' : given === 0 ? 'no' : 'some';
  return (
    <div ref={wrap} className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={pill(state)}>
        {state === 'yes' ? Icon.check : null}
        {t(`Bücher ${given}/${lines.length}`, `Books ${given}/${lines.length}`)}
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label={t('Bücher', 'Books')}
          className="absolute top-[calc(100%+6px)] right-0 z-40 w-[19rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-white shadow-[0_24px_56px_-22px_rgba(15,23,42,0.42),0_0_0_1px_rgba(15,23,42,0.08)]"
        >
          <p className="border-b border-ws-line-soft px-3.5 py-2.5 text-xs font-bold text-[var(--casa-muted)]">{t('Bücher', 'Books')}</p>
          <ul className="divide-y divide-ws-line-soft">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[0.84rem] font-semibold text-[var(--casa-ink)]" title={l.label}>
                  {l.label}
                </span>
                <BooksToggle key={`${l.id}:${l.handedOut}`} line={l} onSet={onSet} canEdit={canEdit} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
