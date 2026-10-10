import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

import { safePreviewPath } from '@/lib/cms/preview-token';

/**
 * Leaves the editor's preview: draft mode off, back to the live page.
 *
 * Draft mode lives in a session cookie, so a colleague who opens the public
 * site in another tab of the same browser still sees drafts there. The bridge
 * shows them a small "Draft preview" pill outside the editor, and it links here.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  (await draftMode()).disable();
  redirect(safePreviewPath(url.searchParams.get('path')));
}
