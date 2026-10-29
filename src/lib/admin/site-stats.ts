import 'server-only';

import { query } from './db';

/**
 * The website's statistics, as /admin/statistics reads them (migration 0106): visits, the pages
 * they start on and where readers come from, counted on the server from page loads
 * (src/lib/site-views.ts says why clicks inside the site are not among them). Days are Bremen's
 * days. How fast pages load for real readers is Google's to measure (Search Console, Core Web Vitals).
 */

export const STAT_RANGES = [7, 30, 90] as const;
export type StatRange = (typeof STAT_RANGES)[number];

const SEARCH = /(^|\.)(google|bing|duckduckgo|ecosia|yahoo|startpage|qwant|yandex|baidu|brave)\./;
const ANSWER = /(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|gemini\.google\.com|copilot\.microsoft\.com|claude\.ai|you\.com)$/;
export type SourceKind = 'search' | 'ai' | 'other';
export const sourceKind = (host: string): SourceKind => (ANSWER.test(host) ? 'ai' : SEARCH.test(host) ? 'search' : 'other');

const SINCE = `now() - make_interval(days => $1::int)`;
const DAY = `(viewed_at AT TIME ZONE 'Europe/Berlin')::date`;

export async function siteTotals(days: StatRange) {
  const [row] = await query<{ views: string; visits: string; mobile: string; devices: string }>(
    `SELECT count(*) AS views,
            count(*) FILTER (WHERE entry) AS visits,
            count(*) FILTER (WHERE device = 'mobile') AS mobile,
            count(*) AS devices
       FROM site_page_views WHERE viewed_at >= ${SINCE}`,
    [days]
  );
  return {
    views: Number(row?.views ?? 0),
    visits: Number(row?.visits ?? 0),
    mobileShare: Number(row?.devices) ? Number(row.mobile) / Number(row.devices) : 0,
  };
}

export async function viewsByDay(days: StatRange) {
  const rows = await query<{ day: Date; n: string }>(
    `WITH span AS (
       SELECT generate_series((now() AT TIME ZONE 'Europe/Berlin')::date - ($1::int - 1), (now() AT TIME ZONE 'Europe/Berlin')::date, interval '1 day')::date AS day
     )
     SELECT span.day, count(v.id) AS n
       FROM span LEFT JOIN site_page_views v ON ${DAY.replace('viewed_at', 'v.viewed_at')} = span.day AND v.entry
      GROUP BY span.day ORDER BY span.day`,
    [days]
  );
  return rows.map((row) => ({ day: row.day, count: Number(row.n) }));
}

export async function topPages(days: StatRange, limit = 15) {
  const rows = await query<{ path: string; views: string; entries: string }>(
    `SELECT path, count(*) AS views, count(*) FILTER (WHERE entry) AS entries
       FROM site_page_views WHERE viewed_at >= ${SINCE}
      GROUP BY path ORDER BY entries DESC, views DESC, path LIMIT $2`,
    [days, limit]
  );
  return rows.map((row) => ({ path: row.path, views: Number(row.views), entries: Number(row.entries) }));
}

export async function sources(days: StatRange, limit = 12) {
  const rows = await query<{ host: string | null; visits: string }>(
    `SELECT referrer_host AS host, count(*) AS visits
       FROM site_page_views WHERE entry AND viewed_at >= ${SINCE}
      GROUP BY referrer_host ORDER BY visits DESC LIMIT $2`,
    [days, limit]
  );
  return rows.map((row) => ({ host: row.host, visits: Number(row.visits), kind: row.host ? sourceKind(row.host) : null }));
}
