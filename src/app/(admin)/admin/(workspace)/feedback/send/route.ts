import { after } from 'next/server';

import { canAccess } from '@/lib/admin/access';
import { getStaffUser } from '@/lib/admin/auth';
import { isWorkspaceDatabaseConfigured } from '@/lib/admin/db';
import { createFeedback, parseFeedbackContext, sameOrigin, workspacePath } from '@/lib/admin/feedback';
import { sendFeedbackMail } from '@/lib/admin/feedback-mail';
import { FEEDBACK_LIMITS, feedbackImageType, isFeedbackKind, type FeedbackImageType } from '@/lib/admin/feedback-shared';
import { apiError, apiSuccess } from '@/lib/api/response';

/**
 * „Feedback" from any workspace screen (0112): the text, its kind, the page, and up to five screenshots,
 * as one multipart POST. A route handler and not a server action because of the pictures — an action
 * takes 1 MB, and raising that would raise it for every action — and because the panel shows the
 * upload's progress. It is outside every layout, so it checks the session itself (CLAUDE.md rule 7).
 *
 * Every colleague may send: the check is the Overview, the frame no account drops below `view`
 * (access.ts, ALWAYS_ON). Reading what was sent is the `feedback` module's.
 *
 * A picture is accepted only when its first bytes say PNG, JPEG or WebP, whatever it is called or
 * claims to be, and is served back as that type and nothing else. The mail to admin@ goes after the
 * answer (`after`), so the colleague is not kept waiting on Microsoft.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isWorkspaceDatabaseConfigured()) {
    return apiError('not_found', 'Not found', 404);
  }

  const user = await getStaffUser();

  if (!user) {
    return apiError('signed_out', 'Signed out', 401);
  }

  if (!canAccess(user, 'overview', 'view')) {
    return apiError('not_found', 'Not found', 404);
  }

  // A form on another site cannot post here in the colleague's name: the session cookie is SameSite=Lax,
  // and a browser that names where the request came from must name this host.
  if (!sameOrigin(request)) {
    return apiError('forbidden', 'Forbidden', 403);
  }

  if (Number(request.headers.get('content-length') ?? 0) > FEEDBACK_LIMITS.requestBytes) {
    return apiError('too_large', 'Too large', 413);
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return apiError('invalid', 'Invalid feedback', 400);
  }

  const kind = form.get('kind');
  const message = String(form.get('message') ?? '').trim();
  const uploads = form.getAll('screenshot').filter((value): value is File => value instanceof File);

  if (!isFeedbackKind(kind) || message.length > FEEDBACK_LIMITS.message || uploads.length > FEEDBACK_LIMITS.files || (!message && !uploads.length)) {
    return apiError('invalid', 'Invalid feedback', 400);
  }

  const files: { type: FeedbackImageType; bytes: Uint8Array }[] = [];
  for (const upload of uploads) {
    if (upload.size === 0 || upload.size > FEEDBACK_LIMITS.fileBytes) {
      return apiError('too_large', 'Picture too large', 413);
    }
    const bytes = new Uint8Array(await upload.arrayBuffer());
    const type = feedbackImageType(bytes);
    if (!type) {
      return apiError('unsupported', 'Not a picture', 415);
    }
    files.push({ type, bytes });
  }

  const created = await createFeedback(user, {
    kind,
    message,
    pagePath: workspacePath(form.get('pagePath')),
    pageTitle: String(form.get('pageTitle') ?? '').trim().slice(0, 300) || null,
    context: parseFeedbackContext(form.get('context')),
    files,
  });

  after(() => sendFeedbackMail(created.id));

  return apiSuccess({ id: created.id, number: created.number }, 201);
}
