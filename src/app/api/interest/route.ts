import { z } from 'zod';

import { storeEnquiry } from '@/lib/admin/intake';
import { rateLimit } from '@/lib/api/rate-limit';
import { apiError, apiSuccess } from '@/lib/api/response';
import { confirmToSender, notifyForm } from '@/lib/notifications/forms.server';
import {
  INTEREST_COURSES,
  INTEREST_DAYS,
  INTEREST_LEVELS,
  INTEREST_PROFESSIONS,
  INTEREST_TIMES,
  interestLabels,
  type InterestCourseSlug,
} from '@/config/courses/interest-list';

export const dynamic = 'force-dynamic';

const values = <T extends readonly { value: string }[]>(options: T) =>
  options.map((option) => option.value) as [T[number]['value'], ...T[number]['value'][]];

const schema = z.object({
  course: z.enum(Object.keys(INTEREST_COURSES) as [InterestCourseSlug, ...InterestCourseSlug[]]),
  locale: z.enum(['en', 'de']),
  level: z.enum(values(INTEREST_LEVELS)),
  profession: z.enum(values(INTEREST_PROFESSIONS)).optional(),
  days: z.array(z.enum(values(INTEREST_DAYS))).min(1).max(INTEREST_DAYS.length),
  times: z.array(z.enum(values(INTEREST_TIMES))).min(1).max(INTEREST_TIMES.length),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.email().max(254),
  phone: z.string().trim().max(40).regex(/^[\d\s+()/.-]*$/).default(''),
  message: z.string().trim().max(2000).default(''),
  privacy: z.literal(true),
  website: z.string().max(200).default(''),
});

/*
 * An interest-list entry (config/courses/interest-list.ts): the person, their
 * level and when they are free. Like the contact form it is stored in the
 * workspace's enquiries queue when there is a database, and the alert goes to
 * the contact mailbox (info@); with neither stored nor delivered it answers 503,
 * because then nothing would reach CASA. The person gets the usual branded
 * receipt, saying plainly that nothing is booked yet.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, 'interest', { limit: 8, windowMs: 10 * 60_000 });
  if (limited) return limited;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError('INVALID', 'Invalid request.', 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError('INVALID', 'Please check your details.', 400);
  const input = parsed.data;
  const requestId = crypto.randomUUID();
  // Honeypot: accepted as far as a bot can tell, and dropped.
  if (input.website) return apiSuccess({ requestId, stored: false, confirmationSent: false }, 201);

  const courseName = INTEREST_COURSES[input.course][input.locale];
  // The workspace record is a contact enquiry, so its message carries the whole entry, in German for the team.
  const record = [
    `Interessentenliste: ${INTEREST_COURSES[input.course].de}`,
    `Niveau: ${interestLabels(INTEREST_LEVELS, [input.level], 'de')}`,
    input.profession ? `Beruf: ${interestLabels(INTEREST_PROFESSIONS, [input.profession], 'de')}` : null,
    `Tage: ${interestLabels(INTEREST_DAYS, input.days, 'de')}`,
    `Tageszeit: ${interestLabels(INTEREST_TIMES, input.times, 'de')}`,
    input.phone ? `Telefon: ${input.phone}` : null,
    input.message ? `\n${input.message}` : null,
  ].filter(Boolean).join('\n');

  const stored = await storeEnquiry({
    requestId,
    locale: input.locale,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    topic: `Interessentenliste: ${INTEREST_COURSES[input.course].de}`,
    topicKey: `interest-${input.course}`,
    message: record,
    source: 'interest-list',
    organiserBrief: null,
    userAgent: request.headers.get('user-agent') || null,
  });

  const notification = {
    requestId, submittedAt: new Date().toISOString(), locale: input.locale,
    firstName: input.firstName, lastName: input.lastName, email: input.email, phone: input.phone || null,
    course: input.course, courseName, level: input.level, profession: input.profession ?? null,
    days: input.days, times: input.times, message: input.message,
  };
  const delivery = await notifyForm('interest', notification, null, { stored });
  if (!stored && !delivery.delivered) {
    return apiError('UNAVAILABLE', 'Your details could not be sent. Please try again.', 503);
  }
  const confirmation = await confirmToSender('interest', notification);
  return apiSuccess({ requestId, stored, notified: delivery.delivered, confirmationSent: confirmation.reachedSender }, 201);
}
