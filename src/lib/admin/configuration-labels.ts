/**
 * Labels for the setup screen, in their own module with NO database import.
 *
 * `configuration.ts` imports `db.ts`, which imports `server-only` and `pg`.
 * The rate form is a client component and needs these strings, so importing
 * them from `configuration.ts` drags the driver into the browser bundle and
 * the build fails on `dns` / `net` / `util/types`. Constants a client
 * component needs live here; everything that touches the database stays there.
 */

export const RATE_SCOPE_LABELS: Record<string, string> = {
  course_type: 'Courses',
  exam_type: 'Exams',
  accommodation: 'Accommodation',
  material: 'Books & material',
  charge_type: 'Fees & charges',
};

export const RATE_UNIT_LABELS: Record<string, string> = {
  item: 'once',
  week: 'per week',
  lesson: 'per lesson',
  night: 'per night',
  month: 'per month',
  person_week: 'per person / week',
};

/**
 * `rates.variant` (0021): which version of a priced thing. The group price
 * list for offers uses these (db/seeds/0007); a rate with a variant is only
 * found by a lookup that names it, so none is ever a learner's own price.
 */
export const RATE_VARIANT_LABELS: Record<string, string> = {
  group: 'Groups',
  canteen: 'Canteen',
  small: 'Small programme',
  medium: 'Medium programme',
  large: 'Large programme',
  'student-week': 'Pupils, weekly',
  'student-month': 'Pupils, monthly',
  'adult-week': 'Adults, weekly',
  'adult-month': 'Adults, monthly',
};
