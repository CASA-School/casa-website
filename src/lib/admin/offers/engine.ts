/**
 * The offer's lines and totals, computed. Pure: no database, no clock.
 *
 * FileMaker types every price into every offer (171 variants of "Kurspreis"),
 * gives the escort a second offer of their own, and spreads the escort's costs
 * over the students by hand. Here a group stay is described once — dates or
 * weeks, participants, escorts, the choices — and every line follows from it
 * and from the rates valid on the arrival date. A price typed over a computed
 * line is kept by the line's key and shown as changed; the quantity always
 * follows the stay, so a longer stay cannot keep a short stay's numbers
 * (the workbook's third defect).
 *
 * The repository resolves the rates (`GroupRateCard`); this module decides
 * what is on the offer and what it costs.
 */

import { stayLength } from './stay';
import {
  overrideKey,
  type Audience,
  type Fare,
  type ManualLine,
  type OfferKind,
  type OfferLanguage,
  type OfferLine,
  type OfferTotals,
  type StayState,
} from './types';

export type RateUnit = 'item' | 'week' | 'lesson' | 'night' | 'month' | 'person_week';
export type Rate = { id: string; amount: number; unit: RateUnit };

export type TicketVariant = `${Fare}-${'week' | 'month'}`;

/** The rates one group stay needs, already resolved for its date and length. */
export type GroupRateCard = {
  tuition: Rate | null;
  materials: Rate | null;
  handling: Rate | null;
  canteen: Rate | null;
  /** For the chosen size of programme. */
  culture: Rate | null;
  /** For the participants' room and the stay's length. */
  room: Rate | null;
  escortRoom: Rate | null;
  tickets: Record<TicketVariant, Rate | null>;
};

export const EMPTY_RATE_CARD: GroupRateCard = {
  tuition: null,
  materials: null,
  handling: null,
  canteen: null,
  culture: null,
  room: null,
  escortRoom: null,
  tickets: { 'student-week': null, 'student-month': null, 'adult-week': null, 'adult-month': null },
};

export type StayInput = {
  kind: OfferKind;
  language: OfferLanguage;
  arrival: string | null;
  departure: string | null;
  participants: number | null;
  escorts: number;
  stay: StayState;
};

export type Measure = { nights: number; weeks: number; courseWeeks: number; fromDates: boolean };

/** Nights and weeks from the dates, or from the weeks typed when there are none. */
export function measure(input: Pick<StayInput, 'arrival' | 'departure' | 'stay'>): Measure {
  const fromDates = stayLength(input.arrival, input.departure);
  const weeks = fromDates?.weeks ?? Math.max(1, Math.round(input.stay.choices.weeks));
  const nights = fromDates?.nights ?? weeks * 7 - 1;
  const typed = input.stay.choices.courseWeeks;
  const courseWeeks = typed != null && typed > 0 ? Math.round(typed) : weeks;
  return { nights, weeks, courseWeeks, fromDates: fromDates != null };
}

// ------------------------------------------------------------------ texts

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const TEXT = {
  de: {
    tuition: (w: number, l: number) => `Deutschkurs: ${plural(w, 'Woche', 'Wochen')}, ${l} UE pro Woche`,
    room: (room: string, nights: number) =>
      `Unterkunft in Gastfamilien, ${room === 'single' ? 'Einzelzimmer' : 'Doppelzimmer'}, Halbpension (${plural(nights, 'Nacht', 'Nächte')})`,
    canteen: 'Mittagessen in der Kantine an Kurstagen',
    tickets: (month: number, week: number) =>
      `Fahrkarte ÖPNV: ${[
        month ? plural(month, 'Monatsticket', 'Monatstickets') : '',
        week ? plural(week, 'Wochenticket', 'Wochentickets') : '',
      ]
        .filter(Boolean)
        .join(' und ')}`,
    culture: 'Kulturprogramm',
    materials: 'Lehrmaterial',
    handling: 'Verwaltungskosten',
    share: (escorts: number) =>
      escorts === 1 ? 'Anteil an den Kosten der Begleitperson' : 'Anteil an den Kosten der Begleitpersonen',
  },
  en: {
    tuition: (w: number, l: number) => `German course: ${plural(w, 'week', 'weeks')}, ${l} lessons a week`,
    room: (room: string, nights: number) =>
      `Host family, ${room === 'single' ? 'single' : 'double'} room, half board (${plural(nights, 'night', 'nights')})`,
    canteen: 'Lunch at a nearby canteen on course days',
    tickets: (month: number, week: number) =>
      `Public transport: ${[
        month ? plural(month, 'monthly ticket', 'monthly tickets') : '',
        week ? plural(week, 'weekly ticket', 'weekly tickets') : '',
      ]
        .filter(Boolean)
        .join(' and ')}`,
    culture: 'Cultural programme',
    materials: 'Learning material',
    handling: 'Handling fee',
    share: (escorts: number) => (escorts === 1 ? "Share of the escort's costs" : "Share of the escorts' costs"),
  },
} as const;

