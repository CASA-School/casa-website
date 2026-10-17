import type { Bilingual } from '@/lib/admin/i18n';
import { DEFAULT_PUBLISHED_PRICES, type PublishedPrices } from '@/lib/content/published-prices';

/**
 * Live values: facts a text may name instead of stating.
 *
 * "Mit {course.intensive-german.lessons} Unterrichtseinheiten pro Woche …" reads
 * the weekly hours from the database each time the page renders, so a text
 * never goes stale when a price, a start date or an exam day changes. Staff
 * place these values in the website editor; they cannot type over them. The
 * database's values come from facts.server.ts; this module holds what both
 * sides share, and the price list's values, which need no database.
 *
 * A live value's name has a dot in it; a placeholder the page fills itself
 * (`{count}`) does not.
 */

export type FactSource = 'Course dates' | 'Course types' | 'Prices' | 'Exam dates';

export type FactDef = {
  id: string;
  /** Who it belongs to, as staff call it: „Intensivkurse", „telc Deutsch B2". */
  group: string;
  /** What it is: „Nächster Beginn“ / "Next start". Shown in the website editor only, in the workspace's language. */
  label: Bilingual;
  source: FactSource;
};

export type FactValues = Record<string, string>;

export const isFactName = (name: string) => name.includes('.');

/**
 * What a live value with nothing behind it shows — a course with no term
 * scheduled has no next start. Never the raw `{…}`, which no visitor should see.
 */
export const NO_VALUE = '–';

const FACT = /\{([a-zA-Z][\w-]*(?:\.[\w-]+)+)\}/g;

/** `text` with every live value filled in from `facts`. */
export function fillFacts(text: string, facts: FactValues): string {
  return text.includes('{') ? text.replace(FACT, (_, name: string) => facts[name] ?? NO_VALUE) : text;
}

/** The live values a text names, in order of first use. */
export function factsIn(text: string): string[] {
  return [...new Set([...text.matchAll(FACT)].map((match) => match[1]))];
}

/** Each language's own number and date format; Arabic keeps the Western digits the texts use. */
const NUMBERS: Record<string, string> = {
  de: 'de-DE',
  en: 'en-IE',
  tr: 'tr-TR',
  ar: 'ar-u-nu-latn',
  es: 'es-ES',
  it: 'it-IT',
  ru: 'ru-RU',
  uk: 'uk-UA',
};
const DATES: Record<string, string> = { ...NUMBERS, en: 'en-GB' };

/** The Intl locale a page uses for its dates and numbers: German, British English, or the previewed language's own. */
export const intlTagFor = (code: string): string => DATES[code] ?? 'en-GB';

/** German pages write the amount first: "580 €"; English: "€580" (go-live brief 2026-10-01). */
export function formatEuro(amount: number, locale: string): string {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat(NUMBERS[locale] ?? 'en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
}

export function formatDay(iso: string, locale: string): string {
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return new Intl.DateTimeFormat(DATES[locale] ?? 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  }).format(date);
}

/**
 * "ab 520 €" and "Auf Anfrage" in every language, for a course's price as a live
 * value. Not through `say`: a live value is filled into other texts and must carry
 * no editor tag (course-pricing.ts says the same words on the page, editably).
 * Keep them the same as the stored translations of "ab {amount}" and "Auf Anfrage".
 */
export const PRICE_WORDS: Record<string, { from: (amount: string) => string; onRequest: string }> = {
  de: { from: (amount) => `ab ${amount}`, onRequest: 'Auf Anfrage' },
  en: { from: (amount) => `from ${amount}`, onRequest: 'On request' },
  // Turkish adds no suffix to the price: the right one depends on how the number is read aloud.
  tr: { from: (amount) => `başlangıç fiyatı ${amount}`, onRequest: 'Talep üzerine' },
  ar: { from: (amount) => `ابتداءً من ${amount}`, onRequest: 'عند الطلب' },
  es: { from: (amount) => `desde ${amount}`, onRequest: 'Previa consulta' },
  it: { from: (amount) => `da ${amount}`, onRequest: 'Su richiesta' },
  ru: { from: (amount) => `от ${amount}`, onRequest: 'По запросу' },
  uk: { from: (amount) => `від ${amount}`, onRequest: 'За запитом' },
};

/** The course pages' German names, which is what staff call them. */
export const COURSE_GROUPS: Record<string, string> = {
  'intensive-german': 'Intensivkurse',
  'evening-german': 'Abendkurse',
  'special-courses': 'Spezialkurse',
  'medical-german': 'Deutsch für Pflege und Medizin',
  bildungszeit: 'Bildungszeit',
  'in-company': 'Firmenunterricht',
  'german-for-groups': 'Deutsch für Gruppen',
  'exam-preparation': 'Prüfungsvorbereitung',
};

