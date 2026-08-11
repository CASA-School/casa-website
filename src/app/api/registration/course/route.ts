import { NextResponse, type NextRequest } from 'next/server';

import { courseRegistrationSubmissionSchema } from '@/lib/validation/registration-submissions';

const REQUEST_TIMEOUT_MS = 8000;

function successMessage(locale: 'en' | 'de') {
  if (locale === 'de') {
    return 'Vielen Dank. Ihre Kursanfrage ist eingegangen. Das CASA-Team meldet sich zeitnah mit den nächsten Schritten.';
  }

  return 'Thank you. Your course request has been received. The CASA team will contact you shortly with next steps.';
}

function failureMessage(locale: 'en' | 'de') {
  if (locale === 'de') {
    return 'Ihre Kursanfrage konnte gerade nicht übermittelt werden. Bitte versuchen Sie es erneut oder kontaktieren Sie das CASA-Team direkt.';
  }

  return 'Your course request could not be submitted right now. Please try again or contact the CASA team directly.';
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

  const parsed = courseRegistrationSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        status: 'error',
        message: parsed.error.issues[0]?.message ?? 'Invalid request data.',
      },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const requestId = crypto.randomUUID();
  const submittedAt = new Date().toISOString();
  const webhookUrl = process.env.COURSE_REGISTRATION_WEBHOOK_URL;

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
          ...payload,
          source: 'registration-course',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`Webhook rejected course registration with status ${response.status}`);
      }
    } catch (error) {
      console.error('[course-registration-api] submission failed', error);
      return NextResponse.json(
        {
          status: 'error',
          message: failureMessage(payload.locale),
          supportPath: '/contact?topic=Course advice',
        },
        { status: 502 }
      );
    }
  } else {
    console.info('[course-registration-api] accepted request (preview mode)', {
      requestId,
      submittedAt,
      courseTypeId: payload.courseTypeId,
      courseInstanceId: payload.courseInstanceId,
      email: payload.email,
    });
  }

  // Simulate automated confirmation email sending
  console.info(`[email-service] Simulating automated registration confirmation email sent to: ${payload.email}`);

  return NextResponse.json({
    status: 'accepted',
    requestId,
    mode: webhookUrl ? 'webhook' : 'preview',
    message: successMessage(payload.locale),
  });
}
