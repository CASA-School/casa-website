import { describe, expect, it } from 'vitest';

import { formatDateRange, formatMoney, salutation } from '../../letters/format';
import { readLetter } from '../../letters/read';
import { subjectLine, textPart, type Letter, type LetterPart } from '../../letters/types';
import { offerChecks, hasProblems } from '../checks';
import { offerLetter } from '../document';
import { buildLines, computeTotals } from '../engine';
import { choicesFromBrief, participantsFromBrief } from '../from-enquiry';
import { normaliseStay, parseOfferDraft } from '../schema';
import { DEFAULT_STAY, type OfferDraft, type StayChoices } from '../types';

const ALL = { course: true, materials: true, accommodation: true, lunch: true, transport: true };
const KATZE_ESCORT = 450 + 120 + 50 + (3 + 7 + 12 + 3 + 10 + 14 + 30 + 25);

const draft = (patch: Partial<OfferDraft> = {}, choices: Partial<StayChoices> = {}): OfferDraft => ({
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
  stay: { choices: { ...DEFAULT_STAY, ...choices }, overrides: {}, manual: [] },
  intro: null,
  closing: null,
  note: null,
  validUntil: '2026-11-10',
  ownerId: null,
  ...patch,
});

const letterFor = (d: OfferDraft, version = 1) => {
  const lines = buildLines(d);
  return offerLetter(d, lines, computeTotals(d, lines), {
    number: '2026-014',
    version,
    date: '2026-10-13',
    countryName: 'Italien',
    signatureName: 'Ina Eismann',
  });
};

type Table = Extract<LetterPart, { type: 'table' }>;
const tables = (l: Letter) => l.body.filter((p): p is Table => p.type === 'table');
const heading = (l: Letter) => l.body.find((p): p is Extract<LetterPart, { type: 'heading' }> => p.type === 'heading');
const sum = (l: Letter) => l.body.find((p): p is Extract<LetterPart, { type: 'sum' }> => p.type === 'sum');
const sentences = (l: Letter) => l.body.flatMap((p) => (p.type === 'text' && p.slot === null ? [p.text] : []));

