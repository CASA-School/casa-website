import type { NextRequest } from 'next/server';

import { isWorkspaceDatabaseConfigured, query } from '@/lib/admin/db';

/**
 * The website's page views (2026-10-29, migration 0106), counted by src/proxy.ts from the
 * request a browser sends for a page: its path, the Referer and the User-Agent. Nothing runs
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
const ROBOT = /bot|crawl|spider|slurp|lighthouse|headless|pagespeed|preview|monitor|curl|wget|python|axios|node-fetch|go-http|facebookexternalhit|embedly/i;
const PATH = /^\/[A-Za-z0-9/_.%-]{0,199}$/;

type View = { path: string; locale: string; device: 'mobile' | 'tablet' | 'desktop'; entry: boolean; referrer: string | null };

/** What to count for this request, or null when it is not a reader's page view. */
export function pageView(request: NextRequest, locale: string): View | null {
  const headers = request.headers;
  const host = headers.get('host') ?? '';
  const local = process.env.NODE_ENV !== 'production' && /^localhost(:\d+)?$/.test(host);
  if (request.method !== 'GET' || !(PUBLIC_HOST.test(host) || local)) return null;
  // A page load, not the router fetching a page or a prefetch (both `sec-fetch-dest: empty`).
  const destination = headers.get('sec-fetch-dest');
  if ((destination && destination !== 'document') || headers.get('sec-purpose')?.includes('prefetch')) return null;
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
  return { path, locale, device, entry, referrer: entry ? referrer : null };
}

export async function recordPageView(view: View | null): Promise<void> {
  if (!view || !isWorkspaceDatabaseConfigured()) return;
  try {
    await query(`INSERT INTO site_page_views (path, locale, device, entry, referrer_host) VALUES ($1, $2, $3, $4, $5)`, [
      view.path,
      view.locale,
      view.device,
      view.entry,
      view.referrer,
    ]);
    // Now and then the rows past thirteen months go, so a month can still be compared with the year before.
    if (Math.random() < 0.002) await query(`DELETE FROM site_page_views WHERE viewed_at < now() - interval '13 months'`);
  } catch (error) {
    console.error('[site views] could not be stored', error);
  }
}
