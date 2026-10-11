import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/server', () => ({ getDb: () => null, logDatabaseFallback: vi.fn() }));
vi.mock('next/headers', () => ({ draftMode: async () => ({ isEnabled: false }), cookies: async () => ({ get: () => undefined }) }));

import { overlayLanguage } from '../content.server';
import { isPreparedLocale } from '../preview-language.server';

describe('the editor preview of a prepared language', () => {
  it('lets the language’s texts, then its edits, stand in the route’s language', () => {
    const values = new Map([
      ['t.a|en', 'English edit'],
      ['t.b|tr', 'Türkçe düzenleme'],
      ['t.c|de', 'Deutsch'],
    ]);
    const translations = new Map([
      ['t.a|tr', 'Türkçe A'],
      ['t.b|tr', 'Türkçe B'],
    ]);
    const out = overlayLanguage(values, translations, 'tr', 'en');
    expect(out.get('t.a|en')).toBe('Türkçe A');
    // An edit in the language wins over its repository translation.
    expect(out.get('t.b|en')).toBe('Türkçe düzenleme');
    expect(out.get('t.c|de')).toBe('Deutsch');
    // The cached values are not changed.
    expect(values.get('t.a|en')).toBe('English edit');
  });

  it('knows only the prepared languages', () => {
    expect(isPreparedLocale('ar')).toBe(true);
    expect(isPreparedLocale('de')).toBe(false);
    expect(isPreparedLocale('fr')).toBe(false);
    expect(isPreparedLocale(undefined)).toBe(false);
  });
});
