import { z } from 'zod';

import { rateLimit } from '@/lib/api/rate-limit';
import { apiError, apiSuccess } from '@/lib/api/response';
import { isDatabaseConfigured } from '@/lib/db/env';
import { appointmentDays, appointmentInstant, APPOINTMENT_TIMES, isAppointmentDate } from '@/lib/appointments/schedule';
import { reserveAppointment, takenAppointments } from '@/lib/appointments/repository.server';
import { confirmToSender, notifyForm } from '@/lib/notifications/forms.server';

export const dynamic = 'force-dynamic';

const schema = z.object({
  date: z.string(), time: z.enum(APPOINTMENT_TIMES),
  locale: z.enum(['en', 'de']),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().max(100).default(''),
  email: z.email().max(254),
  message: z.string().trim().max(2000).default(''),
  privacy: z.literal(true),
  website: z.string().max(200).default(''),
});

function blockedDates() {
  return new Set((process.env.GROUP_APPOINTMENT_BLOCKED_DATES ?? '').split(',').map(value => value.trim()));
}

/*
 * Without a database (the fallback mode) the dialog still offers Ina's
 * schedule and a request still reaches her, by mail alone: nothing can hold a
 * time then, so `held` is false and no copy anywhere says the time is
 * reserved. Ina checks the time when she confirms, as she always does.
 */
export async function GET() {
  if (!isDatabaseConfigured()) return apiSuccess({ days: appointmentDays(new Set(), new Date(), blockedDates()), held: false });
  try {
    return apiSuccess({ days: appointmentDays(await takenAppointments(), new Date(), blockedDates()), held: true });
  } catch {
    return apiError('UNAVAILABLE', 'Appointment requests are currently unavailable.', 503);
  }
}

export async function POST(request: Request) {
  // Tighter than the other forms: each accepted request holds one of Ina's slots.
  const limited = rateLimit(request, 'appointments', { limit: 6, windowMs: 10 * 60_000 });
  if (limited) return limited;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError('INVALID', 'Invalid request.', 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError('INVALID', 'Please check your details.', 400);
  const input = parsed.data;
  if (input.website) return apiError('INVALID', 'Invalid request.', 400);
  if (!isAppointmentDate(input.date) || blockedDates().has(input.date)) {
    return apiError('INVALID_SLOT', 'Please choose another date.', 400);
  }
  const startsAt = appointmentInstant(input.date, input.time);
  if (!startsAt) return apiError('UNAVAILABLE', 'Appointment requests are currently unavailable.', 503);
  const requestId = crypto.randomUUID();
  const notification = {
    requestId, submittedAt: new Date().toISOString(), locale: input.locale, firstName: input.firstName, lastName: input.lastName, email: input.email,
    startsAt: startsAt.toISOString(), localDate: input.date, localTime: input.time,
    timeZone: 'Europe/Berlin', durationMinutes: 30, message: input.message,
  };

  // No database: the mail to Ina is the only record, so it has to go out.
  if (!isDatabaseConfigured()) {
    const unheld = { ...notification, held: false };
    const delivery = await notifyForm('appointment', unheld, null, { stored: false });
    if (!delivery.delivered) return apiError('UNAVAILABLE', 'Your request could not be sent. Please try again.', 503);
    const confirmation = await confirmToSender('appointment', unheld);
    return apiSuccess(
      { requestId, status: 'requested', held: false, notified: true, confirmationSent: confirmation.reachedSender },
      201,
    );
  }

  try {
    const reserved = await reserveAppointment(startsAt, {
      requestId, locale: input.locale, firstName: input.firstName,
      lastName: input.lastName || null, email: input.email,
      topic: 'Appointment with Ina Eismann', topicKey: 'group-booking',
      message: `${input.date} · ${input.time} · 30 min · Europe/Berlin\n\n${input.message}`,
      source: 'group-appointment',
      organiserBrief: { appointmentStartsAt: startsAt.toISOString(), durationMinutes: 30 },
      userAgent: request.headers.get('user-agent'),
    });
    if (!reserved) return apiError('TAKEN', 'This appointment has just been requested. Please choose another time.', 409);
  } catch {
    console.error('[appointments] reservation failed', { requestId });
    return apiError('UNAVAILABLE', 'Your request could not be saved. Please try again.', 503);
  }
  const [delivery, confirmation] = await Promise.all([
    notifyForm('appointment', notification, null, { stored: true }),
    confirmToSender('appointment', notification),
  ]);
  return apiSuccess(
    { requestId, status: 'requested', held: true, notified: delivery.delivered, confirmationSent: confirmation.reachedSender },
    201,
  );
}
