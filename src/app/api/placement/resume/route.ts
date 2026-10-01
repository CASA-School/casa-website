/** Restores an in-progress placement attempt from its private URL token. */

import type { NextRequest } from 'next/server';

import { apiError, apiSuccess } from '@/lib/api/response';
import { placementTestEnabled } from '@/lib/placement/availability';
import { resumeAttempt } from '@/lib/placement/attempt.server';
import { resumeAttemptSchema } from '@/lib/validation/placement';

export async function POST(request: NextRequest) {
  // CASA's own test is closed on this deployment (src/lib/placement/availability.ts).
  if (!placementTestEnabled()) return apiError('not_found', 'Not found.', 404);
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return apiError('invalid_payload', 'Request body must be JSON.', 400);
  }

  const parsed = resumeAttemptSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('invalid_payload', parsed.error.issues[0]?.message ?? 'Invalid request.', 400);
  }

  const state = await resumeAttempt(parsed.data.token);
  if (!state) {
    return apiError('attempt_not_found', 'This test session could not be found.', 404);
  }

  return apiSuccess(state);
}
