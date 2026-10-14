'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  decideReleaseAction,
  listChangesAction,
  publishChangesAction,
  requestReviewAction,
} from '@/app/(admin)/admin/(editor)/website/actions';
import { useWsLang } from '@/components/admin/lang';
import { wsLocale, type WsLang } from '@/lib/admin/i18n';
import { formatBerlin } from '@/lib/cms/berlin-time';
import type { ChangeItem, ReleaseSummary } from '@/lib/cms/editor-types';
import type { CmsLocale } from '@/lib/cms/locales';
import { cn } from '@/lib/utils';

import { Diff, I, Modal, Spinner, plural } from './parts';

/**
 * Review and publish.
 *
 * Every unpublished draft across the site, grouped by the page it belongs to,
 * each as a word diff against what is live. Untick what should wait. Someone
 * with full rights publishes now or at a Bremen time; a colleague with edit
 * rights sends the set for approval, and it waits at the top of this same
 * screen for whoever publishes next.
 */

function tomorrowMorning(): string {
  const date = new Date(Date.now() + 24 * 3600 * 1000);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  return `${parts}T08:00`;
}

/** `2027-01-01T08:00` as "1 Jan 2027, 08:00" („1. Jan. 2027, 08:00“): the Bremen time the colleague chose, as they chose it. */
function wallClock(local: string, lang: WsLang): string {
  const [day, time] = local.split('T');
  const date = new Date(`${day}T12:00:00Z`).toLocaleDateString(wsLocale(lang), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `${date}, ${time}`;
}

export function ReviewDialog({
  level,
  locales,
  onClose,
  onDone,
  onFixTranslation,
  onChanged,
  notify,
}: {
  level: 'view' | 'edit' | 'full';
  locales: CmsLocale[];
  onClose: () => void;
  onDone: (message: string, releaseId?: string) => void;
  onFixTranslation: (key: string, locale: string) => void;
  onChanged: () => void;
  notify: (message: string) => void;
}) {
  const { t, lang } = useWsLang();
  const [changes, setChanges] = useState<ChangeItem[] | null>(null);
  const [pending, setPending] = useState<ReleaseSummary[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [at, setAt] = useState(tomorrowMorning);
  const [busy, setBusy] = useState<string | null>(null);

  const apply = useCallback(
    (result: Awaited<ReturnType<typeof listChangesAction>>) => {
      if (!result.ok) return notify(result.error);
      setChanges(result.changes);
      setPending(result.releases.filter((release) => release.state === 'pending'));
    },
    [notify]
  );
  const load = () => listChangesAction().then(apply);

  useEffect(() => {
    listChangesAction().then(apply);
  }, [apply]);

  const label = (code: string) => locales.find((locale) => locale.code === code)?.label ?? code;
  const id = (item: { key: string; locale: string }) => `${item.key}|${item.locale}`;
  const groups = useMemo(() => {
    const map = new Map<string, ChangeItem[]>();
    for (const item of changes ?? []) map.set(item.scope, [...(map.get(item.scope) ?? []), item]);
    return [...map.entries()];
  }, [changes]);
  const selected = (changes ?? []).filter((item) => !excluded.has(id(item)));
  const count = selected.length;

  async function submit() {
    setBusy('submit');
    const payload = { items: selected.map(({ key, locale }) => ({ key, locale })), note: note || null, at: when === 'later' ? at : null };
    if (level === 'full') {
      const result = await publishChangesAction(payload);
      setBusy(null);
      if (!result.ok) return notify(result.error);
      onDone(
        result.scheduled
          ? t(
              `${plural(result.count, 'Änderung', 'Änderungen')} geplant für ${wallClock(at, lang)}`,
              `${plural(result.count, 'change', 'changes')} scheduled for ${wallClock(at, lang)}`
            )
          : t(
              `${plural(result.count, 'Änderung', 'Änderungen')} live auf casa-bremen.de`,
              `${plural(result.count, 'change', 'changes')} live on casa-bremen.de`
            ),
        result.scheduled ? undefined : result.releaseId
      );
      return;
    }
    const result = await requestReviewAction(payload);
    setBusy(null);
    if (!result.ok) return notify(result.error);
    onDone(
      t(
        `${plural(result.count, 'Änderung', 'Änderungen')} zur Freigabe gesendet`,
        `${plural(result.count, 'change', 'changes')} sent for approval`
      )
    );
  }

  async function decide(release: ReleaseSummary, approve: boolean) {
    setBusy(release.id);
    const result = await decideReleaseAction({ id: release.id, approve });
    setBusy(null);
    if (!result.ok) return notify(result.error);
    notify(approve ? t('Freigegeben und live', 'Approved and live') : t('Zurück zu den Entwürfen geschickt', 'Sent back to drafts'));
    onChanged();
    void load();
  }

  return (
    <Modal label={t('Änderungen prüfen', 'Review changes')} onClose={onClose}>
      <header className="flex items-start gap-4 px-7 pt-6 pb-2">
        <div className="flex-1">
          <h2 className="font-display text-[1.65rem] font-semibold leading-tight text-[var(--casa-ink)]">
            {t('Änderungen prüfen', 'Review changes')}
          </h2>
          <p className="mt-1 text-sm text-[var(--casa-text-subtle)]">
            {changes === null
              ? ' '
              : level === 'full'
                ? t(
                    `${plural(changes.length, 'unveröffentlichte Änderung', 'unveröffentlichte Änderungen')} · live auf casa-bremen.de, sobald du veröffentlichst`,
                    `${plural(changes.length, 'unpublished change', 'unpublished changes')} · live on casa-bremen.de when you publish`
                  )
                : t(
                    `${plural(changes.length, 'unveröffentlichte Änderung', 'unveröffentlichte Änderungen')} · live nach der Freigabe`,
                    `${plural(changes.length, 'unpublished change', 'unpublished changes')} · live after approval`
                  )}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label={t('Schließen', 'Close')} className="grid h-9 w-9 place-items-center rounded-lg text-[var(--casa-text-subtle)] hover:bg-ws-sunk">
          {I.close}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-4">
        {changes === null ? (
          <div className="grid h-40 place-items-center text-[var(--casa-text-subtle)]">
            <Spinner />
          </div>
        ) : null}

        {level === 'full' && pending.length ? (
          <section className="mt-3" aria-label={t('Wartet auf Freigabe', 'Waiting for approval')}>
            <p className="text-xs font-semibold text-[var(--casa-text-subtle)]">{t('Wartet auf Freigabe', 'Waiting for approval')}</p>
            <div className="mt-2 space-y-3">
              {pending.map((release) => (
                <article key={release.id} className="rounded-xl border border-[#ecd68a] bg-[var(--casa-sun-tint)]/50 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="flex-1 text-sm font-semibold text-[var(--casa-ink)]">
                      {t(
                        `${release.createdBy ?? 'Jemand aus dem Team'} möchte ${plural(release.items.length, 'Text', 'Texte')} veröffentlichen`,
                        `${release.createdBy ?? 'A colleague'} asks to publish ${plural(release.items.length, 'text', 'texts')}`
                      )}
                      <span className="ml-2 font-normal text-[var(--casa-text-subtle)]">{formatBerlin(release.createdAt, wsLocale(lang))}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => void decide(release, false)}
                      disabled={busy !== null}
                      className="h-8 rounded-lg px-3 text-xs font-semibold text-[var(--casa-text-subtle)] hover:bg-white"
                    >
                      {t('Zurückschicken', 'Send back')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void decide(release, true)}
                      disabled={busy !== null}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-ws-line-firm bg-white px-3 text-xs font-semibold text-[var(--casa-ink)] hover:border-[var(--casa-blue)]/45"
                    >
                      {busy === release.id ? <Spinner className="h-3.5 w-3.5" /> : I.check}
                      {t('Freigeben und veröffentlichen', 'Approve and publish')}
                    </button>
                  </div>
                  {release.note ? <p className="mt-1 text-sm text-[var(--casa-muted)]">{release.note}</p> : null}
                  <ul className="mt-3 space-y-2.5">
                    {release.items.map((item) => (
                      <li key={id(item)} className="rounded-lg bg-white px-3 py-2.5">
                        <div className="text-xs font-semibold text-[var(--casa-text-subtle)]">
                          {item.scope} · {item.label} · {label(item.locale)}
                        </div>
                        <Diff before={item.previous} after={item.value} className="mt-1" />
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {changes && changes.length === 0 && !pending.length ? (
          <div className="grid h-40 place-items-center text-center">
            <div>
              <p className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--casa-success-text)]">
                {I.check} {t('Alles ist live', 'Everything is live')}
              </p>
              <p className="mt-1 text-sm text-[var(--casa-text-subtle)]">{t('Keine unveröffentlichten Änderungen', 'No unpublished changes')}</p>
            </div>
          </div>
        ) : null}

        {groups.map(([scope, items]) => (
          <section key={scope} className="mt-5" aria-label={scope}>
            <p className="flex items-center gap-2 text-xs font-semibold text-[var(--casa-text-subtle)]">
              {items[0]?.scope.startsWith('Every') ? I.link : I.page}
              {scope}
              <span className="font-normal">· {plural(items.length, t('Änderung', 'change'), t('Änderungen', 'changes'))}</span>
            </p>
            <ul className="mt-1">
              {items.map((item) => {
                const key = id(item);
                const checked = !excluded.has(key);
                return (
                  <li key={key} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3.5 border-b border-ws-line-soft py-4 last:border-b-0">
                    <input
                      id={`change-${key}`}
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
                      <label htmlFor={`change-${key}`} className="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-bold text-[var(--casa-ink)]">
                        {item.section} · {item.label}
                        <span className="rounded-full bg-ws-sunk px-2 py-0.5 text-[0.7rem] font-semibold text-[var(--casa-muted)]">{label(item.locale)}</span>
                        {item.by ? <span className="text-xs font-normal text-[var(--casa-text-subtle)]">{item.by}</span> : null}
                      </label>
                      <Diff before={item.previous} after={item.value} className={cn('mt-1.5', !checked && 'opacity-50')} />
                      {item.staleLocales.map((code) => (
                        <div key={code} className="mt-2 flex items-center gap-3 rounded-lg bg-[var(--casa-sun-tint)] px-3 py-2 text-[0.8rem] font-medium text-[#5c4900]">
                          <span className="flex-1">{t(`${label(code)} hat noch den alten Text`, `${label(code)} still says the old text`)}</span>
                          {level !== 'view' ? (
                            <button type="button" onClick={() => onFixTranslation(item.key, code)} className="font-semibold text-[var(--casa-accent-text)] hover:underline">
                              {t(`${label(code)} aktualisieren`, `Update ${label(code)}`)}
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {level !== 'view' && changes && changes.length > 0 ? (
        <footer className="space-y-3 border-t border-ws-line-soft px-7 py-4">
          <label htmlFor="release-note" className="sr-only">
            {t('Notiz', 'Note')}
          </label>
          <input
            id="release-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('Notiz für den Verlauf (optional)', 'Note for the history (optional)')}
            className="h-10 w-full rounded-lg border border-ws-line-firm px-3 text-sm outline-none focus:border-[var(--casa-blue)] focus:shadow-[0_0_0_3px_rgba(0,159,227,0.16)]"
          />
          <div className="flex flex-wrap items-center justify-end gap-2">
          {level === 'full' ? (
            <div className="mr-auto flex items-center gap-2">
              <div role="radiogroup" aria-label={t('Wann', 'When')} className="inline-flex rounded-lg bg-ws-sunk p-0.5">
                {(['now', 'later'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={when === option}
                    onClick={() => setWhen(option)}
                    className={cn(
                      'inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-[0.8rem] font-semibold',
                      when === option ? 'bg-white text-[var(--casa-ink)] shadow-[0_1px_2px_rgba(15,23,42,0.14)]' : 'text-[var(--casa-text-subtle)]'
                    )}
                  >
                    {option === 'later' ? I.calendar : null}
                    {option === 'now' ? t('Jetzt', 'Now') : t('Planen', 'Schedule')}
                  </button>
                ))}
              </div>
              {when === 'later' ? (
                <>
                  <label htmlFor="release-at" className="sr-only">
                    {t('Veröffentlichen um (Bremer Zeit)', 'Publish at (Bremen time)')}
                  </label>
                  <input
                    id="release-at"
                    type="datetime-local"
                    value={at}
                    onChange={(event) => setAt(event.target.value)}
                    className="h-10 rounded-lg border border-ws-line-firm px-2.5 text-sm tabular-nums outline-none focus:border-[var(--casa-blue)]"
                  />
                </>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={count === 0 || busy !== null}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--casa-ink-deep)] px-5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.18)] hover:bg-[var(--casa-ink-deep-hover)] disabled:bg-ws-line-firm disabled:shadow-none"
          >
            {busy === 'submit' ? <Spinner /> : null}
            {level === 'full'
              ? when === 'later'
                ? t(`${plural(count, 'Änderung', 'Änderungen')} planen`, `Schedule ${plural(count, 'change', 'changes')}`)
                : t(`${plural(count, 'Änderung', 'Änderungen')} veröffentlichen`, `Publish ${plural(count, 'change', 'changes')}`)
              : t(`${count} zur Freigabe senden`, `Send ${count} for approval`)}
          </button>
          </div>
        </footer>
      ) : null}
    </Modal>
  );
}
