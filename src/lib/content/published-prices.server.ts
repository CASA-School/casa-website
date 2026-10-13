import 'server-only';

import { isWorkspaceDatabaseConfigured, query } from '@/lib/admin/db';
import { teachingWeeks, termLessons } from '@/lib/admin/offers/course';
import { coursePrice, listOn } from '@/lib/admin/prices/price-list';
import { loadPriceLists } from '@/lib/admin/prices/repo';
import { toDateInputValue, todayInputValue } from '@/lib/dates';

import { DEFAULT_PUBLISHED_PRICES, publishedFromList, type PublishedPrices } from './published-prices';

/**
 * The website's prices from the price list in force (published-prices.ts),
 * read once a minute per process like the live values: a price changed on the
 * Prices screen shows within a minute, and a page render costs no query.
 * Without a database, or when it cannot be read, the published figures.
 */

const TTL_MS = 60_000;

const store = globalThis as typeof globalThis & {
  casaPublishedPrices?: { until: number; prices: PublishedPrices };
  casaFacts?: Map<string, unknown>;
};

/** After a change on the Prices screen: this process reads the list again, and the live values with it. */
export function forgetPublishedPrices() {
  store.casaPublishedPrices = undefined;
  store.casaFacts?.clear();
}

async function read(): Promise<PublishedPrices> {
  const today = todayInputValue();
  const [lists, terms, books] = await Promise.all([
    loadPriceLists(),
    query<{ start_date: Date; end_date: Date; schedule: { days?: string[]; time?: string } | null; lessons: number | null; lessons_per_week: number }>(
      `SELECT i.start_date, i.end_date, i.schedule, i.lessons, t.lessons_per_week
         FROM course_instances i JOIN course_types t ON t.id = i.course_type_id
        WHERE t.slug = 'evening-german' AND i.start_date >= current_date AND i.status <> 'cancelled'`
    ),
    query<{ id: string }>(`SELECT id FROM materials WHERE is_active AND level_code IS NOT NULL AND part IN (1, 2)`),
  ]);

  const eveningTerms = terms
    .map((t) => {
      const startDate = toDateInputValue(t.start_date);
      const endDate = toDateInputValue(t.end_date);
      const slot = Array.isArray(t.schedule?.days) && typeof t.schedule?.time === 'string' ? { days: t.schedule.days, time: t.schedule.time } : null;
      return coursePrice(lists, 'evening-german', startDate, {
        weeks: teachingWeeks(startDate, endDate),
        lessons: termLessons({ startDate, endDate, slot, lessons: t.lessons }, t.lessons_per_week),
      })?.amount;
    })
    .filter((n): n is number => n != null);

  return publishedFromList(listOn(lists, today), { eveningTerms, courseBooks: books.map((b) => b.id) });
}

export async function publishedPrices(): Promise<PublishedPrices> {
  if (!isWorkspaceDatabaseConfigured()) return DEFAULT_PUBLISHED_PRICES;
  const cached = store.casaPublishedPrices;
  if (cached && Date.now() < cached.until) return cached.prices;
  try {
    const prices = await read();
    store.casaPublishedPrices = { until: Date.now() + TTL_MS, prices };
    return prices;
  } catch (error) {
    console.error('[published prices] could not be read', error);
    return cached?.prices ?? DEFAULT_PUBLISHED_PRICES;
  }
}
