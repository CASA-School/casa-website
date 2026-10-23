'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';

import { DIALOG_OVERLAY, dialogPanel } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { Button, Card, Field, IconChip, Input, Textarea } from '@/components/admin/ui';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Every mail the workspace sends goes through this screen (Rahman, 2026-10-23: „we should have such an
 * interface always when we send letters or emails through the platform directly"): who gets it, the
 * subject and the text, the sender's signature, and on the right the mail as it will arrive. Two ways out,
 * always both: „In Outlook öffnen" — the mail is copied, Outlook opens with recipients and subject, the
 * CASA add-in adds the signature, ⌘V and send from one's own mailbox — or „Direkt senden", which asks once
 * more on a review of everything before the workspace sends it. A page supplies the context, the
 * recipients, `render` (the mail's HTML from the inputs) and the server action that sends it.
 */

export type ComposerRecipient = { email: string; name: string; detail?: string; group: string; chosen: boolean };

export type ComposerHistory = { id: string; title: string; detail: string };

type RenderInput = { subject: string; text: string; signature: string | null; target: 'preview' | 'outlook' };

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const box = 'size-4 shrink-0 rounded border-ws-line-firm accent-[var(--casa-accent-surface)]';
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

export function MailComposer({
  context,
  recipients,
  missing = [],
  subject: initialSubject,
  text: initialText,
  signature,
  from,
  replyTo,
  render,
  action,
  hidden,
  blocker,
  attachments,
  sentNotice,
  history = [],
}: {
  /** What the mail is about, above the recipients (a test day, a booking). */
  context?: ReactNode;
  recipients: ComposerRecipient[];
  /** People who should get it and have no address on record. */
  missing?: string[];
  subject: string;
  text: string;
  /** The sender's CASA signature, as Outlook adds it; none when it cannot be had. */
  signature: { owner: 'own' | 'office'; html: string } | null;
  /** The mailbox the workspace sends from; none where sending is not set up. */
  from: string | null;
  replyTo: string;
  render: (input: RenderInput) => string;
  action: (formData: FormData) => void | Promise<void>;
  hidden: Record<string, string>;
  /** Instead of the two ways to send, while something must happen first (the tests opened). */
  blocker?: ReactNode;
  /** What travels with the mail, for the review („3 QR-Codes"). */
  attachments?: string;
  sentNotice?: string | null;
  history?: ComposerHistory[];
}) {
  const { t } = useWsLang();
  const formId = useId();
  const [subject, setSubject] = useState(initialSubject);
  const [text, setText] = useState(initialText);
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set(recipients.filter((r) => r.chosen).map((r) => r.email)));
  const [extra, setExtra] = useState('');
  const [signed, setSigned] = useState(signature !== null);
  const [width, setWidth] = useState<'desktop' | 'phone'>('desktop');
  const [reviewing, setReviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const confirmed = useRef<HTMLInputElement>(null);
  const [height, setHeight] = useState(1200);

  const extras = extra.split(/[\s,;]+/).filter(Boolean);
  const wrong = extras.filter((e) => !EMAIL.test(e));
  const people = recipients.filter((r) => chosen.has(r.email));
  const to = [...people.map((r) => r.email), ...extras.filter((e) => EMAIL.test(e))];
  const names = [...people.map((r) => r.name), ...extras.filter((e) => EMAIL.test(e))];
  const groups = [...new Set(recipients.map((r) => r.group))];
  const filled = to.length > 0 && subject.trim() !== '' && text.trim() !== '' && wrong.length === 0;
  const html = useMemo(
    () => render({ subject, text, signature: signed && signature ? signature.html : null, target: 'preview' }),
    [render, subject, text, signed, signature]
  );

  // A narrower frame reflows the mail without loading it again: measure it once it has.
  useEffect(() => {
    const timer = setTimeout(() => {
      const doc = frame.current?.contentDocument;
      if (doc) setHeight(doc.documentElement.scrollHeight);
    }, 80);
    return () => clearTimeout(timer);
  }, [width]);

  const toggle = (email: string) => {
    const next = new Set(chosen);
    if (next.has(email)) next.delete(email);
    else next.add(email);
    setChosen(next);
  };

  /** Outlook: the mail on the clipboard, a new message with recipients and subject; the add-in signs it. */
  const openInOutlook = () => {
    const mail = render({ subject, text, signature: null, target: 'outlook' });
    const plain = new DOMParser().parseFromString(mail, 'text/html').body.innerText;
    const copy =
      typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write
        ? navigator.clipboard.write([
            new ClipboardItem({ 'text/html': new Blob([mail], { type: 'text/html' }), 'text/plain': new Blob([plain], { type: 'text/plain' }) }),
          ])
        : Promise.reject(new Error('no clipboard'));
    copy.then(
      () => setCopied('yes'),
      () => setCopied('no')
    );
    window.location.assign(`mailto:?bcc=${to.join(',')}&subject=${encodeURIComponent(subject.trim())}`);
  };

  const send = () => {
    if (!confirmed.current) return;
    confirmed.current.value = '1';
    setSending(true);
    setReviewing(false);
    (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit();
  };

  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,27rem)_minmax(0,1fr)]">
      <div className="grid content-start gap-5">
        {sentNotice ? (
          <p role="status" className="flex items-center gap-2.5 rounded-2xl border border-[#bfe3c9] bg-[#ecf7ef] px-4 py-3 text-[0.88rem] font-semibold text-[#1e6b34] [&_svg]:size-4">
            {Icon.check}
            {sentNotice}
          </p>
        ) : null}

        {context}

        <form id={formId} action={action} className="grid gap-5">
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <input ref={confirmed} type="hidden" name="confirmed" value="" />
          {signed && signature ? <input type="hidden" name="signature" value="1" /> : null}
          {extras.filter((e) => EMAIL.test(e)).map((e) => (
            <input key={e} type="hidden" name="email" value={e} />
          ))}

          <Card
            title={t('Empfänger', 'Recipients')}
            icon={Icon.people}
            tint="blue"
            bleed
            actions={<span className="text-[0.8rem] font-semibold text-[var(--casa-muted)] tabular-nums">{to.length}</span>}
          >
            {groups.map((group) => {
              const list = recipients.filter((r) => r.group === group);
              const all = list.every((r) => chosen.has(r.email));
              return (
                <div key={group}>
                  <label className="flex cursor-pointer items-center gap-3 border-b border-ws-line-soft bg-ws-sunk/50 px-4 py-2.5 text-[0.84rem] font-semibold text-[var(--casa-ink)]">
                    <input
                      type="checkbox"
                      checked={all}
                      onChange={() => {
                        const next = new Set(chosen);
                        for (const r of list) {
                          if (all) next.delete(r.email);
                          else next.add(r.email);
                        }
                        setChosen(next);
                      }}
                      className={box}
                    />
                    {group}
                  </label>
                  <ul className="divide-y divide-ws-line-soft">
                    {list.map((r) => (
                      <li key={r.email}>
                        <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--ws-row-hover)]">
                          <input type="checkbox" name="email" value={r.email} checked={chosen.has(r.email)} onChange={() => toggle(r.email)} className={box} />
                          <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e8eef7] text-[0.7rem] font-bold text-[var(--casa-ink)]">
                            {initials(r.name)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[0.86rem] font-semibold text-[var(--casa-ink)]">{r.name}</span>
                            <span className="block truncate text-[0.76rem] text-[var(--casa-muted)]">{[r.detail, r.email].filter(Boolean).join(' · ')}</span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {missing.length ? (
              <p className="flex items-start gap-2 border-t border-ws-line-soft px-4 py-2.5 text-[0.8rem] text-[#8a5a00] [&_svg]:mt-0.5 [&_svg]:size-3.5 [&_svg]:shrink-0">
                {Icon.attention}
                {t(`Ohne E-Mail-Adresse: ${missing.join(', ')}`, `No e-mail address: ${missing.join(', ')}`)}
              </p>
            ) : null}
            <div className="border-t border-ws-line-soft px-4 py-3">
              <Field label={t('Weitere Adressen', 'More addresses')} htmlFor={`${formId}-extra`}>
                <Input
                  id={`${formId}-extra`}
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder={t('z. B. studienleitung@casa-bremen.de', 'e.g. studienleitung@casa-bremen.de')}
                  aria-invalid={wrong.length > 0 || undefined}
                />
              </Field>
              {wrong.length ? (
                <p className="mt-1.5 text-[0.78rem] text-[var(--casa-danger-text)]">{t(`Keine E-Mail-Adresse: ${wrong.join(', ')}`, `Not an e-mail address: ${wrong.join(', ')}`)}</p>
              ) : null}
            </div>
          </Card>

          <Card title={t('Nachricht', 'Message')} icon={Icon.mail} tint="blue">
            <div className="grid gap-4">
              <Field label={t('Betreff', 'Subject')} htmlFor={`${formId}-subject`}>
                <Input id={`${formId}-subject`} name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} required />
              </Field>
              <Field label={t('Text', 'Text')} htmlFor={`${formId}-text`}>
                <Textarea id={`${formId}-text`} name="intro" value={text} onChange={(e) => setText(e.target.value)} rows={7} maxLength={4000} required />
              </Field>
              <label className={cn('flex items-center gap-3 rounded-xl border border-ws-line px-3.5 py-3', signature ? 'cursor-pointer' : 'opacity-60')}>
                <input type="checkbox" checked={signed && signature !== null} disabled={!signature} onChange={() => setSigned(!signed)} className={box} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.86rem] font-semibold text-[var(--casa-ink)]">{t('Signatur anfügen', 'Add the signature')}</span>
                  <span className="block text-[0.76rem] text-[var(--casa-muted)]">
                    {signature
                      ? signature.owner === 'own'
                        ? t('Deine CASA-Signatur, wie in Outlook', 'Your CASA signature, as in Outlook')
                        : t('Signatur des Büros (info@)', 'The office’s signature (info@)')
                      : t('Gerade nicht erreichbar', 'Not available just now')}
                  </span>
                </span>
              </label>
            </div>
          </Card>
        </form>

        <div className="rounded-3xl border border-ws-line bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          {blocker ?? (
            <div className="grid gap-2.5">
              <span className="text-[0.84rem] text-[var(--casa-muted)]">{t(`An ${to.length} Empfänger`, `To ${to.length} recipients`)}</span>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="secondary" size="md" disabled={!filled} onClick={openInOutlook} className="w-full justify-center">
                  {Icon.external}
                  {t('In Outlook öffnen', 'Open in Outlook')}
                </Button>
                <Button type="button" variant="primary" size="md" disabled={!filled || !from || sending} onClick={() => setReviewing(true)} className="w-full justify-center">
                  {Icon.mail}
                  {sending ? t('Wird gesendet …', 'Sending …') : t('Direkt senden', 'Send directly')}
                </Button>
              </div>
            </div>
          )}
          {copied === 'yes' ? (
            <p role="status" className="mt-2.5 text-[0.8rem] font-semibold text-[#1e6b34]">
              {t(`Inhalt kopiert · in Outlook mit ${mac ? '⌘V' : 'Strg+V'} einfügen`, `Content copied · paste it in Outlook with ${mac ? '⌘V' : 'Ctrl+V'}`)}
            </p>
          ) : copied === 'no' ? (
            <p role="alert" className="mt-2.5 text-[0.8rem] font-semibold text-[var(--casa-danger-text)]">
              {t('Kopieren ging nicht – bitte noch einmal klicken.', 'Copying failed – please click again.')}
            </p>
          ) : null}
        </div>

        {history.length ? (
          <Card title={t('Gesendet', 'Sent')} icon={Icon.check} bleed>
            <ul className="divide-y divide-ws-line-soft">
              {history.map((h) => (
                <li key={h.id} className="px-4 py-2.5">
                  <span className="block text-[0.84rem] font-semibold text-[var(--casa-ink)]">{h.title}</span>
                  <span className="block text-[0.76rem] text-[var(--casa-muted)]">{h.detail}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>

      <section
        aria-label={t('Vorschau', 'Preview')}
        className="self-start overflow-hidden rounded-3xl border border-ws-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_18px_40px_-28px_rgba(15,23,42,0.35)] xl:sticky xl:top-20"
      >
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ws-line px-4 py-2.5">
          <h2 className="text-sm font-extrabold text-[var(--casa-ink)]">{t('Vorschau', 'Preview')}</h2>
          <div role="radiogroup" aria-label={t('Breite', 'Width')} className="inline-flex gap-0.5 rounded-xl bg-ws-sunk p-0.5">
            {(['desktop', 'phone'] as const).map((w) => (
              <button
                key={w}
                type="button"
                role="radio"
                aria-checked={width === w}
                onClick={() => setWidth(w)}
                className={cn(
                  'h-7 rounded-lg px-3 text-[0.78rem] font-semibold transition-colors',
                  width === w ? 'bg-white text-[var(--casa-ink)] shadow-[0_1px_2px_rgba(16,24,40,0.08)]' : 'text-[var(--casa-muted)] hover:text-[var(--casa-ink)]'
                )}
              >
                {w === 'desktop' ? t('Computer', 'Desktop') : t('Handy', 'Phone')}
              </button>
            ))}
          </div>
        </header>
        <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-b border-ws-line-soft px-4 py-3 text-[0.82rem]">
          <dt className="text-[var(--casa-muted)]">{t('Von', 'From')}</dt>
          <dd className="truncate text-[var(--casa-ink)]">{from ?? '—'}</dd>
          <dt className="text-[var(--casa-muted)]">{t('Antworten an', 'Reply to')}</dt>
          <dd className="truncate text-[var(--casa-ink)]">{replyTo}</dd>
          <dt className="text-[var(--casa-muted)]">Bcc</dt>
          <dd className="text-[var(--casa-ink)]">{names.length ? names.join(', ') : '—'}</dd>
          <dt className="text-[var(--casa-muted)]">{t('Betreff', 'Subject')}</dt>
          <dd className="font-semibold text-[var(--casa-ink)]">{subject.trim() || '—'}</dd>
        </dl>
        <div className="bg-[#eef2f7] px-3 py-4">
          <iframe
            ref={frame}
            title={t('Vorschau der E-Mail', 'E-mail preview')}
            srcDoc={html}
            sandbox="allow-same-origin"
            onLoad={() => {
              const doc = frame.current?.contentDocument;
              if (doc) setHeight(doc.documentElement.scrollHeight);
            }}
            style={{ height }}
            className={cn('mx-auto block w-full rounded-xl border-0 bg-white transition-[max-width]', width === 'phone' ? 'max-w-[390px]' : 'max-w-[700px]')}
          />
        </div>
      </section>

      <Dialog open={reviewing} onOpenChange={setReviewing}>
        <DialogContent className={dialogPanel('md')} overlayClassName={DIALOG_OVERLAY} showCloseButton={false}>
          <div className="flex items-start gap-3.5 px-6 pt-6">
            <IconChip icon={Icon.mail} tint="blue" size="md" />
            <div className="min-w-0 pt-0.5">
              <DialogTitle className="text-[1.04rem] leading-snug font-extrabold tracking-[-0.01em] text-[var(--casa-ink)]">{t('Jetzt direkt senden?', 'Send it directly now?')}</DialogTitle>
              <DialogDescription className="mt-1 text-[0.84rem] text-[var(--casa-muted)]">
                {t('Die E-Mail geht sofort hinaus.', 'The e-mail goes out at once.')}
              </DialogDescription>
            </div>
          </div>
          <dl className="mx-6 mt-5 grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-2xl bg-ws-sunk/60 px-4 py-3.5 text-[0.84rem]">
            <dt className="text-[var(--casa-muted)]">{t('Von', 'From')}</dt>
            <dd className="truncate text-[var(--casa-ink)]">{from}</dd>
            <dt className="text-[var(--casa-muted)]">{t('Antworten an', 'Reply to')}</dt>
            <dd className="truncate text-[var(--casa-ink)]">{replyTo}</dd>
            <dt className="text-[var(--casa-muted)]">{t('An (Bcc)', 'To (Bcc)')}</dt>
            <dd className="text-[var(--casa-ink)]">
              <span className="font-semibold">{t(`${to.length} Empfänger`, `${to.length} recipients`)}</span>
              <span className="block text-[0.8rem] text-[var(--casa-muted)]">{names.join(', ')}</span>
            </dd>
            <dt className="text-[var(--casa-muted)]">{t('Betreff', 'Subject')}</dt>
            <dd className="font-semibold text-[var(--casa-ink)]">{subject.trim()}</dd>
            <dt className="text-[var(--casa-muted)]">{t('Signatur', 'Signature')}</dt>
            <dd className="text-[var(--casa-ink)]">
              {signed && signature ? (signature.owner === 'own' ? t('Deine CASA-Signatur', 'Your CASA signature') : t('Signatur des Büros', 'The office’s signature')) : t('Ohne', 'None')}
            </dd>
            {attachments ? (
              <>
                <dt className="text-[var(--casa-muted)]">{t('Im Text', 'In the text')}</dt>
                <dd className="text-[var(--casa-ink)]">{attachments}</dd>
              </>
            ) : null}
          </dl>
          <div className="mt-6 flex justify-end gap-2 rounded-b-3xl border-t border-ws-line bg-ws-sunk/50 px-6 py-3.5">
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="md">
                {t('Zurück', 'Back')}
              </Button>
            </DialogClose>
            <Button type="button" variant="primary" size="md" onClick={send}>
              {Icon.mail}
              {t('Jetzt senden', 'Send now')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
