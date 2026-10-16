/**
 * The booking's and the waiting list's letters, as data (docs/LETTERS.md, migration 0032). Pure:
 * the live preview, the print and the copy kept when a letter is sent are all this module's output.
 *
 * Read from SchoolMan's scripts (2026-10-16) and kept to what they say, without their defects:
 *
 * - The confirmation (`Confirmation.First_Booking`, 3,657 letters): the course, its days and times,
 *   the stay, the costs and the total; what has come in and what is open; how much to transfer and
 *   by when. SchoolMan's variant left the amount blank in one branch and never printed the payments
 *   received; here every figure is the booking's, and the deadline follows the terms (AGB §5.2–5.3):
 *   a learner abroad (visa) pays the whole first course, anyone else a down payment within a week
 *   and the rest four weeks before the start — or by the first day of a follow-up booking.
 * - The receipt (`ReceiptPaymentIn_Booking`, 7,349): the payments chosen, their sum, the sum in
 *   words — in the letter's own language, where SchoolMan wrote German words on English receipts —
 *   and what is still open. It changes nothing on the booking.
 * - The waiting list's three (`ConfirmationWaitingList`, `FreePlaceWaitingList`, `Maybenexttime`):
 *   on the list, a place is free, no place this time. One language per letter, where SchoolMan put
 *   German and English on one page.
 *
 * German says du, by first name (docs/VOICE_AND_TONE.md). The opening and closing are CASA's
 * standard texts (`letter_texts`), changed per letter or saved as the new standard; the sentences
 * built from figures — what to pay, a place in the queue, the next start — are changed per letter only.
 */

import { formatDateRange, formatLetterDate, formatMoney, letterhead, recipientLines, salutation, type Salutation } from './format';
import { LETTER_SCHEMA, type BookingLetterKind, type Letter, type LetterLanguage, type LetterPart, type WaitlistLetterKind } from './types';

// ------------------------------------------------------------------ context

export type LetterAddress = { lines: string[]; countryCode: string | null; country: { de: string | null; en: string | null } };

export type LetterPerson = {
  id: string;
  firstName: string;
  lastName: string;
  salutation: Salutation;
  email: string | null;
  home: LetterAddress | null;
  local: LetterAddress | null;
};

export type LetterCourse = {
  name: Record<LetterLanguage, string>;
  level: string | null;
  startDate: string;
  endDate: string;
  session: 'morning' | 'afternoon' | 'evening' | null;
  time: string | null;
  days: string[];
  lessonsPerWeek: number | null;
};

export type BookingLetterContext = {
  bookingId: string;
  /** The language the learner registered in, where they did through the website. */
  language: LetterLanguage;
  person: LetterPerson;
  course: LetterCourse | null;
  accommodation: { name: Record<LetterLanguage, string>; from: string; to: string | null } | null;
  charges: { description: string; amount: number }[];
  payments: { id: string; date: string; method: string; amount: number; subject: string }[];
  charged: number;
  paid: number;
  visaRequired: boolean;
  /** A follow-up booking: the rest is due by its first day, not four weeks before. */
  followUp: boolean;
  /** The course type's down payment (`course_types.down_payment`), when it has one. */
  downPayment: number | null;
  staff: { id: string; name: string }[];
};

export type WaitlistLetterContext = {
  entryId: string;
  language: LetterLanguage;
  status: string;
  person: LetterPerson;
  course: LetterCourse;
  /** Place in the queue; null once the entry is closed. */
  position: number | null;
  /** The next start of the same course, for "no place this time". */
  nextStart: string | null;
  staff: { id: string; name: string }[];
};

/** Each kind's name, for lists and buttons. */
export const LETTER_KIND_LABELS: Record<BookingLetterKind | WaitlistLetterKind | 'offer', Record<LetterLanguage, string>> = {
  offer: { de: 'Angebot', en: 'Offer' },
  booking_confirmation: { de: 'Buchungsbestätigung', en: 'Booking confirmation' },
  payment_receipt: { de: 'Empfangsbestätigung', en: 'Receipt' },
  waitlist_confirmation: { de: 'Bestätigung Warteliste', en: 'Waiting-list confirmation' },
  waitlist_place_free: { de: 'Platz frei', en: 'Place free' },
  waitlist_no_place: { de: 'Kein Platz', en: 'No place' },
};

