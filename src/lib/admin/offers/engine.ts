/**
 * The offer's lines and totals, computed. Pure: no database, no clock.
 *
 * A group offer is one of the four packages the groups page sells
 * (src/config/gruppen/packages.ts — Ina's `Gruppenpakete_Stadtmusikanten.docx`
 * and `Gruppenreise Esel_Auswahl.xlsx`), priced from the same figures, so the
 * offer and the website never disagree:
 *
 *   Hahn, Katze, Hund — fixed: one package price per person, and what it
 *                       includes listed without amounts.
 *   Esel              — built: each block (course, materials, host family,
 *                       canteen, transport) priced for the stay's length, and
 *                       the afternoons chosen from the sixteen activities.
 *
 * Escorts take no course and no materials; their stay is priced from the same
 * blocks. A price typed over a computed line is kept by the line's key and
 * shown as changed; the quantity and the text always follow the stay.
 * FileMaker types every price into every offer (171 variants of "Kurspreis").
 */

import { GRUPPEN_MODULES, MAX_ACTIVITIES_PER_WEEK, TEACHING_UNITS_PER_WEEK, getGruppenPackage, activityById, type GruppenModuleId, type GruppenWeeks } from '@/config/gruppen/packages';

import { stayLength } from './stay';
import {
  overrideKey,
  type Audience,
  type ManualLine,
  type ModuleKey,
  type OfferKind,
  type OfferLanguage,
  type OfferLine,
  type OfferTotals,
  type PackageSlug,
  type StayState,
} from './types';

export type StayInput = {
  kind: OfferKind;
  language: OfferLanguage;
  arrival: string | null;
  departure: string | null;
  participants: number | null;
  escorts: number;
  stay: StayState;
};

export type Measure = { nights: number; weeks: number; fromDates: boolean };

/** The weeks a package is sold for; null for Esel, which takes the stay's. */
export function packageWeeks(slug: PackageSlug): number | null {
  return getGruppenPackage(slug)?.weeks ?? null;
}

/**
 * Nights and weeks. Dates decide when there are both; otherwise a fixed
 * package's own length, or the weeks typed for Esel. A week is up to seven
 * nights — CASA's "1 week (7 days/6 nights)" — so 13 nights are two weeks.
 */
export function measure(input: Pick<StayInput, 'arrival' | 'departure' | 'stay'>): Measure {
  const fromDates = stayLength(input.arrival, input.departure);
  if (fromDates) return { ...fromDates, fromDates: true };
  const weeks = packageWeeks(input.stay.choices.package) ?? Math.max(1, Math.round(input.stay.choices.weeks));
  return { nights: weeks * 7 - 1, weeks, fromDates: false };
}

/** The weeks the package is priced for: a fixed package's own, Esel's stay. */
export function pricedWeeks(input: Pick<StayInput, 'arrival' | 'departure' | 'stay'>): number {
  return packageWeeks(input.stay.choices.package) ?? measure(input).weeks;
}

/** The afternoons of the offer: a fixed package's own, or Esel's choice. */
export function activitiesOf(choices: StayState['choices']): string[] {
  const pkg = getGruppenPackage(choices.package);
  return choices.package === 'esel' ? choices.activities.filter((id) => activityById.has(id as never)) : (pkg?.activities ?? []);
}

