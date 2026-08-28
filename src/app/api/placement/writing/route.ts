/**
 * Stores the writing task.
 *
 * Never graded automatically — v1 policy prohibits AI making the writing or
 * speaking decision, so this only persists the text for a human to read.
 *
 * Without a database there is nowhere durable to put it and no reviewer to hand
 * it to, so the route reports that plainly instead of accepting a submission it
 * will drop. Mirrors how career applications already behave without storage.
 */

import type { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api/response';
import { loadAttempt, recordWriting } from '@/lib/placement/attempt.server';
import { isPlacementPersistenceAvailable } from '@/lib/placement/repository.server';
import { submitWritingSchema } from '@/lib/validation/placement';

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError('invalid_payload', 'Request body must be JSON.', 400);
  }

  const parsed = submitWritingSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('invalid_payload', parsed.error.issues[0]?.message ?? 'Invalid request.', 400);
  }

  if (!isPlacementPersistenceAvailable()) {
    return apiError(
      'storage_unavailable',
      'Writing cannot be submitted right now. Your level recommendation is unaffected.',
      503
    );
  }

  const attempt = await loadAttempt(parsed.data.token);
  if (!attempt) {
    return apiError('attempt_not_found', 'This test session could not be found.', 404);
  }

  const stored = await recordWriting(attempt, parsed.data.promptId, parsed.data.text);
  if (!stored) {
    return apiError(
      'storage_unavailable',
      'Writing could not be stored. Your level recommendation is unaffected.',
      503
    );
  }

  return apiSuccess({ stored: true });
}
