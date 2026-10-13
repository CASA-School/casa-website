import { describe, expect, it } from 'vitest';

import { formatRange, optionLine, parseOptionLabel } from './option-label';

const iso = (date: Date | null) => date?.toISOString().slice(0, 10) ?? null;

describe('parseOptionLabel', () => {
  it('reads a German course option from the public form', () => {
    const parsed = parseOptionLabel(
      '26. Okt. 2026 - 18. Dez. 2026 | Mo, Di, Mi, Do, Fr • 09:00-12:30 | CASA Bremen - Am Dobben'
    );
    expect(iso(parsed!.start)).toBe('2026-10-26');
    expect(iso(parsed!.end)).toBe('2026-12-18');
    expect(parsed!.days).toBe('Mon–Fri');
    expect(parsed!.time).toBe('09:00–12:30');
    expect(parsed!.location).toBe('CASA Bremen - Am Dobben');
  });

  it('reads the English form, the compact schedule and two separate days', () => {
    const parsed = parseOptionLabel('24 Aug 2026 - 16 Dec 2026 | Mon, Wed · 18:30–20:00 | CASA Bremen');
    expect(iso(parsed!.start)).toBe('2026-08-24');
    expect(parsed!.days).toBe('Mon, Wed');
    expect(parsed!.time).toBe('18:30–20:00');
    expect(parseOptionLabel('01. Feb. 2027 - 01. Apr. 2027 | Mo–Do · 13:00–17:30 | CASA')!.days).toBe('Mon–Thu');
  });

  it('reads an exam sitting, an older "Starts" row and März', () => {
    const exam = parseOptionLabel('13. Nov. 2026, 09:00 - 17:00 | CASA Bremen Prüfungszentrum');
    expect(iso(exam!.start)).toBe('2026-11-13');
    expect(exam!.end).toBeNull();
    expect(exam!.time).toBe('09:00–17:00');
    expect(exam!.location).toBe('CASA Bremen Prüfungszentrum');
    expect(iso(parseOptionLabel('Starts 03/08/2026')!.start)).toBe('2026-08-03');
    expect(iso(parseOptionLabel('02. März 2027 - 30. Apr. 2027')!.start)).toBe('2027-03-02');
  });

  it('keeps what it cannot read, and knows a date still to be arranged', () => {
    expect(parseOptionLabel('Termin wird noch festgelegt')!.toBeArranged).toBe(true);
    expect(parseOptionLabel('Sometime in spring')).toMatchObject({ start: null, raw: 'Sometime in spring' });
    expect(parseOptionLabel('31. Feb. 2026')!.start).toBeNull();
    expect(parseOptionLabel(null)).toBeNull();
  });
});

describe('optionLine', () => {
  const year = new Date().getFullYear();

  it('puts every row in one shape', () => {
    expect(optionLine(`26. Okt. ${year} - 18. Dez. ${year} | Mo, Di • 09:00-12:30 | CASA`, 'course')).toBe(
      'Starts 26 Oct · 09:00–12:30'
    );
    expect(optionLine(`Starts 24/08/${year}`, 'course')).toBe('Starts 24 Aug');
    expect(optionLine(`13. Nov. ${year}, 09:00 - 17:00 | CASA`, 'exam')).toBe('13 Nov · 09:00–17:00');
    expect(optionLine('Date to be arranged', 'course')).toBe('Date to be arranged');
    expect(optionLine('Sometime in spring', 'course')).toBe('Sometime in spring');
    expect(optionLine(null, 'exam')).toBeNull();
  });

  it('names the year once in a range', () => {
    expect(formatRange(new Date(Date.UTC(2026, 9, 26, 12)), new Date(Date.UTC(2026, 11, 18, 12)))).toBe(
      '26 Oct – 18 Dec 2026'
    );
    expect(formatRange(new Date(Date.UTC(2026, 11, 7, 12)), new Date(Date.UTC(2027, 0, 29, 12)))).toBe(
      '7 Dec 2026 – 29 Jan 2027'
    );
  });
});
