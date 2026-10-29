import { z } from 'zod';

import { storeEnquiry } from '@/lib/admin/intake';
import { rateLimit } from '@/lib/api/rate-limit';
import { apiError, apiSuccess } from '@/lib/api/response';
import { TANDEM_LEVELS } from '@/config/content/tandem';
import { confirmToSender, notifyForm } from '@/lib/notifications/forms.server';

export const dynamic = 'force-dynamic';

const schema = z.object({
  locale: z.enum(['en', 'de']),
  offers: z.string().trim().min(2).max(120),
  wants: z.string().trim().min(2).max(120),
  level: z.enum(TANDEM_LEVELS),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.email().max(254),
  phone: z.string().trim().max(40).regex(/^[\d\s+()/.-]*$/).default(''),
  occupation: z.string().trim().max(120).default(''),
  interests: z.string().trim().max(1000).default(''),
  message: z.string().trim().max(2000).default(''),
  privacy: z.literal(true),
  website: z.string().max(200).default(''),
});

/*
 * A tandem request from the tandem page's form (resources/language-tandem): the languages someone
 * speaks and wants to practise, so CASA can find them a partner. Like the contact form it is a
 * contact enquiry in the workspace (topic „Sprachtandem") when there is a database, its alert goes to
 * the contact mailbox (info@) and the person gets the contact receipt; with neither stored nor
 * delivered it answers 503, because then nothing would reach CASA.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, 'tandem', { limit: 8, windowMs: 10 * 60_000 });
  if (limited) return limited;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError('INVALID', 'Invalid request.', 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError('INVALID', 'Please check your details.', 400);
  const input = parsed.data;
  const requestId = crypto.randomUUID();
  // Honeypot: accepted as far as a bot can tell, and dropped.
  if (input.website) return apiSuccess({ requestId, stored: false, confirmationSent: false }, 201);

  // The workspace record and the alert carry the whole request, in German for the team.
  const message = [
    `Sprachangebot: ${input.offers}`,
    `Wunschsprache: ${input.wants} (Niveau ${input.level})`,
    input.phone ? `Telefon: ${input.phone}` : null,
    input.occupation ? `Tätigkeit/Beruf: ${input.occupation}` : null,
    input.interests ? `Hobbys/Interessen: ${input.interests}` : null,
    input.message ? `\n${input.message}` : null,
  ].filter(Boolean).join('\n');
  const topic = 'Sprachtandem';

  const stored = await storeEnquiry({
    requestId,
    locale: input.locale,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    topic,
    topicKey: 'tandem',
    message,
    source: 'tandem-form',
    organiserBrief: null,
    userAgent: request.headers.get('user-agent') || null,
  });

  const notification = {
    requestId, submittedAt: new Date().toISOString(), locale: input.locale,
    firstName: input.firstName, lastName: input.lastName, email: input.email,
    topic, topicKey: 'tandem', message, source: 'tandem-form', organiserBrief: null,
  };
  const delivery = await notifyForm('contact', notification, null, { stored });
  if (!stored && !delivery.delivered) {
    return apiError('UNAVAILABLE', 'Your request could not be sent. Please try again.', 503);
  }
  const confirmation = await confirmToSender('contact', notification);
  return apiSuccess({ requestId, stored, notified: delivery.delivered, confirmationSent: confirmation.reachedSender }, 201);
}
