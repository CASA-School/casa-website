import { describe, expect, it } from 'vitest';

import { preparationExamOf } from '../exam-preparation-courses';

describe('exam preparation terms', () => {
  it('reads the exam from the titles SchoolMan gives', () => {
    expect(preparationExamOf('telc Deutsch C1 Hochschule – Prüfungsvorbereitung')).toBe('telc_c1_hochschule');
    expect(preparationExamOf('C1H Vorbereitung')).toBe('telc_c1_hochschule');
    expect(preparationExamOf('telc Deutsch B2 – Prüfungsvorbereitung')).toBe('telc_b2');
    expect(preparationExamOf('B2 Telc Prüfungsvorbereitung')).toBe('telc_b2');
    expect(preparationExamOf('TestDaF – Prüfungsvorbereitung')).toBeNull();
    expect(preparationExamOf(null)).toBeNull();
  });
});
