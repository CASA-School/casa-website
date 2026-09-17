import { NextResponse, type NextRequest } from 'next/server';
import { notifyForm } from '@/lib/notifications/forms.server';

import { storeExamRegistration } from '@/lib/admin/intake';

import { examRegistrationSubmissionSchema } from '@/lib/validation/registration-submissions';


function successMessage(locale: 'en' | 'de') {
  if (locale === 'de') {
    return 'Vielen Dank. Ihre Prüfungsanfrage ist eingegangen. Das CASA-Team meldet sich zeitnah mit den nächsten Schritten.';
  }

  return 'Thank you. Your exam request has been received. The CASA team will contact you shortly with next steps.';
}

function failureMessage(locale: 'en' | 'de') {
  if (locale === 'de') {
    return 'Ihre Prüfungsanfrage konnte gerade nicht übermittelt werden. Bitte versuchen Sie es erneut oder kontaktieren Sie das CASA-Team direkt.';
  }

  return 'Your exam request could not be submitted right now. Please try again or contact the CASA team directly.';
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

  const parsed = examRegistrationSubmissionSchema.safeParse(body);
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
  const webhookUrl = process.env.EXAM_REGISTRATION_WEBHOOK_URL;

  /*
   * Stored in the staff workspace before the fan-out, and independently of it.
   * See `src/app/api/contact/route.ts` for why the two are not coupled.
   */
  const stored = await storeExamRegistration({
    requestId,
    examTypeId: payload.examTypeId,
    examSessionId: payload.examSessionId,
    examTypeLabel: payload.examTypeLabel,
    examSessionLabel: payload.examSessionLabel,
    registrationType: payload.registrationType,
    salutation: payload.salutation,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    phone: payload.phone,
    nationality: payload.nationality,
    birthDate: payload.birthDate,
    officialNameConfirmed: payload.officialNameConfirmed,
    locale: payload.locale,
  });

  const delivery = await notifyForm('exam', {
    requestId, submittedAt, ...payload, source: 'registration-exam',
  }, webhookUrl);
  if (!stored && !delivery.delivered) {
    return NextResponse.json({ status: 'error', message: failureMessage(payload.locale), supportPath: '/contact' }, { status: 503 });
  }

  return NextResponse.json({
    status: 'accepted',
    requestId,
    mode: delivery.delivered ? delivery.channel : 'database',
    notified: delivery.delivered,
    stored,
    message: successMessage(payload.locale),
  });
}