// ------------------------------------------------------------------ texts

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const TEXT = {
  de: {
    package: (animal: string, descriptor: string) => `Paket ${animal} · ${descriptor}`,
    course: (w: number) => `Deutsch-Intensivkurs, ${plural(w, 'Woche', 'Wochen')}, ${w * TEACHING_UNITS_PER_WEEK} UE (Mo–Fr 09:00–12:30)`,
    materials: 'Lehrmaterial',
    accommodation: (nights: number) => `Unterkunft in Gastfamilien, Doppelzimmer, Frühstück und Abendessen (${plural(nights, 'Nacht', 'Nächte')})`,
    lunch: 'Mittagessen in der Kantine an Unterrichtstagen',
    transport: 'ÖPNV-Ticket Bremen für den ganzen Aufenthalt',
    programme: (names: string[]) => `Kulturprogramm: ${names.join(', ')}`,
    share: (escorts: number) =>
      escorts === 1 ? 'Anteil an den Kosten der Begleitperson' : 'Anteil an den Kosten der Begleitpersonen',
  },
  en: {
    package: (animal: string, descriptor: string) => `${animal} package · ${descriptor}`,
    course: (w: number) => `Intensive German course, ${plural(w, 'week', 'weeks')}, ${w * TEACHING_UNITS_PER_WEEK} lessons (Mon–Fri 09:00–12:30)`,
    materials: 'Course materials',
    accommodation: (nights: number) => `Host family, double room, breakfast and dinner (${plural(nights, 'night', 'nights')})`,
    lunch: 'Lunch at the canteen on school days',
    transport: 'Bremen public transport ticket for the whole stay',
    programme: (names: string[]) => `Culture programme: ${names.join(', ')}`,
    share: (escorts: number) => (escorts === 1 ? "Share of the escort's costs" : "Share of the escorts' costs"),
  },
} as const;

// ----------------------------------------------------------------- lines

type Computed = Omit<OfferLine, 'amount' | 'manual' | 'customText'>;

const money = (n: number) => Math.round(n * 100) / 100;

const MODULE_OF: Record<Exclude<ModuleKey, 'course'> | 'course', GruppenModuleId> = {
  course: 'language-class',
  materials: 'teaching-material',
  accommodation: 'accommodation',
  lunch: 'lunch',
  transport: 'transport',
};

const CHARGE_OF: Record<ModuleKey | 'programme', string> = {
  course: 'tuition',
  materials: 'teaching_material',
  accommodation: 'accommodation_rent',
  lunch: 'catering',
  transport: 'travel_ticket',
  programme: 'culture_programme',
};

/** A block's price for the whole stay; none beyond the four weeks the sheet prices. */
function modulePrice(key: ModuleKey, weeks: number): number | null {
  const m = GRUPPEN_MODULES.find((x) => x.id === MODULE_OF[key]);
  if (!m || weeks < 1 || weeks > 4) return null;
  return m.priceByWeeks[weeks as GruppenWeeks];
}

function line(audience: Audience, key: string, chargeType: string, description: string, unitAmount: number | null, included = false): Computed {
  return {
    key,
    audience,
    chargeType,
    description,
    quantity: 1,
    unit: 'item',
    unitAmount: included ? 0 : unitAmount,
    listUnitAmount: included ? 0 : unitAmount,
    rateId: null,
    included,
  };
}

