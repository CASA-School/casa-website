import 'server-only';

import { cookies, draftMode } from 'next/headers';
import { cache } from 'react';

import { PREPARED_LOCALES, type PreparedLocale } from '@/config/cms/translation-locales';

/**
 * Seeing a prepared language on the real pages, in the website editor only.
 *
 * The six prepared languages (translation-locales.ts) are not routed, so no
 * visitor can open them. The editor can: picking one sets this cookie through
 * /api/cms/preview-language, and while draft mode is on (only the editor's
 * preview has it) every page renders with that language's texts, values and
 * direction over its own route. Without draft mode the cookie means nothing.
 */
export const PREVIEW_LANGUAGE_COOKIE = 'casa_preview_language';

export const isPreparedLocale = (code: string | null | undefined): code is PreparedLocale =>
  typeof code === 'string' && (PREPARED_LOCALES as readonly string[]).includes(code);

export const previewLanguage = cache(async (): Promise<PreparedLocale | null> => {
  if (!(await draftMode()).isEnabled) return null;
  const code = (await cookies()).get(PREVIEW_LANGUAGE_COOKIE)?.value;
  return isPreparedLocale(code) ? code : null;
});

export const previewLanguageCookie = {
  path: '/',
  httpOnly: true,
  sameSite: process.env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
  secure: process.env.NODE_ENV === 'production',
};
