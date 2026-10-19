import 'server-only';

import { query } from './db';
import { wsLocale, type T, type WsLang } from './i18n';

/**
 * When SchoolMan's data last came into this database (2026-10-19; docs/FILEMAKER_BRIDGE.md §8). Bookings
 * are still made in SchoolMan, so what the workspace shows is a copy as of a time, and it says which.
 */
export type BridgeStatus = {
  /** When SchoolMan was read for the last run that went through. */
  readAt: Date | null;
  /** The latest run did not go through, so the copy is older than it. */
  lastFailed: boolean;
};

export async function bridgeStatus(): Promise<BridgeStatus | null> {
  // The last good run first, then the latest run; one row when no run has gone through yet.
  const rows = await query<{ read_at: Date; ok: boolean }>(
    `(SELECT read_at, ok FROM bridge_runs WHERE ok ORDER BY finished_at DESC LIMIT 1)
     UNION ALL
     (SELECT read_at, ok FROM bridge_runs ORDER BY finished_at DESC LIMIT 1)`
  );
  if (!rows.length) return null;
  return { readAt: rows.length === 2 ? rows[0].read_at : null, lastFailed: !rows[rows.length - 1].ok };
}

/** „heute, 18:05" / „17.10., 07:12" in Bremen's time. */
export function bridgeTime(at: Date, t: T, lang: WsLang): string {
  const zone = { timeZone: 'Europe/Berlin' } as const;
  const day = (d: Date) => d.toLocaleDateString('en-CA', zone);
  const time = at.toLocaleTimeString(wsLocale(lang), { ...zone, hour: '2-digit', minute: '2-digit' });
  if (day(at) === day(new Date())) return t(`heute, ${time}`, `today, ${time}`);
  return `${at.toLocaleDateString(wsLocale(lang), { ...zone, day: 'numeric', month: 'numeric' })}, ${time}`;
}
