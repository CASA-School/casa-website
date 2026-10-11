import ar from '@/config/cms/translations/ar.json';
import es from '@/config/cms/translations/es.json';
import it from '@/config/cms/translations/it.json';
import ru from '@/config/cms/translations/ru.json';
import tr from '@/config/cms/translations/tr.json';
import uk from '@/config/cms/translations/uk.json';

/**
 * The prepared languages' texts (src/config/cms/translation-locales.ts).
 *
 * Each file maps a slot key to its translation and the German it was made
 * from. A key is made from the German and English defaults (copy-key.ts), so
 * when the German in the code changes, the key changes and the old translation
 * simply stops matching: `npm run cms:translations` lists what is missing and
 * docs/TRANSLATIONS.md says how a run fills it. These are the defaults for those
 * languages, as the code's German and English are for theirs; an edit in the
 * website editor overrides them.
 */

export type TranslationEntry = { de: string; text: string };
export type TranslationFile = Record<string, TranslationEntry>;

const FILES: Record<string, TranslationFile> = { tr, ar, es, it, ru, uk };

/** A slot's translations, by language. */
export function translationsFor(key: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [code, file] of Object.entries(FILES)) {
    const entry = file[key];
    if (entry?.text) out[code] = entry.text;
  }
  return out;
}

/** One language's texts as `key|locale` values, the shape the copy store reads. */
export function translationValues(locale: string): Map<string, string> {
  const file = FILES[locale];
  const values = new Map<string, string>();
  if (!file) return values;
  for (const [key, entry] of Object.entries(file)) if (entry.text) values.set(`${key}|${locale}`, entry.text);
  return values;
}