// ----------------------------------------------------------- transit mix

export type TicketMix = { monthly: number; weekly: number; total: number };

/**
 * The cheapest set of tickets that covers `weeks`. A monthly ticket covers
 * four weeks: for two weeks two weekly tickets (50) beat a monthly one (75),
 * for four weeks the monthly one wins, for five it is one of each. The
 * workbook charged a monthly ticket per week (its second defect).
 */
export function cheapestTickets(weeks: number, weekly: number | null, monthly: number | null): TicketMix | null {
  if (weeks <= 0 || (weekly == null && monthly == null)) return null;
  let best: TicketMix | null = null;
  const maxMonthly = monthly == null ? 0 : Math.ceil(weeks / 4);
  for (let m = 0; m <= maxMonthly; m += 1) {
    const rest = Math.max(0, weeks - 4 * m);
    if (rest > 0 && weekly == null) continue;
    const total = m * (monthly ?? 0) + rest * (weekly ?? 0);
    if (!best || total < best.total || (total === best.total && m + rest < best.monthly + best.weekly)) {
      best = { monthly: m, weekly: rest, total };
    }
  }
  return best;
}

// ----------------------------------------------------------------- lines

type Computed = Omit<OfferLine, 'amount' | 'manual' | 'customText'>;

const money = (n: number) => Math.round(n * 100) / 100;

function quantityFor(unit: RateUnit, weeks: number, nights: number, lessons: number): number {
  switch (unit) {
    case 'week':
    case 'person_week':
      return weeks;
    case 'night':
      return nights;
    case 'lesson':
      return lessons;
    case 'month':
      return Math.ceil(weeks / 4);
    default:
      return 1;
  }
}

function fromRate(
  base: Omit<Computed, 'quantity' | 'unit' | 'unitAmount' | 'listUnitAmount' | 'rateId'>,
  rate: Rate | null,
  weeks: number,
  nights: number,
  lessons: number,
  fallbackUnit: RateUnit
): Computed {
  const unit = rate?.unit ?? fallbackUnit;
  return {
    ...base,
    quantity: quantityFor(unit, weeks, nights, lessons),
    unit: unit === 'person_week' ? 'week' : unit,
    unitAmount: rate?.amount ?? null,
    listUnitAmount: rate?.amount ?? null,
    rateId: rate?.id ?? null,
  };
}

function ticketLine(audience: Audience, fare: Fare, weeks: number, card: GroupRateCard, language: OfferLanguage): Computed {
  const weekly = card.tickets[`${fare}-week`];
  const monthly = card.tickets[`${fare}-month`];
  const mix = cheapestTickets(weeks, weekly?.amount ?? null, monthly?.amount ?? null);
  return {
    key: 'transit',
    audience,
    chargeType: 'travel_ticket',
    description: TEXT[language].tickets(mix?.monthly ?? 0, mix?.weekly ?? weeks),
    quantity: 1,
    unit: 'item',
    unitAmount: mix ? money(mix.total) : null,
    listUnitAmount: mix ? money(mix.total) : null,
    rateId: (mix && mix.weekly > 0 ? weekly?.id : monthly?.id) ?? null,
  };
}

/** The lines the builder computes for a group, before anything typed over them. */
export function computedLines(input: StayInput, card: GroupRateCard): Computed[] {
  if (input.kind !== 'group') return [];
  const { choices } = input.stay;
  const t = TEXT[input.language];
  const { nights, weeks, courseWeeks } = measure(input);
  const lessons = courseWeeks * choices.lessonsPerWeek;
  const out: Computed[] = [];

  const add = (audience: Audience) => {
    const isEscort = audience === 'escort';
    if (!isEscort && choices.course) {
      out.push(
        fromRate(
          { key: 'tuition', audience, chargeType: 'tuition', description: t.tuition(courseWeeks, choices.lessonsPerWeek) },
          card.tuition,
          courseWeeks,
          nights,
          lessons,
          'person_week'
        )
      );
      if (choices.materials) {
        out.push(fromRate({ key: 'materials', audience, chargeType: 'teaching_material', description: t.materials }, card.materials, weeks, nights, lessons, 'item'));
      }
    }
    if (choices.accommodation) {
      const room = isEscort ? choices.escortRoom : choices.room;
      out.push(
        fromRate(
          { key: 'accommodation', audience, chargeType: 'accommodation_rent', description: t.room(room, nights) },
          isEscort ? card.escortRoom : card.room,
          weeks,
          nights,
          lessons,
          'item'
        )
      );
    }
    if (choices.canteen) {
      out.push(fromRate({ key: 'canteen', audience, chargeType: 'catering', description: t.canteen }, card.canteen, courseWeeks, nights, lessons, 'person_week'));
    }
    if (choices.transit) {
      out.push(ticketLine(audience, isEscort ? 'adult' : choices.fare, weeks, card, input.language));
    }
    if (choices.culture !== 'none') {
      out.push(fromRate({ key: 'culture', audience, chargeType: 'culture_programme', description: t.culture }, card.culture, weeks, nights, lessons, 'person_week'));
    }
    if (choices.handling) {
      out.push(fromRate({ key: 'handling', audience, chargeType: 'administrative_charge', description: t.handling }, card.handling, weeks, nights, lessons, 'item'));
    }
  };

  add('participant');
  if (input.escorts > 0) add('escort');
  return out;
}

