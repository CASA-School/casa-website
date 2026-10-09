import 'server-only';

import { z } from 'zod';

import { LOGO_CONTENT_ID, LOGO_PNG_BASE64 } from './casa-logo';
import { buildConfirmationMail, buildFormMail, type FormKind } from './form-mail';

export type { FormKind };
export const TEST_FORM_RECIPIENT = 'admin@casa-bremen.de';

/** Test mode is the safe default, including when a deployment forgets its setting. */
export function formDeliveryConfig(kind: FormKind) {
  const test = process.env.FORM_DELIVERY_MODE !== 'live';
  // An interest-list entry goes to the contact mailbox (info@), like any other enquiry.
  const mailbox = kind === 'interest' ? 'CONTACT' : kind.toUpperCase();
  const recipient = test ? TEST_FORM_RECIPIENT : process.env[`FORM_RECIPIENT_${mailbox}`];
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

type GraphMessage = {
  to: string;
  subject: string;
  html: string;
  replyTo?: { emailAddress: { address: string; name?: string } }[];
  /** Keep a copy in the sender's Sent Items. Staff alerts do; a confirmation does not. */
  saveToSentItems?: boolean;
};

/** The sender mailbox, when Microsoft Graph mail is configured at all. */
function graphSender() {
  const from = process.env.FORM_MAIL_FROM;
  return from && z.email().safeParse(from).success && process.env.IDENTITY_ENDPOINT && process.env.IDENTITY_HEADER
    ? from
    : null;
}

/** Sends one message from `from` through Graph with the managed identity. Throws on any failure. */
async function sendGraphMail(from: string, message: GraphMessage) {
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
  const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject: message.subject,
        body: { contentType: 'HTML', content: message.html },
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
        toRecipients: [{ emailAddress: { address: message.to } }],
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      },
      saveToSentItems: message.saveToSentItems ?? true,
    }),
    signal: AbortSignal.timeout(8000),
  });
  // Accepted for sending by Exchange; inbox delivery must be verified separately.
  if (response.status !== 202) throw new Error('Microsoft rejected the message');
}

/**
 * One delivery boundary for every public form. Test mode never calls legacy
 * webhooks: their downstream recipient rules cannot be overridden safely here.
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
    const from = graphSender();
    if (from) {
      const mail = buildFormMail(kind, payload, { test, stored: options?.stored, testRecipient: TEST_FORM_RECIPIENT });
      await sendGraphMail(from, { to: recipient, subject: mail.subject, html: mail.html, replyTo: replyToFor(payload) });
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

export type ConfirmationKind = Exclude<FormKind, 'placement'>;

/**
 * Confirmations per inbox in a rolling day, per replica. The forms already
 * limit each client address; this limits each RECIPIENT, so nobody can use a
 * CASA form to send CASA mail to a stranger over and over from many machines.
 * Held in memory only, and deleted when its 24 hours are up.
 */
const CONFIRMATIONS_PER_ADDRESS = 3;
const CONFIRMATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const confirmationsSent = new Map<string, { count: number; resetAt: number }>();

/**
 * And overall, per replica: real volume is a few a day, and the sender mailbox
 * also carries every staff alert, so a flood must not get it blocked.
 */
const CONFIRMATIONS_PER_HOUR = 30;
const CONFIRMATIONS_PER_DAY = 200;
let hourWindow = { count: 0, resetAt: 0 };
let dayWindow = { count: 0, resetAt: 0 };

/** One inbox, one counter: "+tags" (any provider) and Gmail's dots and googlemail.com fold together. */
function confirmationKey(address: string) {
  const at = address.lastIndexOf('@');
  let local = address.slice(0, at).toLowerCase().split('+')[0];
  let domain = address.slice(at + 1).toLowerCase();
  if (domain === 'googlemail.com') domain = 'gmail.com';
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  return `${local}@${domain}`;
}

