/**
 * Records one answer and returns the next item.
 *
 * Idempotent: re-posting the same item with the same value is acknowledged,
 * while changing an answer or posting an item out of sequence is rejected. A
 * double tap and a retry after a dropped connection therefore converge without
 * letting a tampered client rewrite the adaptive path.
 *
 * Returns the next item in the same response so answering is one round trip.
 */

import type { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api/response';
import {
  computeProgress,
  loadAttempt,
  recordResponse,
  toClientState,
} from '@/lib/placement/attempt.server';
import { saveResponseSchema } from '@/lib/validation/placement';

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError('invalid_payload', 'Request body must be JSON.', 400);
  }

  const parsed = saveResponseSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('invalid_payload', parsed.error.issues[0]?.message ?? 'Invalid request.', 400);
  }

  const { token, itemId, value } = parsed.data;

  const attempt = await loadAttempt(token);
  if (!attempt) {
    return apiError('attempt_not_found', 'This test session could not be found.', 404);
  }

  const result = await recordResponse(attempt, itemId, value);
  if (!result.accepted) {
    // `attempt_not_in_progress` is a 409 rather than a 400: the request was well
    // formed, the attempt has simply moved on. The client uses this to stop
    // retrying and load the result instead.
    const status = result.reason === 'attempt_not_in_progress' ? 409 : 400;
    return apiError(result.reason ?? 'response_rejected', 'This answer could not be recorded.', status);
  }

  const progress = await computeProgress(attempt);
  return apiSuccess(await toClientState(progress));
}
