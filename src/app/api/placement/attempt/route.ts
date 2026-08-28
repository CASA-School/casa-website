/**
 * Starts a placement attempt.
 *
 * Returns the resume token plus the first item — one round trip, so the learner
 * moves from the intake form into the first question without an intermediate
 * loading state.
 *
 * A true beginner gets no item at all: they are placed at A1.1 immediately and
 * the response carries the finished attempt.
 */

import type { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api/response';
import { isDirectBeginner } from '@/config/placement/intake';
import {
  computeProgress,
  startAttempt,
  toClientState,
} from '@/lib/placement/attempt.server';
import { startAttemptSchema } from '@/lib/validation/placement';

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError('invalid_payload', 'Request body must be JSON.', 400);
  }

  const parsed = startAttemptSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('invalid_payload', parsed.error.issues[0]?.message ?? 'Invalid request.', 400);
  }

  const { locale, intake } = parsed.data;

  const { attempt, persisted } = await startAttempt({
    locale,
    intake: { ...intake, directBeginner: isDirectBeginner(intake.priorLearning) },
  });

  const progress = await computeProgress(attempt);
  const state = await toClientState(progress);

  return apiSuccess({
    ...state,
    // From whether the row actually landed, not from whether DATABASE_URL is
    // set. A configured database with an unapplied migration reports false here,
    // which is the truth the learner needs.
    persistent: persisted,
  });
}
