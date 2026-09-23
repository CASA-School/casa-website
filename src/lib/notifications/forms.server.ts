import 'server-only';

import { z } from 'zod';

import { formatBriefValue, ORGANISER_BRIEF_LABELS } from '@/lib/admin/brief-labels';

export type FormKind = 'contact' | 'groups' | 'course' | 'exam' | 'careers' | 'placement' | 'appointment';
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

const KIND_TITLES: Record<FormKind, string> = {
  contact: 'Contact enquiry',
  groups: 'Group or company enquiry',
  course: 'Course registration',
  exam: 'Exam registration',
  careers: 'Job application',
  placement: 'Placement test result',
  appointment: 'Appointment request',
};

/** Labels for the fields staff read most; anything unlisted is spelled out from its key. */
const FIELD_LABELS: Record<string, string> = {
  requestId: 'Reference',
  token: 'Reference',
  submittedAt: 'Submitted',
  firstName: 'First name',
  lastName: 'Last name',
  birthDate: 'Date of birth',
  locale: 'Language',
  courseTypeLabel: 'Course',
  courseInstanceLabel: 'Course option',
  currentLevel: 'Declared level',
  examTypeLabel: 'Exam',
  examSessionLabel: 'Exam session',
  registrationType: 'Exam part',
  accommodationRequired: 'Accommodation requested',
  officialNameConfirmed: 'Official name confirmed',
  ...ORGANISER_BRIEF_LABELS,
};

/**
 * Readings for the machine tokens the registration forms send, in the
 * workspace's own wording; a value not listed prints as sent. Kept here rather
 * than imported, because the workspace's maps live beside its database reads.
 */
const VALUE_LABELS: Record<string, Record<string, string>> = {
  salutation: { mr: 'Mr', ms: 'Ms', mx: 'Mx', neutral: 'No salutation' },
  accommodationType: { flat: 'Shared flat', host: 'Host family' },
  registrationType: { full: 'Full exam', written: 'Written part only', oral: 'Oral part only' },
  locale: { de: 'German', en: 'English' },
};

function readableValue(key: string, value: unknown) {
  return typeof value === 'string' ? (VALUE_LABELS[key]?.[value] ?? value) : value;
}

/** The organiser brief's choice tokens, read as the workspace's enquiry page reads them. */
function readableBrief(brief: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(brief).map(([key, value]) => [
      key,
      value === null || value === undefined || value === '' ? null : String(formatBriefValue(value)),
    ])
  );
}

/**
 * Not printed: raw ids a reader cannot act on (the labels beside them carry the
 * meaning), consents a valid submission cannot lack, and the honeypot.
 */
const HIDDEN_FIELDS = new Set([
  'courseTypeId',
  'courseInstanceId',
  'examTypeId',
  'examSessionId',
  'positionId',
  'topicKey',
  'acceptTerms',
  'examPolicyAccepted',
  'website',
]);

function labelFor(key: string) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** `Label: value` for each field that has a value. */
function formatEntries(value: Record<string, unknown>): string[] {
  return Object.entries(value).flatMap(([key, entry]) => {
    const formatted = formatValue(entry);
    return formatted === null ? [] : [`${labelFor(key)}: ${formatted}`];
  });
}

function formatValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    const items = value.map(formatValue).filter((item): item is string => item !== null);
    return items.length > 0 ? items.join('; ') : null;
  }
  if (typeof value === 'object') {
    const entries = formatEntries(value as Record<string, unknown>);
    return entries.length > 0 ? entries.join(', ') : null;
  }
  return String(value);
}

/**
 * A short labelled plain-text body, one field per line, in the order the route
 * built the payload. Replaces the raw JSON dump staff had to read addresses
 * out of. A nested object (the organiser brief) is indented under its label.
 */
function notificationText(kind: FormKind, payload: Record<string, unknown>, test: boolean, stored?: boolean) {
  const lines: string[] = [];
  if (test) lines.push('TEST DELIVERY — all notifications are routed to the test inbox.', '');
  lines.push(`${KIND_TITLES[kind]} from the website.`, '');

  for (const [key, value] of Object.entries(payload)) {
    if (HIDDEN_FIELDS.has(key)) continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const entries = value as Record<string, unknown>;
      const nested = formatEntries(key === 'organiserBrief' ? readableBrief(entries) : entries);
      if (nested.length > 0) lines.push(`${labelFor(key)}:`, ...nested.map((line) => `  ${line}`));
      continue;
    }
    const formatted = formatValue(readableValue(key, value));
    if (formatted === null) continue;
    lines.push(formatted.includes('\n') ? `${labelFor(key)}:\n${formatted}` : `${labelFor(key)}: ${formatted}`);
  }

  if (stored === true) {
    lines.push('', 'This submission is also stored in the staff workspace.');
  } else if (stored === false) {
    lines.push('', 'This submission is NOT stored in the staff workspace. This email is the only record of it.');
  }

  return lines.join('\n');
}

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
      const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(from)}/sendMail`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token.access_token}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          message: {
            subject: `${test ? '[CASA TEST]' : '[CASA]'} ${kind} · ${String(payload.requestId ?? payload.token ?? '')}`,
            body: {
              contentType: 'Text',
              content: notificationText(kind, payload, test, options?.stored),
            },
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