describe('the offer letter', () => {
  it('addresses the reader with du, by first name', () => {
    expect(salutation({ language: 'de', salutation: 'ms', firstName: 'Fiorella', lastName: '' })).toBe('Liebe Fiorella,');
    expect(salutation({ language: 'de', salutation: 'mr', firstName: 'Marco', lastName: '' })).toBe('Lieber Marco,');
    expect(salutation({ language: 'de', salutation: 'none', firstName: '', lastName: '' })).toBe('Hallo,');
    expect(salutation({ language: 'en', salutation: 'ms', firstName: '', lastName: 'Moffa' })).toBe('Dear Ms Moffa,');
    expect(textPart(letterFor(draft()), 'intro')).toContain('deine Anfrage');
    expect(textPart(letterFor(draft()), 'intro')).not.toMatch(/\bIhre?\b/);
  });

  it('numbers the offer from its own number, not the year it is printed in', () => {
    expect(subjectLine(letterFor(draft()))).toBe('Angebot Nr. 2026-014 · Deutschkurs mit Kultur');
    expect(subjectLine(letterFor(draft(), 2))).toBe('Angebot Nr. 2026-014 · Deutschkurs mit Kultur · 2. Fassung');
  });

  it('says who, when and how many — what FileMaker letters never did', () => {
    const l = letterFor(draft());
    expect(heading(l)).toMatchObject({ text: 'Treviso 2027 · Deutschkurs mit Kultur', detail: '11.–24.04.2027 · 13 Nächte · 18 Teilnehmende, 2 Begleitpersonen' });
    expect(textPart(l, 'validity')).toBe('Dieses Angebot gilt bis zum 10.11.2026.');
    expect(sum(l)?.label).toBe('Gesamtpreis für die Gruppe (18 Teilnehmende, 2 Begleitpersonen)');
  });

  it('shows a package with its price and what it includes as „inklusive"', () => {
    const rows = tables(letterFor(draft()))[0].rows;
    expect(rows[0]).toMatchObject({ text: 'Paket Katze · 2 Wochen Erkunden', amount: formatMoney(1130, 'de'), ref: 'participant:package' });
    expect(rows.slice(1).every((x) => x.amount === 'inklusive')).toBe(true);
  });

  it('prints escorts who pay as their own block, and the group total with them', () => {
    const l = letterFor(draft());
    expect(tables(l).map((b) => b.heading)).toEqual(['Teilnehmende', 'Begleitpersonen']);
    expect(tables(l)[0].total?.label).toBe('Gesamt pro Person');
    expect(sum(l)?.amount).toBe(formatMoney(18 * 1130 + 2 * KATZE_ESCORT, 'de'));
  });

  it('says so when the escorts are free or carried by the group, and prints no escort prices', () => {
    const free = letterFor(draft({}, { escortPricing: 'free' }));
    expect(tables(free)).toHaveLength(1);
    expect(sentences(free)).toEqual(['Die 2 Begleitpersonen nehmen kostenfrei teil.']);
    const shared = letterFor(draft({}, { escortPricing: 'shared' }));
    expect(tables(shared)).toHaveLength(1);
    expect(tables(shared)[0].rows.map((x) => x.text)).toContain('Anteil an den Kosten der Begleitpersonen');
  });

  it('lists what is included without prices for one price per person', () => {
    const l = letterFor(draft({ presentation: 'package', escorts: 0 }, { package: 'esel', modules: ALL }));
    expect(tables(l)[0].heading).toBe('Im Preis enthalten');
    expect(tables(l)[0].rows.every((x) => x.amount == null)).toBe(true);
    expect(tables(l)[0].total?.amount).toBe(formatMoney(300 + 20 + 450 + 120 + 50, 'de'));
  });

  it('writes an English offer in English, the country in the reader’s language, and no country for Germany', () => {
    const en = letterFor(draft({ language: 'en' }));
    expect(subjectLine(en).startsWith('Offer no. 2026-014')).toBe(true);
    expect(heading(en)?.detail).toBe('11–24 April 2027 · 13 nights · 18 participants, 2 escorts');
    expect(en.signature).toEqual(['Ina Eismann', 'CASA – Internationale Sprachschule Bremen']);
    expect(letterFor(draft()).recipient).toEqual(['Vivimondo srl', 'Fiorella Massari', 'Vicolo del Vento 2', '31100 Treviso', 'Italien']);
    expect(letterFor(draft({ countryCode: 'DE' })).recipient).not.toContain('Italien');
  });

  it('never signs as accounting, and never prints the tax line FileMaker gets wrong', () => {
    const l = letterFor(draft());
    expect(l.signature.join(' ')).not.toMatch(/Buchhaltung/);
    expect(l.footer.join(' ')).not.toMatch(/KStG|umsatzsteuerbefreit/);
  });

  it('prices what a group wants on top of its package, and a reduction, on the letter', () => {
    const d = draft({ escorts: 0 }, { extras: ['hafenrundfahrt', 'daytrip-hamburg'] });
    d.stay.manual = [
      { key: 'manual:transfer', audience: 'participant', chargeType: 'transfer', description: 'Flughafentransfer', quantity: 1, unitAmount: 35 },
      { key: 'manual:less', audience: 'participant', chargeType: 'discount', description: 'Ermäßigung', quantity: 1, unitAmount: -20 },
    ];
    const l = letterFor(d);
    const rows = tables(l)[0].rows;
    expect(rows.find((r) => r.ref === 'participant:extras')).toMatchObject({ text: 'Zusätzliches Programm: Hafenrundfahrt, Daytrip Hamburg', amount: formatMoney(77, 'de') });
    expect(rows.find((r) => r.ref === 'participant:manual:less')?.amount).toBe(formatMoney(-20, 'de'));
    expect(tables(l)[0].total?.amount).toBe(formatMoney(1130 + 77 + 35 - 20, 'de'));
  });

  it('is kept as it went out and read back whole; a copy in another shape is refused, not half-shown', () => {
    const l = letterFor(draft());
    expect(readLetter(JSON.parse(JSON.stringify(l)))).toEqual(l);
    // What crashed the letter tab: a copy stored before the subject was split into parts.
    expect(readLetter({ ...l, subject: 'Angebot Nr. 2026-014 · Deutschkurs' })).toBeNull();
    expect(readLetter({ ...l, schema: 0 })).toBeNull();
    expect(readLetter(null)).toBeNull();
  });

  it('formats date ranges across months and years', () => {
    expect(formatDateRange('2027-03-28', '2027-04-10', 'de')).toBe('28.03.–10.04.2027');
    expect(formatDateRange('2026-12-28', '2027-01-03', 'en')).toBe('28 December 2026 – 3 January 2027');
  });
});

