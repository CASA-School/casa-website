import { getLocale } from 'next-intl/server';

import { prepareCopy } from '@/lib/cms/content.server';
import type { ContentLocale } from '@/lib/content/types';
import { normalizeContentLocale } from '@/lib/content/locale';

/**
 * The language of the current request, from its URL.
 *
 * Until 2026-09-10 this read a cookie, which meant one URL served two
 * languages, German was invisible to search engines and no page could be
 * cached. The language now lives in the path (src/i18n/pathnames.ts); the
 * proxy resolves it and next-intl carries it into every server component and
 * generateMetadata call, so callers need no change.
 */
export async function getContentLocale(): Promise<ContentLocale> {
  /*
   * Every page asks for its language first, so this is also where the page's
   * copy is readied: `say`, `pick` and `pickTree` (src/lib/cms/copy.ts) read
   * the live edits — or, in the website editor's preview, the drafts — from a
   * store that lives for this request. One query, shared with the layout.
   */
  const [locale] = await Promise.all([getLocale(), prepareCopy()]);
  return normalizeContentLocale(locale);
}
