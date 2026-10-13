/**
 * CASA's price list, as data. Pure.
 *
 * A price list is every price CASA charges, valid from a date: the rows of
 * `rates` that share a `valid_from` (migration 0011). A new list is prepared
 * once a year — a copy of the one in force, with what changes changed — and
 * takes over on its date; the list before it closes the day before. An offer
 * or a booking is priced from the list in force on the day each thing starts:
 * the course on its first day, the room on arrival, the exam on its date.
 *
 * A course or a stay is priced by a tariff: an exact price for a number of
 * weeks (the intensive course's 1 to 10 weeks, a stay of 1 to 3 weeks), and a
 * rate for everything the table does not list — per week, per lesson, or one
 * price. These are SchoolMan's rules, read from its booking scripts
 * (docs/CATALOGUE_AND_PRICING.md §Price lists).
 */

export type PriceUnit = 'week' | 'lesson' | 'item';
export const PRICE_UNITS: readonly PriceUnit[] = ['week', 'lesson', 'item'];

/** One price, and the `rates` row it is (null for one not stored yet). */
export type PriceRow = { id: string | null; amount: number };

export type Tariff = {
  /** An exact price for a number of weeks: 1 week 145 €, 4 weeks 520 €. */
  table: Record<number, PriceRow>;
  /** Everything the table does not list: per week, per lesson, or one price. */
  rate: (PriceRow & { unit: PriceUnit }) | null;
};

/** The fees a price list holds: once per learner, and a first stay's two. */
export const FEES = ['enrolment_fee', 'accommodation_placement_fee', 'deposit'] as const;
export type FeeCode = (typeof FEES)[number];

export type PriceList = {
  validFrom: string;
  /** The day before the next list starts; null for the newest. */
  validTo: string | null;
  /** By course type slug. */
  courses: Record<string, Tariff>;
  /** Accommodation rent, in weeks. */
  rent: Tariff;
  fees: Partial<Record<FeeCode, PriceRow>>;
  /** By material id. */
  books: Record<string, PriceRow>;
  /** By exam code: both parts, and one part alone. */
  exams: Record<string, { full: PriceRow | null; part: PriceRow | null }>;
};

export const emptyTariff = (): Tariff => ({ table: {}, rate: null });

export const emptyList = (validFrom: string): PriceList => ({
  validFrom,
  validTo: null,
  courses: {},
  rent: emptyTariff(),
  fees: {},
  books: {},
  exams: {},
});

// ------------------------------------------------------------ from rates

/** A `rates` row as the price list reads it. */
export type RateRow = {
  id: string;
  scope: 'course_type' | 'exam_type' | 'accommodation' | 'material' | 'charge_type';
  courseSlug: string | null;
  examCode: string | null;
  materialId: string | null;
  chargeType: string | null;
  parts: number | null;
  minQuantity: number | null;
  maxQuantity: number | null;
  unit: string;
  amount: number;
  validFrom: string;
};

function intoTariff(tariff: Tariff, row: RateRow) {
  const price = { id: row.id, amount: row.amount };
  if (row.minQuantity != null && row.minQuantity === row.maxQuantity) tariff.table[row.minQuantity] = price;
  else if ((PRICE_UNITS as readonly string[]).includes(row.unit)) tariff.rate = { ...price, unit: row.unit as PriceUnit };
}

/**
 * The lists in the rows, oldest first, each closed the day before the next
 * starts. A row the price list has no place for (an accommodation type's own
 * rate, a catering surcharge) is left out; nothing writes those yet.
 */
export function listsFromRates(rows: readonly RateRow[]): PriceList[] {
  const lists = new Map<string, PriceList>();
  for (const row of rows) {
    const list = lists.get(row.validFrom) ?? emptyList(row.validFrom);
    lists.set(row.validFrom, list);
    const price = { id: row.id, amount: row.amount };
    if (row.scope === 'course_type' && row.courseSlug) {
      intoTariff((list.courses[row.courseSlug] ??= emptyTariff()), row);
    } else if (row.scope === 'charge_type' && row.chargeType === 'accommodation_rent') {
      intoTariff(list.rent, row);
    } else if (row.scope === 'charge_type' && (FEES as readonly string[]).includes(row.chargeType ?? '')) {
      list.fees[row.chargeType as FeeCode] = price;
    } else if (row.scope === 'material' && row.materialId) {
      list.books[row.materialId] = price;
    } else if (row.scope === 'exam_type' && row.examCode) {
      const exam = (list.exams[row.examCode] ??= { full: null, part: null });
      if (row.parts === 1) exam.part = price;
      else exam.full = price;
    }
  }
  const sorted = [...lists.values()].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
  sorted.forEach((list, i) => {
    list.validTo = sorted[i + 1] ? addDays(sorted[i + 1].validFrom, -1) : null;
  });
  return sorted;
}

// ------------------------------------------------------------ resolving

/** The list in force on a day: the newest that has started; before the first, the first. */
export function listOn(lists: readonly PriceList[], day: string | null): PriceList | null {
  if (!lists.length) return null;
  if (!day) return lists[lists.length - 1];
  let found: PriceList | null = null;
  for (const list of lists) if (list.validFrom <= day) found = list;
  return found ?? lists[0];
}

export type PriceListStatus = 'past' | 'current' | 'future';

