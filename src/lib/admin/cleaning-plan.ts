/**
 * A CASA flat's Putzplan, worked out (2026-10-19, migration 0072): from the Monday the plan counts from,
 * each week every room moves one duty on. With more rooms than duties, a room has a free week in turn;
 * with more duties than rooms, the duties nobody has that week wait for the next. Pure, so the page,
 * the occupancy plan and the tests share it.
 */

const DAY = 86_400_000;
const noon = (iso: string) => Date.parse(`${iso}T12:00:00Z`);

/** The Monday of the week a day falls in. */
export const mondayOf = (iso: string) => new Date(noon(iso) - ((new Date(noon(iso)).getUTCDay() + 6) % 7) * DAY).toISOString().slice(0, 10);

/** Whole weeks from the plan's first Monday to the week of `day` (negative before it). */
export const weeksSince = (from: string, day: string) => Math.round((noon(mondayOf(day)) - noon(mondayOf(from))) / (7 * DAY));

/** The duty (its index in order) a room has in a week, or null for a free week. */
export function dutyIndex(room: number, rooms: number, duties: number, week: number): number | null {
  const slots = Math.max(rooms, duties);
  if (!duties || !slots) return null;
  const slot = (((room + week) % slots) + slots) % slots;
  return slot < duties ? slot : null;
}

/** A week of the plan: for each room, in the rooms' order, its duty or null. */
export function weekPlan<D>(rooms: readonly unknown[], duties: readonly D[], from: string, day: string): (D | null)[] {
  const week = weeksSince(from, day);
  return rooms.map((_, i) => {
    const index = dutyIndex(i, rooms.length, duties.length, week);
    return index === null ? null : duties[index];
  });
}
