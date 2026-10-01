import { NextResponse, type NextRequest } from 'next/server';
import { confirmToSender, notifyForm } from '@/lib/notifications/forms.server';

import { storeEnquiry } from '@/lib/admin/intake';
import { rateLimit } from '@/lib/api/rate-limit';
import { getGroupInquiryWebhookUrl } from '@/lib/db/env';
import { contactInquirySchema, organiserBriefFields } from '@/lib/validation/contact';


function successMessage(locale: 'en' | 'de') {
  if (locale === 'de') {
    return 'Vielen Dank. Ihre Anfrage ist eingegangen. Das CASA-Team meldet sich zeitnah.';
  }

  return 'Thank you. Your request has been received. The CASA team will reply shortly.';
}

function failureMessage(locale: 'en' | 'de') {
  if (locale === 'de') {
    return 'Ihre Anfrage konnte gerade nicht übermittelt werden. Bitte versuchen Sie es erneut oder kontaktieren Sie das Team direkt.';
  }

  return 'Your request could not be submitted right now. Please try again or contact the office directly.';
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'contact', { limit: 10, windowMs: 10 * 60_000 });
  if (limited) return limited;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Invalid request payload.',
      },
      { status: 400 }
    );
  }

  const parsed = contactInquirySchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        status: 'error',
        message: firstIssue?.message ?? 'Invalid request data.',
      },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const requestId = crypto.randomUUID();
  const locale = payload.locale;

  // Honeypot field for automated submissions.
  if (payload.website) {
    return NextResponse.json({
      status: 'accepted',
      requestId,
      mode: 'filtered',
      message: successMessage(locale),
    });
  }

  // Group and company enquiries carry a structured brief. It is an estimate
  // request, never a quotation — the binding offer still comes from staff.
  const briefFields = organiserBriefFields(payload.topicKey);
  const organiserBrief = briefFields.length
    ? Object.fromEntries(
        briefFields.map((field) => {
          const value = payload[field];
          return [field, value === '' || value === undefined ? null : value];
        })
      )
    : null;

  const webhookUrl =
    (organiserBrief ? getGroupInquiryWebhookUrl() : null) || process.env.CONTACT_WEBHOOK_URL;
  const submittedAt = new Date().toISOString();

  /*
   * Stored in the staff workspace FIRST, and independently of the webhook.
   *
   * Before this, an enquiry existed only as a webhook POST and, with no webhook
   * configured, as a line in the server log — so nobody could tell whether one
   * had been answered. It now lands in a queue with a status and an owner
   * (/admin/enquiries).
   *
   * The two are deliberately not coupled. `storeEnquiry` never throws: a
   * storage failure must not fail a request whose fan-out succeeded, because
   * the visitor would be told their enquiry did not arrive when it did. The
   * reverse holds too — the row is written before the fetch, so a webhook
   * timeout does not lose the enquiry.
   */
  const stored = await storeEnquiry({
    requestId,
    locale,
    firstName: payload.firstName,
    lastName: payload.lastName || null,
    email: payload.email,
    topic: payload.topic,
    topicKey: payload.topicKey || null,
    message: payload.message,
    source: payload.source,
    organiserBrief,
    userAgent: request.headers.get('user-agent') || null,
  });

  const kind = organiserBrief ? 'groups' : 'contact';
  const notification = {
    requestId, submittedAt, locale, firstName: payload.firstName,
    lastName: payload.lastName || null, email: payload.email,
    topic: payload.topic, topicKey: payload.topicKey || null,
    message: payload.message, source: payload.source, organiserBrief,
  };
  // Stored, the submission is accepted whatever the alert does, so the receipt
  // goes out alongside it. Not stored, it waits: no receipt for a 503.
  const [delivery, early] = stored
    ? await Promise.all([notifyForm(kind, notification, webhookUrl, { stored }), confirmToSender(kind, notification)])
    : [await notifyForm(kind, notification, webhookUrl, { stored }), null];
  if (!stored && !delivery.delivered) {
    return NextResponse.json({ status: 'error', message: failureMessage(locale), supportPath: '/contact' }, { status: 503 });
  }
  const confirmation = early ?? await confirmToSender(kind, notification);

  return NextResponse.json({
    status: 'accepted',
    requestId,
    mode: delivery.delivered ? delivery.channel : 'database',
    notified: delivery.delivered,
    stored,
    confirmationSent: confirmation.reachedSender,
    message: successMessage(locale),
  });
}
