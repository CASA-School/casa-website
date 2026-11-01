import type { Session } from './day-plan-labels';

export const BOOKING_CATEGORIES = ['all', 'intensive', 'evening', 'exam'] as const;
export type BookingCategory = typeof BOOKING_CATEGORIES[number];
export type BookingContext = { category?: BookingCategory; session?: Session; level?: string; month?: string; start?: string };
export type BookingFacet = { category: string; typeId: string | null; session: Session | null; level: string | null; start: string | null };
export type BookingDemand = { scope: 'session' | 'month' | 'total'; month: string | null; category: string | null; session: Session | null; bookings: number; students: number; reserved: number };

export const validBookingMonth = (value: string | undefined) => value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : undefined;
export const matchesBookingLevel = (actual: string | null, level?: string) => !level || actual === level || (!level.includes('.') && Boolean(actual?.startsWith(`${level}.`)));

/** Facets are real course/exam starts and booked periods, including legacy periods without a course. */
export function contextFacets(facets: readonly BookingFacet[], context: BookingContext, typeId?: string) {
  return facets.filter(f => (!context.category || context.category === 'all' || f.category === context.category)
    && (!typeId || (typeId === 'exam' ? f.category === 'exam' : f.typeId === typeId))
    && (!context.session || f.session === context.session)
    && matchesBookingLevel(f.level, context.level)
    && (!context.month || f.start?.startsWith(context.month))
    && (!context.start || f.start === context.start));
}

/** A parent change drops incompatible descendants immediately, including stale dates from another course. */
export function adjustBookingContext(values: Record<string, string>, change: Record<string, string>, facets: readonly BookingFacet[]) {
  const next: Record<string, string> = { ...values, ...change, page: '' };
  if ('category' in change || 'type' in change) {
    for (const key of ['session', 'level', 'month', 'start']) if (!(key in change)) delete next[key];
    if ('category' in change) delete next.type;
    else if ('type' in change) delete next.category;
  }
  if ('session' in change) delete next.start;
  if ('level' in change) delete next.start;
  if ('month' in change) { delete next.start; delete next.from; delete next.to; delete next.period; delete next.year; }
  if ('from' in change || 'to' in change) { delete next.period; delete next.month; delete next.start; delete next.year; }
  if ('period' in change) { delete next.from; delete next.to; delete next.month; delete next.start; delete next.year; }
  const category = BOOKING_CATEGORIES.find(c => c === next.category) ?? 'all';
  const base = { category };
  if (next.session && !('session' in change) && !contextFacets(facets, { ...base, session: next.session as Session }, next.type).length) delete next.session;
  const session = next.session as Session | undefined;
  if (next.level && !('level' in change) && !contextFacets(facets, { ...base, session, level: next.level }, next.type).length) delete next.level;
  if (next.month && !('month' in change) && !contextFacets(facets, { ...base, session, level: next.level, month: next.month }, next.type).length) { delete next.month; delete next.start; }
  return next;
}
