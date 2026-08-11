import { describe, expect, it } from 'vitest';

import { GROUP_RATES, calculateGroupQuote } from '@/lib/pricing/group-pricing';

/**
 * The workbook's own worked example (Kalkulation!G3:I11):
 *   2 weeks · 20 UE/week · 2 Wochen DZ HP · Kantine Ja
 *   · 7-Tage-Ticket Schüler · Kulturprogramm large
 */
const WORKBOOK_EXAMPLE = {
  weeks: 2,
  roomType: 'double' as const,
  includeAccommodation: true,
  includeCanteen: true,
  transit: 'weekly-student' as const,
  culture: 'large' as const,
};

describe('group pricing', () => {
  it('reproduces the workbook example exactly when materials are excluded', () => {
    const quote = calculateGroupQuote({ ...WORKBOOK_EXAMPLE, includeMaterials: false });
    const by = (k: string) => quote.lines.find((l) => l.key === k)?.amount;

    expect(by('course')).toBe(290); // 145 x 2
    expect(by('accommodation')).toBe(450); // "2 Wochen, DZ, HP"
    expect(by('canteen')).toBe(120); // 60 x 2
    expect(by('transit')).toBe(50); // 25 x 2
    expect(by('culture')).toBe(200); // 100 x 2
    expect(by('administration')).toBe(30);
    expect(quote.perPerson).toBe(1140);
  });

  it('adds the materials fee the workbook defines but never sums', () => {
    // Lehrmaterial sits at B5 = 20, but the total is SUM(I5:I10) which never
    // references it. Every quote the sheet produced was 20 EUR/person short.
    const withMaterials = calculateGroupQuote(WORKBOOK_EXAMPLE);
    const asSheet = calculateGroupQuote({ ...WORKBOOK_EXAMPLE, includeMaterials: false });

    expect(withMaterials.perPerson - asSheet.perPerson).toBe(GROUP_RATES.materials);
    expect(withMaterials.perPerson).toBe(1160);
  });

  it('charges a monthly transit ticket once, not once per week', () => {
    // The sheet multiplies every ticket by the week count, so a 2-week stay on
    // a Monatsticket was billed 150 instead of 75.
    const twoWeeks = calculateGroupQuote({ ...WORKBOOK_EXAMPLE, transit: 'monthly-student' });
    expect(twoWeeks.lines.find((l) => l.key === 'transit')?.amount).toBe(75);

    // A five-week stay needs a second month.
    const fiveWeeks = calculateGroupQuote({
      ...WORKBOOK_EXAMPLE,
      weeks: 5,
      transit: 'monthly-student',
    });
    expect(fiveWeeks.lines.find((l) => l.key === 'transit')?.amount).toBe(150);
  });

  it('scales weekly components linearly with stay length', () => {
    const one = calculateGroupQuote({ ...WORKBOOK_EXAMPLE, weeks: 1 });
    const four = calculateGroupQuote({ ...WORKBOOK_EXAMPLE, weeks: 4 });

    expect(one.lines.find((l) => l.key === 'course')?.amount).toBe(145);
    expect(four.lines.find((l) => l.key === 'course')?.amount).toBe(580);
    expect(four.lines.find((l) => l.key === 'accommodation')?.amount).toBe(840);
  });

  it('flags rather than invents a price beyond the four-week table', () => {
    const long = calculateGroupQuote({ ...WORKBOOK_EXAMPLE, weeks: 6 });

    expect(long.accommodationExtrapolated).toBe(true);
    expect(long.warnings.join(' ')).toMatch(/Confirm with CASA/);
    // 840 (4wk) + 2 x 195 marginal
    expect(long.lines.find((l) => l.key === 'accommodation')?.amount).toBe(1230);
  });

  it('always adds administration and never a negative total', () => {
    const minimal = calculateGroupQuote({
      weeks: 1,
      roomType: 'double',
      includeAccommodation: false,
      includeCanteen: false,
      transit: 'none',
      culture: 'none',
    });

    expect(minimal.lines.find((l) => l.key === 'administration')?.amount).toBe(30);
    expect(minimal.perPerson).toBe(195); // 145 course + 20 materials + 30 admin
  });

  it('multiplies out to a group total only when a size is known', () => {
    expect(calculateGroupQuote(WORKBOOK_EXAMPLE).groupTotal).toBeNull();
    expect(calculateGroupQuote({ ...WORKBOOK_EXAMPLE, participants: 15 }).groupTotal).toBe(1160 * 15);
  });

  it('matches the proposed package figures in the spec doc', () => {
    // Keeps docs/GROUP_PRICING_AND_SPECIAL_COURSES.md honest — if a rate moves,
    // this fails rather than the doc quietly becoming wrong.
    const base = {
      roomType: 'double' as const,
      includeAccommodation: true,
      includeCanteen: true,
      transit: 'weekly-student' as const,
    };

    expect(calculateGroupQuote({ ...base, weeks: 1, culture: 'small' }).perPerson).toBe(575);
    expect(calculateGroupQuote({ ...base, weeks: 2, culture: 'medium' }).perPerson).toBe(1080);
    expect(calculateGroupQuote({ ...base, weeks: 2, culture: 'large' }).perPerson).toBe(1160);
  });

  it('refuses a zero-week stay instead of returning a bare admin fee', () => {
    const empty = calculateGroupQuote({ ...WORKBOOK_EXAMPLE, weeks: 0 });

    expect(empty.perPerson).toBe(0);
    expect(empty.warnings).toHaveLength(1);
  });
});
