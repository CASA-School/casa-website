import { describe, expect, it } from 'vitest';

import { KnowledgeIndex, snippet, type KnowledgeDoc } from '../engine';
import { extractPage } from '../html';
import { editDistance, fold, stem, terms, words } from '../text';

describe('text', () => {
  it('folds umlauts, ß and typed-out umlauts to one form', () => {
    expect(fold('Prüfung')).toBe('prufung');
    expect(fold('pruefung')).toBe('prufung');
    expect(fold('Gebühren')).toBe(fold('gebuehren'));
    expect(fold('Straße')).toBe('strasse');
    // A vowel before "ue" is not an umlaut spelled out.
    expect(fold('neue')).toBe('neue');
  });

  it('keeps levels, prices and the plus of B1+', () => {
    expect(words('B1+ ab 117,50 €')).toEqual(['b1+', 'ab', '117.50']);
  });

  it('stems plurals and cases together, never below four letters', () => {
    expect(stem('kurse')).toBe(stem('kurs'));
    expect(stem('kursen')).toBe(stem('kurs'));
    expect(stem('prufungen')).toBe('prufung');
    expect(stem('wg')).toBe('wg');
  });

  it('gives synonyms in both languages one concept', () => {
    expect(terms('Was kostet das?')).toContain('~price');
    expect(terms('fees')).toContain('~price');
    expect(terms('Gastfamilie')).toContain('~accommodation');
    expect(terms('host family')).toContain('~accommodation');
    // "german" is not a beginner word just because "no german" is a phrase.
    expect(terms('German course')).not.toContain('~beginner');
  });

  it('measures typos, including swapped letters', () => {
    expect(editDistance('unterkunft', 'untrekunft')).toBe(1);
    expect(editDistance('accomodation', 'accommodation')).toBe(1);
    expect(editDistance('kurs', 'preis', 1)).toBeGreaterThan(1);
  });
});

const doc = (id: string, locale: 'de' | 'en', page: string, text: string, extra: Partial<KnowledgeDoc> = {}): KnowledgeDoc => ({
  id,
  locale,
  type: 'page',
  url: `/${id}`,
  page,
  text,
  ...extra,
});

describe('knowledge index', () => {
  const index = new KnowledgeIndex([
    doc('evening', 'de', 'Abendkurse', 'Unsere Abendkurse finden zweimal pro Woche von 18:30 bis 20:00 Uhr statt.'),
    doc('intensive', 'de', 'Intensivkurse', 'Im Intensivkurs lernst du 20 Unterrichtseinheiten pro Woche, vormittags oder nachmittags.'),
    doc('accommodation', 'de', 'Unterkunft', 'Du kannst in einer CASA-WG oder bei einer Gastfamilie wohnen. Die Miete beträgt 580 € für 4 Wochen.'),
    doc('exams', 'de', 'Prüfungen', 'Bei uns legst du telc Deutsch B2 und telc Deutsch C1 Hochschule ab.'),
    doc('evening-en', 'en', 'Evening courses', 'Our evening courses run twice a week from 18:30 to 20:00.'),
  ]);
  const top = (query: string, options = {}) => index.search(query, { locale: 'de', ...options })[0]?.doc.id;

  it('finds a word without its umlauts, and with a typo', () => {
    expect(top('prufung')).toBe('exams');
    expect(top('untrekunft')).toBe('accommodation');
  });

  it('finds compounds split and joined', () => {
    expect(top('abend kurs')).toBe('evening');
    expect(top('abendkurs')).toBe('evening');
  });

  it('meets synonyms: "Kosten" finds the page that says Miete and €', () => {
    expect(top('Wohnen Kosten')).toBe('accommodation');
  });

  it('finds a page from the other language\'s words', () => {
    // The search layer shows an English hit's German twin; the German page itself is close behind.
    expect(index.search('evening courses', { locale: 'de' }).slice(0, 2).map((hit) => hit.doc.id)).toContain('evening');
    expect(index.search('evening courses', { locale: 'en' })[0].doc.id).toBe('evening-en');
  });

  it('completes the last word while typing', () => {
    expect(top('gastfam', { prefix: true })).toBe('accommodation');
  });

  it('suggests the word the site uses', () => {
    expect(index.didYouMean('untrekunft')).toBe('unterkunft');
    expect(index.didYouMean('Unterkunft')).toBeNull();
  });

  it('cuts a snippet around the matching sentence', () => {
    const text = `${'Einleitung ohne Bezug. '.repeat(12)}Die Miete beträgt 580 € für 4 Wochen. Danach geht es weiter.`;
    expect(snippet(text, 'Miete', 80)).toContain('580 €');
  });
});

describe('page extraction', () => {
  it('reads main into sections by heading, leaving out what a visitor does not read', () => {
    const html = `<html><head><title>Unterkunft | CASA Bremen</title></head><body>
      <header><nav>Menü</nav></header>
      <main>
        <section id="intro"><h1>Ein Zuhause für deine Zeit</h1><p>Du wohnst in einer WG<!-- --> oder bei einer Gastfamilie.</p></section>
        <figure aria-hidden="true"><span>CASA-WGs</span></figure>
        <script>self.__next_f.push([1,"x"])</script>
        <section id="kosten"><h2>Was die Unterkunft kostet</h2><ul><li>580&nbsp;€ für 4 Wochen</li><li>145 € pro Woche</li></ul>
        <form><label>Name</label><input name="x"></form></section>
      </main>
      <footer>Impressum</footer></body></html>`;
    const page = extractPage(html);
    expect(page.title).toBe('Unterkunft');
    expect(page.sections).toEqual([
      { heading: 'Ein Zuhause für deine Zeit', anchor: 'intro', text: 'Du wohnst in einer WG oder bei einer Gastfamilie.' },
      { heading: 'Was die Unterkunft kostet', anchor: 'kosten', text: '580 € für 4 Wochen 145 € pro Woche' },
    ]);
  });
});