function finish(line: Computed, manual: boolean, customText: boolean): OfferLine {
  const amount = line.unitAmount == null ? null : money(line.quantity * line.unitAmount);
  return { ...line, amount, manual, customText };
}

function manualLine(m: ManualLine): OfferLine {
  return finish(
    {
      key: m.key,
      audience: m.audience,
      chargeType: m.chargeType,
      description: m.description,
      quantity: m.quantity,
      unit: 'item',
      unitAmount: m.unitAmount,
      listUnitAmount: null,
      rateId: null,
    },
    true,
    false
  );
}

const sum = (lines: OfferLine[]) => money(lines.reduce((s, l) => s + (l.amount ?? 0), 0));

/**
 * Every line of the offer: computed ones with what was typed over them, the
 * typed lines, and — when the group carries its escorts — the participants'
 * share of them, computed last from the escorts' final lines.
 */
export function buildLines(input: StayInput, card: GroupRateCard): OfferLine[] {
  const { overrides, manual, choices } = input.stay;
  const lines = computedLines(input, card).map((line) => {
    const o = overrides[overrideKey(line.audience, line.key)];
    return finish(
      {
        ...line,
        unitAmount: o?.unitAmount ?? line.unitAmount,
        description: o?.description?.trim() ? o.description : line.description,
      },
      false,
      Boolean(o?.description?.trim())
    );
  });

  const typed = manual.filter((m) => input.kind === 'group' || m.audience === 'participant').map(manualLine);
  const participantLines = [...lines.filter((l) => l.audience === 'participant'), ...typed.filter((l) => l.audience === 'participant')];
  const escortLines = [...lines.filter((l) => l.audience === 'escort'), ...typed.filter((l) => l.audience === 'escort')];

  const participants = input.participants ?? 0;
  if (input.kind === 'group' && choices.escortPricing === 'shared' && input.escorts > 0 && participants > 0) {
    const share = Math.ceil((sum(escortLines) * input.escorts) / participants);
    const o = overrides[overrideKey('participant', 'escort_share')];
    participantLines.push(
      finish(
        {
          key: 'escort_share',
          audience: 'participant',
          chargeType: 'escort_share',
          description: o?.description?.trim() ? o.description : TEXT[input.language].share(input.escorts),
          quantity: 1,
          unit: 'item',
          unitAmount: o?.unitAmount ?? share,
          listUnitAmount: share,
          rateId: null,
        },
        false,
        Boolean(o?.description?.trim())
      )
    );
  }

  return [...participantLines, ...escortLines];
}

export function computeTotals(input: Pick<StayInput, 'kind' | 'participants' | 'escorts' | 'stay'>, lines: OfferLine[]): OfferTotals {
  const p = lines.filter((l) => l.audience === 'participant');
  const e = lines.filter((l) => l.audience === 'escort');
  const perParticipant = p.length ? sum(p) : null;
  if (input.kind === 'individual') {
    return { perParticipant, perEscort: null, escortShare: null, groupTotal: perParticipant, carriedByCasa: null };
  }
  const pricing = input.stay.choices.escortPricing;
  const perEscort = input.escorts > 0 && e.length ? sum(e) : null;
  const share = p.find((l) => l.key === 'escort_share')?.amount ?? null;
  const participants = input.participants;
  const groupTotal =
    participants == null || perParticipant == null
      ? null
      : money(participants * perParticipant + (pricing === 'paid' && perEscort != null ? input.escorts * perEscort : 0));
  return {
    perParticipant,
    perEscort,
    escortShare: share,
    groupTotal,
    carriedByCasa: pricing === 'free' && perEscort != null ? money(input.escorts * perEscort) : null,
  };
}
