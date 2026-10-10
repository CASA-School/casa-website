import { execFileSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import { COURSE_PAGE_COPY } from '@/config/cms/course-page-copy';
import { courseNarrativesByLocale } from '@/config/content/course-narratives';
import { FOOTER_TEXT_DE } from '@/config/footer-text';
import { EDITOR_PAGES } from '@/config/cms/editor-pages';
import { toInternalPath } from '@/i18n/pathnames';

import { berlinLocalToDate } from '../berlin-time';
import { ALL_COURSE_PAGES, catalog, EVERY_PAGE } from '../catalog';
import { counterparts, resolvers } from '../copy';
import { copyKey, fill, placeholders } from '../copy-key';
import { diffWords } from '../diff';
import { cmsLocales } from '../locales';
import { createPreviewToken, safePreviewPath, verifyPreviewToken } from '../preview-token';
import { encodeKey, hasTag, readTags, stripTags, tagText } from '../stega';

describe('slot tags', () => {
  it('hides a key after a text and reads it back', () => {
    const tagged = tagText('Jetzt anmelden', 'coursePage.cta.register');
    expect(tagged.startsWith('Jetzt anmelden')).toBe(true);
    expect(hasTag(tagged)).toBe(true);
    expect(readTags(tagged)).toEqual({ clean: 'Jetzt anmelden', keys: ['coursePage.cta.register'] });
  });

  it('adds nothing visible: every added character has no width', () => {
    expect(encodeKey('course.intensive-german.levels.levels.3.focus')).toMatch(/^[​‌‍⁠⁣⁤]+$/);
  });

  it('reads several tags in one text node and survives non-ASCII keys', () => {
    const text = `${tagText('Zeitraum', 'a.ü')} – ${tagText('Preis', 'b.€')}`;
    expect(readTags(text)).toEqual({ clean: 'Zeitraum – Preis', keys: ['a.ü', 'b.€'] });
    expect(stripTags(text)).toBe('Zeitraum – Preis');
  });

  it('leaves ordinary text alone', () => {
    expect(hasTag('Deutsch lernen in Bremen')).toBe(false);
    expect(readTags('Deutsch lernen in Bremen')).toEqual({ clean: 'Deutsch lernen in Bremen', keys: [] });
  });
});

describe('copy resolved from its pair', () => {
  const values = new Map([[`${copyKey('Kurse ansehen', 'View courses')}|de`, 'Alle Kurse ansehen']]);
  const live = resolvers(values, false);
  const editing = resolvers(values, true);

  it('returns the edit, else the default the old ternary returned', () => {
    expect(live.say('de', 'Kurse ansehen', 'View courses')).toBe('Alle Kurse ansehen');
    expect(live.say('en', 'Kurse ansehen', 'View courses')).toBe('View courses');
    expect(live.say('tr', 'Kurse ansehen', 'View courses')).toBe('View courses');
    expect(resolvers(new Map(), false).say('de', 'Kurse ansehen', 'View courses')).toBe('Kurse ansehen');
  });

  it('tags the text in the editor and nowhere else', () => {
    expect(hasTag(live.say('de', 'Kurse ansehen', 'View courses'))).toBe(false);
    expect(readTags(editing.say('de', 'Kurse ansehen', 'View courses'))).toEqual({
      clean: 'Alle Kurse ansehen',
      keys: [copyKey('Kurse ansehen', 'View courses')],
    });
  });

  it('fills placeholders after resolving', () => {
    expect(live.say('de', 'Noch {count} Plätze', '{count} places left', { count: 3 })).toBe('Noch 3 Plätze');
    expect(placeholders('Ab {date}, {count} Plätze')).toEqual(['count', 'date']);
    expect(fill('{n} Kurse', { n: 2 })).toBe('2 Kurse');
  });

  it('walks per-language objects and pairs list items by slug, not position', () => {
    const tree = {
      de: { title: 'Kurse', items: [{ slug: 'b', name: 'Abend' }, { slug: 'a', name: 'Intensiv' }], href: '/kurse' },
      en: { title: 'Courses', items: [{ slug: 'a', name: 'Intensive' }, { slug: 'b', name: 'Evening' }], href: '/courses' },
    };
    const out = resolvers(new Map([[`${copyKey('Intensiv', 'Intensive')}|en`, 'Intensive German']]), false).pickTree('en', tree);
    expect(out).toEqual({ title: 'Courses', items: [{ slug: 'a', name: 'Intensive German' }, { slug: 'b', name: 'Evening' }], href: '/courses' });
    expect(counterparts(tree.de.items, tree.en.items, { slug: 'a' }, 0)).toEqual([tree.de.items[1], tree.en.items[0]]);
  });

  it('gives one wording one key, and keys a different translation apart', () => {
    expect(copyKey('Jetzt anmelden', 'Register now')).toBe(copyKey('Jetzt anmelden', 'Register now'));
    expect(copyKey('Jetzt anmelden', 'Register now')).not.toBe(copyKey('Jetzt anmelden', 'Sign up now'));
    expect(copyKey('Jetzt anmelden', 'Register now')).toMatch(/^t\.jetzt-anmelden\.[0-9a-z]+$/);
  });
});

describe('the catalog', () => {
  const slots = [...catalog().values()];

  it('is up to date with the source (npm run cms:extract)', () => {
    expect(() => execFileSync('node', ['scripts/cms/extract-copy.mjs', '--check'], { stdio: 'pipe' })).not.toThrow();
  });

  it('has the course page words in both languages', () => {
    for (const [key, entry] of Object.entries(COURSE_PAGE_COPY)) {
      expect(entry.de, key).toBeTruthy();
      expect(entry.en, key).toBeTruthy();
      expect(catalog().get(key)?.scope).toBe(ALL_COURSE_PAGES);
    }
  });

  it('knows the texts of every page, the menu and the footer', () => {
    const intensive = courseNarrativesByLocale.de.find((entry) => entry.slug === 'intensive-german')!;
    const intensiveEn = courseNarrativesByLocale.en.find((entry) => entry.slug === 'intensive-german')!;
    expect(catalog().has(copyKey(intensive.promise, intensiveEn.promise))).toBe(true);
    expect(catalog().get(copyKey('Kurse', 'Courses'))?.scope).toBe(EVERY_PAGE);
    expect(catalog().get(copyKey(FOOTER_TEXT_DE['All rights reserved.'], 'All rights reserved.'))?.section).toBe('Footer');
    expect(slots.length).toBeGreaterThan(1500);
  });

  it('never makes a price editable as text', () => {
    expect(slots.filter((slot) => /^(ab\s)?\d[\d.,]*\s?€$|^(from\s)?€\s?\d/.test(slot.defaults.de ?? '')).map((slot) => slot.defaults.de)).toEqual([]);
  });

  it('gives every slot a limit its own text fits', () => {
    for (const slot of slots) {
      for (const value of Object.values(slot.defaults)) expect(value!.length, slot.key).toBeLessThanOrEqual(slot.max);
    }
  });

  it('writes German with du (docs/VOICE_AND_TONE.md)', () => {
    // „Sie haben …" in a news report is "they", not the formal address.
    const formal = slots
      .filter((slot) => /\b(Sie|Ihnen|Ihre[mnrs]?)\b/.test((slot.defaults.de ?? '').replace(/Sie haben unter anderem/g, '')))
      .map((slot) => `${slot.key}: ${slot.defaults.de}`);
    expect(formal).toEqual([]);
  });
});

describe('editor pages', () => {
  it('lists only addresses the site routes', () => {
    for (const group of EDITOR_PAGES) {
      for (const page of group.pages) expect(toInternalPath(page.path).locale, page.path).toBe('de');
    }
  });
});

describe('languages', () => {
  it('writes the routed languages first, German as the source, and prepares more', () => {
    const locales = cmsLocales('tr, ar, de, xx-invalid-');
    expect(locales.map((locale) => [locale.code, locale.routed, locale.source, locale.dir])).toEqual([
      ['de', true, true, 'ltr'],
      ['en', true, false, 'ltr'],
      ['tr', false, false, 'ltr'],
      ['ar', false, false, 'rtl'],
    ]);
    expect(locales[0].label).toBe('Deutsch');
  });
});

describe('preview tokens', () => {
  it('opens draft mode for ten minutes and refuses a changed token', () => {
    const now = Date.UTC(2026, 9, 10, 12);
    const token = createPreviewToken('staff-1', now);
    expect(verifyPreviewToken(token, now + 9 * 60_000)).toBe(true);
    expect(verifyPreviewToken(token, now + 11 * 60_000)).toBe(false);
    expect(verifyPreviewToken(`${token}x`, now)).toBe(false);
    expect(verifyPreviewToken(token.replace(/^./, (c) => (c === 'a' ? 'b' : 'a')), now)).toBe(false);
    expect(verifyPreviewToken(null, now)).toBe(false);
  });

  it('keeps the redirect on this site and out of the workspace', () => {
    expect(safePreviewPath('/sprachkurse/deutsch-intensiv')).toBe('/sprachkurse/deutsch-intensiv');
    expect(safePreviewPath('//evil.example')).toBe('/');
    expect(safePreviewPath('https://evil.example')).toBe('/');
    expect(safePreviewPath('/admin/team')).toBe('/');
    expect(safePreviewPath('/\\evil.example')).toBe('/');
  });
});

describe('scheduling in Bremen time', () => {
  it('reads wall-clock time across winter and summer', () => {
    expect(berlinLocalToDate('2027-01-01T00:00')?.toISOString()).toBe('2026-12-31T23:00:00.000Z');
    expect(berlinLocalToDate('2027-07-01T09:30')?.toISOString()).toBe('2027-07-01T07:30:00.000Z');
    expect(berlinLocalToDate('tomorrow')).toBeNull();
  });
});

describe('word diff', () => {
  it('marks what was removed and added', () => {
    expect(diffWords('ab 476 € im Trimester', 'ab 378 € im Trimester')).toEqual([
      { text: 'ab', kind: 'same' },
      { text: '476', kind: 'removed' },
      { text: '378', kind: 'added' },
      { text: '€ im Trimester', kind: 'same' },
    ]);
  });
});
