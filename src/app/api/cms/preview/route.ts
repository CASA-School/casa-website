import { cookies, draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

import { apiError } from '@/lib/api/response';
import { PREVIEW_LANGUAGE_COOKIE } from '@/lib/cms/preview-language.server';
import { safePreviewPath, verifyPreviewToken } from '@/lib/cms/preview-token';

/**
 * Opens the website editor's preview: draft mode on, then the page.
 *
 * The editor's iframe lands here first with a token the workspace signed for a
 * signed-in colleague who holds the `website` module (src/lib/cms/preview-token.ts).
 * Without a valid one nothing changes. With one, draft mode shows drafts and
 * releases still waiting, each text tagged for the editor to find. The path is
 * held to this site and kept out of /admin.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);

  if (!verifyPreviewToken(url.searchParams.get('token'))) {
    return apiError('preview_denied', 'This preview link is not valid any more.', 403);
  }

  (await draftMode()).enable();
  // A new editor session starts in German, whatever language the last one previewed.
  (await cookies()).delete(PREVIEW_LANGUAGE_COOKIE);
  redirect(safePreviewPath(url.searchParams.get('path')));
}
