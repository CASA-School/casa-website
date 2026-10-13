import { describe, expect, it } from 'vitest';

import { offerChecks, hasProblems } from '../checks';
import { buildLetter, formatDateRange, formatMoney, salutation } from '../document';
import { buildLines, computeTotals, type GroupRateCard } from '../engine';
import { choicesFromBrief, participantsFromBrief } from '../from-enquiry';
import { normaliseStay, parseOfferDraft } from '../schema';
import { DEFAULT_STAY, type OfferDraft } from '../types';

const rate = (id: string, amount: number, unit: 'item' | 'week' | 'person_week' | 'month' = 'item') => ({ id, amount, unit });
const CARD: GroupRateCard = {
  tuition: rate('t', 145, 'person_week'),
  materials: rate('m', 20),
  handling: rate('h', 30),
  canteen: rate('c', 60, 'person_week'),
  culture: rate('k', 60, 'person_week'),
  room: rate('r', 450),
  escortRoom: rate('e', 550),
  tickets: { 'student-week': rate('sw', 25, 'week'), 'student-month': rate('sm', 75, 'month'), 'adult-week': rate('aw', 35, 'week'), 'adult-month': rate('am', 100, 'month') },
};

const draft = (patch: Partial<OfferDraft> = {}): OfferDraft => ({
  kind: 'group',
  language: 'de',
  presentation: 'itemised',
  title: 'Deutschkurs mit Kultur',
  groupName: 'Treviso 2027',
  organisationId: null,
  recipientName: 'Vivimondo srl',
  contactSalutation: 'ms',
  contactFirstName: 'Fiorella',
  contactLastName: 'Massari',
  contactEmail: 'gruppi@example.it',
  address: 'Vicolo del Vento 2\n31100 Treviso',
  countryCode: 'IT',
  arrival: '2027-04-11',
  departure: '2027-04-24',
  participants: 18,
  escorts: 2,
  stay: { choices: { ...DEFAULT_STAY }, overrides: {}, manual: [] },
  intro: null,
  closing: null,
  note: null,
  validUntil: '2026-11-10',
  ownerId: null,
  ...patch,
});

const letterFor = (d: OfferDraft, version = 1) => {
  const lines = buildLines(d, CARD);
  return buildLetter(d, lines, computeTotals(d, lines), {
    number: '2026-014',
    version,
    date: '2026-10-13',
    countryName: 'Italien',
    signatureName: 'Ina Eismann',
  });
};

describe('the offer letter', () => {
  it('addresses the reader with du, by first name', () => {
    expect(salutation({ language: 'de', contactSalutation: 'ms', contactFirstName: 'Fiorella', contactLastName: '' })).toBe('Liebe Fiorella,');
    expect(salutation({ language: 'de', contactSalutation: 'mr', contactFirstName: 'Marco', contactLastName: '' })).toBe('Lieber Marco,');
    expect(salutation({ language: 'de', contactSalutation: 'none', contactFirstName: '', contactLastName: '' })).toBe('Hallo,');
    expect(salutation({ language: 'en', contactSalutation: 'ms', contactFirstName: '', contactLastName: 'Moffa' })).toBe('Dear Ms Moffa,');
    expect(letterFor(draft()).intro).toContain('deine Anfrage');
    expect(letterFor(draft()).intro).not.toMatch(/\bIhre?\b/);
  });

  it('numbers the offer from its own number, not the year it is printed in', () => {
    expect(letterFor(draft()).subject).toBe('Angebot Nr. 2026-014 · Deutschkurs mit Kultur');
    expect(letterFor(draft(), 2).subject).toBe('Angebot Nr. 2026-014 · Deutschkurs mit Kultur · 2. Fassung');
  });

  it('says who, when and how many — what FileMaker letters never did', () => {
    const l = letterFor(draft());
    expect(l.heading).toBe('Treviso 2027 · Deutschkurs mit Kultur');
    expect(l.facts).toBe('11.–24.04.2027 · 13 Nächte · 18 Teilnehmende, 2 Begleitpersonen');
    expect(l.validity).toBe('Dieses Angebot gilt bis zum 10.11.2026.');
    expect(l.groupTotal?.label).toBe('Gesamtpreis für die Gruppe (18 Teilnehmende, 2 Begleitpersonen)');
  });

  it('prints escorts who pay as their own block, and the group total with them', () => {
    const l = letterFor(draft());
    expect(l.blocks.map((b) => b.heading)).toEqual(['Teilnehmende', 'Begleitpersonen']);
    expect(l.blocks[0].totalLabel).toBe('Gesamt pro Person');
    expect(l.groupTotal?.amount).toBe(formatMoney(18 * 1080 + 2 * 890, 'de'));
  });

  it('says so when the escorts are free or carried by the group, and prints no escort prices', () => {
    const free = letterFor(draft({ stay: { choices: { ...DEFAULT_STAY, escortPricing: 'free' }, overrides: {}, manual: [] } }));
    expect(free.blocks).toHaveLength(1);
    expect(free.escortSentence).toBe('Die 2 Begleitpersonen nehmen kostenfrei teil.');
    const shared = letterFor(draft({ stay: { choices: { ...DEFAULT_STAY, escortPricing: 'shared' }, overrides: {}, manual: [] } }));
    expect(shared.blocks).toHaveLength(1);
    expect(shared.blocks[0].lines.map((x) => x.text)).toContain('Anteil an den Kosten der Begleitpersonen');
  });

  it('lists what is included without prices for a package price', () => {
    const l = letterFor(draft({ presentation: 'package', escorts: 0 }));
    expect(l.blocks[0].heading).toBe('Im Preis enthalten');
    expect(l.blocks[0].lines.every((x) => x.amount == null)).toBe(true);
    expect(l.blocks[0].total).toBe(formatMoney(1080, 'de'));
  });

  it('writes an English offer in English, the country in the reader’s language, and no country for Germany', () => {
    const en = letterFor(draft({ language: 'en' }));
    expect(en.subject.startsWith('Offer no. 2026-014')).toBe(true);
    expect(en.facts).toBe('11–24 April 2027 · 13 nights · 18 participants, 2 escorts');
    expect(en.signature).toEqual(['Ina Eismann', 'CASA – Internationale Sprachschule Bremen']);
    expect(letterFor(draft()).recipient).toEqual(['Vivimondo srl', 'Fiorella Massari', 'Vicolo del Vento 2', '31100 Treviso', 'Italien']);
    expect(letterFor(draft({ countryCode: 'DE' })).recipient).not.toContain('Italien');
  });

  it('never signs as accounting, and never prints the tax line FileMaker gets wrong', () => {
    const l = letterFor(draft());
    expect(l.signature.join(' ')).not.toMatch(/Buchhaltung/);
    expect(l.footer.join(' ')).not.toMatch(/KStG|umsatzsteuerbefreit/);
  });

  it('formats date ranges across months and years', () => {
    expect(formatDateRange('2027-03-28', '2027-04-10', 'de')).toBe('28.03.–10.04.2027');
    expect(formatDateRange('2026-12-28', '2027-01-03', 'en')).toBe('28 December 2026 – 3 January 2027');
  });
});

