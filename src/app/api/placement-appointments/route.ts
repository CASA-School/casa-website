import { z } from 'zod';

import { rateLimit } from '@/lib/api/rate-limit';
import { apiError, apiSuccess } from '@/lib/api/response';
import { isDatabaseConfigured } from '@/lib/db/env';
import { appointmentInstant } from '@/lib/appointments/schedule';
import { isBookablePlacementTime, PLACEMENT_MINUTES, PLACEMENT_TIMES, placementDays } from '@/lib/appointments/placement-schedule';
import { bookedPlacementSeats, bookPlacementSeat } from '@/lib/appointments/placement-repository.server';
import { confirmToSender, notifyForm } from '@/lib/notifications/forms.server';

export const dynamic = 'force-dynamic';

const schema = z.object({
  date: z.string(),
  time: z.enum(PLACEMENT_TIMES),
  locale: z.enum(['en', 'de']),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().max(100).default(''),
  email: z.email().max(254),
  phone: z.string().trim().max(40).regex(/^[+()\d\s/-]*$/).default(''),
  message: z.string().trim().max(2000).default(''),
  privacy: z.literal(true),
  website: z.string().max(200).default(''),
});

/*
 * The placement test in person, by appointment (2026-10-28): two places a time, Tuesday to
 * Thursday. With a database the place is booked at once and the learner's confirmation says so.
 * Without one (the fallback mode) the times are all offered, the request reaches online@ by mail
 * alone, `held` is false and no copy calls it booked: the team checks the time and confirms.
 */
export async function GET() {
  if (!isDatabaseConfigured()) return apiSuccess({ days: placementDays(new Map()), held: false });
  try {
    return apiSuccess({ days: placementDays(await bookedPlacementSeats()), held: true });
  } catch {
    return apiError('UNAVAILABLE', 'Appointments are currently unavailable.', 503);
  }
}

export async function POST(request: Request) {
  const limited = rateLimit(request, 'placement-appointments', { limit: 6, windowMs: 10 * 60_000 });
  if (limited) return limited;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError('INVALID', 'Invalid request.', 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError('INVALID', 'Please check your details.', 400);
  const input = parsed.data;
  if (input.website) return apiError('INVALID', 'Invalid request.', 400);
  if (!isBookablePlacementTime(input.date, input.time)) return apiError('INVALID_SLOT', 'Please choose another time.', 400);
  const startsAt = appointmentInstant(input.date, input.time);
  if (!startsAt) return apiError('UNAVAILABLE', 'Appointments are currently unavailable.', 503);

  const notification = {
    submittedAt: new Date().toISOString(), locale: input.locale,
    firstName: input.firstName, lastName: input.lastName, email: input.email, phone: input.phone,
    startsAt: startsAt.toISOString(), localDate: input.date, localTime: input.time,
    timeZone: 'Europe/Berlin', durationMinutes: PLACEMENT_MINUTES, message: input.message,
  };

  // No database: the mail to online@ is the only record, so it has to go out.
  if (!isDatabaseConfigured()) {
    const unheld = { ...notification, held: false };
    const delivery = await notifyForm('placement-appointment', unheld, null, { stored: false });
    if (!delivery.delivered) return apiError('UNAVAILABLE', 'Your request could not be sent. Please try again.', 503);
    const confirmation = await confirmToSender('placement-appointment', unheld);
    return apiSuccess({ status: 'requested', held: false, notified: true, confirmationSent: confirmation.reachedSender }, 201);
  }

  let seat: number;
  try {
    const booked = await bookPlacementSeat(startsAt, {
      firstName: input.firstName, lastName: input.lastName || null, email: input.email,
      phone: input.phone || null, locale: input.locale, note: input.message || null,
    });
    if (!booked) return apiError('TAKEN', 'This time has just been booked. Please choose another time.', 409);
    seat = booked.seat;
  } catch {
    console.error('[placement-appointments] booking failed');
    return apiError('UNAVAILABLE', 'Your appointment could not be saved. Please try again.', 503);
  }
  const held = { ...notification, held: true, seat };
  const [delivery, confirmation] = await Promise.all([
    notifyForm('placement-appointment', held, null, { stored: true }),
    confirmToSender('placement-appointment', held),
  ]);
  return apiSuccess({ status: 'booked', held: true, notified: delivery.delivered, confirmationSent: confirmation.reachedSender }, 201);
}
