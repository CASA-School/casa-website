'use client';

import Link from 'next/link';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';

import type { EditorFacts } from '@/lib/cms/editor-types';
import { factsIn, NO_VALUE, type FactDef } from '@/lib/cms/facts';
import { cn } from '@/lib/utils';

import styles from './editor.module.css';
import { I } from './parts';

/**
 * Live values in the text popup (src/lib/cms/facts.ts).
 *
 * A text names a price or a date as `{course.intensive-german.next-start}` and
 * the page fills it in each time it renders. Here a colleague sees which ones a
 * text uses and what each says today, inserts one from a searchable list, and
 * finds the screen where the value itself is changed — never in the text.
 */

type Screens = Record<string, { label: string; href: string }>;

const FACT_TOKEN = /(\{[a-zA-Z][\w-]*(?:\.[\w-]+)+\})/;
const IS_FACT_TOKEN = /^\{[a-zA-Z][\w-]*(?:\.[\w-]+)+\}$/;

/** A text with each live value shown as a pill holding what it says today. */
export function TextWithFacts({ text, facts, locale }: { text: string; facts: EditorFacts; locale: string }) {
  const values = facts.values[locale] ?? facts.values.en ?? {};
  const byId = useMemo(() => new Map(facts.defs.map((def) => [def.id, def])), [facts.defs]);
  return (
    <>
      {text.split(FACT_TOKEN).map((part, index) => {
        const id = IS_FACT_TOKEN.test(part) ? part.slice(1, -1) : null;
        if (!id) return <Fragment key={index}>{part}</Fragment>;
        const def = byId.get(id);
        return (
          <span
            key={index}
            title={def ? `${def.group} · ${def.label}` : id}
            className="mx-0.5 inline-flex items-center rounded-md bg-[var(--casa-blue-tint)] px-1.5 text-[0.92em] font-semibold text-[var(--casa-accent-text)]"
          >
            {values[id] ?? NO_VALUE}
          </span>
        );
      })}
    </>
  );
}

/** The live values a text uses, what each says today, and where it is changed. */
export function UsedLiveValues({
  text,
  facts,
  locale,
  screens,
}: {
  text: string;
  facts: EditorFacts;
  locale: string;
  screens: Screens;
}) {
  const byId = new Map(facts.defs.map((def) => [def.id, def]));
  // An unknown name gets its own warning in the popup, not a row here.
  const ids = factsIn(text).filter((id) => byId.has(id));
  if (!ids.length) return null;
  const values = facts.values[locale] ?? facts.values.en ?? {};
  return (
    <ul className="mt-2.5 space-y-1" aria-label="Live values in this text">
      {ids.map((id) => {
        const def = byId.get(id)!;
        const screen = screens[def.source];
        return (
          <li key={id} className="flex items-center gap-2 rounded-lg bg-ws-sunk px-2.5 py-1.5 text-[0.78rem]">
            <span className="shrink-0 text-[var(--casa-muted)]">{I.data}</span>
            <span className="min-w-0 flex-1 truncate">
              <span className="font-semibold text-[var(--casa-ink)]">{`${def.group} · ${def.label}`}</span>
              <span className="text-[var(--casa-text-subtle)]"> — {values[id] ?? 'no value right now'}</span>
            </span>
            {screen ? (
              <Link
                href={screen.href}
                target="_blank"
                title={`Change it in ${screen.label}`}
                className="inline-flex shrink-0 items-center gap-1 font-semibold text-[var(--casa-accent-text)] hover:underline"
              >
                {screen.label}
                {I.external}
              </Link>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** The searchable list a live value is inserted from. */
export function LiveValuePicker({
  facts,
  locale,
  onPick,
  onClose,
}: {
  facts: EditorFacts;
  locale: string;
  onPick: (def: FactDef) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const values = useMemo(() => facts.values[locale] ?? facts.values.en ?? {}, [facts.values, locale]);

  useEffect(() => input.current?.focus({ preventScroll: true }), []);

  const groups = useMemo(() => {
    const words = query.toLocaleLowerCase('de').split(/\s+/).filter(Boolean);
    const matches = facts.defs.filter((def) => {
      const haystack = `${def.group} ${def.label} ${def.source} ${values[def.id] ?? ''}`.toLocaleLowerCase('de');
      return words.every((word) => haystack.includes(word));
    });
    const out = new Map<string, FactDef[]>();
    for (const def of matches) out.set(def.group, [...(out.get(def.group) ?? []), def]);
    return [...out];
  }, [facts.defs, query, values]);

  return (
    <div
      className={cn('mt-2.5 overflow-hidden rounded-xl border border-ws-line-firm bg-white', styles.fade)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <label className="flex items-center gap-2 border-b border-ws-line-soft px-3">
        <span className="text-[var(--casa-text-subtle)]">{I.search}</span>
        <span className="sr-only">Find a live value</span>
        <input
          ref={input}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Course, exam, price, date…"
          className="h-10 min-w-0 flex-1 bg-transparent text-[0.85rem] text-[var(--casa-ink)] outline-none placeholder:text-[var(--casa-text-subtle)]"
        />
      </label>
      <div className="max-h-60 overflow-y-auto py-1">
        {groups.length ? (
          groups.map(([group, defs]) => (
            <div key={group} className="py-1">
              <div className="px-3 pt-1 pb-0.5 text-[0.7rem] font-semibold text-[var(--casa-text-subtle)]">{group}</div>
              {defs.map((def) => (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => onPick(def)}
                  className="flex w-full items-center gap-3 px-3 py-1.5 text-left text-[0.82rem] hover:bg-ws-sunk focus-visible:bg-ws-sunk focus-visible:outline-none"
                >
                  <span className="flex-1 font-semibold text-[var(--casa-ink)]">{def.label}</span>
                  <span className={cn('tabular-nums', values[def.id] ? 'text-[var(--casa-muted)]' : 'text-[var(--casa-text-subtle)] italic')}>
                    {values[def.id] ?? 'none right now'}
                  </span>
                </button>
              ))}
            </div>
          ))
        ) : (
          <p className="px-3 py-3 text-[0.82rem] text-[var(--casa-text-subtle)]">No live value matches.</p>
        )}
      </div>
    </div>
  );
}
