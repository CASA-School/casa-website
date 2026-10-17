/**
 * The booking offer's shapes and its two pure helpers.
 *
 * Separate from `booking-offer.ts` because the wizard is a client component
 * and that module imports `db.ts`, which pulls `pg` and `server-only` into the
 * browser bundle (CLAUDE.md, Conventions). Types and pure functions live here;
 * everything that touches Postgres stays there.
 */

export type CohortOffer = {
  id: string;
  courseTypeId: string;
  label: string;
  startDate: Date;
  endDate: Date;
  weeks: number;
  levelCode: string | null;
  session: string | null;
  roomName: string | null;
  seatsTaken: number;
  capacity: number;
  /**
   * Places per level in this start (the waiting list, 0031): only levels with places set, bookings
   * or a queue; any other level is one group of 14, empty. `queue` is the waiting learners in order.
   */
  levels: Record<string, LevelPlaces>;
  /** Resolved rate, else the catalogue's published price, else null. */
  tuition: number | null;
  tuitionUnit: 'week' | 'item' | 'lesson' | null;
};

/** `queue`: the learners waiting, in order; `offeredTo`: those a place is held for. Canonical person ids. */
export type LevelPlaces = { places: number; booked: number; offered: number; queue: string[]; offeredTo: string[] };

/** A level in a start, with the default for one nobody has used yet. */
export const levelPlaces = (cohort: Pick<CohortOffer, 'levels'>, levelCode: string): LevelPlaces =>
  cohort.levels[levelCode] ?? { places: 14, booked: 0, offered: 0, queue: [], offeredTo: [] };

/**
 * Free places: what is left after bookings and places held for an offer, never below zero. For the
 * learner a place is held for, that place is theirs: it is free to them.
 */
export const levelFree = (l: LevelPlaces, forPerson?: string) =>
  Math.max(0, l.places - l.booked - l.offered + (forPerson && l.offeredTo.includes(forPerson) ? 1 : 0));

/** How many wait in front of a learner: none if a place is held for them, their place if queued, else all. */
export const waitingAhead = (l: LevelPlaces, person: string) => {
  if (l.offeredTo.includes(person)) return 0;
  const at = l.queue.indexOf(person);
  return at === -1 ? l.queue.length : at;
};

export type CourseTypeOffer = {
  id: string;
  name: string;
  slug: string;
  cohorts: CohortOffer[];
};

export type MaterialOffer = {
  id: string;
  title: string;
  levelCode: string | null;
  part: number | null;
  price: number | null;
};

export type AccommodationOffer = {
  code: string;
  name: string;
  isCasaManaged: boolean;
};

export type ExamOffer = {
  id: string;
  name: string;
  /** Fee for both parts, and for a single part, when a rate exists. */
  feeBothParts: number | null;
  feeOnePart: number | null;
  /** Its sittings still ahead (0036), each with its places — the same shape as a course level's. */
  sittings: SittingOffer[];
};

export type SittingOffer = {
  id: string;
  startsAt: Date;
  /** The last day it can be reported to telc; after it, a booking is a late entry. */
  deadline: Date | null;
  places: LevelPlaces;
};

export type BookingOffer = {
  courseTypes: CourseTypeOffer[];
  exams: ExamOffer[];
  levels: { code: string; cefr: string | null }[];
  materials: MaterialOffer[];
  accommodation: AccommodationOffer[];
  roomTypes: { code: string; name: string }[];
  catering: { code: string; name: string }[];
  enrolmentFee: number | null;
  currency: string;
};

/**
 * The half-level pairing CASA teaches in.
 *
 * A2 is taught as A2.1 then A2.2, and one book covers one half. So "the whole
 * level" means both halves and therefore two books; "this half" means one.
 * B1+ is taught the same way: B1+.1 then B1+.2.
 */
export function levelSiblings(code: string): string[] {
  const match = /^([A-C][12]\+?)\.([12])$/.exec(code);
  if (!match) return [code];
  return [`${match[1]}.1`, `${match[1]}.2`];
}

export const levelBand = (code: string): string => {
  const match = /^([A-C][12])\./.exec(code);
  return match ? match[1] : code;
};
