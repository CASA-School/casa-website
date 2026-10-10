'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import {
  addCommentAction,
  aiAssistAction,
  confirmTranslationAction,
  discardDraftAction,
  resolveCommentAction,
  saveDraftAction,
  slotDetailAction,
} from '@/app/(admin)/admin/(editor)/website/actions';
import { formatBerlin } from '@/lib/cms/berlin-time';
import { placeholders } from '@/lib/cms/copy-key';
import { initialsOf, type CommentEntry, type LocaleStatus, type PresenceEntry, type SlotState, type VersionEntry } from '@/lib/cms/editor-types';
import type { CmsLocale } from '@/lib/cms/locales';
import { KIND_LABELS } from '@/lib/cms/slot-kinds';
import type { Rect } from '@/lib/cms/protocol';
import { cn } from '@/lib/utils';

import styles from './editor.module.css';
import { Avatar, I, Spinner, StatusDot, plural, statusLabel } from './parts';

/**
 * The popup a text opens in.
 *
 * Anchored to the text on the page, with a caret pointing at it, above or below
 * whichever has the room. One tab per language, each with its state; German
 * is the source, and any other language shows the German above its own field.
 * The field grows with the text and measures it against the slot's limit.
 * Writing help, history and comments sit below, out of the way until asked
 * for. Closing keeps what was typed as a draft: nothing here is ever live
 * before someone publishes it.
 */

type AiState = {
  mode: 'shorten' | 'voice' | 'translate';
  loading: boolean;
  options: string[];
  notes: string[];
  error: string | null;
};

const SIE = /\b(Sie|Ihnen|Ihre|Ihren|Ihrem|Ihrer)\b/;

const valuesOf = (slot: SlotState, locales: readonly CmsLocale[]): Record<string, string> =>
  Object.fromEntries(locales.map((locale) => [locale.code, slot.locales[locale.code]?.value ?? '']));

const RELEASE_LABEL: Record<VersionEntry['state'], string> = {
  pending: 'Waiting for approval',
  scheduled: 'Scheduled',
  published: 'Published',
  rejected: 'Sent back',
  undone: 'Undone',
  cancelled: 'Withdrawn',
};

