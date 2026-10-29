import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Reader, type CountryResponse } from 'mmdb-lib';
import type { NextRequest } from 'next/server';

import { isWorkspaceDatabaseConfigured, query } from '@/lib/admin/db';
import { clientAddress } from '@/lib/api/rate-limit';

/**
 * The website's page views (2026-10-29, migration 0106), counted by src/proxy.ts from the
 * request a browser sends for a page: its path, the Referer, the User-Agent, the preferred language
 * (Accept-Language), a campaign tag in the link (utm, gclid) and the country of the IP address
 * (DB-IP Lite, read in memory; the address itself is never stored). Nothing runs
 * in the browser and nothing is read from the reader's device, so § 25 TDDDG is not touched
 * and the privacy policy's §5 stays true; nothing that identifies a reader is kept.
 *
 * What the server sees is a page LOAD: the first page of a visit, a page opened in a new tab, a
 * reload. A click inside the site loads the next page through the router, and Next strips the
 * router's headers before the proxy sees the request, so a click cannot be told from a prefetch
 * and is not counted. The statistics are therefore visits and their landing pages, not every
 * page read. Crawlers, test robots and the preview hosts are not counted.
 */

const PUBLIC_HOST = /^casa-bremen\.de(:\d+)?$/i;
const ROBOT = /bot|crawl|spider|slurp|lighthouse|headless|pagespeed|preview|monitor|inspectiontool|chatgpt-user|externalagent|yeti|curl|wget|python|axios|node-fetch|go-http|facebookexternalhit|embedly/i;
const PATH = /^\/[A-Za-z0-9/_.%-]{0,199}$/;

type View = {
  path: string;
  locale: string;
  device: 'mobile' | 'tablet' | 'desktop';
  entry: boolean;
  referrer: string | null;
  language: string | null;
  campaign: string | null;
  country: string | null;
};

/*
 * DB-IP's free country database (CC BY 4.0, https://db-ip.com), in `geo/` beside the app: the
 * image fetches the current month's on each build (Dockerfile, stage geo), a developer with
 * `npm run geo:fetch`. Read once; without it, visits have no country.
 */
let countries: Reader<CountryResponse> | null | undefined;

function countryReader(): Reader<CountryResponse> | null {
  if (countries !== undefined) return countries;
  const file = join(process.cwd(), 'geo', 'dbip-country-lite.mmdb');
  try {
    countries = existsSync(file) ? new Reader<CountryResponse>(readFileSync(file)) : null;
  } catch (error) {
    console.error('[site views] country database unreadable', error);
    countries = null;
  }
  return countries;
}

/** The country of the reader's IP address, as two letters; the address is used here and dropped. */
function countryOf(request: NextRequest): string | null {
  const reader = countryReader();
  const address = clientAddress(request);
  if (!reader || address === 'unknown') return null;
  try {
    const code = reader.get(address)?.country?.iso_code;
    return code && /^[A-Z]{2}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}

/** The browser's preferred language, the first tag of Accept-Language without its region: „ar", „tr". */
function preferredLanguage(header: string): string | null {
  const first = header.split(',')[0]?.split(';')[0]?.trim().split('-')[0]?.toLowerCase() ?? '';
  return /^[a-z]{2,3}$/.test(first) ? first : null;
}

/** The campaign a visit's link carried: a Google Ads click, or its utm_source and utm_campaign. */
function campaignOf(params: URLSearchParams): string | null {
  if (params.has('gclid') || params.has('gbraid') || params.has('wbraid')) return 'Google Ads';
  const clean = (value: string | null) => (value ?? '').replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 60);
  const source = clean(params.get('utm_source'));
  const name = clean(params.get('utm_campaign'));
  return source || name ? [source, name].filter(Boolean).join(' · ') : null;
}

/** What to count for this request, or null when it is not a reader's page view. */
export function pageView(request: NextRequest, locale: string): View | null {
  const headers = request.headers;
  const host = headers.get('host') ?? '';
  const local = process.env.NODE_ENV !== 'production' && /^localhost(:\d+)?$/.test(host);
  if (request.method !== 'GET' || !(PUBLIC_HOST.test(host) || local)) return null;
  // A browser opening a page: every browser the site supports sends `sec-fetch-dest: document`
  // and its languages on a page load; the router's fetches and prefetches say `empty`, and scripts
  // and most crawlers send neither, whatever their user agent claims (on the first evening, 235
  // „direct" visits walked the sitemap page by page before this rule).
  if (headers.get('sec-fetch-dest') !== 'document' || !headers.get('accept-language') || headers.get('sec-purpose')?.includes('prefetch')) return null;
  const agent = headers.get('user-agent') ?? '';
  if (!agent || ROBOT.test(agent)) return null;

  const pathname = request.nextUrl.pathname;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (!PATH.test(path)) return null;

  let referrer: string | null = null;
  let internal = false;
  try {
    const from = headers.get('referer');
    if (from) {
      const referrerHost = new URL(from).hostname.toLowerCase();
      internal = referrerHost === host.split(':')[0].toLowerCase();
      if (!internal) referrer = referrerHost.replace(/^www\./, '').slice(0, 253);
    }
  } catch {
    referrer = null;
  }

  const device = /iPad|Tablet|Android(?!.*Mobile)/i.test(agent) ? 'tablet' : /Mobi|iPhone|Android/i.test(agent) ? 'mobile' : 'desktop';
  // A page opened from one of the site's own pages continues a visit.
  const entry = !internal;
  return {
    path,
    locale,
    device,
    entry,
    referrer: entry ? referrer : null,
    language: preferredLanguage(headers.get('accept-language') ?? ''),
    campaign: entry ? campaignOf(request.nextUrl.searchParams) : null,
    country: entry ? countryOf(request) : null,
  };
}

export async function recordPageView(view: View | null): Promise<void> {
  if (!view || !isWorkspaceDatabaseConfigured()) return;
  try {
    await query(
      `INSERT INTO site_page_views (path, locale, device, entry, referrer_host, language, campaign, country)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [view.path, view.locale, view.device, view.entry, view.referrer, view.language, view.campaign, view.country]
    );
    // Now and then the rows past thirteen months go, so a month can still be compared with the year before.
    if (Math.random() < 0.002) await query(`DELETE FROM site_page_views WHERE viewed_at < now() - interval '13 months'`);
  } catch (error) {
    console.error('[site views] could not be stored', error);
  }
}