/** The lines a group offer computes, before anything typed over them. */
export function computedLines(input: StayInput): Computed[] {
  if (input.kind !== 'group') return [];
  const t = TEXT[input.language];
  const { choices } = input.stay;
  const { nights } = measure(input);
  const weeks = pricedWeeks(input);
  const pkg = getGruppenPackage(choices.package);
  const activities = activitiesOf(choices);
  const names = activities.map((id) => activityById.get(id as never)?.name ?? id);
  const programmePrice = activities.reduce((s, id) => s + (activityById.get(id as never)?.price ?? 0), 0);
  const out: Computed[] = [];

  if (pkg && choices.package !== 'esel') {
    // A fixed package: its price, and what it includes without amounts.
    out.push(line('participant', 'package', 'group_package', t.package(pkg.animal[input.language], pkg.descriptor[input.language]), pkg.priceFrom));
    out.push(line('participant', 'inc:course', 'tuition', t.course(weeks), null, true));
    out.push(line('participant', 'inc:accommodation', 'accommodation_rent', t.accommodation(nights), null, true));
    out.push(line('participant', 'inc:lunch', 'catering', t.lunch, null, true));
    out.push(line('participant', 'inc:transport', 'travel_ticket', t.transport, null, true));
    out.push(line('participant', 'inc:materials', 'teaching_material', t.materials, null, true));
    if (names.length) out.push(line('participant', 'inc:programme', 'culture_programme', t.programme(names), null, true));
  } else {
    const m = choices.modules;
    if (m.course) out.push(line('participant', 'course', CHARGE_OF.course, t.course(weeks), modulePrice('course', weeks)));
    if (m.materials) out.push(line('participant', 'materials', CHARGE_OF.materials, t.materials, modulePrice('materials', weeks)));
    if (m.accommodation) out.push(line('participant', 'accommodation', CHARGE_OF.accommodation, t.accommodation(nights), modulePrice('accommodation', weeks)));
    if (m.lunch) out.push(line('participant', 'lunch', CHARGE_OF.lunch, t.lunch, modulePrice('lunch', weeks)));
    if (m.transport) out.push(line('participant', 'transport', CHARGE_OF.transport, t.transport, modulePrice('transport', weeks)));
    if (names.length) out.push(line('participant', 'programme', CHARGE_OF.programme, t.programme(names), programmePrice));
  }

  // Escorts: the stay, the meals, the ticket and the afternoons; no course.
  if (input.escorts > 0) {
    const fixed = choices.package !== 'esel';
    const m = choices.modules;
    if (fixed || m.accommodation) out.push(line('escort', 'accommodation', CHARGE_OF.accommodation, t.accommodation(nights), modulePrice('accommodation', weeks)));
    if (fixed || m.lunch) out.push(line('escort', 'lunch', CHARGE_OF.lunch, t.lunch, modulePrice('lunch', weeks)));
    if (fixed || m.transport) out.push(line('escort', 'transport', CHARGE_OF.transport, t.transport, modulePrice('transport', weeks)));
    if (names.length) out.push(line('escort', 'programme', CHARGE_OF.programme, t.programme(names), programmePrice));
  }
  return out;
}

function finish(l: Computed, manual: boolean, customText: boolean): OfferLine {
  const amount = l.unitAmount == null ? null : money(l.quantity * l.unitAmount);
  return { ...l, amount, manual, customText };
}

function manualLine(m: ManualLine): OfferLine {
  return finish(
    { key: m.key, audience: m.audience, chargeType: m.chargeType, description: m.description, quantity: m.quantity, unit: 'item', unitAmount: m.unitAmount, listUnitAmount: null, rateId: null, included: false },
    true,
    false
  );
}

const sum = (lines: OfferLine[]) => money(lines.reduce((s, l) => s + (l.amount ?? 0), 0));

/**
 * Every line of the offer: computed ones with what was typed over them, the
 * typed lines, and — when the group carries its escorts — the participants'
 * share of them, computed last from the escorts' final lines and rounded up to
 * the euro, so the group always covers them.
 */
export function buildLines(input: StayInput): OfferLine[] {
  const { overrides, manual, choices } = input.stay;
  const lines = computedLines(input).map((l) => {
    const o = overrides[overrideKey(l.audience, l.key)];
    return finish(
      { ...l, unitAmount: l.included ? 0 : (o?.unitAmount ?? l.unitAmount), description: o?.description?.trim() ? o.description : l.description },
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
          included: false,
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
  const groupTotal =
    input.participants == null || perParticipant == null
      ? null
      : money(input.participants * perParticipant + (pricing === 'paid' && perEscort != null ? input.escorts * perEscort : 0));
  return {
    perParticipant,
    perEscort,
    escortShare: share,
    groupTotal,
    carriedByCasa: pricing === 'free' && perEscort != null ? money(input.escorts * perEscort) : null,
  };
}

/** How many afternoons Esel allows: five a week (the Esel sheet, row 11). */
export const activityAllowance = (weeks: number) => weeks * MAX_ACTIVITIES_PER_WEEK;
