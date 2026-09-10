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
  /** Resolved rate, else the catalogue's published price, else null. */
  tuition: number | null;
  tuitionUnit: 'week' | 'item' | 'lesson' | null;
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
 * `B1+` has no sibling — it is a level in its own right.
 */
export function levelSiblings(code: string): string[] {
  const match = /^([A-C][12])\.([12])$/.exec(code);
  if (!match) return [code];
  return [`${match[1]}.1`, `${match[1]}.2`];
}

export const levelBand = (code: string): string => {
  const match = /^([A-C][12])\./.exec(code);
  return match ? match[1] : code;
};
