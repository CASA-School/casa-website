'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { DIALOG_OVERLAY, dialogPanel } from '@/components/admin/dialogs';
import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { Button, Card, IconChip, Select } from '@/components/admin/ui';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Every mail the workspace sends goes through this screen (Rahman, 2026-10-23: „we should have such an
 * interface always when we send letters or emails through the platform directly"). It reads like a mail
 * program (2026-10-23, „clean, elegant, properly structured"): one card to write in — An as name chips,
 * Betreff, the attachments, the text, the signature — the mail as it will arrive beside it, and a bar
 * that stays in view with the two ways out, always both: „Im Mailprogramm öffnen" — the mail is copied,
 * its files are downloaded, the computer's own mail program (Outlook at CASA, Apple Mail or another)
 * opens with recipients and subject; Outlook's CASA add-in adds the signature; ⌘V and send from one's own
 * mailbox — or „Direkt senden", which asks once more on a review of everything before the workspace sends.
 *
 * A mail goes `together` (one mail, to everyone ticked; Bcc for several people) or to `each` recipient on
 * their own (letters to all: everyone their own letter). `variants` are the mail's languages: one subject
 * and text each, a recipient reads theirs. A page supplies the recipients, `render` (the HTML from the
 * inputs — the same for the preview and the mail sent), the server action that sends it, and what the
 * mail is about in its own header (`context` only where there is more to see: the test day's codes).
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
  target: 'preview' | 'mailapp';
  recipient: ComposerRecipient | null;
  variant: string;
};

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
/** More people of one group than this show as one chip: „Teilnehmende (14)". */
const CHIPS_PER_GROUP = 3;
const box = 'size-4 shrink-0 rounded border-ws-line-firm accent-[var(--casa-accent-surface)]';
const segment = (on: boolean) =>
  cn(
    'h-7 rounded-lg px-3 text-[0.78rem] font-semibold transition-colors',
    on ? 'bg-white text-[var(--casa-ink)] shadow-[0_1px_2px_rgba(16,24,40,0.08)]' : 'text-[var(--casa-muted)] hover:text-[var(--casa-ink)]'
  );
const rowLabel = 'w-[4.5rem] shrink-0 pt-[0.4rem] text-[0.8rem] text-[var(--casa-muted)]';
const chip = 'inline-flex h-8 max-w-full items-center gap-1.5 rounded-full bg-[#e8eef7] text-[0.82rem] font-semibold text-[var(--casa-ink)]';
const chipRemove =
  'grid size-6 shrink-0 place-items-center rounded-full text-[var(--casa-muted)] transition-colors hover:bg-white hover:text-[var(--casa-ink)] [&_svg]:size-3';
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

function PdfChip({ file, label }: { file: ComposerFile; label?: string }) {
  return (
    <a
      href={file.href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-ws-line bg-ws-sunk/60 py-1 pr-2.5 pl-1.5 text-[0.78rem] font-semibold text-[var(--casa-ink)] transition-colors hover:bg-[#e8eef7]"
    >
      <span className="rounded bg-[#e30613] px-1 text-[0.6rem] leading-4 font-bold text-white">PDF</span>
      <span className="min-w-0 truncate">{label ?? file.name}</span>
    </a>
  );
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
  salutation,
}: {
  /** More to see than the header says, above the mail (the test day and its codes). */
  context?: ReactNode;
  recipients: ComposerRecipient[];
  /** People who should get it and have no address on record. */
  missing?: string[];
  variants: ComposerVariant[];
  /** The sender's CASA signature, as their mail program adds it; none when it cannot be had. */
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
  /** A greeting the mail opens with that is not written here (a letter's own salutation), shown above the text. */
  salutation?: (recipient: ComposerRecipient | null, variant: string) => string | null;
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
  const [extras, setExtras] = useState<string[]>([]);
  const [typing, setTyping] = useState('');
  const [signed, setSigned] = useState(signature !== null);
  const [width, setWidth] = useState<'desktop' | 'phone'>('desktop');
  const [pane, setPane] = useState<'write' | 'preview'>('write');
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [mailAppList, setMailAppList] = useState(false);
  const [openedInMailApp, setOpenedInMailApp] = useState<ReadonlySet<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const confirmed = useRef<HTMLInputElement>(null);
  const [height, setHeight] = useState(480);

  const pending = typing.trim();
  const pendingWrong = pending !== '' && !EMAIL.test(pending);
  const people = recipients.filter((r) => chosen.has(keyOf(r)));
  const to = [...people.map((r) => r.email), ...extras];
  const names = [...people.map((r) => r.name), ...extras];
  const groups = [...new Set(recipients.map((r) => r.group))];
  const current = texts[variant] ?? { subject: '', text: '' };
  const filled = to.length > 0 && !pendingWrong && variants.every((v) => texts[v.key]?.subject.trim() && texts[v.key]?.text.trim());
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
  const asBcc = !each && bcc && to.length > 1;
  const toLabel = asBcc ? 'Bcc' : t('An', 'To');
  // A list to choose from: more than one person, or one who is not ticked.
  const canPick = recipients.length > 1 || recipients.some((r) => !chosen.has(keyOf(r)));

  const toggle = (key: string) => {
    const next = new Set(chosen);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setChosen(next);
  };

  /** The ticked people as chips: a few by name, more of one group as one chip. */
  const chips = groups.flatMap((group) => {
    const list = recipients.filter((r) => r.group === group);
    const picked = list.filter((r) => chosen.has(keyOf(r)));
    if (picked.length > CHIPS_PER_GROUP) {
      return [
        {
          key: `group:${group}`,
          label: picked.length === list.length ? `${group} (${picked.length})` : t(`${group}: ${picked.length} von ${list.length}`, `${group}: ${picked.length} of ${list.length}`),
          title: picked.map((r) => r.name).join(', '),
          email: null as string | null,
          remove: () => {
            const next = new Set(chosen);
            for (const r of list) next.delete(keyOf(r));
            setChosen(next);
          },
        },
      ];
    }
    return picked.map((r) => ({ key: keyOf(r), label: r.name, title: r.email, email: r.email as string | null, remove: () => toggle(keyOf(r)) }));
  });
  const oneChip = chips.length + extras.length === 1;

  // The text grows with what is written, as in a mail program.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight + 2, 240)}px`;
  }, [current.text, variant, pane]);

  /** The preview frame as tall as the mail in it. */
  const measure = () => {
    const doc = frame.current?.contentDocument;
    if (doc?.body) setHeight(Math.max(doc.body.scrollHeight, 200));
  };

  // A narrower frame reflows the mail without loading it again: measure it once it has.
  useEffect(() => {
    const timer = setTimeout(() => {
      const doc = frame.current?.contentDocument;
      if (doc?.body) setHeight(Math.max(doc.body.scrollHeight, 200));
    }, 220);
    return () => clearTimeout(timer);
  }, [width, pane]);

  /** A typed address becomes a chip at Enter, a comma or on leaving the field. */
  const commit = () => {
    const parts = typing.split(/[\s,;]+/).filter(Boolean);
    if (!parts.length) return;
    const known = new Set(to.map((e) => e.toLowerCase()));
    setExtras([...extras, ...parts.filter((p) => EMAIL.test(p) && !known.has(p.toLowerCase()))]);
    setTyping(parts.filter((p) => !EMAIL.test(p)).join(' '));
  };
  const onTypingKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !typing && extras.length) {
      setExtras(extras.slice(0, -1));
    }
  };

  /** The mail program: the mail on the clipboard, its files downloaded, a new message with recipients and subject. */
  const prepareMailApp = (recipient: ComposerRecipient | null, addresses: readonly string[], ownFiles: readonly ComposerFile[]) => {
    const v = recipient?.variant ?? variant;
    const text = texts[v] ?? current;
    const mail = render({ subject: text.subject, text: text.text, signature: null, target: 'mailapp', recipient, variant: v });
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
  const summary = each
    ? t(`${to.length} E-Mails, jede an eine Person`, `${to.length} e-mails, each to one person`)
    : to.length === 1
      ? t(`An ${names[0]}`, `To ${names[0]}`)
      : asBcc
        ? t(`An ${to.length} Empfänger · Bcc`, `To ${to.length} recipients · Bcc`)
        : t(`An ${to.length} Empfänger`, `To ${to.length} recipients`);
  const attached = each ? (people.some((r) => r.file) ? 1 : 0) : files.length;

  return (
    <div className="pb-2">
      {sentNotice ? (
        <p role="status" className="mb-5 flex items-center gap-2.5 rounded-2xl border border-[#bfe3c9] bg-[#ecf7ef] px-4 py-3 text-[0.88rem] font-semibold text-[#1e6b34] [&_svg]:size-4">
          {Icon.check}
          {sentNotice}
        </p>
      ) : null}

      {/* On a phone the mail and its preview are two tabs; on a wide screen they sit side by side. */}
      <div role="tablist" aria-label={t('Ansicht', 'View')} className="mb-4 inline-flex gap-0.5 rounded-xl bg-white p-0.5 ring-1 ring-ws-line xl:hidden">
        {(['write', 'preview'] as const).map((p) => (
          <button key={p} type="button" role="tab" aria-selected={pane === p} onClick={() => setPane(p)} className={cn(segment(pane === p), 'h-8 px-4', pane === p ? 'bg-ws-sunk' : '')}>
            {p === 'write' ? t('Schreiben', 'Write') : t('Vorschau', 'Preview')}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className={cn('grid min-w-0 content-start gap-5', pane === 'write' ? '' : 'hidden xl:grid')}>
          {context}

          <form id={formId} action={action} className="min-w-0">
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
            {people.map((r) => (
              <input key={keyOf(r)} type="hidden" name={each ? 'letter' : 'email'} value={each ? keyOf(r) : r.email} />
            ))}
            {extras.map((e) => (
              <input key={e} type="hidden" name="email" value={e} />
            ))}

            <Card
              title={t('Nachricht', 'Message')}
              icon={Icon.mail}
              tint="blue"
              bleed
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
              <div className="flex items-start gap-3 border-b border-ws-line-soft px-5 py-3">
                <span className={rowLabel}>{each ? t('An', 'To') : toLabel}</span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                  {each ? (
                    <span className={cn(chip, 'px-3')}>{t(`${people.length} Personen, jede ihren eigenen Brief`, `${people.length} people, each their own letter`)}</span>
                  ) : (
                    <>
                      {chips.map((c) => (
                        <span key={c.key} title={c.title} className={cn(chip, 'pr-1 pl-1')}>
                          <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-[0.6rem] font-bold [&_svg]:size-3.5">
                            {c.email ? initials(c.label) : Icon.people}
                          </span>
                          <span className="min-w-0 truncate">{c.label}</span>
                          {oneChip && c.email ? <span className="hidden min-w-0 truncate font-normal text-[var(--casa-muted)] sm:inline">{c.email}</span> : null}
                          <button type="button" onClick={c.remove} aria-label={t(`${c.label} entfernen`, `Remove ${c.label}`)} className={chipRemove}>
                            {Icon.close}
                          </button>
                        </span>
                      ))}
                      {extras.map((e) => (
                        <span key={e} className={cn(chip, 'pr-1 pl-3')}>
                          <span className="min-w-0 truncate">{e}</span>
                          <button type="button" onClick={() => setExtras(extras.filter((x) => x !== e))} aria-label={t(`${e} entfernen`, `Remove ${e}`)} className={chipRemove}>
                            {Icon.close}
                          </button>
                        </span>
                      ))}
                      <input
                        value={typing}
                        onChange={(e) => setTyping(e.target.value)}
                        onKeyDown={onTypingKey}
                        onBlur={commit}
                        aria-label={t('Weitere Adresse', 'Another address')}
                        aria-invalid={pendingWrong || undefined}
                        placeholder={to.length ? t('Weitere Adresse …', 'Another address …') : t('Adresse eingeben …', 'Type an address …')}
                        className="h-8 min-w-[10rem] flex-1 border-0 bg-transparent px-1 text-[0.86rem] text-[var(--casa-ink)] outline-none placeholder:text-[var(--casa-muted)]"
                      />
                    </>
                  )}
                </div>
                {canPick ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPicking(true)} className="shrink-0">
                    {t('Auswählen', 'Choose')}
                  </Button>
                ) : null}
              </div>
              {pendingWrong ? (
                <p className="border-b border-ws-line-soft py-2 pr-5 pl-[6.875rem] text-[0.78rem] text-[var(--casa-danger-text)]">
                  {t(`Keine E-Mail-Adresse: ${pending}`, `Not an e-mail address: ${pending}`)}
                </p>
              ) : null}
              {missing.length ? (
                <p className="flex items-start gap-2 border-b border-ws-line-soft py-2 pr-5 pl-[6.875rem] text-[0.78rem] text-[#8a5a00] [&_svg]:mt-0.5 [&_svg]:size-3.5 [&_svg]:shrink-0">
                  {Icon.attention}
                  {t(`Ohne E-Mail-Adresse: ${missing.join(', ')}`, `No e-mail address: ${missing.join(', ')}`)}
                </p>
              ) : null}

              <label className="flex items-center gap-3 border-b border-ws-line-soft px-5 py-1.5">
                <span className={cn(rowLabel, 'pt-0')}>{t('Betreff', 'Subject')}</span>
                <input
                  value={current.subject}
                  onChange={(e) => setTexts({ ...texts, [variant]: { ...current, subject: e.target.value } })}
                  maxLength={200}
                  required
                  className="h-9 min-w-0 flex-1 border-0 bg-transparent text-[0.92rem] font-semibold text-[var(--casa-ink)] outline-none"
                />
              </label>

              {attached ? (
                <div className="flex items-center gap-3 border-b border-ws-line-soft px-5 py-2.5">
                  <span className={cn(rowLabel, 'pt-0')}>{t('Anhang', 'Attached')}</span>
                  <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                    {each ? (
                      <span className="text-[0.84rem] text-[var(--casa-ink)]">{t('Jede Person ihr eigener Brief als PDF', 'Everyone their own letter as a PDF')}</span>
                    ) : (
                      files.map((f) => <PdfChip key={f.href} file={f} />)
                    )}
                  </div>
                </div>
              ) : null}

              {salutation?.(previewed, variant) ? (
                <p className="px-5 pt-4 text-[0.92rem] leading-relaxed text-[var(--casa-muted)]">{salutation(previewed, variant)}</p>
              ) : null}
              <textarea
                ref={area}
                aria-label={t('Text', 'Text')}
                value={current.text}
                onChange={(e) => setTexts({ ...texts, [variant]: { ...current, text: e.target.value } })}
                maxLength={10_000}
                required
                className="block w-full resize-none border-0 bg-transparent px-5 py-4 text-[0.92rem] leading-relaxed text-[var(--casa-ink)] outline-none"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ws-line-soft bg-ws-sunk/40 px-5 py-3">
                <label className={cn('flex items-center gap-3', signature ? 'cursor-pointer' : 'opacity-60')}>
                  <span className="relative inline-flex shrink-0">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={signed && signature !== null}
                      disabled={!signature}
                      onChange={() => setSigned(!signed)}
                      className="peer sr-only"
                    />
                    <span className="h-5 w-9 rounded-full bg-[#cbd5e1] transition-colors peer-checked:bg-[var(--casa-accent-surface)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--casa-blue)]/40" />
                    <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                  </span>
                  <span className="text-[0.84rem]">
                    <span className="font-semibold text-[var(--casa-ink)]">{t('Signatur', 'Signature')}</span>
                    <span className="text-[var(--casa-muted)]">
                      {' · '}
                      {signature
                        ? signature.owner === 'own'
                          ? t('deine CASA-Signatur', 'your CASA signature')
                          : t('die des Büros (info@)', 'the office’s (info@)')
                        : t('gerade nicht erreichbar', 'not available just now')}
                    </span>
                  </span>
                </label>
                {variants.length > 1 ? (
                  <span className="text-[0.78rem] text-[var(--casa-muted)]">{t('Jede Person liest ihre Sprache', 'Everyone reads their own language')}</span>
                ) : null}
              </div>
            </Card>
          </form>

          {history.length ? (
            <details className="group rounded-ws-card border border-ws-card-line bg-white shadow-ws-card">
              <summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3 text-sm font-extrabold text-[var(--casa-ink)] [&::-webkit-details-marker]:hidden">
                <IconChip icon={Icon.check} tint="green" />
                {t(`Schon gesendet (${history.length})`, `Sent before (${history.length})`)}
                <span aria-hidden="true" className="ml-auto text-[var(--casa-muted)] transition-transform group-open:rotate-180 [&_svg]:size-4">
                  {Icon.chevronDown}
                </span>
              </summary>
              <ul className="divide-y divide-ws-line-soft border-t border-ws-line">
                {history.map((h) => (
                  <li key={h.id} className="px-4 py-2.5">
                    <span className="block text-[0.84rem] font-semibold text-[var(--casa-ink)]">{h.title}</span>
                    <span className="block text-[0.76rem] text-[var(--casa-muted)]">{h.detail}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>

        <section
          aria-label={t('Vorschau', 'Preview')}
          className={cn(
            'min-w-0 self-start overflow-hidden rounded-3xl border border-ws-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_18px_40px_-28px_rgba(15,23,42,0.35)] xl:sticky xl:top-20 xl:block',
            pane === 'preview' ? '' : 'hidden'
          )}
        >
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ws-line px-4 py-2.5">
            <h2 className="text-sm font-extrabold text-[var(--casa-ink)]">{t('So kommt sie an', 'As it arrives')}</h2>
            <div className="flex flex-wrap items-center gap-2">
              {each && people.length > 1 ? (
                <Select menuFit="content"
                  aria-label={t('Vorschau für', 'Preview for')}
                  value={previewed ? keyOf(previewed) : ''}
                  onChange={(e) => setPreviewKey(e.target.value)}
                  className="max-w-[14rem] [&>button]:h-8 [&>button]:px-2 [&>button]:text-[0.78rem]"
                >
                  {people.map((r) => (
                    <option key={keyOf(r)} value={keyOf(r)}>
                      {r.name}
                    </option>
                  ))}
                </Select>
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
          <dl className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-ws-line-soft px-4 py-3 text-[0.8rem]">
            <dt className="text-[var(--casa-muted)]">{t('Von', 'From')}</dt>
            <dd className="truncate text-[var(--casa-ink)]">{from ?? '—'}</dd>
            <dt className="text-[var(--casa-muted)]">{t('Antworten an', 'Reply to')}</dt>
            <dd className="truncate text-[var(--casa-ink)]">{replyTo}</dd>
            <dt className="text-[var(--casa-muted)]">{toLabel}</dt>
            <dd className="truncate text-[var(--casa-ink)]">{each ? (previewed ? `${previewed.name} · ${previewed.email}` : '—') : names.length ? names.join(', ') : '—'}</dd>
            <dt className="text-[var(--casa-muted)]">{t('Betreff', 'Subject')}</dt>
            <dd className="font-semibold text-[var(--casa-ink)]">{shown.subject.trim() || '—'}</dd>
            {shownFiles.length ? (
              <>
                <dt className="pt-1 text-[var(--casa-muted)]">{t('Anhang', 'Attached')}</dt>
                <dd className="flex min-w-0 flex-wrap gap-1.5">
                  {shownFiles.map((f) => (
                    <PdfChip key={f.href} file={f} />
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
              onLoad={measure}
              style={{ height }}
              className={cn('mx-auto block w-full rounded-xl border-0 bg-white transition-[max-width]', width === 'phone' ? 'max-w-[390px]' : 'max-w-[700px]')}
            />
          </div>
        </section>
      </div>

      {/* The way out stays in view: to whom, and the two ways to send it. */}
      <div className="sticky bottom-3 z-20 mt-6 rounded-2xl border border-ws-line bg-white/95 px-4 py-3 shadow-[0_12px_32px_-14px_rgba(15,23,42,0.4)] backdrop-blur">
        {blocker ?? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.88rem] font-semibold text-[var(--casa-ink)]">{to.length ? summary : t('Noch keine Empfänger', 'No recipients yet')}</p>
              {copied === 'yes' && !each ? (
                <p role="status" className="truncate text-[0.78rem] font-semibold text-[#1e6b34]">
                  {files.length
                    ? t(`Text kopiert, PDF geladen · mit ${paste} einfügen und das PDF anhängen`, `Text copied, PDF downloaded · paste with ${paste} and attach the PDF`)
                    : t(`Text kopiert · im Mailprogramm mit ${paste} einfügen`, `Text copied · paste it in your mail app with ${paste}`)}
                </p>
              ) : copied === 'no' ? (
                <p role="alert" className="truncate text-[0.78rem] font-semibold text-[var(--casa-danger-text)]">
                  {t('Kopieren ging nicht – bitte noch einmal klicken.', 'Copying failed – please click again.')}
                </p>
              ) : (
                <p className="truncate text-[0.78rem] text-[var(--casa-muted)]">
                  {[
                    signed && signature ? t('mit Signatur', 'with signature') : t('ohne Signatur', 'without signature'),
                    attached ? (each ? t('je ein PDF', 'a PDF each') : t(`${files.length} PDF`, `${files.length} PDF`)) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
            <div className="grid w-full gap-2 sm:flex sm:w-auto">
              <Button
                type="button"
                variant="secondary"
                size="md"
                disabled={!filled}
                onClick={() => (each ? setMailAppList(true) : prepareMailApp(people[0] ?? null, to, files))}
                className="w-full justify-center sm:w-auto sm:whitespace-nowrap"
              >
                {Icon.external}
                {t('Im Mailprogramm öffnen', 'Open in mail app')}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={!filled || !from || sending}
                onClick={() => setReviewing(true)}
                className="w-full justify-center sm:w-auto sm:whitespace-nowrap"
              >
                {Icon.mail}
                {sending ? t('Wird gesendet …', 'Sending …') : t('Direkt senden', 'Send directly')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={picking} onOpenChange={setPicking}>
        <DialogContent className={dialogPanel('md')} overlayClassName={DIALOG_OVERLAY} closeLabel={t('Schließen', 'Close')}>
          <div className="px-6 pt-6">
            <DialogTitle className="text-[1.04rem] font-extrabold text-[var(--casa-ink)]">{t('Empfänger auswählen', 'Choose recipients')}</DialogTitle>
            <DialogDescription className="mt-1 text-[0.84rem] text-[var(--casa-muted)]">
              {t(`${people.length} von ${recipients.length} ausgewählt`, `${people.length} of ${recipients.length} chosen`)}
            </DialogDescription>
          </div>
          <div className="mx-6 mt-4 max-h-[26rem] overflow-y-auto rounded-2xl border border-ws-line">
            {groups.map((group) => {
              const list = recipients.filter((r) => r.group === group);
              const all = list.every((r) => chosen.has(keyOf(r)));
              return (
                <div key={group}>
                  <label className="sticky top-0 z-10 flex cursor-pointer items-center gap-3 border-b border-ws-line-soft bg-[#f6f8fb] px-4 py-2.5 text-[0.84rem] font-semibold text-[var(--casa-ink)]">
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
                    <span className="ml-auto text-[0.76rem] font-semibold text-[var(--casa-muted)] tabular-nums">{list.length}</span>
                  </label>
                  <ul className="divide-y divide-ws-line-soft">
                    {list.map((r) => (
                      <li key={keyOf(r)} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--ws-row-hover)]">
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                          <input type="checkbox" checked={chosen.has(keyOf(r))} onChange={() => toggle(keyOf(r))} className={box} />
                          <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#e8eef7] text-[0.7rem] font-bold text-[var(--casa-ink)]">
                            {initials(r.name)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.86rem] font-semibold text-[var(--casa-ink)]">{r.name}</span>
                            <span className="block truncate text-[0.76rem] text-[var(--casa-muted)]">{[r.detail, r.email].filter(Boolean).join(' · ')}</span>
                          </span>
                        </label>
                        {r.file ? <PdfChip file={r.file} label={t('Ansehen', 'View')} /> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex justify-end rounded-b-3xl border-t border-ws-line bg-ws-sunk/50 px-6 py-3.5">
            <DialogClose asChild>
              <Button type="button" variant="primary" size="md">
                {t('Fertig', 'Done')}
              </Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

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
            <dt className="text-[var(--casa-muted)]">{each ? t('An (je eine)', 'To (one each)') : asBcc ? t('An (Bcc)', 'To (Bcc)') : t('An', 'To')}</dt>
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
                <dt className="text-[var(--casa-muted)]">{t('Anhang', 'Attached')}</dt>
                <dd className="text-[var(--casa-ink)]">{t('Jede Person ihr eigener Brief als PDF', 'Everyone their own letter as a PDF')}</dd>
              </>
            ) : files.length ? (
              <>
                <dt className="text-[var(--casa-muted)]">{t('Anhang', 'Attached')}</dt>
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

      <Dialog open={mailAppList} onOpenChange={setMailAppList}>
        <DialogContent className={dialogPanel('md')} overlayClassName={DIALOG_OVERLAY} closeLabel={t('Schließen', 'Close')}>
          <div className="px-6 pt-6">
            <DialogTitle className="text-[1.04rem] font-extrabold text-[var(--casa-ink)]">{t('Im Mailprogramm öffnen', 'Open in mail app')}</DialogTitle>
            <DialogDescription className="mt-1 text-[0.84rem] text-[var(--casa-muted)]">
              {t(`Eine E-Mail je Person · Text mit ${paste} einfügen, PDF anhängen`, `One e-mail per person · paste the text with ${paste}, attach the PDF`)}
            </DialogDescription>
          </div>
          <ul className="mx-6 mt-4 mb-6 max-h-[24rem] divide-y divide-ws-line-soft overflow-y-auto rounded-2xl border border-ws-line">
            {people.map((r) => {
              const done = openedInMailApp.has(keyOf(r));
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
                      prepareMailApp(r, [r.email], r.file ? [r.file] : []);
                      setOpenedInMailApp(new Set(openedInMailApp).add(keyOf(r)));
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