/** What a colleague chooses for one letter. Texts are per slot; null or absent means the standard. */
export type LetterChoices = {
  language: LetterLanguage;
  address: 'home' | 'local' | 'none';
  signatureId: string | null;
  texts: Partial<Record<string, string>>;
  /** The receipt's payments; empty means all. */
  paymentIds?: string[];
};

/** The slots a colleague can save as CASA's standard, per kind. The others are built from figures. */
export const STANDARD_SLOTS: Record<BookingLetterKind | WaitlistLetterKind, readonly string[]> = {
  booking_confirmation: ['intro', 'closing', 'ps'],
  payment_receipt: ['intro', 'closing'],
  waitlist_confirmation: ['intro', 'closing'],
  waitlist_place_free: ['intro', 'closing'],
  waitlist_no_place: ['intro', 'closing'],
};

export const LETTER_STANDARD_DEFAULTS: Record<BookingLetterKind | WaitlistLetterKind, Record<LetterLanguage, Record<string, string>>> = {
  booking_confirmation: {
    de: {
      intro: 'vielen Dank für deine Anmeldung bei CASA. Hiermit bestätigen wir dir folgende Buchung:',
      closing: 'Wir freuen uns, dich bald bei uns begrüßen zu können. Wenn du Fragen hast, schreib uns einfach oder ruf an.',
      ps: 'PS: Diese Bestätigung gilt vorbehaltlich deiner Zahlung und ist keine Bestätigung für einen Visumantrag.',
    },
    en: {
      intro: 'Thank you for registering with CASA. We are pleased to confirm the following booking:',
      closing: 'We look forward to welcoming you soon. If you have any questions, just write to us or give us a call.',
      ps: 'PS: This confirmation depends on your payment and cannot be used to apply for a visa.',
    },
  },
  payment_receipt: {
    de: { intro: 'hiermit bestätigen wir dir den Erhalt deiner Zahlung:', closing: 'Vielen Dank!' },
    en: { intro: 'We hereby confirm that we have received your payment:', closing: 'Thank you very much.' },
  },
  waitlist_confirmation: {
    de: {
      intro: 'vielen Dank für deine Anmeldung. Der Kurs, den du dir ausgesucht hast, ist leider schon ausgebucht. Deshalb haben wir dich auf die Warteliste gesetzt:',
      closing: 'Sobald ein Platz frei wird, melden wir uns bei dir. Wenn dir auch ein anderer Termin passt, sag uns gern Bescheid. Hoffentlich bis bald!',
    },
    en: {
      intro: 'Thank you for registering. Unfortunately, the course you chose is already full, so we have put you on the waiting list:',
      closing: 'As soon as a place becomes free, we will let you know. If another date would also suit you, just tell us. We hope to see you soon.',
    },
  },
  waitlist_place_free: {
    de: {
      intro: 'gute Nachrichten: In deinem Kurs ist ein Platz frei geworden, und wir halten ihn für dich frei.',
      closing: 'Bitte gib uns so bald wie möglich Bescheid, ob wir den Platz fest für dich buchen dürfen. Dann schicken wir dir deine Buchungsbestätigung.',
    },
    en: {
      intro: 'Good news: a place has become free in your course, and we are keeping it for you.',
      closing: 'Please let us know as soon as possible whether we may book the place for you. We will then send you your booking confirmation.',
    },
  },
  waitlist_no_place: {
    de: {
      intro: 'leider ist in deinem Kurs kein Platz frei geworden, und wir können dir dieses Mal keinen Platz anbieten.',
      closing: 'Du kannst dich jederzeit über das Anmeldeformular auf casa-bremen.de anmelden. Wir hoffen, dich bald bei CASA zu sehen.',
    },
    en: {
      intro: 'Unfortunately, no place has become free in your course, and we cannot offer you a place this time.',
      closing: 'You can register at any time with the form on casa-bremen.de. We hope to see you at CASA soon.',
    },
  },
};

// -------------------------------------------------------------------- words

