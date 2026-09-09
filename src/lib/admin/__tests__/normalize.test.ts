import { describe, expect, it } from 'vitest';

import { CASA_LEVEL_SEQUENCE } from '@/config/calculator/pricing';
import {
  countryCodeFromName,
  displayName,
  levelCodeFrom,
  normalizeEmail,
  normalizePhone,
  parseIsoDate,
} from '../normalize';

describe('normalizeEmail', () => {
  it('lower-cases and trims so the same mailbox compares equal', () => {
    expect(normalizeEmail('  Amara.Okonkwo@Example.COM ')).toBe('amara.okonkwo@example.com');
  });
});

describe('normalizePhone', () => {
  it('keeps digits and one leading plus', () => {
    expect(normalizePhone('+49 (421) 100-000')).toBe('+49421100000');
    expect(normalizePhone('0049 421 100 000')).toBe('+49421100000');
  });
  it('does not invent a country for a local number', () => {
    // A Turkish learner typing a local number is not in Germany.
    expect(normalizePhone('0532 123 45 67')).toBe('05321234567');
  });
});

describe('countryCodeFromName', () => {
  it('maps what the public form submits, byte for byte', () => {
    expect(countryCodeFromName('Germany')).toBe('DE');
    expect(countryCodeFromName('United Arab Emirates (the)')).toBe('AE');
  });
  it('accepts a code, and German names typed by staff', () => {
    expect(countryCodeFromName('tr')).toBe('TR');
    expect(countryCodeFromName('Türkei')).toBe('TR');
  });
  it('returns null for a demonym rather than guessing', () => {
    // The demo seed used these; the migration flagged all eight. Correct.
    expect(countryCodeFromName('Brazilian')).toBeNull();
    expect(countryCodeFromName('')).toBeNull();
    expect(countryCodeFromName(null)).toBeNull();
  });
});

describe('levelCodeFrom', () => {
  it('accepts every CASA level and nothing else', () => {
    for (const level of CASA_LEVEL_SEQUENCE) expect(levelCodeFrom(level)).toBe(level);
    expect(levelCodeFrom(' b1.2 ')).toBe('B1.2');
    expect(levelCodeFrom('B1 +')).toBeNull();
    expect(levelCodeFrom('intermediate')).toBeNull();
  });
});

describe('parseIsoDate', () => {
  it('accepts what the date picker emits', () => {
    expect(parseIsoDate('1998-03-14')).toBe('1998-03-14');
  });
  it('rejects other formats and impossible dates instead of parsing optimistically', () => {
    expect(parseIsoDate('14.03.1998')).toBeNull();
    expect(parseIsoDate('98-03-14')).toBeNull();
    expect(parseIsoDate('1998-02-30')).toBeNull();
  });
});

describe('displayName', () => {
  it('copes with a missing surname, as enquiries often have', () => {
    expect(displayName('Amara', null)).toBe('Amara');
    expect(displayName(' Amara ', ' Okonkwo ')).toBe('Amara Okonkwo');
  });
});
