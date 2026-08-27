import { describe, expect, it } from 'vitest';

import {
  GRUPPEN_ACTIVITIES,
  GRUPPEN_MODULES,
  GRUPPEN_PACKAGES,
  MAX_ACTIVITIES_PER_WEEK,
  fullBoardBaseTotal,
  getActivity,
  type GruppenModuleId,
  type GruppenWeeks,
} from '@/config/gruppen/packages';
import { calculateEselQuote } from '@/lib/gruppen/quote';

/**
 * These tests encode the two source documents directly, so that any edit to the
 * published prices has to be a deliberate one:
 *
 *   Gruppenreise Esel_Auswahl.xlsx     — module grid and the 16 activity prices
 *   Gruppenpakete_Stadtmusikanten.docx — the four package headline prices
 *
 * If a figure here fails, the config no longer matches what CASA quotes offline.
 */

const ALL_MODULES: GruppenModuleId[] = GRUPPEN_MODULES.map((module) => module.id);

describe('Esel module grid matches the source spreadsheet', () => {
  it.each([
    ['language-class', 150, 300, 450, 600],
    ['teaching-material', 20, 20, 25, 25],
    ['accommodation', 255, 450, 645, 840],
    ['lunch', 60, 120, 180, 240],
    ['transport', 25, 50, 65, 70],
  ] as const)('%s is priced %i / %i / %i / %i', (id, one, two, three, four) => {
    const moduleEntry = GRUPPEN_MODULES.find((entry) => entry.id === id);
    expect(moduleEntry).toBeDefined();
    expect(moduleEntry?.priceByWeeks).toEqual({ 1: one, 2: two, 3: three, 4: four });
  });

  // Row 9 of the sheet: =SUM(C4:C8) across each duration column.
  it.each([
    [1, 510],
    [2, 940],
    [3, 1365],
    [4, 1775],
  ])('all modules for %i week(s) sum to %i EUR', (weeks, expected) => {
    expect(fullBoardBaseTotal(weeks as GruppenWeeks)).toBe(expected);
  });
});

describe('cultural activity prices match the source spreadsheet', () => {
  it('carries all sixteen activities at the listed price', () => {
    expect(GRUPPEN_ACTIVITIES).toHaveLength(16);

    const expected: Record<string, number> = {
      cityrallye: 3,
      yoga: 3,
      'radio-bremen': 3,
      stadtfuehrung: 5,
      botanika: 7,
      rathausfuehrung: 10,
      kunsthalle: 10,
      weserstadion: 12,
      universum: 14,
      'union-brauerei': 20,
      nachtwaechter: 25,
      hafenrundfahrt: 27,
      klimahaus: 30,
      auswandererhaus: 30,
      'daytrip-hamburg': 50,
      'daytrip-luebeck': 70,
    };

    for (const [id, price] of Object.entries(expected)) {
      expect(getActivity(id as never).price).toBe(price);
    }
  });
});

describe('calculateEselQuote', () => {
  it('prices a full two-week stay with no activities at the sheet subtotal', () => {
    const quote = calculateEselQuote({
      weeks: 2,
      participants: 1,
      modules: ALL_MODULES,
      activities: [],
    });

    expect(quote.moduleSubtotal).toBe(940);
    expect(quote.activitySubtotal).toBe(0);
    expect(quote.perPerson).toBe(940);
    expect(quote.teachingUnits).toBe(40);
  });

  it('always bills the language class even when it is not selected', () => {
    const quote = calculateEselQuote({
      weeks: 1,
      participants: 1,
      modules: [],
      activities: [],
    });

    expect(quote.moduleLines).toHaveLength(1);
    expect(quote.perPerson).toBe(150);
  });

  it('drops the modules a group has already arranged itself', () => {
    // Own accommodation and own transport: 150 + 20 + 60 = 230.
    const quote = calculateEselQuote({
      weeks: 1,
      participants: 1,
      modules: ['language-class', 'teaching-material', 'lunch'],
      activities: [],
    });

    expect(quote.perPerson).toBe(230);
  });

  it('adds activity prices per person and multiplies only at the group total', () => {
    const quote = calculateEselQuote({
      weeks: 1,
      participants: 20,
      modules: ALL_MODULES,
      activities: ['cityrallye', 'weserstadion', 'universum'],
    });

    expect(quote.activitySubtotal).toBe(3 + 12 + 14);
    expect(quote.perPerson).toBe(510 + 29);
    expect(quote.groupTotal).toBe((510 + 29) * 20);
  });

  it('ignores a duplicate activity instead of billing it twice', () => {
    const quote = calculateEselQuote({
      weeks: 1,
      participants: 1,
      modules: [],
      activities: ['klimahaus', 'klimahaus'],
    });

    expect(quote.activityLines).toHaveLength(1);
    expect(quote.activitySubtotal).toBe(30);
  });

  it('reports the five-per-week allowance without clamping the selection', () => {
    const six = GRUPPEN_ACTIVITIES.slice(0, 6).map((activity) => activity.id);
    const quote = calculateEselQuote({
      weeks: 1,
      participants: 1,
      modules: [],
      activities: six,
    });

    expect(quote.activityAllowance).toBe(MAX_ACTIVITIES_PER_WEEK);
    expect(quote.activityLines).toHaveLength(6);
    expect(quote.overActivityAllowance).toBe(true);
    expect(quote.activitiesRemaining).toBe(-1);
  });

  it('treats a zero or negative head count as a single participant', () => {
    const quote = calculateEselQuote({
      weeks: 1,
      participants: 0,
      modules: ALL_MODULES,
      activities: [],
    });

    expect(quote.groupTotal).toBe(510);
  });
});

describe('fixed packages match the source catalogue', () => {
  it.each([
    ['hahn', 1, 595, 4],
    ['katze', 2, 1130, 8],
    ['hund', 2, 1300, 8],
  ] as const)('%s is %i week(s), from %i EUR, with %i activities', (slug, weeks, price, count) => {
    const pkg = GRUPPEN_PACKAGES.find((entry) => entry.slug === slug);

    expect(pkg).toBeDefined();
    expect(pkg?.weeks).toBe(weeks);
    expect(pkg?.priceFrom).toBe(price);
    expect(pkg?.activities).toHaveLength(count);
  });

  it('lists no activity twice inside a package', () => {
    // The source docx lists Weserstadion twice under Hund; the catalogue must not.
    for (const pkg of GRUPPEN_PACKAGES) {
      expect(new Set(pkg.activities).size).toBe(pkg.activities.length);
    }
  });

  it('keeps every package activity within the five-per-week allowance', () => {
    for (const pkg of GRUPPEN_PACKAGES) {
      if (!pkg.weeks) continue;
      expect(pkg.activities.length).toBeLessThanOrEqual(pkg.weeks * MAX_ACTIVITIES_PER_WEEK);
    }
  });

  it('prices every fixed package at or above its a-la-carte equivalent', () => {
    for (const pkg of GRUPPEN_PACKAGES) {
      if (!pkg.weeks || pkg.priceFrom === null) continue;

      const aLaCarte = calculateEselQuote({
        weeks: pkg.weeks,
        participants: 1,
        modules: ALL_MODULES,
        activities: [...pkg.activities],
      });

      expect(pkg.priceFrom).toBeGreaterThanOrEqual(aLaCarte.perPerson);
    }
  });

  it('places the four animals in monument order with no gaps', () => {
    const positions = GRUPPEN_PACKAGES.map((entry) => entry.stackPosition).sort();
    expect(positions).toEqual([1, 2, 3, 4]);
  });
});
