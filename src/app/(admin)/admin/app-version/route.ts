import { apiError, apiSuccess } from '@/lib/api/response';
import { getStaffUser } from '@/lib/admin/auth';
import { workspaceVersion } from '@/lib/admin/app-version';

export const dynamic = 'force-dynamic';

/** A live, authenticated build check; never a participant-data or session cache. */
export async function GET() {
  let response;
  try {
    response = await getStaffUser()
      ? apiSuccess({ version: await workspaceVersion() })
      : apiError('unauthorized', 'Sign in to the workspace.', 401);
  } catch {
    response = apiError('unavailable', 'The workspace is temporarily unavailable.', 503);
  }
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
