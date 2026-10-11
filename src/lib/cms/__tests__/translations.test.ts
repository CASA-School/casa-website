import { describe, expect, it } from 'vitest';

import ar from '@/config/cms/translations/ar.json';
import es from '@/config/cms/translations/es.json';
import itFile from '@/config/cms/translations/it.json';
import ru from '@/config/cms/translations/ru.json';
import tr from '@/config/cms/translations/tr.json';
import uk from '@/config/cms/translations/uk.json';
import { PREPARED_LOCALES } from '@/config/cms/translation-locales';

import { catalog } from '../catalog';
import { placeholders } from '../copy-key';
import { cmsLocales } from '../locales';
import type { TranslationFile } from '../translations';

/*
 * The prepared languages (docs/TRANSLATIONS.md). A stored translation whose
 * text has left the site is ignored here, not failed: a German edit in the code
 * must not wait for the next translation run, which drops it.
 */
const FILES: Record<string, TranslationFile> = { ar, es, it: itFile, ru, tr, uk };
const SCRIPT: Record<string, RegExp> = { ar: /[؀-ۿ]/, ru: /[Ѐ-ӿ]/, uk: /[Ѐ-ӿ]/ };

describe('prepared languages', () => {
  const slots = catalog();

  it('has a file for each, and the editor writes each', () => {
    expect(Object.keys(FILES).sort()).toEqual([...PREPARED_LOCALES].sort());
    const codes = cmsLocales('').map((locale) => locale.code);
    for (const code of PREPARED_LOCALES) expect(codes).toContain(code);
    expect(cmsLocales('').find((locale) => locale.code === 'ar')?.dir).toBe('rtl');
  });

  for (const [code, file] of Object.entries(FILES)) {
    it(`${code}: every stored text keeps its placeholders, is written in the language and was made from today's German`, () => {
      for (const [key, entry] of Object.entries(file)) {
        const slot = slots.get(key);
        if (!slot) continue;
        expect(entry.de, `${code} ${key}`).toBe(slot.defaults.de);
        expect(entry.text.trim().length, `${code} ${key}`).toBeGreaterThan(0);
        expect(placeholders(entry.text), `${code} ${key}`).toEqual(placeholders(slot.defaults.de ?? ''));
        const words = entry.text.replace(/\{[^}]*\}/g, '');
        if (SCRIPT[code] && /\p{L}{2,}/u.test(words) && entry.text !== slot.defaults.de && entry.text !== slot.defaults.en) {
          expect(SCRIPT[code].test(words), `${code} ${key}: ${entry.text}`).toBe(true);
        }
      }
    });
  }

  it('gives the editor each translation as that language’s default', () => {
    const [key, entry] = Object.entries(FILES.tr).find(([candidate]) => slots.has(candidate)) ?? [];
    if (!key || !entry) return;
    expect(slots.get(key)?.defaults.tr).toBe(entry.text);
  });
});