describe('checks before sending', () => {
  const run = (d: OfferDraft) => offerChecks(d, buildLines(d), '2026-10-13');

  it('lets a complete offer go', () => {
    expect(hasProblems(run(draft()))).toBe(false);
  });

  it('stops an offer with no participants or no title', () => {
    expect(run(draft({ participants: null })).map((c) => c.message)).toContain('Number of participants missing');
    expect(run(draft({ title: '' })).map((c) => c.message)).toContain('No title');
  });

  it('stops Esel beyond four weeks, where nothing has a price', () => {
    const messages = run(draft({ departure: '2027-05-15' }, { package: 'esel', modules: ALL })).filter((c) => c.level === 'problem').map((c) => c.message);
    expect(messages).toContain('Esel is priced up to four weeks');
    expect(messages.some((m) => m.startsWith('No price for'))).toBe(true);
  });

  it('notices when the dates and a fixed package disagree', () => {
    expect(run(draft({ departure: '2027-05-01' })).map((c) => c.message)).toContain('The package is 2 weeks, the dates 3');
  });

  it('stops an offer whose validity has passed, and an empty one (FileMaker sent 37622 three times)', () => {
    expect(hasProblems(run(draft({ validUntil: '2026-10-01' })))).toBe(true);
    expect(offerChecks(draft({ kind: 'individual' }), [], '2026-10-13').map((c) => c.message)).toContain('No prices on the offer');
  });

  it('points out a price typed over the list price, without stopping it', () => {
    const d = draft();
    d.stay.overrides['participant:package'] = { unitAmount: 1100 };
    const checks = run(d);
    expect(hasProblems(checks)).toBe(false);
    expect(checks.find((c) => c.level === 'hint' && c.message.includes('1100 € instead of 1130 €'))).toBeTruthy();
  });
});

describe('from a group enquiry', () => {
  it('makes a two-week group that takes everything a Katze', () => {
    const brief = { groupSize: '24', durationWeeks: 2, accommodation: 'double', meals: 'half-board-plus-canteen', transport: 'weekly' };
    expect(participantsFromBrief(brief)).toBe(24);
    expect(choicesFromBrief(brief)).toMatchObject({ package: 'katze', weeks: 2 });
    expect(choicesFromBrief({ ...brief, durationWeeks: 1 }).package).toBe('hahn');
  });

  it('makes a group that arranges something itself, or stays longer, an Esel without that block', () => {
    expect(choicesFromBrief({ durationWeeks: 2, accommodation: 'not-needed' })).toMatchObject({ package: 'esel', modules: { ...ALL, accommodation: false } });
    expect(choicesFromBrief({ durationWeeks: 3 })).toMatchObject({ package: 'esel', weeks: 3 });
    expect(choicesFromBrief(null)).toMatchObject({ package: 'katze' });
  });
});

describe('what the editor may write', () => {
  it('accepts a whole draft and refuses departure before arrival', () => {
    expect(parseOfferDraft(draft()).ok).toBe(true);
    expect(parseOfferDraft(draft({ arrival: '2027-04-24', departure: '2027-04-11' }))).toEqual({ ok: false, error: 'departure: Departure must be after arrival' });
  });

  it('refuses a typed line with a key the builder does not make, rather than dropping the typed lines', () => {
    const d = draft();
    d.stay.manual = [{ key: 'tuition', audience: 'participant', chargeType: 'tuition', description: 'x', quantity: 1, unitAmount: 1 }];
    expect(parseOfferDraft(d).ok).toBe(false);
  });

  it('opens an old stay with today’s defaults for what it lacks, and keeps the lines that still parse', () => {
    expect(normaliseStay({ choices: { package: 'hahn', room: 'single' } }).choices).toEqual({ ...DEFAULT_STAY, package: 'hahn' });
    expect(normaliseStay('garbage')).toEqual({ choices: DEFAULT_STAY, overrides: {}, manual: [] });
    expect(normaliseStay({ manual: [{ key: 'bad' }, { key: 'manual:ok', audience: 'participant', chargeType: 'tuition', description: 'x', quantity: 1, unitAmount: 5 }] }).manual).toHaveLength(1);
  });
});
