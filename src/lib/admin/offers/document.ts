/**
 * The offer letter, as data. Pure, and the only place its words are chosen.
 *
 * In FileMaker the letter is a text field written once by a script and then
 * edited by hand, so it drifts from the offer it came from (37602: 1,560 € in
 * the offer, 1,370 € in the letter). Here the letter is a VIEW of the offer:
 * the editor's preview, the print and the frozen copy kept when it is sent
 * are all this function's output. Only the opening, the closing and a note
 * are free text.
 *
 * German addresses the reader with du, like everything CASA writes
 * (docs/VOICE_AND_TONE.md); the opening and closing are editable per offer.
 */

import { measure } from './engine';
import type { Audience, OfferDraft, OfferLanguage, OfferLine, OfferTotals } from './types';

/** `ref` points back at the offer line, so the letter view can edit its text in place. */
export type LetterLine = { text: string; amount: string | null; ref: { audience: Audience; key: string } | null };
export type LetterBlock = {
  heading: string | null;
  lines: LetterLine[];
  totalLabel: string;
  total: string | null;
};

export type OfferLetter = {
  language: OfferLanguage;
  returnAddress: string;
  recipient: string[];
  placeDate: string;
  subject: string;
  /** The subject in its parts, so the title can be edited on the letter. */
  subjectParts: { lead: string; title: string; version: string | null };
  salutation: string;
  intro: string;
  heading: string | null;
  facts: string | null;
  blocks: LetterBlock[];
  escortSentence: string | null;
  groupTotal: { label: string; amount: string } | null;
  validity: string | null;
  /** The validity sentence around its date, so the date can be edited on the letter. */
  validityParts: { before: string; date: string; after: string } | null;
  note: string | null;
  closing: string;
  signOff: string;
  signature: string[];
  footer: string[];
};

/*
 * CASA's letterhead. The company facts are the Impressum's
 * (src/lib/content/published-legal.json); the bank line is the one on every
 * FileMaker letter. FileMaker's footer also says "umsatzsteuerbefreit lt. § 5
 * Abs. 1 Nr. 9 KStG und § 3 Nr. 6" — those cite corporate and trade tax, not
 * VAT — so that line is left off until CASA's tax adviser words it
 * (TODO, docs/OFFERS.md §Open questions).
 */
const LETTERHEAD = {
  returnAddress: 'CASA gGmbH · Am Dobben 14–16 · 28203 Bremen',
  de: [
    'CASA – Internationale Sprachschule gemeinnützige GmbH · Am Dobben 14–16 · 28203 Bremen · Telefon +49 421 460 414 30 · info@casa-bremen.de',
    'Geschäftsführerin Bettina Rick · Amtsgericht Bremen HRB 32761 HB · Steuernummer 60/147/04599',
    'Commerzbank AG · IBAN DE86 2904 0090 0109 7443 00 · BIC COBADEFFXXX · casa-bremen.de',
  ],
  en: [
    'CASA – Internationale Sprachschule gemeinnützige GmbH (non-profit) · Am Dobben 14–16 · 28203 Bremen · Germany · Phone +49 421 460 414 30',
    'Managing director Bettina Rick · Amtsgericht Bremen HRB 32761 HB · Tax number 60/147/04599 · info@casa-bremen.de',
    'Commerzbank AG · IBAN DE86 2904 0090 0109 7443 00 · BIC COBADEFFXXX · casa-bremen.de',
  ],
} as const;

/** The standard texts until CASA saves its own (`offer_texts`). */
export const DEFAULT_TEXT = {
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
} as const;

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
    valid: (d: string) => `Dieses Angebot gilt bis zum ${d}.`,
    validParts: ['Dieses Angebot gilt bis zum ', '.'] as const,
    signOff: 'Viele Grüße',
    school: 'CASA – Internationale Sprachschule Bremen',
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
    valid: (d: string) => `This offer is valid until ${d}.`,
    validParts: ['This offer is valid until ', '.'] as const,
    signOff: 'Kind regards',
    school: 'CASA – Internationale Sprachschule Bremen',
  },
} as const;

const LOCALE = { de: 'de-DE', en: 'en-GB' } as const;

export function formatMoney(value: number, language: OfferLanguage): string {
  return new Intl.NumberFormat(LOCALE[language], { style: 'currency', currency: 'EUR' }).format(value);
}

function parts(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n: number) => String(n).padStart(2, '0');

export function formatLetterDate(iso: string, language: OfferLanguage): string {
  const { y, m, d } = parts(iso);
  return language === 'de' ? `${pad(d)}.${pad(m)}.${y}` : `${d} ${MONTHS_EN[m - 1]} ${y}`;
}

