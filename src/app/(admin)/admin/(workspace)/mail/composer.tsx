'use client';

import { useCallback } from 'react';

import { sendWorkspaceMailAction } from './actions';
import { useWsLang } from '@/components/admin/lang';
import { MailComposer, type RenderInput } from '@/components/admin/mail/mail-composer';
import { pick } from '@/lib/admin/i18n';
import type { MailDraft } from '@/lib/admin/mail/draft';
import { plainMailHtml } from '@/lib/mail/shell';

/**
 * A colleague's own mail about a record on the workspace's mail screen (MailComposer): the record in the
 * page's header, the text in the person's language with its greeting, the colleague's signature below — a mail as their
 * mail program writes one.
 */
export function WorkspaceMailComposer({ draft, back, from, sent }: { draft: MailDraft; back: string | null; from: string | null; sent: number }) {
  const { t, lang } = useWsLang();

  const render = useCallback(
    ({ subject, text, signature, target }: RenderInput) =>
      plainMailHtml({
        subject,
        text,
        // In the mail program (Outlook at CASA) the CASA add-in adds the signature, with its greeting.
        signature: target === 'mailapp' ? null : signature,
        closing: target === 'mailapp' || signature ? null : draft.closing,
      }),
    [draft.closing]
  );

  return (
    <MailComposer
      recipients={draft.recipients.map((r) => ({ email: r.email, name: r.name, group: pick(lang, r.group), chosen: r.chosen }))}
      missing={draft.missing}
      variants={[{ key: 'main', label: draft.language === 'en' ? 'English' : 'Deutsch', subject: draft.subject, text: draft.text }]}
      signature={draft.signature}
      from={from}
      replyTo={draft.replyTo}
      render={render}
      action={sendWorkspaceMailAction}
      hidden={{ to: `${draft.about}:${draft.id}`, module: draft.module, ...(back ? { back } : {}) }}
      bcc={draft.bcc}
      sentNotice={sent ? (sent === 1 ? t('Gesendet', 'Sent') : t(`Gesendet an ${sent} Empfänger`, `Sent to ${sent} recipients`)) : null}
      history={draft.history}
    />
  );
}