function allowConfirmation(address: string) {
  const now = Date.now();
  if (hourWindow.resetAt <= now) hourWindow = { count: 0, resetAt: now + 60 * 60 * 1000 };
  if (dayWindow.resetAt <= now) dayWindow = { count: 0, resetAt: now + CONFIRMATION_WINDOW_MS };
  if (hourWindow.count >= CONFIRMATIONS_PER_HOUR || dayWindow.count >= CONFIRMATIONS_PER_DAY) return false;

  const key = confirmationKey(address);
  const current = confirmationsSent.get(key);
  if (!current || current.resetAt <= now) {
    const entry = { count: 1, resetAt: now + CONFIRMATION_WINDOW_MS };
    confirmationsSent.set(key, entry);
    // The privacy policy says an address is held for at most 24 hours.
    setTimeout(() => {
      if (confirmationsSent.get(key) === entry) confirmationsSent.delete(key);
    }, CONFIRMATION_WINDOW_MS).unref?.();
  } else if (current.count >= CONFIRMATIONS_PER_ADDRESS) {
    return false;
  } else {
    current.count += 1;
  }
  hourWindow.count += 1;
  dayWindow.count += 1;
  return true;
}

/** A send that failed gives its slot back; the slot is held during the send so parallel requests cannot overrun it. */
function releaseConfirmation(address: string) {
  const current = confirmationsSent.get(confirmationKey(address));
  if (current && current.count > 0) current.count -= 1;
  if (hourWindow.count > 0) hourWindow.count -= 1;
  if (dayWindow.count > 0) dayWindow.count -= 1;
}

/** Test hook: forget every counter. */
export function resetConfirmationLimits() {
  confirmationsSent.clear();
  hourWindow = { count: 0, resetAt: 0 };
  dayWindow = { count: 0, resetAt: 0 };
}

/**
 * Where a reply to the receipt goes. The team mailbox for the form, except for
 * applications: their staff alert goes to a shared mailbox, and an applicant's
 * reply must reach management only, so it needs a mailbox of its own
 * (`FORM_REPLY_TO_CAREERS`). Without one, no application receipt goes out live.
 */
function confirmationReplyMailbox(kind: ConfirmationKind, test: boolean, recipient: string | null) {
  if (kind !== 'careers') return recipient;
  const careers = process.env.FORM_REPLY_TO_CAREERS?.trim();
  if (careers && z.email().safeParse(careers).success) return careers;
  return test ? recipient : null;
}

/**
 * The receipt the person who sent a form gets, in the form's language.
 *
 * Replies go to the team mailbox that handles the form (`FORM_RECIPIENT_<KIND>`),
 * so the sender mailbox stays the single address Exchange lets the website use.
 * In test mode it goes to the test inbox instead of the sender, and says so.
 * Never throws and never blocks the submission: `reachedSender` is true only
 * when Microsoft accepted a message addressed to the sender themselves.
 */
export async function confirmToSender(
  kind: ConfirmationKind,
  payload: Record<string, unknown>,
): Promise<{ sent: boolean; reachedSender: boolean }> {
  const address = typeof payload.email === 'string' ? payload.email.trim() : '';
  const from = graphSender();
  if (!from || !z.email().safeParse(address).success) return { sent: false, reachedSender: false };
  const { test, recipient } = formDeliveryConfig(kind);
  const replyMailbox = confirmationReplyMailbox(kind, test, recipient);
  // Live, a form with no mailbox for replies has nobody to answer the person:
  // send nothing rather than a receipt whose replies land somewhere unplanned.
  if (!test && !replyMailbox) return { sent: false, reachedSender: false };
  if (!test && !allowConfirmation(address)) return { sent: false, reachedSender: false };
  try {
    const mail = buildConfirmationMail(kind, payload, {
      test, intendedRecipient: address, testRecipient: TEST_FORM_RECIPIENT, replyInvited: Boolean(replyMailbox),
    });
    await sendGraphMail(from, {
      to: test ? TEST_FORM_RECIPIENT : address,
      subject: mail.subject,
      html: mail.html,
      ...(replyMailbox ? { replyTo: [{ emailAddress: { address: replyMailbox, name: mail.replyName } }] } : {}),
      // A receipt keeps no copy: the record lives in the workspace and the
      // staff alert, and an application's copy would sit outside management.
      saveToSentItems: false,
    });
    return { sent: true, reachedSender: !test };
  } catch {
    if (!test) releaseConfirmation(address);
    console.error('[form-confirmation] delivery failed', { kind, reference: payload.requestId });
    return { sent: false, reachedSender: false };
  }
}
