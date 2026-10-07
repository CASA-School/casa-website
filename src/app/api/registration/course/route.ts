import { NextResponse, type NextRequest } from 'next/server';
import { confirmToSender, notifyForm } from '@/lib/notifications/forms.server';

import { storeRegistration } from '@/lib/admin/intake';
import { levelCodeFrom } from '@/lib/admin/normalize';
import { rateLimit } from '@/lib/api/rate-limit';
import { getCourseRegistrationCatalog, getExamRegistrationCatalog } from '@/lib/content/repository';
import { buildLevelPath, continuationLevels } from '@/lib/registration/level-path';
import { describeBookedLevel } from '@/lib/registration/levels';

import {
  createCourseRegistrationSubmissionSchema,
  requiresLevelField,
  submissionLocale,
} from '@/lib/validation/registration-submissions';


function successMessage(locale: 'en' | 'de') {
  if (locale === 'de') {
    return 'Vielen Dank! Deine Kursanmeldung ist bei uns angekommen. Wir melden uns so bald wie möglich mit den nächsten Schritten bei dir.';
  }

  return 'Thank you! Your course registration has reached us. We’ll get back to you with the next steps as soon as we can.';
}

function failureMessage(locale: 'en' | 'de') {
  if (locale === 'de') {
    return 'Deine Kursanmeldung konnte gerade nicht übermittelt werden. Bitte versuch es noch einmal oder wende dich direkt an das CASA-Team.';
  }

  return 'Your course registration could not be sent just now. Please try again or contact the CASA team directly.';
}

function unavailableMessage(locale: 'en' | 'de') {
  if (locale === 'de') {
    return 'Dieser Starttermin ist nicht mehr buchbar. Bitte wähle einen anderen Termin.';
  }

  return 'This start date can no longer be booked. Please choose another date.';
}

function examUnavailableMessage(locale: 'en' | 'de') {
  return locale === 'de'
    ? 'Dieser Prüfungstermin ist nicht mehr buchbar. Bitte wähle einen anderen Termin.'
    : 'This exam date can no longer be booked. Please choose another date.';
}

