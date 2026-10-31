'use client';

import Link from 'next/link';
import { Dialog as Primitive } from 'radix-ui';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type DragEvent, type ReactNode } from 'react';

import { FEEDBACK_KIND_HINTS, FEEDBACK_KIND_LABELS, FEEDBACK_KIND_PROMPTS, FEEDBACK_KINDS, FEEDBACK_LIMITS, type FeedbackKind, type MyFeedback } from '@/lib/admin/feedback-shared';
import { pick, relativeDays } from '@/lib/admin/i18n';
import { cn } from '@/lib/utils';

import { DIALOG_OVERLAY } from '../dialogs';
import { Icon } from '../icons';
import { useWsLang } from '../lang';
import { Button, IconChip, type Tint } from '../ui';
import { canCaptureScreen, captureScreen, listenForPageErrors, pageContext, shotFromFile, type Shot } from './capture';
import { ScreenshotEditor } from './screenshot-editor';

/**
 * „Feedback" in the top bar (Rahman, 2026-10-31: „very advanced and dynamic and best user experience …
 * what if they want to share a screenshot"): from any screen, a panel to say what does not work, what is
 * missing compared with FileMaker, an idea or a question — with screenshots taken of this tab, pasted
 * (⌘V), dropped or chosen, each drawn on (frame, arrow, pen, black out) before it goes. The page, the
 * pages before it, the browser and any error the page met travel with it. „Mein Feedback" lists what the
 * colleague sent, its state and the answer, and a dot on the button says an answer has come.
 * docs/ADMIN_WORKSPACE.md §Feedback.
 */

const KIND_ICON: Record<FeedbackKind, ReactNode> = { problem: Icon.bug, missing: Icon.puzzle, idea: Icon.bulb, question: Icon.question };
const KIND_TINT: Record<FeedbackKind, Tint> = { problem: 'red', missing: 'sun', idea: 'green', question: 'blue' };

const STATE: Record<MyFeedback['status'], { de: string; en: string; tone: string }> = {
  new: { de: 'Offen', en: 'Open', tone: 'bg-[#e8f1fd] text-[#174a8f] ring-[#b9d0f1]' },
  in_progress: { de: 'In Arbeit', en: 'In progress', tone: 'bg-[#e6ecf6] text-[var(--fm-navy)] ring-[#bccae0]' },
  waiting: { de: 'In Arbeit', en: 'In progress', tone: 'bg-[#e6ecf6] text-[var(--fm-navy)] ring-[#bccae0]' },
  done: { de: 'Erledigt', en: 'Done', tone: 'bg-[#e6f5ec] text-[#14653a] ring-[#b7dfc6]' },
  declined: { de: 'Abgeschlossen', en: 'Closed', tone: 'bg-[#f1f3f6] text-[#3c4657] ring-[#d5dbe4]' },
  spam: { de: 'Abgeschlossen', en: 'Closed', tone: 'bg-[#f1f3f6] text-[#3c4657] ring-[#d5dbe4]' },
};

type Phase = { kind: 'idle' } | { kind: 'sending'; progress: number } | { kind: 'sent'; number: number } | { kind: 'error'; message: string };

/** What this colleague sent, or null when it cannot be read just now. */
async function fetchMine(): Promise<MyFeedback[] | null> {
  try {
    const response = await fetch('/admin/feedback/mine', { cache: 'no-store' });
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: { items: MyFeedback[] } };
    return body.data?.items ?? null;
  } catch {
    // Offline for a moment: the list stays as it was.
    return null;
  }
}

const noSubscription = () => () => {};

