import type { ContentLocale } from '@/lib/content/types';

/**
 * The languages the public site serves.
 *
 * German is the language of the domain: casa-bremen.de/… is German, and every
 * other language carries its own prefix (/en/…, later /ar/…, /tr/…). Decided
 * with the product owner on 2026-09-10; the reasoning and the way to add a
 * language are in docs/I18N_ROUTING.md.
 */
export const locales: readonly ContentLocale[] = ['de', 'en'];

/** The language at the root of the domain. Never prefixed. */
export const defaultLocale: ContentLocale = 'de';

export function isLocale(value: string | null | undefined): value is ContentLocale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

/** Text direction per language. Arabic will be the first `rtl` entry here. */
const RTL_LOCALES: ReadonlySet<string> = new Set<string>([]);

export function directionFor(locale: ContentLocale): 'ltr' | 'rtl' {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}

/** Tags for hreflang and Open Graph. */
export const localeTags: Record<ContentLocale, { hreflang: string; openGraph: string }> = {
  de: { hreflang: 'de', openGraph: 'de_DE' },
  en: { hreflang: 'en', openGraph: 'en_GB' },
};
