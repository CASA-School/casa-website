import { NextResponse, type NextRequest } from 'next/server';

import { contactInquirySchema } from '@/lib/validation/contact';

const REQUEST_TIMEOUT_MS = 8000;

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

  const webhookUrl = process.env.CONTACT_WEBHOOK_URL;
  const submittedAt = new Date().toISOString();

  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          submittedAt,
          locale,
          firstName: payload.firstName,
          lastName: payload.lastName || null,
          email: payload.email,
          topic: payload.topic,
          message: payload.message,
          source: payload.source,
          userAgent: request.headers.get('user-agent') || 'unknown',
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`Webhook rejected contact request with status ${response.status}`);
      }
    } catch (error) {
      console.error('[contact-api] webhook submission failed', error);
      return NextResponse.json(
        {
          status: 'error',
          message: failureMessage(locale),
          supportPath: '/contact',
        },
        { status: 502 }
      );
    }
  } else {
    // Keep functional behavior in preview mode while waiting for production integration.
    console.info('[contact-api] accepted request (preview mode)', {
      requestId,
      submittedAt,
      topic: payload.topic,
      email: payload.email,
      source: payload.source,
    });
  }

  return NextResponse.json({
    status: 'accepted',
    requestId,
    mode: webhookUrl ? 'webhook' : 'preview',
    message: successMessage(locale),
  });
}
