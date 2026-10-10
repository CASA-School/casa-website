/**
 * Keys made from the text itself.
 *
 * Most of the site's copy is a German and an English default written side by
 * side — inline, in a `{ de, en }` pair, or in a per-language object. Rather
 * than name all of them by hand, a text's key is derived from its two defaults:
 * a short readable slug of the German and a hash of both. The same pair gives
 * the same key wherever it appears, so the extraction script
 * (scripts/cms/extract-copy.mjs) and the page agree without either knowing the
 * other, and one wording used in three places is one slot staff change once.
 *
 * If a developer rewrites the default in the code, the key changes with it and
 * any old edit stops applying: the code now says something else on purpose.
 *
 * `{name}` in a text is a placeholder for a value the page fills in (a count, a
 * date). An edit must keep the same placeholders.
 */

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function slug(text: string): string {
  return (
    text
      .toLocaleLowerCase('de')
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/\{[^}]*\}/g, ' ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .split('-')
      .slice(0, 4)
      .join('-')
      .slice(0, 32) || 'text'
  );
}

const memo = new Map<string, string>();

export function copyKey(de: string, en: string): string {
  const id = `${de}\u0001${en}`;
  let key = memo.get(id);
  if (!key) {
    key = `t.${slug(de)}.${fnv1a(id)}`;
    memo.set(id, key);
  }
  return key;
}

export const isCopyKey = (key: string) => key.startsWith('t.');

const PLACEHOLDER = /\{([a-zA-Z][\w]*)\}/g;

/** The placeholders a text uses, sorted, e.g. `['count', 'date']`. */
export function placeholders(text: string): string[] {
  return [...new Set([...text.matchAll(PLACEHOLDER)].map((match) => match[1]))].sort();
}

export function fill(text: string, vars?: Record<string, unknown>): string {
  if (!vars) return text;
  return text.replace(PLACEHOLDER, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}
