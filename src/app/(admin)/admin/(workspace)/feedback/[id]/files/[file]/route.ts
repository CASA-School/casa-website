import { redirect } from 'next/navigation';

import { canAccess } from '@/lib/admin/access';
import { getStaffUser } from '@/lib/admin/auth';
import { isWorkspaceDatabaseConfigured } from '@/lib/admin/db';
import { getFeedbackFile } from '@/lib/admin/feedback';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One screenshot of a feedback (0112), shown in the workspace. A route handler, outside every layout, so
 * it checks for itself (CLAUDE.md rule 7, as the CV download does): signed in, and either holding the
 * Feedback module or being the colleague who sent it. Anyone else gets the 404 a missing id gets.
 *
 * Served inline as the type its first bytes proved when it was stored — PNG, JPEG or WebP, never SVG or
 * anything a browser would run — with `nosniff`, and kept out of shared caches: a screenshot of the
 * workspace shows learners' data.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; file: string }> }): Promise<Response> {
  if (!isWorkspaceDatabaseConfigured()) {
    return new Response('Not found', { status: 404 });
  }

  const user = await getStaffUser();

  if (!user) {
    redirect('/admin/sign-in');
  }

  const { id, file } = await params;
  if (!UUID.test(id) || !UUID.test(file)) {
    return new Response('Not found', { status: 404 });
  }

  const picture = await getFeedbackFile(id, file);

  if (!picture || !(canAccess(user, 'feedback', 'view') || picture.senderId === user.id)) {
    return new Response('Not found', { status: 404 });
  }

  const extension = picture.contentType === 'image/png' ? 'png' : picture.contentType === 'image/webp' ? 'webp' : 'jpg';

  return new Response(new Uint8Array(picture.content), {
    headers: {
      'content-type': picture.contentType,
      'content-length': String(picture.content.byteLength),
      'content-disposition': `inline; filename="${picture.name}.${extension}"`,
      'cache-control': 'private, max-age=3600',
      'x-content-type-options': 'nosniff',
    },
  });
}
