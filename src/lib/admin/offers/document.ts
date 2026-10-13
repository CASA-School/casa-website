/**
 * The offer letter, as data. Pure, and the only place its words are chosen.
 *
 * In FileMaker the letter is a text field written once by a script and then
 * edited by hand, so it drifts from the offer it came from (37602: 1,560 € in
 * the offer, 1,370 € in the letter). Here the letter is a VIEW of the offer:
 * the editor's preview, the print and the copy kept in `letters` when it is
 * sent are all this function's output, in the shape every CASA letter has
 * (src/lib/admin/letters/types.ts). Only the opening, the closing and a note
 * are free text.
 *
 * German addresses the reader with du, like everything CASA writes
 * (docs/VOICE_AND_TONE.md); the opening and closing are editable per offer.
 */

import { formatDateRange, formatLetterDate, formatMoney, letterhead, recipientLines, salutation } from '../letters/format';
import { LETTER_SCHEMA, type Letter, type LetterPart, type LetterRow } from '../letters/types';

import { measure } from './engine';
import type { OfferDraft, OfferLanguage, OfferLine, OfferTotals } from './types';

/** The standard texts until CASA saves its own (`letter_texts`, kind `offer`). */
export const OFFER_TEXT_DEFAULTS = {
  de: {
    intro: 'vielen Dank für deine Anfrage und dein Interesse an CASA. Gern machen wir dir folgendes Angebot:',
    closing:
      'Sag uns einfach kurz Bescheid, ob du das Angebot annehmen möchtest. Wenn du Fragen hast oder etwas anders brauchst, passen wir es gern an.',
  },
  en: {
    intro: 'Thank you very much for your enquiry and your interest in CASA. We are pleased to make you the following offer:',
    closing:
      'Please let us know whether you would like to accept the offer. If you have any questions or need something different, we are happy to adjust it.',
  },
};

export type OfferTexts = { intro: string; closing: string };

const WORDS = {
  de: {
    subject: (n: string) => `Angebot Nr. ${n}`,
    version: (v: number) => `${v}. Fassung`,
    participants: 'Teilnehmende',
    escorts: 'Begleitpersonen',
    perPerson: 'Gesamt pro Person',
    perEscort: 'Gesamt pro Begleitperson',
    total: 'Gesamt',
    included: 'Im Preis enthalten',
    includedWord: 'inklusive',
    groupTotal: (p: number, e: number, paid: boolean) =>
      `Gesamtpreis für die Gruppe (${p} Teilnehmende${paid && e ? `, ${e} ${e === 1 ? 'Begleitperson' : 'Begleitpersonen'}` : ''})`,
    free: (e: number) =>
      e === 1 ? 'Die Begleitperson nimmt kostenfrei teil.' : `Die ${e} Begleitpersonen nehmen kostenfrei teil.`,
    shared: (e: number) =>
      e === 1
        ? 'Die Kosten der Begleitperson sind im Preis pro Person enthalten.'
        : `Die Kosten der ${e} Begleitpersonen sind im Preis pro Person enthalten.`,
    nights: (n: number) => `${n} ${n === 1 ? 'Nacht' : 'Nächte'}`,
    weeks: (n: number) => `${n} ${n === 1 ? 'Woche' : 'Wochen'}`,
    people: (p: number | null, e: number) =>
      [p ? `${p} Teilnehmende` : '', e ? `${e} ${e === 1 ? 'Begleitperson' : 'Begleitpersonen'}` : '']
        .filter(Boolean)
        .join(', '),
    validParts: ['Dieses Angebot gilt bis zum ', '.'] as const,
  },
  en: {
    subject: (n: string) => `Offer no. ${n}`,
    version: (v: number) => `version ${v}`,
    participants: 'Participants',
    escorts: 'Escorts',
    perPerson: 'Total per person',
    perEscort: 'Total per escort',
    total: 'Total',
    included: 'Included in the price',
    includedWord: 'included',
    groupTotal: (p: number, e: number, paid: boolean) =>
      `Total for the group (${p} participants${paid && e ? `, ${e} ${e === 1 ? 'escort' : 'escorts'}` : ''})`,
    free: (e: number) => (e === 1 ? 'The escort takes part free of charge.' : `The ${e} escorts take part free of charge.`),
    shared: (e: number) =>
      e === 1
        ? "The escort's costs are included in the price per person."
        : `The costs of the ${e} escorts are included in the price per person.`,
    nights: (n: number) => `${n} ${n === 1 ? 'night' : 'nights'}`,
    weeks: (n: number) => `${n} ${n === 1 ? 'week' : 'weeks'}`,
    people: (p: number | null, e: number) =>
      [p ? `${p} participants` : '', e ? `${e} ${e === 1 ? 'escort' : 'escorts'}` : ''].filter(Boolean).join(', '),
    validParts: ['This offer is valid until ', '.'] as const,
  },
} as const;

