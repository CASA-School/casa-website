import { describe, expect, it, vi } from 'vitest';

// No database: the live values come from the in-repo fixtures and the price list.
vi.mock('@/lib/db/server', () => ({
  getDb: () => null,
  logDatabaseFallback: vi.fn(),
}));

import copyCatalog from '@/config/cms/copy-catalog.json';

import { resolvers } from '../copy';
import { copyKey, placeholders } from '../copy-key';
import { factsIn, fillFacts, formatDay, formatEuro, isFactName, NO_VALUE, priceListFacts } from '../facts';
import { loadFacts } from '../facts.server';

const nbsp = (text: string) => text.replace(/ /g, ' ');

describe('live values', () => {
  it('fills a named value and leaves the page’s own placeholders alone', () => {
    const facts = { 'course.intensive-german.lessons': '20' };
    expect(fillFacts('{course.intensive-german.lessons} UE für {name}', facts)).toBe('20 UE für {name}');
    expect(factsIn('{a.b} und {count} und {a.b} und {c.d-e}')).toEqual(['a.b', 'c.d-e']);
    expect(isFactName('count')).toBe(false);
    expect(isFactName('course.evening-german.price')).toBe(true);
    expect(placeholders('{count} · {course.evening-german.price}')).toEqual(['count', 'course.evening-german.price']);
  });

  it('never shows a raw {…} when a value has nothing behind it', () => {
    expect(fillFacts('Nächster Start: {course.medical-german.next-start}', {})).toBe(`Nächster Start: ${NO_VALUE}`);
  });

  it('writes amounts and days the way each language does', () => {
    expect(formatEuro(580, 'de')).toBe(nbsp('580 €'));
    expect(formatEuro(580, 'en')).toBe('€580');
    expect(formatEuro(117.5, 'de')).toBe(nbsp('117,50 €'));
    expect(formatDay('2026-11-02', 'de')).toBe('2. November 2026');
    expect(formatDay('2026-11-02', 'en')).toBe('2 November 2026');
  });

  it('knows the price list without a database', () => {
    expect(priceListFacts('de')['accommodation.rent-4-weeks']).toBe(nbsp('580 €'));
    expect(priceListFacts('en')['course.intensive-german.price-8-weeks']).toBe('€940');
  });
});

describe('live values in the resolvers', () => {
  const facts = { de: { 'course.evening-german.price': `ab ${nbsp('378 €')}` }, en: { 'course.evening-german.price': 'from €378' } };
  const { say, pick, pickTree, withFacts } = resolvers(new Map(), false, (locale) => facts[locale as 'de' | 'en']);

  it('fills them in say, pick, pickTree and withFacts, per language', () => {
    expect(say('de', 'Abendkurs: {course.evening-german.price}', 'Evening course: {course.evening-german.price}')).toBe(`Abendkurs: ab ${nbsp('378 €')}`);
    expect(say('en', 'Abendkurs: {course.evening-german.price}', 'Evening course: {course.evening-german.price}')).toBe('Evening course: from €378');
    // The same in both languages is not offered for editing, but it is filled.
    expect(pick('en', { de: '{course.evening-german.price}', en: '{course.evening-german.price}' })).toBe('from €378');
    expect(withFacts('de', '{course.evening-german.price}')).toBe(`ab ${nbsp('378 €')}`);
  });

  it('fills an amount pickTree does not offer for editing', () => {
    const tree = pickTree('de', {
      de: { label: 'Kursgebühr', amount: '{course.evening-german.price}' },
      en: { label: 'Course fee', amount: '{course.evening-german.price}' },
    });
    expect(tree).toEqual({ label: 'Kursgebühr', amount: `ab ${nbsp('378 €')}` });
  });

  it('fills the values an edited text names', () => {
    const de = 'Abendkurs: {course.evening-german.price}';
    const en = 'Evening course: {course.evening-german.price}';
    const edited = resolvers(
      new Map([[`${copyKey(de, en)}|de`, 'Ab jetzt {course.evening-german.price} pro Trimester']]),
      false,
      (locale) => facts[locale as 'de' | 'en']
    );
    expect(edited.say('de', de, en)).toBe(`Ab jetzt ab ${nbsp('378 €')} pro Trimester`);
  });
});

describe('the site’s live values', () => {
  it('reads courses, exams and prices in both languages, from the fixtures without a database', async () => {
    const [de, en] = await Promise.all([loadFacts('de'), loadFacts('en')]);
    expect(de.values['course.intensive-german.lessons']).toBe('20');
    expect(de.values['course.evening-german.price']).toBe(`ab ${nbsp('378 €')}`);
    expect(en.values['course.evening-german.price']).toBe('from €378');
    expect(de.values['exam.telc_b2.fee']).toBe(nbsp('190 €'));
    expect(de.defs.map((def) => def.id)).toEqual(en.defs.map((def) => def.id));
  });

  /*
   * A default text that names a value the site does not have would show "–" to
   * every visitor. Every one the catalog holds must exist.
   */
  it('has every value the site’s texts name', async () => {
    const known = new Set((await loadFacts('de')).defs.map((def) => def.id));
    const named = Object.values(copyCatalog as Record<string, { de: string; en: string }>).flatMap((entry) => [
      ...factsIn(entry.de),
      ...factsIn(entry.en),
    ]);
    expect(named.length).toBeGreaterThan(10);
    expect(named.filter((id) => !known.has(id))).toEqual([]);
  });
});
