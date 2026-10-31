import { canAccess } from '@/lib/admin/access';
import { getStaffUser } from '@/lib/admin/auth';
import { isWorkspaceDatabaseConfigured } from '@/lib/admin/db';
import { markMyFeedbackSeen, myFeedback, sameOrigin } from '@/lib/admin/feedback';
import { apiError, apiSuccess } from '@/lib/api/response';

/**
 * „Mein Feedback" (0112): GET lists what this colleague sent, with its state and any answer; POST marks
 * every answer there as read. Only ever the caller's own rows — the query is by the session's person,
 * never by an id from the request. Outside every layout, so it checks the session itself (CLAUDE.md rule 7).
 */
async function colleague() {
  if (!isWorkspaceDatabaseConfigured()) return null;
  const user = await getStaffUser();
  return user && canAccess(user, 'overview', 'view') ? user : null;
}

export async function GET(): Promise<Response> {
  const user = await colleague();
  if (!user) {
    return apiError('signed_out', 'Signed out', 401);
  }
  return apiSuccess({ items: await myFeedback(user.id) });
}

export async function POST(request: Request): Promise<Response> {
  const user = await colleague();
  if (!user) {
    return apiError('signed_out', 'Signed out', 401);
  }
  if (!sameOrigin(request)) {
    return apiError('forbidden', 'Forbidden', 403);
  }
  await markMyFeedbackSeen(user.id);
  return apiSuccess({ seen: true });
}
