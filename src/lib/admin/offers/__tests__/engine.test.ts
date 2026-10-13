import { describe, expect, it } from 'vitest';

import { buildLines, cheapestTickets, computeTotals, measure, type GroupRateCard, type StayInput } from '../engine';
import { stayLength } from '../stay';
import { DEFAULT_STAY, type StayChoices } from '../types';

/** The group price list as seeded (db/seeds/0007), for a two-week stay. */
const rate = (id: string, amount: number, unit: 'item' | 'week' | 'person_week' | 'month' = 'item') => ({ id, amount, unit });
const card = (weeks = 2): GroupRateCard => ({
  tuition: rate('tuition', 145, 'person_week'),
  materials: rate('materials', 20),
  handling: rate('handling', 30),
  canteen: rate('canteen', 60, 'person_week'),
  culture: rate('culture', 60, 'person_week'),
  room: rate('room', ({ 1: 255, 2: 450, 3: 645, 4: 840 } as Record<number, number>)[weeks] ?? 0),
  escortRoom: rate('escort-room', ({ 1: 265, 2: 550, 3: 805, 4: 1060 } as Record<number, number>)[weeks] ?? 0),
  tickets: {
    'student-week': rate('sw', 25, 'week'),
    'student-month': rate('sm', 75, 'month'),
    'adult-week': rate('aw', 35, 'week'),
    'adult-month': rate('am', 100, 'month'),
  },
});

const input = (choices: Partial<StayChoices> = {}, rest: Partial<StayInput> = {}): StayInput => ({
  kind: 'group',
  language: 'de',
  arrival: '2027-04-11',
  departure: '2027-04-24',
  participants: 18,
  escorts: 0,
  stay: { choices: { ...DEFAULT_STAY, ...choices }, overrides: {}, manual: [] },
  ...rest,
});

const amounts = (lines: ReturnType<typeof buildLines>) => Object.fromEntries(lines.map((l) => [`${l.audience}:${l.key}`, l.amount]));

describe('stay length', () => {
  it('prices 13 nights as two weeks, and a Sunday-to-Saturday week as one', () => {
    expect(stayLength('2027-04-11', '2027-04-24')).toEqual({ nights: 13, weeks: 2 });
    expect(stayLength('2027-04-11', '2027-04-17')).toEqual({ nights: 6, weeks: 1 });
  });

  it('counts calendar days across the clock change', () => {
    expect(stayLength('2026-10-18', '2026-10-31')).toEqual({ nights: 13, weeks: 2 });
  });

  it('has no length without two valid dates in order', () => {
    expect(stayLength('2027-04-24', '2027-04-11')).toBeNull();
    expect(stayLength('2027-02-30', '2027-03-04')).toBeNull();
    expect(stayLength(null, '2027-03-04')).toBeNull();
  });

  it('falls back to the weeks typed when there are no dates', () => {
    expect(measure({ arrival: null, departure: null, stay: input({ weeks: 3 }).stay })).toEqual({
      nights: 20,
      weeks: 3,
      courseWeeks: 3,
      fromDates: false,
    });
  });
});

describe('tickets', () => {
  it('buys the cheapest mix that covers the stay', () => {
    expect(cheapestTickets(2, 25, 75)).toEqual({ monthly: 0, weekly: 2, total: 50 });
    expect(cheapestTickets(3, 25, 75)).toEqual({ monthly: 1, weekly: 0, total: 75 });
    expect(cheapestTickets(4, 25, 75)).toEqual({ monthly: 1, weekly: 0, total: 75 });
    expect(cheapestTickets(5, 35, 100)).toEqual({ monthly: 1, weekly: 1, total: 135 });
    expect(cheapestTickets(9, 25, 75)).toEqual({ monthly: 2, weekly: 1, total: 175 });
  });

  it('never charges a monthly ticket per week (the workbook did: 150 for two weeks)', () => {
    expect(cheapestTickets(2, null, 75)).toEqual({ monthly: 1, weekly: 0, total: 75 });
  });

  it('has nothing to offer without any ticket price', () => {
    expect(cheapestTickets(2, null, null)).toBeNull();
  });
});

