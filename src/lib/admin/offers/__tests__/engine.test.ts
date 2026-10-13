import { describe, expect, it } from 'vitest';

import { calculateEselQuote } from '@/lib/gruppen/quote';

import { buildLines, computeTotals, measure, pricedWeeks, type StayInput } from '../engine';
import { stayLength } from '../stay';
import { DEFAULT_STAY, type StayChoices } from '../types';

const ALL = { course: true, materials: true, accommodation: true, lunch: true, transport: true };

const input = (choices: Partial<StayChoices> = {}, rest: Partial<StayInput> = {}): StayInput => ({
  kind: 'group',
  language: 'en',
  arrival: '2027-04-11',
  departure: '2027-04-24',
  participants: 18,
  escorts: 0,
  stay: { choices: { ...DEFAULT_STAY, ...choices }, overrides: {}, manual: [] },
  ...rest,
});

const byKey = (lines: ReturnType<typeof buildLines>) => Object.fromEntries(lines.map((l) => [`${l.audience}:${l.key}`, l.amount]));

describe('stay length', () => {
  it('prices 13 nights as two weeks, and a Sunday-to-Saturday week as one', () => {
    expect(stayLength('2027-04-11', '2027-04-24')).toEqual({ nights: 13, weeks: 2 });
    expect(stayLength('2027-04-11', '2027-04-17')).toEqual({ nights: 6, weeks: 1 });
  });

  it('counts calendar days across the clock change, and needs two dates in order', () => {
    expect(stayLength('2026-10-18', '2026-10-31')).toEqual({ nights: 13, weeks: 2 });
    expect(stayLength('2027-04-24', '2027-04-11')).toBeNull();
    expect(stayLength('2027-02-30', '2027-03-04')).toBeNull();
  });

  it('without dates, takes a fixed package’s own length, or the weeks typed for Esel', () => {
    expect(measure({ arrival: null, departure: null, stay: input({ package: 'hahn' }).stay })).toEqual({ nights: 6, weeks: 1, fromDates: false });
    expect(measure({ arrival: null, departure: null, stay: input({ package: 'esel', weeks: 3 }).stay })).toEqual({ nights: 20, weeks: 3, fromDates: false });
  });

  it('prices a fixed package for its own weeks, whatever the dates say', () => {
    expect(pricedWeeks(input({ package: 'hahn' }))).toBe(1);
    expect(pricedWeeks(input({ package: 'esel' }, { departure: '2027-05-01' }))).toBe(3);
  });
});

describe('a fixed package (Hahn, Katze, Hund)', () => {
  it('is one price per person, and lists what it includes without amounts', () => {
    const i = input({ package: 'katze' });
    const lines = buildLines(i);
    expect(lines[0]).toMatchObject({ key: 'package', chargeType: 'group_package', description: 'Katze package · 2 weeks of exploring', amount: 1130, included: false });
    expect(lines.slice(1).map((l) => [l.key, l.included, l.amount])).toEqual([
      ['inc:course', true, 0],
      ['inc:accommodation', true, 0],
      ['inc:lunch', true, 0],
      ['inc:transport', true, 0],
      ['inc:materials', true, 0],
      ['inc:programme', true, 0],
    ]);
    expect(computeTotals(i, lines)).toMatchObject({ perParticipant: 1130, groupTotal: 18 * 1130 });
  });

  it('names its afternoons on the letter', () => {
    const programme = buildLines(input({ package: 'hahn' })).find((l) => l.key === 'inc:programme')!;
    expect(programme.description).toBe('Culture programme: Cityrallye, Weserstadion, Radio Bremen, Universum');
  });

  it('writes the package in the offer’s language', () => {
    expect(buildLines(input({ package: 'hund' }, { language: 'de' }))[0].description).toBe('Paket Hund · 2 Wochen plus Hamburg');
  });

  it('keeps a price typed over the package price, shown against the list price', () => {
    const i = input({ package: 'katze' });
    i.stay.overrides['participant:package'] = { unitAmount: 1100 };
    const pkg = buildLines(i)[0];
    expect(pkg).toMatchObject({ unitAmount: 1100, listUnitAmount: 1130, amount: 1100 });
  });

  it('prices escorts from the same blocks, without the course: Hahn, one week', () => {
    const i = input({ package: 'hahn' }, { departure: '2027-04-17', escorts: 2 });
    const lines = buildLines(i).filter((l) => l.audience === 'escort');
    expect(byKey(lines)).toEqual({
      'escort:accommodation': 255,
      'escort:lunch': 60,
      'escort:transport': 25,
      'escort:programme': 3 + 12 + 3 + 14,
    });
    expect(computeTotals(i, buildLines(i))).toMatchObject({ perEscort: 372, groupTotal: 18 * 595 + 2 * 372 });
  });
});

