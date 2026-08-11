import { cookies } from 'next/headers';

import type { ContentLocale } from '@/lib/content/types';
import { CONTENT_LOCALE_COOKIE, normalizeContentLocale } from '@/lib/content/locale';

export async function getContentLocale(): Promise<ContentLocale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(CONTENT_LOCALE_COOKIE)?.value;
  return normalizeContentLocale(localeCookie);
}
