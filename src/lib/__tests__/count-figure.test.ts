import { describe, expect, it } from 'vitest';

import { countParts } from '../count-figure';

describe('countParts', () => {
  it('marks the number and keeps the words around it', () => {
    expect(countParts('150+ Herkunftsländer')).toEqual({ before: '', digits: '150', after: '+ Herkunftsländer', to: 150, group: '' });
    expect(countParts('40+ staff & teachers')).toMatchObject({ digits: '40', after: '+ staff & teachers', to: 40 });
  });

  it('keeps the separator each language writes', () => {
    expect(countParts('30.000+')).toMatchObject({ digits: '30.000', to: 30000, group: '.' });
    expect(countParts('30,000+')).toMatchObject({ digits: '30,000', to: 30000, group: ',' });
  });

  it('counts nothing in a year, a single digit or a figure without a number', () => {
    expect(countParts('Seit 1983')).toBeNull();
    expect(countParts('Since 1983')).toBeNull();
    expect(countParts('7 Tage')).toBeNull();
    expect(countParts('telc')).toBeNull();
  });
});