/** 12.–25.04.2027 · 12–25 April 2027, and the longer forms across months and years. */
export function formatDateRange(from: string, to: string, language: OfferLanguage): string {
  const a = parts(from);
  const b = parts(to);
  if (language === 'de') {
    if (a.y === b.y && a.m === b.m) return `${pad(a.d)}.–${pad(b.d)}.${pad(b.m)}.${b.y}`;
    if (a.y === b.y) return `${pad(a.d)}.${pad(a.m)}.–${pad(b.d)}.${pad(b.m)}.${b.y}`;
    return `${formatLetterDate(from, 'de')}–${formatLetterDate(to, 'de')}`;
  }
  if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${MONTHS_EN[b.m - 1]} ${b.y}`;
  if (a.y === b.y) return `${a.d} ${MONTHS_EN[a.m - 1]} – ${b.d} ${MONTHS_EN[b.m - 1]} ${b.y}`;
  return `${formatLetterDate(from, 'en')} – ${formatLetterDate(to, 'en')}`;
}

export function salutation(draft: Pick<OfferDraft, 'language' | 'contactSalutation' | 'contactFirstName' | 'contactLastName'>): string {
  const first = draft.contactFirstName.trim();
  const last = draft.contactLastName.trim();
  const s = draft.contactSalutation;
  if (draft.language === 'de') {
    if (first) return s === 'ms' ? `Liebe ${first},` : s === 'mr' ? `Lieber ${first},` : `Hallo ${first},`;
    if (last && s !== 'none') return s === 'ms' ? `Liebe Frau ${last},` : `Lieber Herr ${last},`;
    return 'Hallo,';
  }
  if (first) return `Dear ${first},`;
  if (last && s !== 'none') return `Dear ${s === 'ms' ? 'Ms' : 'Mr'} ${last},`;
  return 'Hello,';
}

export type LetterContext = {
  number: string;
  /** The version this letter is, counting the one being sent. */
  version: number;
  /** The date on the letter: today for a draft, the day it was sent for a sent one. */
  date: string;
  countryName: string | null;
  signatureName: string | null;
  /** The standard opening and closing in the offer's language (`offer_texts`). */
  standard?: { intro: string; closing: string };
};

export function buildLetter(draft: OfferDraft, lines: OfferLine[], totals: OfferTotals, ctx: LetterContext): OfferLetter {
  const lang = draft.language;
  const w = WORDS[lang];
  const money = (n: number | null) => (n == null ? null : formatMoney(n, lang));
  const pkg = draft.presentation === 'package';
  const group = draft.kind === 'group';
  const escorts = group ? draft.escorts : 0;
  const pricing = draft.stay.choices.escortPricing;

  const contact = [draft.contactFirstName.trim(), draft.contactLastName.trim()].filter(Boolean).join(' ');
  const recipient = [
    draft.recipientName.trim(),
    contact && contact !== draft.recipientName.trim() ? contact : '',
    ...draft.address.split('\n').map((l) => l.trim()),
    ctx.countryName && draft.countryCode !== 'DE' ? ctx.countryName : '',
  ].filter(Boolean);

  const toLetter = (l: OfferLine): LetterLine => ({
    text: l.description,
    amount: pkg ? null : money(l.amount),
    ref: { audience: l.audience, key: l.key },
  });
  const participantLines = lines.filter((l) => l.audience === 'participant');
  const escortLines = lines.filter((l) => l.audience === 'escort');
  const twoBlocks = group && escorts > 0 && pricing === 'paid' && escortLines.length > 0;

  const blocks: LetterBlock[] = [
    {
      heading: pkg ? w.included : twoBlocks ? w.participants : null,
      lines: participantLines.map(toLetter),
      totalLabel: group ? w.perPerson : w.total,
      total: money(totals.perParticipant),
    },
  ];
  if (twoBlocks) {
    blocks.push({
      heading: w.escorts,
      lines: escortLines.map(toLetter),
      totalLabel: w.perEscort,
      total: money(totals.perEscort),
    });
  }

  const { nights, weeks, fromDates } = measure(draft);
  const facts = group
    ? [
        fromDates && draft.arrival && draft.departure
          ? `${formatDateRange(draft.arrival, draft.departure, lang)} · ${w.nights(nights)}`
          : w.weeks(weeks),
        w.people(draft.participants, escorts),
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  const heading = [draft.groupName.trim(), draft.title.trim()].filter(Boolean).join(' · ') || null;
  const subjectTail = draft.title.trim() || draft.groupName.trim();

  return {
    language: lang,
    returnAddress: LETTERHEAD.returnAddress,
    recipient,
    placeDate: `Bremen, ${formatLetterDate(ctx.date, lang)}`,
    subject: [w.subject(ctx.number), subjectTail, ctx.version > 1 ? w.version(ctx.version) : '']
      .filter(Boolean)
      .join(' · '),
    subjectParts: { lead: w.subject(ctx.number), title: subjectTail, version: ctx.version > 1 ? w.version(ctx.version) : null },
    salutation: salutation(draft),
    intro: draft.intro ?? ctx.standard?.intro ?? DEFAULT_TEXT[lang].intro,
    heading,
    facts: facts || null,
    blocks,
    escortSentence:
      group && escorts > 0 ? (pricing === 'free' ? w.free(escorts) : pricing === 'shared' ? w.shared(escorts) : null) : null,
    groupTotal:
      group && draft.participants && totals.groupTotal != null
        ? { label: w.groupTotal(draft.participants, escorts, pricing === 'paid'), amount: formatMoney(totals.groupTotal, lang) }
        : null,
    validity: draft.validUntil ? w.valid(formatLetterDate(draft.validUntil, lang)) : null,
    validityParts: draft.validUntil
      ? { before: w.validParts[0], date: formatLetterDate(draft.validUntil, lang), after: w.validParts[1] }
      : null,
    note: draft.note,
    closing: draft.closing ?? ctx.standard?.closing ?? DEFAULT_TEXT[lang].closing,
    signOff: w.signOff,
    signature: [ctx.signatureName ?? '', w.school].filter(Boolean),
    footer: [...LETTERHEAD[lang]],
  };
}
