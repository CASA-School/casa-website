/**
 * Returns the writing prompt for a finished objective attempt.
 *
 * Separate from the attempt/response routes because the prompt depends on the
 * band, which is only known once routing has resolved — and because the prompt
 * is chosen deterministically per attempt, so a refresh mid-write cannot hand
 * the learner a different task.
 *
 * Sanitised: `reviewFocus` is reviewer shorthand and does not travel.
 */

import type { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api/response';
import { computeProgress, loadAttempt } from '@/lib/placement/attempt.server';
import { sanitiseProductionPrompt } from '@/lib/placement/sanitise';
import { submitAttemptSchema } from '@/lib/validation/placement';

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError('invalid_payload', 'Request body must be JSON.', 400);
  }

  const parsed = submitAttemptSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('invalid_payload', parsed.error.issues[0]?.message ?? 'Invalid request.', 400);
  }

  const attempt = await loadAttempt(parsed.data.token);
  if (!attempt) {
    return apiError('attempt_not_found', 'This test session could not be found.', 404);
  }

  const progress = await computeProgress(attempt);

  return apiSuccess({
    prompt: progress.writingPrompt ? sanitiseProductionPrompt(progress.writingPrompt) : null,
  });
}
