'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { findCandidatesAction } from './actions';
import { DialogFooter } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { Input } from '@/components/admin/ui';
import type { CandidateMatch } from '@/lib/admin/exams';
import type { T } from '@/lib/admin/i18n';

/**
 * „Buchen" on an exam sitting, the first step: who. A name or an address finds the learner, and
 * choosing one opens their booking wizard with this sitting already chosen (`?book=1&sitting=`). Nobody
 * found: „Neue Person anlegen" shows the person form (rendered on the server, passed in), filled with
 * what was typed, and it leads on to the same wizard.
 */
export function CandidatePicker({ sittingId, newPerson }: { sittingId: string; newPerson: ReactNode | null }) {
  const { t } = useWsLang();
  const [text, setText] = useState('');
  const [hits, setHits] = useState<CandidateMatch[]>([]);
  const [searched, setSearched] = useState('');
  const [adding, setAdding] = useState(false);
  const asked = useRef(0);
  const form = useRef<HTMLDivElement>(null);
  const term = text.trim();

  useEffect(() => {
    if (term.length < 2) return;
    const ask = ++asked.current;
    const timer = window.setTimeout(async () => {
      const found = await findCandidatesAction(sittingId, term);
      if (ask !== asked.current) return;
      setHits(found);
      setSearched(term);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [sittingId, term]);

  // The new person's form starts from what was typed: an address as the email, else the name.
  useEffect(() => {
    if (!adding || !form.current) return;
    const set = (name: string, value: string) => {
      const input = form.current?.querySelector<HTMLInputElement>(`input[name="${name}"]`);
      if (input && !input.value && value) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };
    if (term.includes('@')) set('email', term);
    else {
      const words = term.split(/\s+/).filter(Boolean);
      set('firstName', words.length > 1 ? words.slice(0, -1).join(' ') : (words[0] ?? ''));
      set('lastName', words.length > 1 ? words[words.length - 1] : '');
    }
  }, [adding, term]);

  if (adding && newPerson) {
    return (
      <div ref={form}>
        <button
          type="button"
          onClick={() => setAdding(false)}
          className="mb-3 inline-flex items-center gap-1 text-[0.8rem] font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)] [&_svg]:size-3.5 [&_svg]:rotate-180"
        >
          {Icon.chevronRight}
          {t('Andere Person suchen', 'Find someone else')}
        </button>
        {newPerson}
      </div>
    );
  }

  const shown = term.length >= 2 ? hits : [];
  const done = term.length >= 2 && searched === term;
  return (
    <div>
      <Input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('Name oder E-Mail', 'Name or email')}
        aria-label={t('Person suchen', 'Find a person')}
        autoComplete="off"
        autoFocus
      />
      {shown.length ? (
        <ul className="mt-3 divide-y divide-ws-line-soft rounded-xl ring-1 ring-ws-line ring-inset">
          {shown.map((hit) => (
            <li key={hit.id}>
              {hit.booked ? (
                <Link href={`/admin/people/${hit.id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-[var(--ws-row-hover)]">
                  <Who hit={hit} t={t} />
                  <span className="shrink-0 text-xs font-semibold text-[#17693a]">{t('Schon gebucht', 'Already booked')}</span>
                </Link>
              ) : (
                <Link
                  href={`/admin/people/${hit.id}?book=1&sitting=${sittingId}`}
                  className="group flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-[var(--ws-row-hover)]"
                >
                  <Who hit={hit} t={t} />
                  <span className="shrink-0 text-[var(--casa-text-subtle)] transition-transform group-hover:translate-x-0.5">{Icon.chevronRight}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : done ? (
        <p className="mt-3 text-sm text-[var(--casa-muted)]">{t(`Niemand gefunden für „${term}“.`, `Nobody found for “${term}”.`)}</p>
      ) : null}
      <DialogFooter
        start={
          newPerson ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 text-[0.84rem] font-semibold text-[var(--casa-accent-text)] hover:text-[var(--casa-accent-text-hover)] [&_svg]:size-4"
            >
              {Icon.plus}
              {term && done && !shown.length ? t(`„${term}“ neu anlegen`, `Add “${term}”`) : t('Neue Person anlegen', 'Add a new person')}
            </button>
          ) : undefined
        }
      >
        {null}
      </DialogFooter>
    </div>
  );
}

function Who({ hit, t }: { hit: CandidateMatch; t: T }) {
  return (
    <span className="min-w-0">
      <span className="block truncate font-semibold text-[var(--casa-ink)]">{hit.name}</span>
      <span className="block truncate text-xs text-[var(--casa-muted)]">
        {[hit.email, hit.bookings ? (hit.bookings === 1 ? t('1 Buchung', '1 booking') : t(`${hit.bookings} Buchungen`, `${hit.bookings} bookings`)) : null].filter(Boolean).join(' · ') ||
          t('Noch keine Buchung', 'No booking yet')}
      </span>
    </span>
  );
}
