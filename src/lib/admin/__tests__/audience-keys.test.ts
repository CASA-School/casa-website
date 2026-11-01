import { describe, expect, it } from 'vitest';

import {
  learnerAudienceName,
  learnerKey,
  learnersIn,
  parseLearnerKey,
  parseTeamKey,
  teamKey,
  teamMatches,
  type LearnerFact,
} from '../mail/audience-keys';

const fact = (personId: string, over: Partial<LearnerFact> = {}): LearnerFact => ({
  personId,
  kind: 'evening',
  session: 'evening',
  days: 'tue-thu',
  now: true,
  soon: false,
  ...over,
});

describe('group keys', () => {
  it('reads and writes a learners group the same way', () => {
    for (const key of ['all', 'evening', 'evening.tue-thu', 'intensive.am', 'mon-wed', 'soon', 'special.pm.mon-wed.both']) {
      const audience = parseLearnerKey(key);
      expect(audience).not.toBeNull();
      expect(learnerKey(audience!)).toBe(key);
    }
  });

  it('refuses a key outside the vocabulary, or a word twice', () => {
    expect(parseLearnerKey('evening.evening')).toBeNull();
    expect(parseLearnerKey('evening.intensive')).toBeNull();
    expect(parseLearnerKey('weekend')).toBeNull();
    expect(parseLearnerKey("evening'; DROP TABLE people")).toBeNull();
    expect(parseTeamKey('teaching.office')).toBeNull();
    expect(parseTeamKey('owners')).toBeNull();
  });

  it('reads and writes a team group', () => {
    expect(teamKey(parseTeamKey('teaching.employed')!)).toBe('teaching.employed');
    expect(teamKey(parseTeamKey('all')!)).toBe('all');
  });

  it('names a group in both languages', () => {
    expect(learnerAudienceName(parseLearnerKey('evening.tue-thu')!)).toEqual({
      de: 'Teilnehmende · Abendkurs · Di + Do',
      en: 'Students · Evening course · Tue + Thu',
    });
  });
});

describe('who is in a group', () => {
  const facts = [
    fact('a'),
    fact('b', { days: 'mon-wed' }),
    fact('c', { kind: 'intensive', session: 'morning', days: null }),
    fact('c', { kind: 'intensive', session: 'afternoon', days: null }),
    fact('d', { now: false, soon: true }),
    fact('e', { kind: 'special', days: 'tue-thu' }),
  ];

  it('counts a learner once, however many periods match', () => {
    expect(learnersIn(facts, parseLearnerKey('intensive')!)).toEqual(['c']);
  });

  it('keeps the evening classes apart by their days', () => {
    expect(learnersIn(facts, parseLearnerKey('evening.tue-thu')!)).toEqual(['a']);
    expect(learnersIn(facts, parseLearnerKey('evening.mon-wed')!)).toEqual(['b']);
    expect(learnersIn(facts, parseLearnerKey('tue-thu')!)).toEqual(['a', 'e']);
  });

  it('takes in a course now, starting soon, or both', () => {
    expect(learnersIn(facts, parseLearnerKey('all')!)).not.toContain('d');
    expect(learnersIn(facts, parseLearnerKey('soon')!)).toEqual(['d']);
    expect(learnersIn(facts, parseLearnerKey('evening.tue-thu.both')!)).toEqual(['a', 'd']);
  });

  it('reads the team by teaching and by contract', () => {
    const teacher = { staffId: '1', teaches: true, contract: 'employed' };
    const freelance = { staffId: '2', teaches: true, contract: 'freelance' };
    const office = { staffId: '3', teaches: false, contract: 'employed' };
    const employed = parseTeamKey('employed')!;
    expect([teacher, freelance, office].filter((f) => teamMatches(f, employed)).map((f) => f.staffId)).toEqual(['1', '3']);
    expect(teamMatches(office, parseTeamKey('teaching')!)).toBe(false);
    expect(teamMatches(freelance, parseTeamKey('teaching.freelance')!)).toBe(true);
  });
});
