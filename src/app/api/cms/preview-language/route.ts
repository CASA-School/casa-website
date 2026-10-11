import { cookies, draftMode } from 'next/headers';
import { redirect } from 'next/navigation';

import { apiError } from '@/lib/api/response';
import { isPreparedLocale, PREVIEW_LANGUAGE_COOKIE, previewLanguageCookie } from '@/lib/cms/preview-language.server';
import { safePreviewPath } from '@/lib/cms/preview-token';

/**
 * Switches the website editor's preview to a language (preview-language.server.ts).
 *
 * Only inside the preview: draft mode is on only for a request that came
 * through /api/cms/preview with a token the workspace signed. A prepared
 * language sets the cookie; German or English clears it. Then the page.
 */
export async function GET(request: Request) {
  if (!(await draftMode()).isEnabled) {
    return apiError('preview_denied', 'Open this page from the website editor.', 403);
  }

  const url = new URL(request.url);
  const lang = url.searchParams.get('lang');
  const store = await cookies();
  if (isPreparedLocale(lang)) store.set(PREVIEW_LANGUAGE_COOKIE, lang, previewLanguageCookie);
  else store.delete(PREVIEW_LANGUAGE_COOKIE);

  redirect(safePreviewPath(url.searchParams.get('path')));
}
