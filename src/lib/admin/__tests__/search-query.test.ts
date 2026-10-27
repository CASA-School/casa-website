import { describe, expect, it } from 'vitest';

import { foldSearch, matchesShortcut, nameScore, parseQuery, rankGroups, scoreCandidate, searchTokens } from '../search-query';

/**
 * The workspace search's reading of what was typed (src/lib/admin/search-query.ts). `foldSearch` must
 * stay step for step what the database's `ws_fold` does (migration 0091): these cases are the ones
 * that migration's comment names.
 */
describe('foldSearch', () => {
  it('ignores case and accents', () => {
    expect(foldSearch('JOSÉ María')).toBe('jose maria');
    expect(foldSearch('Şahin Yılmaz')).toBe('sahin yilmaz');
    expect(foldSearch('İpek Iğdır')).toBe('ipek igdir');
    expect(foldSearch('Łukasz Ørsted')).toBe('lukasz orsted');
  });

  it('reads ä/ae, ö/oe, ü/ue and ß/ss alike', () => {
    for (const spelling of ['Müller', 'Mueller', 'Muller', 'MÜLLER']) expect(foldSearch(spelling)).toBe('muller');
    expect(foldSearch('Straße')).toBe(foldSearch('Strasse'));
    expect(foldSearch('Göbel')).toBe(foldSearch('Goebel'));
    expect(foldSearch('Bär')).toBe(foldSearch('Baer'));
  });

  it('keeps a folded prefix a prefix, so a word can be typed halfway', () => {
    for (const [whole, part] of [
      ['Rodríguez', 'Rodrigu'],
      ['Mueller', 'Mue'],
      ['Michael', 'Micha'],
    ]) {
      expect(foldSearch(whole).startsWith(foldSearch(part))).toBe(true);
    }
  });

  it('makes punctuation a space but keeps an address, a level and B1+', () => {
    expect(foldSearch("José-María O'Brien")).toBe('jose maria o brien');
    expect(foldSearch('anna.schmidt@gmx.de')).toBe('anna.schmidt@gmx.de');
    expect(foldSearch('B1.1 Oktober')).toBe('b1.1 oktober');
    expect(foldSearch('B1+')).toBe('b1+');
    expect(foldSearch('  Dr.  Jürgen   ')).toBe('dr. jurgen');
    expect(foldSearch('x–y—z „q“ «r»')).toBe('x y z q r');
  });
});

describe('searchTokens', () => {
  it('splits into words, each once, without a trailing full stop', () => {
    expect(searchTokens('Schmidt, Anna.')).toEqual(['schmidt', 'anna']);
    expect(searchTokens('anna ANNA')).toEqual(['anna']);
  });
});

describe('parseQuery', () => {
  const now = new Date('2026-10-27T12:00:00Z');

  it('reads a booking number however it is typed', () => {
    for (const typed of ['B-2026-0042', 'b 2026 42', 'B2026-42', 'b-26-42']) {
      expect(parseQuery(typed, now).booking.exact).toBe('b-2026-0042');
    }
    expect(parseQuery('B-2026-00', now).booking.prefix).toBe('b-2026-00');
    expect(parseQuery('2026-0042', now).booking.exact).toBe('b-2026-0042');
  });

  it('does not take a level for a booking number', () => {
    expect(parseQuery('B1', now).booking).toEqual({ exact: null, prefix: null });
    expect(parseQuery('B1.1 Oktober', now).booking).toEqual({ exact: null, prefix: null });
    expect(parseQuery('B1.1 Oktober', now).tokens).toEqual(['b1.1', 'oktober']);
  });

  it('reads an offer number', () => {
    expect(parseQuery('2026-42', now).offer).toBe('2026-042');
    expect(parseQuery('2026-042', now).offer).toBe('2026-042');
  });

  it('finds a phone number whatever its spaces, and without the national 0 or 00', () => {
    expect(parseQuery('0170 123 45 67', now).phone).toEqual(['01701234567', '1701234567']);
    expect(parseQuery('+49 170 1234', now).phone).toEqual(['491701234']);
    expect(parseQuery('0049 170 1234', now).phone).toEqual(['00491701234', '491701234']);
    // Four digits are in too many numbers.
    expect(parseQuery('0421', now).phone).toEqual([]);
  });

  it('reads a date as a date, not as a phone number', () => {
    expect(parseQuery('14.03.1998', now)).toMatchObject({ date: '1998-03-14', phone: [] });
    expect(parseQuery('1998-03-14', now).date).toBe('1998-03-14');
    expect(parseQuery('14.3.98', now).date).toBe('1998-03-14');
    expect(parseQuery('1.2.24', now).date).toBe('2024-02-01');
    expect(parseQuery('31.02.1998', now).date).toBeNull();
  });

  it('looks an identifier up as one, not also as words', () => {
    expect(parseQuery('B-2026-0042', now).tokens).toEqual([]);
    expect(parseQuery('anna@example.org', now)).toMatchObject({ email: 'anna@example.org', tokens: [] });
    // A short number may be a course's or a customer's: both, and the words too.
    expect(parseQuery('4982', now)).toMatchObject({ number: '4982', tokens: ['4982'] });
  });
});

