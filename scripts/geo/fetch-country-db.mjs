#!/usr/bin/env node
/**
 * Downloads DB-IP's free IP-to-country database (DB-IP Lite, CC BY 4.0, https://db-ip.com) into
 * `<dir>/dbip-country-lite.mmdb`, for the website statistics' visitor countries
 * (src/lib/site-views.ts, migration 0109).
 *
 *   node scripts/geo/fetch-country-db.mjs [dir]     (default: geo/)
 *
 * The Dockerfile runs it on every image build, so each release carries the current month's file;
 * DB-IP publishes a new one at the start of each month, so the previous month's is tried too. A
 * failed download never fails the build: without the file the site counts visits without a country.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

const dir = process.argv[2] ?? 'geo';
const month = (offset) => {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - offset);
  return date.toISOString().slice(0, 7);
};

for (const candidate of [month(0), month(1)]) {
  const url = `https://download.db-ip.com/free/dbip-country-lite-${candidate}.mmdb.gz`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!response.ok) {
      console.log(`[geo] ${candidate}: ${response.status}`);
      continue;
    }
    const data = gunzipSync(Buffer.from(await response.arrayBuffer()));
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'dbip-country-lite.mmdb'), data);
    console.log(`[geo] DB-IP Lite country ${candidate}: ${(data.length / 1e6).toFixed(1)} MB`);
    process.exit(0);
  } catch (error) {
    console.log(`[geo] ${candidate}: ${error instanceof Error ? error.message : error}`);
  }
}
console.log('[geo] no country database; visits are counted without a country');
