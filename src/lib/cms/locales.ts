import { defaultLocale, locales } from '@/i18n/routing';

/**
 * The languages the website editor writes.
 *
 * Every language the public site serves (`src/i18n/routing.ts`), plus any in
 * `CMS_EXTRA_LOCALES` (comma-separated codes, e.g. `tr,ar`): languages being
 * prepared before they are routed. Their texts are written and translated in the
 * editor long before a page renders them, so adding a language to the site is a
 * routing change on top of finished copy. German is the source every other
 * language is translated from and checked against.
 */

export type CmsLocale = {
  code: string;
  /** The language's own name for itself: Deutsch, English, Türkçe, العربية. */
  label: string;
  /** Served by the public site today, so the preview can show it. */
  routed: boolean;
  dir: 'ltr' | 'rtl';
  source: boolean;
};

const RTL = new Set(['ar', 'fa', 'he', 'ur']);
const CODE = /^[a-z]{2,3}(-[A-Z]{2})?$/;

export function nativeName(code: string): string {
  try {
    const name = new Intl.DisplayNames([code], { type: 'language' }).of(code);
    return name ? name.charAt(0).toLocaleUpperCase(code) + name.slice(1) : code;
  } catch {
    return code;
  }
}

export function cmsLocales(extra: string | undefined = process.env.CMS_EXTRA_LOCALES): CmsLocale[] {
  const routed = locales.map((code) => code as string);
  const planned = (extra ?? '')
    .split(',')
    .map((code) => code.trim())
    .filter((code) => CODE.test(code) && !routed.includes(code));

  return [...routed, ...new Set(planned)].map((code) => ({
    code,
    label: nativeName(code),
    routed: routed.includes(code),
    dir: RTL.has(code.split('-')[0]) ? 'rtl' : 'ltr',
    source: code === defaultLocale,
  }));
}

export const SOURCE_LOCALE: string = defaultLocale;