/** The validity sentence around its date, so the letter view can make the date the part to click. */
export function validityParts(language: OfferLanguage, validUntil: string | null) {
  if (!validUntil) return null;
  const [before, after] = WORDS[language].validParts;
  return { before, date: formatLetterDate(validUntil, language), after };
}

export type OfferLetterContext = {
  number: string;
  /** The version this letter is, counting the one being sent. */
  version: number;
  /** The date on the letter: today for a draft, the day it is sent for a sent one. */
  date: string;
  countryName: string | null;
  signatureName: string | null;
  /** The standard opening and closing in the offer's language. */
  standard?: OfferTexts;
};

/** An offer line's `ref` on the letter: who pays it and its key. */
export const lineRef = (line: Pick<OfferLine, 'audience' | 'key'>) => `${line.audience}:${line.key}`;

export function offerLetter(draft: OfferDraft, lines: OfferLine[], totals: OfferTotals, ctx: OfferLetterContext): Letter {
  const lang = draft.language;
  const w = WORDS[lang];
  const money = (n: number | null) => (n == null ? null : formatMoney(n, lang));
  const pkg = draft.presentation === 'package';
  const group = draft.kind === 'group';
  const escorts = group ? draft.escorts : 0;
  const pricing = draft.stay.choices.escortPricing;
  const standard = ctx.standard ?? OFFER_TEXT_DEFAULTS[lang];

  const row = (l: OfferLine): LetterRow => ({
    text: l.description,
    amount: pkg ? null : l.included ? w.includedWord : money(l.amount),
    ref: lineRef(l),
  });
  const participantLines = lines.filter((l) => l.audience === 'participant');
  const escortLines = lines.filter((l) => l.audience === 'escort');
  const twoTables = group && escorts > 0 && pricing === 'paid' && escortLines.length > 0;

  const body: LetterPart[] = [{ type: 'text', slot: 'intro', text: draft.intro ?? standard.intro, strong: false }];

  const heading = [draft.groupName.trim(), draft.title.trim()].filter(Boolean).join(' · ');
  const { nights, weeks, fromDates } = measure(draft);
  const facts = group
    ? [
        fromDates && draft.arrival && draft.departure ? `${formatDateRange(draft.arrival, draft.departure, lang)} · ${w.nights(nights)}` : w.weeks(weeks),
        w.people(draft.participants, escorts),
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
  if (heading) body.push({ type: 'heading', text: heading, detail: facts || null });

  body.push({
    type: 'table',
    heading: pkg ? w.included : twoTables ? w.participants : null,
    rows: participantLines.map(row),
    total: { label: group ? w.perPerson : w.total, amount: money(totals.perParticipant) },
  });
  if (twoTables) {
    body.push({ type: 'table', heading: w.escorts, rows: escortLines.map(row), total: { label: w.perEscort, amount: money(totals.perEscort) } });
  }
  if (group && escorts > 0 && pricing !== 'paid') {
    body.push({ type: 'text', slot: null, text: pricing === 'free' ? w.free(escorts) : w.shared(escorts), strong: false });
  }
  if (group && draft.participants && totals.groupTotal != null) {
    body.push({ type: 'sum', label: w.groupTotal(draft.participants, escorts, pricing === 'paid'), amount: formatMoney(totals.groupTotal, lang) });
  }

  const validity = validityParts(lang, draft.validUntil);
  body.push({ type: 'text', slot: 'validity', text: validity ? `${validity.before}${validity.date}${validity.after}` : '', strong: true });
  body.push({ type: 'text', slot: 'note', text: draft.note ?? '', strong: false });
  body.push({ type: 'text', slot: 'closing', text: draft.closing ?? standard.closing, strong: false });

  const subjectTitle = draft.title.trim() || draft.groupName.trim();
  return {
    schema: LETTER_SCHEMA,
    kind: 'offer',
    language: lang,
    ...letterhead(lang, ctx.signatureName),
    recipient: recipientLines({
      name: draft.recipientName,
      contact: [draft.contactFirstName.trim(), draft.contactLastName.trim()].filter(Boolean).join(' '),
      address: draft.address,
      countryCode: draft.countryCode,
      countryName: ctx.countryName,
    }),
    placeDate: `Bremen, ${formatLetterDate(ctx.date, lang)}`,
    subject: { lead: w.subject(ctx.number), title: subjectTitle, tail: ctx.version > 1 ? w.version(ctx.version) : null },
    salutation: salutation({ language: lang, salutation: draft.contactSalutation, firstName: draft.contactFirstName, lastName: draft.contactLastName }),
    body,
  };
}
