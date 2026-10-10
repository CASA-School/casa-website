'use client';

import { useEffect, useState, type ReactNode } from 'react';

import {
  cancelReleaseAction,
  decideReleaseAction,
  listChangesAction,
  undoReleaseAction,
} from '@/app/(admin)/admin/(editor)/website/actions';
import { formatBerlin } from '@/lib/cms/berlin-time';
import type { ReleaseSummary } from '@/lib/cms/editor-types';
import type { CmsLocale } from '@/lib/cms/locales';
import { cn } from '@/lib/utils';

import styles from './editor.module.css';
import { I, Spinner, plural } from './parts';

/**
 * Every publish, newest first: what is scheduled, what waits for approval,
 * what is live, and what was taken back. A live release can be undone — the
 * texts before it are live again — and one that is not live yet withdrawn,
 * which returns its texts to drafts.
 */

export function HistoryDrawer({
  level,
  locales,
  onClose,
  onChanged,
  notify,
}: {
  level: 'view' | 'edit' | 'full';
  locales: CmsLocale[];
  onClose: () => void;
  onChanged: () => void;
  notify: (message: string) => void;
}) {
  const [releases, setReleases] = useState<ReleaseSummary[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    listChangesAction().then((result) => {
      if (result.ok) setReleases(result.releases);
    });

  useEffect(() => {
    listChangesAction().then((result) => {
      if (result.ok) setReleases(result.releases);
    });
  }, []);

  async function act(release: ReleaseSummary, action: 'undo' | 'cancel' | 'approve' | 'reject') {
    setBusy(release.id);
    const result =
      action === 'undo'
        ? await undoReleaseAction({ id: release.id })
        : action === 'cancel'
          ? await cancelReleaseAction({ id: release.id })
          : await decideReleaseAction({ id: release.id, approve: action === 'approve' });
    setBusy(null);
    if (!result.ok) return notify(result.error);
    notify(
      action === 'undo'
        ? 'Taken back off the site'
        : action === 'cancel'
          ? 'Withdrawn, back in drafts'
          : action === 'approve'
            ? 'Approved and live'
            : 'Sent back to drafts'
    );
    onChanged();
    void load();
  }

  const label = (code: string) => locales.find((locale) => locale.code === code)?.label ?? code;
  const sections: [string, ReleaseSummary[]][] = releases
    ? [
        ['Scheduled', releases.filter((release) => release.state === 'scheduled' && !release.live)],
        ['Waiting for approval', releases.filter((release) => release.state === 'pending')],
        ['Live', releases.filter((release) => release.live)],
        ['Earlier', releases.filter((release) => ['undone', 'rejected', 'cancelled'].includes(release.state))],
      ]
    : [];

  return (
    <aside
      aria-label="History"
      className={cn('absolute inset-y-0 right-0 z-40 flex w-full max-w-[420px] flex-col border-l border-ws-line bg-white shadow-[-24px_0_48px_-28px_rgba(15,23,42,0.35)]', styles.sheet)}
    >
      <header className="flex items-center gap-3 border-b border-ws-line-soft px-5 py-4">
        <span className="text-[var(--casa-text-subtle)]">{I.history}</span>
        <h2 className="flex-1 font-display text-xl font-semibold text-[var(--casa-ink)]">History</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg text-[var(--casa-text-subtle)] hover:bg-ws-sunk">
          {I.close}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        {!releases ? (
          <div className="grid h-32 place-items-center text-[var(--casa-text-subtle)]">
            <Spinner />
          </div>
        ) : releases.length === 0 ? (
          <p className="mt-10 text-center text-sm text-[var(--casa-text-subtle)]">Nothing has been published from the editor yet.</p>
        ) : (
          sections
            .filter(([, list]) => list.length)
            .map(([title, list]) => (
              <section key={title} className="mt-5">
                <p className="text-xs font-semibold text-[var(--casa-text-subtle)]">{title}</p>
                <ul className="mt-2 space-y-2.5">
                  {list.map((release) => {
                    const expanded = open === release.id;
                    const scopes = [...new Set(release.items.map((item) => item.scope))];
                    return (
                      <li key={release.id} className={cn('rounded-xl border border-ws-line p-3.5', !release.live && release.state !== 'scheduled' && release.state !== 'pending' && 'opacity-70')}>
                        <button type="button" onClick={() => setOpen(expanded ? null : release.id)} className="block w-full text-left" aria-expanded={expanded}>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm font-bold text-[var(--casa-ink)]">{plural(release.items.length, 'text', 'texts')}</span>
                            <span className="text-xs tabular-nums text-[var(--casa-text-subtle)]">{formatBerlin(release.publishAt ?? release.createdAt)}</span>
                          </div>
                          <div className="mt-0.5 truncate text-xs text-[var(--casa-text-subtle)]">
                            {[release.createdBy, scopes.join(', ')].filter(Boolean).join(' · ')}
                          </div>
                          {release.note ? <p className="mt-1.5 text-[0.8rem] text-[var(--casa-muted)]">{release.note}</p> : null}
                        </button>
                        {expanded ? (
                          <ul className={cn('mt-2.5 space-y-1.5 border-t border-ws-line-soft pt-2.5', styles.fade)}>
                            {release.items.map((item) => (
                              <li key={`${item.key}|${item.locale}`} className="text-[0.8rem] leading-snug">
                                <span className="font-semibold text-[var(--casa-ink)]">{item.label}</span>
                                <span className="text-[var(--casa-text-subtle)]"> · {label(item.locale)}</span>
                                <p className="mt-0.5 line-clamp-2 text-[var(--casa-muted)]">{item.value}</p>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {level === 'full' ? (
                          <div className="mt-2.5 flex flex-wrap justify-end gap-1.5">
                            {release.live && release.state !== 'undone' ? (
                              <Action busy={busy === release.id} onClick={() => void act(release, 'undo')}>
                                Undo
                              </Action>
                            ) : null}
                            {release.state === 'scheduled' && !release.live ? (
                              <Action busy={busy === release.id} onClick={() => void act(release, 'cancel')}>
                                Withdraw
                              </Action>
                            ) : null}
                            {release.state === 'pending' ? (
                              <>
                                <Action busy={busy === release.id} onClick={() => void act(release, 'reject')}>
                                  Send back
                                </Action>
                                <Action strong busy={busy === release.id} onClick={() => void act(release, 'approve')}>
                                  Approve and publish
                                </Action>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
        )}
      </div>
    </aside>
  );
}

function Action({ children, onClick, busy, strong }: { children: ReactNode; onClick: () => void; busy: boolean; strong?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors disabled:opacity-50',
        strong
          ? 'border border-ws-line-firm bg-white text-[var(--casa-ink)] hover:border-[var(--casa-blue)]/45'
          : 'text-[var(--casa-text-subtle)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]'
      )}
    >
      {busy ? <Spinner className="h-3.5 w-3.5" /> : null}
      {children}
    </button>
  );
}
