import { describe, expect, it } from 'vitest';

import { distance, judgeMatch, soundOf, type MatchFacts } from '../person-match-rules';

const sent: MatchFacts = {
  firstName: 'Lena',
  lastName: 'Müller',
  birthDate: '1998-03-14',
  emails: ['lena.mueller@example.org'],
  phones: ['+49 170 1234567'],
  nationalityCode: 'DE',
};

const record = (over: Partial<MatchFacts>): MatchFacts => ({ ...sent, ...over });

describe('judgeMatch', () => {
  it('is sure of the same name, address and birthday', () => {
    const j = judgeMatch(sent, record({}));
    expect(j.strength).toBe('sure');
    expect(j.fields).toEqual({ name: 'same', birthDate: 'same', email: 'same', phone: 'same', nationality: 'same' });
  });

  it('reads Mueller as Müller and forgives a typo in the first name', () => {
    const j = judgeMatch(sent, record({ firstName: 'Lenna', lastName: 'Mueller', emails: [] }));
    expect(j.fields.name).toBe('close');
    expect(j.strength).toBe('sure');
  });

  it('finds first and last name swapped', () => {
    const j = judgeMatch(sent, record({ firstName: 'Müller', lastName: 'Lena', phones: [] }));
    expect(j.reasons).toContain('name_swapped');
    expect(j.strength).toBe('sure');
  });

  it('finds a double surname written in part, and a nickname', () => {
    const j = judgeMatch({ ...sent, firstName: 'Alex', lastName: 'García' }, record({ firstName: 'Alexander', lastName: 'García López', emails: [], phones: [] }));
    expect(j.fields.name).toBe('close');
    expect(j.strength).toBe('sure');
  });

  it('sees day and month exchanged', () => {
    expect(judgeMatch({ ...sent, birthDate: '1998-04-03' }, record({ birthDate: '1998-03-04', emails: [], phones: [] })).fields.birthDate).toBe('close');
  });

  it('matches a phone number with or without its country code', () => {
    expect(judgeMatch(sent, record({ phones: ['0170 1234567'] })).fields.phone).toBe('same');
  });

  it('sees an address with a typo in its domain as close', () => {
    expect(judgeMatch(sent, record({ emails: ['lena.mueller@exampel.org'] })).fields.email).toBe('close');
  });

  it('never calls a sibling sure: same address and surname, other first name and birthday', () => {
    const j = judgeMatch(sent, record({ firstName: 'Jonas', birthDate: '2001-07-02', phones: [] }));
    expect(j.strength).toBe('possible');
    expect(j.reasons).toEqual(expect.arrayContaining(['email', 'surname', 'first_name_differs', 'birth_differs']));
  });

  it('keeps a namesake with another birthday at possible', () => {
    expect(judgeMatch(sent, record({ birthDate: '1975-01-01', emails: [], phones: [] })).strength).toBe('possible');
  });

  it('drops someone who only shares a birthday', () => {
    expect(judgeMatch(sent, record({ firstName: 'Omar', lastName: 'Haddad', emails: [], phones: [] })).strength).toBeNull();
  });
});

describe('soundOf', () => {
  it('hears the spellings of one name as one', () => {
    expect(soundOf('sophia')).toBe(soundOf('sofia'));
    expect(soundOf('mayer')).toBe(soundOf('meier'));
    expect(soundOf('carl')).toBe(soundOf('karl'));
    expect(soundOf('schmitt')).toBe(soundOf('schmidt'));
    expect(soundOf('anna')).toBe(soundOf('ana'));
  });

  it('makes Sofia, phone and a birthday with day and month exchanged sure', () => {
    const j = judgeMatch(
      { firstName: 'Sofia', lastName: 'Rossi', birthDate: '1999-05-04', emails: ['sofia.rossi@example.org'], phones: ['0039 333 1234567'], nationalityCode: 'IT' },
      { firstName: 'Sophia', lastName: 'Rossi', birthDate: '1999-04-05', emails: ['sophia.rossi@example.org'], phones: ['+39 333 1234567'], nationalityCode: 'IT' }
    );
    expect(j.fields).toMatchObject({ name: 'close', birthDate: 'close', phone: 'same', email: 'close' });
    expect(j.strength).toBe('sure');
  });
});

describe('distance', () => {
  it('counts a swap of two neighbours as one edit', () => {
    expect(distance('maier', 'meier')).toBe(1);
    expect(distance('lena', 'lnea')).toBe(1);
    expect(distance('anna', 'johannes', 2)).toBe(3);
  });
});