describe('checks before sending', () => {
  const run = (d: OfferDraft) => offerChecks(d, buildLines(d, CARD), '2026-10-13');

  it('lets a complete offer go', () => {
    expect(hasProblems(run(draft()))).toBe(false);
  });

  it('stops an offer with no participants, no title, or a line without a price', () => {
    expect(run(draft({ participants: null })).map((c) => c.message)).toContain('Number of participants missing');
    expect(run(draft({ title: '' })).map((c) => c.message)).toContain('No title');
    const noRoom = draft();
    const lines = buildLines(noRoom, { ...CARD, room: null });
    expect(offerChecks(noRoom, lines, '2026-10-13').some((c) => c.level === 'problem' && c.message.startsWith('No price for'))).toBe(true);
  });

  it('stops an offer whose validity has passed, and an empty one (FileMaker sent 37622 three times)', () => {
    expect(hasProblems(run(draft({ validUntil: '2026-10-01' })))).toBe(true);
    const empty = draft({ kind: 'individual' });
    expect(offerChecks(empty, [], '2026-10-13').map((c) => c.message)).toContain('No prices on the offer');
  });

  it('points out a price typed over the price list, without stopping it', () => {
    const d = draft();
    d.stay.overrides['participant:tuition'] = { unitAmount: 140 };
    const checks = run(d);
    expect(hasProblems(checks)).toBe(false);
    expect(checks.find((c) => c.level === 'hint' && c.message.includes('140 € instead of 145 €'))).toBeTruthy();
  });
});

describe('from a group enquiry', () => {
  it('reads the organiser brief into the builder', () => {
    const brief = {
      groupSize: '24',
      durationWeeks: 2,
      weeklyLessons: 25,
      accommodation: 'single',
      meals: 'half-board',
      transport: 'monthly',
      cultureProgramme: 'large',
      ageBand: '14-17',
    };
    expect(participantsFromBrief(brief)).toBe(24);
    expect(choicesFromBrief(brief)).toMatchObject({
      weeks: 2,
      lessonsPerWeek: 25,
      accommodation: true,
      room: 'single',
      canteen: false,
      transit: true,
      fare: 'student',
      culture: 'large',
    });
  });

  it('keeps the defaults for what the organiser left open, and puts adults on the adult fare', () => {
    expect(choicesFromBrief({ accommodation: 'undecided', ageBand: '26-plus' })).toMatchObject({ room: 'double', fare: 'adult' });
    expect(choicesFromBrief(null)).toEqual(DEFAULT_STAY);
  });
});

describe('what the editor may write', () => {
  it('accepts a whole draft and refuses departure before arrival', () => {
    expect(parseOfferDraft(draft()).ok).toBe(true);
    const bad = parseOfferDraft(draft({ arrival: '2027-04-24', departure: '2027-04-11' }));
    expect(bad).toEqual({ ok: false, error: 'departure: Departure must be after arrival' });
  });

  it('refuses a typed line with a key the builder does not make', () => {
    const d = draft();
    d.stay.manual = [{ key: 'tuition', audience: 'participant', chargeType: 'tuition', description: 'x', quantity: 1, unitAmount: 1 }];
    expect(parseOfferDraft(d).ok).toBe(false);
  });

  it('opens an old stay with today’s defaults for what it lacks', () => {
    expect(normaliseStay({ choices: { room: 'single' } }).choices).toEqual({ ...DEFAULT_STAY, room: 'single' });
    expect(normaliseStay('garbage')).toEqual({ choices: DEFAULT_STAY, overrides: {}, manual: [] });
  });
});
