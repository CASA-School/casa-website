'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

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
 * always both: „In Outlook öffnen" — the mail is copied, its files are downloaded, Outlook opens with
 * recipients and subject, the CASA add-in adds the signature, ⌘V and send from one's own mailbox — or
 * „Direkt senden", which asks once more on a review of everything before the workspace sends it.
 *
 * A mail goes `together` (one mail, to everyone ticked; Bcc for several people) or to `each` recipient on
 * their own (letters to all: everyone their own letter). `variants` are the mail's languages: one subject
 * and text each, a recipient reads theirs. A page supplies the context, the recipients, `render` (the HTML
 * from the inputs — the same for the preview and the mail sent) and the server action that sends it.
 */

export type ComposerFile = { name: string; href: string };

export type ComposerRecipient = {
  email: string;
  name: string;
  detail?: string;
  group: string;
  chosen: boolean;
  /** What the form posts for this recipient (each on their own): the record it is about. */
  value?: string;
  /** Their language, among `variants`. */
  variant?: string;
  /** Their own file (each on their own): their letter as a PDF. */
  file?: ComposerFile;
};

export type ComposerVariant = { key: string; label: string; subject: string; text: string };

export type ComposerHistory = { id: string; title: string; detail: string };

export type RenderInput = {
  subject: string;
  text: string;
  signature: string | null;
  target: 'preview' | 'outlook';
  recipient: ComposerRecipient | null;
  variant: string;
};

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const box = 'size-4 shrink-0 rounded border-ws-line-firm accent-[var(--casa-accent-surface)]';
const segment = (on: boolean) =>
  cn(
    'h-7 rounded-lg px-3 text-[0.78rem] font-semibold transition-colors',
    on ? 'bg-white text-[var(--casa-ink)] shadow-[0_1px_2px_rgba(16,24,40,0.08)]' : 'text-[var(--casa-muted)] hover:text-[var(--casa-ink)]'
  );
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