describe('Esel, built by the group', () => {
  it('agrees with the groups page’s own quote, to the euro', () => {
    const activities = ['stadtfuehrung', 'kunsthalle', 'universum', 'hafenrundfahrt'];
    const i = input({ package: 'esel', modules: ALL, activities });
    const ours = computeTotals(i, buildLines(i)).perParticipant;
    const site = calculateEselQuote({ weeks: 2, participants: 18, modules: ['teaching-material', 'accommodation', 'lunch', 'transport'], activities: activities as never });
    expect(ours).toBe(site.perPerson);
    expect(ours).toBe(300 + 20 + 450 + 120 + 50 + (5 + 10 + 14 + 27));
  });

  it('leaves out a block the group arranges itself, for participants and escorts', () => {
    const i = input({ package: 'esel', modules: { ...ALL, accommodation: false } }, { escorts: 1 });
    expect(buildLines(i).some((l) => l.key === 'accommodation')).toBe(false);
  });

  it('has no price beyond the four weeks the sheet prices, rather than inventing one', () => {
    const lines = buildLines(input({ package: 'esel', modules: ALL }, { departure: '2027-05-15' }));
    expect(lines.find((l) => l.key === 'course')).toMatchObject({ unitAmount: null, amount: null });
  });

  it('writes the course and the stay with their real quantities', () => {
    const lines = buildLines(input({ package: 'esel', modules: ALL }, { language: 'de' }));
    expect(lines.find((l) => l.key === 'course')!.description).toBe('Deutsch-Intensivkurs, 2 Wochen, 40 UE (Mo–Fr 09:00–12:30)');
    expect(lines.find((l) => l.key === 'accommodation')!.description).toBe('Unterkunft in Gastfamilien, Doppelzimmer, Frühstück und Abendessen (13 Nächte)');
  });
});

describe('escorts', () => {
  const katze = (escortPricing: StayChoices['escortPricing'], escorts = 2) => input({ package: 'katze', escortPricing }, { escorts });
  const escortTotal = 450 + 120 + 50 + (3 + 7 + 12 + 3 + 10 + 14 + 30 + 25);

  it('who pay their own are in the group total', () => {
    const i = katze('paid');
    expect(computeTotals(i, buildLines(i))).toMatchObject({ perEscort: escortTotal, groupTotal: 18 * 1130 + 2 * escortTotal });
  });

  it('carried by the group are spread over the participants, rounded up to the euro', () => {
    const i = katze('shared');
    const lines = buildLines(i);
    const share = lines.find((l) => l.key === 'escort_share')!;
    expect(share.amount).toBe(Math.ceil((escortTotal * 2) / 18));
    const totals = computeTotals(i, lines);
    expect(totals.groupTotal).toBe(18 * (1130 + share.amount!));
    expect(totals.groupTotal! - 18 * 1130).toBeGreaterThanOrEqual(2 * escortTotal);
  });

  it('who come free show what they cost CASA, outside the group total', () => {
    const i = katze('free', 1);
    expect(computeTotals(i, buildLines(i))).toMatchObject({ carriedByCasa: escortTotal, groupTotal: 18 * 1130 });
  });
});

describe('typed lines and individual offers', () => {
  it('adds typed lines after the computed ones, for the right person', () => {
    const i = input({ package: 'katze' }, { escorts: 1 });
    i.stay.manual = [{ key: 'manual:visits', audience: 'participant', chargeType: 'additional_costs', description: 'Company visits', quantity: 2, unitAmount: 160 }];
    const lines = buildLines(i);
    const visits = lines.find((l) => l.key === 'manual:visits')!;
    expect(visits).toMatchObject({ amount: 320, manual: true });
    expect(lines.indexOf(visits)).toBeLessThan(lines.findIndex((l) => l.audience === 'escort'));
  });

  it('an individual offer has only its typed lines and one total', () => {
    const i = input({}, { kind: 'individual', participants: null });
    i.stay.manual = [
      { key: 'manual:course', audience: 'participant', chargeType: 'tuition', description: 'Intensivkurs A2', quantity: 1, unitAmount: 520 },
      { key: 'manual:books', audience: 'participant', chargeType: 'books', description: 'Netzwerk neu A2.1', quantity: 1, unitAmount: 26.99 },
    ];
    const lines = buildLines(i);
    expect(lines).toHaveLength(2);
    expect(computeTotals(i, lines)).toMatchObject({ perParticipant: 546.99, groupTotal: 546.99, perEscort: null });
  });
});
