/**
 * Closes an attempt and stores the decision.
 *
 * Re-submitting an already submitted attempt returns the stored decision
 * unchanged rather than re-scoring. Cut scores are pilot hypotheses that will
 * move, and re-scoring on every call would let a policy edit silently change a
 * placement a learner has already been told and a teacher may have acted on.
 */

import type { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api/response';
import { loadAttempt, submitAttempt } from '@/lib/placement/attempt.server';
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

  await submitAttempt(attempt, {
    technicalProblem: parsed.data.technicalProblem,
    productionIncomplete: parsed.data.productionIncomplete,
  });

  // The decision itself is not returned here. The result page reads it
  // server-side from the token, so the band, the confidence, and the review
  // reasons never travel through a client fetch that could be cached or logged.
  return apiSuccess({ token: attempt.token, resultPath: `/placement-test/result/${attempt.token}` });
}
