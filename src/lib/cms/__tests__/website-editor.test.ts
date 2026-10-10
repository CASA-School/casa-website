import { describe, expect, it } from 'vitest';

import { COURSE_PAGE_COPY } from '@/config/cms/course-page-copy';
import { EDITOR_PAGES } from '@/config/cms/editor-pages';
import { toInternalPath } from '@/i18n/pathnames';

import { berlinLocalToDate } from '../berlin-time';
import { ALL_COURSE_PAGES, catalog, COURSE_PAGE_NAMES } from '../catalog';
import { diffWords } from '../diff';
import { cmsLocales } from '../locales';
import { flattenTree, overlayTree, type FieldSpec } from '../overlay';
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

describe('content trees', () => {
  const fields: FieldSpec[] = [
    { path: 'title', label: 'Heading', kind: 'heading' },
    { path: 'levels.*.focus', label: ({ parent }) => `Level ${String(parent.level)}`, kind: 'card-text' },
    { path: 'fees.*.amount', label: 'Amount', kind: 'label', data: 'Prices' },
  ];
  const tree = {
    title: 'Lernziele',
    levels: [
      { level: 'A1', textbook: 'netzwerk', focus: 'Du stellst dich vor.' },
      { level: 'B2', textbook: 'kontext', focus: 'Du diskutierst.' },
    ],
    fees: [{ label: '4 Wochen', amount: '520 €' }],
  };

  it('names only the leaves a field names, with labels from their siblings', () => {
    expect(flattenTree(tree, 'course.x.levels', fields).map((leaf) => [leaf.key, leaf.label])).toEqual([
      ['course.x.levels.title', 'Heading'],
      ['course.x.levels.levels.0.focus', 'Level A1'],
      ['course.x.levels.levels.1.focus', 'Level B2'],
      ['course.x.levels.fees.0.amount', 'Amount'],
    ]);
  });

  it('replaces editable leaves and keeps codes, ids and the shape', () => {
    const out = overlayTree(tree, 'course.x.levels', fields, (key, value) => (key.endsWith('1.focus') ? 'Neu' : value));
    expect(out.levels[1]).toEqual({ level: 'B2', textbook: 'kontext', focus: 'Neu' });
    expect(out.levels[0].textbook).toBe('netzwerk');
    expect(out.fees[0].label).toBe('4 Wochen');
    expect(tree.levels[1].focus).toBe('Du diskutierst.');
  });

  it('passes a missing section through, so the page keeps its fallback', () => {
    expect(overlayTree(null, 'p', fields, () => 'x')).toBeNull();
    expect(overlayTree(undefined, 'p', fields, () => 'x')).toBeUndefined();
  });
});

describe('the catalog', () => {
  const slots = [...catalog().values()];

  it('has the course page words in both languages', () => {
    for (const [key, entry] of Object.entries(COURSE_PAGE_COPY)) {
      expect(entry.de, key).toBeTruthy();
      expect(entry.en, key).toBeTruthy();
      expect(catalog().get(key)?.scope).toBe(ALL_COURSE_PAGES);
    }
  });

  it('connects every part of the intensive course page', () => {
    const intensive = slots.filter((slot) => slot.key.startsWith('course.intensive-german.')).map((slot) => slot.key);
    expect(intensive).toEqual(
      expect.arrayContaining([
        'course.intensive-german.narrative.promise',
        'course.intensive-german.audience.title',
        'course.intensive-german.audience.bullets.0',
        'course.intensive-german.levels.levels.0.focus',
        'course.intensive-german.practical.conditions.0',
      ])
    );
    expect(catalog().get('course.intensive-german.narrative.promise')?.scope).toBe(COURSE_PAGE_NAMES['intensive-german']);
  });

  it('never makes a price editable as text', () => {
    expect(slots.some((slot) => slot.key.includes('.fees.') && slot.key.endsWith('.amount'))).toBe(false);
  });

  it('gives every slot a limit its own text fits', () => {
    for (const slot of slots) {
      for (const value of Object.values(slot.defaults)) expect(value!.length, slot.key).toBeLessThanOrEqual(slot.max);
    }
  });

  it('writes German with du (docs/VOICE_AND_TONE.md)', () => {
    const formal = slots.filter((slot) => /\b(Sie|Ihnen|Ihre[mnrs]?)\b/.test(slot.defaults.de ?? '')).map((slot) => slot.key);
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
