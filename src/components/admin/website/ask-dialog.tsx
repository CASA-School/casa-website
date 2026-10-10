'use client';

import { useMemo, useState } from 'react';

import { aiChangeRequestAction, saveDraftsAction } from '@/app/(admin)/admin/(editor)/website/actions';
import type { Proposal } from '@/lib/cms/editor-types';
import type { CmsLocale } from '@/lib/cms/locales';
import { cn } from '@/lib/utils';

import styles from './editor.module.css';
import { Diff, I, Modal, Spinner, plural } from './parts';

/**
 * Ask for a change, in plain words.
 *
 * "The evening course now costs from 378 €" — the writing help reads the texts
 * on this page and every editable text that mentions the request's words, in
 * every language, and proposes the edits. They arrive as word diffs with a
 * reason each; the ticked ones become drafts, which then go through review like
 * anything typed by hand. Nothing here publishes.
 */

const EXAMPLES = [
  'Mention on every course page that new intensive courses start every month.',
  'Shorten the “Good to know” paragraphs on this page, keeping every fact.',
  'Make the next steps on this page sound warmer.',
];

export function AskDialog({
  pageKeys,
  locales,
  onClose,
  onApplied,
}: {
  pageKeys: string[];
  locales: CmsLocale[];
  onClose: () => void;
  onApplied: (count: number) => void;
}) {
  const [instruction, setInstruction] = useState('');
  const [phase, setPhase] = useState<'input' | 'loading' | 'results'>('input');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const id = (proposal: Proposal) => `${proposal.key}|${proposal.locale}`;
  const label = (code: string) => locales.find((locale) => locale.code === code)?.label ?? code;
  const groups = useMemo(() => {
    const map = new Map<string, Proposal[]>();
    for (const proposal of proposals) map.set(proposal.scope, [...(map.get(proposal.scope) ?? []), proposal]);
    return [...map.entries()];
  }, [proposals]);
  const chosen = proposals.filter((proposal) => !excluded.has(id(proposal)));

  async function ask() {
    setPhase('loading');
    setError(null);
    const result = await aiChangeRequestAction({ instruction, pageKeys });
    if (!result.ok) {
      setError(result.error);
      setPhase('input');
      return;
    }
    setProposals(result.proposals);
    setExcluded(new Set());
    setPhase('results');
  }

  async function apply() {
    setSaving(true);
    const result = await saveDraftsAction(chosen.map(({ key, locale, value }) => ({ key, locale, value })));
    setSaving(false);
    if (!result.ok) return setError(result.error);
    onApplied(result.count);
  }

  return (
    <Modal label="Ask for a change" onClose={onClose} width="max-w-[720px]">
      <header className="flex items-start gap-4 px-7 pt-6 pb-1">
        <span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--casa-blue-tint)] text-[var(--casa-accent-text)]">
          {I.sparkle}
        </span>
        <div className="flex-1">
          <h2 className="font-display text-[1.6rem] font-semibold leading-tight text-[var(--casa-ink)]">Ask for a change</h2>
          <p className="mt-1 text-sm text-[var(--casa-text-subtle)]">Proposals arrive as drafts for you to review</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg text-[var(--casa-text-subtle)] hover:bg-ws-sunk">
          {I.close}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-7 pt-4 pb-5">
        <label htmlFor="ask-instruction" className="sr-only">
          What should change?
        </label>
        <textarea
          id="ask-instruction"
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey) && instruction.trim().length > 3) void ask();
          }}
          rows={3}
          disabled={phase === 'loading'}
          placeholder="What should change? For example: the evening course now costs from 378 €, update every text that mentions it."
          className="block w-full resize-none rounded-xl border border-ws-line-firm px-4 py-3 text-[0.95rem] leading-relaxed outline-none focus:border-[var(--casa-blue)] focus:shadow-[0_0_0_3px_rgba(0,159,227,0.16)] disabled:bg-ws-sunk"
        />

        {phase === 'input' ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setInstruction(example)}
                className="rounded-full border border-ws-line px-3 py-1.5 text-left text-xs font-medium text-[var(--casa-muted)] hover:border-ws-line-firm hover:text-[var(--casa-ink)]"
              >
                {example}
              </button>
            ))}
          </div>
        ) : null}

        {error ? <p className="mt-3 text-sm font-medium text-[var(--casa-danger-text)]">{error}</p> : null}

        {phase === 'loading' ? (
          <div className={cn('mt-5 space-y-4', styles.fade)} aria-label="Reading the texts">
            {[0, 1, 2].map((row) => (
              <div key={row} className="space-y-2">
                <div className={cn('h-3 w-40 rounded', styles.shimmer)} />
                <div className={cn('h-3 w-full rounded', styles.shimmer)} />
                <div className={cn('h-3 w-10/12 rounded', styles.shimmer)} />
              </div>
            ))}
          </div>
        ) : null}

        {phase === 'results' ? (
          proposals.length === 0 ? (
            <p className="mt-6 text-center text-sm text-[var(--casa-text-subtle)]">No text needs to change for this request.</p>
          ) : (
            groups.map(([scope, items]) => (
              <section key={scope} className={cn('mt-5', styles.fade)} aria-label={scope}>
                <p className="flex items-center gap-2 text-xs font-semibold text-[var(--casa-text-subtle)]">
                  {scope.startsWith('Every') ? I.link : I.page}
                  {scope}
                </p>
                <ul>
                  {items.map((proposal) => {
                    const key = id(proposal);
                    const checked = !excluded.has(key);
                    return (
                      <li key={key} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3.5 border-b border-ws-line-soft py-4 last:border-b-0">
                        <input
                          id={`proposal-${key}`}
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setExcluded((previous) => {
                              const next = new Set(previous);
                              if (checked) next.add(key);
                              else next.delete(key);
                              return next;
                            })
                          }
                          className="mt-0.5 h-4 w-4 cursor-pointer accent-[var(--casa-ink-deep)]"
                        />
                        <div className="min-w-0">
                          <label htmlFor={`proposal-${key}`} className="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-bold text-[var(--casa-ink)]">
                            {proposal.label}
                            <span className="rounded-full bg-ws-sunk px-2 py-0.5 text-[0.7rem] font-semibold text-[var(--casa-muted)]">{label(proposal.locale)}</span>
                          </label>
                          {proposal.reason ? <p className="mt-0.5 text-xs text-[var(--casa-text-subtle)]">{proposal.reason}</p> : null}
                          <Diff before={proposal.previous} after={proposal.value} className={cn('mt-1.5', !checked && 'opacity-50')} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )
        ) : null}
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-ws-line-soft px-7 py-4">
        {phase === 'results' ? (
          <button
            type="button"
            onClick={() => setPhase('input')}
            className="h-10 rounded-lg px-4 text-sm font-semibold text-[var(--casa-text-subtle)] hover:bg-ws-sunk"
          >
            Ask again
          </button>
        ) : null}
        {phase === 'results' && proposals.length ? (
          <button
            type="button"
            onClick={() => void apply()}
            disabled={chosen.length === 0 || saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--casa-ink-deep)] px-5 text-sm font-semibold text-white hover:bg-[var(--casa-ink-deep-hover)] disabled:bg-ws-line-firm"
          >
            {saving ? <Spinner /> : null}
            Add {plural(chosen.length, 'draft', 'drafts')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void ask()}
            disabled={instruction.trim().length < 4 || phase === 'loading'}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--casa-ink-deep)] px-5 text-sm font-semibold text-white hover:bg-[var(--casa-ink-deep-hover)] disabled:bg-ws-line-firm"
          >
            {phase === 'loading' ? <Spinner /> : I.sparkle}
            Find the texts
          </button>
        )}
      </footer>
    </Modal>
  );
}