function download(file: ComposerFile) {
  const a = document.createElement('a');
  a.href = file.href;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function MailComposer({
  context,
  recipients,
  missing = [],
  variants,
  signature,
  from,
  replyTo,
  render,
  action,
  hidden,
  blocker,
  inText,
  files = [],
  mode = 'together',
  bcc = true,
  sentNotice,
  history = [],
}: {
  /** What the mail is about, above the recipients (a test day, a letter). */
  context?: ReactNode;
  recipients: ComposerRecipient[];
  /** People who should get it and have no address on record. */
  missing?: string[];
  variants: ComposerVariant[];
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
  /** What the mail's text carries, for the review („3 QR-Codes"). */
  inText?: string;
  /** Files the mail carries (one mail together): a letter as a PDF. */
  files?: ComposerFile[];
  mode?: 'together' | 'each';
  /** Together: several people as Bcc (often private addresses); one person in „An". */
  bcc?: boolean;
  sentNotice?: string | null;
  history?: ComposerHistory[];
}) {
  const { t } = useWsLang();
  const formId = useId();
  const each = mode === 'each';
  const keyOf = (r: ComposerRecipient) => r.value ?? r.email;
  const [texts, setTexts] = useState<Record<string, { subject: string; text: string }>>(() =>
    Object.fromEntries(variants.map((v) => [v.key, { subject: v.subject, text: v.text }]))
  );
  const [variant, setVariant] = useState(variants[0]?.key ?? 'main');
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set(recipients.filter((r) => r.chosen).map(keyOf)));
  const [extra, setExtra] = useState('');
  const [signed, setSigned] = useState(signature !== null);
  const [width, setWidth] = useState<'desktop' | 'phone'>('desktop');
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [outlookList, setOutlookList] = useState(false);
  const [openedInOutlook, setOpenedInOutlook] = useState<ReadonlySet<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const confirmed = useRef<HTMLInputElement>(null);
  const [height, setHeight] = useState(1200);

  const extras = each ? [] : extra.split(/[\s,;]+/).filter(Boolean);
  const wrong = extras.filter((e) => !EMAIL.test(e));
  const people = recipients.filter((r) => chosen.has(keyOf(r)));
  const to = [...people.map((r) => r.email), ...extras.filter((e) => EMAIL.test(e))];
  const names = [...people.map((r) => r.name), ...extras.filter((e) => EMAIL.test(e))];
  const groups = [...new Set(recipients.map((r) => r.group))];
  const current = texts[variant] ?? { subject: '', text: '' };
  const filled = to.length > 0 && wrong.length === 0 && variants.every((v) => texts[v.key]?.subject.trim() && texts[v.key]?.text.trim());
  const previewed =
    people.find((r) => keyOf(r) === previewKey) ?? people.find((r) => (r.variant ?? variants[0]?.key) === variant) ?? people[0] ?? recipients[0] ?? null;
  const previewVariant = previewKey ? (previewed?.variant ?? variant) : variant;
  const shown = texts[previewVariant] ?? current;
  const html = render({
    subject: shown.subject,
    text: shown.text,
    signature: signed && signature ? signature.html : null,
    target: 'preview',
    recipient: previewed,
    variant: previewVariant,
  });
  const shownFiles = each ? (previewed?.file ? [previewed.file] : []) : files;
  const toLabel = !each && bcc && to.length > 1 ? 'Bcc' : t('An', 'To');

  // A narrower frame reflows the mail without loading it again: measure it once it has.
  useEffect(() => {
    const timer = setTimeout(() => {
      const doc = frame.current?.contentDocument;
      if (doc) setHeight(doc.documentElement.scrollHeight);
    }, 80);
    return () => clearTimeout(timer);
  }, [width]);

  const toggle = (key: string) => {
    const next = new Set(chosen);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setChosen(next);
  };

  /** Outlook: the mail on the clipboard, its files downloaded, a new message with recipients and subject. */
  const prepareOutlook = (recipient: ComposerRecipient | null, addresses: readonly string[], ownFiles: readonly ComposerFile[]) => {
    const v = recipient?.variant ?? variant;
    const text = texts[v] ?? current;
    const mail = render({ subject: text.subject, text: text.text, signature: null, target: 'outlook', recipient, variant: v });
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
    for (const file of ownFiles) download(file);
    const query = `subject=${encodeURIComponent(text.subject.trim())}`;
    const href = !each && bcc && addresses.length > 1 ? `mailto:?bcc=${addresses.join(',')}&${query}` : `mailto:${addresses.join(',')}?${query}`;
    // After the downloads have started: opening the mail program must not cut them off.
    setTimeout(() => window.location.assign(href), ownFiles.length ? 600 : 0);
  };

  const send = () => {
    if (!confirmed.current) return;
    confirmed.current.value = '1';
    setSending(true);
    setReviewing(false);
    (document.getElementById(formId) as HTMLFormElement | null)?.requestSubmit();
  };

  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
  const paste = mac ? '⌘V' : t('Strg+V', 'Ctrl+V');

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
          {variants.map((v) => (
            <span key={v.key} hidden>
              <input type="hidden" name={`subject.${v.key}`} value={texts[v.key]?.subject ?? ''} />
              <input type="hidden" name={`intro.${v.key}`} value={texts[v.key]?.text ?? ''} />
            </span>
          ))}
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
              const all = list.every((r) => chosen.has(keyOf(r)));
              return (
                <div key={group}>
                  {list.length > 1 ? (
                    <label className="flex cursor-pointer items-center gap-3 border-b border-ws-line-soft bg-ws-sunk/50 px-4 py-2.5 text-[0.84rem] font-semibold text-[var(--casa-ink)]">
                      <input
                        type="checkbox"
                        checked={all}
                        onChange={() => {
                          const next = new Set(chosen);
                          for (const r of list) {
                            if (all) next.delete(keyOf(r));
                            else next.add(keyOf(r));
                          }
                          setChosen(next);
                        }}
                        className={box}
                      />
                      {group}
                    </label>
                  ) : (
                    <p className="border-b border-ws-line-soft bg-ws-sunk/50 px-4 py-2.5 text-[0.84rem] font-semibold text-[var(--casa-ink)]">{group}</p>
                  )}
                  <ul className="divide-y divide-ws-line-soft">
                    {list.map((r) => (
                      <li key={keyOf(r)}>
                        <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--ws-row-hover)]">
                          <input
                            type="checkbox"
                            name={each ? 'letter' : 'email'}
                            value={each ? keyOf(r) : r.email}
                            checked={chosen.has(keyOf(r))}
                            onChange={() => toggle(keyOf(r))}
                            className={box}
                          />
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
            {each ? null : (
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
            )}
          </Card>

          <Card
            title={t('Nachricht', 'Message')}
            icon={Icon.mail}
            tint="blue"
            actions={
              variants.length > 1 ? (
                <div role="radiogroup" aria-label={t('Sprache', 'Language')} className="inline-flex gap-0.5 rounded-xl bg-ws-sunk p-0.5">
                  {variants.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      role="radio"
                      aria-checked={variant === v.key}
                      onClick={() => {
                        setVariant(v.key);
                        setPreviewKey(null);
                      }}
                      className={segment(variant === v.key)}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              ) : undefined
            }
          >
            <div className="grid gap-4">
              <Field label={t('Betreff', 'Subject')} htmlFor={`${formId}-subject`}>
                <Input
                  id={`${formId}-subject`}
                  value={current.subject}
                  onChange={(e) => setTexts({ ...texts, [variant]: { ...current, subject: e.target.value } })}
                  maxLength={200}
                  required
                />
              </Field>
              <Field label={t('Text', 'Text')} htmlFor={`${formId}-text`}>
                <Textarea
                  id={`${formId}-text`}
                  value={current.text}
                  onChange={(e) => setTexts({ ...texts, [variant]: { ...current, text: e.target.value } })}
                  rows={7}
                  maxLength={4000}
                  required
                />
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
              <span className="text-[0.84rem] text-[var(--casa-muted)]">
                {each ? t(`${to.length} E-Mails, jede an eine Person`, `${to.length} e-mails, each to one person`) : t(`An ${to.length} Empfänger`, `To ${to.length} recipients`)}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={!filled}
                  onClick={() => (each ? setOutlookList(true) : prepareOutlook(people[0] ?? null, to, files))}
                  className="w-full justify-center"
                >
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
          {copied === 'yes' && !each ? (
            <p role="status" className="mt-2.5 text-[0.8rem] font-semibold text-[#1e6b34]">
              {files.length
                ? t(`Text kopiert, PDF geladen · in Outlook mit ${paste} einfügen und das PDF anhängen`, `Text copied, PDF downloaded · paste with ${paste} in Outlook and attach the PDF`)
                : t(`Text kopiert · in Outlook mit ${paste} einfügen`, `Text copied · paste it in Outlook with ${paste}`)}
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
          <div className="flex flex-wrap items-center gap-2">
            {each && people.length > 1 ? (
              <select
                aria-label={t('Vorschau für', 'Preview for')}
                value={previewed ? keyOf(previewed) : ''}
                onChange={(e) => setPreviewKey(e.target.value)}
                className="h-8 max-w-[14rem] rounded-lg border border-ws-line bg-white px-2 text-[0.78rem] font-semibold text-[var(--casa-ink)]"
              >
                {people.map((r) => (
                  <option key={keyOf(r)} value={keyOf(r)}>
                    {r.name}
                  </option>
                ))}
              </select>
            ) : null}
            <div role="radiogroup" aria-label={t('Breite', 'Width')} className="inline-flex gap-0.5 rounded-xl bg-ws-sunk p-0.5">
              {(['desktop', 'phone'] as const).map((w) => (
                <button key={w} type="button" role="radio" aria-checked={width === w} onClick={() => setWidth(w)} className={segment(width === w)}>
                  {w === 'desktop' ? t('Computer', 'Desktop') : t('Handy', 'Phone')}
                </button>
              ))}
            </div>
          </div>
        </header>
        <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 border-b border-ws-line-soft px-4 py-3 text-[0.82rem]">
          <dt className="text-[var(--casa-muted)]">{t('Von', 'From')}</dt>
          <dd className="truncate text-[var(--casa-ink)]">{from ?? '—'}</dd>
          <dt className="text-[var(--casa-muted)]">{t('Antworten an', 'Reply to')}</dt>
          <dd className="truncate text-[var(--casa-ink)]">{replyTo}</dd>
          <dt className="text-[var(--casa-muted)]">{toLabel}</dt>
          <dd className="text-[var(--casa-ink)]">{each ? (previewed ? `${previewed.name} · ${previewed.email}` : '—') : names.length ? names.join(', ') : '—'}</dd>
          <dt className="text-[var(--casa-muted)]">{t('Betreff', 'Subject')}</dt>
          <dd className="font-semibold text-[var(--casa-ink)]">{shown.subject.trim() || '—'}</dd>
          {shownFiles.length ? (
            <>
              <dt className="text-[var(--casa-muted)]">{t('Anhang', 'Attachment')}</dt>
              <dd className="flex min-w-0 flex-wrap gap-1.5">
                {shownFiles.map((f) => (
                  <a
                    key={f.href}
                    href={f.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-ws-sunk px-2 py-1 text-[0.78rem] font-semibold text-[var(--casa-ink)] hover:bg-[#e8eef7]"
                  >
                    <span className="rounded bg-[#e30613] px-1 text-[0.62rem] font-bold text-white">PDF</span>
                    <span className="truncate">{f.name}</span>
                  </a>
                ))}
              </dd>
            </>
          ) : null}
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
                {each ? t(`${to.length} E-Mails gehen sofort hinaus.`, `${to.length} e-mails go out at once.`) : t('Die E-Mail geht sofort hinaus.', 'The e-mail goes out at once.')}
              </DialogDescription>
            </div>
          </div>
          <dl className="mx-6 mt-5 grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-2xl bg-ws-sunk/60 px-4 py-3.5 text-[0.84rem]">
            <dt className="text-[var(--casa-muted)]">{t('Von', 'From')}</dt>
            <dd className="truncate text-[var(--casa-ink)]">{from}</dd>
            <dt className="text-[var(--casa-muted)]">{t('Antworten an', 'Reply to')}</dt>
            <dd className="truncate text-[var(--casa-ink)]">{replyTo}</dd>
            <dt className="text-[var(--casa-muted)]">{each ? t('An (je eine)', 'To (one each)') : toLabel === 'Bcc' ? t('An (Bcc)', 'To (Bcc)') : t('An', 'To')}</dt>
            <dd className="text-[var(--casa-ink)]">
              <span className="font-semibold">{t(`${to.length} Empfänger`, `${to.length} recipients`)}</span>
              <span className="block text-[0.8rem] text-[var(--casa-muted)]">{names.join(', ')}</span>
            </dd>
            <dt className="text-[var(--casa-muted)]">{t('Betreff', 'Subject')}</dt>
            <dd className="font-semibold text-[var(--casa-ink)]">{variants.map((v) => texts[v.key]?.subject.trim()).filter(Boolean).join(' · ')}</dd>
            <dt className="text-[var(--casa-muted)]">{t('Signatur', 'Signature')}</dt>
            <dd className="text-[var(--casa-ink)]">
              {signed && signature ? (signature.owner === 'own' ? t('Deine CASA-Signatur', 'Your CASA signature') : t('Signatur des Büros', 'The office’s signature')) : t('Ohne', 'None')}
            </dd>
            {each && people.some((r) => r.file) ? (
              <>
                <dt className="text-[var(--casa-muted)]">{t('Anhang', 'Attachment')}</dt>
                <dd className="text-[var(--casa-ink)]">{t('Jede Person ihr eigener Brief als PDF', 'Everyone their own letter as a PDF')}</dd>
              </>
            ) : files.length ? (
              <>
                <dt className="text-[var(--casa-muted)]">{t('Anhang', 'Attachment')}</dt>
                <dd className="text-[var(--casa-ink)]">{files.map((f) => f.name).join(', ')}</dd>
              </>
            ) : null}
            {inText ? (
              <>
                <dt className="text-[var(--casa-muted)]">{t('Im Text', 'In the text')}</dt>
                <dd className="text-[var(--casa-ink)]">{inText}</dd>
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

      <Dialog open={outlookList} onOpenChange={setOutlookList}>
        <DialogContent className={dialogPanel('md')} overlayClassName={DIALOG_OVERLAY} closeLabel={t('Schließen', 'Close')}>
          <div className="px-6 pt-6">
            <DialogTitle className="text-[1.04rem] font-extrabold text-[var(--casa-ink)]">{t('In Outlook öffnen', 'Open in Outlook')}</DialogTitle>
            <DialogDescription className="mt-1 text-[0.84rem] text-[var(--casa-muted)]">
              {t(`Eine E-Mail je Person · Text mit ${paste} einfügen, PDF anhängen`, `One e-mail per person · paste the text with ${paste}, attach the PDF`)}
            </DialogDescription>
          </div>
          <ul className="mx-6 mt-4 mb-6 max-h-[24rem] divide-y divide-ws-line-soft overflow-y-auto rounded-2xl border border-ws-line">
            {people.map((r) => {
              const done = openedInOutlook.has(keyOf(r));
              return (
                <li key={keyOf(r)} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.86rem] font-semibold text-[var(--casa-ink)]">{r.name}</span>
                    <span className="block truncate text-[0.76rem] text-[var(--casa-muted)]">{r.email}</span>
                  </span>
                  <Button
                    type="button"
                    variant={done ? 'ghost' : 'secondary'}
                    size="sm"
                    onClick={() => {
                      prepareOutlook(r, [r.email], r.file ? [r.file] : []);
                      setOpenedInOutlook(new Set(openedInOutlook).add(keyOf(r)));
                    }}
                  >
                    {done ? Icon.check : Icon.external}
                    {done ? t('Geöffnet', 'Opened') : t('Öffnen', 'Open')}
                  </Button>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
