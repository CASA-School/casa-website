import { redirect } from 'next/navigation';

import { canAccess } from '@/lib/admin/access';
import { getStaffUser } from '@/lib/admin/auth';
import { getApplicationFile } from '@/lib/admin/careers';
import { cvDownloadName } from '@/lib/admin/cv-file';
import { logActivity } from '@/lib/admin/activity';
import { isWorkspaceDatabaseConfigured } from '@/lib/admin/db';

/**
 * Streams one candidate's CV.
 *
 * A route handler and not a page, for three reasons that all matter:
 *
 * 1. IT IS THE ONLY PLACE THE DOWNLOAD CAN BE AUTHORISED. A route handler is
 *    not a child of the workspace layout, so neither the layout's auth gate nor
 *    `applications/layout.tsx`'s module gate applies — this checks both for
 *    itself: signed in, AND holding the Applications module. Without the first,
 *    the URL is a public endpoint serving strangers' CVs to anyone who can guess
 *    a uuid; without the second, every colleague can read every applicant's CV,
 *    though applications are management's (access.ts). A 404, not a 403, so the
 *    refusal does not confirm that an application exists.
 *
 * 2. `Content-Disposition: attachment` AND `Content-Type: application/octet-stream`.
 *    Serving uploaded bytes with the uploader's own MIME type invites the
 *    browser to render them in the workspace's origin — which for an SVG or an
 *    HTML file masquerading as a CV is stored XSS against every signed-in
 *    colleague. The stored type is reported in the UI and deliberately not
 *    honoured here.
 *
 * 3. THE DOWNLOAD IS LOGGED. Someone reading a CV is a GDPR-relevant access to
 *    personal data, and the activity trail is the only record CASA would have
 *    of who read what.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  if (!isWorkspaceDatabaseConfigured()) {
    return new Response('Not found', { status: 404 });
  }

  const user = await getStaffUser();

  if (!user) {
    redirect('/admin/sign-in');
  }

  if (!canAccess(user, 'applications', 'view')) {
    return new Response('Not found', { status: 404 });
  }

  const { id } = await params;
  const file = await getApplicationFile(id);

  if (!file) {
    return new Response('Not found', { status: 404 });
  }

  await logActivity({
    actor: user,
    entity: 'career_application',
    entityId: id,
    action: 'cv_downloaded',
    detail: { fileName: file.fileName },
  }).catch(() => {
    // A failed log must not block the download — a recruiter waiting on a file
    // is a worse outcome than one missing trail entry, and the failure is
    // already visible in the server log.
  });

  // Not the uploader's name as given: the extension is the one the bytes
  // justify, so `Lebenslauf.pdf.exe` arrives as `Lebenslauf.pdf.bin`, and only
  // letters, digits, spaces and `._-` survive (cv-file.ts).
  const downloadName = cvDownloadName(file.fileName, file.content);

  // ASCII-only in the quoted form, with the real name in the RFC 5987 form.
  // A raw non-ASCII filename in a header is invalid and some servers reject
  // the whole response — and CASA's applicants have names with umlauts in them.
  const asciiName = downloadName.replace(/[^\x20-\x7e]/g, '_');

  return new Response(new Uint8Array(file.content), {
    headers: {
      'content-type': 'application/octet-stream',
      'content-length': String(file.content.byteLength),
      'content-disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      // Personal data must not sit in a shared cache on the way out.
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
