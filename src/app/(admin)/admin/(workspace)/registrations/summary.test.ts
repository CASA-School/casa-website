import { describe, expect, it } from 'vitest';

import { examLevel, levelWord, registrationChecks, registrationTitle, type CheckLine } from './summary';

const day = (iso: string) => new Date(`${iso}T12:00:00Z`);
const course = (id: string, level: string, start: string | null, end: string | null): CheckLine => ({
  id,
  kind: 'course',
  level,
  start: start ? day(start) : null,
  end: end ? day(end) : null,
  toBeArranged: !start,
  settled: false,
});

describe('an Anmeldung in a few words', () => {
  it('reads a path through the levels of one course as that path, with the exam after it', () => {
    const path = ['A1', 'A2', 'B1', 'B1+', 'B2', 'C1'].map((level) => ({ kind: 'course' as const, name: 'Intensive German', level: `${level} komplett · 8 Wochen` }));
    expect(registrationTitle([...path, { kind: 'exam', name: 'telc Deutsch B2', level: 'full' }])).toBe('Intensive German A1 → C1 + telc Deutsch B2');
  });

  it('names one course by its name, and two different ones side by side', () => {
    expect(registrationTitle([{ kind: 'course', name: 'Intensive German', level: 'B1.2' }])).toBe('Intensive German');
    expect(
      registrationTitle([
        { kind: 'course', name: 'Intensive German', level: 'A1 komplett' },
        { kind: 'course', name: 'Evening German', level: 'B1.2' },
      ])
    ).toBe('Intensive German, Evening German');
    expect(registrationTitle([{ kind: 'exam', name: 'telc Deutsch B1', level: 'oral' }])).toBe('telc Deutsch B1');
  });

  it('takes the level word out of what the learner chose', () => {
    expect(levelWord('B1+ komplett · 8 Wochen')).toBe('B1+');
    expect(levelWord('B1.2')).toBe('B1.2');
    expect(levelWord('')).toBeNull();
    expect(examLevel('telc Deutsch B2')).toBe('B2');
    expect(examLevel('TestDaF')).toBeNull();
  });
});

describe('what the lines say together', () => {
  it('finds Meike’s case: telc B2 two weeks before her B2 course ends, and C1 without a date', () => {
    const checks = registrationChecks([
      course('a1', 'A1', '2027-01-04', '2027-02-26'),
      course('a2', 'A2', '2027-03-01', '2027-04-30'),
      course('b2', 'B2', '2027-08-30', '2027-10-22'),
      course('c1', 'C1', null, null),
      { id: 'x', kind: 'exam', level: 'B2', start: day('2027-10-08'), end: day('2027-10-08'), toBeArranged: false, settled: false },
    ]);
    expect(checks.map((c) => c.kind).sort()).toEqual(['exam_before_course_end', 'gap', 'no_date']);
    const early = checks.find((c) => c.kind === 'exam_before_course_end');
    expect(early).toMatchObject({ examId: 'x', courseId: 'b2', level: 'B2' });
  });

  it('lets a weekend pass between two levels, and names a longer gap and an overlap', () => {
    expect(registrationChecks([course('a1', 'A1', '2027-01-04', '2027-02-26'), course('a2', 'A2', '2027-03-01', '2027-04-30')])).toEqual([]);
    const gap = registrationChecks([course('b1', 'B1', '2027-05-03', '2027-06-25'), course('bp', 'B1+', '2027-07-12', '2027-09-03')]);
    expect(gap).toEqual([{ kind: 'gap', fromId: 'b1', toId: 'bp', fromLevel: 'B1', toLevel: 'B1+', days: 16 }]);
    const overlap = registrationChecks([course('a', 'A1', '2027-01-04', '2027-02-26'), course('b', 'A2', '2027-02-22', '2027-04-30')]);
    expect(overlap.map((c) => c.kind)).toEqual(['overlap']);
  });

  it('leaves booked or declined lines alone', () => {
    expect(registrationChecks([{ ...course('c1', 'C1', null, null), settled: true }])).toEqual([]);
  });
});
