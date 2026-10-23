import { redirect } from 'next/navigation';

import { canAccess } from '@/lib/admin/access';
import { getStaffUser } from '@/lib/admin/auth';
import { isWorkspaceDatabaseConfigured } from '@/lib/admin/db';
import { letterPdfs, pdfName } from '@/lib/admin/letter-pdf';
import { letterModule } from '@/lib/admin/letters/module';
import { getSentLetter } from '@/lib/admin/letters/repo';

/**
 * One letter as a PDF, as it went out — to look at beside the mail, and to attach in the mail program. A route
 * handler, so it checks for itself what the workspace's layouts check for a page (CLAUDE.md, rule 7):
 * signed in, and holding the right the letter is seen with. A 404 otherwise, which does not confirm that
 * the letter exists.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  if (!isWorkspaceDatabaseConfigured()) return new Response('Not found', { status: 404 });
  const user = await getStaffUser();
  if (!user) redirect('/admin/sign-in');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Not found', { status: 404 });
  const found = await getSentLetter(id);
  if (!found || !canAccess(user, letterModule(found.kind), 'view')) return new Response('Not found', { status: 404 });

  const pdf = (await letterPdfs([id], user)).get(id);
  if (!pdf) return new Response('Not found', { status: 404 });
  const name = pdfName(found.subject, found.recipientName);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      // ASCII in the quoted form, the real name (umlauts) in the RFC 5987 form.
      'content-disposition': `inline; filename="${name.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'cache-control': 'private, no-store',
    },
  });
}
