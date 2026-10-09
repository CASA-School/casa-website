/**
 * When the school is closed (2026-10-09). casa-bremen.de listed these in its
 * footer as „Schließzeiten"; the move had lost them. The footer shows the ones
 * not yet over, and Ina's appointment calendar offers no time inside one.
 *
 * Inclusive dates, Bremen time. Add next year's when CASA sets them.
 */
import type { ContentLocale } from '@/lib/content/types';

export type SchoolClosure = { label: Record<ContentLocale, string>; from: string; to: string };

export const SCHOOL_CLOSURES: SchoolClosure[] = [
  { label: { de: 'Ostern', en: 'Easter' }, from: '2026-03-30', to: '2026-04-06' },
  { label: { de: 'Weihnachten', en: 'Christmas' }, from: '2026-12-21', to: '2027-01-01' },
];

export function isSchoolClosed(date: string) {
  return SCHOOL_CLOSURES.some((closure) => date >= closure.from && date <= closure.to);
}

/** The closures that have not ended by `today` (YYYY-MM-DD). */
export function upcomingClosures(today: string) {
  return SCHOOL_CLOSURES.filter((closure) => closure.to >= today);
}

/** „21.12.26 – 01.01.27", as casa-bremen.de wrote it; „21 Dec 2026 – 1 Jan 2027" in English. */
export function closureRange(closure: SchoolClosure, locale: ContentLocale) {
  const format = (date: string) => {
    const [year, month, day] = date.split('-');
    if (locale === 'de') return `${day}.${month}.${year.slice(2)}`;
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
  };
  return `${format(closure.from)} – ${format(closure.to)}`;
}
