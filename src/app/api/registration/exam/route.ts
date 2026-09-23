import { NextResponse, type NextRequest } from 'next/server';
import { notifyForm } from '@/lib/notifications/forms.server';

import { storeExamRegistration } from '@/lib/admin/intake';
import { rateLimit } from '@/lib/api/rate-limit';
import { getExamRegistrationCatalog } from '@/lib/content/repository';

import {
  createExamRegistrationSubmissionSchema,
  submissionLocale,
} from '@/lib/validation/registration-submissions';


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

function unavailableMessage(locale: 'en' | 'de') {
  if (locale === 'de') {
    return 'Für diesen Prüfungstermin ist keine Anmeldung mehr möglich. Bitte wählen Sie einen anderen Termin.';
  }

  return 'Registration for this exam session is no longer possible. Please choose another session.';
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'registration-exam', { limit: 20, windowMs: 10 * 60 * 1000 });
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

  const parsed = createExamRegistrationSubmissionSchema(submissionLocale(body)).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        status: 'error',
        message: parsed.error.issues[0]?.message ?? 'Invalid request data.',
      },
      { status: 400 }
    );
  }

  const { website, ...payload } = parsed.data;
  const requestId = crypto.randomUUID();

  // Honeypot field for automated submissions.
  if (website) {
    return NextResponse.json({
      status: 'accepted',
      requestId,
      mode: 'filtered',
      message: successMessage(payload.locale),
    });
  }

  /*
   * The session must be one the public form offers right now: the catalogue
   * drops sessions past their deadline, and this is what stops a direct POST
   * registering for one anyway. The labels come from the same lookup, so the
   * stored record names the sitting even when its ids are fixtures. Not the
   * deadline status ("Frist endet bald"): it is true today and stale tomorrow.
   */
  const catalog = await getExamRegistrationCatalog(payload.locale);
  const examType = catalog.examTypes.find((item) => item.id === payload.examTypeId);
  const option = catalog.optionsByExamTypeId[payload.examTypeId]?.find(
    (item) => item.id === payload.examSessionId
  );
  if (!examType || !option) {
    return NextResponse.json({ status: 'error', message: unavailableMessage(payload.locale) }, { status: 400 });
  }
  const examTypeLabel = examType.name;
  const examSessionLabel = `${option.startsAtLabel} | ${option.locationLabel}`;

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
    examTypeLabel,
    examSessionLabel,
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
    requestId, submittedAt, ...payload, examTypeLabel, examSessionLabel, source: 'registration-exam',
  }, webhookUrl, { stored });
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
