import 'server-only';

import { z } from 'zod';

export type FormKind = 'contact' | 'groups' | 'course' | 'exam' | 'careers' | 'placement' | 'appointment';
export const TEST_FORM_RECIPIENT = 'admin@casa-bremen.de';

/** Test mode is the safe default, including when a deployment forgets its setting. */
export function formDeliveryConfig(kind: FormKind) {
  const test = process.env.FORM_DELIVERY_MODE !== 'live';
  const recipient = test ? TEST_FORM_RECIPIENT : process.env[`FORM_RECIPIENT_${kind.toUpperCase()}`];
  return { test, recipient: z.email().safeParse(recipient).success ? recipient! : null };
}

export type FormDelivery = { delivered: boolean; channel: 'email' | 'webhook' | 'unconfigured' | 'failed' };

/**
 * One delivery boundary for every public form. Test mode never calls legacy
 * webhooks: their downstream recipient rules cannot be overridden safely here.
 * No confirmation mail is sent to an applicant while testing.
 */
export async function notifyForm(
  kind: FormKind,
  payload: Record<string, unknown>,
  webhookUrl?: string | null,
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
      const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token.access_token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          message: {
            subject: `${test ? '[CASA TEST]' : '[CASA]'} ${kind} · ${String(payload.requestId ?? payload.token ?? '')}`,
            body: {
              contentType: 'Text',
              content: `${test ? 'TEST DELIVERY — all notifications are routed to the test inbox.\n\n' : ''}`
                + 'A website submission has been received. Review the corresponding record in the staff workspace.\n\n'
                + JSON.stringify(payload, null, 2),
            },
            toRecipients: [{ emailAddress: { address: recipient } }],
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
