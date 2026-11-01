import { addDays } from './offers/stay';
import { isIsoDay } from './booking-levels';
import { foldSearch, isIdentifier, parseQuery } from './search-query';

export const BOOKING_VIEW_KEYS = ['current', 'upcoming', 'unclear', 'followup', 'past', 'cancelled', 'reserved', 'all'] as const;
export const BOOKING_SORT_KEYS = ['name', 'start', 'balance'] as const;
export type BookingSort = typeof BOOKING_SORT_KEYS[number];
export type BookingTypeChoice = { id: string; name: string; slug?: string };
export type BookingTask = { recognized: boolean; search: string; params: Record<string, string> };

/** Read office tasks conservatively; exact identifiers keep their existing record search. */
export function readBookingTask(raw: string, types: readonly BookingTypeChoice[], today: string): BookingTask {
  if (isIdentifier(parseQuery(raw))) return { recognized: false, search: raw, params: {} };
  let text = foldSearch(raw);
  const params: Record<string, string> = {};
  let recognized = false;
  const take = (pattern: RegExp, values: Record<string, string>) => {
    if (pattern.test(text)) { text = text.replace(pattern, ' '); Object.assign(params, values); recognized = true; }
  };
  take(/\b(?:zahlung(?:en)? offen|offene zahlungen|unbezahlt|unpaid|outstanding payments)\b/g, { filter: 'unclear' });
  take(/\b(?:wiedervorlage|nachfassen|follow up|followup)\b/g, { filter: 'followup' });
  take(/\b(?:nachsten? 14 tagen?|starten in 14 tagen|next 14 days)\b/g, { filter: 'upcoming', period: 'next14' });
  take(/\b(?:diesen? monat|this month)\b/g, { period: 'month' });
  for (const [pattern, slug] of [[/\babendkurse?\b|\bevening(?: courses?)?\b/g, 'evening-german'], [/\bintensivkurse?\b|\bintensive(?: courses?)?\b/g, 'intensive-german']] as const) {
    const type = types.find(t => t.slug === slug);
    if (type) take(pattern, { type: type.id });
  }
  take(/\b(?:telc|prufungen?|exams?)\b/g, { type: 'exam' });
  const level = /\b([abc][12]\+?(?:\.[12])?)(?=\s|$)/.exec(text);
  if (level) take(new RegExp(level[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), { level: level[1].toUpperCase() });
  const months = ['januar|january', 'februar|february', 'marz|march', 'april', 'mai|may', 'juni|june', 'juli|july', 'august', 'september', 'oktober|october', 'november', 'dezember|december'];
  months.forEach((month, index) => {
    const match = new RegExp(`\\b(?:${month})(?: (20\\d{2}))?\\b`).exec(text);
    if (!match || !recognized) return;
    const year = Number(match[1] ?? today.slice(0, 4));
    const start = `${year}-${String(index + 1).padStart(2, '0')}-01`;
    const end = new Date(Date.UTC(year, index + 1, 0)).toISOString().slice(0, 10);
    text = text.replace(match[0], ' '); Object.assign(params, { from: start, to: end }); recognized = true;
  });
  return { recognized, search: recognized ? text.replace(/\s+/g, ' ').trim() : raw, params };
}

export function bookingPeriod(period: string, today: string): { startFrom?: string; startTo?: string } {
  if (period === 'next14') return { startFrom: today, startTo: addDays(today, 14) };
  if (period === 'month') {
    const first = today.slice(0, 7) + '-01';
    const end = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0)).toISOString().slice(0, 10);
    return { startFrom: first, startTo: end };
  }
  return {};
}

export const validBookingDay = (value: string | undefined): string | undefined => value && isIsoDay(value) ? value : undefined;
