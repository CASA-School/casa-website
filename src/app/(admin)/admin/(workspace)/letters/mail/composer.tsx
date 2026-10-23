'use client';

import { useCallback } from 'react';

import { sendLetterMailAction } from '../actions';
import { useWsLang } from '@/components/admin/lang';
import { MailComposer, type RenderInput } from '@/components/admin/mail/mail-composer';
import type { LetterMailDraft } from '@/lib/admin/letter-mail';
import { letterMailHtml } from '@/lib/admin/letters/cover-mail';

/**
 * A letter — or several, each to its own recipient — on the workspace's mail screen (MailComposer): the
 * letter as a PDF beside a short mail in the letter's language, with the letter's own salutation. The
 * letter is named in the page's header; several letters are chosen and looked at in „Auswählen".
 */
export function LetterMailComposer({
  draft,
  ids,
  from,
  logo,
  sent,
  saved,
}: {
  draft: LetterMailDraft;
  ids: string[];
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

  return (
    <MailComposer
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
      // The letter's own salutation opens the mail; several letters: each their own.
      salutation={() => (single ? first.salutation : t('Anrede aus dem jeweiligen Brief', 'The salutation of each letter'))}
    />
  );
}
