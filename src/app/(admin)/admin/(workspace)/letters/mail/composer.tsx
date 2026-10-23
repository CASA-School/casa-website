'use client';

import Link from 'next/link';
import { useCallback } from 'react';

import { sendLetterMailAction } from '../actions';
import { Icon } from '@/components/admin/icons';
import { useWsLang } from '@/components/admin/lang';
import { LetterKindIcon } from '@/components/admin/letters/letter-kind';
import { MailComposer, type RenderInput } from '@/components/admin/mail/mail-composer';
import { ButtonLink, Card } from '@/components/admin/ui';
import type { LetterMailDraft } from '@/lib/admin/letter-mail';
import { letterMailHtml } from '@/lib/admin/letters/cover-mail';

/**
 * A letter — or several, each to its own recipient — on the workspace's mail screen (MailComposer): the
 * letter as a PDF beside a short mail in the letter's language, with the letter's own salutation.
 */
export function LetterMailComposer({
  draft,
  ids,
  back,
  from,
  logo,
  sent,
  saved,
}: {
  draft: LetterMailDraft;
  ids: string[];
  back: string | null;
  from: string | null;
  /** The CASA logo as a picture, for the mail copied into the mail program. */
  logo: string;
  sent: number;
  /** Just saved as it goes out (the letter's „Als gesendet speichern"). */
  saved: boolean;
}) {
  const { t } = useWsLang();
  const single = draft.letters.length === 1;
  const first = draft.letters[0];
  const reachable = draft.letters.filter((l) => l.email);

  const render = useCallback(
    ({ subject, text, signature, target, recipient, variant }: RenderInput) => {
      const letter = (recipient?.value ? draft.letters.find((l) => l.id === recipient.value) : null) ?? draft.letters.find((l) => l.language === variant) ?? first;
      return letterMailHtml({
        subject,
        heading: letter.heading,
        salutation: letter.salutation,
        text,
        files: [letter.file.name],
        language: letter.language,
        logoSrc: target === 'mailapp' ? logo : '/brand/casa-logo.png',
        // In the mail program (Outlook at CASA) the CASA add-in adds the signature, with its greeting.
        signature: target === 'mailapp' ? null : signature,
        closing: target === 'mailapp' || signature ? null : draft.closings[letter.language],
      });
    },
    [draft, first, logo]
  );

  const context = (
    <Card title={single ? t('Brief', 'Letter') : t(`${draft.letters.length} Briefe`, `${draft.letters.length} letters`)} icon={Icon.note} tint="blue">
      <ul className="grid gap-2">
        {draft.letters.slice(0, single ? 1 : 6).map((l) => (
          <li key={l.id} className="flex items-center gap-3">
            <LetterKindIcon kind={l.kind} size="md" />
            <span className="min-w-0 flex-1">
              <Link href={`/admin/letters/${l.id}`} className="block truncate text-[0.86rem] font-bold text-[var(--casa-ink)] hover:underline">
                {l.subject}
              </Link>
              <span className="block truncate text-[0.76rem] text-[var(--casa-muted)]">
                {l.recipientName} · {l.language === 'de' ? 'Deutsch' : 'English'}
              </span>
            </span>
            <a
              href={l.file.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-ws-sunk px-2 py-1 text-[0.76rem] font-semibold text-[var(--casa-ink)] hover:bg-[#e8eef7]"
            >
              <span className="rounded bg-[#e30613] px-1 text-[0.6rem] font-bold text-white">PDF</span>
              {t('Ansehen', 'View')}
            </a>
          </li>
        ))}
      </ul>
      {!single && draft.letters.length > 6 ? (
        <p className="mt-2 text-[0.78rem] text-[var(--casa-muted)]">{t(`und ${draft.letters.length - 6} weitere`, `and ${draft.letters.length - 6} more`)}</p>
      ) : null}
      {back ? (
        <div className="mt-3">
          <ButtonLink href={back} variant="ghost" size="sm">
            {t('Zurück zu den Briefen', 'Back to the letters')}
          </ButtonLink>
        </div>
      ) : null}
    </Card>
  );

  return (
    <MailComposer
      context={context}
      mode={single ? 'together' : 'each'}
      bcc={false}
      recipients={reachable.map((l) => ({
        email: l.email!,
        name: l.recipientName,
        detail: single ? undefined : l.language === 'de' ? 'Deutsch' : 'English',
        group: t('Empfänger', 'Recipients'),
        chosen: true,
        value: single ? undefined : l.id,
        variant: l.language,
        file: single ? undefined : l.file,
      }))}
      missing={draft.letters.filter((l) => !l.email).map((l) => l.recipientName)}
      variants={draft.variants}
      signature={draft.signature}
      from={from}
      replyTo={draft.replyTo}
      render={render}
      action={sendLetterMailAction}
      hidden={{ ids: ids.join(','), module: draft.module }}
      files={single ? [first.file] : []}
      sentNotice={
        sent
          ? sent === 1
            ? t('Gesendet', 'Sent')
            : t(`${sent} E-Mails gesendet`, `${sent} e-mails sent`)
          : saved
            ? single
              ? t('Gespeichert, so wie er rausgeht.', 'Saved as it goes out.')
              : t('Gespeichert, so wie sie rausgehen.', 'Saved as they go out.')
            : null
      }
      history={draft.history}
    />
  );
}
