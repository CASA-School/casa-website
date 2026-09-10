import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { defaultLocale, locales } from './routing';

/*
 * The request locale comes from the `[locale]` segment (set by the site layout)
 * or from the header src/proxy.ts hands next-intl. Anything else — a route
 * handler, the staff workspace — falls back to the default language.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(locales, requested) ? requested : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
