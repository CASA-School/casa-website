import 'server-only';

import { query } from './db';

/**
 * The website's statistics, as /admin/statistics reads them (migrations 0106, 0108): visits, the
 * pages they start on, where readers come from, their browsers' languages and campaigns, counted on
 * the server from page loads (src/lib/site-views.ts says why clicks inside the site are not among
 * them); and from the workspace's own records, what came in through the website and the ages and
 * nationalities of those who registered, as counts. Days are Bremen's days. How fast pages load for
 * real readers is Google's to measure (Search Console, Core Web Vitals).
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

export async function sources(days: StatRange, limit = 50) {
  const rows = await query<{ host: string | null; visits: string }>(
    `SELECT referrer_host AS host, count(*) AS visits
       FROM site_page_views WHERE entry AND viewed_at >= ${SINCE}
      GROUP BY referrer_host ORDER BY visits DESC LIMIT $2`,
    [days, limit]
  );
  return rows.map((row) => ({ host: row.host, visits: Number(row.visits), kind: row.host ? sourceKind(row.host) : null }));
}

/** The browsers' preferred languages, per visit: which languages the site's readers speak. */
export async function languages(days: StatRange, limit = 12) {
  const rows = await query<{ language: string; visits: string }>(
    `SELECT language, count(*) AS visits
       FROM site_page_views WHERE entry AND language IS NOT NULL AND viewed_at >= ${SINCE}
      GROUP BY language ORDER BY visits DESC, language LIMIT $2`,
    [days, limit]
  );
  return rows.map((row) => ({ language: row.language, visits: Number(row.visits) }));
}

/** Visits that came through a tagged link: a Google Ads click, a newsletter, a partner's page. */
export async function campaigns(days: StatRange, limit = 10) {
  const rows = await query<{ campaign: string; visits: string }>(
    `SELECT campaign, count(*) AS visits
       FROM site_page_views WHERE entry AND campaign IS NOT NULL AND viewed_at >= ${SINCE}
      GROUP BY campaign ORDER BY visits DESC, campaign LIMIT $2`,
    [days, limit]
  );
  return rows.map((row) => ({ campaign: row.campaign, visits: Number(row.visits) }));
}

/** When the first visit of the period was counted: before it, the site could not count. */
export async function firstVisit(days: StatRange): Promise<Date | null> {
  const [row] = await query<{ first: Date | null }>(`SELECT min(viewed_at) AS first FROM site_page_views WHERE viewed_at >= ${SINCE}`, [days]);
  return row?.first ?? null;
}

export const LEAD_KINDS = [
  'course',
  'exam',
  'enquiry:general',
  'enquiry:group',
  'enquiry:company',
  'enquiry:tandem',
  'enquiry:interest',
  'appointment:placement',
  'appointment:group_consultation',
  'appointment:consultation',
  'appointment:other',
  'application',
] as const;
export type LeadKind = (typeof LEAD_KINDS)[number];

/**
 * What came in through the website in the period, or since `from` when given: registrations
 * (course or exam), enquiries by form, appointments booked online, job applications. Spam and
 * deleted enquiries are left out.
 */
export async function leads(days: StatRange, from: Date | null = null) {
  const rows = await query<{ kind: LeadKind; n: string }>(
    `WITH since AS (SELECT coalesce($1::timestamptz, now() - make_interval(days => $2::int)) AS t)
     SELECT CASE WHEN EXISTS (SELECT 1 FROM course_registrations c WHERE c.registration_id = r.id) THEN 'course' ELSE 'exam' END AS kind,
            count(*) AS n
       FROM registrations r WHERE r.submitted_at >= (SELECT t FROM since) AND r.status <> 'spam' GROUP BY 1
     UNION ALL
     SELECT 'enquiry:' || CASE WHEN e.source = 'tandem-form' THEN 'tandem'
                               WHEN e.source LIKE 'interest%' THEN 'interest'
                               WHEN e.kind IN ('group', 'company') THEN e.kind
                               ELSE 'general' END,
            count(*)
       FROM enquiries e WHERE e.submitted_at >= (SELECT t FROM since) AND e.deleted_at IS NULL AND e.status <> 'spam' GROUP BY 1
     UNION ALL
     SELECT 'appointment:' || a.kind, count(*) FROM appointments a WHERE a.source = 'website' AND a.created_at >= (SELECT t FROM since) GROUP BY 1
     UNION ALL
     SELECT 'application', count(*) FROM career_applications c WHERE c.created_at >= (SELECT t FROM since) HAVING count(*) > 0`,
    [from, days]
  );
  const counts = new Map<LeadKind, number>();
  for (const row of rows) counts.set(row.kind, (counts.get(row.kind) ?? 0) + Number(row.n));
  return LEAD_KINDS.filter((kind) => counts.has(kind)).map((kind) => ({ kind, count: counts.get(kind)! }));
}

export const AGE_GROUPS = ['under18', '18-24', '25-34', '35-44', '45-54', '55+'] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

/**
 * Who registers through the website: age at registration and nationality, one per registration,
 * from the form's parsed values (0007: `birth_date`, `nationality_code`, with the typed text where
 * no country matched). Counts only; nobody is named.
 */
export async function registrants(days: StatRange) {
  const sql = `WITH people AS (
       SELECT DISTINCT ON (r.id) r.id, r.submitted_at, l.birth_date, l.nationality_code, l.nationality_raw
         FROM registrations r
         JOIN (SELECT registration_id, birth_date, nationality_code, nationality_raw FROM course_registrations
               UNION ALL
               SELECT registration_id, birth_date, nationality_code, nationality_raw FROM exam_registrations) l
           ON l.registration_id = r.id
        WHERE r.submitted_at >= ${SINCE} AND r.status <> 'spam'
        ORDER BY r.id
     )`;
  const [ages, nationalities] = await Promise.all([
    query<{ age_group: AgeGroup; n: string }>(
      `${sql}, aged AS (
         SELECT date_part('year', age((submitted_at AT TIME ZONE 'Europe/Berlin')::date, birth_date))::int AS age
           FROM people WHERE birth_date IS NOT NULL
       )
       SELECT CASE WHEN age < 18 THEN 'under18' WHEN age < 25 THEN '18-24' WHEN age < 35 THEN '25-34'
                   WHEN age < 45 THEN '35-44' WHEN age < 55 THEN '45-54' ELSE '55+' END AS age_group,
              count(*) AS n
         FROM aged WHERE age BETWEEN 5 AND 99 GROUP BY 1`,
      [days]
    ),
    query<{ code: string | null; raw: string | null; n: string }>(
      `${sql}
       SELECT nationality_code AS code,
              CASE WHEN nationality_code IS NULL THEN initcap(lower(btrim(nationality_raw))) END AS raw,
              count(*) AS n
         FROM people WHERE nationality_code IS NOT NULL OR btrim(coalesce(nationality_raw, '')) <> ''
        GROUP BY 1, 2 ORDER BY n DESC, 1, 2 LIMIT 12`,
      [days]
    ),
  ]);
  const byGroup = new Map(ages.map((row) => [row.age_group, Number(row.n)]));
  return {
    ages: AGE_GROUPS.map((group) => ({ group, count: byGroup.get(group) ?? 0 })),
    nationalities: nationalities.map((row) => ({ code: row.code?.trim() ?? null, raw: row.raw, count: Number(row.n) })),
  };
}
