import { NextResponse, type NextRequest } from 'next/server';
import { notifyForm } from '@/lib/notifications/forms.server';

import { storeCourseRegistration } from '@/lib/admin/intake';
import { rateLimit } from '@/lib/api/rate-limit';
import { getCourseRegistrationCatalog } from '@/lib/content/repository';

import {
  createCourseRegistrationSubmissionSchema,
  submissionLocale,
} from '@/lib/validation/registration-submissions';


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

function unavailableMessage(locale: 'en' | 'de') {
  if (locale === 'de') {
    return 'Dieser Starttermin ist nicht mehr buchbar. Bitte wählen Sie einen anderen Termin.';
  }

  return 'This start date can no longer be booked. Please choose another date.';
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'registration-course', { limit: 20, windowMs: 10 * 60 * 1000 });
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

  const parsed = createCourseRegistrationSubmissionSchema(submissionLocale(body)).safeParse(body);
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
   * The option must be one the public form offers right now. The catalogue
   * decides what a learner can still book; without this check anyone could
   * POST a past or unknown term straight at the route. The labels come from
   * the same lookup, so the stored record names the course even when its ids
   * are fixtures with no row behind them.
   */
  const catalog = await getCourseRegistrationCatalog(payload.locale);
  const courseType = catalog.courseTypes.find((item) => item.id === payload.courseTypeId);
  const option = catalog.optionsByCourseTypeId[payload.courseTypeId]?.find(
    (item) => item.id === payload.courseInstanceId
  );
  if (!courseType || !option) {
    return NextResponse.json({ status: 'error', message: unavailableMessage(payload.locale) }, { status: 400 });
  }
  const courseTypeLabel = courseType.name;
  const courseInstanceLabel = `${option.dateRangeLabel} | ${option.scheduleLabel} | ${option.locationLabel}`;

  const submittedAt = new Date().toISOString();
  const webhookUrl = process.env.COURSE_REGISTRATION_WEBHOOK_URL;

  /*
   * Stored in the staff workspace before the fan-out, and independently of it.
   * See the same block in `src/app/api/contact/route.ts` for why the two are
   * not coupled: a storage failure must not tell a learner their registration
   * failed, and a webhook timeout must not lose the row.
   */
  const stored = await storeCourseRegistration({
    requestId,
    courseTypeId: payload.courseTypeId,
    courseInstanceId: payload.courseInstanceId,
    courseTypeLabel,
    courseInstanceLabel,
    salutation: payload.salutation,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    phone: payload.phone,
    nationality: payload.nationality,
    birthDate: payload.birthDate,
    currentLevel: payload.currentLevel,
    visaRequired: payload.visaRequired,
    accommodationRequired: payload.accommodationRequired,
    accommodationType: payload.accommodationType,
    smoker: payload.smoker,
    allergies: payload.allergies,
    notes: payload.notes,
    locale: payload.locale,
  });

  const delivery = await notifyForm('course', {
    requestId, submittedAt, ...payload, courseTypeLabel, courseInstanceLabel, source: 'registration-course',
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
