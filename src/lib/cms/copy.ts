import { cache } from 'react';

import { copyKey, fill } from './copy-key';
import { fillFacts, priceListFacts, type FactValues } from './facts';
import { tagText } from './stega';

/**
 * The site's copy, resolved: `say(locale, 'Deutsch', 'English')`.
 *
 * Returns the live text staff published for that pair, else the default for the
 * language. In the website editor's preview it is the draft, and it carries its
 * slot tag. Synchronous, so it can stand wherever a `locale === 'de' ? … : …`
 * stood.
 *
 * WHERE THE VALUES COME FROM. A server component reads a store that lives for
 * one request (React `cache`), filled by `prepareCopy(locale)` in
 * content.server.ts, which every page and the site layout await before they
 * render. Client components use the same functions from `useSiteCopy()`
 * (components/cms/site-copy-provider.tsx), which reads them from context.
 * Anywhere else — a test, a module evaluated on the client, a server render
 * nobody prepared — the store is empty and `say` returns exactly what the
 * ternary it replaced returned. That is the fallback, and it is the site as
 * committed.
 *
 * LIVE VALUES. `{course.intensive-german.price}` in a text is filled from the
 * facts loaded for the page's language (facts.ts): a price, a lesson count, a
 * next start date read from the database each time, never typed into the text.
 */

export type CopyValues = ReadonlyMap<string, string>;

/** The live values for a language; the price list's alone when nothing loaded more. */
export type FactsFor = (locale: string) => FactValues;

type Store = { editing: boolean; values: CopyValues; facts: Record<string, FactValues>; bound?: ReturnType<typeof resolvers> };

const requestStore = cache((): Store => ({ editing: false, values: new Map(), facts: {} }));

/** Fills this request's store. Called by `prepareCopy`, nothing else. */
export function fillCopyStore(values: CopyValues, editing: boolean, locale: string, facts: FactValues): void {
  const store = requestStore();
  store.values = values;
  store.editing = editing;
  store.facts[locale] = facts;
  store.bound = undefined;
}

function bound() {
  const store = requestStore();
  store.bound ??= resolvers(store.values, store.editing, (locale) => store.facts[locale] ?? priceListFacts(locale));
  return store.bound;
}

export type Say = (locale: string, de: string, en: string, vars?: Record<string, unknown>) => string;
export type Pick = (
  locale: string,
  pair: { de: string; en: string } | null | undefined,
  vars?: Record<string, unknown>
) => string;
export type PickTree = <T>(locale: string, byLocale: { de: T; en: T } & Partial<Record<string, T>>) => T;
/** A value shown but not edited — an amount, a label built in code — with its live values filled in. */
export type WithFacts = (locale: string, text: string) => string;

/** The three resolvers, bound to a set of values. The provider builds the same from context. */
export function resolvers(
  values: CopyValues,
  editing: boolean,
  factsFor: FactsFor = priceListFacts
): { say: Say; pick: Pick; pickTree: PickTree; withFacts: WithFacts } {
  const withFacts: WithFacts = (locale, text) => fillFacts(text, factsFor(locale));

  const say: Say = (locale, de, en, vars) => {
    const key = copyKey(de, en);
    const fallback = locale === 'de' ? de : en;
    const text = fillFacts(fill(values.get(`${key}|${locale}`) ?? fallback, vars), factsFor(locale));
    return editing ? tagText(text, key) : text;
  };

  // A pair that reads the same in both languages — a name, a brand — is shown, not offered.
  const pick: Pick = (locale, pair, vars) =>
    !pair ? '' : pair.de === pair.en ? fillFacts(fill(pair.de, vars), factsFor(locale)) : say(locale, pair.de, pair.en, vars);

  /*
   * A per-language object or list: both defaults are walked side by side and
   * every pair of strings at the same place resolves like `say`. Where the two
   * languages differ in shape, the current language's own value stands.
   * A live value is filled everywhere, in the fields staff do not edit too:
   * an `amount` of `{course.intensive-german.price-4-weeks}` shows the price.
   */
  const pickTree: PickTree = <T,>(locale: string, byLocale: { de: T; en: T } & Partial<Record<string, T>>): T => {
    const own = (byLocale as Record<string, unknown>)[locale] ?? (locale === 'de' ? byLocale.de : byLocale.en);
    const facts = factsFor(locale);
    const fixed = (value: unknown): unknown =>
      typeof value === 'string'
        ? fillFacts(value, facts)
        : Array.isArray(value)
          ? value.map(fixed)
          : value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype
            ? Object.fromEntries(Object.entries(value).map(([name, inner]) => [name, fixed(inner)]))
            : value;
    const walk = (de: unknown, en: unknown, current: unknown): unknown => {
      if (typeof current === 'string') {
        // The same words in both languages — a name, a brand — are not offered for editing.
        return typeof de === 'string' && typeof en === 'string' && de !== en && isText(de, en)
          ? say(locale, de, en)
          : fillFacts(current, facts);
      }
      if (Array.isArray(current)) {
        return current.map((item, index) => {
          const [deItem, enItem] = counterparts(de, en, item, index);
          return walk(deItem, enItem, item);
        });
      }
      if (current && typeof current === 'object') {
        const out: Record<string, unknown> = {};
        for (const [name, value] of Object.entries(current as Record<string, unknown>)) {
          out[name] = SKIP.has(name)
            ? fixed(value)
            : walk((de as Record<string, unknown> | undefined)?.[name], (en as Record<string, unknown> | undefined)?.[name], value);
        }
        return out;
      }
      return current;
    };
    return walk(byLocale.de, byLocale.en, own) as T;
  };

  return { say, pick, pickTree, withFacts };
}