export function TextPopover({
  slot,
  anchor,
  bounds,
  locales,
  initialLocale,
  pageLocale,
  canEdit,
  lockedBy,
  aiEnabled,
  onPreview,
  onSaved,
  onClose,
  notify,
}: {
  slot: SlotState;
  anchor: Rect;
  bounds: { width: number; height: number };
  locales: CmsLocale[];
  initialLocale: string;
  pageLocale: string;
  canEdit: boolean;
  lockedBy: PresenceEntry | null;
  aiEnabled: boolean;
  onPreview: (locale: string, value: string) => void;
  onSaved: (slot: SlotState | null) => void;
  onClose: () => void;
  notify: (message: string) => void;
}) {
  const source = locales.find((locale) => locale.source) ?? locales[0];
  const [tab, setTab] = useState(() => (slot.locales[initialLocale] ? initialLocale : source.code));
  const [working, setWorking] = useState<Record<string, string>>(() => valuesOf(slot, locales));
  const [saving, setSaving] = useState(false);
  const [panel, setPanel] = useState<null | 'history' | 'comments'>(null);
  const [detail, setDetail] = useState<{ versions: VersionEntry[]; comments: CommentEntry[] } | null>(null);
  const [ai, setAi] = useState<AiState | null>(null);
  const [comment, setComment] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);
  const root = useRef<HTMLDivElement>(null);

  const readOnly = !canEdit || Boolean(lockedBy);
  const current = locales.find((locale) => locale.code === tab) ?? source;
  const state = slot.locales[tab];
  const text = working[tab] ?? '';
  const dirtyLocales = locales.filter((locale) => (working[locale.code] ?? '') !== (slot.locales[locale.code]?.value ?? ''));
  const dirty = dirtyLocales.length > 0;
  // Values the page fills in ({count}, {date}): an edit keeps them all.
  const required = placeholders(state?.fallback ?? slot.locales[source.code]?.fallback ?? '');
  const present = placeholders(text);
  const placeholderProblem = text.length > 0 && present.join(',') !== required.join(',');
  const ratio = text.length / slot.max;
  const meter = ratio > 1 ? 'over' : ratio >= 0.9 ? 'near' : 'ok';

  /*
   * The server's view of the slot changes after a save, a discard or a publish.
   * A language nobody has touched since takes the new value; one being typed in
   * keeps what is typed.
   */
  const base = useRef(valuesOf(slot, locales));
  useEffect(() => {
    const next = valuesOf(slot, locales);
    setWorking((previous) =>
      Object.fromEntries(
        locales.map((locale) => [
          locale.code,
          previous[locale.code] === base.current[locale.code] ? next[locale.code] : previous[locale.code],
        ])
      )
    );
    base.current = next;
  }, [slot, locales]);

  useLayoutEffect(() => {
    const node = field.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight + 2, 320)}px`;
  }, [text, tab]);

  useEffect(() => {
    field.current?.focus({ preventScroll: true });
    const end = field.current?.value.length ?? 0;
    field.current?.setSelectionRange(end, end);
  }, [tab]);

  useEffect(() => {
    if (panel && !detail) {
      void slotDetailAction(slot.key).then((result) => {
        if (result.ok) setDetail({ versions: result.versions, comments: result.comments });
      });
    }
  }, [panel, detail, slot.key]);

  const statusOf = (code: string): LocaleStatus => {
    const own = slot.locales[code];
    if (!own) return 'missing';
    if ((working[code] ?? '') !== own.value) return 'draft';
    return own.status;
  };

  const change = (value: string) => {
    setWorking((previous) => ({ ...previous, [tab]: value }));
    if (tab === pageLocale) onPreview(tab, value);
  };

  async function save(): Promise<boolean> {
    if (!dirty || readOnly) return true;
    setSaving(true);
    let latest: SlotState | null = null;
    for (const locale of dirtyLocales) {
      const result = await saveDraftAction({ key: slot.key, locale: locale.code, value: working[locale.code] ?? '' });
      if (!result.ok) {
        setSaving(false);
        notify(result.error);
        return false;
      }
      latest = result.slot;
    }
    setSaving(false);
    onSaved(latest);
    return true;
  }

  async function close() {
    if (await save()) onClose();
  }

  async function discard() {
    const result = await discardDraftAction({ key: slot.key, locale: tab });
    if (!result.ok) return notify(result.error);
    const live = result.slot?.locales[tab]?.value ?? '';
    setWorking((previous) => ({ ...previous, [tab]: live }));
    if (tab === pageLocale) onPreview(tab, live);
    onSaved(result.slot);
  }

  async function stillRight() {
    const result = await confirmTranslationAction({ key: slot.key, locale: tab });
    if (!result.ok) return notify(result.error);
    onSaved(result.slot);
  }

  async function assist(mode: AiState['mode']) {
    setAi({ mode, loading: true, options: [], notes: [], error: null });
    const result = await aiAssistAction({
      mode,
      key: slot.key,
      locale: tab,
      text,
      source: mode === 'translate' ? (working[source.code] ?? '') : null,
    });
    setAi(
      result.ok
        ? { mode, loading: false, options: result.options, notes: result.notes, error: null }
        : { mode, loading: false, options: [], notes: [], error: result.error }
    );
  }

  async function postComment() {
    if (!comment.trim()) return;
    const result = await addCommentAction({ key: slot.key, body: comment });
    if (!result.ok) return notify(result.error);
    setComment('');
    setDetail((previous) => ({ versions: previous?.versions ?? [], comments: result.comments }));
  }

  async function resolve(id: string) {
    const result = await resolveCommentAction({ key: slot.key, id });
    if (result.ok) setDetail((previous) => ({ versions: previous?.versions ?? [], comments: result.comments }));
  }

  // Placement: below the text when there is room, else above, else centred.
  const width = Math.min(468, bounds.width - 24);
  const gap = 14;
  const spaceBelow = bounds.height - (anchor.y + anchor.height) - gap - 12;
  const spaceAbove = anchor.y - gap - 12;
  const centred = Math.max(spaceBelow, spaceAbove) < 300;
  const below = !centred && (spaceBelow >= 420 || spaceBelow >= spaceAbove);
  const left = Math.max(12, Math.min(anchor.x + anchor.width / 2 - width / 2, bounds.width - width - 12));
  const caretX = Math.max(20, Math.min(anchor.x + anchor.width / 2 - left - 7, width - 34));
  const position: CSSProperties = centred
    ? { left: Math.max(12, (bounds.width - width) / 2), top: 24, maxHeight: bounds.height - 48, width }
    : below
      ? { left, top: anchor.y + anchor.height + gap, maxHeight: spaceBelow, width, ['--from' as string]: '6px', ['--origin' as string]: `${caretX}px 0` }
      : {
          left,
          bottom: bounds.height - anchor.y + gap,
          maxHeight: spaceAbove,
          width,
          ['--from' as string]: '-6px',
          ['--origin' as string]: `${caretX}px 100%`,
        };

  const comments = detail?.comments ?? [];
  const openComments = comments.filter((entry) => !entry.resolvedAt).length || slot.comments;
  const versions = useMemo(() => (detail?.versions ?? []).filter((entry) => entry.locale === tab), [detail, tab]);
  const sourceText = working[source.code] ?? '';
  const staleNote = tab !== source.code && state?.stale;

  return (
    <div
      ref={root}
      role="dialog"
      aria-label={`Edit ${slot.label}`}
      className={cn('absolute z-30 flex flex-col', styles.pop)}
      style={position}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          void close();
        }
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          void save().then((ok) => ok && notify('Draft saved'));
        }
      }}
    >
      {!centred ? (
        <span
          aria-hidden
          className={cn(styles.caret, !below && styles.caretBelow)}
          style={below ? { left: caretX, top: -7 } : { left: caretX, bottom: -7 }}
        />
      ) : null}

      <div className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_28px_70px_-24px_rgba(15,23,42,0.42),0_0_0_1px_rgba(15,23,42,0.07)]">
        <header className="flex items-start gap-3 px-5 pt-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-[var(--casa-text-subtle)]">
              {slot.section !== slot.scope ? (
                <>
                  <span>{slot.section}</span>
                  <span aria-hidden>·</span>
                </>
              ) : null}
              {slot.path ? (
                <span>{slot.scope}</span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--casa-blue-tint)] px-2 py-0.5 text-[var(--casa-accent-text)]">
                  {I.link}
                  {slot.scope}
                </span>
              )}
            </div>
            <h2 className="mt-1 truncate text-[1.05rem] font-bold tracking-[-0.01em] text-[var(--casa-ink)]">{slot.label}</h2>
          </div>
          <button
            type="button"
            onClick={() => void close()}
            aria-label="Close"
            className="-mr-2 grid h-8 w-8 place-items-center rounded-lg text-[var(--casa-text-subtle)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]"
          >
            {saving ? <Spinner /> : I.close}
          </button>
        </header>

        {lockedBy ? (
          <div className="mx-5 mt-3 flex items-center gap-2.5 rounded-xl bg-ws-panel px-3 py-2 text-[0.8rem] font-semibold text-ws-on-panel">
            <Avatar initials={lockedBy.initials} tone="sun" size={24} />
            {lockedBy.name} is editing this text
          </div>
        ) : null}

        <div role="tablist" aria-label="Language" className="mt-3 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
          {locales.map((locale) => {
            const status = statusOf(locale.code);
            const active = locale.code === tab;
            return (
              <button
                key={locale.code}
                type="button"
                role="tab"
                aria-selected={active}
                title={statusLabel(status)}
                onClick={() => setTab(locale.code)}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center gap-2 rounded-lg px-2.5 text-[0.8rem] font-semibold transition-colors',
                  active ? 'bg-ws-sunk text-[var(--casa-ink)]' : 'text-[var(--casa-text-subtle)] hover:text-[var(--casa-ink)]'
                )}
              >
                <StatusDot status={status} />
                <span dir={locale.dir}>{locale.label}</span>
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-3 pb-4">
          {tab !== source.code ? (
            <div className="mb-3 rounded-xl bg-ws-sunk px-3.5 py-3">
              <div className="flex items-center justify-between gap-2 text-[0.7rem] font-semibold text-[var(--casa-text-subtle)]">
                <span>{source.label} · source</span>
                {aiEnabled && !readOnly ? (
                  <button
                    type="button"
                    onClick={() => void assist('translate')}
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[var(--casa-accent-text)] hover:bg-white"
                  >
                    {I.sparkle}
                    Translate from {source.label}
                  </button>
                ) : null}
              </div>
              <p className="mt-1.5 text-[0.85rem] leading-relaxed text-[var(--casa-muted)]">{sourceText}</p>
            </div>
          ) : null}

          <label htmlFor={`slot-${tab}`} className="sr-only">
            {slot.label}, {current.label}
          </label>
          <textarea
            id={`slot-${tab}`}
            ref={field}
            dir={current.dir}
            lang={current.code}
            value={text}
            readOnly={readOnly}
            placeholder={state?.fallback ? undefined : 'Not written yet'}
            onChange={(event) => change(event.target.value)}
            rows={slot.kind === 'paragraph' ? 5 : slot.kind === 'lead' || slot.kind === 'card-text' ? 3 : 1}
            className={cn(
              'block w-full resize-none rounded-xl border border-ws-line-firm bg-white px-3.5 py-3 text-[0.95rem] leading-relaxed text-[var(--casa-ink)] outline-none transition-[border-color,box-shadow]',
              'hover:border-[#9aa8bc] focus:border-[var(--casa-blue)] focus:shadow-[0_0_0_3px_rgba(0,159,227,0.16)]',
              readOnly && 'bg-ws-sunk text-[var(--casa-muted)]'
            )}
          />

          <div className="mt-2 flex items-center gap-3 text-xs font-semibold tabular-nums text-[var(--casa-text-subtle)]">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-ws-line-soft">
              <span
                className={cn(
                  'block h-full rounded-full transition-[width] duration-150',
                  meter === 'ok' && 'bg-[#9aa8bc]',
                  meter === 'near' && 'bg-[#d4a800]',
                  meter === 'over' && 'bg-[var(--casa-danger-text)]'
                )}
                style={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
              />
            </span>
            <span className={cn(meter === 'near' && 'text-[var(--casa-warning-text)]', meter === 'over' && 'text-[var(--casa-danger-text)]')}>
              {text.length} / {slot.max}
            </span>
            <span className="text-[var(--casa-text-subtle)]/80">{KIND_LABELS[slot.kind]}</span>
          </div>

          {meter === 'over' ? (
            <Note tone="danger">Too long for this spot. Shorten it to {slot.max} characters.</Note>
          ) : null}
          {required.length ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[var(--casa-text-subtle)]">
              Filled in by the page:
              {required.map((name) => (
                <code key={name} className="rounded-md bg-ws-sunk px-1.5 py-0.5 font-mono text-[0.72rem] text-[var(--casa-ink)]">{`{${name}}`}</code>
              ))}
            </div>
          ) : null}
          {placeholderProblem ? (
            <Note tone="danger">
              {required.length ? `Keep ${required.map((name) => `{${name}}`).join(' ')} in the text, exactly as written.` : 'Remove the {…}: nothing fills it in here.'}
            </Note>
          ) : null}
          {tab === 'de' && SIE.test(text) ? <Note tone="warn">The website says „du“, not „Sie“.</Note> : null}
          {staleNote ? (
            <Note tone="warn">
              <span className="flex-1">The {source.label} text changed.</span>
              {!readOnly ? (
                <button type="button" onClick={() => void stillRight()} className="font-semibold text-[var(--casa-accent-text)] hover:underline">
                  Still right
                </button>
              ) : null}
            </Note>
          ) : null}

          {aiEnabled && !readOnly ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <AiChip active={ai?.mode === 'shorten'} highlight={meter !== 'ok'} onClick={() => void assist('shorten')}>
                Shorten
              </AiChip>
              <AiChip active={ai?.mode === 'voice'} onClick={() => void assist('voice')}>
                Check voice
              </AiChip>
              {tab !== source.code ? (
                <AiChip active={ai?.mode === 'translate'} onClick={() => void assist('translate')}>
                  Translate
                </AiChip>
              ) : null}
            </div>
          ) : null}

          {ai ? (
            <div className={cn('mt-3 rounded-xl border border-ws-line p-3', styles.fade)}>
              {ai.loading ? (
                <div className="space-y-2" aria-label="Writing">
                  <div className={cn('h-3 w-11/12 rounded', styles.shimmer)} />
                  <div className={cn('h-3 w-9/12 rounded', styles.shimmer)} />
                  <div className={cn('h-3 w-10/12 rounded', styles.shimmer)} />
                </div>
              ) : ai.error ? (
                <p className="text-[0.8rem] font-medium text-[var(--casa-danger-text)]">{ai.error}</p>
              ) : (
                <div className="space-y-2">
                  {ai.notes.length ? (
                    <ul className="space-y-1 text-[0.8rem] leading-snug text-[var(--casa-muted)]">
                      {ai.notes.map((note) => (
                        <li key={note} className="flex gap-2">
                          <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--casa-muted)]" />
                          {note}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {ai.mode === 'voice' && !ai.notes.length && !ai.options.length ? (
                    <p className="flex items-center gap-1.5 text-[0.8rem] font-semibold text-[var(--casa-success-text)]">
                      {I.check} Reads in CASA&apos;s voice
                    </p>
                  ) : null}
                  {ai.options.map((option) => (
                    <div key={option} className="group rounded-lg bg-ws-sunk px-3 py-2.5">
                      <p dir={current.dir} className="text-[0.85rem] leading-relaxed text-[var(--casa-ink)]">
                        {option}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs font-semibold text-[var(--casa-text-subtle)]">
                        <span className="tabular-nums">{option.length} characters</span>
                        <button
                          type="button"
                          onClick={() => {
                            change(option);
                            setAi(null);
                          }}
                          className="rounded-md px-2 py-1 text-[var(--casa-accent-text)] hover:bg-white"
                        >
                          Use this
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {panel === 'history' ? (
            <section className={cn('mt-4 border-t border-ws-line-soft pt-3', styles.fade)} aria-label="History">
              {!detail ? (
                <Spinner className="text-[var(--casa-text-subtle)]" />
              ) : (
                <ol className="space-y-2">
                  {versions.map((version) => (
                    <li key={version.releaseId} className="rounded-lg border border-ws-line-soft px-3 py-2.5">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="flex-1 text-[var(--casa-ink)]">{formatBerlin(version.at)}</span>
                        <span className={cn('rounded-full px-2 py-0.5', version.live ? 'bg-[#e6f3eb] text-[#0d6a30]' : 'bg-ws-sunk text-[var(--casa-text-subtle)]')}>
                          {version.live ? 'Live' : RELEASE_LABEL[version.state]}
                        </span>
                      </div>
                      {version.by ? <div className="mt-0.5 text-xs text-[var(--casa-text-subtle)]">{version.by}</div> : null}
                      <p dir={current.dir} className="mt-1.5 line-clamp-3 text-[0.8rem] leading-relaxed text-[var(--casa-muted)]">
                        {version.value}
                      </p>
                      {!readOnly && version.value !== text ? (
                        <button type="button" onClick={() => change(version.value)} className="mt-1.5 text-xs font-semibold text-[var(--casa-accent-text)] hover:underline">
                          Use this version
                        </button>
                      ) : null}
                    </li>
                  ))}
                  {state?.fallback ? (
                    <li className="rounded-lg border border-dashed border-ws-line px-3 py-2.5">
                      <div className="text-xs font-semibold text-[var(--casa-ink)]">Original text</div>
                      <p dir={current.dir} className="mt-1.5 line-clamp-3 text-[0.8rem] leading-relaxed text-[var(--casa-muted)]">
                        {state.fallback}
                      </p>
                      {!readOnly && state.fallback !== text ? (
                        <button type="button" onClick={() => change(state.fallback ?? '')} className="mt-1.5 text-xs font-semibold text-[var(--casa-accent-text)] hover:underline">
                          Use the original
                        </button>
                      ) : null}
                    </li>
                  ) : null}
                </ol>
              )}
            </section>
          ) : null}

          {panel === 'comments' ? (
            <section className={cn('mt-4 border-t border-ws-line-soft pt-3', styles.fade)} aria-label="Comments">
              {!detail ? (
                <Spinner className="text-[var(--casa-text-subtle)]" />
              ) : (
                <>
                  <ol className="space-y-2.5">
                    {comments.map((entry) => (
                      <li key={entry.id} className={cn('flex gap-2.5', entry.resolvedAt && 'opacity-55')}>
                        <Avatar initials={initialsOf(entry.author)} size={26} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2 text-xs">
                            <span className="font-bold text-[var(--casa-ink)]">{entry.author}</span>
                            <span className="text-[var(--casa-text-subtle)]">{formatBerlin(entry.createdAt)}</span>
                          </div>
                          <p className="mt-0.5 whitespace-pre-line text-[0.85rem] leading-relaxed text-[var(--casa-ink)]">{entry.body}</p>
                          {entry.resolvedAt ? (
                            <p className="mt-0.5 text-xs text-[var(--casa-text-subtle)]">Resolved by {entry.resolvedBy}</p>
                          ) : canEdit ? (
                            <button type="button" onClick={() => void resolve(entry.id)} className="mt-0.5 text-xs font-semibold text-[var(--casa-accent-text)] hover:underline">
                              Resolve
                            </button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                  {canEdit ? (
                    <div className="mt-3 flex items-end gap-2">
                      <label htmlFor="slot-comment" className="sr-only">
                        Comment
                      </label>
                      <textarea
                        id="slot-comment"
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        rows={2}
                        placeholder="Add a comment for your colleagues"
                        className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-ws-line-firm px-3 py-2 text-[0.85rem] outline-none focus:border-[var(--casa-blue)] focus:shadow-[0_0_0_3px_rgba(0,159,227,0.16)]"
                      />
                      <button
                        type="button"
                        onClick={() => void postComment()}
                        disabled={!comment.trim()}
                        className="h-10 rounded-lg border border-ws-line-firm bg-white px-3 text-[0.8rem] font-semibold text-[var(--casa-ink)] hover:bg-ws-sunk disabled:opacity-40"
                      >
                        Comment
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          ) : null}
        </div>

        <footer className="flex items-center gap-1 border-t border-ws-line-soft px-3 py-2.5">
          <FooterTab active={panel === 'history'} onClick={() => setPanel(panel === 'history' ? null : 'history')}>
            {I.history}
            History
          </FooterTab>
          <FooterTab active={panel === 'comments'} onClick={() => setPanel(panel === 'comments' ? null : 'comments')}>
            {I.comment}
            {openComments ? plural(openComments, 'comment', 'comments') : 'Comment'}
          </FooterTab>
          <span className="flex-1" />
          {!readOnly && state?.draft ? (
            <button
              type="button"
              onClick={() => void discard()}
              className="h-9 rounded-lg px-3 text-[0.8rem] font-semibold text-[var(--casa-text-subtle)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]"
            >
              Discard draft
            </button>
          ) : null}
          {!readOnly ? (
            <button
              type="button"
              onClick={() => void save().then((ok) => ok && dirty && notify('Draft saved'))}
              disabled={!dirty || saving || placeholderProblem}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--casa-ink-deep)] px-4 text-[0.8rem] font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.18)] transition-colors hover:bg-[var(--casa-ink-deep-hover)] disabled:bg-ws-line-firm disabled:shadow-none"
            >
              {saving ? <Spinner className="h-3.5 w-3.5" /> : null}
              Save draft
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}

function Note({ tone, children }: { tone: 'warn' | 'danger'; children: ReactNode }) {
  return (
    <div
      className={cn(
        'mt-2.5 flex items-center gap-2 rounded-xl px-3 py-2 text-[0.8rem] font-medium leading-snug',
        tone === 'warn' ? 'bg-[var(--casa-sun-tint)] text-[#5c4900]' : 'bg-[#fde8e9] text-[#a10510]'
      )}
    >
      {children}
    </div>
  );
}

function AiChip({
  children,
  onClick,
  active,
  highlight,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[0.78rem] font-semibold transition-colors',
        active
          ? 'border-[var(--casa-accent-text)] bg-[var(--casa-blue-tint)] text-[var(--casa-accent-text)]'
          : highlight
            ? 'border-[#d4a800] bg-[var(--casa-sun-tint)] text-[#5c4900] hover:border-[#b38f00]'
            : 'border-ws-line text-[var(--casa-muted)] hover:border-ws-line-firm hover:text-[var(--casa-ink)]'
      )}
    >
      {I.sparkle}
      {children}
    </button>
  );
}

function FooterTab({ children, onClick, active }: { children: ReactNode; onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[0.8rem] font-semibold transition-colors',
        active ? 'bg-ws-sunk text-[var(--casa-ink)]' : 'text-[var(--casa-text-subtle)] hover:bg-ws-sunk hover:text-[var(--casa-ink)]'
      )}
    >
      {children}
    </button>
  );
}
