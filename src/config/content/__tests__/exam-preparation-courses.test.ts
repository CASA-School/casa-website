import { describe, expect, it } from 'vitest';

import { preparationCoursesSentence, preparationExamOf } from '../exam-preparation-courses';

const mornings = { days: 'Mo–Fr', time: '09:00–12:30', daytime: 'morning' as const };
const evenings = { days: 'Mo, Mi', time: '18:30–20:00', daytime: 'evening' as const };

describe('exam preparation terms', () => {
  it('reads the exam from the titles SchoolMan gives', () => {
    expect(preparationExamOf('telc Deutsch C1 Hochschule – Prüfungsvorbereitung')).toBe('telc_c1_hochschule');
    expect(preparationExamOf('C1H Vorbereitung')).toBe('telc_c1_hochschule');
    expect(preparationExamOf('telc Deutsch B2 – Prüfungsvorbereitung')).toBe('telc_b2');
    expect(preparationExamOf('B2 Telc Prüfungsvorbereitung')).toBe('telc_b2');
    expect(preparationExamOf('TestDaF – Prüfungsvorbereitung')).toBeNull();
    expect(preparationExamOf(null)).toBeNull();
  });

  it('says a shared schedule once, and each one where they differ', () => {
    expect(preparationCoursesSentence([
      { startDate: '2027-01-04', endDate: '2027-01-29', schedule: mornings },
      { startDate: '2027-02-01', endDate: '2027-02-26', schedule: mornings },
    ], 'de')).toBe('Die nächsten Vorbereitungskurse, jeweils Mo–Fr, 09:00–12:30: 04.01.–29.01.2027 und 01.02.–26.02.2027.');
    expect(preparationCoursesSentence([
      { startDate: '2026-12-28', endDate: '2027-01-22', schedule: mornings },
      { startDate: '2027-02-01', endDate: '2027-03-01', schedule: evenings },
    ], 'en')).toBe('The next preparation courses: 28 Dec 2026 – 22 Jan 2027 (Mo–Fr, 09:00–12:30) and 1 Feb – 1 Mar 2027 (Mo, Mi, 18:30–20:00).');
    expect(preparationCoursesSentence([], 'de')).toBeNull();
  });
});