/** The fields that name an item in a list, so the two languages pair by item, not by position. */
const IDENTITY = ['slug', 'id', 'code', 'key'] as const;

/** A language marker inside an id ("faq-de-q1", "narges-intensive-en"): the same item in both lists. */
const LANGUAGE_MARK = /(^|[-_])(?:de|en)(?=[-_]|$)/g;

function identityOf(item: unknown): string | null {
  if (!item || typeof item !== 'object') return null;
  for (const field of IDENTITY) {
    const value = (item as Record<string, unknown>)[field];
    if (typeof value === 'string') return `${field}:${value.replace(LANGUAGE_MARK, '')}`;
    if (typeof value === 'number') return `${field}:${value}`;
  }
  return null;
}

/** The German and English entries for one item of a list. */
export function counterparts(de: unknown, en: unknown, item: unknown, index: number): [unknown, unknown] {
  const deList = Array.isArray(de) ? de : [];
  const enList = Array.isArray(en) ? en : [];
  const id = identityOf(item);
  if (id) return [deList.find((entry) => identityOf(entry) === id), enList.find((entry) => identityOf(entry) === id)];
  return [deList[index], enList[index]];
}

/** Field names that hold ids, addresses or settings, never copy. */
export const SKIP: ReadonlySet<string> = new Set([
  'amount',
  'id',
  'slug',
  'key',
  'href',
  'src',
  'url',
  'icon',
  'image',
  'photo',
  'tone',
  'kind',
  'type',
  'variant',
  'locale',
  'code',
  'level',
  'textbook',
  'objectPosition',
  'objectPositionClassName',
  'aspectRatio',
  'email',
  'phone',
  'meaning',
  'anchor',
  'placeholder',
]);

/** A pair worth editing: words, not a code, a path or a number. */
export function isText(de: string, en: string): boolean {
  // Placeholders are not words: '{value} €' is a format, not copy.
  const sample = (de || en).replace(/\{[^}]*\}/g, '');
  // The same lowercase word in both languages is a code (`katze`, `full`), not copy.
  if (de === en && /^[a-z0-9_-]+$/.test(de)) return false;
  if (!/\p{L}{2,}/u.test(sample)) return false;
  if (/^(\/|https?:|mailto:|tel:|#)/.test(sample)) return false;
  if (/^[\w.-]+@[\w.-]+$/.test(sample)) return false;
  return true;
}

/** For server components: resolves against this request's store, or the defaults. */
export const say: Say = (locale, de, en, vars) => bound().say(locale, de, en, vars);

export const pick: Pick = (locale, pair, vars) => bound().pick(locale, pair, vars);

export const pickTree: PickTree = (locale, byLocale) => bound().pickTree(locale, byLocale);

export const withFacts: WithFacts = (locale, text) => bound().withFacts(locale, text);
