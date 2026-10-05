import { getCode, getData } from 'country-list';

import { CASA_LEVEL_SEQUENCE, type CasaLevel } from '@/config/calculator/pricing';

/**
 * The typed-value boundary.
 *
 * Everything the public site sends arrives as text. These functions turn that
 * text into the typed value the schema wants — or return `null`, in which case
 * the caller keeps the raw text and raises a flag. They never guess:
 * docs/FILEMAKER_LESSONS.md §2.4 and §4.4 are what fifteen years of guessing
 * looks like. A `null` here is a question for a person, not a defect.
 */

/** Lower-cased, trimmed, Unicode-normalised. What duplicate detection compares. */
export function normalizeEmail(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase();
}

/**
 * Digits and a leading `+` only; `00` becomes `+`.
 *
 * No country is inferred for a number without a prefix. A Turkish learner
 * typing a local number from home is not in Germany, and prepending +49 would
 * be exactly the kind of silent correction §11 forbids. Two numbers that differ
 * only in formatting still compare equal, which is what this is for.
 */
export function normalizePhone(value: string): string {
  const compact = value.normalize('NFKC').replace(/[^\d+]/g, '');
  const plusOnce = compact.replace(/(?!^)\+/g, '');
  return plusOnce.startsWith('00') ? `+${plusOnce.slice(2)}` : plusOnce;
}

/**
 * Name → ISO 3166-1 alpha-2, using the same list the public form draws from.
 *
 * Since 2026-10-05 the form's CountryField sends the country as the page's
 * language names it ("Deutschland" on the German form, "South Korea" on the
 * English one), so the display-name lookups at the end are the normal path.
 * The `country-list` spellings ("United Arab Emirates (the)"), which the form
 * sent before, and a bare code still resolve, for older records and for staff
 * typing a country by hand. Anything else — a demonym, a typo, a region — is
 * `null`, kept raw, and flagged `nationality_unmatched`.
 */
export function countryCodeFromName(value: string | null | undefined): string | null {
  const text = (value ?? '').normalize('NFKC').trim();
  if (!text) return null;

  if (/^[A-Za-z]{2}$/.test(text)) {
    const code = text.toUpperCase();
    return getData().some((c) => c.code === code) ? code : null;
  }

  const exact = getCode(text);
  if (exact) return exact;

  const lower = text.toLowerCase();
  const insensitive = getData().find((c) => c.name.toLowerCase() === lower);
  if (insensitive) return insensitive.code;

  return displayNames('de').get(lower) ?? displayNames('en').get(lower) ?? null;
}

const displayIndexes = new Map<'de' | 'en', Map<string, string>>();

/** Lower-cased region name → code, as Intl names regions in a language: what the form lists on that page. */
function displayNames(locale: 'de' | 'en'): Map<string, string> {
  const cached = displayIndexes.get(locale);
  if (cached) return cached;
  const names = new Intl.DisplayNames([locale], { type: 'region' });
  const index = new Map(getData().map((c) => [String(names.of(c.code) ?? '').toLowerCase(), c.code] as const));
  displayIndexes.set(locale, index);
  return index;
}

const LEVELS = new Set<string>(CASA_LEVEL_SEQUENCE);

/** A CASA level code, or null. Trims and upper-cases; nothing else is tolerated. */
export function levelCodeFrom(value: string | null | undefined): CasaLevel | null {
  const text = (value ?? '').normalize('NFKC').trim().toUpperCase();
  return LEVELS.has(text) ? (text as CasaLevel) : null;
}

/**
 * `YYYY-MM-DD` and a real calendar date, or null. The date picker emits exactly
 * this; anything else (a hand-typed `14.03.1998`, a two-digit year) is a flag,
 * not a parse attempt — §2.4 is what optimistic date parsing produced.
 */
export function parseIsoDate(value: string | null | undefined): string | null {
  const text = (value ?? '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const valid =
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  return valid ? text : null;
}

export function displayName(
  first: string | null | undefined,
  last: string | null | undefined
): string {
  return [first, last]
    .map((s) => (s ?? '').trim())
    .filter(Boolean)
    .join(' ');
}
