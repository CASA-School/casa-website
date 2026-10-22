import 'server-only';

import { z } from 'zod';

import { LOGO_CONTENT_ID, LOGO_PNG_BASE64 } from './casa-logo';

/**
 * Mail through Microsoft Graph with the Container App's managed identity, from `FORM_MAIL_FROM`: the
 * public forms' notifications and confirmations (forms.server.ts), and the workspace's mail to the
 * teachers with their test codes (src/lib/admin/entry-test-mail.ts). Every mail carries the CASA logo as
 * an inline picture, `cid:casa-logo`, and any other pictures it names.
 */

export type GraphAttachment = { name: string; contentType: string; contentId: string; contentBytes: string };

export type GraphMessage = {
  to: string | string[];
  /** Blind copies: recipients who do not see each other's addresses. */
  bcc?: string[];
  subject: string;
  html: string;
  replyTo?: { emailAddress: { address: string; name?: string } }[];
  /** Keep a copy in the sender's Sent Items. Staff alerts do; a confirmation does not. */
  saveToSentItems?: boolean;
  /** Further inline pictures, referenced as `cid:` like the logo. */
  attachments?: GraphAttachment[];
};

/** The sender mailbox, when Microsoft Graph mail is configured at all. */
export function graphSender() {
  const from = process.env.FORM_MAIL_FROM;
  return from && z.email().safeParse(from).success && process.env.IDENTITY_ENDPOINT && process.env.IDENTITY_HEADER
    ? from
    : null;
}

/** Sends one message from `from` through Graph with the managed identity. Throws on any failure. */
export async function sendGraphMail(from: string, message: GraphMessage) {
  const tokenUrl = new URL(process.env.IDENTITY_ENDPOINT!);
  tokenUrl.searchParams.set('resource', 'https://graph.microsoft.com/');
  tokenUrl.searchParams.set('api-version', '2019-08-01');
  if (process.env.FORM_MAIL_IDENTITY_CLIENT_ID) {
    tokenUrl.searchParams.set('client_id', process.env.FORM_MAIL_IDENTITY_CLIENT_ID);
  }
  const tokenResponse = await fetch(tokenUrl, {
    headers: { 'X-IDENTITY-HEADER': process.env.IDENTITY_HEADER! },
    signal: AbortSignal.timeout(8000), cache: 'no-store',
  });
  if (!tokenResponse.ok) throw new Error('Mail identity unavailable');
  const token = await tokenResponse.json() as { access_token?: string };
  if (!token.access_token) throw new Error('Mail identity returned no token');
  const recipients = Array.isArray(message.to) ? message.to : [message.to];
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject: message.subject,
        body: { contentType: 'HTML', content: message.html },
        // The logo travels with the mail and is referenced as cid:, so no
        // client blocks it as a remote image.
        attachments: [
          { name: 'casa-logo.png', contentType: 'image/png', contentId: LOGO_CONTENT_ID, contentBytes: LOGO_PNG_BASE64 },
          ...(message.attachments ?? []),
        ].map((a) => ({ '@odata.type': '#microsoft.graph.fileAttachment', ...a, isInline: true })),
        toRecipients: recipients.map((address) => ({ emailAddress: { address } })),
        ...(message.bcc?.length ? { bccRecipients: message.bcc.map((address) => ({ emailAddress: { address } })) } : {}),
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      },
      saveToSentItems: message.saveToSentItems ?? true,
    }),
    signal: AbortSignal.timeout(15000),
  });
  // Accepted for sending by Exchange; inbox delivery must be verified separately.
  if (response.status !== 202) throw new Error('Microsoft rejected the message');
}