const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function FeedbackButton({ firstName, canReview, tone = 'bar' }: { firstName: string; canReview: boolean; tone?: 'bar' | 'rail' }) {
  const { t, lang } = useWsLang();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'new' | 'mine'>('new');
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [message, setMessage] = useState('');
  const [shots, setShots] = useState<Shot[]>([]);
  const [editing, setEditing] = useState<Shot | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [mine, setMine] = useState<MyFeedback[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [where, setWhere] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  // Screen sharing exists in the browser only; the server renders without the button.
  const canCapture = useSyncExternalStore(noSubscription, canCaptureScreen, () => false);

  const unread = mine?.filter((item) => item.unread).length ?? 0;
  const full = shots.length >= FEEDBACK_LIMITS.files;
  const ready = !!kind && (message.trim().length > 0 || shots.length > 0) && phase.kind !== 'sending';

  const loadMine = useCallback(() => fetchMine().then((items) => items && setMine(items)), []);

  useEffect(() => {
    listenForPageErrors();
    void fetchMine().then((items) => items && setMine(items));
  }, []);

  // Opening names the page it is about and brings „Mein Feedback" up to date.
  const openChange = (next: boolean) => {
    if (capturing) return;
    if (next) {
      setWhere(pageContext(lang).pageTitle);
      void loadMine();
    }
    setOpen(next);
  };

  // Reading „Mein Feedback" reads its answers: the dot goes once they have been on screen a moment.
  useEffect(() => {
    if (!open || tab !== 'mine' || !unread) return;
    const timer = setTimeout(() => {
      void fetch('/admin/feedback/mine', { method: 'POST' }).then(() =>
        setMine((items) => items?.map((item) => ({ ...item, unread: false })) ?? null)
      );
    }, 1800);
    return () => clearTimeout(timer);
  }, [open, tab, unread]);

  const addFiles = useCallback(
    async (files: readonly Blob[]) => {
      const room = FEEDBACK_LIMITS.files - shots.length;
      const pictures = files.filter((file) => file.type.startsWith('image/')).slice(0, Math.max(0, room));
      for (const file of pictures) {
        try {
          const shot = await shotFromFile(file);
          setShots((all) => (all.length < FEEDBACK_LIMITS.files ? [...all, shot] : all));
        } catch {
          setPhase({ kind: 'error', message: t('Dieses Bild kann nicht gelesen werden.', 'This picture cannot be read.') });
        }
      }
    },
    [shots.length, t]
  );

  // ⌘V / Ctrl+V anywhere while the panel is open puts a copied picture in.
  useEffect(() => {
    if (!open || tab !== 'new') return;
    const onPaste = (event: ClipboardEvent) => {
      const files = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith('image/'));
      if (!files.length) return;
      event.preventDefault();
      void addFiles(files);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [open, tab, addFiles]);

  const capture = async () => {
    // The panel steps out of the picture without closing, so nothing typed is lost.
    setCapturing(true);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
      const shot = await captureScreen();
      if (shot) {
        setShots((all) => [...all, shot]);
        setEditing(shot);
      }
    } finally {
      setCapturing(false);
    }
  };

  const remove = (shot: Shot) => {
    URL.revokeObjectURL(shot.url);
    setShots((all) => all.filter((s) => s.id !== shot.id));
  };

  const replace = (before: Shot, after: Shot) => {
    URL.revokeObjectURL(before.url);
    setShots((all) => all.map((s) => (s.id === before.id ? after : s)));
    setEditing(null);
  };

  const reset = () => {
    shots.forEach((shot) => URL.revokeObjectURL(shot.url));
    setShots([]);
    setKind(null);
    setMessage('');
    setPhase({ kind: 'idle' });
  };

  const send = () => {
    if (!ready || !kind) return;
    const page = pageContext(lang);
    const form = new FormData();
    form.set('kind', kind);
    form.set('message', message.trim());
    form.set('pagePath', page.pagePath);
    form.set('pageTitle', page.pageTitle);
    form.set('context', JSON.stringify(page.context));
    shots.forEach((shot, index) => form.append('screenshot', shot.blob, `screenshot-${index + 1}.${shot.blob.type === 'image/png' ? 'png' : 'jpg'}`));

    // XMLHttpRequest, not fetch, for the upload's progress.
    const request = new XMLHttpRequest();
    request.open('POST', '/admin/feedback/send');
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) setPhase({ kind: 'sending', progress: event.loaded / event.total });
    };
    request.onload = () => {
      if (request.status === 201) {
        const number = (JSON.parse(request.responseText) as { data: { number: number } }).data.number;
        shots.forEach((shot) => URL.revokeObjectURL(shot.url));
        setShots([]);
        setKind(null);
        setMessage('');
        setPhase({ kind: 'sent', number });
        void loadMine();
        return;
      }
      setPhase({
        kind: 'error',
        message:
          request.status === 401
            ? t('Du bist nicht mehr angemeldet. Melde dich in einem neuen Tab an und sende es dann noch einmal.', 'You are signed out. Sign in in a new tab, then send it again.')
            : request.status === 413
              ? t('Die Bilder sind zu groß. Entferne eines und versuch es noch einmal.', 'The pictures are too large. Remove one and try again.')
              : t('Das hat nicht geklappt. Versuch es bitte noch einmal.', 'That did not work. Please try again.'),
      });
    };
    request.onerror = () => setPhase({ kind: 'error', message: t('Keine Verbindung. Versuch es gleich noch einmal.', 'No connection. Try again in a moment.') });
    setPhase({ kind: 'sending', progress: 0 });
    request.send(form);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void addFiles([...event.dataTransfer.files]);
  };

  const trigger =
    tone === 'rail' ? (
      <Primitive.Trigger
        aria-label={t('Feedback', 'Feedback')}
        className="relative inline-flex size-9 items-center justify-center rounded-full text-white/85 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 [&_svg]:size-[18px]"
      >
        {Icon.feedback}
        {unread ? <Dot className="ring-[var(--ws-rail-top)]" /> : null}
      </Primitive.Trigger>
    ) : (
      <Primitive.Trigger
        data-feedback-trigger
        className="relative inline-flex h-9 items-center gap-1.5 rounded-full bg-white/60 px-3 text-[0.84rem] font-semibold text-[var(--casa-ink)] ring-1 ring-ws-line ring-inset transition-colors outline-none hover:bg-white/80 focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 data-[state=open]:bg-white data-[state=open]:shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
      >
        <span aria-hidden="true" className="[&_svg]:size-3.5">
          {Icon.feedback}
        </span>
        {t('Feedback', 'Feedback')}
        {unread ? <Dot className="ring-[var(--ws-canvas)]" label={t('Neue Antwort', 'New answer')} /> : null}
      </Primitive.Trigger>
    );

  return (
    <>
      <Primitive.Root open={open} onOpenChange={openChange}>
        {trigger}
        <Primitive.Portal>
          <Primitive.Overlay
            className={cn(
              'fixed inset-0 z-[1000] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
              DIALOG_OVERLAY,
              capturing && 'invisible'
            )}
          />
          <Primitive.Content
            aria-describedby={undefined}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && tab === 'new') {
                event.preventDefault();
                send();
              }
            }}
            onDragOver={(event) => {
              if (tab !== 'new' || ![...event.dataTransfer.types].includes('Files')) return;
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={onDrop}
            className={cn(
              'casa-ws-dialog fixed inset-y-0 right-0 z-[1000] flex w-full flex-col bg-white shadow-[-24px_0_60px_-28px_rgba(15,23,42,0.45)] outline-none sm:inset-y-2 sm:right-2 sm:max-w-[500px] sm:rounded-3xl',
              'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-300',
              capturing && 'invisible'
            )}
          >
            <header className="border-b border-ws-card-line bg-ws-card-head px-6 pt-5 sm:rounded-t-3xl">
              <div className="flex items-start gap-3">
                <IconChip icon={Icon.feedback} tint="blue" size="md" />
                <div className="min-w-0 flex-1 pt-0.5">
                  <Primitive.Title className="text-[1.08rem] leading-snug font-extrabold tracking-[-0.01em] text-[var(--casa-ink)]">{t('Feedback', 'Feedback')}</Primitive.Title>
                  {where ? (
                    <p className="mt-0.5 truncate text-[0.84rem] text-[var(--casa-muted)]">
                      {t('Zu', 'About')} <span className="font-semibold text-[var(--casa-ink)]">{where}</span>
                    </p>
                  ) : null}
                </div>
                <Primitive.Close
                  aria-label={t('Schließen', 'Close')}
                  className="-mt-1 -mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--casa-muted)] transition-colors outline-none hover:bg-ws-sunk hover:text-[var(--casa-ink)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/40 [&_svg]:size-4"
                >
                  {Icon.close}
                </Primitive.Close>
              </div>
              <div role="tablist" className="mt-4 -mb-px flex gap-5">
                {(
                  [
                    ['new', t('Neues Feedback', 'New feedback')],
                    ['mine', t('Mein Feedback', 'My feedback')],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    role="tab"
                    type="button"
                    aria-selected={tab === id}
                    onClick={() => setTab(id)}
                    className={cn(
                      'relative inline-flex items-center gap-1.5 border-b-[3px] pb-2.5 text-[0.86rem] font-semibold outline-none focus-visible:text-[var(--casa-ink)]',
                      tab === id ? 'border-[var(--fm-navy)] text-[var(--casa-ink)]' : 'border-transparent text-[var(--casa-muted)] hover:text-[var(--casa-ink)]'
                    )}
                  >
                    {label}
                    {id === 'mine' && mine?.length ? <span className="rounded-full bg-ws-sunk px-1.5 text-[0.72rem] tabular-nums">{mine.length}</span> : null}
                    {id === 'mine' && unread ? <span aria-label={t('Neue Antwort', 'New answer')} className="size-2 rounded-full bg-[#2f6fd1]" /> : null}
                  </button>
                ))}
              </div>
            </header>

            <div className="relative min-h-0 flex-1 overflow-y-auto">
              {tab === 'mine' ? (
                <MyList items={mine} canReview={canReview} onNew={() => setTab('new')} />
              ) : phase.kind === 'sent' ? (
                <Sent
                  number={phase.number}
                  firstName={firstName}
                  onMore={() => {
                    reset();
                    requestAnimationFrame(() => textRef.current?.focus());
                  }}
                  onMine={() => {
                    reset();
                    setTab('mine');
                  }}
                />
              ) : (
                <div className="space-y-6 px-6 py-5">
                  <fieldset>
                    <legend className="mb-2.5 text-[0.8rem] font-semibold text-[var(--casa-muted)]">{t('Worum geht es?', 'What is it about?')}</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {FEEDBACK_KINDS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={kind === option}
                          title={pick(lang, FEEDBACK_KIND_HINTS[option])}
                          onClick={() => {
                            setKind(option);
                            requestAnimationFrame(() => textRef.current?.focus());
                          }}
                          className={cn(
                            'flex items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 text-left text-[0.86rem] font-semibold text-[var(--casa-ink)] ring-1 ring-[#d3dbe6] transition-[box-shadow,background-color] outline-none ring-inset hover:bg-[#f6f8fb] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]/50',
                            kind === option && 'bg-[#f2f6fc] ring-2 ring-[var(--fm-navy)] hover:bg-[#f2f6fc]'
                          )}
                        >
                          <IconChip icon={KIND_ICON[option]} tint={KIND_TINT[option]} />
                          <span className="min-w-0">
                            <span className="block leading-tight">{pick(lang, FEEDBACK_KIND_LABELS[option])}</span>
                            <span className="hidden truncate text-[0.74rem] font-medium text-[var(--casa-muted)] sm:block">{pick(lang, FEEDBACK_KIND_HINTS[option])}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div>
                    <label htmlFor="feedback-message" className="mb-2 block text-[0.8rem] font-semibold text-[var(--casa-muted)]">
                      {t('Deine Nachricht', 'Your message')}
                    </label>
                    <textarea
                      id="feedback-message"
                      ref={textRef}
                      value={message}
                      maxLength={FEEDBACK_LIMITS.message}
                      onChange={(event) => {
                        setMessage(event.target.value);
                        if (phase.kind === 'error') setPhase({ kind: 'idle' });
                      }}
                      placeholder={pick(lang, FEEDBACK_KIND_PROMPTS[kind ?? 'none'])}
                      rows={5}
                      className="block field-sizing-content max-h-[22rem] min-h-[7.5rem] w-full resize-none rounded-xl border border-ws-line-firm bg-white px-3.5 py-3 text-[0.92rem] leading-relaxed text-[var(--casa-ink)] shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none placeholder:text-[var(--casa-text-subtle)] focus:border-[var(--casa-blue)]/60 focus:ring-3 focus:ring-[var(--casa-blue)]/15"
                    />
                    {message.length > FEEDBACK_LIMITS.message - 500 ? (
                      <p className="mt-1 text-right text-[0.74rem] text-[var(--casa-muted)] tabular-nums">
                        {message.length} / {FEEDBACK_LIMITS.message}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <div className="mb-2.5 flex items-baseline justify-between gap-3">
                      <span className="text-[0.8rem] font-semibold text-[var(--casa-muted)]">
                        {t('Screenshots', 'Screenshots')}
                        {shots.length ? <span className="ml-1.5 tabular-nums">{shots.length} / {FEEDBACK_LIMITS.files}</span> : null}
                      </span>
                      <span className="hidden text-[0.74rem] text-[var(--casa-text-subtle)] sm:inline">
                        {t('Einfügen mit', 'Paste with')} <kbd className="font-sans font-semibold">{isMac() ? '⌘V' : 'Strg+V'}</kbd>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {canCapture ? (
                        <Button type="button" variant="secondary" size="sm" onClick={capture} disabled={full || capturing}>
                          <span aria-hidden="true" className="[&_svg]:size-3.5">
                            {Icon.camera}
                          </span>
                          {t('Bildschirm aufnehmen', 'Capture screen')}
                        </Button>
                      ) : null}
                      <Button type="button" variant="secondary" size="sm" onClick={() => fileInput.current?.click()} disabled={full}>
                        <span aria-hidden="true" className="[&_svg]:size-3.5">
                          {Icon.image}
                        </span>
                        {t('Bild hinzufügen', 'Add picture')}
                      </Button>
                      <input
                        ref={fileInput}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/heic"
                        multiple
                        hidden
                        onChange={(event) => {
                          void addFiles([...(event.target.files ?? [])]);
                          event.target.value = '';
                        }}
                      />
                    </div>
                    {shots.length ? (
                      <ul className="mt-3 grid grid-cols-3 gap-2">
                        {shots.map((shot, index) => (
                          <li key={shot.id} className="group relative">
                            <button
                              type="button"
                              onClick={() => setEditing(shot)}
                              aria-label={t(`Screenshot ${index + 1} bearbeiten`, `Edit screenshot ${index + 1}`)}
                              className="block aspect-[16/10] w-full overflow-hidden rounded-lg bg-ws-sunk ring-1 ring-ws-line outline-none focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)]"
                            >
                              {/* A local picture (blob:), never optimised by Next. */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={shot.url} alt="" className="size-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]" />
                              <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/55 to-transparent px-2 pt-4 pb-1.5 text-[0.7rem] font-semibold text-white opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [&_svg]:size-3">
                                {Icon.pen}
                                {t('Bemalen', 'Draw')}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(shot)}
                              aria-label={t(`Screenshot ${index + 1} entfernen`, `Remove screenshot ${index + 1}`)}
                              className="absolute -top-1.5 -right-1.5 inline-flex size-6 items-center justify-center rounded-full bg-white text-[var(--casa-muted)] shadow ring-1 ring-ws-line outline-none hover:text-[var(--casa-danger-text)] focus-visible:ring-2 focus-visible:ring-[var(--casa-blue)] [&_svg]:size-3"
                            >
                              {Icon.close}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              )}

              {dragging ? (
                <div className="pointer-events-none absolute inset-3 z-10 grid place-items-center rounded-2xl border-2 border-dashed border-[var(--casa-blue)] bg-[#e3f4fc]/90 text-[0.95rem] font-semibold text-[#065f8c]">
                  <span className="flex items-center gap-2 [&_svg]:size-5">
                    {Icon.image}
                    {t('Bild hier ablegen', 'Drop the picture here')}
                  </span>
                </div>
              ) : null}
            </div>

            {tab === 'new' && phase.kind !== 'sent' ? (
              <footer className="border-t border-ws-line bg-ws-card-head px-6 py-3.5 sm:rounded-b-3xl">
                {phase.kind === 'error' ? (
                  <p role="alert" className="mb-2.5 text-[0.82rem] font-semibold text-[var(--casa-danger-text)]">
                    {phase.message}
                  </p>
                ) : null}
                {phase.kind === 'sending' ? (
                  <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-ws-line" aria-hidden="true">
                    <div className="h-full rounded-full bg-[var(--fm-navy)] transition-[width] duration-200" style={{ width: `${Math.max(6, Math.round(phase.progress * 100))}%` }} />
                  </div>
                ) : null}
                <div className="flex items-center justify-end gap-2">
                  <span className="mr-auto hidden text-[0.74rem] text-[var(--casa-text-subtle)] sm:inline">{isMac() ? '⌘ ↵' : 'Strg ↵'}</span>
                  <Primitive.Close asChild>
                    <Button type="button" variant="ghost">
                      {t('Schließen', 'Close')}
                    </Button>
                  </Primitive.Close>
                  <Button type="button" onClick={send} disabled={!ready} title={!kind ? t('Wähle zuerst, worum es geht', 'Choose what it is about first') : undefined}>
                    {phase.kind === 'sending' ? t('Wird gesendet …', 'Sending …') : t('Senden', 'Send')}
                  </Button>
                </div>
              </footer>
            ) : null}
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>

      <ScreenshotEditor key={editing?.id ?? 'none'} shot={editing} onClose={() => setEditing(null)} onSave={(next) => editing && replace(editing, next)} />
    </>
  );
}

function Dot({ className, label }: { className?: string; label?: string }) {
  return <span aria-label={label} className={cn('absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-[#2f6fd1] ring-2', className)} />;
}

function Sent({ number, firstName, onMore, onMine }: { number: number; firstName: string; onMore: () => void; onMine: () => void }) {
  const { t } = useWsLang();
  return (
    <div className="flex flex-col items-center px-8 py-14 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-[#e6f5ec] text-[#14653a] ring-8 ring-[#e6f5ec]/50 motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-300 [&_svg]:size-7">
        {Icon.check}
      </span>
      <h2 className="mt-6 text-[1.25rem] font-extrabold tracking-[-0.01em] text-[var(--casa-ink)]">{t(`Danke, ${firstName}!`, `Thank you, ${firstName}!`)}</h2>
      <p className="mt-1.5 text-[0.92rem] text-[var(--casa-muted)]">{t(`Feedback #${number} ist angekommen.`, `Feedback #${number} has arrived.`)}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={onMore}>
          {t('Noch etwas melden', 'Report something else')}
        </Button>
        <Button type="button" variant="secondary" onClick={onMine}>
          {t('Mein Feedback', 'My feedback')}
        </Button>
      </div>
    </div>
  );
}

function MyList({ items, canReview, onNew }: { items: MyFeedback[] | null; canReview: boolean; onNew: () => void }) {
  const { t, lang } = useWsLang();
  if (!items) {
    return (
      <div className="space-y-3 px-6 py-5" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-ws-sunk" />
        ))}
      </div>
    );
  }
  return (
    <div className="px-6 py-5">
      {items.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-[0.92rem] font-semibold text-[var(--casa-ink)]">{t('Noch kein Feedback von dir.', 'No feedback from you yet.')}</p>
          <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={onNew}>
            {t('Feedback geben', 'Give feedback')}
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className={cn('rounded-2xl border bg-white p-4 shadow-ws-card', item.unread ? 'border-[#9cc0ef]' : 'border-ws-card-line')}>
              <div className="flex items-center gap-2.5">
                <IconChip icon={KIND_ICON[item.kind]} tint={KIND_TINT[item.kind]} />
                <span className="min-w-0 flex-1 truncate text-[0.84rem] font-semibold text-[var(--casa-ink)]">
                  <span className="text-[var(--casa-muted)] tabular-nums">#{item.number}</span> {pick(lang, FEEDBACK_KIND_LABELS[item.kind])}
                </span>
                <span className={cn('rounded-full px-2 py-0.5 text-[0.72rem] font-semibold whitespace-nowrap ring-1 ring-inset', STATE[item.status].tone)}>{pick(lang, STATE[item.status])}</span>
              </div>
              {item.message ? <p className="mt-2.5 line-clamp-3 text-[0.88rem] leading-relaxed whitespace-pre-line text-[var(--casa-ink)]">{item.message}</p> : null}
              {item.files.length ? (
                <div className="mt-2.5 flex gap-1.5">
                  {item.files.map((file) => (
                    <a key={file} href={`/admin/feedback/${item.id}/files/${file}`} target="_blank" rel="noreferrer" className="block h-12 w-[4.5rem] overflow-hidden rounded-md ring-1 ring-ws-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/admin/feedback/${item.id}/files/${file}`} alt="" loading="lazy" className="size-full object-cover object-top" />
                    </a>
                  ))}
                </div>
              ) : null}
              <p className="mt-2.5 truncate text-[0.76rem] text-[var(--casa-muted)]">
                {[item.pageTitle, relativeDays(item.submittedAt, lang)].filter(Boolean).join(' · ')}
              </p>
              {item.answer ? (
                <div className={cn('mt-3 rounded-xl px-3.5 py-3', item.unread ? 'bg-[#e8f1fd]' : 'bg-ws-sunk')}>
                  <p className="text-[0.76rem] font-semibold text-[var(--casa-muted)]">
                    {t('Antwort', 'Answer')}
                    {item.answeredBy ? ` · ${item.answeredBy}` : ''}
                    {item.answeredAt ? ` · ${relativeDays(item.answeredAt, lang)}` : ''}
                  </p>
                  <p className="mt-1 text-[0.88rem] leading-relaxed whitespace-pre-line text-[var(--casa-ink)]">{item.answer}</p>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canReview ? (
        <div className="mt-5 border-t border-ws-line pt-4 text-center">
          <Primitive.Close asChild>
            <Link href="/admin/feedback" className="text-[0.84rem] font-semibold text-[var(--casa-accent-text)] hover:underline">
              {t('Feedback des Teams öffnen', 'Open the team’s feedback')}
            </Link>
          </Primitive.Close>
        </div>
      ) : null}
    </div>
  );
}