export function listStatus(list: Pick<PriceList, 'validFrom' | 'validTo'>, today: string): PriceListStatus {
  if (list.validFrom > today) return 'future';
  if (list.validTo && list.validTo < today) return 'past';
  return 'current';
}

/**
 * A tariff's price: the table's for that many weeks, else the rate — per
 * week times the weeks, per lesson times the lessons, or the one price.
 * Null when there is nothing to price it by.
 */
export function tariffPrice(tariff: Tariff | undefined, q: { weeks: number; lessons?: number | null }): { id: string | null; amount: number } | null {
  if (!tariff) return null;
  const exact = tariff.table[q.weeks];
  if (exact) return exact;
  const rate = tariff.rate;
  if (!rate) return null;
  if (rate.unit === 'item') return rate;
  if (rate.unit === 'week') return q.weeks > 0 ? { id: rate.id, amount: round(rate.amount * q.weeks) } : null;
  return q.lessons ? { id: rate.id, amount: round(rate.amount * q.lessons) } : null;
}

/** A course's price from the list in force when it starts. */
export const coursePrice = (lists: readonly PriceList[], slug: string, start: string | null, q: { weeks: number; lessons?: number | null }) =>
  tariffPrice(listOn(lists, start)?.courses[slug], q);

/** Rent for a stay of whole weeks, from the list in force on arrival. */
export const rentPrice = (lists: readonly PriceList[], arrival: string | null, weeks: number) =>
  weeks > 0 ? tariffPrice(listOn(lists, arrival)?.rent, { weeks }) : null;

export const feePrice = (lists: readonly PriceList[], day: string | null, fee: FeeCode) => listOn(lists, day)?.fees[fee] ?? null;

const round = (n: number) => Math.round(n * 100) / 100;

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The first of January after `today`: where next year's list starts. */
export const nextYearStart = (today: string) => `${Number(today.slice(0, 4)) + 1}-01-01`;

// ------------------------------------------------------------ slots

/**
 * Where a price sits in a list, as one string — what the screen's forms name
 * their inputs by and the repository writes by.
 *
 *   course:<slug>:<weeks>   a course's price for that many weeks
 *   course:<slug>:rate      a course's rate (with its unit)
 *   rent:<weeks> · rent:rate
 *   fee:<charge type>
 *   book:<material id>
 *   exam:<code>:<1|2>       one part, both parts
 */
export type Slot =
  | { kind: 'course'; slug: string; weeks: number | null }
  | { kind: 'rent'; weeks: number | null }
  | { kind: 'fee'; fee: FeeCode }
  | { kind: 'book'; materialId: string }
  | { kind: 'exam'; code: string; parts: 1 | 2 };

const SLUG = /^[a-z0-9-]{2,60}$/;
const CODE = /^[a-z0-9_]{2,40}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const weeksOf = (value: string) => (value === 'rate' ? null : /^\d{1,2}$/.test(value) && Number(value) >= 1 && Number(value) <= 52 ? Number(value) : undefined);

export function parseSlot(text: string): Slot | null {
  const [kind, a, b] = text.split(':');
  if (kind === 'course' && SLUG.test(a ?? '') && b != null) {
    const weeks = weeksOf(b);
    return weeks === undefined ? null : { kind, slug: a, weeks };
  }
  if (kind === 'rent' && a != null && b == null) {
    const weeks = weeksOf(a);
    return weeks === undefined ? null : { kind, weeks };
  }
  if (kind === 'fee' && (FEES as readonly string[]).includes(a ?? '') && b == null) return { kind, fee: a as FeeCode };
  if (kind === 'book' && UUID.test(a ?? '') && b == null) return { kind, materialId: a };
  if (kind === 'exam' && CODE.test(a ?? '') && (b === '1' || b === '2')) return { kind, code: a, parts: Number(b) as 1 | 2 };
  return null;
}

export function slotKey(slot: Slot): string {
  switch (slot.kind) {
    case 'course':
      return `course:${slot.slug}:${slot.weeks ?? 'rate'}`;
    case 'rent':
      return `rent:${slot.weeks ?? 'rate'}`;
    case 'fee':
      return `fee:${slot.fee}`;
    case 'book':
      return `book:${slot.materialId}`;
    case 'exam':
      return `exam:${slot.code}:${slot.parts}`;
  }
}

/** The price a list holds in a slot. */
export function priceAt(list: PriceList, slot: Slot): (PriceRow & { unit?: PriceUnit }) | null {
  switch (slot.kind) {
    case 'course': {
      const tariff = list.courses[slot.slug];
      return (slot.weeks == null ? tariff?.rate : tariff?.table[slot.weeks]) ?? null;
    }
    case 'rent':
      return (slot.weeks == null ? list.rent.rate : list.rent.table[slot.weeks]) ?? null;
    case 'fee':
      return list.fees[slot.fee] ?? null;
    case 'book':
      return list.books[slot.materialId] ?? null;
    case 'exam':
      return (slot.parts === 1 ? list.exams[slot.code]?.part : list.exams[slot.code]?.full) ?? null;
  }
}

/** "1.057,50" or "1057.5" → 1057.5; empty → null; anything else → undefined. */
export function parseAmount(text: string): number | null | undefined {
  const t = text.trim().replace(/\s|€/g, '');
  if (t === '') return null;
  const normalised = /,\d{1,2}$/.test(t) ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(normalised)) return undefined;
  const n = Number(normalised);
  return n <= 100_000 ? n : undefined;
}