const W = {
  de: {
    confirmation: 'Bestätigung der Buchung',
    receipt: 'Empfangsbestätigung',
    waitlist: 'Warteliste',
    placeFree: 'Gute Nachrichten: ein Platz ist frei',
    version: (v: number) => `${v}. Fassung`,
    weeks: (n: number) => `${n} ${n === 1 ? 'Woche' : 'Wochen'}`,
    lessons: (n: number) => `${n} Unterrichtseinheiten pro Woche`,
    session: { morning: 'vormittags', afternoon: 'nachmittags', evening: 'abends' },
    stay: 'Unterkunft',
    costs: 'Kosten',
    total: 'Gesamt',
    received: 'Bereits bezahlt',
    open: 'Noch offen',
    credit: 'Guthaben',
    allPaid: 'Es ist alles bezahlt. Vielen Dank!',
    deposit: (amount: string, by: string, rest: string, restBy: string) =>
      `Bitte überweise bis zum ${by} eine Anzahlung von ${amount}. Damit ist dein Platz fest reserviert. Den Restbetrag von ${rest} überweise bitte bis zum ${restBy}.`,
    whole: (amount: string, by: string) => `Bitte überweise den Gesamtbetrag von ${amount} bis zum ${by}.`,
    rest: (amount: string, by: string) => `Bitte überweise den offenen Betrag von ${amount} bis zum ${by}.`,
    visa: (amount: string, by: string) =>
      `Für die verbindliche Reservierung deines Kursplatzes und deinen Visumantrag überweise bitte den Gesamtbetrag von ${amount} bis zum ${by}. Sobald deine Zahlung da ist, schicken wir dir eine eigene Bestätigung für die Botschaft.`,
    reference: (who: string, start: string) => `Verwendungszweck: ${who}, Kursbeginn ${start}. Unsere Bankverbindung steht unten auf diesem Brief.`,
    receivedRow: 'Erhalten',
    inWords: (words: string) => `In Worten: ${words}`,
    bookingTotal: 'Gesamtbetrag der Buchung',
    paidTotal: 'Insgesamt bezahlt',
    position: (n: number) => `Du stehst auf Platz ${n} der Warteliste.`,
    next: (course: string, date: string) => `Der nächste ${course} beginnt am ${date}. Wenn du möchtest, melden wir dich gern dafür an.`,
    noNext: 'Kommt vielleicht ein späterer Kurs für dich infrage? Dann melden wir dich gern dafür an.',
    method: { card: 'Karte', cash: 'bar', transfer: 'Überweisung', carryover: 'Übertrag', agency: 'über die Agentur', offset: 'Verrechnung' } as Record<string, string>,
    days: { Mon: 'Mo', Tue: 'Di', Wed: 'Mi', Thu: 'Do', Fri: 'Fr', Sat: 'Sa', Sun: 'So' } as Record<string, string>,
  },
  en: {
    confirmation: 'Confirmation of booking',
    receipt: 'Receipt',
    waitlist: 'Waiting list',
    placeFree: 'Good news: a place is free',
    version: (v: number) => `version ${v}`,
    weeks: (n: number) => `${n} ${n === 1 ? 'week' : 'weeks'}`,
    lessons: (n: number) => `${n} lessons a week`,
    session: { morning: 'mornings', afternoon: 'afternoons', evening: 'evenings' },
    stay: 'Accommodation',
    costs: 'Costs',
    total: 'Total',
    received: 'Already paid',
    open: 'Still to pay',
    credit: 'Credit',
    allPaid: 'Everything has been paid. Thank you!',
    deposit: (amount: string, by: string, rest: string, restBy: string) =>
      `Please transfer a down payment of ${amount} by ${by}. This reserves your place. Please transfer the remaining ${rest} by ${restBy}.`,
    whole: (amount: string, by: string) => `Please transfer the total of ${amount} by ${by}.`,
    rest: (amount: string, by: string) => `Please transfer the outstanding ${amount} by ${by}.`,
    visa: (amount: string, by: string) =>
      `To reserve your place and for your visa application, please transfer the total of ${amount} by ${by}. As soon as your payment arrives, we will send you a separate confirmation for the embassy.`,
    reference: (who: string, start: string) => `Payment reference: ${who}, course start ${start}. Our bank details are at the foot of this letter.`,
    receivedRow: 'Received',
    inWords: (words: string) => `In words: ${words}`,
    bookingTotal: 'Total of the booking',
    paidTotal: 'Paid in total',
    position: (n: number) => `You are number ${n} on the waiting list.`,
    next: (course: string, date: string) => `The next ${course} starts on ${date}. If you like, we will gladly register you for it.`,
    noNext: 'Would a later course suit you? We will gladly register you for it.',
    method: { card: 'card', cash: 'cash', transfer: 'bank transfer', carryover: 'carried over', agency: 'through the agency', offset: 'offset' } as Record<string, string>,
    days: { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' } as Record<string, string>,
  },
} as const;

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** "Mo–Fr" for a run of days, "Mo, Mi" otherwise. */
export function dayList(days: readonly string[], lang: LetterLanguage): string | null {
  const sorted = days.filter((d) => DAY_ORDER.includes(d)).sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  if (sorted.length === 0) return null;
  const run = sorted.every((d, i) => i === 0 || DAY_ORDER.indexOf(d) === DAY_ORDER.indexOf(sorted[i - 1]) + 1);
  const short = sorted.map((d) => W[lang].days[d]);
  return run && short.length > 2 ? `${short[0]}–${short[short.length - 1]}` : short.join(', ');
}

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const weeksBetween = (from: string, to: string) =>
  Math.max(1, Math.round((new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime() + 86_400_000) / (7 * 86_400_000)));

/** The course in one line under its name: dates, weeks, when, how much. */
function courseDetail(course: LetterCourse, lang: LetterLanguage): string {
  const w = W[lang];
  const time = course.time ? course.time.replace('-', '–') : null;
  return [
    `${formatDateRange(course.startDate, course.endDate, lang)} · ${w.weeks(weeksBetween(course.startDate, course.endDate))}`,
    [dayList(course.days, lang), time ?? (course.session ? w.session[course.session] : null)].filter(Boolean).join(' · ') || null,
    course.lessonsPerWeek ? w.lessons(course.lessonsPerWeek) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

const courseTitle = (course: LetterCourse, lang: LetterLanguage) => [course.name[lang], course.level].filter(Boolean).join(' ');

// --------------------------------------------------------------- the frame

function frame(
  kind: Letter['kind'],
  person: LetterPerson,
  staff: { id: string; name: string }[],
  choices: LetterChoices,
  today: string,
  subject: Letter['subject'],
  body: LetterPart[]
): Letter {
  const lang = choices.language;
  const address = choices.address === 'none' ? null : choices.address === 'local' ? (person.local ?? person.home) : (person.home ?? person.local);
  const signatureName = staff.find((s) => s.id === choices.signatureId)?.name ?? null;
  return {
    schema: LETTER_SCHEMA,
    kind,
    language: lang,
    ...letterhead(lang, signatureName),
    recipient: recipientLines({
      name: [person.firstName, person.lastName].filter(Boolean).join(' '),
      contact: '',
      address: address ? address.lines.join('\n') : '',
      countryCode: address?.countryCode ?? null,
      countryName: address ? address.country[lang] : null,
    }),
    placeDate: `Bremen, ${formatLetterDate(today, lang)}`,
    subject,
    salutation: salutation({ language: lang, salutation: person.salutation, firstName: person.firstName, lastName: person.lastName }),
    body,
  };
}

/** A text part: the colleague's own words for this letter, else the standard (or the built sentence). */
const text = (choices: LetterChoices, slot: string, fallback: string, strong = false): LetterPart => ({
  type: 'text',
  slot,
  text: choices.texts[slot] ?? fallback,
  strong,
});

// ------------------------------------------------------------ the booking

/** What to transfer and by when, from the booking's figures and the terms (AGB §5.2–5.3). */
export function paymentSentence(ctx: BookingLetterContext, lang: LetterLanguage, today: string): string {
  const w = W[lang];
  const balance = Math.round((ctx.charged - ctx.paid) * 100) / 100;
  if (ctx.charged > 0 && balance <= 0.005) return w.allPaid;
  if (balance <= 0.005) return '';
  const money = (n: number) => formatMoney(n, lang);
  const start = ctx.course?.startDate ?? null;
  // A week from today, or the first day when the course starts sooner.
  const week = addDays(today, 7);
  const soon = start && start < week ? start : week;
  if (ctx.visaRequired) return w.visa(money(balance), formatLetterDate(soon, lang));
  // The rest: four weeks before the start for a first booking, by the first day for a follow-up.
  const restBy = start ? (ctx.followUp ? start : addDays(start, -28)) : null;
  if (ctx.paid <= 0.005 && ctx.downPayment && ctx.downPayment < balance && restBy && restBy > soon) {
    return w.deposit(money(ctx.downPayment), formatLetterDate(soon, lang), money(balance - ctx.downPayment), formatLetterDate(restBy, lang));
  }
  const by = ctx.paid > 0.005 && restBy && restBy > today ? restBy : soon;
  return ctx.paid > 0.005 ? w.rest(money(balance), formatLetterDate(by, lang)) : w.whole(money(balance), formatLetterDate(by, lang));
}

export function bookingConfirmationLetter(
  ctx: BookingLetterContext,
  choices: LetterChoices,
  standard: Record<string, string>,
  meta: { today: string; version: number }
): Letter {
  const lang = choices.language;
  const w = W[lang];
  const money = (n: number) => formatMoney(n, lang);
  const balance = ctx.charged - ctx.paid;
  const body: LetterPart[] = [text(choices, 'intro', standard.intro)];
  if (ctx.course) body.push({ type: 'heading', text: courseTitle(ctx.course, lang), detail: courseDetail(ctx.course, lang) });
  if (ctx.accommodation) {
    body.push({
      type: 'heading',
      text: `${w.stay}: ${ctx.accommodation.name[lang]}`,
      detail: ctx.accommodation.to ? formatDateRange(ctx.accommodation.from, ctx.accommodation.to, lang) : formatLetterDate(ctx.accommodation.from, lang),
    });
  }
  body.push({
    type: 'table',
    heading: w.costs,
    rows: ctx.charges.map((c) => ({ text: c.description, amount: money(c.amount), ref: null })),
    total: { label: w.total, amount: money(ctx.charged) },
  });
  if (ctx.paid > 0.005) {
    body.push({ type: 'sum', label: w.received, amount: money(ctx.paid) });
    body.push({ type: 'sum', label: balance < -0.005 ? w.credit : w.open, amount: money(Math.abs(balance)) });
  }
  const payment = paymentSentence(ctx, lang, meta.today);
  body.push(text(choices, 'payment', payment, true));
  if (balance > 0.005 && ctx.course) {
    body.push({
      type: 'text',
      slot: null,
      text: w.reference([ctx.person.firstName, ctx.person.lastName].filter(Boolean).join(' '), formatLetterDate(ctx.course.startDate, lang)),
      strong: false,
    });
  }
  body.push(text(choices, 'note', ''));
  body.push(text(choices, 'closing', standard.closing));
  body.push(text(choices, 'ps', standard.ps));
  return frame(
    'booking_confirmation',
    ctx.person,
    ctx.staff,
    choices,
    meta.today,
    { lead: w.confirmation, title: ctx.course ? courseTitle(ctx.course, lang) : '', tail: meta.version > 1 ? w.version(meta.version) : null },
    body
  );
}

export function paymentReceiptLetter(
  ctx: BookingLetterContext,
  choices: LetterChoices,
  standard: Record<string, string>,
  meta: { today: string; version: number }
): Letter {
  const lang = choices.language;
  const w = W[lang];
  const money = (n: number) => formatMoney(n, lang);
  const chosen = choices.paymentIds?.length ? ctx.payments.filter((p) => choices.paymentIds!.includes(p.id)) : ctx.payments;
  const received = chosen.reduce((sum, p) => sum + p.amount, 0);
  const balance = ctx.charged - ctx.paid;
  const body: LetterPart[] = [text(choices, 'intro', standard.intro)];
  if (ctx.course) body.push({ type: 'heading', text: courseTitle(ctx.course, lang), detail: formatDateRange(ctx.course.startDate, ctx.course.endDate, lang) });
  body.push({
    type: 'table',
    heading: null,
    rows: chosen.map((p) => ({ text: [formatLetterDate(p.date, lang), p.subject, w.method[p.method] ?? p.method].filter(Boolean).join(' · '), amount: money(p.amount), ref: null })),
    total: { label: w.receivedRow, amount: money(received) },
  });
  body.push({ type: 'text', slot: null, text: w.inWords(amountInWords(received, lang)), strong: false });
  body.push({ type: 'sum', label: w.bookingTotal, amount: money(ctx.charged) });
  body.push({ type: 'sum', label: w.paidTotal, amount: money(ctx.paid) });
  body.push({ type: 'sum', label: balance < -0.005 ? w.credit : w.open, amount: money(Math.abs(balance)) });
  body.push(text(choices, 'note', ''));
  body.push(text(choices, 'closing', standard.closing));
  return frame(
    'payment_receipt',
    ctx.person,
    ctx.staff,
    choices,
    meta.today,
    { lead: w.receipt, title: [ctx.person.firstName, ctx.person.lastName].filter(Boolean).join(' '), tail: ctx.course ? courseTitle(ctx.course, lang) : null },
    body
  );
}

// ------------------------------------------------------- the waiting list

export function waitlistLetter(
  kind: WaitlistLetterKind,
  ctx: WaitlistLetterContext,
  choices: LetterChoices,
  standard: Record<string, string>,
  meta: { today: string; version: number }
): Letter {
  const lang = choices.language;
  const w = W[lang];
  const body: LetterPart[] = [
    text(choices, 'intro', standard.intro),
    { type: 'heading', text: courseTitle(ctx.course, lang), detail: courseDetail(ctx.course, lang) },
  ];
  if (kind === 'waitlist_confirmation' && ctx.position) body.push(text(choices, 'position', w.position(ctx.position)));
  if (kind === 'waitlist_no_place') {
    body.push(text(choices, 'next', ctx.nextStart ? w.next(ctx.course.name[lang], formatLetterDate(ctx.nextStart, lang)) : w.noNext));
  }
  body.push(text(choices, 'note', ''));
  body.push(text(choices, 'closing', standard.closing));
  return frame(
    kind,
    ctx.person,
    ctx.staff,
    choices,
    meta.today,
    {
      lead: kind === 'waitlist_place_free' ? w.placeFree : w.waitlist,
      title: courseTitle(ctx.course, lang),
      tail: meta.version > 1 ? w.version(meta.version) : formatDateRange(ctx.course.startDate, ctx.course.endDate, lang),
    },
    body
  );
}

// ------------------------------------------------------------ in words

const DE_ONES = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const DE_TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];
const EN_ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function deUnder1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const head = h ? `${DE_ONES[h]}hundert` : '';
  if (r === 0) return head;
  if (r < 20) return head + (r === 1 ? 'eins' : DE_ONES[r]);
  const one = r % 10;
  return head + (one ? `${DE_ONES[one]}und` : '') + DE_TENS[Math.floor(r / 10)];
}

function enUnder1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${EN_ONES[h]} hundred`);
  if (r) {
    const tail = r < 20 ? EN_ONES[r] : `${EN_TENS[Math.floor(r / 10)]}${r % 10 ? `-${EN_ONES[r % 10]}` : ''}`;
    parts.push(h ? `and ${tail}` : tail);
  }
  return parts.join(' ');
}

/** A sum in words, as a receipt writes it: "eintausendzweihundert Euro", "one thousand two hundred euros and 50 cents". */
export function amountInWords(amount: number, lang: LetterLanguage): string {
  const cents = Math.round(Math.abs(amount) * 100);
  const euros = Math.floor(cents / 100);
  const rest = cents % 100;
  if (lang === 'de') {
    const thousands = Math.floor(euros / 1000);
    const below = euros % 1000;
    const head = thousands ? `${thousands === 1 ? 'ein' : deUnder1000(thousands)}tausend` : '';
    // "ein Euro", "einundzwanzig Euro", "eintausendeins Euro": one alone before the noun is "ein".
    const words = euros === 0 ? 'null' : head + (below ? (below === 1 && !thousands ? 'ein' : deUnder1000(below)) : '');
    return `${words} Euro${rest ? ` und ${deUnder1000(rest) || 'null'} Cent` : ''}`;
  }
  const thousands = Math.floor(euros / 1000);
  const below = euros % 1000;
  const words =
    euros === 0
      ? 'zero'
      : [thousands ? `${enUnder1000(thousands)} thousand` : '', below ? (thousands && below < 100 ? `and ${enUnder1000(below)}` : enUnder1000(below)) : '']
          .filter(Boolean)
          .join(' ');
  return `${words} ${euros === 1 ? 'euro' : 'euros'}${rest ? ` and ${enUnder1000(rest)} ${rest === 1 ? 'cent' : 'cents'}` : ''}`;
}
