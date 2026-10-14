/**
 * The workspace in two languages: German by default, English on request
 * (Rahman, 2026-10-14). docs/ADMIN_I18N.md has the rules and the glossary.
 *
 * Every text is written once in both languages, German first, beside the code
 * that shows it — `t('Anfragen', 'Enquiries')` — as the public site's `say()`
 * does. Server code gets `t` from `getI18n()` (i18n.server.ts), client code from
 * `useWsLang()` (components/admin/lang.tsx). A label kept in a table is a
 * `Bilingual` and is read with `pick()`.
 *
 * No server imports here: client components use these helpers too.
 */

export type WsLang = 'de' | 'en';

export const WS_LANGS: readonly WsLang[] = ['de', 'en'];

export const isWsLang = (value: unknown): value is WsLang => value === 'de' || value === 'en';

/** Remembers the choice in this browser — the sign-in page has no account to read it from. */
export const LANG_COOKIE = 'casa_ws_lang';

export type T = (de: string, en: string) => string;

export const translator =
  (lang: WsLang): T =>
  (de, en) =>
    lang === 'en' ? en : de;

/** A label kept in a table: both languages, read with `pick`. */
export type Bilingual = { de: string; en: string };

export const pick = (lang: WsLang, text: Bilingual): string => text[lang];

/** The locale for `Intl` and `toLocaleDateString`. */
export const wsLocale = (lang: WsLang) => (lang === 'en' ? 'en-GB' : 'de-DE');

export const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const MONTHS: Record<WsLang, readonly string[]> = {
  de: ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'],
};

/** A month's short name, 1 to 12. */
export const monthShort = (lang: WsLang, month: number) => MONTHS[lang][month - 1];

/**
 * A span of days, the year once and only when it is not this one:
 * "11–24 Apr 2027", "26 Oct 2026 – 30 Apr 2027"; in German "11.–24. Apr. 2027",
 * "26. Okt. 2026 – 30. Apr. 2027". One day is one date: "14 Oct", "14. Okt.".
 */
export function dayRange(from: string, to: string, lang: WsLang, thisYear = new Date().getFullYear()): string {
  const [ay, am, ad] = from.split('-').map(Number);
  const [by, bm, bd] = to.split('-').map(Number);
  const year = (y: number) => (y === thisYear ? '' : ` ${y}`);
  const M = (m: number) => monthShort(lang, m);
  if (lang === 'de') {
    if (from === to) return `${ad}. ${M(am)}${year(ay)}`;
    if (ay === by && am === bm) return `${ad}.–${bd}. ${M(bm)}${year(by)}`;
    if (ay === by) return `${ad}. ${M(am)} – ${bd}. ${M(bm)}${year(by)}`;
    return `${ad}. ${M(am)} ${ay} – ${bd}. ${M(bm)} ${by}`;
  }
  if (from === to) return `${ad} ${M(am)}${year(ay)}`;
  if (ay === by && am === bm) return `${ad}–${bd} ${M(bm)}${year(by)}`;
  if (ay === by) return `${ad} ${M(am)} – ${bd} ${M(bm)}${year(by)}`;
  return `${ad} ${M(am)} ${ay} – ${bd} ${M(bm)} ${by}`;
}

/** "3 days ago" / "vor 3 Tagen", lower case; `capitalise` it at the start of a sentence. Server time. */
export function relativeDays(value: Date | string, lang: WsLang): string {
  const date = value instanceof Date ? value : new Date(value);
  const midnight = (d: Date) => new Date(d).setHours(0, 0, 0, 0);
  const days = Math.round((midnight(new Date()) - midnight(date)) / 86_400_000);
  const weeks = Math.round(days / 7);
  const months = Math.round(days / 30);

  if (lang === 'de') {
    if (days <= 0) return 'heute';
    if (days === 1) return 'gestern';
    if (days < 7) return `vor ${days} Tagen`;
    if (days < 14) return 'letzte Woche';
    if (days < 60) return `vor ${weeks} Wochen`;
    return `vor ${months} Monaten`;
  }
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  if (days < 60) return `${weeks} weeks ago`;
  return `${months} months ago`;
}

/** A whole number as the language writes it: "1,234" / "1.234". */
export const num = (lang: WsLang, n: number) => n.toLocaleString(wsLocale(lang));

/** The number and the word that fits it: `counted(lang, n, t('Anfrage', 'enquiry'), t('Anfragen', 'enquiries'))`. */
export const counted = (lang: WsLang, n: number, one: string, many: string) => `${num(lang, n)} ${n === 1 ? one : many}`;