const EXAM_GROUPS: Record<string, string> = {
  telc_b2: 'telc Deutsch B2',
  telc_c1_hochschule: 'telc Deutsch C1 Hochschule',
};

/**
 * The prices a text can name: the price list in force (the Prices screen), as
 * the website publishes it (src/lib/content/published-prices.ts) — the
 * published figures without a database, so also in tests.
 */
function priceList(p: PublishedPrices): { def: FactDef; amount: number }[] {
  const b2 = EXAM_GROUPS.telc_b2;
  const c1 = EXAM_GROUPS.telc_c1_hochschule;
  return [
    { def: { id: 'course.intensive-german.price-4-weeks', group: COURSE_GROUPS['intensive-german'], label: { de: 'Preis für 4 Wochen', en: 'Price for 4 weeks' }, source: 'Prices' }, amount: p.intensive4Weeks },
    { def: { id: 'course.intensive-german.price-8-weeks', group: COURSE_GROUPS['intensive-german'], label: { de: 'Preis für 8 Wochen', en: 'Price for 8 weeks' }, source: 'Prices' }, amount: p.intensive8Weeks },
    { def: { id: 'course.special-courses.price-per-module', group: COURSE_GROUPS['special-courses'], label: { de: 'Preis eines Moduls', en: 'Price of a module' }, source: 'Prices' }, amount: p.specialModule },
    { def: { id: 'course.special-courses.price-per-evening', group: COURSE_GROUPS['special-courses'], label: { de: 'Preis pro Abend', en: 'Price per evening' }, source: 'Prices' }, amount: p.specialPerEvening },
    { def: { id: 'course.enrolment-fee', group: 'Alle Kurse', label: { de: 'Einschreibegebühr', en: 'Enrolment fee' }, source: 'Prices' }, amount: p.enrolmentFee },
    { def: { id: 'exam.telc_b2.preparation-price', group: b2, label: { de: 'Vorbereitungskurs', en: 'Preparation course' }, source: 'Prices' }, amount: p.exams.telc_b2.prep },
    { def: { id: 'exam.telc_b2.part-fee', group: b2, label: { de: 'Gebühr für einen Teil', en: 'Fee for one part' }, source: 'Prices' }, amount: p.exams.telc_b2.part },
    { def: { id: 'exam.telc_c1_hochschule.preparation-price', group: c1, label: { de: 'Vorbereitungskurs', en: 'Preparation course' }, source: 'Prices' }, amount: p.exams.telc_c1_hochschule.prep },
    { def: { id: 'exam.telc_c1_hochschule.part-fee', group: c1, label: { de: 'Gebühr für einen Teil', en: 'Fee for one part' }, source: 'Prices' }, amount: p.exams.telc_c1_hochschule.part },
    { def: { id: 'accommodation.rent-4-weeks', group: 'Unterkunft', label: { de: 'Miete für 4 Wochen', en: 'Rent for 4 weeks' }, source: 'Prices' }, amount: p.rent4Weeks },
    { def: { id: 'accommodation.extra-week', group: 'Unterkunft', label: { de: 'Jede weitere Woche', en: 'Each further week' }, source: 'Prices' }, amount: p.rentExtraWeek },
    { def: { id: 'accommodation.booking-fee', group: 'Unterkunft', label: { de: 'Vermittlungsgebühr', en: 'Booking fee' }, source: 'Prices' }, amount: p.placementFee },
    { def: { id: 'accommodation.deposit', group: 'Unterkunft', label: { de: 'Kaution', en: 'Deposit' }, source: 'Prices' }, amount: p.deposit },
  ];
}

export const PRICE_LIST_DEFS: FactDef[] = priceList(DEFAULT_PUBLISHED_PRICES).map((entry) => entry.def);

const priceListCache = new Map<string, FactValues>();

/** The price list's live values for a language; the published figures unless the prices in force are passed. */
export function priceListFacts(locale: string, prices: PublishedPrices = DEFAULT_PUBLISHED_PRICES): FactValues {
  const values = () => Object.fromEntries(priceList(prices).map(({ def, amount }) => [def.id, formatEuro(amount, locale)]));
  if (prices !== DEFAULT_PUBLISHED_PRICES) return values();
  let cached = priceListCache.get(locale);
  if (!cached) priceListCache.set(locale, (cached = values()));
  return cached;
}

export const examGroup = (code: string, name: string) => EXAM_GROUPS[code] ?? name;
