import { z } from 'zod';

import { apiError, apiSuccess } from '@/lib/api/response';
import { isLocale } from '@/i18n/routing';
import { getContentLocale } from '@/lib/content/locale.server';
import { getSearchScope, searchPublicContent } from '@/lib/search/public-search';

const searchSuggestSchema = z.object({
  q: z.string().trim().max(120).optional(),
  scope: z.enum(['all', 'courses', 'exams', 'faq', 'news']).optional(),
  limit: z.coerce.number().int().min(1).max(5).optional(),
  // The language lives in the page URL, not in this request's, so the client
  // says which one it is asking for.
  locale: z.string().optional(),
});

export async function GET(request: Request) {
  const searchParams = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = searchSuggestSchema.safeParse(searchParams);

  if (!parsed.success) {
    return apiError(
      'BAD_REQUEST',
      parsed.error.issues[0]?.message ?? 'Invalid search request.',
      400
    );
  }

  const locale = isLocale(parsed.data.locale) ? parsed.data.locale : await getContentLocale();
  const result = await searchPublicContent({
    locale,
    query: parsed.data.q ?? '',
    scope: getSearchScope(parsed.data.scope),
    limitPerGroup: parsed.data.limit ?? 3,
  });

  return apiSuccess(result);
}
