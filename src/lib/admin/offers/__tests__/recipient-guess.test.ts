import { describe, expect, it } from 'vitest';

import { comparableName, countryFromEmail, guessKind, languageFor, nameFromEmail, offerName, organisationDomain, sameName } from '../recipient-guess';

describe('what a new recipient is, from what was typed', () => {
  it('reads the kind of organisation from its name', () => {
    expect(guessKind('Liceo Canova Treviso')).toBe('school');
    expect(guessKind('Gymnasium Horn')).toBe('school');
    expect(guessKind('Vivimondo Viaggi srl')).toBe('agency');
    expect(guessKind('Siemens Healthineers AG')).toBe('company');
    expect(guessKind('Jobcenter Bremen')).toBe('public_body');
    expect(guessKind('Fiorella Massari')).toBe('person');
    expect(guessKind('vivimondo')).toBeNull();
  });

  it('reads a name and a country from an address, and nothing from an open mail service', () => {
    expect(nameFromEmail('fiorella.massari@vivimondo.it')).toEqual({ firstName: 'Fiorella', lastName: 'Massari' });
    expect(nameFromEmail('info@vivimondo.it')).toBeNull();
    expect(countryFromEmail('gruppi@scuola.it')).toBe('IT');
    expect(countryFromEmail('trips@school.co.uk')).toBe('GB');
    expect(countryFromEmail('someone@gmail.com')).toBeNull();
    expect(countryFromEmail('office@agency.com')).toBeNull();
    expect(organisationDomain('a.b@vivimondo.it')).toBe('vivimondo.it');
    expect(organisationDomain('a.b@gmx.de')).toBeNull();
  });

  it('writes in German to the German-speaking countries and in English to the rest', () => {
    expect(languageFor('AT')).toBe('de');
    expect(languageFor('IT')).toBe('en');
    expect(languageFor(null, 'de')).toBe('de');
  });
});

describe('a recipient CASA already has', () => {
  it('is the same name without its legal form, its accents or its punctuation', () => {
    expect(comparableName('Vivimondo S.r.l.')).toBe('vivimondo');
    expect(sameName('Vivimondo S.r.l.', 'vivimondo srl')).toBe(true);
    expect(sameName('Liceo Canova', 'Liceo Canova Treviso')).toBe(true);
    expect(sameName('Liceo Canova', 'Liceo Galilei')).toBe(false);
    expect(sameName('IIS', 'IIS Galilei')).toBe(false);
  });

  it('names the offer after the organisation and the year it travels', () => {
    expect(offerName('Vivimondo S.r.l.', '2027-04-11')).toBe('Vivimondo 2027');
    expect(offerName('Liceo Canova', null)).toBe('Liceo Canova');
  });
});