describe('a group offer', () => {
  it('reproduces the workbook example with the materials it forgot: 1,160 € per person', () => {
    const i = input({ culture: 'large' });
    const c = { ...card(2), culture: rate('culture', 100, 'person_week') };
    const lines = buildLines(i, c);
    expect(amounts(lines)).toEqual({
      'participant:tuition': 290,
      'participant:materials': 20,
      'participant:accommodation': 450,
      'participant:canteen': 120,
      'participant:transit': 50,
      'participant:culture': 200,
      'participant:handling': 30,
    });
    expect(computeTotals(i, lines)).toMatchObject({ perParticipant: 1160, groupTotal: 20880 });
  });

  it("matches Ina's offer 37630 once her course price is typed over the list price", () => {
    const i = input({ materials: false });
    i.stay.overrides['participant:tuition'] = { unitAmount: 140 };
    const lines = buildLines(i, card(2));
    const tuition = lines.find((l) => l.key === 'tuition')!;
    expect(tuition).toMatchObject({ quantity: 2, unitAmount: 140, listUnitAmount: 145, amount: 280 });
    expect(computeTotals(i, lines).perParticipant).toBe(1050);
  });

  it('keeps the typed price when the stay changes, and recomputes the quantity', () => {
    const i = input({ materials: false }, { departure: '2027-05-01' });
    i.stay.overrides['participant:tuition'] = { unitAmount: 140 };
    const lines = buildLines(i, card(3));
    expect(lines.find((l) => l.key === 'tuition')).toMatchObject({ quantity: 3, amount: 420 });
    expect(lines.find((l) => l.key === 'accommodation')).toMatchObject({ amount: 645 });
  });

  it('writes every line in the offer’s language from one source', () => {
    const de = buildLines(input(), card(2)).map((l) => l.description);
    const en = buildLines(input({}, { language: 'en' }), card(2)).map((l) => l.description);
    expect(de[0]).toBe('Deutschkurs: 2 Wochen, 20 UE pro Woche');
    expect(en[0]).toBe('German course: 2 weeks, 20 lessons a week');
    expect(de).toContain('Unterkunft in Gastfamilien, Doppelzimmer, Halbpension (13 Nächte)');
    expect(en).toContain('Handling fee');
    expect(de).toContain('Fahrkarte ÖPNV: 2 Wochentickets');
  });

  it('leaves a line without a price when the price list has none, rather than inventing one', () => {
    const lines = buildLines(input({}, { departure: '2027-05-15' }), { ...card(2), room: null });
    expect(lines.find((l) => l.key === 'accommodation')).toMatchObject({ unitAmount: null, amount: null });
  });

  it('gives the escort a single room, an adult ticket, and no course', () => {
    const lines = buildLines(input({}, { escorts: 2 }), card(2)).filter((l) => l.audience === 'escort');
    expect(lines.map((l) => l.key)).toEqual(['accommodation', 'canteen', 'transit', 'culture', 'handling']);
    expect(lines.find((l) => l.key === 'accommodation')!.amount).toBe(550);
    expect(lines.find((l) => l.key === 'transit')!.amount).toBe(70);
  });

  it('prices escorts who pay their own in the group total', () => {
    const i = input({}, { escorts: 2 });
    const totals = computeTotals(i, buildLines(i, card(2)));
    expect(totals.perEscort).toBe(550 + 120 + 70 + 120 + 30);
    expect(totals.groupTotal).toBe(18 * totals.perParticipant! + 2 * totals.perEscort!);
  });

  it('spreads the escorts over the participants, rounded up to the euro, when the group carries them', () => {
    const i = input({ escortPricing: 'shared' }, { escorts: 2 });
    const lines = buildLines(i, card(2));
    const share = lines.find((l) => l.key === 'escort_share')!;
    expect(share.amount).toBe(Math.ceil((890 * 2) / 18));
    const totals = computeTotals(i, lines);
    expect(totals.escortShare).toBe(share.amount);
    expect(totals.groupTotal).toBe(18 * totals.perParticipant!);
    expect(totals.groupTotal! - 18 * (totals.perParticipant! - share.amount!)).toBeGreaterThanOrEqual(2 * 890);
  });

  it('shows what free escorts cost CASA, outside the group total', () => {
    const i = input({ escortPricing: 'free' }, { escorts: 1 });
    const totals = computeTotals(i, buildLines(i, card(2)));
    expect(totals.carriedByCasa).toBe(totals.perEscort);
    expect(totals.groupTotal).toBe(18 * totals.perParticipant!);
  });

  it('adds typed lines after the computed ones, for the right person', () => {
    const i = input({}, { escorts: 1 });
    i.stay.manual = [
      { key: 'manual:visits', audience: 'participant', chargeType: 'additional_costs', description: 'Company visits', quantity: 2, unitAmount: 160 },
    ];
    const lines = buildLines(i, card(2));
    const visits = lines.find((l) => l.key === 'manual:visits')!;
    expect(visits).toMatchObject({ amount: 320, manual: true, audience: 'participant' });
    expect(lines.indexOf(visits)).toBeLessThan(lines.findIndex((l) => l.audience === 'escort'));
  });
});

describe('an individual offer', () => {
  it('has only the typed lines and one total', () => {
    const i = input({}, { kind: 'individual', participants: null });
    i.stay.manual = [
      { key: 'manual:course', audience: 'participant', chargeType: 'tuition', description: 'Intensivkurs A2', quantity: 1, unitAmount: 520 },
      { key: 'manual:books', audience: 'participant', chargeType: 'books', description: 'Netzwerk neu A2.1', quantity: 1, unitAmount: 26.99 },
    ];
    const lines = buildLines(i, card(2));
    expect(lines).toHaveLength(2);
    expect(computeTotals(i, lines)).toMatchObject({ perParticipant: 546.99, groupTotal: 546.99, perEscort: null });
  });
});
