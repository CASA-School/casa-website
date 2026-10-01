import 'server-only';

import { z } from 'zod';

import { LOGO_CONTENT_ID, LOGO_PNG_BASE64 } from './casa-logo';
import { buildFormMail, type FormKind } from './form-mail';

export type { FormKind };
export const TEST_FORM_RECIPIENT = 'admin@casa-bremen.de';

/** Test mode is the safe default, including when a deployment forgets its setting. */
export function formDeliveryConfig(kind: FormKind) {
  const test = process.env.FORM_DELIVERY_MODE !== 'live';
  const recipient = test ? TEST_FORM_RECIPIENT : process.env[`FORM_RECIPIENT_${kind.toUpperCase()}`];
  return { test, recipient: z.email().safeParse(recipient).success ? recipient! : null };
}

export type FormDelivery = { delivered: boolean; channel: 'email' | 'webhook' | 'unconfigured' | 'failed' };

export type NotifyOptions = {
  /**
   * Whether the route also stored the submission in the staff workspace. The
   * email says so either way, because without a database it is the only record.
   * Left out, the email makes no claim about the workspace.
   */
  stored?: boolean;
};

/** Reply-To the submitter, so pressing Reply answers them and not the sending mailbox. */
function replyToFor(payload: Record<string, unknown>) {
  const address = typeof payload.email === 'string' ? payload.email.trim() : '';
  if (!z.email().safeParse(address).success) return undefined;
  const name = [payload.firstName, payload.lastName]
    .filter((part): part is string => typeof part === 'string' && part.trim() !== '')
    .map((part) => part.trim())
    .join(' ');
  return [{ emailAddress: name ? { address, name } : { address } }];
}

/**
 * One delivery boundary for every public form. Test mode never calls legacy
 * webhooks: their downstream recipient rules cannot be overridden safely here.
 * No confirmation mail is sent to an applicant while testing.
 */
export async function notifyForm(
  kind: FormKind,
  payload: Record<string, unknown>,
  webhookUrl?: string | null,
  options?: NotifyOptions,
): Promise<FormDelivery> {
  const { test, recipient } = formDeliveryConfig(kind);
  if (!recipient) return { delivered: false, channel: 'unconfigured' };
  try {
    const from = process.env.FORM_MAIL_FROM;
    if (from && z.email().safeParse(from).success && process.env.IDENTITY_ENDPOINT && process.env.IDENTITY_HEADER) {
      const tokenUrl = new URL(process.env.IDENTITY_ENDPOINT);
      tokenUrl.searchParams.set('resource', 'https://graph.microsoft.com/');
      tokenUrl.searchParams.set('api-version', '2019-08-01');
      if (process.env.FORM_MAIL_IDENTITY_CLIENT_ID) {
        tokenUrl.searchParams.set('client_id', process.env.FORM_MAIL_IDENTITY_CLIENT_ID);
      }
      const tokenResponse = await fetch(tokenUrl, {
        headers: { 'X-IDENTITY-HEADER': process.env.IDENTITY_HEADER },
        signal: AbortSignal.timeout(8000), cache: 'no-store',
      });
      if (!tokenResponse.ok) throw new Error('Mail identity unavailable');
      const token = await tokenResponse.json() as { access_token?: string };
      if (!token.access_token) throw new Error('Mail identity returned no token');
      const replyTo = replyToFor(payload);
      const mail = buildFormMail(kind, payload, { test, stored: options?.stored, testRecipient: TEST_FORM_RECIPIENT });
      const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token.access_token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          message: {
            subject: mail.subject,
            body: { contentType: 'HTML', content: mail.html },
            // The logo travels with the mail and is referenced as cid:, so no
            // client blocks it as a remote image.
            attachments: [{
              '@odata.type': '#microsoft.graph.fileAttachment',
              name: 'casa-logo.png',
              contentType: 'image/png',
              contentId: LOGO_CONTENT_ID,
              isInline: true,
              contentBytes: LOGO_PNG_BASE64,
            }],
            toRecipients: [{ emailAddress: { address: recipient } }],
            ...(replyTo ? { replyTo } : {}),
          },
          saveToSentItems: true,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (response.status !== 202) throw new Error('Microsoft rejected notification');
      // Accepted for sending by Exchange; inbox delivery must be verified separately.
      return { delivered: true, channel: 'email' };
    }
    if (!test && webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...payload, notificationRecipient: recipient }),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error('Notification webhook rejected submission');
      return { delivered: true, channel: 'webhook' };
    }
    return { delivered: false, channel: 'unconfigured' };
  } catch {
    // Do not log payloads, recipient addresses, provider responses or credentials.
    console.error('[form-notification] delivery failed', { kind, reference: payload.requestId ?? payload.token });
    return { delivered: false, channel: 'failed' };
  }
}
