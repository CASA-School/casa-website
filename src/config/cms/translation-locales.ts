/**
 * The languages prepared for the public site but not routed yet (2026-10-11):
 * every text of the site is translated into them and kept in
 * `src/config/cms/translations/<code>.json`, editable in the website editor,
 * and no visitor sees them until a language is switched on in
 * `src/i18n/routing.ts`. docs/TRANSLATIONS.md has the process and the style
 * rules each language follows.
 */
export const PREPARED_LOCALES = ['tr', 'ar', 'es', 'it', 'ru', 'uk'] as const;

export type PreparedLocale = (typeof PREPARED_LOCALES)[number];