function levelMessage(locale: 'en' | 'de') {
  return locale === 'de' ? 'Bitte wähle ein Niveau aus.' : 'Please choose a level.';
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

  const { website, ...fields } = parsed.data;
  // Allergies belong to an accommodation request, which the schema has already
  // tied to consent; unticking accommodation must not leave them behind.
  const payload = { ...fields, allergies: fields.accommodationRequired ? fields.allergies : '' };
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
   * Every course must be one the public form offers right now. The catalogue
   * decides what a learner can still book; without this check anyone could
   * POST a past or unknown term straight at the route. The labels come from
   * the same lookup, so the stored record names the course even when its ids
   * are fixtures with no row behind them. Whether a level is required, and what
   * a chosen level means, is decided here from the catalogue, not taken from the
   * wizard.
   */
  const catalog = await getCourseRegistrationCatalog(payload.locale);
  const courses: Array<{ typeLabel: string; instanceLabel: string; typeId: string; instanceId: string; level: { label: string; startCode: string } | null }> = [];
  for (const item of payload.courses) {
    const courseType = catalog.courseTypes.find((candidate) => candidate.id === item.courseTypeId);
    const option = catalog.optionsByCourseTypeId[item.courseTypeId]?.find((candidate) => candidate.id === item.courseInstanceId);
    if (!courseType || !option) {
      return NextResponse.json({ status: 'error', message: unavailableMessage(payload.locale) }, { status: 400 });
    }
    const levels = option.availableLevels ?? [];
    const level = item.level ? describeBookedLevel(courseType.slug, item.level, levels, payload.locale) : null;
    const levelRequired = requiresLevelField(courseType.slug) && levels.length > 0;
    if ((item.level && !level) || (levelRequired && !level)) {
      return NextResponse.json({ status: 'error', message: levelMessage(payload.locale) }, { status: 400 });
    }
    if (item.pathTo && !continuationLevels(courseType.slug, item.level, levels).includes(item.pathTo)) {
      return NextResponse.json({ status: 'error', message: levelMessage(payload.locale) }, { status: 400 });
    }
    // A path is one row per level, each in the term the path finds; the route
    // rebuilds it from its own catalogue rather than taking the wizard's.
    const steps = level && item.pathTo
      ? buildLevelPath({
          slug: courseType.slug,
          value: item.level,
          option,
          options: catalog.optionsByCourseTypeId[courseType.id] ?? [],
          availableLevels: levels,
          pathTo: item.pathTo,
          locale: payload.locale,
        })
      : [];
    if (steps.length > 1) {
      for (const step of steps) {
        courses.push({
          typeId: courseType.id,
          instanceId: step.option?.id ?? '',
          typeLabel: courseType.name,
          instanceLabel: step.option
            ? `${step.option.dateRangeLabel} | ${step.option.scheduleLabel} | ${step.option.locationLabel}`
            : payload.locale === 'de' ? 'Termin wird noch festgelegt' : 'Date to be arranged',
          level: { label: step.label, startCode: step.startCode },
        });
      }
      continue;
    }
    courses.push({
      typeId: courseType.id,
      instanceId: option.id,
      typeLabel: courseType.name,
      instanceLabel: `${option.dateRangeLabel} | ${option.scheduleLabel} | ${option.locationLabel}`,
      level,
    });
  }

  // An exam booked with the courses, checked against the exam form's own catalogue.
  let exam: { typeId: string; sessionId: string; typeLabel: string; sessionLabel: string; registrationType: 'full' | 'written' | 'oral' } | null = null;
  if (payload.examEnabled && payload.exam?.registrationType) {
    const examCatalog = await getExamRegistrationCatalog(payload.locale);
    const examType = examCatalog.examTypes.find((candidate) => candidate.id === payload.exam?.examTypeId);
    const session = examCatalog.optionsByExamTypeId[payload.exam.examTypeId]?.find(
      (candidate) => candidate.id === payload.exam?.examSessionId
    );
    if (!examType || !session) {
      return NextResponse.json({ status: 'error', message: examUnavailableMessage(payload.locale) }, { status: 400 });
    }
    exam = {
      typeId: examType.id,
      sessionId: session.id,
      typeLabel: examType.name,
      sessionLabel: `${session.startsAtLabel} | ${session.locationLabel}`,
      registrationType: payload.exam.registrationType,
    };
  }

  // The first course's request id is the learner's reference; the other rows get their own.
  const first = courses[0];
  const courseTypeLabel = first.typeLabel;
  const courseInstanceLabel = first.instanceLabel;

  const submittedAt = new Date().toISOString();
  const webhookUrl = process.env.COURSE_REGISTRATION_WEBHOOK_URL;

  /*
   * Stored in the staff workspace before the fan-out, and independently of it.
   * See the same block in `src/app/api/contact/route.ts` for why the two are
   * not coupled: a storage failure must not tell a learner their registration
   * failed, and a webhook timeout must not lose the row.
   */
  const stored = await storeRegistration({
    registrant: {
      salutation: payload.salutation,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      nationality: payload.nationality,
      birthDate: payload.birthDate,
    },
    stay: {
      visaRequired: payload.visaRequired,
      accommodationRequired: payload.accommodationRequired,
      accommodationType: payload.accommodationType,
      allergies: payload.allergies,
      notes: payload.notes,
    },
    locale: payload.locale,
    courses: courses.map((course, index) => ({
      requestId: index === 0 ? requestId : crypto.randomUUID(),
      courseTypeId: course.typeId,
      courseInstanceId: course.instanceId,
      courseTypeLabel: course.typeLabel,
      courseInstanceLabel: course.instanceLabel,
      levelRaw: course.level?.label ?? '',
      levelCode: course.level ? levelCodeFrom(course.level.startCode) : null,
    })),
    exam: exam
      ? {
          requestId: crypto.randomUUID(),
          examTypeId: exam.typeId,
          examSessionId: exam.sessionId,
          examTypeLabel: exam.typeLabel,
          examSessionLabel: exam.sessionLabel,
          registrationType: exam.registrationType,
          officialNameConfirmed: payload.officialNameConfirmed,
        }
      : undefined,
  });

  /*
   * The first course stays in the single-course fields every template already
   * reads; `courses` and `exam` carry the whole registration for the mails that
   * list it. The request's own `courses` and `exam` (ids only) are replaced.
   */
  const { courses: _submittedCourses, exam: _submittedExam, ...person } = payload;
  void _submittedCourses;
  void _submittedExam;
  const notification = {
    requestId,
    submittedAt,
    ...person,
    courseTypeLabel,
    courseInstanceLabel,
    currentLevel: first.level?.label ?? '',
    courses: courses.map((course) => ({
      courseTypeLabel: course.typeLabel,
      courseInstanceLabel: course.instanceLabel,
      level: course.level?.label ?? '',
    })),
    ...(exam
      ? { exam: { examTypeLabel: exam.typeLabel, examSessionLabel: exam.sessionLabel, registrationType: exam.registrationType } }
      : {}),
    source: 'registration-course',
  };
  // Stored, the registration is accepted whatever the alert does, so the receipt
  // goes out alongside it. Not stored, it waits: no receipt for a 503.
  const [delivery, early] = stored
    ? await Promise.all([notifyForm('course', notification, webhookUrl, { stored }), confirmToSender('course', notification)])
    : [await notifyForm('course', notification, webhookUrl, { stored }), null];
  if (!stored && !delivery.delivered) {
    return NextResponse.json({ status: 'error', message: failureMessage(payload.locale), supportPath: '/contact' }, { status: 503 });
  }

  const confirmation = early ?? await confirmToSender('course', notification);

  return NextResponse.json({
    status: 'accepted',
    requestId,
    mode: delivery.delivered ? delivery.channel : 'database',
    notified: delivery.delivered,
    confirmationSent: confirmation.reachedSender,
    stored,
    message: successMessage(payload.locale),
  });
}
