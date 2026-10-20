import { z } from 'zod';

import { isWorkspaceDatabaseConfigured } from '@/lib/admin/db';
import { rateLimit } from '@/lib/api/rate-limit';
import { apiError, apiSuccess } from '@/lib/api/response';
import { attemptStatus, leaveAttempt, openSittings, saveAnswers, startAttempt, submitAttempt, unlockAttempt } from '@/lib/entry-test/attempts.server';

export const dynamic = 'force-dynamic';

const token = z.string().min(1).max(100);
const answers = z.array(z.string().max(10)).max(80);

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('info') }),
  z.object({ action: z.literal('start'), name: z.string().max(200), email: z.string().max(254), sittingId: z.uuid().optional().or(z.literal('').transform(() => undefined)) }),
  z.object({ action: z.literal('save'), token, answers }),
  z.object({ action: z.literal('leave'), token, reason: z.enum(['hidden', 'pagehide']), answers: answers.optional() }),
  z.object({ action: z.literal('unlock'), token, code: z.string().max(12) }),
  z.object({ action: z.literal('status'), token }),
  z.object({ action: z.literal('submit'), token, answers }),
]);

const NAME = /\p{L}/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/*
 * The day-one test on the learner's phone (docs/ENTRY_TEST.md): one endpoint, one body per action
 * (src/lib/entry-test/types.ts). A whole class writes from the school's network, so only starting and
 * the code are rate-limited, and generously; saves come with every tap. `leave` also arrives by
 * sendBeacon as text/plain, so the body is read as text. Without a database nothing is open.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return apiError('INVALID', 'Invalid request.', 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError('INVALID', 'Invalid request.', 400);
  const input = parsed.data;

  if (!isWorkspaceDatabaseConfigured()) {
    return input.action === 'info' ? apiSuccess({ sittings: [] }) : apiError('closed', 'Der Test ist nicht geöffnet.', 503);
  }
  if (input.action === 'start' || input.action === 'unlock') {
    const limited = rateLimit(request, `entry-test-${input.action}`, { limit: 200, windowMs: 10 * 60_000 });
    if (limited) return limited;
  }

  try {
    switch (input.action) {
      case 'info':
        return apiSuccess({ sittings: await openSittings() });
      case 'start': {
        const name = input.name.trim().replace(/\s+/g, ' ').slice(0, 80);
        const email = input.email.trim().toLowerCase().slice(0, 120);
        if (name.length < 3 || !NAME.test(name)) return apiError('name', 'Bitte Vor- und Nachnamen eingeben.', 400);
        if (!EMAIL.test(email)) return apiError('email', 'Bitte eine gültige E-Mail-Adresse eingeben.', 400);
        const result = await startAttempt(name, email, input.sittingId);
        if (!result.ok) return apiError(result.error, result.error, 409);
        return apiSuccess(result.state);
      }
      case 'save':
        return reply(await saveAnswers(input.token, input.answers));
      case 'leave':
        return reply(await leaveAttempt(input.token, input.reason, input.answers));
      case 'unlock':
        return reply(await unlockAttempt(input.token, input.code));
      case 'status':
        return reply(await attemptStatus(input.token));
      case 'submit':
        return reply(await submitAttempt(input.token, input.answers));
    }
  } catch {
    return apiError('UNAVAILABLE', 'Keine Verbindung.', 503);
  }
}

const reply = <T>(value: T | null) => (value ? apiSuccess(value) : apiError('token', 'Unknown attempt.', 404));