describe('ranking', () => {
  it('scores how the words fit a name', () => {
    expect(nameScore(['anna', 'schmidt'], 'anna schmidt')).toBe(500);
    // Every word the start of a word, typed from the first one, above the reverse order.
    expect(nameScore(['anna', 'sch'], 'anna schmidt')).toBeGreaterThan(nameScore(['sch', 'anna'], 'anna schmidt'));
    expect(nameScore(['sch', 'anna'], 'anna schmidt')).toBeGreaterThan(nameScore(['mid'], 'anna schmidt'));
    // Inside the name, above only elsewhere (an address).
    expect(nameScore(['mid'], 'anna schmidt')).toBeGreaterThan(nameScore(['gmx'], 'anna schmidt'));
  });

  it('puts an exact identifier first, then the name, then what is current', () => {
    const now = new Date('2026-10-27T12:00:00Z');
    const exact = scoreCandidate(['b'], { name: 'zoe zimmer', idMatch: 'exact' }, now);
    const name = scoreCandidate(['anna', 'schmidt'], { name: 'anna schmidt', idMatch: null }, now);
    expect(exact).toBeGreaterThan(name);
    const current = scoreCandidate(['anna'], { name: 'anna schmidt', idMatch: null, live: true, at: '2026-10-01' }, now);
    const old = scoreCandidate(['anna'], { name: 'anna schmidt', idMatch: null, live: false, at: '2019-03-01' }, now);
    expect(current).toBeGreaterThan(old);
  });

  it('puts a record found through another below the one it was found through', () => {
    const person = scoreCandidate(['schmidt'], { name: 'anna schmidt', idMatch: null }, new Date());
    const booking = scoreCandidate(['schmidt'], { name: 'anna schmidt', idMatch: null, via: true, live: true, at: new Date().toISOString() }, new Date());
    expect(person).toBeGreaterThan(booking);
  });

  it('orders the groups by their best hit and keeps five of each', () => {
    const hits = [
      { kind: 'booking' as const, score: 1000 },
      ...Array.from({ length: 7 }, (_, i) => ({ kind: 'person' as const, score: 400 + i })),
      { kind: 'course' as const, score: 300 },
    ];
    const groups = rankGroups(hits, ['person', 'booking', 'course']);
    expect(groups.map((g) => g.kind)).toEqual(['booking', 'person', 'course']);
    expect(groups[1].hits.map((h) => h.score)).toEqual([406, 405, 404, 403, 402]);
    // Equal best scores: the fixed order decides.
    expect(rankGroups([{ kind: 'course', score: 5 }, { kind: 'person', score: 5 }], ['person', 'course']).map((g) => g.kind)).toEqual(['person', 'course']);
  });
});

describe('matchesShortcut', () => {
  it('matches the start of a word of the label or its keywords, in either language', () => {
    expect(matchesShortcut(['buch'], 'Buchungen')).toBe(true);
    expect(matchesShortcut(['teach'], 'Mitarbeitende', 'Mitarbeitende Staff lehrkräfte teachers')).toBe(true);
    expect(matchesShortcut(['lehrkrafte'], 'Mitarbeitende', 'lehrkräfte')).toBe(true);
    expect(matchesShortcut(['chung'], 'Buchungen')).toBe(false);
    expect(matchesShortcut([], 'Buchungen')).toBe(false);
  });
});
