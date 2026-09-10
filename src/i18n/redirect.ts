import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

import type { ContentLocale } from '@/lib/content/types';
import { localizeHref } from './pathnames';

/** Server-side redirect to an internal path, in the language of the current request. */
export async function redirectLocalized(href: string): Promise<never> {
  const locale = (await getLocale()) as ContentLocale;
  redirect(localizeHref(href, locale));
}
